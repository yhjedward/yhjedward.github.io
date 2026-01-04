/**
 * Mermaid 图表初始化模块
 * 负责 Mermaid 流程图、时序图等的渲染
 */

export const mermaidInit = {
  /**
   * 初始化 Mermaid
   */
  init() {
    // 等待 Mermaid 库加载完成
    if (!globalThis.mermaid) {
      console.log('[MermaidInit] 等待 Mermaid 库加载...');
      this.waitForMermaid();
      return;
    }

    if (!globalThis.mermaidInitialized) {
      console.log('[MermaidInit] 初始化 Mermaid 库');
      globalThis.mermaid.initialize({ startOnLoad: false });
      globalThis.mermaidInitialized = true;
    }

    // 首次渲染
    console.log('[MermaidInit] 渲染 Mermaid 图表');
    this.renderInScope(document);
  },

  /**
   * 等待 Mermaid 库加载完成
   */
  waitForMermaid() {
    const maxWaitTime = 10000; // 最多等待 10 秒
    const checkInterval = 100; // 每 100ms 检查一次
    let elapsed = 0;

    const checkLoad = setInterval(() => {
      elapsed += checkInterval;
      
      if (globalThis.mermaid) {
        clearInterval(checkLoad);
        console.log('[MermaidInit] Mermaid 库加载完成，执行初始化');
        this.init();
      } else if (elapsed >= maxWaitTime) {
        clearInterval(checkLoad);
        console.warn('[MermaidInit] Mermaid 库加载超时');
      }
    }, checkInterval);
  },

  /**
   * 在指定范围内渲染 Mermaid 图表
   */
  renderInScope(scope) {
    if (!globalThis.mermaid) {
      console.warn('[MermaidInit] Mermaid 库未加载');
      return;
    }

    const root = scope || document;
    const targets = root.querySelectorAll('.mermaid');

    if (!targets || !targets.length) {
      console.log('[MermaidInit] 未找到 .mermaid 元素');
      return;
    }

    console.log('[MermaidInit] 找到 ' + targets.length + ' 个 Mermaid 图表');

    targets.forEach((el, index) => {
      // 如果 SVG 已存在，跳过；否则删除 data-processed 以强制重新渲染
      if (!el.querySelector('svg')) {
        delete el.dataset.processed;
        console.log('[MermaidInit] 准备渲染第 ' + (index + 1) + ' 个图表');
      }
    });

    // 使用 contentLoaded 事件来确保渲染完成
    try {
      globalThis.mermaid.contentLoaded();
    } catch (e) {
      console.error('[MermaidInit] Mermaid 渲染错误:', e);
    }
  },

  /**
   * 监视动态加载的 Mermaid 图表
   */
  setupMutationObserver() {
    const blogContent = document.querySelector('.blog-window .window-content');
    if (blogContent) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            console.log('[MermaidInit] 检测到新内容，重新渲染 Mermaid');
            // 渲染新添加的 Mermaid 图表
            this.renderInScope(document);
          }
        });
      });

      observer.observe(blogContent, { childList: true, subtree: true });
    }
  },

  /**
   * 监视博客窗口可见性变化，重新渲染
   */
  setupVisibilityObserver() {
    const blogWindow = document.querySelector('.blog-window');
    if (blogWindow) {
      const visObserver = new MutationObserver(() => {
        const style = getComputedStyle(blogWindow);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          console.log('[MermaidInit] 博客窗口显示，重新渲染 Mermaid');
          this.renderInScope(blogWindow);
        }
      });

      visObserver.observe(blogWindow, {
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }
  }
};
