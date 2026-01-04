/**
 * Background Manager Module
 * 管理背景图片刷新
 */

export const BackgroundManager = (() => {
    const REFRESH_INTERVAL = 30 * 60 * 1000; // 30分钟

    function refreshBackground() {
        document.body.style.backgroundImage = `linear-gradient(135deg, rgba(0, 120, 215, 0.3) 0%, rgba(0, 95, 179, 0.3) 100%),
            url('https://api.mtyqx.cn/api/random.php')`;
    }

    function init() {
        // 立即刷新一次
        refreshBackground();

        // 每30分钟刷新一次
        setInterval(refreshBackground, REFRESH_INTERVAL);
    }

    return {
        init,
        refreshBackground
    };
})();
