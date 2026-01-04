/**
 * Explorer Events Module
 * 负责资源管理器的事件处理
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
        viewList: '.list-view-btn'
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

    /**
     * 设置回调函数
     */
    function setCallbacks(newCallbacks) {
        callbacks = { ...callbacks, ...newCallbacks };
    }

    /**
     * 绑定文件/文件夹点击事件
     */
    function bindContentEvents(container) {
        if (!container) {
            console.warn('[ExplorerEvents] Container not found');
            return;
        }

        // 防止重复绑定 - 使用 _bound 属性而不是 dataset
        if (container._contentEventsBound) {
            console.log('[ExplorerEvents] Content events already bound');
            return;
        }
        container._contentEventsBound = true;

        // 委托点击事件
        container.addEventListener('click', (e) => {
            const fileItem = e.target.closest('.file-item');
            if (!fileItem) return;

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
                        callbacks.onFolderSelect(item);
                    }
                } else {
                    if (callbacks.onFileSelect) {
                        callbacks.onFileSelect(item);
                    }
                }
            } catch (err) {
                console.error('[ExplorerEvents] Failed to parse item data:', err);
            }
        });

        // 双击事件（如需要）
        container.addEventListener('dblclick', (e) => {
            const fileItem = e.target.closest('.file-item');
            if (!fileItem) return;

            e.preventDefault();
            e.stopPropagation();

            const itemData = fileItem.dataset.itemData;
            if (!itemData) return;

            try {
                const item = JSON.parse(itemData);
                if (item.isDir && callbacks.onFolderSelect) {
                    callbacks.onFolderSelect(item);
                } else if (!item.isDir && callbacks.onFileSelect) {
                    callbacks.onFileSelect(item);
                }
            } catch (err) {
                console.error('[ExplorerEvents] Failed to parse item data:', err);
            }
        });
    }

    /**
     * 绑定侧边栏事件
     */
    function bindSidebarEvents(sidebar) {
        if (!sidebar) return;

        // 防止重复绑定
        if (sidebar._sidebarEventsBound) {
            return;
        }
        sidebar._sidebarEventsBound = true;

        sidebar.addEventListener('click', (e) => {
            const folderItem = e.target.closest('.folder-item');
            if (folderItem) {
                const path = folderItem.dataset.path;
                if (callbacks.onFolderSelect) {
                    callbacks.onFolderSelect({ name: path, isDir: true, path });
                }
            }
        });
    }

    /**
     * 绑定工具栏事件
     */
    function bindToolbarEvents() {
        // 返回按钮
        const backBtn = document.querySelector('.toolbar-back');
        if (backBtn && !backBtn._backBound) {
            backBtn._backBound = true;
            backBtn.addEventListener('click', () => {
                if (callbacks.onNavigateBack) {
                    callbacks.onNavigateBack();
                }
            });
        }

        // 上一级按钮
        const upBtn = document.querySelector('.toolbar-up');
        if (upBtn && !upBtn._upBound) {
            upBtn._upBound = true;
            upBtn.addEventListener('click', () => {
                if (callbacks.onNavigateUp) {
                    callbacks.onNavigateUp();
                }
            });
        }

        // 刷新按钮
        const refreshBtn = document.querySelector('.toolbar-refresh');
        if (refreshBtn && !refreshBtn._refreshBound) {
            refreshBtn._refreshBound = true;
            refreshBtn.addEventListener('click', () => {
                if (callbacks.onRefresh) {
                    callbacks.onRefresh();
                }
            });
        }
    }

    /**
     * 绑定视图切换事件
     */
    function bindViewToggleEvents() {
        const gridBtn = document.querySelector(selectors.viewGrid);
        const listBtn = document.querySelector(selectors.viewList);

        // 防止重复绑定
        if ((gridBtn && gridBtn._gridBound) && (listBtn && listBtn._listBound)) {
            return;
        }

        if (gridBtn && !gridBtn._gridBound) {
            gridBtn._gridBound = true;
            gridBtn.addEventListener('click', () => {
                if (callbacks.onViewModeChange) {
                    callbacks.onViewModeChange('grid');
                }
            });
        }

        if (listBtn && !listBtn._listBound) {
            listBtn._listBound = true;
            listBtn.addEventListener('click', () => {
                if (callbacks.onViewModeChange) {
                    callbacks.onViewModeChange('list');
                }
            });
        }
    }

    /**
     * 绑定窗口控制事件
     */
    function bindWindowControlEvents() {
        const minimizeBtn = document.querySelector(selectors.minimize);
        const maximizeBtn = document.querySelector(selectors.maximize);
        const closeBtn = document.querySelector(selectors.close);
        const window = document.querySelector(selectors.window);

        // 防止重复绑定 - 检查是否已绑定
        if (minimizeBtn && !minimizeBtn._minimizeBound) {
            minimizeBtn._minimizeBound = true;
            minimizeBtn.addEventListener('click', () => {
                window.classList.add('minimized');
                if (callbacks.onMinimize) callbacks.onMinimize();
            });
        }

        if (maximizeBtn && !maximizeBtn._maximizeBound) {
            maximizeBtn._maximizeBound = true;
            maximizeBtn.addEventListener('click', () => {
                window.classList.toggle('maximized');
                if (callbacks.onMaximize) callbacks.onMaximize();
            });
        }

        if (closeBtn && !closeBtn._closeBound) {
            closeBtn._closeBound = true;
            closeBtn.addEventListener('click', () => {
                window.style.display = 'none';
                if (callbacks.onClose) callbacks.onClose();
            });
        }
    }

    /**
     * 绑定桌面图标事件
     */
    function bindIconEvents() {
        const icon = document.querySelector(selectors.icon);
        if (!icon || icon._iconBound) {
            console.log('[ExplorerEvents] Icon already bound or not found');
            return;
        }
        
        icon._iconBound = true;
        console.log('[ExplorerEvents] Binding icon events');

        icon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[ExplorerEvents] Icon clicked');
            // 调用全局的打开函数以确保正确初始化
            if (typeof globalThis.startOpenExplorer === 'function') {
                globalThis.startOpenExplorer();
            } else {
                // 降级处理：直接显示窗口
                const window = document.querySelector(selectors.window);
                if (window) window.style.display = 'flex';
            }
        });

        icon.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[ExplorerEvents] Icon double-clicked');
            // 调用全局的打开函数以确保正确初始化
            if (typeof globalThis.startOpenExplorer === 'function') {
                globalThis.startOpenExplorer();
            } else {
                // 降级处理：直接显示窗口
                const window = document.querySelector(selectors.window);
                if (window) window.style.display = 'flex';
            }
        });
    }

    /**
     * 初始化所有事件绑定
     */
    function init() {
        console.log('[ExplorerEvents] Initializing events');

        const container = document.querySelector(selectors.container);
        const sidebar = document.querySelector(selectors.sidebar);

        bindContentEvents(container);
        bindSidebarEvents(sidebar);
        bindToolbarEvents();
        bindViewToggleEvents();
        bindWindowControlEvents();
        bindIconEvents();

        console.log('[ExplorerEvents] Events initialized');
    }

    /**
     * 重新初始化事件（当窗口重新打开时调用）
     */
    function reinitialize() {
        console.log('[ExplorerEvents] Re-initializing events');
        
        // 重置容器的绑定标志，以便重新绑定
        const container = document.querySelector(selectors.container);
        if (container) {
            container._contentEventsBound = false;
        }
        
        const sidebar = document.querySelector(selectors.sidebar);
        if (sidebar) {
            sidebar._sidebarEventsBound = false;
        }
        
        // 重置工具栏按钮的绑定标志
        const backBtn = document.querySelector('.toolbar-back');
        const upBtn = document.querySelector('.toolbar-up');
        const refreshBtn = document.querySelector('.toolbar-refresh');
        if (backBtn) backBtn._backBound = false;
        if (upBtn) upBtn._upBound = false;
        if (refreshBtn) refreshBtn._refreshBound = false;
        
        // 重置视图切换按钮的绑定标志
        const gridBtn = document.querySelector(selectors.viewGrid);
        const listBtn = document.querySelector(selectors.viewList);
        if (gridBtn) gridBtn._gridBound = false;
        if (listBtn) listBtn._listBound = false;
        
        // 重置窗口控制按钮的绑定标志
        const minimizeBtn = document.querySelector(selectors.minimize);
        const maximizeBtn = document.querySelector(selectors.maximize);
        const closeBtn = document.querySelector(selectors.close);
        if (minimizeBtn) minimizeBtn._minimizeBound = false;
        if (maximizeBtn) maximizeBtn._maximizeBound = false;
        if (closeBtn) closeBtn._closeBound = false;
        
        // 重置图标的绑定标志
        const icon = document.querySelector(selectors.icon);
        if (icon) icon._iconBound = false;

        // 重新绑定所有事件
        bindContentEvents(container);
        bindSidebarEvents(sidebar);
        bindToolbarEvents();
        bindViewToggleEvents();
        bindWindowControlEvents();
        bindIconEvents();
    }

    return {
        init,
        reinitialize,
        setCallbacks,
        bindContentEvents,
        bindSidebarEvents,
        bindToolbarEvents,
        bindViewToggleEvents,
        bindWindowControlEvents,
        bindIconEvents
    };
})();
