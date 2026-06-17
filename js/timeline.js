/**
 * Timeline Manager
 * 项目时间线管理器 - 直接在窗口内操作增删改查
 */

class TimelineManager {
    constructor() {
        this.projectStorageKey = 'win7_project_timeline_projects';
        this.entryStorageKey = 'win7_project_timeline_entries';
        this.selectedProjectStorageKey = 'win7_project_timeline_selected_project';
        this.projects = [];
        this.entries = [];
        this.selectedProjectId = null;
        this.editingId = null;

        this.init();
    }

    init() {
        this.cacheElements();
        this.loadProjects();
        this.loadSelectedProject();
        this.loadEntries();
        this.bindEvents();
        this.ensureDefaultProject();
        this.render();
    }

    cacheElements() {
        this.projectNameInput = document.getElementById('timeline-project-name');
        this.projectAddBtn = document.getElementById('project-add-btn');
        this.projectUpdateBtn = document.getElementById('project-update-btn');
        this.projectDeleteBtn = document.getElementById('project-delete-btn');
        this.projectListContainer = document.getElementById('project-list');
        this.currentProjectLabel = document.getElementById('current-project-label');

        this.titleInput = document.getElementById('timeline-title');
        this.dateInput = document.getElementById('timeline-date');
        this.descInput = document.getElementById('timeline-description');
        this.addBtn = document.getElementById('timeline-add-btn');
        this.sampleBtn = document.getElementById('timeline-sample-btn');
        this.clearBtn = document.getElementById('timeline-clear-btn');
        this.viewContainer = document.getElementById('timeline-view');

        this.exportBtn = document.getElementById('timeline-export-btn');
        this.importBtn = document.getElementById('timeline-import-btn');
        this.importFileInput = document.getElementById('timeline-import-file');
    }

    bindEvents() {
        if (this.projectAddBtn) {
            this.projectAddBtn.addEventListener('click', () => this.handleProjectAdd());
        }
        if (this.projectUpdateBtn) {
            this.projectUpdateBtn.addEventListener('click', () => this.handleProjectUpdate());
        }
        if (this.projectDeleteBtn) {
            this.projectDeleteBtn.addEventListener('click', () => this.handleProjectDelete());
        }
        if (this.projectListContainer) {
            this.projectListContainer.addEventListener('click', (e) => {
                const item = e.target.closest('.project-item');
                if (!item) return;
                const projectId = item.dataset.id;
                if (projectId) {
                    this.selectProject(projectId);
                }
            });
        }
        if (this.addBtn) {
            this.addBtn.addEventListener('click', () => this.handleAdd());
        }
        if (this.sampleBtn) {
            this.sampleBtn.addEventListener('click', () => this.handleLoadSample());
        }
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => this.handleClear());
        }
        if (this.exportBtn) {
            this.exportBtn.addEventListener('click', () => this.handleExport());
        }
        if (this.importBtn) {
            this.importBtn.addEventListener('click', () => this.handleImportClick());
        }
        if (this.importFileInput) {
            this.importFileInput.addEventListener('change', (e) => this.handleImportFile(e));
        }
        if (this.descInput) {
            this.descInput.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    this.handleAdd();
                }
            });
        }
        if (this.projectNameInput) {
            this.projectNameInput.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    this.handleProjectAdd();
                }
            });
        }
    }

    loadProjects() {
        try {
            const data = localStorage.getItem(this.projectStorageKey);
            this.projects = data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('[TimelineManager] 项目加载失败:', error);
            this.projects = [];
        }
    }

    saveProjects() {
        try {
            localStorage.setItem(this.projectStorageKey, JSON.stringify(this.projects));
        } catch (error) {
            console.error('[TimelineManager] 项目保存失败:', error);
        }
    }

    loadSelectedProject() {
        try {
            const saved = localStorage.getItem(this.selectedProjectStorageKey);
            if (saved) {
                this.selectedProjectId = saved;
            }
        } catch (error) {
            console.error('[TimelineManager] 选中项目加载失败:', error);
            this.selectedProjectId = null;
        }
    }

    saveSelectedProject() {
        try {
            if (this.selectedProjectId) {
                localStorage.setItem(this.selectedProjectStorageKey, this.selectedProjectId);
            }
        } catch (error) {
            console.error('[TimelineManager] 选中项目保存失败:', error);
        }
    }

    loadEntries() {
        try {
            const data = localStorage.getItem(this.entryStorageKey);
            this.entries = data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('[TimelineManager] 数据加载失败:', error);
            this.entries = [];
        }
    }

    saveEntries() {
        try {
            localStorage.setItem(this.entryStorageKey, JSON.stringify(this.entries));
        } catch (error) {
            console.error('[TimelineManager] 数据保存失败:', error);
        }
    }

    generateId(prefix = 'item') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }

    ensureDefaultProject() {
        if (!this.projects || this.projects.length === 0) {
            const defaultProject = {
                id: this.generateId('project'),
                title: '默认项目'
            };
            this.projects = [defaultProject];
            this.selectedProjectId = defaultProject.id;
            this.saveProjects();
            this.saveSelectedProject();
        }
        if (this.selectedProjectId && !this.getProjectById(this.selectedProjectId)) {
            this.selectedProjectId = this.projects[0]?.id || null;
            this.saveSelectedProject();
        }
        if (!this.selectedProjectId) {
            this.selectedProjectId = this.projects[0]?.id || null;
            this.saveSelectedProject();
        }
    }

    getProjectById(id) {
        return this.projects.find(project => project.id === id) || null;
    }

    getSelectedProject() {
        return this.getProjectById(this.selectedProjectId) || this.projects[0] || null;
    }

    selectProject(projectId) {
        const project = this.getProjectById(projectId);
        if (!project) return;
        this.selectedProjectId = project.id;
        this.saveSelectedProject();
        if (this.projectNameInput) {
            this.projectNameInput.value = project.title;
        }
        this.clearInputs();
        this.editingId = null;
        if (this.addBtn) {
            this.addBtn.textContent = '添加事件';
        }
        this.render();
    }

    handleProjectAdd() {
        const title = this.projectNameInput?.value?.trim();
        if (!title) {
            alert('请填写项目名称');
            return;
        }
        const project = {
            id: this.generateId('project'),
            title
        };
        this.projects.push(project);
        this.saveProjects();
        this.projectNameInput.value = '';
        this.selectProject(project.id);
        this.saveSelectedProject();
    }

    handleProjectUpdate() {
        const project = this.getSelectedProject();
        if (!project) {
            alert('请选择一个项目');
            return;
        }
        const title = this.projectNameInput?.value?.trim();
        if (!title) {
            alert('请输入项目名称');
            return;
        }
        project.title = title;
        this.saveProjects();
        this.render();
    }

    handleProjectDelete() {
        const project = this.getSelectedProject();
        if (!project) {
            alert('请选择一个项目');
            return;
        }
        if (this.projects.length === 1) {
            alert('至少保留一个项目');
            return;
        }
        if (!confirm('确定要删除当前项目及其所有事件吗？')) {
            return;
        }
        this.projects = this.projects.filter(item => item.id !== project.id);
        this.entries = this.entries.filter(entry => entry.projectId !== project.id);
        this.saveProjects();
        this.saveEntries();
        this.selectedProjectId = this.projects[0]?.id || null;
        this.saveSelectedProject();
        if (this.selectedProjectId) {
            const nextProject = this.getProjectById(this.selectedProjectId);
            if (nextProject && this.projectNameInput) {
                this.projectNameInput.value = nextProject.title;
            }
        }
        this.clearInputs();
        this.render();
    }

    handleAdd() {
        const project = this.getSelectedProject();
        if (!project) {
            alert('请先新增或选择一个项目');
            return;
        }
        const title = this.titleInput?.value?.trim();
        const date = this.dateInput?.value;
        const description = this.descInput?.value?.trim();

        if (!title || !date) {
            alert('请填写标题和日期');
            return;
        }

        if (this.editingId) {
            const entry = this.entries.find(e => e.id === this.editingId);
            if (entry) {
                entry.title = title;
                entry.date = date;
                entry.description = description;
                entry.projectId = project.id;
            }
            this.editingId = null;
            if (this.addBtn) {
                this.addBtn.textContent = '添加事件';
            }
        } else {
            this.entries.push({
                id: this.generateId('event'),
                projectId: project.id,
                title,
                date,
                description
            });
        }

        this.saveEntries();
        this.clearInputs();
        this.render();
    }

    handleEdit(id) {
        const entry = this.entries.find(e => e.id === id);
        if (entry) {
            const project = this.getProjectById(entry.projectId);
            if (project) {
                this.selectProject(project.id);
            }
            this.titleInput.value = entry.title;
            this.dateInput.value = entry.date;
            this.descInput.value = entry.description || '';
            this.editingId = id;
            if (this.addBtn) {
                this.addBtn.textContent = '更新事件';
            }
            this.titleInput.focus();
        }
    }

    handleDelete(id) {
        if (confirm('确定要删除此事件吗？')) {
            this.entries = this.entries.filter(e => e.id !== id);
            this.saveEntries();
            if (this.editingId === id) {
                this.editingId = null;
                this.clearInputs();
                if (this.addBtn) {
                    this.addBtn.textContent = '添加事件';
                }
            }
            this.render();
        }
    }

    handleLoadSample() {
        const project = this.getSelectedProject();
        if (!project) {
            alert('请先新增或选择一个项目');
            return;
        }
        const samples = [
            { id: this.generateId('event'), projectId: project.id, title: '项目启动', date: '2025-01-01', description: '项目正式启动，确认目标' },
            { id: this.generateId('event'), projectId: project.id, title: '需求分析', date: '2025-02-15', description: '完成需求分析和系统设计' },
            { id: this.generateId('event'), projectId: project.id, title: '开发阶段', date: '2025-03-01', description: '进入核心开发阶段' },
            { id: this.generateId('event'), projectId: project.id, title: '测试发布', date: '2025-04-01', description: '完成测试和首次发布' }
        ];
        this.entries = [...this.entries.filter(e => e.projectId !== project.id), ...samples];
        this.saveEntries();
        this.clearInputs();
        this.render();
    }

    handleClear() {
        const project = this.getSelectedProject();
        if (!project) {
            alert('请先新增或选择一个项目');
            return;
        }
        if (confirm('确定要清空当前项目的所有事件吗？此操作不可撤销。')) {
            this.entries = this.entries.filter(e => e.projectId !== project.id);
            this.editingId = null;
            this.saveEntries();
            this.clearInputs();
            if (this.addBtn) {
                this.addBtn.textContent = '添加事件';
            }
            this.render();
        }
    }

    clearInputs() {
        if (this.titleInput) this.titleInput.value = '';
        if (this.dateInput) this.dateInput.value = '';
        if (this.descInput) this.descInput.value = '';
    }

    renderProjectList() {
        if (!this.projectListContainer) return;
        if (this.projects.length === 0) {
            this.projectListContainer.innerHTML = '<div class="timeline-empty">尚无项目，请先新增一个项目。</div>';
            return;
        }
        this.projectListContainer.innerHTML = this.projects.map(project => `
            <div class="project-item${project.id === this.selectedProjectId ? ' selected' : ''}" data-id="${project.id}">
                <span>${this.escapeHtml(project.title)}</span>
            </div>
        `).join('');
    }

    renderTimeline() {
        if (!this.viewContainer) return;
        const project = this.getSelectedProject();
        if (project && this.currentProjectLabel) {
            this.currentProjectLabel.textContent = project.title;
        }

        const projectEntries = this.entries.filter(entry => entry.projectId === project?.id);
        if (!projectEntries || projectEntries.length === 0) {
            this.viewContainer.innerHTML = '<div class="timeline-empty">当前项目暂无事件，添加新事件后即可显示时间线。</div>';
            return;
        }

        const sorted = [...projectEntries].sort((a, b) => new Date(a.date) - new Date(b.date));
        this.viewContainer.innerHTML = `
            <div class="timeline-line"></div>
            ${sorted.map(entry => `
                <div class="timeline-item" data-id="${entry.id}">
                    <div class="timeline-item-marker"></div>
                    <div class="timeline-item-card">
                        <div class="timeline-item-date">${entry.date}</div>
                        <div class="timeline-item-title">${this.escapeHtml(entry.title)}</div>
                        <div class="timeline-item-desc">${this.escapeHtml(entry.description || '（无描述）')}</div>
                        <div class="timeline-card-actions">
                            <button class="timeline-card-btn edit" data-edit="${entry.id}">编</button>
                            <button class="timeline-card-btn delete" data-delete="${entry.id}">删</button>
                        </div>
                    </div>
                </div>
            `).join('')}
        `;

        this.viewContainer.querySelectorAll('[data-edit]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleEdit(btn.dataset.edit);
            });
        });

        this.viewContainer.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleDelete(btn.dataset.delete);
            });
        });
    }

    render() {
        this.ensureDefaultProject();
        const project = this.getSelectedProject();
        if (project && this.projectNameInput) {
            this.projectNameInput.value = project.title;
        }
        this.renderProjectList();
        this.renderTimeline();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 导出数据到 JSON 文件
     */
    handleExport() {
        try {
            const exportData = {
                version: '1.0',
                exportTime: new Date().toISOString(),
                projects: this.projects,
                entries: this.entries,
                selectedProjectId: this.selectedProjectId
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `timeline-backup-${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            console.log('[TimelineManager] 数据导出成功');
        } catch (error) {
            console.error('[TimelineManager] 导出失败:', error);
            alert('导出失败：' + error.message);
        }
    }

    /**
     * 触发导入文件选择
     */
    handleImportClick() {
        if (this.importFileInput) {
            this.importFileInput.click();
        }
    }

    /**
     * 从文件导入数据
     */
    handleImportFile(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result;
                if (typeof content !== 'string') {
                    throw new Error('文件读取失败');
                }

                const importData = JSON.parse(content);

                // 验证数据格式
                if (!Array.isArray(importData.projects) || !Array.isArray(importData.entries)) {
                    throw new Error('无效的备份文件格式');
                }

                // 提示确认
                if (!confirm('导入此备份会覆盖当前所有数据，是否继续？')) {
                    return;
                }

                // 导入数据
                this.projects = importData.projects || [];
                this.entries = importData.entries || [];
                this.selectedProjectId = importData.selectedProjectId || null;

                // 保存到 localStorage
                this.saveProjects();
                this.saveEntries();
                this.saveSelectedProject();

                // 确保默认项目存在
                this.ensureDefaultProject();
                this.clearInputs();
                this.render();

                alert('数据导入成功！');
                console.log('[TimelineManager] 数据导入成功');
            } catch (error) {
                console.error('[TimelineManager] 导入失败:', error);
                alert('导入失败：' + error.message);
            }
        };

        reader.onerror = () => {
            console.error('[TimelineManager] 文件读取错误');
            alert('文件读取失败');
        };

        reader.readAsText(file);

        // 重置 file input，以便重新选择同一文件时能触发 change 事件
        if (this.importFileInput) {
            this.importFileInput.value = '';
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    const timelineWindow = document.getElementById('timeline-window');
    if (timelineWindow && !globalThis.timelineManager) {
        globalThis.timelineManager = new TimelineManager();
    }
});
