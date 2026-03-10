/**
 * Music Manager Module
 * 音乐文件管理器 - 专门用于浏览和播放音乐
 */

export const MusicManager = (() => {
    const selectors = {
        window: '#music-manager-window',
        icon: '#music-manager',
        container: '.music-files-container',
        sidebar: '.music-sidebar'
    };

    let initialized = false;
    let musicData = [];

    /**
     * 初始化音乐管理器
     */
    function init() {
        console.log('[MusicManager] Initializing Music Manager Module');

        // 1. 加载数据
        loadMusicData();
        console.log('[MusicManager] Data loaded');

        // 2. 初始化事件系统（仅在首次初始化时）
        if (!initialized) {
            _setupEventCallbacks();
            initialized = true;
            console.log('[MusicManager] Events initialized');
        }

        // 3. 初始渲染
        _render();

        console.log('[MusicManager] Initialization complete');
    }

    /**
     * 加载音乐数据
     */
    function loadMusicData() {
        try {
            const el = document.getElementById('music-data');
            if (!el) {
                console.warn('[MusicManager] music-data element not found');
                musicData = [];
                return;
            }
            const json = JSON.parse(el.textContent);
            musicData = (json.music || []).filter(item => item.name !== 'dummy');
            console.log('[MusicManager] Loaded', musicData.length, 'music files');
        } catch (e) {
            console.error('[MusicManager] Failed to parse music data:', e);
            musicData = [];
        }
    }

    /**
     * 设置事件回调
     */
    function _setupEventCallbacks() {
        const container = document.querySelector(selectors.container);
        if (!container) return;

        // 使用事件委托处理双击事件 - 播放单个文件
        container.addEventListener('dblclick', (e) => {
            const fileItem = e.target.closest('.music-file-item');
            if (fileItem) {
                const itemData = JSON.parse(fileItem.dataset.itemData);
                _playMusic(itemData);
                return;
            }
        });

        // 右键菜单功能 - 添加到播放列表
        container.addEventListener('contextmenu', (e) => {
            const fileItem = e.target.closest('.music-file-item');
            if (fileItem && globalThis.mediaPlayer?.addToPlaylist) {
                e.preventDefault();
                const itemData = JSON.parse(fileItem.dataset.itemData);
                globalThis.mediaPlayer.addToPlaylist(itemData.path, itemData.name);
                _showNotification('已添加到播放列表');
            }
        });

        // 播放全部按钮
        const playAllBtn = document.querySelector('.music-play-all');
        if (playAllBtn) {
            playAllBtn.addEventListener('click', () => {
                if (musicData.length === 0) {
                    _showNotification('没有音乐文件');
                    return;
                }

                // 过滤出所有文件（非文件夹）
                const files = musicData.filter(item => !item.isDir);

                if (files.length === 0) {
                    _showNotification('没有音乐文件');
                    return;
                }

                // 使用 mediaPlayer 的播放全部功能
                if (globalThis.mediaPlayer && typeof globalThis.mediaPlayer.playAllAudio === 'function') {
                    globalThis.mediaPlayer.playAllAudio(files);
                    _showNotification(`开始播放全部（${files.length}首）`);
                } else {
                    console.error('[MusicManager] playAllAudio not available');
                }
            });
        }
    }

    /**
     * 播放音乐
     */
    function _playMusic(item) {
        console.log('[MusicManager] Playing music:', item);
        console.log('[MusicManager] item.path:', item.path);
        console.log('[MusicManager] item.name:', item.name);
        console.log('[MusicManager] globalThis.mediaPlayer available:', !!globalThis.mediaPlayer);
        console.log('[MusicManager] globalThis.mediaPlayer.playAudio available:', globalThis.mediaPlayer && typeof globalThis.mediaPlayer.playAudio === 'function');

        if (globalThis.mediaPlayer && typeof globalThis.mediaPlayer.playAudio === 'function') {
            console.log('[MusicManager] Calling mediaPlayer.playAudio');
            globalThis.mediaPlayer.playAudio(item.path, item.name);
        } else {
            console.error('[MusicManager] MediaPlayer not available or playAudio not a function');
        }
    }

    /**
     * 导航到文件夹
     */
    function _navigateToFolder(item) {
        console.log('[MusicManager] Navigating to folder:', item);
        // 可以在这里添加文件夹导航逻辑
    }

    /**
     * 显示通知
     */
    function _showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'music-manager-notification';
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
     * 渲染音乐列表 - 只显示文件，不显示文件夹
     */
    function _render() {
        const container = document.querySelector(selectors.container);
        if (!container) {
            console.warn('[MusicManager] Container not found');
            return;
        }

        console.log('[MusicManager] Rendering with', musicData.length, 'items');

        container.innerHTML = '';

        // 过滤出所有文件（非文件夹）
        const files = musicData.filter(item => !item.isDir);

        if (!files || files.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty-folder-message';
            emptyDiv.textContent = '未找到音乐文件。';
            container.appendChild(emptyDiv);
            return;
        }

        console.log('[MusicManager] Rendering', files.length, 'music files');

        // 直接渲染所有文件
        files.forEach((item) => {
            console.log('[MusicManager] Rendering file:', item);
            const fileEl = document.createElement('div');
            fileEl.className = 'music-file-item';
            fileEl.dataset.itemData = JSON.stringify(item);
            fileEl.innerHTML = `
                <div class="music-icon">🎵</div>
                <div class="music-name">${item.name}</div>
            `;
            container.appendChild(fileEl);
        });

        console.log('[MusicManager] Rendering complete');
    }

    return {
        init,
        reinitialize: () => {
            loadMusicData();
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
