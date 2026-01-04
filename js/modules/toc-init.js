/**
 * 目录 (TOC) 初始化模块
 * 负责生成和管理文章目录的功能
 */

export const tocInit = {
  /**
   * 初始化目录
   */
  init() {
    const blogRoot = document.querySelector('.blog-window .window-content');
    if (!blogRoot) return;

    const tocNav = blogRoot.querySelector('#toc-nav');
    const tocToggle = blogRoot.querySelector('#toc-toggle');
    let tocList = blogRoot.querySelector('#toc-list, .toc-list');

    // 绑定展开/折叠事件
    if (tocToggle && tocNav && !('init' in tocToggle.dataset)) {
      tocToggle.dataset.init = 'true';
      tocToggle.addEventListener('click', () => {
        tocNav.classList.toggle('collapsed');
      });
    }

    // 若没有目录容器，直接返回
    if (!tocNav) return;

    // 基于文章标题生成目录
    this.generateTocFromHeadings(blogRoot, tocNav, tocList);

    // 绑定平滑滚动事件
    this.setupSmoothScroll(blogRoot);
  },

  /**
   * 从文章标题生成目录
   */
  generateTocFromHeadings(blogRoot, tocNav, tocList) {
    const existingAnchors = tocList ? tocList.querySelectorAll('a[href^="#"]') : null;

    if (existingAnchors && existingAnchors.length > 0) {
      return; // 已有目录，不重新生成
    }

    const article = blogRoot.querySelector('.article-content');
    if (!article) return;

    // 创建容器
    if (!tocList) {
      tocList = document.createElement('div');
      tocList.className = 'toc-list';
      tocNav.appendChild(tocList);
    }

    // 清空老内容
    tocList.innerHTML = '';

    const headings = article.querySelectorAll('h2, h3, h4');
    if (headings.length === 0) return;

    const ul = document.createElement('ul');
    headings.forEach((h, idx) => {
      if (!h.id) h.id = `heading-${idx}`;

      const li = document.createElement('li');
      li.className = 'toc-item';

      const a = document.createElement('a');
      a.className = 'toc-link';
      a.href = `#${h.id}`;
      a.textContent = (h.textContent || '').trim();

      li.appendChild(a);
      ul.appendChild(li);
    });

    tocList.appendChild(ul);
  },

  /**
   * 设置目录平滑滚动
   */
  setupSmoothScroll(blogRoot) {
    if ('tocScrollInit' in blogRoot.dataset) return;

    blogRoot.dataset.tocScrollInit = 'true';
    blogRoot.addEventListener('click', (e) => {
      const link = e.target.closest('.toc-list a[href^="#"]');
      if (!link) return;

      const id = decodeURIComponent(link.getAttribute('href').slice(1));
      const target = blogRoot.querySelector(`#${CSS.escape(id)}`);

      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  },

  /**
   * 处理动态添加的内容，重新生成目录
   */
  setupMutationObserver() {
    const blogRoot = document.querySelector('.blog-window .window-content');
    if (!blogRoot) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          this.init();
        }
      });
    });

    observer.observe(blogRoot, { childList: true, subtree: true });
  }
};

// 暴露给全局以供其他脚本调用
globalThis.initToc = tocInit.init.bind(tocInit);
