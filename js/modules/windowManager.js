/**
 * Window Manager Module
 * 管理所有主要窗口（Explorer、Drawing、Markdown、Todo）的生命周期和交互
 */

export const WindowManager = (() => {
    // 等待全局的 win7 函数初始化完成
    const waitForWin7Functions = () => {
        return new Promise((resolve) => {
            const check = () => {
                if (typeof globalThis.startOpenExplorer === 'function' &&
                    typeof globalThis.startOpenDrawing === 'function' &&
                    typeof globalThis.startOpenMd === 'function' &&
                    typeof globalThis.startOpenTodo === 'function') {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    };

    // 公共 API
    const explorer = {
        open: () => {
            waitForWin7Functions().then(() => {
                if (typeof globalThis.startOpenExplorer === 'function') {
                    globalThis.startOpenExplorer();
                }
            });
        },
        close: () => {
            const win = document.getElementById('explorer-window');
            if (win) {
                try {
                    if (typeof globalThis.hideExplorerWindow === 'function') {
                        globalThis.hideExplorerWindow();
                    } else {
                        win.style.display = 'none';
                    }
                } catch(err) {
                    console.error('[WindowManager][Explorer] Error closing window:', err);
                }
            }
        }
    };

    const drawing = {
        open: () => {
            waitForWin7Functions().then(() => {
                if (typeof globalThis.showDrawingWindow === 'function') {
                    globalThis.showDrawingWindow();
                }
            });
        },
        close: () => {
            try {
                if (typeof globalThis.hideDrawingWindow === 'function') {
                    globalThis.hideDrawingWindow();
                }
            } catch(err) {
                console.error('[WindowManager][Drawing] Error closing window:', err);
            }
        }
    };

    const markdown = {
        open: () => {
            waitForWin7Functions().then(() => {
                if (typeof globalThis.showMdWindow === 'function') {
                    globalThis.showMdWindow();
                }
            });
        },
        close: () => {
            try {
                if (typeof globalThis.hideMdWindow === 'function') {
                    globalThis.hideMdWindow();
                }
            } catch(err) {
                console.error('[WindowManager][Markdown] Error closing window:', err);
            }
        }
    };

    const todo = {
        open: () => {
            waitForWin7Functions().then(() => {
                if (typeof globalThis.showTodoWindow === 'function') {
                    globalThis.showTodoWindow();
                }
            });
        },
        close: () => {
            try {
                if (typeof globalThis.hideTodoWindow === 'function') {
                    globalThis.hideTodoWindow();
                }
            } catch(err) {
                console.error('[WindowManager][Todo] Error closing window:', err);
            }
        }
    };

    return {
        explorer,
        drawing,
        markdown,
        todo,
        waitForWin7Functions
    };
})();
