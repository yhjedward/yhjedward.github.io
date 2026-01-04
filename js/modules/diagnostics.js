/**
 * 模块初始化诊断脚本
 * 用于验证所有模块是否正确初始化
 */

(function() {
  console.log('[ModulesDiagnostics] 开始诊断模块初始化状态...\n');

  // 1. 检查 coreInit 对象
  console.log('=== 1. CoreInit 对象检查 ===');
  if (typeof globalThis.coreInit !== 'undefined') {
    console.log('✓ coreInit 已加载');
    console.log('  - initAll 函数:', typeof globalThis.coreInit.initAll);
    console.log('  - reinitAll 函数:', typeof globalThis.coreInit.reinitAll);
    console.log('  - 已初始化的模块:', Array.from(globalThis.coreInit.initialized));
  } else {
    console.warn('✗ coreInit 未加载');
  }

  // 2. 检查所有模块
  console.log('\n=== 2. 模块可用性检查 ===');
  const expectedModules = [
    'highlightInit',
    'mermaidInit',
    'collapseInit',
    'tabPanelInit',
    'codeBlocksInit',
    'spoilerInit',
    'tocInit',
    'latexInit'
  ];

  expectedModules.forEach(module => {
    if (typeof globalThis.modules !== 'undefined' && globalThis.modules[module]) {
      console.log(`✓ ${module} 已加载`);
    } else {
      console.warn(`✗ ${module} 未加载`);
    }
  });

  // 3. 检查外部库
  console.log('\n=== 3. 外部库检查 ===');
  console.log('✓ hljs:', typeof globalThis.hljs);
  console.log('✓ mermaid:', typeof globalThis.mermaid);
  console.log('✓ katex:', typeof globalThis.katex);
  console.log('✓ renderMathInElement:', typeof globalThis.renderMathInElement);

  // 4. 检查 withHljs 函数
  console.log('\n=== 4. 工具函数检查 ===');
  if (typeof globalThis.withHljs === 'function') {
    console.log('✓ withHljs 函数可用');
  } else {
    console.warn('✗ withHljs 函数不可用');
  }

  if (typeof globalThis.initToc === 'function') {
    console.log('✓ initToc 函数可用（向后兼容）');
  } else {
    console.warn('✗ initToc 函数不可用');
  }

  // 5. 功能检查
  console.log('\n=== 5. 功能可用性检查 ===');
  const checks = {
    '代码块高亮': () => document.querySelectorAll('pre code').length > 0,
    '代码复制按钮': () => document.querySelectorAll('.copy-button').length > 0,
    '可折叠元素': () => document.querySelectorAll('.collapse-header').length > 0,
    '标签页面板': () => document.querySelectorAll('.tabpanel-tab').length > 0,
    '隐藏内容': () => document.querySelectorAll('.spoiler').length > 0,
    '数学公式': () => document.querySelectorAll('.katex').length > 0,
    '目录': () => document.querySelector('#toc') !== null
  };

  Object.entries(checks).forEach(([name, check]) => {
    try {
      if (check()) {
        console.log(`✓ ${name}`);
      } else {
        console.log(`○ ${name}（页面中未使用）`);
      }
    } catch (e) {
      console.warn(`✗ ${name}: ${e.message}`);
    }
  });

  console.log('\n=== 诊断完成 ===\n');
  console.log('如果所有项目都显示 ✓，说明模块初始化成功。');
  console.log('○ 表示该功能在页面中未使用，这是正常的。');
  console.log('✗ 表示存在问题，请检查浏览器控制台获取更多信息。');
})();
