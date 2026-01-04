/**
 * Media Player Module
 * 处理媒体文件播放（图片预览、音乐、视频）
 */

import { Utils } from './utils.js';
import { DeviceDetection } from './deviceDetection.js';

export const MediaPlayer = (() => {
    let taskbarItems;

    // Image Viewer State
    let currentScale = 1;
    let currentTranslateX = 0;
    let currentTranslateY = 0;
    let isDraggingImage = false;
    let startX = 0;
    let startY = 0;

    function init(taskbarContainer) {
        taskbarItems = taskbarContainer;
    }

    function updateImageTransform(img) {
        if (!img) return;
        img.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentScale})`;
    }

    function previewImage(imagePath, filename) {
        if (!taskbarItems) {
            console.error('MediaPlayer not initialized');
            return;
        }

        console.log('previewImage函数开始执行，参数:', imagePath, filename);

        // 确保图片路径是绝对路径
        if (imagePath && !imagePath.startsWith('http') && !imagePath.startsWith('data:')) {
            imagePath = new URL(imagePath, globalThis.location.origin).href;
            console.log('转换为绝对URL:', imagePath);
        }

        let imageViewer = document.getElementById('image-viewer');
        let imageTaskbarIcon = document.getElementById('image-taskbar-icon');

        if (!imageViewer) {
            console.log('创建新的图片查看器窗口');
            imageViewer = createImageViewer();
            
            // 移除旧的 taskbar icon（如果存在）
            if (imageTaskbarIcon) {
                imageTaskbarIcon.remove();
            }
            
            imageTaskbarIcon = createImageTaskbarIcon();
            taskbarItems.appendChild(imageTaskbarIcon);
            
            // 绑定任务栏图标事件
            _bindImageTaskbarIconEvent(imageViewer, imageTaskbarIcon);
        }

        // Reset state
        currentScale = 1;
        currentTranslateX = 0;
        currentTranslateY = 0;

        // 更新图片
        const img = imageViewer.querySelector('img');
        img.src = imagePath;
        updateImageTransform(img);

        const zoomInfo = imageViewer.querySelector('.zoom-info');
        if (zoomInfo) zoomInfo.textContent = '缩放: 100%';

        const title = imageViewer.querySelector('.window-title');
        title.textContent = filename ? filename.split('/').pop() : '图片查看器';

        imageViewer.style.display = 'flex';
        imageViewer.style.opacity = '1';
        imageViewer.classList.remove('minimized');
        imageViewer.classList.add('restored');

        if (imageTaskbarIcon) {
            imageTaskbarIcon.style.display = 'flex';
            imageTaskbarIcon.classList.add('active');
        }

        console.log('图片查看器显示完成');
    }

    function _bindImageTaskbarIconEvent(imageViewer, imageTaskbarIcon) {
        if (!imageTaskbarIcon || imageTaskbarIcon._imageBound) {
            return;
        }
        imageTaskbarIcon._imageBound = true;

        imageTaskbarIcon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (imageViewer.classList.contains('minimized') || imageViewer.style.display === 'none') {
                imageViewer.classList.remove('minimized');
                imageViewer.style.display = 'flex';
            } else {
                imageViewer.classList.add('minimized');
                imageViewer.style.display = 'none';
            }
        });
    }

    function createImageViewer() {
        const imageViewer = document.createElement('div');
        imageViewer.id = 'image-viewer';
        imageViewer.className = 'image-viewer';

        if (DeviceDetection.isMobile) {
            imageViewer.classList.add('maximized');
        }

        imageViewer.innerHTML = `
            <div class="window-titlebar">
                <div class="window-title">图片查看器</div>
                <div class="window-controls">
                    <button class="minimize image-minimize">─</button>
                    <button class="maximize image-maximize">□</button>
                    <button class="close image-close">×</button>
                </div>
            </div>
            <div class="image-content">
                <img src="" alt="图片预览" />
                <div class="zoom-info">缩放: 100%</div>
                <button class="nav-button prev-button">◀</button>
                <button class="nav-button next-button">▶</button>
            </div>
        `;

        document.body.appendChild(imageViewer);

        // 绑定事件
        bindImageViewerEvents(imageViewer);

        return imageViewer;
    }

    function createImageTaskbarIcon() {
        const imageTaskbarIcon = document.createElement('a');
        imageTaskbarIcon.href = '#';
        imageTaskbarIcon.className = 'taskbar-item';
        imageTaskbarIcon.id = 'image-taskbar-icon';
        imageTaskbarIcon.innerHTML = `
            <div class="icon">🖼️</div>
            <span>图片查看器</span>
        `;
        imageTaskbarIcon.style.display = 'none';
        return imageTaskbarIcon;
    }

    function bindImageViewerEvents(imageViewer) {
        const closeBtn = imageViewer.querySelector('.image-close');
        const minimizeBtn = imageViewer.querySelector('.image-minimize');
        const maximizeBtn = imageViewer.querySelector('.image-maximize');
        const titlebar = imageViewer.querySelector('.window-titlebar');

        closeBtn.addEventListener('click', () => {
            const imageTaskbarIcon = document.getElementById('image-taskbar-icon');
            imageViewer.style.display = 'none';
            if (imageTaskbarIcon) imageTaskbarIcon.style.display = 'none';
        });

        minimizeBtn.addEventListener('click', () => {
            const imageTaskbarIcon = document.getElementById('image-taskbar-icon');
            imageViewer.classList.add('minimized');
            imageViewer.style.display = 'none';
            if (imageTaskbarIcon) {
                imageTaskbarIcon.style.display = 'flex';
                imageTaskbarIcon.classList.add('active');
            }
        });

        maximizeBtn.addEventListener('click', () => {
            if (imageViewer.classList.contains('maximized')) {
                imageViewer.classList.remove('maximized');

                const originalLeft = imageViewer.dataset.originalLeft;
                const originalTop = imageViewer.dataset.originalTop;
                const originalTransform = imageViewer.dataset.originalTransform;

                imageViewer.style.left = originalLeft || '50%';
                imageViewer.style.top = originalTop || '50%';

                if (originalTransform) {
                    imageViewer.style.transform = originalTransform;
                } else if (!originalLeft && !originalTop) {
                    imageViewer.style.transform = 'translate(-50%, -50%)';
                } else {
                    imageViewer.style.transform = 'none';
                }

                imageViewer.style.width = null;
                imageViewer.style.height = null;
            } else {
                imageViewer.dataset.originalLeft = imageViewer.style.left;
                imageViewer.dataset.originalTop = imageViewer.style.top;
                imageViewer.dataset.originalTransform = imageViewer.style.transform;

                imageViewer.classList.add('maximized');
                imageViewer.style.left = '0';
                imageViewer.style.top = '0';
                imageViewer.style.transform = 'none';
                imageViewer.style.width = '100%';
                imageViewer.style.height = 'calc(100% - 40px)';
            }
        });

        // 窗口拖动（Pointer Events：同时支持鼠标/触摸，并兼容响应式样式中的 !important）
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        let activePointerId = null;

        const startWindowDrag = (e) => {
            if (imageViewer.classList.contains('maximized')) return;
            if (e.target.closest('.window-controls')) return;

            const rect = imageViewer.getBoundingClientRect();

            // 若窗口处于居中 transform（如 translate(-50%, -50%)），先归一化为像素定位，避免拖动跳动
            imageViewer.style.setProperty('transform', 'none', 'important');
            imageViewer.style.setProperty('left', `${rect.left}px`, 'important');
            imageViewer.style.setProperty('top', `${rect.top}px`, 'important');

            isDragging = true;
            activePointerId = typeof e.pointerId === 'number' ? e.pointerId : null;
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            imageViewer.style.transition = 'none';

            if (titlebar.setPointerCapture && activePointerId !== null) {
                try {
                    titlebar.setPointerCapture(activePointerId);
                } catch {
                    // no-op
                }
            }

            e.preventDefault();
        };

        const handleWindowDragMove = (e) => {
            if (!isDragging) return;
            if (activePointerId !== null && typeof e.pointerId === 'number' && e.pointerId !== activePointerId) return;

            const newLeft = e.clientX - offsetX;
            const newTop = e.clientY - offsetY;

            const maxLeft = window.innerWidth - 100;
            const maxTop = window.innerHeight - 40;
            const minLeft = -imageViewer.offsetWidth + 100;
            const minTop = 0;

            imageViewer.style.setProperty('left', `${Math.max(minLeft, Math.min(maxLeft, newLeft))}px`, 'important');
            imageViewer.style.setProperty('top', `${Math.max(minTop, Math.min(maxTop, newTop))}px`, 'important');

            e.preventDefault();
        };

        const endWindowDrag = (e) => {
            if (!isDragging) return;
            if (activePointerId !== null && typeof e.pointerId === 'number' && e.pointerId !== activePointerId) return;

            isDragging = false;
            activePointerId = null;
            if (imageViewer) imageViewer.style.transition = '';
        };

        titlebar.addEventListener('pointerdown', startWindowDrag);
        document.addEventListener('pointermove', handleWindowDragMove);
        document.addEventListener('pointerup', endWindowDrag);
        document.addEventListener('pointercancel', endWindowDrag);

        // Image Zoom & Pan
        const img = imageViewer.querySelector('img');
        const content = imageViewer.querySelector('.image-content');
        const zoomInfo = imageViewer.querySelector('.zoom-info');

        if (content && img) {
            content.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                currentScale = Math.min(Math.max(0.1, currentScale + delta), 5);
                updateImageTransform(img);
                if (zoomInfo) zoomInfo.textContent = `缩放: ${Math.round(currentScale * 100)}%`;
            });

            img.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation(); // Prevent window dragging
                isDraggingImage = true;
                startX = e.clientX - currentTranslateX;
                startY = e.clientY - currentTranslateY;
                img.style.cursor = 'grabbing';
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDraggingImage) return;
                e.preventDefault();
                currentTranslateX = e.clientX - startX;
                currentTranslateY = e.clientY - startY;
                updateImageTransform(img);
            });

            document.addEventListener('mouseup', () => {
                if (isDraggingImage) {
                    isDraggingImage = false;
                    img.style.cursor = 'grab';
                }
            });

            // Set initial cursor
            img.style.cursor = 'grab';
        }
    }

    function playAudio(audioPath, filename) {
        if (!taskbarItems) {
            console.error('MediaPlayer not initialized');
            return;
        }

        let audioPlayer = document.getElementById('audio-player');
        if (!audioPlayer) {
            audioPlayer = createAudioPlayer();
            taskbarItems.appendChild(audioPlayer.taskbarIcon);
        }

        const audio = audioPlayer.element.querySelector('audio');
        audio.src = audioPath;

        const songTitle = audioPlayer.element.querySelector('.song-title');
        songTitle.textContent = filename ? filename.split('/').pop() : '未知歌曲';

        audioPlayer.element.style.display = 'flex';
        audioPlayer.element.classList.remove('minimized');
        audioPlayer.taskbarIcon.style.display = 'flex';
    }

    function createAudioPlayer() {
        const audioPlayer = document.createElement('div');
        audioPlayer.id = 'audio-player';
        audioPlayer.className = 'audio-player';

        if (DeviceDetection.isMobile) {
            audioPlayer.classList.add('maximized');
        }

        audioPlayer.innerHTML = `
            <div class="window-titlebar">
                <div class="window-title">音乐播放器</div>
                <div class="window-controls">
                    <button class="minimize audio-minimize">─</button>
                    <button class="maximize audio-maximize">□</button>
                    <button class="close audio-close">×</button>
                </div>
            </div>
            <div class="audio-content">
                <div class="audio-info">
                    <div class="song-title">正在加载...</div>
                    <div class="song-controls">
                        <button class="play-pause">⏵</button>
                        <div class="progress-container">
                            <div class="progress-bar"></div>
                        </div>
                        <div class="time-info">0:00 / 0:00</div>
                    </div>
                    <div class="volume-control">
                        <span>🔊</span>
                        <input type="range" min="0" max="100" value="50" class="volume-slider">
                    </div>
                </div>
                <audio src="" controls style="display: none;"></audio>
            </div>
        `;

        document.body.appendChild(audioPlayer);

        const taskbarIcon = document.createElement('a');
        taskbarIcon.href = '#';
        taskbarIcon.className = 'taskbar-item';
        taskbarIcon.id = 'audio-taskbar-icon';
        taskbarIcon.innerHTML = `
            <div class="icon">🎵</div>
            <span>音乐播放器</span>
        `;
        taskbarIcon.style.display = 'none';

        // 绑定事件
        bindAudioPlayerEvents(audioPlayer, taskbarIcon);

        return { element: audioPlayer, taskbarIcon };
    }

    function bindAudioPlayerEvents(audioPlayer, taskbarIcon) {
        // 基础事件绑定
        const closeBtn = audioPlayer.querySelector('.audio-close');
        const minimizeBtn = audioPlayer.querySelector('.audio-minimize');
        const maximizeBtn = audioPlayer.querySelector('.audio-maximize');
        const audio = audioPlayer.querySelector('audio');
        const playPauseBtn = audioPlayer.querySelector('.play-pause');
        const volumeSlider = audioPlayer.querySelector('.volume-slider');

        closeBtn.addEventListener('click', () => {
            audioPlayer.style.display = 'none';
            audio.pause();
            taskbarIcon.style.display = 'none';
        });

        minimizeBtn.addEventListener('click', () => {
            audioPlayer.classList.add('minimized');
            audioPlayer.style.display = 'none';
            taskbarIcon.style.display = 'flex';
        });

        maximizeBtn.addEventListener('click', () => {
            if (audioPlayer.classList.contains('maximized')) {
                audioPlayer.classList.remove('maximized');
            } else {
                audioPlayer.classList.add('maximized');
            }
        });

        taskbarIcon.addEventListener('click', (e) => {
            e.preventDefault();
            if (audioPlayer.classList.contains('minimized') || audioPlayer.style.display === 'none') {
                audioPlayer.classList.remove('minimized');
                audioPlayer.style.display = 'flex';
            } else {
                audioPlayer.classList.add('minimized');
                audioPlayer.style.display = 'none';
            }
        });

        playPauseBtn.addEventListener('click', () => {
            if (audio.paused) {
                audio.play();
                playPauseBtn.textContent = '⏸';
            } else {
                audio.pause();
                playPauseBtn.textContent = '⏵';
            }
        });

        volumeSlider.value = 50;
        audio.volume = 0.5;

        volumeSlider.addEventListener('input', () => {
            audio.volume = volumeSlider.value / 100;
        });

        audio.addEventListener('canplaythrough', () => {
            audio.play();
            playPauseBtn.textContent = '⏸';
        }, { once: true });

        audio.addEventListener('ended', () => {
            playPauseBtn.textContent = '⏵';
        });
    }

    function playVideo(videoPath, filename) {
        console.log('playVideo - 留作扩展实现');
    }

    return {
        init,
        previewImage,
        playAudio,
        playVideo
    };
})();
