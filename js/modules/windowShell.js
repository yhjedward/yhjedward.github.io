/**
 * Window Shell Module
 * 为内置应用窗口提供：任务栏图标、最小化/最大化/关闭、置顶。
 */

export const WindowShell = (() => {
    let taskbarItems = null;
    let zIndexCounter = 1000;

    const APPS = [
        {
            app: 'explorer',
            windowId: 'explorer-window',
            title: '文件资源管理器',
            icon: '📁',
            controls: {
                minimize: '.explorer-minimize',
                maximize: '.explorer-maximize',
                close: '.explorer-close'
            },
            show: () => globalThis.startOpenExplorer?.(),
            hide: () => globalThis.hideExplorerWindow?.()
        },
        {
            app: 'drawing',
            windowId: 'drawing-window',
            title: '画板',
            icon: '🎨',
            controls: {
                minimize: '.drawing-minimize',
                maximize: '.drawing-maximize',
                close: '.drawing-close'
            },
            show: () => globalThis.startOpenDrawing?.(),
            hide: () => globalThis.hideDrawingWindow?.()
        },
        {
            app: 'markdown',
            windowId: 'md-window',
            title: 'Markdown 编辑器',
            icon: '📝',
            controls: {
                minimize: '.md-minimize',
                maximize: '.md-maximize',
                close: '.md-close'
            },
            show: () => globalThis.startOpenMd?.(),
            hide: () => globalThis.hideMdWindow?.()
        },
        {
            app: 'todo',
            windowId: 'todo-window',
            title: '待办事项',
            icon: '✓',
            controls: {
                minimize: '.todo-minimize',
                maximize: '.todo-maximize',
                close: '.todo-close'
            },
            show: () => globalThis.startOpenTodo?.(),
            hide: () => globalThis.hideTodoWindow?.()
        }
    ];

    function bringToFront(win) {
        if (!win) return;
        zIndexCounter += 1;
        win.style.zIndex = String(zIndexCounter);
    }

    function ensureAppTaskbarIcon(appConfig) {
        if (!taskbarItems) return null;

        const selector = `a.taskbar-item[data-app="${appConfig.app}"]`;
        let iconEl = taskbarItems.querySelector(selector);

        if (!iconEl) {
            iconEl = document.createElement('a');
            iconEl.href = '#';
            iconEl.className = 'taskbar-item';
            iconEl.dataset.app = appConfig.app;
            iconEl.innerHTML = `<div class="icon">${appConfig.icon}</div><span>${appConfig.title}</span>`;
            iconEl.style.display = 'none';
            taskbarItems.appendChild(iconEl);
        }

        return iconEl;
    }

    function setActiveTaskbarApp(app) {
        if (!taskbarItems) return;
        taskbarItems.querySelectorAll('a.taskbar-item[data-app].active').forEach((el) => {
            el.classList.remove('active');
        });

        const active = taskbarItems.querySelector(`a.taskbar-item[data-app="${app}"]`);
        if (active) active.classList.add('active');
    }

    function isWindowVisible(win) {
        if (!win) return false;
        const style = getComputedStyle(win);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    }

    function saveRestoreStyles(win) {
        if (!win || win.dataset.win7RestoreSaved === '1') return;
        win.dataset.win7RestoreSaved = '1';

        win.dataset.win7OrigLeft = win.style.left;
        win.dataset.win7OrigTop = win.style.top;
        win.dataset.win7OrigRight = win.style.right;
        win.dataset.win7OrigBottom = win.style.bottom;
        win.dataset.win7OrigWidth = win.style.width;
        win.dataset.win7OrigHeight = win.style.height;
        win.dataset.win7OrigTransform = win.style.transform;
    }

    function restoreStyles(win) {
        if (!win || win.dataset.win7RestoreSaved !== '1') return;

        win.style.left = win.dataset.win7OrigLeft || '';
        win.style.top = win.dataset.win7OrigTop || '';
        win.style.right = win.dataset.win7OrigRight || '';
        win.style.bottom = win.dataset.win7OrigBottom || '';
        win.style.width = win.dataset.win7OrigWidth || '';
        win.style.height = win.dataset.win7OrigHeight || '';
        win.style.transform = win.dataset.win7OrigTransform || '';
    }

    function maximizeWindow(win) {
        if (!win) return;

        if (win.classList.contains('maximized')) {
            win.classList.remove('maximized');
            restoreStyles(win);
            return;
        }

        saveRestoreStyles(win);
        win.classList.add('maximized');
        win.style.left = '0';
        win.style.top = '0';
        win.style.right = '';
        win.style.bottom = '40px';
        win.style.transform = 'none';
        win.style.width = '100%';
        win.style.height = 'calc(100% - 40px)';
    }

    function minimizeWindow(app, win) {
        if (!win) return;
        bringToFront(win);

        win.classList.add('minimized');
        win.classList.remove('restored');

        if (taskbarItems) {
            const icon = taskbarItems.querySelector(`a.taskbar-item[data-app="${app}"]`);
            if (icon) {
                icon.style.display = 'flex';
                setActiveTaskbarApp(app);
            }
        }
    }

    function closeWindow(app, win) {
        if (!win) return;

        win.style.display = 'none';
        win.style.visibility = 'hidden';
        win.style.opacity = '0';
        win.classList.remove('minimized', 'restored', 'active', 'maximized');
        restoreStyles(win);

        if (taskbarItems) {
            const icon = taskbarItems.querySelector(`a.taskbar-item[data-app="${app}"]`);
            if (icon) {
                icon.style.display = 'none';
                icon.classList.remove('active');
            }
        }
    }

    function restoreOrToggleMinimize(appConfig) {
        const win = document.getElementById(appConfig.windowId);
        if (!win) return;

        if (win.classList.contains('minimized') || !isWindowVisible(win)) {
            appConfig.show?.();
            bringToFront(win);
            setActiveTaskbarApp(appConfig.app);
        } else {
            minimizeWindow(appConfig.app, win);
        }
    }

    function bindAppWindow(appConfig) {
        const win = document.getElementById(appConfig.windowId);
        if (!win) return;

        if (!('win7ShellInit' in win.dataset)) {
            win.dataset.win7ShellInit = 'true';

            win.addEventListener('mousedown', () => {
                bringToFront(win);
                if (taskbarItems) setActiveTaskbarApp(appConfig.app);
            });
        }

        const taskbarIcon = ensureAppTaskbarIcon(appConfig);
        if (taskbarIcon && !('win7ShellInit' in taskbarIcon.dataset)) {
            taskbarIcon.dataset.win7ShellInit = 'true';
            taskbarIcon.addEventListener('click', (e) => {
                e.preventDefault();
                restoreOrToggleMinimize(appConfig);
            });
        }

        const closeBtn = win.querySelector(appConfig.controls.close);
        if (closeBtn && !('win7ShellInit' in closeBtn.dataset)) {
            closeBtn.dataset.win7ShellInit = 'true';
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                closeWindow(appConfig.app, win);
            });
        }

        const minimizeBtn = win.querySelector(appConfig.controls.minimize);
        if (minimizeBtn && !('win7ShellInit' in minimizeBtn.dataset)) {
            minimizeBtn.dataset.win7ShellInit = 'true';
            minimizeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                minimizeWindow(appConfig.app, win);
            });
        }

        const maximizeBtn = win.querySelector(appConfig.controls.maximize);
        if (maximizeBtn && !('win7ShellInit' in maximizeBtn.dataset)) {
            maximizeBtn.dataset.win7ShellInit = 'true';
            maximizeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                bringToFront(win);
                maximizeWindow(win);
            });
        }
    }

    function bindBlogWindow() {
        const blogWindow = document.getElementById('blog-window');
        if (!blogWindow) return;

        const closeBtn = blogWindow.querySelector('.blog-close');
        if (closeBtn && !('win7ShellInit' in closeBtn.dataset)) {
            closeBtn.dataset.win7ShellInit = 'true';
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                blogWindow.style.display = 'none';
                blogWindow.style.opacity = '0';
                blogWindow.classList.remove('minimized', 'restored', 'active', 'maximized');

                const currentIcon = globalThis.articleReader?.getCurrentArticleIcon?.();
                if (currentIcon) {
                    currentIcon.style.display = 'none';
                    currentIcon.classList.remove('active');
                }
            });
        }

        const minimizeBtn = blogWindow.querySelector('.blog-minimize');
        if (minimizeBtn && !('win7ShellInit' in minimizeBtn.dataset)) {
            minimizeBtn.dataset.win7ShellInit = 'true';
            minimizeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                blogWindow.classList.add('minimized');
                blogWindow.classList.remove('restored');
            });
        }

        const maximizeBtn = blogWindow.querySelector('.blog-maximize');
        if (maximizeBtn && !('win7ShellInit' in maximizeBtn.dataset)) {
            maximizeBtn.dataset.win7ShellInit = 'true';
            maximizeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                bringToFront(blogWindow);
                maximizeWindow(blogWindow);
            });
        }

        if (!('win7ShellInit' in blogWindow.dataset)) {
            blogWindow.dataset.win7ShellInit = 'true';
            blogWindow.addEventListener('mousedown', () => bringToFront(blogWindow));
        }
    }

    function init(taskbarContainer) {
        taskbarItems = taskbarContainer || document.querySelector('.taskbar-items');

        globalThis.showExplorerWindow = globalThis.startOpenExplorer;
        globalThis.showDrawingWindow = globalThis.startOpenDrawing;
        globalThis.showMdWindow = globalThis.startOpenMd;
        globalThis.showTodoWindow = globalThis.startOpenTodo;

        globalThis.hideExplorerWindow = () => closeWindow('explorer', document.getElementById('explorer-window'));
        globalThis.hideDrawingWindow = () => closeWindow('drawing', document.getElementById('drawing-window'));
        globalThis.hideMdWindow = () => closeWindow('markdown', document.getElementById('md-window'));
        globalThis.hideTodoWindow = () => closeWindow('todo', document.getElementById('todo-window'));

        APPS.forEach(bindAppWindow);
        bindBlogWindow();

        // 如果窗口初始可见（例如某些页面默认打开），确保任务栏图标同步
        APPS.forEach((appConfig) => {
            const win = document.getElementById(appConfig.windowId);
            if (!win) return;
            if (isWindowVisible(win)) {
                const icon = ensureAppTaskbarIcon(appConfig);
                if (icon) icon.style.display = 'flex';
            }
        });
    }

    return {
        init,
        bringToFront
    };
})();
