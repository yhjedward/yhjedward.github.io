/**
 * 标签面板初始化模块
 * 负责 TabPanel 组件的标签切换和高度调整
 */

export const tabPanelInit = {
  /**
   * 初始化标签面板
   */
  init() {
    console.log('初始化标签面板');
    const tabs = document.querySelectorAll('.tabpanel-tab');
    tabs.forEach((tab) => {
      if (!('init' in tab.dataset)) {
        tab.dataset.init = 'true';
        tab.addEventListener('click', this.handleTabClick.bind(this));
      }
    });
  },

  /**
   * 标签点击事件处理
   */
  handleTabClick(event) {
    const tab = event.currentTarget;
    const tabpanel = tab.closest('.tabpanel-container');
    if (!tabpanel) return;

    const tabIndex = Array.from(tabpanel.querySelectorAll('.tabpanel-tab')).indexOf(tab);
    const contents = tabpanel.querySelectorAll('.tabpanel-content');

    // 更新激活状态
    tabpanel.querySelectorAll('.tabpanel-tab').forEach((t) => {
      t.classList.remove('active');
    });
    contents.forEach((content) => {
      content.classList.remove('active');
    });

    tab.classList.add('active');
    if (contents[tabIndex]) {
      contents[tabIndex].classList.add('active');
    }

    // 自动调整高度
    this.adjustHeight(tabpanel);

    console.log('切换到标签', tabIndex);
  },

  /**
   * 自动调整 TabPanel 高度
   */
  adjustHeight(tabpanel) {
    const contentContainer = tabpanel.querySelector('.tabpanel-content-container');
    const activeContent = tabpanel.querySelector('.tabpanel-content.active');

    if (contentContainer && activeContent) {
      const contentHeight = activeContent.scrollHeight;
      const maxHeight = 500; // 与 CSS 中的 max-height 保持一致

      if (contentHeight < maxHeight) {
        contentContainer.style.maxHeight = contentHeight + 'px';
      } else {
        contentContainer.style.maxHeight = maxHeight + 'px';
      }
    }
  },

  /**
   * 处理动态添加的标签面板
   */
  setupMutationObserver() {
    const blogContent = document.querySelector('.window-content');
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
