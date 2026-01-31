/**
 * Start Menu Module
 * 负责开始按钮/开始菜单的打开、关闭与应用入口。
 */

export const StartMenu = (() => {
    const ACTION_HANDLERS = {
        explorer: () => globalThis.startOpenExplorer?.(),
        drawing: () => globalThis.startOpenDrawing?.(),
        markdown: () => globalThis.startOpenMd?.(),
        todo: () => globalThis.startOpenTodo?.(),
        tts: () => globalThis.startOpenTTS?.()
    };

    let startButton = null;
    let startMenu = null;
    let taskbar = null;

    function isOpen() {
        return !!startMenu && startMenu.classList.contains('open');
    }

    function syncAria(open) {
        if (startButton) startButton.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (startMenu) startMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
    }

    function positionMenu() {
        if (!startMenu) return;

        const fallbackHeight = 40;
        const tb = taskbar || document.querySelector('.taskbar');
        const tbHeight = tb ? tb.getBoundingClientRect().height : fallbackHeight;

        startMenu.style.bottom = `${Math.round(tbHeight) + 6}px`;
        startMenu.style.maxHeight = `calc(100vh - ${Math.round(tbHeight) + 20}px)`;
    }

    function openMenu() {
        if (!startMenu || !startButton) return;

        positionMenu();

        startMenu.classList.add('open');
        startButton.classList.add('active');
        syncAria(true);

        const firstFocusable = startMenu.querySelector('button.start-menu-item, a.start-menu-item');
        if (firstFocusable && typeof firstFocusable.focus === 'function') {
            firstFocusable.focus();
        }
    }

    function closeMenu() {
        if (!startMenu || !startButton) return;

        startMenu.classList.remove('open');
        startButton.classList.remove('active');
        syncAria(false);
    }

    function toggleMenu() {
        if (isOpen()) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    function runAction(action) {
        const fn = ACTION_HANDLERS[action];
        if (typeof fn === 'function') fn();
    }

    function init() {
        startButton = document.getElementById('start-button') || document.querySelector('.start-button');
        startMenu = document.getElementById('start-menu');
        taskbar = document.querySelector('.taskbar');

        if (!startButton || !startMenu) return;

        positionMenu();

        if (!('win7StartMenuInit' in startButton.dataset)) {
            startButton.dataset.win7StartMenuInit = 'true';

            startButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleMenu();
            });

            startButton.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                e.stopPropagation();
                toggleMenu();
            });
        }

        if (!('win7StartMenuInit' in startMenu.dataset)) {
            startMenu.dataset.win7StartMenuInit = 'true';

            startMenu.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-start-action]');
                if (!btn) return;

                const action = btn.dataset.startAction;
                runAction(action);
                closeMenu();
            });
        }

        if (!('win7StartMenuDocInit' in document.body.dataset)) {
            document.body.dataset.win7StartMenuDocInit = 'true';

            document.addEventListener('click', (e) => {
                if (!isOpen()) return;

                const target = e.target;
                if (target.closest('#start-menu')) return;
                if (target.closest('#start-button') || target.closest('.start-button')) return;

                closeMenu();
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && isOpen()) {
                    e.preventDefault();
                    closeMenu();
                }
            });

            window.addEventListener('resize', () => positionMenu());
        }
    }

    return {
        init,
        open: openMenu,
        close: closeMenu,
        toggle: toggleMenu
    };
})();
