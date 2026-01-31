/**
 * Explorer Events Module (Refactored)
 * 使用全局事件委托机制，避免重复绑定
 */

export const ExplorerEvents = (() => {
    const selectors = {
        window: '#explorer-window',
        icon: '#file-explorer',
        container: '.files-container',
        sidebar: '.explorer-sidebar',
        minimize: '.explorer-minimize',
        maximize: '.explorer-maximize',
        close: '.explorer-close',
        viewGrid: '.grid-view-btn',
        viewList: '.list-view-btn',
        toolbarBack: '.toolbar-back',
        toolbarUp: '.toolbar-up',
        toolbarRefresh: '.toolbar-refresh'
    };

    let callbacks = {
        onFileSelect: null,
        onFolderSelect: null,
        onViewModeChange: null,
        onNavigateBack: null,
        onNavigateUp: null,
        onRefresh: null,
        onMinimize: null,
        onMaximize: null,
        onClose: null
    };

    let eventsInitialized = false;

    /**
     * 设置回调函数
     */
    function setCallbacks(newCallbacks) {
        callbacks = { ...callbacks, ...newCallbacks };
    }

    /**
     * 初始化全局事件委托（仅一次）
     */
    function initGlobalDelegation() {
        if (eventsInitialized) {
            console.log('[ExplorerEvents] Global events already initialized');
            return;
        }

        console.log('[ExplorerEvents] Initializing global event delegation');

        // 1. 文件/文件夹容器的委托事件
        document.addEventListener('click', (e) => {
            const fileItem = e.target.closest('.file-item');
            if (fileItem) {
                e.preventDefault();
                e.stopPropagation();

                const itemData = fileItem.dataset.itemData;
                if (!itemData) {
                    console.warn('[ExplorerEvents] No item data found');
                    return;
                }

                try {
                    const item = JSON.parse(itemData);
                    if (item.isDir) {
                        if (callbacks.onFolderSelect) {
                            console.log('[ExplorerEvents] Folder selected:', item.name);
                            callbacks.onFolderSelect(item);
                        }
                    } else {
                        if (callbacks.onFileSelect) {
                            console.log('[ExplorerEvents] File selected:', item.name);
                            callbacks.onFileSelect(item);
                        }
                    }
                } catch (err) {
                    console.error('[ExplorerEvents] Failed to parse item data:', err);
                }
            }
        }, true); // 使用捕获阶段

        // 2. 侧边栏文件夹点击事件
        document.addEventListener('click', (e) => {
            const folderItem = e.target.closest('.folder-item');
            if (folderItem) {
                let path = folderItem.dataset.path;
                if (path) {
                    path = path.replace(/\\/g, '/');
                }
                if (callbacks.onFolderSelect) {
                    console.log('[ExplorerEvents] Sidebar folder selected:', path);
                    callbacks.onFolderSelect({ name: path, isDir: true, path });
                }
            }
        }, true);

        // 3. 工具栏按钮事件
        document.addEventListener('click', (e) => {
            const backBtn = e.target.closest(selectors.toolbarBack);
            if (backBtn) {
                console.log('[ExplorerEvents] Back button clicked');
                if (callbacks.onNavigateBack) {
                    callbacks.onNavigateBack();
                }
                return;
            }

            const upBtn = e.target.closest(selectors.toolbarUp);
            if (upBtn) {
                console.log('[ExplorerEvents] Up button clicked');
                if (callbacks.onNavigateUp) {
                    callbacks.onNavigateUp();
                }
                return;
            }

            const refreshBtn = e.target.closest(selectors.toolbarRefresh);
            if (refreshBtn) {
                console.log('[ExplorerEvents] Refresh button clicked');
                if (callbacks.onRefresh) {
                    callbacks.onRefresh();
                }
                return;
            }
        }, true);

        // 4. 视图切换按钮
        document.addEventListener('click', (e) => {
            const gridBtn = e.target.closest(selectors.viewGrid);
            if (gridBtn) {
                console.log('[ExplorerEvents] Grid view button clicked');
                if (callbacks.onViewModeChange) {
                    callbacks.onViewModeChange('grid');
                }
                return;
            }

            const listBtn = e.target.closest(selectors.viewList);
            if (listBtn) {
                console.log('[ExplorerEvents] List view button clicked');
                if (callbacks.onViewModeChange) {
                    callbacks.onViewModeChange('list');
                }
                return;
            }
        }, true);

        // 5. 桌面图标事件
        document.addEventListener('click', (e) => {
            const icon = e.target.closest(selectors.icon);
            if (icon) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[ExplorerEvents] Icon clicked');
                if (typeof globalThis.startOpenExplorer === 'function') {
                    globalThis.startOpenExplorer();
                } else {
                    const window = document.querySelector(selectors.window);
                    if (window) window.style.display = 'flex';
                }
            }
        }, true);

        // 6. 双击图标
        document.addEventListener('dblclick', (e) => {
            const icon = e.target.closest(selectors.icon);
            if (icon) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[ExplorerEvents] Icon double-clicked');
                if (typeof globalThis.startOpenExplorer === 'function') {
                    globalThis.startOpenExplorer();
                } else {
                    const window = document.querySelector(selectors.window);
                    if (window) window.style.display = 'flex';
                }
            }
        }, true);

        eventsInitialized = true;
        console.log('[ExplorerEvents] Global event delegation initialized');
    }

    /**
     * 初始化事件（首次调用）
     */
    function init() {
        console.log('[ExplorerEvents] Initializing events');
        initGlobalDelegation();
        console.log('[ExplorerEvents] Events initialized');
    }

    /**
     * 重新初始化（无需做任何事，全局委托已初始化）
     */
    function reinitialize() {
        console.log('[ExplorerEvents] Re-initializing events (no-op - using global delegation)');
    }

    return {
        init,
        reinitialize,
        setCallbacks,
        // 保留这些以兼容旧代码（但不再使用）
        bindContentEvents: () => {},
        bindSidebarEvents: () => {},
        bindToolbarEvents: () => {},
        bindViewToggleEvents: () => {},
        bindWindowControlEvents: () => {},
        bindIconEvents: () => {}
    };
})();
