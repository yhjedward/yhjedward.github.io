/**
 * Clock Module
 * 更新任务栏时钟
 */

export const Clock = (() => {
    function updateClock() {
        const clock = document.querySelector('.clock');
        if (!clock) return;

        const now = new Date();
        clock.textContent = now.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function init() {
        updateClock();
        setInterval(updateClock, 1000);
    }

    return {
        init,
        updateClock
    };
})();
