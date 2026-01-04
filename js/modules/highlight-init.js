/**
 * Highlight.js 初始化模块
 * 负责代码块的语法高亮显示
 */

export const highlightInit = {
  /**
   * 使用 hljs 包装函数，安全地调用highlight.js
   */
  withHljs(fn) {
    if (globalThis.hljs && typeof fn === 'function') {
      fn();
      return;
    }
    const err = new Error('Highlight.js (hljs) not loaded');
    console.error(err);
    throw err;
  },

  /**
   * 初始化高亮功能
   */
  init() {
    this.withHljs(() => {
      hljs.highlightAll();
    });
  },

  /**
   * 处理动态加载的代码块高亮
   */
  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const codeBlocks = document.querySelectorAll('pre code:not(.hljs)');
          if (codeBlocks.length > 0) {
            codeBlocks.forEach((block) => {
              this.withHljs(() => {
                hljs.highlightElement(block);
              });
            });
          }
        }
      });
    });

    const blogContent = document.querySelector('.window-content');
    if (blogContent) {
      observer.observe(blogContent, { childList: true, subtree: true });
    }
  },

  /**
   * 为文章内的代码块添加复制按钮
   */
  enhanceCodeBlocks() {
    document.querySelectorAll('.article-content pre').forEach((pre) => {
      // 跳过已初始化的
      if (pre.dataset.enhanced === 'true') return;
      pre.dataset.enhanced = 'true';

      // 创建复制按钮
      const copyButton = document.createElement('button');
      copyButton.className = 'copy-button';
      copyButton.textContent = '复制';
      pre.appendChild(copyButton);

      // 获取代码语言
      const code = pre.querySelector('code');
      if (code && code.className) {
        const lang = code.className.match(/language-(\w+)/);
        if (lang && lang[1]) {
          pre.dataset.lang = lang[1];
        }
      }

      // 添加复制功能
      copyButton.addEventListener('click', () => {
        const text = pre.querySelector('code').textContent;
        navigator.clipboard
          .writeText(text)
          .then(() => {
            copyButton.textContent = '已复制!';
            copyButton.classList.add('copied');
            setTimeout(() => {
              copyButton.textContent = '复制';
              copyButton.classList.remove('copied');
            }, 2000);
          })
          .catch((err) => {
            console.error('复制失败: ', err);
            copyButton.textContent = '复制失败';
            setTimeout(() => {
              copyButton.textContent = '复制';
            }, 2000);
          });
      });
    });
  }
};
