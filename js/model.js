// js/models.js

/**
 * Generates a unique ID (UUID v4 approximation)
 */
function generateId() {
    return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
}

/**
 * Creates a new Work Entry
 */
function createEntry({ date, duration = 0, projectId, category, description, tags = [], people = [], status = 'completed', links = [], notes = '' }) {
    const entryDate = new Date(date);
    const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;

    return {
        id: generateId(),
        monthKey, // Used for partitioning data files (e.g., "2026-07")
        date: entryDate.toISOString(),
        duration,
        projectId,
        category,
        description,
        tags,
        people,
        status,
        links,
        notes,
        updatedAt: new Date().toISOString()
    };
}

/**
 * Creates a new Project
 */
function createProject({ name, color = '#3b82f6', description = '', startDate = new Date().toISOString() }) {
    return {
        id: generateId(),
        name,
        color,
        description,
        startDate,
        archived: false,
        updatedAt: new Date().toISOString()
    };
}