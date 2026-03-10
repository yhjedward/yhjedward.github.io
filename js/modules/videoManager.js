/**
 * Video Manager Module
 * 视频文件管理器 - 专门用于浏览和播放视频
 */

export const VideoManager = (() => {
    const selectors = {
        window: '#video-manager-window',
        icon: '#video-manager',
        container: '.video-files-container',
        sidebar: '.video-sidebar'
    };

    let initialized = false;
    let videoData = [];

    /**
     * 初始化视频管理器
     */
    function init() {
        console.log('[VideoManager] Initializing Video Manager Module');

        // 1. 加载数据
        loadVideoData();
        console.log('[VideoManager] Data loaded');

        // 2. 初始化事件系统（仅在首次初始化时）
        if (!initialized) {
            _setupEventCallbacks();
            initialized = true;
            console.log('[VideoManager] Events initialized');
        }

        // 3. 初始渲染
        _render();

        console.log('[VideoManager] Initialization complete');
    }

    /**
     * 加载视频数据
     */
    function loadVideoData() {
        try {
            const el = document.getElementById('video-data');
            if (!el) {
                console.warn('[VideoManager] video-data element not found');
                videoData = [];
                return;
            }
            const json = JSON.parse(el.textContent);
            videoData = (json.videos || []).filter(item => item.name !== 'dummy');
            console.log('[VideoManager] Loaded', videoData.length, 'video files');
        } catch (e) {
            console.error('[VideoManager] Failed to parse video data:', e);
            videoData = [];
        }
    }

    /**
     * 设置事件回调
     */
    function _setupEventCallbacks() {
        const container = document.querySelector(selectors.container);
        if (!container) return;

        // 使用事件委托处理双击事件 - 播放单个视频
        container.addEventListener('dblclick', (e) => {
            const fileItem = e.target.closest('.video-file-item');
            if (fileItem) {
                const itemData = JSON.parse(fileItem.dataset.itemData);
                _playVideo(itemData);
                return;
            }
        });

        // 右键菜单功能
        container.addEventListener('contextmenu', (e) => {
            const fileItem = e.target.closest('.video-file-item');
            if (fileItem) {
                e.preventDefault();
                _showNotification('视频已选中');
            }
        });

        // 播放全部按钮
        const playAllBtn = document.querySelector('.video-play-all');
        if (playAllBtn) {
            playAllBtn.addEventListener('click', () => {
                if (videoData.length === 0) {
                    _showNotification('没有视频文件');
                    return;
                }

                // 过滤出所有文件（非文件夹）
                const files = videoData.filter(item => !item.isDir);

                if (files.length === 0) {
                    _showNotification('没有视频文件');
                    return;
                }

                // 使用 mediaPlayer 的播放全部功能
                if (globalThis.mediaPlayer && typeof globalThis.mediaPlayer.playAllVideo === 'function') {
                    globalThis.mediaPlayer.playAllVideo(files);
                    _showNotification(`开始播放全部（${files.length}个）`);
                } else {
                    console.error('[VideoManager] playAllVideo not available');
                }
            });
        }
    }

    /**
     * 播放视频
     */
    function _playVideo(item) {
        console.log('[VideoManager] Playing video:', item);
        console.log('[VideoManager] item.path:', item.path);
        console.log('[VideoManager] item.name:', item.name);
        console.log('[VideoManager] globalThis.mediaPlayer available:', !!globalThis.mediaPlayer);
        console.log('[VideoManager] globalThis.mediaPlayer.playVideo available:', globalThis.mediaPlayer && typeof globalThis.mediaPlayer.playVideo === 'function');

        if (globalThis.mediaPlayer && typeof globalThis.mediaPlayer.playVideo === 'function') {
            console.log('[VideoManager] Calling mediaPlayer.playVideo');
            globalThis.mediaPlayer.playVideo(item.path, item.name);
        } else {
            console.error('[VideoManager] MediaPlayer not available or playVideo not a function');
        }
    }

    /**
     * 导航到文件夹
     */
    function _navigateToFolder(item) {
        console.log('[VideoManager] Navigating to folder:', item);
        // 可以在这里添加文件夹导航逻辑
    }

    /**
     * 显示通知
     */
    function _showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'video-manager-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #0078d7;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    /**
     * 渲染视频列表 - 只显示文件，不显示文件夹
     */
    function _render() {
        const container = document.querySelector(selectors.container);
        if (!container) {
            console.warn('[VideoManager] Container not found');
            return;
        }

        console.log('[VideoManager] Rendering with', videoData.length, 'items');

        container.innerHTML = '';

        // 过滤出所有文件（非文件夹）
        const files = videoData.filter(item => !item.isDir);

        if (!files || files.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty-folder-message';
            emptyDiv.textContent = '未找到视频文件。';
            container.appendChild(emptyDiv);
            return;
        }

        console.log('[VideoManager] Rendering', files.length, 'video files');

        // 直接渲染所有文件
        files.forEach((item) => {
            console.log('[VideoManager] Rendering file:', item);
            const fileEl = document.createElement('div');
            fileEl.className = 'video-file-item';
            fileEl.dataset.itemData = JSON.stringify(item);
            fileEl.innerHTML = `
                <div class="video-icon">🎬</div>
                <div class="video-name">${item.name}</div>
            `;
            container.appendChild(fileEl);
        });

        console.log('[VideoManager] Rendering complete');
    }

    return {
        init,
        reinitialize: () => {
            loadVideoData();
            _render();
        },
        open: () => {
            const win = document.querySelector(selectors.window);
            if (win) {
                win.classList.remove('minimized', 'maximized');
                win.classList.add('active', 'restored');
                win.style.display = 'flex';
                win.style.width = '';
                win.style.height = '';
                win.style.left = '';
                win.style.top = '';
                win.style.transform = '';

                if (!win.dataset.win7OrigWidth) {
                    win.dataset.win7OrigWidth = window.getComputedStyle(win).width;
                    win.dataset.win7OrigHeight = window.getComputedStyle(win).height;
                    win.dataset.win7OrigLeft = window.getComputedStyle(win).left;
                    win.dataset.win7OrigTop = window.getComputedStyle(win).top;
                    win.dataset.win7OrigTransform = window.getComputedStyle(win).transform;
                }
            }
        },
        close: () => {
            const win = document.querySelector(selectors.window);
            if (win) {
                win.style.display = 'none';
                win.classList.remove('active', 'minimized', 'maximized', 'restored');
            }
        }
    };
})();
