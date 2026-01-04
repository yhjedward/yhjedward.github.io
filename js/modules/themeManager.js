/**
 * Theme Manager Module
 * 管理主题切换和持久化
 */

export const ThemeManager = (() => {
    const STORAGE_KEY = 'win7_theme';
    let body;

    function init() {
        body = document.body;
        if (!body) return;

        // 初始为白天主题
        body.setAttribute('data-theme', 'dark');

        // 从localStorage恢复主题
        const stored = (() => {
            try {
                return localStorage.getItem(STORAGE_KEY);
            } catch (_) {
                return null;
            }
        })();

        if (stored === 'dark') {
            body.setAttribute('data-theme', 'dark');
        } else if (stored === 'light') {
            body.setAttribute('data-theme', 'light');
        }

        // 绑定切换按钮
        initThemeToggleButtons();
    }

    function setTheme(name) {
        if (!body) return;

        if (name) {
            body.setAttribute('data-theme', name);
        } else {
            body.removeAttribute('data-theme');
        }

        try {
            localStorage.setItem(STORAGE_KEY, name || '');
        } catch (_) {}

        // 触发主题变化事件
        try {
            document.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: name } }));
        } catch (_) {}
    }

    function getTheme() {
        return body ? body.getAttribute('data-theme') : 'light';
    }

    function initThemeToggleButtons() {
        document.querySelectorAll('.theme-toggle').forEach(btn => {
            const current = body.getAttribute('data-theme');
            btn.textContent = current === 'dark' ? '🌜' : '🌞';
            btn.setAttribute('aria-pressed', current === 'dark' ? 'true' : 'false');

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const current = body.getAttribute('data-theme');
                const newTheme = current === 'dark' ? 'light' : 'dark';
                setTheme(newTheme);

                // 更新图标
                btn.textContent = newTheme === 'dark' ? '🌜' : '🌞';
                btn.setAttribute('aria-pressed', newTheme === 'dark' ? 'true' : 'false');
            });
        });
    }

    // 防止重复初始化
    let initialized = false;

    return {
        init() {
            if (initialized) return;
            initialized = true;
            init();
        },
        setTheme,
        getTheme
    };
})();
