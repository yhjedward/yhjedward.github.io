/**
 * Toolbar Manager Module
 * 管理工具栏和面板的显示/隐藏切换
 */

export const ToolbarManager = (() => {
    const STORAGE_PREFIX = 'win7_hidden:';

    function init() {
        const toggles = document.querySelectorAll('.titlebar-actions [data-target]');

        toggles.forEach(btn => {
            const targetSelector = btn.dataset.target;
            if (!targetSelector) return;

            const win = btn.closest('.window');
            const winId = win ? win.id : (targetSelector || 'global');
            const toolbar = win && targetSelector ? win.querySelector(targetSelector) : document.querySelector(targetSelector);

            if (!toolbar) return;

            const hiddenClass = (targetSelector.indexOf('toolbar') !== -1) ? 'hidden-toolbar' : 'hidden-panel';
            const safeSelector = targetSelector.replace(/[^a-z0-9_-]/gi, '_');
            const storageKey = STORAGE_PREFIX + winId + ':' + safeSelector;

            const saved = (localStorage.getItem(storageKey) === '1');

            if (saved) {
                toolbar.classList.add(hiddenClass);
                btn.setAttribute('aria-pressed', 'true');
                btn.classList.add('toggled');
            }

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const isHidden = toolbar.classList.toggle(hiddenClass);
                btn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');

                if (isHidden) {
                    btn.classList.add('toggled');
                } else {
                    btn.classList.remove('toggled');
                }

                try {
                    localStorage.setItem(storageKey, isHidden ? '1' : '0');
                } catch (_) {}

                // If drawing window changed, trigger canvas resize
                if (winId === 'drawing-window') {
                    setTimeout(() => {
                        try {
                            if (typeof resizeCanvas === 'function') resizeCanvas();
                        } catch (_) {}
                    }, 80);
                }
            });
        });
    }

    return {
        init
    };
})();
