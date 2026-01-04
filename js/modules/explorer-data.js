/**
 * Explorer Data Module
 * 负责资源管理器的数据管理和路径导航
 */

export const ExplorerData = (() => {
    const state = {
        currentPath: 'Documents',
        history: [],
        historyIndex: -1,
        viewMode: 'grid',
        data: {
            posts: [],
            images: [],
            music: [],
            videos: [],
            games: [],
            projects: []
        }
    };

    const rootPaths = {
        'Documents': { data: 'posts', prefix: 'posts', isPost: true },
        'Pictures': { data: 'images', prefix: 'images' },
        'Music': { data: 'music', prefix: 'musics' },
        'Videos': { data: 'videos', prefix: 'videos' },
        'MyGame': { data: 'games', prefix: 'myGame' },
        'MyProject': { data: 'projects', prefix: 'myProject' }
    };

    /**
     * 加载所有数据
     */
    function loadData() {
        state.data.posts = _parseJSON('blog-data', 'posts');
        state.data.images = _parseJSON('images-data', 'images');
        state.data.music = _parseJSON('music-data', 'music');
        state.data.videos = _parseJSON('video-data', 'videos');
        state.data.games = _parseJSON('game-data', 'entries');
        state.data.projects = _parseJSON('project-data', 'entries');

        console.log('[ExplorerData] Data loaded');
    }

    /**
     * 解析JSON数据
     */
    function _parseJSON(id, key) {
        try {
            const el = document.getElementById(id);
            if (!el) {
                console.warn(`[ExplorerData] Element with id ${id} not found`);
                return [];
            }
            const json = JSON.parse(el.textContent);
            return json[key] || json.entries || [];
        } catch (e) {
            console.error(`[ExplorerData] Failed to parse ${id}:`, e);
            return [];
        }
    }

    /**
     * 获取指定路径下的项目（层级展开形式）
     */
    function getItemsForPath(path) {
        if (!path || path === 'Computer') {
            return [];
        }

        const parts = path.split('/').filter(p => p);
        const rootKey = parts[0];
        const config = rootPaths[rootKey];

        if (!config) {
            console.warn('[ExplorerData] Unknown root path:', rootKey);
            return [];
        }

        const dataArray = state.data[config.data];
        const relativeParts = parts.slice(1);
        const relativePath = relativeParts.join('/');
        const currentPrefix = config.prefix + (relativePath ? '/' + relativePath : '');

        const items = [];
        const seenDirs = new Set();
        const seenFiles = new Set();

        console.log('[ExplorerData] getItemsForPath:', { path, rootKey, currentPrefix, dataCount: dataArray.length });

        dataArray.forEach(entry => {
            // 跳过占位符
            if (entry.name === 'dummy') return;

            let entryDir = '';
            if (config.isPost) {
                entryDir = entry.section;
            } else {
                entryDir = entry.dir;
            }

            if (entryDir) {
                entryDir = entryDir.replace(/\\/g, '/');
            }

            // 检查这个条目是否在当前目录或子目录中
            if (entryDir === currentPrefix) {
                // 这个条目在当前目录中 - 直接显示
                console.log('[ExplorerData] Found item in currentPrefix:', entry.title || entry.name, 'at', entryDir);
                if (config.isPost) {
                    const fileKey = entry.url || entry.path;
                    if (!seenFiles.has(fileKey)) {
                        seenFiles.add(fileKey);
                        items.push({
                            name: entry.title,
                            isDir: false,
                            ...entry
                        });
                    }
                } else {
                    // 对于非 post 类型（图片、音乐、视频等），只显示文件，不显示目录
                    // 目录会在下面的虚拟文件夹逻辑中处理
                    if (!entry.isDir) {
                        items.push(entry);
                    }
                }
            } else if (entryDir && entryDir.startsWith(currentPrefix + '/')) {
                // 这个条目在当前目录的子目录中
                const sub = entryDir.substring(currentPrefix.length + 1);
                const nextSegment = sub.split('/')[0];

                // 创建虚拟文件夹（用于层级展开）
                if (!seenDirs.has(nextSegment)) {
                    seenDirs.add(nextSegment);
                    const logicalPath = relativePath 
                        ? `${rootKey}/${relativePath}/${nextSegment}`
                        : `${rootKey}/${nextSegment}`;
                    
                    console.log('[ExplorerData] Creating virtual folder:', nextSegment);
                    items.push({
                        name: nextSegment,
                        isDir: true,
                        path: logicalPath
                    });
                }
            }
        });

        // 去重
        const uniqueItems = [];
        const seenNames = new Set();

        for (const item of items) {
            const key = item.isDir ? `dir:${item.name}` : `file:${item.path || item.url}`;
            if (!seenNames.has(key)) {
                seenNames.add(key);
                uniqueItems.push(item);
            }
        }

        console.log('[ExplorerData] Final items count:', uniqueItems.length);
        return uniqueItems;
    }

    /**
     * 导航到指定路径
     */
    function navigateTo(path) {
        if (!path || path.trim() === '') {
            path = 'Documents';
        }

        path = path.trim();

        if (path === state.currentPath) {
            return false; // 路径未变化
        }

        // 添加到历史
        if (state.historyIndex < state.history.length - 1) {
            state.history = state.history.slice(0, state.historyIndex + 1);
        }
        state.history.push(path);
        state.historyIndex = state.history.length - 1;

        state.currentPath = path;
        console.log('[ExplorerData] Path changed to:', path);

        return true; // 路径已变化
    }

    /**
     * 导航回退
     */
    function goBack() {
        if (state.historyIndex > 0) {
            state.historyIndex--;
            state.currentPath = state.history[state.historyIndex];
            return true;
        }
        return false;
    }

    /**
     * 导航上级目录
     */
    function goUp() {
        if (state.currentPath === 'Computer') return false;

        if (state.currentPath.includes('/')) {
            const parts = state.currentPath.split('/');
            parts.pop();
            navigateTo(parts.join('/'));
            return true;
        } else {
            navigateTo('Computer');
            return true;
        }
    }

    /**
     * 初始化历史记录
     */
    function initHistory() {
        if (state.historyIndex === -1) {
            state.history = [state.currentPath];
            state.historyIndex = 0;
        }
    }

    /**
     * 获取当前状态
     */
    function getState() {
        return { ...state };
    }

    /**
     * 设置视图模式
     */
    function setViewMode(mode) {
        state.viewMode = mode;
    }

    /**
     * 获取视图模式
     */
    function getViewMode() {
        return state.viewMode;
    }

    /**
     * 获取当前路径
     */
    function getCurrentPath() {
        return state.currentPath;
    }

    return {
        loadData,
        getItemsForPath,
        navigateTo,
        goBack,
        goUp,
        initHistory,
        getState,
        setViewMode,
        getViewMode,
        getCurrentPath
    };
})();
