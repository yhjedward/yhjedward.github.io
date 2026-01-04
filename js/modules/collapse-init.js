/**
 * 折叠元素初始化模块
 * 负责 .collapse-header 类元素的折叠/展开功能
 */

export const collapseInit = {
  /**
   * 初始化折叠元素
   */
  init() {
    console.log('初始化折叠元素');
    const headers = document.querySelectorAll('.collapse-header');
    headers.forEach((header) => {
      if (!('init' in header.dataset)) {
        header.dataset.init = 'true';
        header.addEventListener('click', this.handleHeaderClick.bind(this));
      }
    });
  },

  /**
   * 折叠标题点击事件处理
   */
  handleHeaderClick(event) {
    const header = event.currentTarget;
    const container = header.closest('.collapse-container');

    if (!container) return;

    // 切换 active 类来匹配 CSS 定义
    container.classList.toggle('active');
    header.classList.toggle('active');

    console.log('点击了折叠标题', container);
  },

  /**
   * 处理动态添加的折叠元素
   */
  setupMutationObserver() {
    const blogContent = document.querySelector('.blog-window .window-content');
    if (!blogContent) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          this.init();
        }
      });
    });

    observer.observe(blogContent, { childList: true, subtree: true });
  }
};
