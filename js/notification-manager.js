// 待办通知管理器
class NotificationManager {
  constructor() {
    this.container = null;
    this.notificationInterval = 30000; // 默认每30秒检查一次
    this.lastNotifiedId = null;
    this.isEnabled = true;
    this.shownNotifications = new Set(); // 防止重复通知
    this.init();
  }

  init() {
    this.createContainer();
    this.loadSettings();
    this.startNotificationLoop();
    // 延迟事件绑定以确保DOM已加载
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log('[NotificationManager] DOM loaded, binding event handlers');
        this.bindEventHandlers();
      });
    } else {
      console.log('[NotificationManager] DOM already loaded, binding event handlers');
      this.bindEventHandlers();
    }
  }

  reinitializeEventHandlers() {
    console.log('[NotificationManager] Re-initializing event handlers');
    this.bindEventHandlers();
  }

  // 绑定事件处理器
  bindEventHandlers() {
    console.log('[NotificationManager] bindEventHandlers called');
  }

  createContainer() {
    // 创建通知容器
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    this.container.className = 'notification-container';
    document.body.appendChild(this.container);
  }

  loadSettings() {
    try {
      const settings = JSON.parse(localStorage.getItem('notification_settings') || '{}');
      this.notificationInterval = settings.interval || 30000;
      this.isEnabled = settings.enabled !== false;
    } catch (e) {
      console.warn('Failed to load notification settings');
    }
  }

  saveSettings() {
    const settings = {
      interval: this.notificationInterval,
      enabled: this.isEnabled
    };
    localStorage.setItem('notification_settings', JSON.stringify(settings));
  }

  // 开始通知循环
  startNotificationLoop() {
    if (this.notificationInterval > 0) {
      setInterval(() => {
        if (this.isEnabled) {
          this.checkAndNotify();
        }
      }, this.notificationInterval);
    }
  }

  // 检查并通知待办事项
  checkAndNotify() {
    try {
      // 从TodoManager获取待办列表
      if (!globalThis.todoManager || !globalThis.todoManager.todos) {
        console.warn('TodoManager not found');
        return;
      }

      const todos = globalThis.todoManager.todos;
      if (!todos || todos.length === 0) {
        return;
      }

      // 获取未完成的待办事项
      const uncompletedTodos = todos.filter(t => !t.completed);
      if (uncompletedTodos.length === 0) {
        return;
      }

      // 随机选择一个未通知过的待办事项
      const unnotified = uncompletedTodos.filter(t => !this.shownNotifications.has(t.id));
      
      if (unnotified.length > 0) {
        const todo = unnotified[Math.floor(Math.random() * unnotified.length)];
        this.showNotification(todo);
        this.shownNotifications.add(todo.id);
      } else if (uncompletedTodos.length > 0) {
        // 如果所有未完成项都通知过，随机选择一个重新通知
        const todo = uncompletedTodos[Math.floor(Math.random() * uncompletedTodos.length)];
        this.showNotification(todo);
      }
    } catch (e) {
      console.error('Error in checkAndNotify:', e);
    }
  }

  // 显示随机待办事项（用于用户主动触发，不考虑已通知记录）
  showRandomTodo() {
    console.log('[NotificationManager] showRandomTodo called');
    try {
      // 从TodoManager获取待办列表
      if (!globalThis.todoManager || !globalThis.todoManager.todos) {
        console.warn('[NotificationManager] TodoManager not found');
        return;
      }

      const todos = globalThis.todoManager.todos;
      console.log('[NotificationManager] Total todos:', todos.length);
      
      if (!todos || todos.length === 0) {
        console.log('[NotificationManager] No todos found');
        return;
      }

      // 获取未完成的待办事项
      const uncompletedTodos = todos.filter(t => !t.completed);
      console.log('[NotificationManager] Uncompleted todos:', uncompletedTodos.length);
      
      if (uncompletedTodos.length === 0) {
        console.log('[NotificationManager] No uncompleted todos');
        return;
      }

      // 随机选择一个待办事项（不考虑是否已通知过）
      const todo = uncompletedTodos[Math.floor(Math.random() * uncompletedTodos.length)];
      console.log('[NotificationManager] Selected random todo:', todo.text);
      
      this.showNotification(todo);
    } catch (e) {
      console.error('[NotificationManager] Error in showRandomTodo:', e);
    }
  }

  // 显示通知
  showNotification(todo) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.setAttribute('data-id', todo.id);
    
    // 优先级样式
    const priorityClass = {
      'high': 'priority-high',
      'medium': 'priority-medium',
      'low': 'priority-low'
    }[todo.priority] || 'priority-low';

    const priorityEmoji = {
      'high': '🔴',
      'medium': '🟡',
      'low': '🟢'
    }[todo.priority] || '⚪';

    notification.innerHTML = `
      <div class="notification-content ${priorityClass}">
        <div class="notification-header">
          <span class="notification-priority">${priorityEmoji}</span>
          <span class="notification-title">待办提醒</span>
          <button class="notification-close" aria-label="关闭">×</button>
        </div>
        <div class="notification-text">${this.escapeHtml(todo.text)}</div>
        <div class="notification-time">${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
        <div class="notification-actions">
          <button class="notification-complete" data-id="${todo.id}">完成</button>
          <button class="notification-view" data-id="${todo.id}">查看</button>
        </div>
      </div>
    `;

    this.container.appendChild(notification);

    // 关闭按钮
    notification.querySelector('.notification-close').addEventListener('click', () => {
      this.removeNotification(notification);
    });

    // 完成按钮
    notification.querySelector('.notification-complete').addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      if (globalThis.todoManager) {
        globalThis.todoManager.toggleTodo(id);
        this.removeNotification(notification);
      }
    });

    // 查看按钮
    notification.querySelector('.notification-view').addEventListener('click', () => {
      this.removeNotification(notification);
      // 打开待办窗口
      const todoWindow = document.querySelector('.todo-window');
      if (todoWindow) {
        todoWindow.style.display = 'block';
        // 如果有zIndex管理，应该提升zIndex
        this.bringToFront(todoWindow);
      }
    });

    // 自动关闭（8秒后）
    setTimeout(() => {
      if (notification.parentNode) {
        this.removeNotification(notification);
      }
    }, 8000);

    // 有新通知时移除最旧的
    const notifications = this.container.querySelectorAll('.notification');
    if (notifications.length > 3) {
      this.removeNotification(notifications[0]);
    }
  }

  // 移除通知
  removeNotification(notification) {
    notification.classList.add('notification-hide');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  // 将窗口置于前面
  bringToFront(window) {
    const maxZIndex = Math.max(...Array.from(document.querySelectorAll('.window'))
      .map(w => Number.parseInt(getComputedStyle(w).zIndex) || 0));
    window.style.zIndex = maxZIndex + 1;
  }

  // HTML转义
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  // 设置通知间隔
  setInterval(ms) {
    this.notificationInterval = Math.max(5000, ms); // 最少5秒
    this.saveSettings();
  }

  // 启用/禁用通知
  setEnabled(enabled) {
    this.isEnabled = !!enabled;
    this.saveSettings();
  }

  // 手动触发通知（用于测试）
  testNotification() {
    if (!window.todoManager || !window.todoManager.todos) {
      alert('待办事项加载中...');
      return;
    }

    const uncompletedTodos = window.todoManager.todos.filter(t => !t.completed);
    if (uncompletedTodos.length === 0) {
      alert('没有未完成的待办事项');
      return;
    }

    const todo = uncompletedTodos[Math.floor(Math.random() * uncompletedTodos.length)];
    this.showNotification(todo);
  }

  // 清除所有通知
  clearAllNotifications() {
    const notifications = this.container.querySelectorAll('.notification');
    notifications.forEach(n => {
      n.classList.add('notification-hide');
      setTimeout(() => {
        if (n.parentNode) n.parentNode.removeChild(n);
      }, 300);
    });
  }

  // 清除已显示记录（用于重新通知）
  resetShownNotifications() {
    this.shownNotifications.clear();
  }
}

// 全局单例实例
globalThis.notificationManager = new NotificationManager();