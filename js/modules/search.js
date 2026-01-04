/**
 * Taskbar Search Module
 * 支持在任务栏搜索框中搜索文章、图片、音乐、视频。
 */

export const Search = (() => {
    const selectors = {
        input: '#taskbar-search-input',
        panel: '#taskbar-search-results',
        blogData: '#blog-data',
        imagesData: '#images-data',
        musicData: '#music-data',
        videoData: '#video-data'
    };

    const state = {
        index: {
            posts: [],
            images: [],
            music: [],
            videos: []
        },
        results: [],
        activeIndex: -1,
        debounceTimer: null,
        searchMode: 'content'  // 'content' 或 'title'
    };

    let inputEl;
    let panelEl;
    let modeToggles;

    function init() {
        inputEl = document.querySelector(selectors.input);
        panelEl = document.querySelector(selectors.panel);
        modeToggles = document.getElementById('search-mode-toggles');

        if (!inputEl || !panelEl) return;

        buildIndex();
        bindEvents();
        bindModeToggleEvents();
    }
    
    /**
     * 绑定搜索模式切换事件
     */
    function bindModeToggleEvents() {
        if (!modeToggles) return;
        
        modeToggles.addEventListener('click', (e) => {
            const btn = e.target.closest('.search-mode-btn');
            if (!btn) return;
            
            const mode = btn.dataset.mode;
            if (!mode) return;
            
            // 更新按钮状态
            modeToggles.querySelectorAll('.search-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 更新搜索模式
            state.searchMode = mode;
            
            // 重新搜索
            if (inputEl.value.trim()) {
                runSearch(inputEl.value);
            }
        });
    }

    function parseJSON(selector) {
        const el = document.querySelector(selector);
        if (!el) return null;
        const raw = (el.textContent || '').trim();
        if (!raw) return null;

        try {
            return JSON.parse(raw);
        } catch (e) {
            console.error('[Search] Failed to parse JSON for', selector, e);
            return null;
        }
    }

    function buildIndex() {
        const blog = parseJSON(selectors.blogData);
        const images = parseJSON(selectors.imagesData);
        const music = parseJSON(selectors.musicData);
        const videos = parseJSON(selectors.videoData);

        state.index.posts = Array.isArray(blog?.posts) ? blog.posts : [];
        state.index.images = Array.isArray(images?.images) ? images.images : [];
        state.index.music = Array.isArray(music?.music) ? music.music : [];
        state.index.videos = Array.isArray(videos?.videos) ? videos.videos : [];
    }

    function bindEvents() {
        inputEl.addEventListener('input', () => {
            if (state.debounceTimer) clearTimeout(state.debounceTimer);
            state.debounceTimer = setTimeout(() => {
                runSearch(inputEl.value);
            }, 180);
        });

        inputEl.addEventListener('keydown', (e) => {
            if (panelEl.style.display === 'none' || !state.results.length) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                hidePanel();
                return;
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(Math.min(state.activeIndex + 1, state.results.length - 1));
                return;
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(Math.max(state.activeIndex - 1, 0));
                return;
            }

            if (e.key === 'Enter') {
                if (state.activeIndex >= 0 && state.activeIndex < state.results.length) {
                    e.preventDefault();
                    openResult(state.results[state.activeIndex]);
                }
            }
        });

        document.addEventListener('click', (e) => {
            if (panelEl.style.display === 'none') return;
            const t = e.target;
            if (!(t instanceof Node)) return;
            if (panelEl.contains(t) || inputEl.contains(t)) return;
            hidePanel();
        });
    }

    function normalizeQuery(q) {
        return (q || '').trim();
    }

    function tokenize(q) {
        const raw = normalizeQuery(q);
        if (!raw) return [];
        return raw.split(/\s+/g).filter(Boolean);
    }

    function textIncludesAllTokens(text, tokens) {
        const hay = (text || '').toLowerCase();
        return tokens.every(t => hay.includes(t));
    }

    function runSearch(query) {
        const tokens = tokenize(query).map(t => t.toLowerCase());
        if (!tokens.length) {
            hidePanel();
            return;
        }

        const results = [];
        
        // 根据搜索模式选择搜索逻辑
        if (state.searchMode === 'title') {
            // 按标题搜索
            searchByTitle(tokens, results);
        } else {
            // 按内容搜索（全文搜索）
            searchByContent(tokens, results);
        }

        renderResults(results);
    }
    
    /**
     * 按标题搜索
     */
    function searchByTitle(tokens, results) {
        const addMatches = (type, list, getTitleText, buildResult, limit = 8) => {
            let count = 0;
            for (const item of list) {
                if (count >= limit) break;
                const text = getTitleText(item);
                if (!textIncludesAllTokens(text, tokens)) continue;
                results.push(buildResult(item));
                count += 1;
            }
        };

        addMatches(
            'post',
            state.index.posts,
            (p) => p.title || '',
            (p) => ({
                type: 'post',
                icon: '📝',
                title: p.title || '(未命名)',
                meta: p.date || '',
                url: p.url,
                filename: p.filename
            }),
            10
        );

        addMatches(
            'image',
            state.index.images,
            (f) => f.name || '',
            (f) => ({
                type: 'image',
                icon: '🖼️',
                title: f.name || '(未命名)',
                meta: f.dir || 'images',
                path: f.path,
                name: f.name
            }),
            8
        );

        addMatches(
            'music',
            state.index.music,
            (f) => f.name || '',
            (f) => ({
                type: 'music',
                icon: '🎵',
                title: f.name || '(未命名)',
                meta: f.dir || 'musics',
                path: f.path,
                name: f.name
            }),
            8
        );

        addMatches(
            'video',
            state.index.videos,
            (f) => f.name || '',
            (f) => ({
                type: 'video',
                icon: '🎬',
                title: f.name || '(未命名)',
                meta: f.dir || 'videos',
                path: f.path,
                name: f.name
            }),
            8
        );
    }
    
    /**
     * 按内容搜索（全文搜索）
     */
    function searchByContent(tokens, results) {
        const addMatches = (type, list, buildText, buildResult, limit = 8) => {
            let count = 0;
            for (const item of list) {
                if (count >= limit) break;
                const text = buildText(item);
                if (!textIncludesAllTokens(text, tokens)) continue;
                results.push(buildResult(item));
                count += 1;
            }
        };

        addMatches(
            'post',
            state.index.posts,
            (p) => `${p.title || ''} ${p.content || ''} ${p.filename || ''} ${p.section || ''} ${p.date || ''}`,
            (p) => ({
                type: 'post',
                icon: '📝',
                title: p.title || '(未命名)',
                meta: p.date || '',
                url: p.url,
                filename: p.filename
            }),
            10
        );

        addMatches(
            'image',
            state.index.images,
            (f) => `${f.name || ''} ${f.dir || ''} ${f.path || ''}`,
            (f) => ({
                type: 'image',
                icon: '🖼️',
                title: f.name || '(未命名)',
                meta: f.dir || 'images',
                path: f.path,
                name: f.name
            }),
            8
        );

        addMatches(
            'music',
            state.index.music,
            (f) => `${f.name || ''} ${f.dir || ''} ${f.path || ''}`,
            (f) => ({
                type: 'music',
                icon: '🎵',
                title: f.name || '(未命名)',
                meta: f.dir || 'musics',
                path: f.path,
                name: f.name
            }),
            8
        );

        addMatches(
            'video',
            state.index.videos,
            (f) => `${f.name || ''} ${f.dir || ''} ${f.path || ''}`,
            (f) => ({
                type: 'video',
                icon: '🎬',
                title: f.name || '(未命名)',
                meta: f.dir || 'videos',
                path: f.path,
                name: f.name
            }),
            8
        );
    }

    function renderGroupTitle(label) {
        const title = document.createElement('div');
        title.className = 'search-group-title';
        title.textContent = label;
        return title;
    }

    function renderResults(results) {
        state.results = results;
        state.activeIndex = -1;

        // 清空搜索结果面板
        panelEl.innerHTML = '';

        if (!results.length) {
            panelEl.classList.add('empty');
            const emptyMsg = document.createElement('div');
            emptyMsg.textContent = '未找到匹配结果';
            emptyMsg.style.padding = '10px 15px';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.color = '#666';
            panelEl.appendChild(emptyMsg);
            panelEl.style.display = 'block';
            return;
        }

        panelEl.classList.remove('empty');

        const groups = {
            post: { label: '文章', items: [] },
            image: { label: '图片', items: [] },
            music: { label: '音乐', items: [] },
            video: { label: '视频', items: [] }
        };

        for (const r of results) {
            if (groups[r.type]) groups[r.type].items.push(r);
        }

        let globalIndex = 0;

        for (const key of ['post', 'image', 'music', 'video']) {
            const group = groups[key];
            if (!group.items.length) continue;
            panelEl.appendChild(renderGroupTitle(group.label));

            for (const item of group.items) {
                const row = document.createElement('div');
                row.className = 'search-result-item';
                row.dataset.index = String(globalIndex);

                const icon = document.createElement('div');
                icon.className = 'item-icon';
                icon.textContent = item.icon;

                const text = document.createElement('div');
                text.className = 'item-text';
                text.textContent = item.title;

                const meta = document.createElement('div');
                meta.className = 'item-meta';
                meta.textContent = item.meta || '';

                row.appendChild(icon);
                row.appendChild(text);
                row.appendChild(meta);

                row.addEventListener('mouseenter', () => {
                    setActiveIndex(globalIndex);
                });

                row.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openResult(item);
                });

                panelEl.appendChild(row);
                globalIndex += 1;
            }
        }

        panelEl.style.display = 'block';
    }

    function setActiveIndex(idx) {
        state.activeIndex = idx;

        panelEl.querySelectorAll('.search-result-item.active').forEach(el => el.classList.remove('active'));
        const current = panelEl.querySelector(`.search-result-item[data-index="${idx}"]`);
        if (current) {
            current.classList.add('active');
            current.scrollIntoView({ block: 'nearest' });
        }
    }

    function hidePanel() {
        panelEl.style.display = 'none';
        panelEl.classList.remove('empty');
        panelEl.innerHTML = '';
        state.results = [];
        state.activeIndex = -1;
    }

    function openResult(item) {
        hidePanel();

        if (!item) return;

        if (item.type === 'post') {
            if (globalThis.articleReader?.openBlogArticle) {
                globalThis.articleReader.openBlogArticle(item.url, item.filename);
            } else if (item.url) {
                window.location.href = item.url;
            }
            return;
        }

        const media = globalThis.mediaPlayer;
        if (!media || !item.path) {
            if (item.path) window.open(item.path, '_blank');
            return;
        }

        if (item.type === 'image') {
            media.previewImage?.(item.path, item.name);
        } else if (item.type === 'music') {
            media.playAudio?.(item.path, item.name);
        } else if (item.type === 'video') {
            media.playVideo?.(item.path, item.name);
        }
    }

    return {
        init
    };
})();
