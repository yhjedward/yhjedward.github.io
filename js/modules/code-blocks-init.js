/**
 * 代码块增强初始化模块
 * 负责编辑代码块、TabPanel 内的代码块等功能
 */

export const codeBlocksInit = {
  /**
   * 全局函数：安全地使用 hljs
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
   * 初始化所有代码块
   */
  init() {
    console.log('初始化代码块');
    this.initTabPanelInlineCodes();
    this.initEnhancedCodeBlocks();
  },

  /**
   * 初始化 TabPanel 内联代码块
   */
  initTabPanelInlineCodes() {
    const tabPreBlocks = document.querySelectorAll('.tabpanel-content pre');
    tabPreBlocks.forEach((pre) => {
      if (pre.dataset.editable === 'true') return; // 已初始化
      pre.dataset.editable = 'true';
      pre.style.position = 'relative';

      // 创建编辑按钮
      const editBtn = document.createElement('button');
      editBtn.className = 'edit-button';
      editBtn.textContent = '编辑';
      pre.appendChild(editBtn);

      // 创建复制按钮
      if (!pre.querySelector('.copy-button')) {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-button';
        copyBtn.textContent = '复制';
        pre.appendChild(copyBtn);

        copyBtn.addEventListener('click', () => {
          const text = pre.querySelector('code')?.textContent || '';
          navigator.clipboard
            .writeText(text)
            .then(() => {
              copyBtn.textContent = '已复制!';
              setTimeout(() => {
                copyBtn.textContent = '复制';
              }, 2000);
            })
            .catch((err) => {
              console.error('复制失败:', err);
            });
        });
      }
      let textarea = null;
      let editing = false;
      const codeElem = pre.querySelector('code') || pre;
      editBtn.addEventListener('click', () => {
        if (editing) {
          // 保存并退出编辑
          if (textarea) {
            codeElem.textContent = textarea.value;
            textarea.remove();
            textarea = null;
          }
          // 移除最小高度限制
          pre.style.minHeight = '';
          codeElem.style.display = '';
          pre.classList.remove('editing');
          editBtn.textContent = '编辑';
          editing = false;
          // 重新高亮
          if (codeElem !== pre) {
            withHljs(function () { hljs.highlightElement(codeElem); });
          }
        } else {
          // 进入编辑模式：隐藏原 code / pre，显示 textarea
          // 记录原始高度，防止隐藏 code 后高度塌陷
          const preOriginalHeight = pre.offsetHeight;
          pre.style.minHeight = preOriginalHeight + 'px';
          textarea = document.createElement('textarea');
          textarea.className = 'inline-code-editor';
          textarea.value = codeElem.textContent;
          textarea.style.position = 'absolute';
          textarea.style.left = '0';
          textarea.style.top = '0';
          textarea.style.width = '100%';
          textarea.style.height = '100%';
          textarea.style.boxSizing = 'border-box';
          textarea.style.padding = getComputedStyle(pre).padding;
          textarea.style.font = getComputedStyle(pre).font;
          textarea.style.color = getComputedStyle(pre).color;
          textarea.style.background = getComputedStyle(pre).background;
          textarea.style.border = 'none';
          textarea.style.outline = 'none';
          textarea.style.resize = 'vertical';
          pre.appendChild(textarea);
          pre.classList.add('editing');
          codeElem.style.display = 'none';
          textarea.focus();
          editBtn.textContent = '保存';
          editing = true;
        }
      });
    });
  },

  /**
   * 初始化增强的代码块
   */
  initEnhancedCodeBlocks() {
    const codeBlocks = document.querySelectorAll('.enhanced-code-block');

    codeBlocks.forEach((block) => {
      if ('init' in block.dataset) return;
      block.dataset.init = 'true';

      const copyBtn = block.querySelector('.code-copy-btn');
      const editBtn = block.querySelector('.code-edit-btn');
      const code = block.querySelector('code');
      const editor = block.querySelector('.code-editor');
      const pre = block.querySelector('.code-pre');

      // 应用高亮
      if (code && !code.classList.contains('hljs')) {
        this.withHljs(() => {
          hljs.highlightElement(code);
        });
      }

      // 复制按钮功能
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          const textToCopy =
            editor.style.display === 'none' ? code.textContent : editor.value;

          navigator.clipboard
            .writeText(textToCopy)
            .then(() => {
              copyBtn.classList.add('success');
              setTimeout(() => {
                copyBtn.classList.remove('success');
              }, 2000);
            })
            .catch((err) => {
              console.error('复制失败:', err);
            });
        });
      }

      // 编辑按钮功能
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          if (editor.style.display === 'none') {
            pre.style.display = 'none';
            editor.style.display = 'block';
            editor.focus();
            editBtn.title = '保存代码';
          } else {
            code.textContent = editor.value;
            pre.style.display = 'block';
            editor.style.display = 'none';
            editBtn.title = '编辑代码';

            this.withHljs(() => {
              hljs.highlightElement(code);
            });
          }
        });
      }

      // 实时同步编辑
      if (editor) {
        editor.addEventListener('input', () => {
          code.textContent = editor.value;
          this.withHljs(() => {
            hljs.highlightElement(code);
          });
        });
      }
    });
  },

  /**
   * 处理动态加载的代码块
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
