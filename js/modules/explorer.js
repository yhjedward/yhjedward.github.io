/**
 * Explorer Module
 * 文件资源管理器功能实现（模块化架构）
 */

import { ExplorerUI } from './explorer-ui.js';
import { ExplorerEvents } from './explorer-events.js';
import { ExplorerData } from './explorer-data.js';

export const Explorer = (() => {
    const selectors = {
        window: '#explorer-window',
        icon: '#file-explorer',
        container: '.files-container',
        sidebar: '.explorer-sidebar'
    };

    let initialized = false;

    /**
     * 初始化探索器
     */
    function init() {
        console.log('[Explorer] Initializing Explorer Module');

        // 1. 加载数据
        ExplorerData.loadData();
        console.log('[Explorer] Data loaded');

        // 2. 初始化历史记录
        ExplorerData.initHistory();

        // 3. 初始化事件系统（仅在首次初始化时）
        if (!initialized) {
            _setupEventCallbacks();
            ExplorerEvents.init();
            initialized = true;
            console.log('[Explorer] Events initialized');
        } else {
            // 后续打开时，重新初始化容器事件并重新设置回调
            _setupEventCallbacks();
            ExplorerEvents.reinitialize();
            console.log('[Explorer] Event callbacks and container re-setup');
        }

        // 4. 初始渲染
        _render();

        // 5. 提供全局导航接口
        globalThis.navigateTo = (path) => {
            if (ExplorerData.navigateTo(path)) {
                _render();
            }
        };

        console.log('[Explorer] Initialization complete');
    }


    /**
     * 设置事件回调
     */
    function _setupEventCallbacks() {
        ExplorerEvents.setCallbacks({
            onFileSelect: _openFile,
            onFolderSelect: _navigateToFolder,
            onViewModeChange: _changeViewMode,
            onNavigateBack: _goBack,
            onNavigateUp: _goUp,
            onRefresh: _refresh
        });
    }


    /**
     * 文件点击处理
     */
    function _openFile(item) {
        console.log('[Explorer] Opening file:', item);

        if (item.url && item.filename) {
            // 博客文章 - 在当前窗口打开
            if (globalThis.articleReader && typeof globalThis.articleReader.openBlogArticle === 'function') {
                globalThis.articleReader.openBlogArticle(item.url, item.filename);
            } else {
                // 降级方案：直接导航到文章页面（不打开新标签页）
                window.location.href = item.url;
            }
        } else if (item.path) {
            // 媒体文件
            _handleMediaFile(item);
        }
    }

    /**
     * 处理媒体文件
     */
    function _handleMediaFile(item) {
        const path = item.path.toLowerCase();

        if (path.match(/\.(mp3|wav|ogg|flac|m4a)$/i)) {
            // 音频
            globalThis.mediaPlayer?.playAudio?.(item.path, item.name) || window.open(item.path, '_blank');
        } else if (path.match(/\.(mp4|webm|avi|mov|mkv)$/i)) {
            // 视频
            globalThis.mediaPlayer?.playVideo?.(item.path, item.name) || window.open(item.path, '_blank');
        } else if (path.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i)) {
            // 图片 - 不打开新标签页
            globalThis.mediaPlayer?.previewImage?.(item.path, item.name);
        } else {
            window.open(item.path, '_blank');
        }
    }

    /**
     * 文件夹点击处理
     */
    function _navigateToFolder(item) {
        console.log('[Explorer] Navigating to folder:', item);

        if (item.path) {
            // 虚拟文件夹，使用完整路径
            if (ExplorerData.navigateTo(item.path)) {
                _render();
            }
        } else if (item.isDir) {
            // 侧边栏文件夹
            if (ExplorerData.navigateTo(item.name)) {
                _render();
            }
        }
    }

    /**
     * 改变视图模式
     */
    function _changeViewMode(mode) {
        ExplorerData.setViewMode(mode);
        ExplorerUI.updateViewToggles(mode);
        _render();
    }

    /**
     * 回退
     */
    function _goBack() {
        if (ExplorerData.goBack()) {
            _render();
        }
    }

    /**
     * 上一级
     */
    function _goUp() {
        if (ExplorerData.goUp()) {
            _render();
        }
    }

    /**
     * 刷新
     */
    function _refresh() {
        ExplorerData.loadData();
        _render();
    }

    /**
     * 渲染界面
     */
    function _render() {
        const state = ExplorerData.getState();
        const items = ExplorerData.getItemsForPath(state.currentPath);
        const viewMode = ExplorerData.getViewMode();

        ExplorerUI.renderFiles(items, viewMode);
        ExplorerUI.updateAddressBar(state.currentPath);
        ExplorerUI.updateViewToggles(viewMode);
    }

    return {
        init,
        reinitialize: () => {
            ExplorerEvents.reinitialize();
        },
        open: () => {
            const win = document.querySelector(selectors.window);
            if (win) win.style.display = 'flex';
        },
        close: () => {
            const win = document.querySelector(selectors.window);
            if (win) win.style.display = 'none';
        }
    };
})();
