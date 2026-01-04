/**
 * Random Article Module
 * 随机打开一篇文章的功能
 */

export const RandomArticle = (() => {
    let blogData = null;

    function init() {
        // 从HTML脚本标签中获取博客数据
        const blogDataEl = document.querySelector('#blog-data');
        if (!blogDataEl) {
            console.error('[RandomArticle] Blog data not found');
            return;
        }

        try {
            const raw = (blogDataEl.textContent || '').trim();
            blogData = JSON.parse(raw);
        } catch (e) {
            console.error('[RandomArticle] Failed to parse blog data', e);
            return;
        }

        // 绑定随机文章按钮
        bindButton();
    }

    function bindButton() {
        const btn = document.getElementById('random-article-btn');
        if (!btn) {
            console.warn('[RandomArticle] Random article button not found');
            return;
        }

        btn.addEventListener('click', openRandomArticle);
    }

    function openRandomArticle() {
        if (!blogData || !blogData.posts || !blogData.posts.length) {
            alert('没有可用的文章');
            return;
        }

        // 从所有文章中随机选择一篇
        const randomIndex = Math.floor(Math.random() * blogData.posts.length);
        const article = blogData.posts[randomIndex];

        if (!article || !article.url) {
            alert('无法打开文章，请重试');
            return;
        }

        // 调用全局的 articleReader 来打开文章
        if (window.articleReader && window.articleReader.openBlogArticle) {
            window.articleReader.openBlogArticle(article.url, article.filename);
        } else {
            console.error('[RandomArticle] ArticleReader not available');
            alert('文章阅读器未初始化');
        }
    }

    return {
        init
    };
})();
