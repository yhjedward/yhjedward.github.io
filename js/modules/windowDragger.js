/**
 * Window Dragger Module
 * 为所有窗口添加拖动功能
 */

export const WindowDragger = (() => {
    const state = {
        dragging: false,
        currentWindow: null,
        startX: 0,
        startY: 0,
        offsetX: 0,
        offsetY: 0
    };

    function init() {
        // 为所有窗口绑定拖动功能
        const windows = document.querySelectorAll('.window');
        windows.forEach(windowEl => {
            const titlebar = windowEl.querySelector('.window-titlebar');
            if (!titlebar) return;

            titlebar.addEventListener('mousedown', (e) => {
                // 不捕获按钮点击事件
                if (e.target.closest('.window-controls')) return;
                startDrag(windowEl, e);
            });
        });

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    function startDrag(windowEl, e) {
        state.dragging = true;
        state.currentWindow = windowEl;
        state.startX = e.clientX;
        state.startY = e.clientY;

        // 设置全局标志，告诉其他模块窗口正在拖动
        globalThis._windowDragging = true;

        // 获取当前窗口的计算位置（支持position:fixed的窗口）
        const computedStyle = globalThis.getComputedStyle(windowEl);
        let offsetX = Number.parseFloat(computedStyle.left) || 0;
        let offsetY = Number.parseFloat(computedStyle.top) || 0;
        
        // 如果left/top没有明确值，从getBoundingClientRect获取
        if (Number.isNaN(offsetX) || offsetX === 0) {
            const rect = windowEl.getBoundingClientRect();
            offsetX = rect.left;
        }
        if (Number.isNaN(offsetY) || offsetY === 0) {
            const rect = windowEl.getBoundingClientRect();
            offsetY = rect.top;
        }
        
        state.offsetX = offsetX;
        state.offsetY = offsetY;

        // 添加拖动中的视觉反馈
        windowEl.style.cursor = 'move';
        windowEl.classList.add('dragging');
    }

    function handleMouseMove(e) {
        if (!state.dragging || !state.currentWindow) return;

        const deltaX = e.clientX - state.startX;
        const deltaY = e.clientY - state.startY;

        const newLeft = state.offsetX + deltaX;
        const newTop = state.offsetY + deltaY;

        // 限制窗口不超出视口边界太多（允许部分超出）
        const maxLeft = window.innerWidth - 100;
        const maxTop = window.innerHeight - 40;  // 留出任务栏高度
        const minLeft = -state.currentWindow.offsetWidth + 100;
        const minTop = 0;

        state.currentWindow.style.left = Math.max(minLeft, Math.min(maxLeft, newLeft)) + 'px';
        state.currentWindow.style.top = Math.max(minTop, Math.min(maxTop, newTop)) + 'px';

        // 防止文本选择
        e.preventDefault();
    }

    function handleMouseUp() {
        if (state.currentWindow) {
            state.currentWindow.style.cursor = 'default';
            state.currentWindow.classList.remove('dragging');
        }
        state.dragging = false;
        state.currentWindow = null;
        
        // 清除全局标志
        globalThis._windowDragging = false;
    }

    return {
        init
    };
})();
