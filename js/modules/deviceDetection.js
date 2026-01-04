/**
 * Device Detection Module
 * 检测和初始化设备相关的CSS类名
 */

export const DeviceDetection = (() => {
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    function init() {
        // 为移动设备添加特殊类名
        if (isMobile) {
            document.body.classList.add('mobile-device');
            if (isTablet) {
                document.body.classList.add('tablet-device');
            } else {
                document.body.classList.add('phone-device');
            }
        }

        if (isTouchDevice) {
            document.body.classList.add('touch-device');
        }
    }

    return {
        isMobile,
        isTablet,
        isTouchDevice,
        init
    };
})();
