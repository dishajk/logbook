// js/app.js

document.addEventListener('DOMContentLoaded', async () => {
    // Header UI hooks
    const statusEl = document.getElementById('sync-status');
    const syncBtn = document.getElementById('btn-sync-now');
    const toggleSettingsBtn = document.getElementById('btn-toggle-settings');
    const toggleProjectsBtn = document.getElementById('btn-toggle-projects');
    
    // Panel hooks
    const settingsPanel = document.getElementById('settings-panel');
    const projectsPanel = document.getElementById('projects-panel');
    
    // Form hooks
    const configForm = document.getElementById('sync-config-form');
    const projectForm = document.getElementById('project-config-form');
    const quickAddForm = document.getElementById('quick-add-form');
    
    // Form input hooks
    const entryDateInput = document.getElementById('entry-date');

    let syncDebounceTimeout = null;

    // Background push scheduler
    function scheduleAutoSync() {
        if (syncDebounceTimeout) clearTimeout(syncDebounceTimeout);
        
        statusEl.textContent = "Status: Sync pending...";
        syncDebounceTimeout = setTimeout(async () => {
            statusEl.textContent = "Status: Auto-syncing...";
            try {
                const result = await syncEngine.sync();
                if (result && result.success) {
                    statusEl.textContent = "Status: Sync Complete!";
                }
            } catch (err) {
                statusEl.textContent = "Status: Auto-sync failed.";
                console.error("Auto sync failure: ", err);
            }
        }, 5 * 60 * 1000);
    }

    // Main routine to update UI state from database layers
    async function refreshDashboard() {
        const projects = await db.getAllProjects();
        
        // Safety seed check: If projects array is completely empty, insert standard baseline
        if (projects.length === 0) {
            const fallbackProj = createProject({ name: "General Work", color: "#6366f1" });
            await db.saveProject(fallbackProj);
            return refreshDashboard(); // Re-evaluate loop with clean array data
        }

        uiManager.populateProjectDropdown(projects);
        uiManager.renderProjectSettingsList(projects);

        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const allMonthEntries = await db.getEntriesByMonth(currentMonthKey);
        
        const todayStr = now.toISOString().split('T')[0];
        const todayEntries = allMonthEntries.filter(e => e.date.startsWith(todayStr));

        uiManager.renderTodayLogs(todayEntries, projects);
    }

    try {
        // 1. Fire Database Engines
        await db.init();
        
        // Setup timezone-safe baseline date string matching form element models
        if (entryDateInput) {
            entryDateInput.value = new Date().toISOString().split('T')[0];
        }

        // 2. Resolve Remote Configurations
        const config = await syncEngine.loadConfig();
        if (config) {
            statusEl.textContent = "Status: Initialized. Sync Ready.";
            syncBtn.disabled = false;
            
            try {
                await syncEngine.sync();
                statusEl.textContent = "Status: Balanced with Remote.";
            } catch(e) {
                statusEl.textContent = "Status: Working Offline.";
            }
        } else {
            statusEl.textContent = "Status: Initialized. Sync Unconfigured.";
        }

        // 3. Paint Initial Views
        await refreshDashboard();

        // --- Core Action Framework Listeners ---

        toggleSettingsBtn.addEventListener('click', () => {
            settingsPanel.classList.toggle('hidden');
            projectsPanel.classList.add('hidden'); // Close conflicting drawer
        });

        toggleProjectsBtn.addEventListener('click', () => {
            projectsPanel.classList.toggle('hidden');
            settingsPanel.classList.add('hidden'); // Close conflicting drawer
        });

        configForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const repo = document.getElementById('config-repo').value.trim();
            const branch = document.getElementById('config-branch').value.trim();
            const token = document.getElementById('config-token').value.trim();
            
            await syncEngine.saveConfig(repo, branch, token);
            statusEl.textContent = "Status: Sync Configured.";
            syncBtn.disabled = false;
            settingsPanel.classList.add('hidden');
            await refreshDashboard();
        });

        syncBtn.addEventListener('click', async () => {
    // 1. CRITICAL: Clear any pending background syncs immediately
    if (syncDebounceTimeout) {
        clearTimeout(syncDebounceTimeout);
        syncDebounceTimeout = null;
    }

    statusEl.textContent = "Status: Syncing...";
    syncBtn.disabled = true;
    
    try {
        const result = await syncEngine.sync();
        if (result && result.success) {
            statusEl.textContent = "Status: Sync Complete!";
        } else {
            statusEl.textContent = "Status: Balanced with Remote.";
        }
    } catch (err) {
        statusEl.textContent = "Status: Sync Failed.";
        alert("Sync Error: " + err.message);
    } finally {
        syncBtn.disabled = false;
    }
}); 
        projectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('project-name').value.trim();
            const description = document.getElementById('project-description').value.trim();
            const color = document.getElementById('project-color').value;

            const newProject = createProject({ name, description, color });
            await db.saveProject(newProject);

            document.getElementById('project-name').value = '';
            document.getElementById('project-description').value = '';

            await refreshDashboard();
            if (syncEngine.config) scheduleAutoSync();
        });

        quickAddForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const projectId = document.getElementById('entry-project').value;
            const category = document.getElementById('entry-category').value;
            const description = document.getElementById('entry-description').value.trim();
            const dateValue = document.getElementById('entry-date').value;
            const duration = parseInt(document.getElementById('entry-duration').value, 10);
            
            const tagsRaw = document.getElementById('entry-tags').value;
            const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];

            const peopleRaw = document.getElementById('entry-people').value;
            const people = peopleRaw ? peopleRaw.split(',').map(p => p.trim()).filter(p => p.length > 0) : [];

            const logEntry = createEntry({
                date: new Date(dateValue).toISOString(),
                duration,
                projectId,
                category,
                description,
                tags,
                people
            });

            await db.saveEntry(logEntry);

            document.getElementById('entry-description').value = '';
            document.getElementById('entry-tags').value = '';
            document.getElementById('entry-people').value = '';

            await refreshDashboard();
            if (syncEngine.config) scheduleAutoSync();
        });

    } catch (error) {
        console.error("Initialization failed:", error);
        statusEl.textContent = "Status: Error loading runtime.";
        statusEl.style.color = "red";
    }
});