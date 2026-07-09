// js/app.js

document.addEventListener('DOMContentLoaded', async () => {
    const statusEl = document.getElementById('sync-status');
    const syncBtn = document.getElementById('btn-sync-now');
    const toggleSettingsBtn = document.getElementById('btn-toggle-settings');
    const settingsPanel = document.getElementById('settings-panel');
    const configForm = document.getElementById('sync-config-form');

    try {
        // 1. Initialize Local DB
        await db.init();
        
        // 2. Load Sync Configuration
        const config = await syncEngine.loadConfig();
        if (config) {
            statusEl.textContent = "Status: Initialized. Sync Ready.";
            syncBtn.disabled = false;
        } else {
            statusEl.textContent = "Status: Initialized. Sync Unconfigured.";
        }

        // Toggle Settings Panel UI
        toggleSettingsBtn.addEventListener('click', () => {
            settingsPanel.classList.toggle('hidden');
        });

        // Handle Configuration Saving
        configForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const repo = document.getElementById('config-repo').value.trim();
            const branch = document.getElementById('config-branch').value.trim();
            const token = document.getElementById('config-token').value.trim();

            try {
                await syncEngine.saveConfig(repo, branch, token);
                statusEl.textContent = "Status: Sync Configured.";
                syncBtn.disabled = false;
                settingsPanel.classList.add('hidden');
                alert("Configuration saved locally and encrypted via browser sandboxing!");
            } catch (err) {
                alert("Failed to save configuration: " + err.message);
            }
        });

        // Handle Manual Execution
        syncBtn.addEventListener('click', async () => {
            statusEl.textContent = "Status: Syncing...";
            syncBtn.disabled = true;
            try {
                const result = await syncEngine.sync();
                if (result.success) {
                    statusEl.textContent = "Status: Sync Complete!";
                } else {
                    statusEl.textContent = "Status: Sync Unconfigured.";
                }
            } catch (err) {
                statusEl.textContent = "Status: Sync Failed.";
                alert("Sync Error: " + err.message);
            } finally {
                syncBtn.disabled = false;
            }
        });

    } catch (error) {
        console.error("Initialization failed:", error);
        statusEl.textContent = "Status: Error loading runtime.";
        statusEl.style.color = "red";
    }
});