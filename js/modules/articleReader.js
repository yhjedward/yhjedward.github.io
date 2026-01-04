/**
 * Article Reader Module
 * 处理博客文章的打开和显示
 */

import { Utils } from './utils.js';

export const ArticleReader = (() => {
    let taskbarItems;
    let currentArticleIcon;

    function init(taskbarContainer) {
        taskbarItems = taskbarContainer;
    }

    function openBlogArticle(url, filename, fragment) {
        if (!taskbarItems) {
            console.error('ArticleReader not initialized');
            return;
        }

        // 解析窗口标题
        let title = filename;
        if (filename) {
            title = filename.split('/').pop().replace(/\.md$/, '');
            title = Utils.decodeMaybeEncoded(title);
        } else {
            const urlParts = url.split('/');
            title = Utils.decodeMaybeEncoded(urlParts[urlParts.length - 2]) || '博客文章';
        }

        const blogWindow = document.querySelector('.blog-window');
        if (!blogWindow) {
            console.error('Blog window element not found');
            return;
        }

        // 查找或创建任务栏图标
        let icon = taskbarItems.querySelector(`a.taskbar-item[data-url="${url}"]`);
        if (!icon) {
            icon = document.createElement('a');
            icon.href = '#';
            icon.className = 'taskbar-item';
            icon.dataset.url = url;
            icon.dataset.filename = filename;
            icon.innerHTML = `<div class="icon">📝</div><span></span>`;
            icon.querySelector('span').textContent = title;
            icon.addEventListener('click', (e) => {
                e.preventDefault();
                openBlogArticle(url, filename);
            });
            taskbarItems.appendChild(icon);
        } else {
            const span = icon.querySelector('span');
            if (span) span.textContent = title;
        }

        icon.style.display = 'flex';
        icon.classList.add('active');
        currentArticleIcon = icon;

        // 显示窗口
        blogWindow.style.display = 'flex';
        blogWindow.style.opacity = '1';
        blogWindow.classList.remove('minimized');
        blogWindow.classList.add('restored');

        const titleEl = blogWindow.querySelector('.window-title');
        titleEl.textContent = title;

        const blogContent = blogWindow.querySelector('.window-content');
        blogContent.innerHTML = '加载中...';

        // 加载内容
        fetch(url)
            .then(res => res.text())
            .then(html => {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                const mainContent = tempDiv.querySelector('#main-article-content');

                if (mainContent) {
                    blogContent.innerHTML = mainContent.innerHTML;
                    addLightboxToArticleImages(blogContent);
                    // 注入AI按钮和对话框（如果不存在）
                    injectAIElements(tempDiv);
                } else {
                    blogContent.innerHTML = '加载失败';
                }

                // 初始化目录
                try {
                    if (globalThis.initToc) globalThis.initToc();
                } catch (e) {
                    console.error('initToc 调用失败', e);
                }

                // 处理跳转
                if (fragment && fragment.trim()) {
                    handleFragment(blogContent, fragment);
                }
            })
            .catch(() => {
                blogContent.innerHTML = '加载失败';
            });
    }

    function handleFragment(contentElement, fragment) {
        try {
            const q = fragment.trim();
            const nodes = contentElement.querySelectorAll('p, h1, h2, h3, li, div');
            let found = null;

            for (const n of nodes) {
                if ((n.textContent || '').toLowerCase().indexOf(q.toLowerCase()) !== -1) {
                    found = n;
                    break;
                }
            }

            if (found) {
                const txt = found.innerHTML;
                const idx = (found.textContent || '').toLowerCase().indexOf(q.toLowerCase());

                if (idx !== -1) {
                    const original = found.textContent || '';
                    const start = Math.max(0, idx - 0);
                    const before = original.slice(0, idx);
                    const match = original.slice(idx, idx + q.length);
                    const after = original.slice(idx + q.length);

                    found.innerHTML = Utils.escapeHtml(before) + '<mark>' + Utils.escapeHtml(match) + '</mark>' + Utils.escapeHtml(after);
                }

                found.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } catch (e) {
            console.error('Fragment handling failed', e);
        }
    }

    function addLightboxToArticleImages(contentElement) {
        if (!contentElement) return;

        const images = contentElement.querySelectorAll('img');

        images.forEach(img => {
            img.style.cursor = 'zoom-in';
            img.title = '点击查看大图';
            img.classList.add('lightbox-enabled');

            img.addEventListener('click', (event) => {
                event.stopPropagation();
                event.preventDefault();

                const imgSrc = img.src;
                const imgAlt = img.alt || '图片';

                if (imgSrc && imgSrc !== 'undefined' && imgSrc !== '') {
                    try {
                        if (globalThis.mediaPlayer && typeof globalThis.mediaPlayer.previewImage === 'function') {
                            globalThis.mediaPlayer.previewImage(imgSrc, imgAlt);
                        }
                    } catch (e) {
                        console.error('Preview image failed', e);
                    }
                }
            });
        });
    }


    function injectAIElements(sourceDoc) {
        // 检查AI按钮和对话框是否已存在于页面中
        let existingButton = document.querySelector('.ai-button-container');
        let existingSlideout = document.querySelector('#ai-slideout');
        // 从源文档中提取AI元素
        const aiButton = sourceDoc.querySelector('.ai-button-container');
        const aiSlideout = sourceDoc.querySelector('#ai-slideout');
        // 如果源文档有AI元素，将它们注入到页面
        if (aiButton && !existingButton) {
            document.body.appendChild(aiButton.cloneNode(true));
            existingButton = document.querySelector('.ai-button-container');
        }
        if (aiSlideout && !existingSlideout) {
            document.body.appendChild(aiSlideout.cloneNode(true));
            existingSlideout = document.querySelector('#ai-slideout');
        }
        // 重新初始化 AI slideout（如果全局函数存在）
        if (existingButton && existingSlideout && globalThis.AISlideout) {
            // 确保事件监听器已正确绑定
            // AI slideout 脚本应该已经在加载时初始化，但我们触发一次重新初始化
            const event = new CustomEvent('ai-slideout-reinit');
            document.dispatchEvent(event);
        }
    }

    function getCurrentArticleIcon() {
        return currentArticleIcon;
    }

    return {
        init,
        openBlogArticle,
        addLightboxToArticleImages,
        getCurrentArticleIcon
    };
})();
