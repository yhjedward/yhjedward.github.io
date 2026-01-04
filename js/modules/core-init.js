/**
 * 核心初始化管理器
 * 协调所有功能模块的初始化和生命周期
 */

import { highlightInit } from './highlight-init.js';
import { mermaidInit } from './mermaid-init.js';
import { collapseInit } from './collapse-init.js';
import { tabPanelInit } from './tabpanel-init.js';
import { codeBlocksInit } from './code-blocks-init.js';
import { spoilerInit } from './spoiler-init.js';
import { tocInit } from './toc-init.js';
import { latexInit } from './latex-init.js';

/**
 * 核心初始化管理器
 */
export const coreInit = {
  /**
   * 所有初始化模块
   */
  modules: [
    { name: 'highlight', module: highlightInit },
    { name: 'mermaid', module: mermaidInit },
    { name: 'collapse', module: collapseInit },
    { name: 'tabPanel', module: tabPanelInit },
    { name: 'codeBlocks', module: codeBlocksInit },
    { name: 'spoiler', module: spoilerInit },
    { name: 'toc', module: tocInit },
    { name: 'latex', module: latexInit }
  ],

  /**
   * 记录初始化状态
   */
  initialized: new Set(),

  /**
   * 初始化所有模块
   */
  initAll() {
    console.log('[CoreInit] 开始初始化所有模块');

    try {
      // 第一阶段：初始化基础功能
      this.initModule('highlight');
      this.initModule('mermaid');
      this.initModule('latex');

      // 第二阶段：初始化交互功能
      this.initModule('collapse');
      this.initModule('tabPanel');
      this.initModule('codeBlocks');
      this.initModule('spoiler');
      this.initModule('toc');

      console.log('[CoreInit] 所有模块初始化完成');
    } catch (error) {
      console.error('[CoreInit] 初始化过程中出错:', error);
    }
  },

  /**
   * 初始化单个模块
   */
  initModule(moduleName) {
    if (this.initialized.has(moduleName)) {
      console.warn(`[CoreInit] 模块 ${moduleName} 已初始化，跳过`);
      return;
    }

    const moduleConfig = this.modules.find((m) => m.name === moduleName);
    if (!moduleConfig) {
      console.warn(`[CoreInit] 未找到模块 ${moduleName}`);
      return;
    }

    try {
      const { module } = moduleConfig;

      // 调用初始化函数
      if (module.init && typeof module.init === 'function') {
        module.init();
      }

      // 设置变化观察器（如果支持）
      if (module.setupMutationObserver && typeof module.setupMutationObserver === 'function') {
        module.setupMutationObserver();
      }

      // 设置可见性观察器（Mermaid 特有）
      if (module.setupVisibilityObserver && typeof module.setupVisibilityObserver === 'function') {
        module.setupVisibilityObserver();
      }

      this.initialized.add(moduleName);
      console.log(`[CoreInit] 模块 ${moduleName} 初始化成功`);
    } catch (error) {
      console.error(`[CoreInit] 模块 ${moduleName} 初始化失败:`, error);
    }
  },

  /**
   * 重新初始化指定模块
   */
  reinitModule(moduleName) {
    this.initialized.delete(moduleName);
    this.initModule(moduleName);
  },

  /**
   * 重新初始化所有模块
   */
  reinitAll() {
    this.initialized.clear();
    this.initAll();
  }
};

/**
 * 主入口：等待 DOM 加载完成后初始化
 */
function initializeModules() {
  console.log('[CoreInit] 开始初始化模块');
  coreInit.initAll();

  // 为其他脚本暴露核心初始化器
  globalThis.coreInit = coreInit;
  globalThis.withHljs = highlightInit.withHljs.bind(highlightInit);
}

// 处理多种 DOM 就绪事件
if (document.readyState === 'loading') {
  // DOM 仍在加载
  document.addEventListener('DOMContentLoaded', initializeModules);
} else {
  // DOM 已经加载完成
  initializeModules();
}

// 确保在 window load 时也重新检查（备用方案）
window.addEventListener('load', () => {
  if (!coreInit.initialized.has('highlight')) {
    console.warn('[CoreInit] 模块未初始化，正在手动初始化...');
    coreInit.initAll();
  }
});

/**
 * 暴露模块供外部使用
 */
globalThis.modules = {
  highlightInit,
  mermaidInit,
  collapseInit,
  tabPanelInit,
  codeBlocksInit,
  spoilerInit,
  tocInit,
  latexInit
};
