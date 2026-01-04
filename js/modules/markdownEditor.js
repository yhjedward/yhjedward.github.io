/**
 * Markdown Editor Module
 * Markdown 编辑器功能
 */

export const MarkdownEditor = (() => {
    const selectors = {
        window: '#md-window',
        icon: '#markdown-editor',
        input: '#md-editor',
        preview: '#md-preview',
        minimize: '.md-minimize',
        maximize: '.md-maximize',
        close: '.md-close',
        taskbarIcon: '[data-app="markdown"]'
    };

    const state = {
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        hasUnsavedChanges: false,
        content: ''
    };

    // API Base URL configuration
    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3001'
        : '';

    /**
     * 初始化 Markdown Editor 模块
     */
    function init() {
        console.log('[MarkdownEditor] Initializing');
        const win = document.querySelector(selectors.window);
        if (!win) {
            console.warn('[MarkdownEditor] Markdown window not found');
            return;
        }

        // 监听窗口可见性变化
        const observer = new MutationObserver(() => {
            updateState();
        });

        observer.observe(win, {
            attributes: true,
            attributeFilter: ['style', 'class']
        });

        // 初始状态
        updateState();

        // 绑定桌面图标点击事件
        const icon = document.querySelector(selectors.icon);
        if (icon) {
            icon.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                open();
            });
        }

        // Setup editor events for preview and sync scroll
        const input = document.querySelector(selectors.input);

        if (input) {
            // Preview update
            input.addEventListener('input', () => {
                updatePreview();
                updateState();
            });

            // Sync scroll: Editor -> Preview
            input.addEventListener('scroll', () => {
                syncScroll();
            });

            // Initial render if has content
            if (input.value) updatePreview();
        }

        // 绑定工具栏按钮事件
        _bindToolbarEvents();

        // 绑定分割条拖动事件
        _bindResizerEvents();
    }

    /**
     * 绑定工具栏按钮事件
     */
    function _bindToolbarEvents() {
        const toolbar = document.querySelector('.md-toolbar');
        if (!toolbar) return;

        toolbar.addEventListener('click', (e) => {
            const btn = e.target.closest('.md-btn');
            if (!btn) return;

            const cmd = btn.dataset.cmd;
            const action = btn.dataset.action;

            if (cmd) {
                _handleMarkdownCommand(cmd);
            } else if (action) {
                // 传入按钮引用，这样后续的操作（如 AI 请求）可以禁用/恢复按钮状态
                _handleAction(action, btn);
            }
        });
    }

    /**
     * 绑定分割条拖动事件
     */
    function _bindResizerEvents() {
        const resizer = document.getElementById('md-resizer');
        const content = document.querySelector('.md-content');
        const editor = document.querySelector(selectors.input);
        const preview = document.querySelector(selectors.preview);

        if (!resizer || !content || !editor || !preview) return;

        let isResizing = false;
        let startX = 0;
        let startEditorWidth = 0;

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startEditorWidth = editor.offsetWidth;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            e.preventDefault();

            const dx = e.clientX - startX;
            const containerWidth = content.offsetWidth;
            const minWidth = 0;
            const maxWidth = containerWidth - minWidth - resizer.offsetWidth;

            let newEditorWidth = startEditorWidth + dx;
            newEditorWidth = Math.max(minWidth, Math.min(newEditorWidth, maxWidth));

            editor.style.flex = 'none';
            editor.style.width = newEditorWidth + 'px';
            preview.style.flex = '1';
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

    /**
     * 处理 Markdown 命令
     */
    function _handleMarkdownCommand(cmd) {
        const input = document.querySelector(selectors.input);
        if (!input) return;

        const start = input.selectionStart;
        const end = input.selectionEnd;
        const selected = input.value.substring(start, end);
        const before = input.value.substring(0, start);
        const after = input.value.substring(end);

        let inserted = '';

        switch (cmd) {
            case 'bold':
                inserted = `**${selected || '粗体'}**`;
                break;
            case 'italic':
                inserted = `*${selected || '斜体'}*`;
                break;
            case 'code':
                inserted = `\`${selected || '代码'}\``;
                break;
            case 'h2':
                inserted = `## ${selected || '标题'}`;
                break;
            case 'ul':
                inserted = `- ${selected || '列表项'}`;
                break;
            case 'ol':
                inserted = `1. ${selected || '列表项'}`;
                break;
            case 'link':
                inserted = `[${selected || '链接文本'}](url)`;
                break;
            case 'image':
                inserted = `![${selected || '图片描述'}](url)`;
                break;
        }

        input.value = before + inserted + after;
        input.selectionStart = start + inserted.length;
        input.selectionEnd = start + inserted.length;
        input.focus();
        updatePreview();
        updateState();
    }

    /**
     * 处理工具栏操作
     */
    function _handleAction(action, btn) {
        switch (action) {
            case 'new':
                _newFile();
                break;
            case 'save':
                _saveFile();
                break;
            case 'save-raw':
                _saveRawFile();
                break;
            case 'ai-generate':
                _generateWithAI(btn);
                break;
        }
    }

    /**
     * 新建文件
     */
    function _newFile() {
        if (state.content && !confirm('您有未保存的更改，是否继续？')) {
            return;
        }
        const input = document.querySelector(selectors.input);
        if (input) {
            input.value = '';
            updatePreview();
            updateState();
        }
    }

    /**
     * 保存文件到 docs 文件夹
     */
    async function _saveFile() {
        const content = getContent();
        if (!content.trim()) {
            alert('内容为空，无法保存');
            return;
        }

        // 从内容中提取标题（第一个 # 标题）
        const titleMatch = content.match(/^#\s+(.+?)$/m);
        const title = titleMatch ? titleMatch[1] : 'Untitled';
        const filename = `${title}.md`;

        try {
            const response = await fetch(`${API_BASE}/api/markdown/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filename: filename,
                    content: content,
                    folder: 'docs'
                })
            });

            if (response.ok) {
                const result = await response.json();
                alert(`文件已保存: ${result.filepath}`);
                const input = document.querySelector(selectors.input);
                if (input) input.classList.remove('unsaved');
                updateState();
            } else {
                const error = await response.json();
                alert(`保存失败: ${error.message}`);
            }
        } catch (err) {
            console.error('[MarkdownEditor] Save error:', err);
            alert(`保存失败: ${err.message}`);
        }
    }

    /**
     * 保存原始格式
     */
    async function _saveRawFile() {
        const content = getContent();
        if (!content.trim()) {
            alert('内容为空，无法保存');
            return;
        }

        const titleMatch = content.match(/^#\s+(.+?)$/m);
        const title = titleMatch ? titleMatch[1] : 'Untitled';
        const filename = `${title}.md`;

        try {
            const response = await fetch(`${API_BASE}/api/markdown/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filename: filename,
                    content: content,
                    folder: 'docs',
                    raw: true
                })
            });

            if (response.ok) {
                const result = await response.json();
                alert(`文件已保存: ${result.filepath}`);
            } else {
                const error = await response.json();
                alert(`保存失败: ${error.message}`);
            }
        } catch (err) {
            console.error('[MarkdownEditor] Save raw error:', err);
            alert(`保存失败: ${err.message}`);
        }
    }

    /**
     * 使用 AI 生成文章（追加到现有内容末尾）
     */
    async function _generateWithAI(btn) {
        const input = document.querySelector(selectors.input);
        const currentContent = input ? input.value : '';
        
        let promptMsg = '请输入文章主题';
        if (currentContent && currentContent.trim()) {
            promptMsg += '（将基于现有内容续写）：';
        } else {
            promptMsg += '（例如：介绍JavaScript异步编程）：';
        }

        const userPrompt = globalThis.prompt(promptMsg);
        if (!userPrompt) return;

        // 按钮状态
        if (btn) {
            btn.dataset.prevText = btn.textContent;
            btn.disabled = true;
            btn.textContent = '🤖 生成中...';
        }

        try {
            const response = await fetch(`${API_BASE}/api/ai/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: userPrompt,
                    context: currentContent
                })
            });

            if (response.ok) {
                const result = await response.json();
                const generated = (result.content || '').trim();

                if (generated) {
                    const input = document.querySelector(selectors.input);
                    if (input) {
                        const existing = input.value || '';
                        const appended = existing.trim() ? existing.trimEnd() + '\n\n' + generated : generated;
                        input.value = appended;
                        input.classList.add('unsaved');
                        updatePreview();
                        updateState();

                        // 将光标移动到文本末尾
                        input.focus();
                        input.selectionStart = input.selectionEnd = input.value.length;
                    }
                    alert('文章生成成功（已追加到编辑器末尾）！');
                } else {
                    alert('生成结果为空');
                }
            } else {
                let errorMessage = '未知错误';
                try {
                    const error = await response.json();
                    errorMessage = error.message || error.error || JSON.stringify(error);
                } catch (e) {
                    errorMessage = `HTTP ${response.status} ${response.statusText}`;
                    console.error('[MarkdownEditor] Non-JSON error response:', await response.text());
                }
                alert(`生成失败: ${errorMessage}`);
            }
        } catch (err) {
            console.error('[MarkdownEditor] AI generation error:', err);
            alert(`生成失败: ${err.message}`);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = btn.dataset.prevText || '🤖 AI生成';
                delete btn.dataset.prevText;
            }
        }
    }

    function updatePreview() {
        const input = document.querySelector(selectors.input);
        const preview = document.querySelector(selectors.preview);
        if (!input || !preview) return;

        const text = input.value;

        if (typeof marked !== 'undefined') {
            try {
                preview.innerHTML = marked.parse(text);

                // Highlight code
                if (globalThis.hljs) {
                    preview.querySelectorAll('pre code').forEach((block) => {
                        globalThis.hljs.highlightElement(block);
                    });
                }

                // Katex
                if (typeof renderMathInElement === 'function') {
                    renderMathInElement(preview, {
                        delimiters: [
                            { left: '$$', right: '$$', display: true },
                            { left: '$', right: '$', display: false },
                            { left: '\\(', right: '\\)', display: false },
                            { left: '\\[', right: '\\]', display: true }
                        ]
                    });
                }

                // Mermaid
                if (typeof mermaid !== 'undefined' && globalThis.mermaidInitialized) {
                    // Rerender mermaid diagrams
                    try {
                        const targets = preview.querySelectorAll('.mermaid');
                        if (targets.length > 0) {
                            globalThis.mermaid.init(undefined, targets);
                        }
                    } catch (e) {
                        console.error('Mermaid render error', e);
                    }
                }

            } catch (e) {
                console.error('Markdown parse error:', e);
                preview.innerText = text;
            }
        } else {
            preview.innerText = text;
        }
    }

    function syncScroll() {
        const input = document.querySelector(selectors.input);
        const preview = document.querySelector(selectors.preview);
        if (!input || !preview) return;

        if (input.scrollHeight > input.clientHeight) {
            const percentage = input.scrollTop / (input.scrollHeight - input.clientHeight);
            preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight);
        }
    }

    /**
     * 更新状态
     */
    function updateState() {
        const win = document.querySelector(selectors.window);
        if (!win) return;

        state.isOpen = win.style.display !== 'none';
        state.isMinimized = win.classList.contains('minimized');
        state.isMaximized = win.classList.contains('maximized');

        const input = document.querySelector(selectors.input);
        if (input) {
            state.content = input.value;
            state.hasUnsavedChanges = input.classList.contains('unsaved');
        }
    }

    /**
     * 打开 Markdown 编辑器
     */
    function open() {
        console.log('[MarkdownEditor] Opening');
        if (typeof globalThis.startOpenMd === 'function') {
            globalThis.startOpenMd();
        } else if (typeof globalThis.showMdWindow === 'function') {
            globalThis.showMdWindow();
        } else {
            const win = document.querySelector(selectors.window);
            if (win) {
                win.style.display = 'flex';
                win.style.opacity = '1';
                // Trigger preview update on open just in case
                updatePreview();
            }
        }
        updateState();
    }

    /**
     * 关闭 Markdown 编辑器
     */
    function close() {
        console.log('[MarkdownEditor] Closing');
        if (typeof globalThis.hideMdWindow === 'function') {
            globalThis.hideMdWindow();
        } else {
            const win = document.querySelector(selectors.window);
            if (win) {
                win.style.display = 'none';
            }
        }
        updateState();
    }

    /**
     * 最小化 Markdown 编辑器
     */
    function minimize() {
        console.log('[MarkdownEditor] Minimizing');
        const btn = document.querySelector(selectors.minimize);
        if (btn) btn.click();
        updateState();
    }

    /**
     * 最大化 Markdown 编辑器
     */
    function maximize() {
        console.log('[MarkdownEditor] Maximizing');
        const btn = document.querySelector(selectors.maximize);
        if (btn) btn.click();
        updateState();
    }

    /**
     * 获取当前内容
     */
    function getContent() {
        const input = document.querySelector(selectors.input);
        return input ? input.value : '';
    }

    /**
     * 设置内容
     */
    function setContent(content) {
        console.log('[MarkdownEditor] Setting content');
        const input = document.querySelector(selectors.input);
        if (input) {
            input.value = content;
            updatePreview();
        }
        updateState();
    }

    /**
     * 保存内容
     */
    function save() {
        console.log('[MarkdownEditor] Saving');
        if (typeof globalThis.saveMarkdownState === 'function') {
            globalThis.saveMarkdownState();
        }
    }

    /**
     * 导出为 Markdown 文件
     */
    function exportAsMarkdown() {
        console.log('[MarkdownEditor] Exporting as markdown');
        const content = getContent();
        if (content) {
            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'document.md';
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        }
    }

    /**
     * 导出为 HTML
     */
    function exportAsHtml() {
        console.log('[MarkdownEditor] Exporting as HTML');
        const preview = document.querySelector(selectors.preview);
        if (preview) {
            const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Markdown Export</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        img { max-width: 100%; }
        code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
        pre { background: #f5f5f5; padding: 12px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
${preview.innerHTML}
</body>
</html>`;
            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'document.html';
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        }
    }

    /**
     * 获取当前状态
     */
    function getState() {
        return { ...state };
    }

    return {
        init,
        open,
        close,
        minimize,
        maximize,
        getContent,
        setContent,
        save,
        exportAsMarkdown,
        exportAsHtml,
        getState
    };
})();
