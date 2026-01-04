/**
 * LaTeX / KaTeX 初始化模块
 * 负责数学公式的渲染和方程式编号
 */

export const latexInit = {
  /**
   * 初始化 KaTeX 和方程式编号
   */
  init() {
    if (typeof renderMathInElement === 'function') {
      this.renderMath();
      this.updateEquationNumbers();
      this.setupMutationObserver();
    }
  },

  /**
   * 渲染数学公式
   */
  renderMath() {
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: String.raw`\(`, right: String.raw`\)`, display: false },
        { left: String.raw`\[`, right: String.raw`\]`, display: true }
      ],
      throwOnError: false,
      output: 'html',
      strict: 'ignore'
    });
  },

  /**
   * 更新方程式编号
   */
  updateEquationNumbers() {
    const equations = document.querySelectorAll('.latex-equation');
    let autoCounter = 1;

    equations.forEach((eq) => {
      const numberElem = eq.querySelector('.equation-number');
      if (numberElem && numberElem.dataset.number === 'auto') {
        numberElem.textContent = `(${autoCounter})`;
        autoCounter++;
      }
    });
  },

  /**
   * 监听动态加载的 LaTeX 内容
   */
  setupMutationObserver() {
    const blogContent = document.querySelector('.blog-window .window-content');
    if (!blogContent) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          // 重新渲染 LaTeX
          this.renderMath();

          // 更新方程式编号
          setTimeout(() => {
            this.updateEquationNumbers();
          }, 100);
        }
      });
    });

    observer.observe(blogContent, { childList: true, subtree: true });
  }
};
