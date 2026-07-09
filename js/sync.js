// js/sync.js

class SyncEngine {
    constructor() {
        this.config = null;
    }

    async loadConfig() {
        const configMeta = await db.getMetadata('github_config');
        this.config = configMeta ? configMeta.value : null;
        return this.config;
    }

    async saveConfig(repo, branch, token) {
        this.config = { repo, branch, token };
        await db.saveMetadata('github_config', this.config);
    }

    /**
     * Internal helper to make GitHub API requests
     */
    async _apiCall(path, options = {}) {
        if (!this.config) throw new Error("Sync config missing");
        
        const url = `https://api.github.com/repos/${this.config.repo}/contents/${path}?ref=${this.config.branch}`;
        const headers = {
            'Authorization': `token ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json',
            ...options.headers
        };

        const response = await fetch(url, { ...options, headers });
        if (response.status === 404 && options.method === 'GET') return null;
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Unknown error" }));
            throw new Error(`GitHub API Error: ${response.status} - ${errorData.message}`);
        }
        return response.json();
    }

    /**
     * Pulls down a file from remote, preserving its Git SHA locally
     */
    async fetchRemoteFile(path) {
        const fileData = await this._apiCall(path, { method: 'GET' });
        if (!fileData) return null;

        // GitHub contents payload returns content encoded in base64
        const content = decodeURIComponent(atob(fileData.content).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return {
            sha: fileData.sha,
            data: JSON.parse(content)
        };
    }

    /**
     * Commits a file payload to GitHub safely using SHA protections
     */
    async pushRemoteFile(path, data, currentSha = null) {
        const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
        const payload = {
            message: `sync: automated update for ${path}`,
            content: contentBase64,
            branch: this.config.branch
        };
        if (currentSha) payload.sha = currentSha;

        const result = await this._apiCall(path, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        return result.content.sha;
    }

    /**
     * Full Sync Reconciliation
     * Handles current month data + structural files (projects)
     */
    async sync() {
        if (!this.config) return { success: false, reason: "unconfigured" };

        try {
            // Let's settle the tracking configuration for projects first
            await this._syncFile('data/projects.json', async () => await db.getAllProjects(), async (data) => {
                for (const proj of data) await db.saveProject(proj);
            });

            // Reconcile current month's time-partitioned workspace
            const now = new Date();
            const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const targetPath = `data/${currentMonthKey}.json`;

            await this._syncFile(targetPath, async () => await db.getEntriesByMonth(currentMonthKey), async (data) => {
                for (const entry of data) await db.saveEntry(entry);
            });

            return { success: true };
        } catch (error) {
            console.error("Sync Cycle Failed:", error);
            throw error;
        }
    }

    /**
     * Sync helper executing an on-load reconciliation loop per payload structure
     */
    async _syncFile(path, localGetFn, localSaveFn) {
        const localShaKey = `sha_${path}`;
        const savedMetaSha = await db.getMetadata(localShaKey);
        const lastKnownLocalSha = savedMetaSha ? savedMetaSha.value : null;

        // 1. Fetch current live status from GitHub
        const remoteFile = await this.fetchRemoteFile(path);

        if (!remoteFile) {
            // File doesn't exist on remote yet, upload local data if any
            const localData = await localGetFn();
            if (localData && localData.length > 0) {
                const initialSha = await this.pushRemoteFile(path, localData);
                await db.saveMetadata(localShaKey, initialSha);
            }
            return;
        }

        const remoteSha = remoteFile.sha;
        const remoteData = remoteFile.data;

        if (lastKnownLocalSha === remoteSha) {
            // No changes on remote since our last session. Safe to push local overrides.
            const localData = await localGetFn();
            const nextSha = await this.pushRemoteFile(path, localData, remoteSha);
            await db.saveMetadata(localShaKey, nextSha);
        } else {
            // Concurrency warning: Remote has changes we do not have!
            // Strategy: For this foundational pass, remote wins, saving local states cleanly.
            console.warn(`Remote state divergence detected on ${path}. Merging state.`);
            await localSaveFn(remoteData);
            await db.saveMetadata(localShaKey, remoteSha);
        }
    }
}

const syncEngine = new SyncEngine();