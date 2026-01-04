/**
 * Win7 Blog - TTS 窗口管理
 * 处理 TTS 窗口的打开、关闭、最小化等操作
 */

(function() {
  'use strict';

  // 等待 DOM 加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTTSWindow);
  } else {
    initTTSWindow();
  }

  function initTTSWindow() {
    const ttsWindow = document.getElementById('tts-window');
    const desktopIcon = document.getElementById('tts-app');
    const startMenuBtn = document.querySelector('[data-start-action="tts"]');
    const taskbarBtn = document.querySelector('[data-taskbar-action="tts"]');

    if (!ttsWindow) return;

    // 桌面图标打开
    if (desktopIcon) {
      desktopIcon.addEventListener('click', () => {
        ttsWindow.style.display = 'block';
        if (taskbarBtn) {
          taskbarBtn.classList.remove('active');
        }
      });
    }

    // 开始菜单打开
    if (startMenuBtn) {
      startMenuBtn.addEventListener('click', () => {
        ttsWindow.style.display = 'block';
        if (taskbarBtn) {
          taskbarBtn.classList.remove('active');
        }
        // 关闭开始菜单
        const startMenu = document.getElementById('start-menu');
        if (startMenu) {
          startMenu.style.display = 'none';
          const startButton = document.getElementById('start-button');
          if (startButton) {
            startButton.setAttribute('aria-expanded', 'false');
          }
        }
      });
    }

    // 最小化按钮
    const minimizeBtn = document.querySelector('.tts-minimize');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        ttsWindow.style.display = 'none';
        if (taskbarBtn) {
          taskbarBtn.classList.add('active');
        }
      });
    }

    // 关闭按钮
    const closeBtn = document.querySelector('.tts-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        ttsWindow.style.display = 'none';
        if (taskbarBtn) {
          taskbarBtn.classList.add('active');
        }
      });
    }

    // 最大化按钮
    const maximizeBtn = document.querySelector('.tts-maximize');
    if (maximizeBtn) {
      let isMaximized = false;
      maximizeBtn.addEventListener('click', () => {
        if (isMaximized) {
          // 恢复原始大小
          ttsWindow.style.width = '500px';
          ttsWindow.style.height = '600px';
          ttsWindow.style.left = '300px';
          ttsWindow.style.top = '150px';
          ttsWindow.style.maxWidth = 'none';
          ttsWindow.style.maxHeight = 'none';
        } else {
          // 最大化
          ttsWindow.style.width = '90vw';
          ttsWindow.style.height = '90vh';
          ttsWindow.style.left = '5vw';
          ttsWindow.style.top = '5vh';
          ttsWindow.style.maxWidth = '100vw';
          ttsWindow.style.maxHeight = '100vh';
        }
        isMaximized = !isMaximized;
      });
    }

    // 窗口拖动功能
    setupWindowDrag(ttsWindow);
  }

  function setupWindowDrag(windowElement) {
    const titleBar = windowElement.querySelector('.window-titlebar');
    if (!titleBar) return;

    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;

    titleBar.addEventListener('mousedown', startDrag);

    function startDrag(e) {
      // 不能通过关闭按钮拖动
      if (e.target.closest('.window-controls')) return;

      isDragging = true;
      initialX = e.clientX - windowElement.offsetLeft;
      initialY = e.clientY - windowElement.offsetTop;
    }

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);

    function drag(e) {
      if (isDragging) {
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        windowElement.style.left = currentX + 'px';
        windowElement.style.top = currentY + 'px';
      }
    }

    function stopDrag() {
      isDragging = false;
    }
  }

})();
