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

    // Audio Player State - Playlist
    let playlist = {
        tracks: [],
        currentIndex: 0
    };

    // Video Player State - Playlist
    let videoPlaylist = {
        tracks: [],
        currentIndex: 0
    };

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

        console.log('[MediaPlayer] playAudio called with:', audioPath, filename);

        // 确保音频路径是绝对路径
        if (audioPath && !audioPath.startsWith('http') && !audioPath.startsWith('data:')) {
            audioPath = new URL(audioPath, globalThis.location.origin).href;
            console.log('[MediaPlayer] Converted to absolute URL:', audioPath);
        }

        let audioPlayerElement = document.getElementById('audio-player');
        let taskbarIcon = document.getElementById('audio-taskbar-icon');

        if (!audioPlayerElement) {
            const playerObj = createAudioPlayer();
            audioPlayerElement = playerObj.element;
            taskbarIcon = playerObj.taskbarIcon;
            taskbarItems.appendChild(taskbarIcon);
        }

        const audio = audioPlayerElement.querySelector('audio');
        audio.src = audioPath;

        const songTitle = audioPlayerElement.querySelector('.song-title');
        songTitle.textContent = filename ? filename.split('/').pop() : '未知歌曲';

        // 将当前播放的音乐添加到播放列表
        // 检查是否已存在
        const existingIndex = playlist.tracks.findIndex(t => t.path === audioPath);
        if (existingIndex !== -1) {
            playlist.currentIndex = existingIndex;
        } else {
            playlist.tracks.push({ path: audioPath, name: filename });
            playlist.currentIndex = playlist.tracks.length - 1;
        }

        // 更新播放列表显示
        updatePlaylistDisplay(audioPlayerElement);

        audioPlayerElement.style.display = 'flex';
        audioPlayerElement.classList.remove('minimized');
        if (taskbarIcon) {
            taskbarIcon.style.display = 'flex';
        }

        console.log('[MediaPlayer] Audio player opened with:', filename, 'Playlist size:', playlist.tracks.length);
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
                        <button class="prev-track" title="上一曲">⏮</button>
                        <button class="play-pause">⏵</button>
                        <button class="next-track" title="下一曲">⏭</button>
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
                <div class="playlist-panel" style="display: none;">
                    <div class="playlist-header">播放列表</div>
                    <div class="playlist-list"></div>
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
        const prevBtn = audioPlayer.querySelector('.prev-track');
        const nextBtn = audioPlayer.querySelector('.next-track');
        const volumeSlider = audioPlayer.querySelector('.volume-slider');
        const progressContainer = audioPlayer.querySelector('.progress-container');
        const progressBar = audioPlayer.querySelector('.progress-bar');
        const timeInfo = audioPlayer.querySelector('.time-info');

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

        // 上一曲/下一曲按钮
        prevBtn.addEventListener('click', () => {
            if (playlist.tracks.length > 0) {
                playlist.currentIndex = (playlist.currentIndex - 1 + playlist.tracks.length) % playlist.tracks.length;
                const track = playlist.tracks[playlist.currentIndex];
                audio.src = track.path;
                audioPlayer.querySelector('.song-title').textContent = track.name;
                audio.play();
                playPauseBtn.textContent = '⏸';
                updatePlaylistDisplay(audioPlayer);
            }
        });

        nextBtn.addEventListener('click', () => {
            if (playlist.tracks.length > 0) {
                playlist.currentIndex = (playlist.currentIndex + 1) % playlist.tracks.length;
                const track = playlist.tracks[playlist.currentIndex];
                audio.src = track.path;
                audioPlayer.querySelector('.song-title').textContent = track.name;
                audio.play();
                playPauseBtn.textContent = '⏸';
                updatePlaylistDisplay(audioPlayer);
            }
        });

        volumeSlider.value = 50;
        audio.volume = 0.5;

        volumeSlider.addEventListener('input', () => {
            audio.volume = volumeSlider.value / 100;
        });

        // 进度条拖拽功能
        let isDraggingProgress = false;

        progressContainer.addEventListener('mousedown', (e) => {
            isDraggingProgress = true;
            updateProgress(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDraggingProgress) return;
            updateProgress(e);
        });

        document.addEventListener('mouseup', () => {
            isDraggingProgress = false;
        });

        progressContainer.addEventListener('click', (e) => {
            updateProgress(e);
        });

        function updateProgress(e) {
            const rect = progressContainer.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            if (audio.duration) {
                audio.currentTime = audio.duration * Math.max(0, Math.min(1, percent));
            }
        }

        // 时间更新
        audio.addEventListener('timeupdate', () => {
            if (!isDraggingProgress && audio.duration) {
                const progress = (audio.currentTime / audio.duration) * 100;
                progressBar.style.width = progress + '%';
                updateTimeDisplay(audio.currentTime, audio.duration);
            }
        });

        function updateTimeDisplay(current, duration) {
            const currentMin = Math.floor(current / 60);
            const currentSec = Math.floor(current % 60);
            const durationMin = Math.floor(duration / 60);
            const durationSec = Math.floor(duration % 60);

            timeInfo.textContent = `${currentMin}:${String(currentSec).padStart(2, '0')} / ${durationMin}:${String(durationSec).padStart(2, '0')}`;
        }

        // 音乐加载完成后自动播放
        audio.addEventListener('canplaythrough', () => {
            audio.play();
            playPauseBtn.textContent = '⏸';
        }, { once: true });

        // 音乐播放结束
        audio.addEventListener('ended', () => {
            playPauseBtn.textContent = '⏵';
            if (playlist.tracks.length > 0) {
                // 自动播放下一曲
                playlist.currentIndex = (playlist.currentIndex + 1) % playlist.tracks.length;
                const track = playlist.tracks[playlist.currentIndex];
                audio.src = track.path;
                audioPlayer.querySelector('.song-title').textContent = track.name;
                audio.play();
                playPauseBtn.textContent = '⏸';
                updatePlaylistDisplay(audioPlayer);
            }
        });
    }

    function updatePlaylistDisplay(audioPlayer) {
        const playlistList = audioPlayer.querySelector('.playlist-list');
        if (!playlistList) return;

        playlistList.innerHTML = '';
        playlist.tracks.forEach((track, index) => {
            const item = document.createElement('div');
            item.className = 'playlist-item' + (index === playlist.currentIndex ? ' playing' : '');
            item.textContent = track.name;
            item.addEventListener('click', () => {
                playlist.currentIndex = index;
                const audio = audioPlayer.querySelector('audio');
                audio.src = track.path;
                audioPlayer.querySelector('.song-title').textContent = track.name;
                audio.play();
                const playPauseBtn = audioPlayer.querySelector('.play-pause');
                playPauseBtn.textContent = '⏸';
                updatePlaylistDisplay(audioPlayer);
            });
            playlistList.appendChild(item);
        });
    }

    function playVideo(videoPath, filename) {
        if (!taskbarItems) {
            console.error('MediaPlayer not initialized');
            return;
        }

        console.log('[MediaPlayer] playVideo called with:', videoPath, filename);

        // 确保视频路径是绝对路径
        if (videoPath && !videoPath.startsWith('http') && !videoPath.startsWith('data:')) {
            videoPath = new URL(videoPath, globalThis.location.origin).href;
            console.log('[MediaPlayer] Converted to absolute URL:', videoPath);
        }

        let videoPlayerElement = document.getElementById('video-player');
        let taskbarIcon = document.getElementById('video-taskbar-icon');

        if (!videoPlayerElement) {
            const playerObj = createVideoPlayer();
            videoPlayerElement = playerObj.element;
            taskbarIcon = playerObj.taskbarIcon;
            taskbarItems.appendChild(taskbarIcon);
        }

        const video = videoPlayerElement.querySelector('video');
        video.src = videoPath;

        const videoTitle = videoPlayerElement.querySelector('.video-title');
        videoTitle.textContent = filename ? filename.split('/').pop() : '未知视频';

        // 将当前播放的视频添加到播放列表
        // 检查是否已存在
        const existingIndex = videoPlaylist.tracks.findIndex(t => t.path === videoPath);
        if (existingIndex !== -1) {
            videoPlaylist.currentIndex = existingIndex;
        } else {
            videoPlaylist.tracks.push({ path: videoPath, name: filename });
            videoPlaylist.currentIndex = videoPlaylist.tracks.length - 1;
        }

        videoPlayerElement.style.display = 'flex';
        videoPlayerElement.classList.remove('minimized');
        if (taskbarIcon) {
            taskbarIcon.style.display = 'flex';
        }

        console.log('[MediaPlayer] Video player opened with:', filename, 'Playlist size:', videoPlaylist.tracks.length);
    }

    function createVideoPlayer() {
        const videoPlayer = document.createElement('div');
        videoPlayer.id = 'video-player';
        videoPlayer.className = 'video-player';

        if (DeviceDetection.isMobile) {
            videoPlayer.classList.add('maximized');
        }

        videoPlayer.innerHTML = `
            <div class="window-titlebar">
                <div class="window-title">视频播放器</div>
                <div class="window-controls">
                    <button class="minimize video-minimize">─</button>
                    <button class="maximize video-maximize">□</button>
                    <button class="close video-close">×</button>
                </div>
            </div>
            <div class="video-content">
                <div class="video-header">
                    <div class="video-title">正在加载...</div>
                </div>
                <video src="" class="video-element" style="width: 100%; height: 100%;"></video>
                <div class="video-controls">
                    <div class="video-progress">
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill"></div>
                        </div>
                        <div class="progress-time">0:00 / 0:00</div>
                    </div>
                    <div class="control-buttons">
                        <button class="video-prev-track" title="上一个">⏮</button>
                        <button class="video-play-pause" title="播放/暂停">⏵</button>
                        <button class="video-next-track" title="下一个">⏭</button>
                        <div class="video-volume-control">
                            <span class="volume-icon">🔊</span>
                            <input type="range" min="0" max="100" value="50" class="video-volume-slider">
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(videoPlayer);

        const taskbarIcon = document.createElement('a');
        taskbarIcon.href = '#';
        taskbarIcon.className = 'taskbar-item';
        taskbarIcon.id = 'video-taskbar-icon';
        taskbarIcon.innerHTML = `
            <div class="icon">🎬</div>
            <span>视频播放器</span>
        `;
        taskbarIcon.style.display = 'none';

        // 绑定事件
        bindVideoPlayerEvents(videoPlayer, taskbarIcon);

        return { element: videoPlayer, taskbarIcon };
    }

    function bindVideoPlayerEvents(videoPlayer, taskbarIcon) {
        const closeBtn = videoPlayer.querySelector('.video-close');
        const minimizeBtn = videoPlayer.querySelector('.video-minimize');
        const maximizeBtn = videoPlayer.querySelector('.video-maximize');
        const video = videoPlayer.querySelector('video');
        const titlebar = videoPlayer.querySelector('.window-titlebar');
        const playPauseBtn = videoPlayer.querySelector('.video-play-pause');
        const prevBtn = videoPlayer.querySelector('.video-prev-track');
        const nextBtn = videoPlayer.querySelector('.video-next-track');
        const volumeSlider = videoPlayer.querySelector('.video-volume-slider');
        const progressContainer = videoPlayer.querySelector('.progress-bar-bg');
        const progressBar = videoPlayer.querySelector('.progress-bar-fill');
        const timeInfo = videoPlayer.querySelector('.progress-time');

        closeBtn.addEventListener('click', () => {
            videoPlayer.style.display = 'none';
            video.pause();
            taskbarIcon.style.display = 'none';
        });

        minimizeBtn.addEventListener('click', () => {
            videoPlayer.classList.add('minimized');
            videoPlayer.style.display = 'none';
            taskbarIcon.style.display = 'flex';
        });

        maximizeBtn.addEventListener('click', () => {
            if (videoPlayer.classList.contains('maximized')) {
                videoPlayer.classList.remove('maximized');
            } else {
                videoPlayer.classList.add('maximized');
            }
        });

        taskbarIcon.addEventListener('click', (e) => {
            e.preventDefault();
            if (videoPlayer.classList.contains('minimized') || videoPlayer.style.display === 'none') {
                videoPlayer.classList.remove('minimized');
                videoPlayer.style.display = 'flex';
            } else {
                videoPlayer.classList.add('minimized');
                videoPlayer.style.display = 'none';
            }
        });

        // 播放/暂停按钮
        playPauseBtn.addEventListener('click', () => {
            if (video.paused) {
                video.play();
                playPauseBtn.textContent = '⏸';
            } else {
                video.pause();
                playPauseBtn.textContent = '⏵';
            }
        });

        // 上一个/下一个按钮
        prevBtn.addEventListener('click', () => {
            if (videoPlaylist.tracks.length > 0) {
                videoPlaylist.currentIndex = (videoPlaylist.currentIndex - 1 + videoPlaylist.tracks.length) % videoPlaylist.tracks.length;
                const track = videoPlaylist.tracks[videoPlaylist.currentIndex];
                video.src = track.path;
                videoPlayer.querySelector('.video-title').textContent = track.name;
                video.play();
                playPauseBtn.textContent = '⏸';
            }
        });

        nextBtn.addEventListener('click', () => {
            if (videoPlaylist.tracks.length > 0) {
                videoPlaylist.currentIndex = (videoPlaylist.currentIndex + 1) % videoPlaylist.tracks.length;
                const track = videoPlaylist.tracks[videoPlaylist.currentIndex];
                video.src = track.path;
                videoPlayer.querySelector('.video-title').textContent = track.name;
                video.play();
                playPauseBtn.textContent = '⏸';
            }
        });

        // 音量控制
        volumeSlider.value = 50;
        video.volume = 0.5;

        volumeSlider.addEventListener('input', () => {
            video.volume = volumeSlider.value / 100;
        });

        // 进度条拖拽功能
        let isDraggingProgress = false;

        progressContainer.addEventListener('mousedown', (e) => {
            isDraggingProgress = true;
            updateProgress(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDraggingProgress) return;
            updateProgress(e);
        });

        document.addEventListener('mouseup', () => {
            isDraggingProgress = false;
        });

        progressContainer.addEventListener('click', (e) => {
            updateProgress(e);
        });

        function updateProgress(e) {
            const rect = progressContainer.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            if (video.duration) {
                video.currentTime = video.duration * Math.max(0, Math.min(1, percent));
            }
        }

        // 时间更新
        video.addEventListener('timeupdate', () => {
            if (!isDraggingProgress && video.duration) {
                const progress = (video.currentTime / video.duration) * 100;
                progressBar.style.width = progress + '%';
                updateTimeDisplay(video.currentTime, video.duration);
            }
        });

        function updateTimeDisplay(current, duration) {
            const currentMin = Math.floor(current / 60);
            const currentSec = Math.floor(current % 60);
            const durationMin = Math.floor(duration / 60);
            const durationSec = Math.floor(duration % 60);

            timeInfo.textContent = `${currentMin}:${String(currentSec).padStart(2, '0')} / ${durationMin}:${String(durationSec).padStart(2, '0')}`;
        }

        // 视频加载完成后自动播放
        video.addEventListener('canplaythrough', () => {
            video.play();
            playPauseBtn.textContent = '⏸';
        }, { once: true });

        // 视频播放结束
        video.addEventListener('ended', () => {
            playPauseBtn.textContent = '⏵';
            if (videoPlaylist.tracks.length > 0) {
                // 自动播放下一个
                videoPlaylist.currentIndex = (videoPlaylist.currentIndex + 1) % videoPlaylist.tracks.length;
                const track = videoPlaylist.tracks[videoPlaylist.currentIndex];
                video.src = track.path;
                videoPlayer.querySelector('.video-title').textContent = track.name;
                video.play();
                playPauseBtn.textContent = '⏸';
            }
        });

        // 窗口拖动
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        let activePointerId = null;

        const startWindowDrag = (e) => {
            if (videoPlayer.classList.contains('maximized')) return;
            if (e.target.closest('.window-controls')) return;
            if (e.target.closest('.video-controls')) return;

            const rect = videoPlayer.getBoundingClientRect();

            videoPlayer.style.setProperty('transform', 'none', 'important');
            videoPlayer.style.setProperty('left', `${rect.left}px`, 'important');
            videoPlayer.style.setProperty('top', `${rect.top}px`, 'important');

            isDragging = true;
            activePointerId = typeof e.pointerId === 'number' ? e.pointerId : null;
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            videoPlayer.style.transition = 'none';

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
            const minLeft = -videoPlayer.offsetWidth + 100;
            const minTop = 0;

            videoPlayer.style.setProperty('left', `${Math.max(minLeft, Math.min(maxLeft, newLeft))}px`, 'important');
            videoPlayer.style.setProperty('top', `${Math.max(minTop, Math.min(maxTop, newTop))}px`, 'important');

            e.preventDefault();
        };

        const endWindowDrag = (e) => {
            if (!isDragging) return;
            if (activePointerId !== null && typeof e.pointerId === 'number' && e.pointerId !== activePointerId) return;

            isDragging = false;
            activePointerId = null;
            if (videoPlayer) videoPlayer.style.transition = '';
        };

        titlebar.addEventListener('pointerdown', startWindowDrag);
        document.addEventListener('pointermove', handleWindowDragMove);
        document.addEventListener('pointerup', endWindowDrag);
        document.addEventListener('pointercancel', endWindowDrag);
    }

    return {
        init,
        previewImage,
        playAudio,
        playVideo,
        // 播放全部音乐
        playAllAudio: (tracks) => {
            if (!tracks || tracks.length === 0) return;

            // 转换路径并设置播放列表
            playlist.tracks = tracks.map(t => {
                let path = t.path;
                if (path && !path.startsWith('http') && !path.startsWith('data:')) {
                    path = new URL(path, globalThis.location.origin).href;
                }
                return {
                    path: path,
                    name: t.name
                };
            });
            playlist.currentIndex = 0;

            // 播放第一首
            if (tracks.length > 0) {
                playAudio(tracks[0].path, tracks[0].name);
            }
        },
        // 播放全部视频
        playAllVideo: (tracks) => {
            if (!tracks || tracks.length === 0) return;

            // 转换路径并设置播放列表
            videoPlaylist.tracks = tracks.map(t => {
                let path = t.path;
                if (path && !path.startsWith('http') && !path.startsWith('data:')) {
                    path = new URL(path, globalThis.location.origin).href;
                }
                return {
                    path: path,
                    name: t.name
                };
            });
            videoPlaylist.currentIndex = 0;

            // 播放第一个
            if (tracks.length > 0) {
                playVideo(tracks[0].path, tracks[0].name);
            }
        },
        // 播放列表管理方法
        addToPlaylist: (audioPath, filename) => {
            playlist.tracks.push({ path: audioPath, name: filename });
        },
        clearPlaylist: () => {
            playlist.tracks = [];
            playlist.currentIndex = 0;
        },
        getPlaylist: () => playlist,
        setPlaylist: (tracks) => {
            playlist.tracks = tracks;
            playlist.currentIndex = 0;
        }
    };
})();
