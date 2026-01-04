/**
 * Table of Contents (TOC) Module
 * 为文章生成和管理目录导航
 */

export const TableOfContents = (() => {
    function bindToggle(root) {
        const tocNav = root.querySelector('#toc-nav');
        const tocToggle = root.querySelector('#toc-toggle');
        const tocIcon = root.querySelector('.toc-toggle-icon');
        if (!tocNav || !tocToggle || !tocIcon) return;

        // 同步图标初始状态
        if (tocNav.classList.contains('collapsed')) {
            tocIcon.classList.add('collapsed');
        } else {
            tocIcon.classList.remove('collapsed');
        }

        // 检查切换按钮是否已绑定事件
        if (!('init' in tocToggle.dataset)) {
            tocToggle.dataset.init = 'true';
            tocToggle.addEventListener('click', () => {
                const collapsed = tocNav.classList.toggle('collapsed');
                if (collapsed) tocIcon.classList.add('collapsed');
                else tocIcon.classList.remove('collapsed');
            });
        }
    }

    function ensureList(root) {
        let tocList = root.querySelector('#toc-list, .toc-list');
        const tocNav = root.querySelector('#toc-nav');
        if (!tocList && tocNav) {
            tocList = document.createElement('div');
            tocList.className = 'toc-list';
            tocNav.appendChild(tocList);
        }
        return tocList;
    }

    // 根据标题级别生成嵌套的 UL 列表
    function buildNestedToc(headings, container) {
        const minLevel = 2; // 从 h2 开始嵌套
        let currentLevel = minLevel;
        let currentUl = document.createElement('ul');
        container.appendChild(currentUl);
        const stack = [currentUl];

        headings.forEach(({el, id, level, text}) => {
            // 调整嵌套级别
            if (level > currentLevel) {
                // 更深层：创建子 UL
                for (let l = currentLevel; l < level; l++) {
                    const lastLi = stack.at(-1).lastElementChild;
                    const childUl = document.createElement('ul');
                    (lastLi || stack.at(-1)).appendChild(childUl);
                    stack.push(childUl);
                }
            } else if (level < currentLevel) {
                // 更浅层：弹出
                for (let l = currentLevel; l > level; l--) {
                    if (stack.length > 1) stack.pop();
                }
            }
            currentLevel = level;

            const li = document.createElement('li');
            li.className = 'toc-item';
            const a = document.createElement('a');
            a.className = 'toc-link';
            a.href = `#${id}`;
            a.textContent = text;
            li.appendChild(a);
            stack.at(-1).appendChild(li);
        });
    }

    function generateIfEmpty(root) {
        const tocList = ensureList(root);
        if (!tocList) return;
        const existingAnchors = tocList.querySelectorAll('a[href^="#"]');
        if (existingAnchors && existingAnchors.length > 0) return; // 已渲染

        const article = root.querySelector('.article-content');
        if (!article) return;

        // 清空并重建
        tocList.innerHTML = '';
        const raw = Array.from(article.querySelectorAll('h2, h3, h4, h5, h6'));
        if (raw.length === 0) return;

        const headings = raw.map((h, idx) => {
            if (!h.id) h.id = `heading-${idx}`;
            const level = Math.max(2, Math.min(6, Number.parseInt(h.tagName.substring(1), 10) || 2));
            const text = (h.textContent || '').trim();
            return { el: h, id: h.id, level, text };
        });

        buildNestedToc(headings, tocList);
    }

    function setActive(root, id) {
        const container = root.querySelector('.toc-list');
        if (!container) return;

        // 激活链接
        container.querySelectorAll('.toc-link.active').forEach(a => a.classList.remove('active'));
        const activeLink = container.querySelector(`.toc-link[href="#${CSS.escape(id)}"]`);
        if (activeLink) activeLink.classList.add('active');

        // 高亮目标标题
        const article = root.querySelector('.article-content');
        if (!article) return;
        article.querySelectorAll('.heading-highlight').forEach(h => h.classList.remove('heading-highlight'));
        const target = article.querySelector(`#${CSS.escape(id)}`);
        if (target) target.classList.add('heading-highlight');
    }

    function bindSmoothScroll(root) {
        if (!('tocScrollInit' in root.dataset)) {
            root.dataset.tocScrollInit = 'true';
            root.addEventListener('click', (e) => {
                const link = e.target.closest('.toc-list a[href^="#"]');
                if (!link) return;
                const id = decodeURIComponent(link.getAttribute('href').slice(1));
                const target = root.querySelector(`#${CSS.escape(id)}`);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth' });
                    setActive(root, id);
                }
            });
        }
    }

    function setupScrollSpy(root) {
        const article = root.querySelector('.article-content');
        const container = root.querySelector('.toc-list');
        if (!article || !container) return;

        const headings = Array.from(article.querySelectorAll('h2, h3, h4, h5, h6'));
        if (headings.length === 0) return;

        let ticking = false;
        function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                ticking = false;
                let current = headings[0];
                const threshold = 120; // px from top
                for (const h of headings) {
                    const rect = h.getBoundingClientRect();
                    if (rect.top <= threshold) current = h; else break;
                }
                if (current?.id) 
                    setActive(root, current.id);
            });
        }
        window.removeEventListener('scroll', onScroll);
        window.addEventListener('scroll', onScroll, { passive: true });
        // 初始化
        onScroll();
    }

    function initTocContext(context) {
        const root = context || document;
        // 优先选择 blog-window 内容（动态应用外壳）
        const blogRoot = root.querySelector ? (root.querySelector('.blog-window .window-content') || root) : document;
        bindToggle(blogRoot);
        generateIfEmpty(blogRoot);
        bindSmoothScroll(blogRoot);
        setupScrollSpy(blogRoot);
    }

    /**
     * 初始化 TOC 模块
     */
    function init() {
        console.log('[TableOfContents] Initializing');
        try { 
            initTocContext(document); 
        } catch(e) { 
            console.error('[TableOfContents] DOMContentLoaded error', e); 
        }

        // 观察内容变化，重新初始化动态注入的文章
        const blogContent = document.querySelector('.blog-window .window-content');
        if (blogContent) {
            const observer = new MutationObserver((mutations) => {
                for (const m of mutations) {
                    if (m.addedNodes && m.addedNodes.length > 0) {
                        try { 
                            initTocContext(document); 
                        } catch(e) {
                            console.error('[TableOfContents] MutationObserver error', e);
                        }
                        break;
                    }
                }
            });
            observer.observe(blogContent, { childList: true, subtree: true });
        }
    }

    return {
        init,
        initTocContext
    };
})();
