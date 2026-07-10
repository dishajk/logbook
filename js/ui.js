// js/ui.js

class UIManager {
    /**
     * Re-renders the Project dropdown selector inside forms
     */
    populateProjectDropdown(projects) {
        const selectEl = document.getElementById('entry-project');
        if (!selectEl) return;

        selectEl.innerHTML = '';
        projects.forEach(project => {
            if (project.archived) return;
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            selectEl.appendChild(option);
        });
    }

    /**
     * Renders the list of current projects with color dots
     */
    renderProjectSettingsList(projects) {
        const container = document.getElementById('active-projects-list');
        if (!container) return;

        if (projects.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.875rem;">No projects created yet.</p>`;
            return;
        }

        container.innerHTML = '';
        projects.forEach(project => {
            if (project.archived) return;

            const pill = document.createElement('div');
            pill.className = 'project-pill-item';
            pill.innerHTML = `
                <span class="color-dot" style="background-color: ${project.color}"></span>
                <span>${this._escapeHTML(project.name)}</span>
            `;
            container.appendChild(pill);
        });
    }

    /**
     * Renders an array of entries into the target container
     */
    renderTodayLogs(entries, projects) {
        const container = document.getElementById('today-logs-container');
        if (!container) return;

        if (entries.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9125rem;">No work logged today yet.</p>`;
            return;
        }

        const projMap = new Map(projects.map(p => [p.id, p]));
        const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = '';
        sorted.forEach(entry => {
            const project = projMap.get(entry.projectId) || { name: 'Unassigned', color: '#6b7280' };
            
            const logItem = document.createElement('div');
            logItem.className = 'log-item';
            
            const tagsHTML = entry.tags.map(t => `<span class="tag-badge">#${t}</span>`).join('');
            const peopleHTML = entry.people.map(p => `<span class="tag-badge">👤 ${p}</span>`).join('');

            logItem.innerHTML = `
                <div class="log-header">
                    <span class="project-badge" style="background-color: ${project.color}">${project.name}</span>
                    <span class="log-meta">${entry.category} • ${entry.duration}m</span>
                </div>
                <div class="log-desc">${this._escapeHTML(entry.description)}</div>
                ${(entry.tags.length || entry.people.length) ? `<div class="badge-row">${tagsHTML}${peopleHTML}</div>` : ''}
            `;
            container.appendChild(logItem);
        });
    }

    _escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }
}

const uiManager = new UIManager();