// js/app.js

document.addEventListener('DOMContentLoaded', async () => {
    const statusEl = document.getElementById('sync-status');
    
    try {
        // 1. Initialize Database
        await db.init();
        statusEl.textContent = "Status: DB Initialized. Offline Mode.";

        // 2. Test data insertion (only if projects are empty)
        const projects = await db.getAllProjects();
        if (projects.length === 0) {
            console.log("No projects found, creating defaults...");
            const defaultProject = createProject({ 
                name: "Internal Tools", 
                description: "Development of internal productivity applications." 
            });
            await db.saveProject(defaultProject);
            
            const sampleEntry = createEntry({
                date: new Date().toISOString(),
                projectId: defaultProject.id,
                category: "Programming",
                description: "Set up IndexedDB schema and data models."
            });
            await db.saveEntry(sampleEntry);
        }

        console.log("App ready. Local database primed.");

    } catch (error) {
        console.error("Initialization failed:", error);
        statusEl.textContent = "Status: Error loading database.";
        statusEl.style.color = "red";
    }
});