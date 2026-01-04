/**
 * Win7 Blog Main Module Loader
 * 初始化所有功能模块
 */

import { DeviceDetection } from './deviceDetection.js';
import { ThemeManager } from './themeManager.js';
import { BackgroundManager } from './backgroundManager.js';
import { DesktopTyping } from './desktopTyping.js';
import { ToolbarManager } from './toolbarManager.js';
import { Clock } from './clock.js';
import { Calendar } from './calendar.js';
import { MediaPlayer } from './mediaPlayer.js';
import { ArticleReader } from './articleReader.js';
import { WindowManager } from './windowManager.js';
import { WindowShell } from './windowShell.js';
import { StartMenu } from './startMenu.js';
import { Explorer } from './explorer.js';
import { Drawing } from './drawing.js';
import { MarkdownEditor } from './markdownEditor.js';
import { TableOfContents } from './toc.js';
import { Search } from './search.js';
import { WindowDragger } from './windowDragger.js';
import { RandomArticle } from './randomArticle.js';

/**
 * Win7博客系统的主初始化函数
 */
export function initWin7Blog() {
    // 1. 设备检测
    console.log('[Win7] Initializing Device Detection');
    DeviceDetection.init();

    // 2. 主题管理
    console.log('[Win7] Initializing Theme Manager');
    ThemeManager.init();

    // 3. 背景管理
    console.log('[Win7] Initializing Background Manager');
    BackgroundManager.init();

    // 4. 桌面打字机效果
    console.log('[Win7] Initializing Desktop Typing');
    DesktopTyping.init();

    // 5. 工具栏管理
    console.log('[Win7] Initializing Toolbar Manager');
    ToolbarManager.init();

    // 6. 时钟
    console.log('[Win7] Initializing Clock');
    Clock.init();

    // 6.5 日历
    console.log('[Win7] Initializing Calendar');
    Calendar.init();

    // 7. 媒体播放器
    console.log('[Win7] Initializing Media Player');
    const taskbarItems = document.querySelector('.taskbar-items');
    if (taskbarItems) {
        MediaPlayer.init(taskbarItems);
        // 将MediaPlayer暴露为全局，便于其他模块访问
        globalThis.mediaPlayer = MediaPlayer;
    }

    // 8. 文章读取器
    console.log('[Win7] Initializing Article Reader');
    if (taskbarItems) {
        ArticleReader.init(taskbarItems);
        // 将ArticleReader暴露为全局，便于其他模块访问
        globalThis.articleReader = ArticleReader;
    }

    // 8.5 任务栏搜索
    console.log('[Win7] Initializing Taskbar Search');
    Search.init();

    // 8.6 随机打开文章功能
    console.log('[Win7] Initializing Random Article');
    RandomArticle.init();

    // 9. 窗口外壳（任务栏图标/最小化/最大化/关闭）
    console.log('[Win7] Initializing Window Shell');
    WindowShell.init(taskbarItems);

    // 9.5 开始菜单
    console.log('[Win7] Initializing Start Menu');
    StartMenu.init();

    // 9.7 窗口拖动
    console.log('[Win7] Initializing Window Dragger');
    WindowDragger.init();

    // 10. 窗口管理器（管理 Explorer、Drawing、Markdown、Todo 窗口）
    console.log('[Win7] Initializing Window Manager');
    WindowManager.waitForWin7Functions();

    // 10. 文件浏览器（Explorer）
    console.log('[Win7] Initializing Explorer');
    Explorer.init();

    // 11. 画板（Drawing）
    console.log('[Win7] Initializing Drawing');
    Drawing.init();

    // 12. Markdown 编辑器
    console.log('[Win7] Initializing Markdown Editor');
    MarkdownEditor.init();

    // 13. 目录（TOC）
    console.log('[Win7] Initializing Table of Contents');
    TableOfContents.init();

    console.log('[Win7] All modules initialized successfully');
}

/**
 * 当DOM加载完成时初始化
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Win7] DOM Content Loaded - Starting initialization');
    initWin7Blog();
});

/**
 * 暴露全局函数供 WindowManager 和其他模块使用
 * 这些函数实现窗口打开/关闭的基本功能
 */
globalThis.startOpenExplorer = function() {
    console.log('[startOpenExplorer] Called');
    const win = document.getElementById('explorer-window');
    if (win) {
        console.log('[startOpenExplorer] Explorer window found, reinitializing...');
        // 重新初始化 Explorer 事件处理器
        if (globalThis.reinitializeExplorer) {
            globalThis.reinitializeExplorer();
        } else {
            console.warn('[startOpenExplorer] reinitializeExplorer not available');
        }
        
        win.style.display = 'flex';
        win.style.visibility = 'visible';
        win.style.opacity = '1';
        WindowShell.bringToFront(win);
        win.classList.remove('minimized');
        win.classList.add('restored', 'active');
        
        const taskbarIcon = document.querySelector('[data-app="explorer"]');
        if (taskbarIcon) {
            taskbarIcon.style.display = 'flex';
            taskbarIcon.classList.add('active');
        }
        
        // 触发导航初始化（如果需要）
        if (typeof globalThis.navigateTo === 'function') {
            try { 
                globalThis.navigateTo(''); 
            } 
            catch(err) {
                console.error('[startOpenExplorer] Error navigating to root:', err);
            }
        }
    } else {
        console.warn('[startOpenExplorer] Explorer window not found');
    }
};

globalThis.startOpenDrawing = function() {
    const win = document.getElementById('drawing-window');
    if (win) {
        win.style.display = 'flex';
        win.style.visibility = 'visible';
        win.style.opacity = '1';
        WindowShell.bringToFront(win);
        win.classList.remove('minimized');
        win.classList.add('restored', 'active');
        
        const taskbarIcon = document.querySelector('[data-app="drawing"]');
        if (taskbarIcon) {
            taskbarIcon.style.display = 'flex';
            taskbarIcon.classList.add('active');
        }
        
        // 触发canvas重新计算大小
        setTimeout(() => {
            if (typeof globalThis.resizeCanvas === 'function') {
                try { 
                    globalThis.resizeCanvas(); 
                } catch(err) {
                    console.error('[startOpenDrawing] Error resizing canvas:', err);
                }
            }
        }, 50);
    }
};

globalThis.startOpenMd = function() {
    const win = document.getElementById('md-window');
    if (win) {
        win.style.display = 'flex';
        win.style.visibility = 'visible';
        win.style.opacity = '1';
        WindowShell.bringToFront(win);
        win.classList.remove('minimized');
        win.classList.add('restored', 'active');
        
        const taskbarIcon = document.querySelector('[data-app="markdown"]');
        if (taskbarIcon) {
            taskbarIcon.style.display = 'flex';
            taskbarIcon.classList.add('active');
        }
    }
};

globalThis.startOpenTodo = function() {
    const win = document.getElementById('todo-window');
    if (win) {
        win.style.display = 'flex';
        win.style.visibility = 'visible';
        win.style.opacity = '1';
        WindowShell.bringToFront(win);
        win.classList.remove('minimized');
        win.classList.add('restored', 'active');
        
        const taskbarIcon = document.querySelector('[data-app="todo"]');
        if (taskbarIcon) {
            taskbarIcon.style.display = 'flex';
            taskbarIcon.classList.add('active');
        }
        
        // 确保待办事项管理器已初始化
        if (globalThis.todoManager) {
            globalThis.todoManager.renderTodos();
        }
    }
};

// 为 todo 桌面图标绑定点击事件
document.addEventListener('DOMContentLoaded', () => {
    const todoIcon = document.getElementById('todo-manager');
    if (todoIcon) {
        todoIcon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof globalThis.startOpenTodo === 'function') {
                globalThis.startOpenTodo();
            }
        });
    }
    
    // 在 DOM 加载完成后，重新初始化通知管理器事件处理器
    if (globalThis.notificationManager && typeof globalThis.notificationManager.bindEventHandlers === 'function') {
        console.log('[Win7Loader] Re-initializing notification manager event handlers');
        globalThis.notificationManager.bindEventHandlers();
    }
    
    // 在 DOM 加载完成后，重新初始化 Explorer 事件处理器
    if (globalThis.Win7 && globalThis.Win7.Explorer) {
        console.log('[Win7Loader] Re-initializing Explorer event handlers');
        globalThis.Win7.Explorer.reinitialize?.();
    }
});

/**
 * 暴露 Explorer 初始化接口用于重新打开窗口
 */
globalThis.reinitializeExplorer = function() {
    console.log('[reinitializeExplorer] Called');
    if (globalThis.Win7 && globalThis.Win7.Explorer) {
        console.log('[reinitializeExplorer] Calling Explorer.init()');
        globalThis.Win7.Explorer.init();
    } else {
        console.warn('[reinitializeExplorer] Win7.Explorer not available');
    }
};

// 暴露API供其他模块访问
globalThis.Win7 = {
    DeviceDetection,
    ThemeManager,
    BackgroundManager,
    DesktopTyping,
    ToolbarManager,
    Clock,
    Calendar,
    MediaPlayer,
    ArticleReader,
    Search,
    WindowManager,
    WindowShell,
    StartMenu,
    Explorer,
    Drawing,
    MarkdownEditor,
    TableOfContents,
    initWin7Blog
};

// 为了兼容性，也暴露 initToc 全局函数（原来在 toc.js 中）
globalThis.initToc = function(context) {
    if (TableOfContents && TableOfContents.initTocContext) {
        TableOfContents.initTocContext(context || document);
    }
};
