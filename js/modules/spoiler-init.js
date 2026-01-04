/**
 * Spoiler 初始化模块
 * 负责隐藏/显示 spoiler 内容的功能
 */

export const spoilerInit = {
  /**
   * 初始化 Spoiler 元素
   */
  init() {
    console.log('初始化Spoiler');
    const spoilers = document.querySelectorAll('.spoiler');
    spoilers.forEach((spoiler) => {
      if ('init' in spoiler.dataset) return;
      spoiler.dataset.init = 'true';

      // 鼠标点击事件
      spoiler.addEventListener('click', () => {
        spoiler.classList.toggle('revealed');
      });

      // 移动设备触摸事件
      spoiler.addEventListener(
        'touchstart',
        () => {
          spoiler.classList.toggle('revealed');
        },
        { passive: true }
      );
    });
  },

  /**
   * 处理动态添加的 Spoiler 元素
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
