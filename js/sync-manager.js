/**
 * 跨标签页/窗口实时同步管理器
 * 使用 BroadcastChannel API 实现同一源的不同窗口/标签页间的实时同步
 */

class SyncManager {
  constructor() {
    this.channels = {
      todos: null,
      drawing: null,
      markdown: null
    };
    this.listeners = {
      todos: [],
      drawing: [],
      markdown: []
    };
    
    this.initChannels();
  }

  /**
   * 初始化 BroadcastChannel
   */
  initChannels() {
    try {
      // 创建用于待办事项同步的频道
      if (typeof BroadcastChannel !== 'undefined') {
        this.channels.todos = new BroadcastChannel('win7_todos_sync');
        this.channels.todos.onmessage = (event) => {
          this.notifyListeners('todos', event.data);
        };
        console.log('Todos BroadcastChannel initialized');
      }

      // 创建用于画板同步的频道
      if (typeof BroadcastChannel !== 'undefined') {
        this.channels.drawing = new BroadcastChannel('win7_drawing_sync');
        this.channels.drawing.onmessage = (event) => {
          this.notifyListeners('drawing', event.data);
        };
        console.log('Drawing BroadcastChannel initialized');
      }

      // 创建用于 Markdown 同步的频道
      if (typeof BroadcastChannel !== 'undefined') {
        this.channels.markdown = new BroadcastChannel('win7_markdown_sync');
        this.channels.markdown.onmessage = (event) => {
          this.notifyListeners('markdown', event.data);
        };
        console.log('Markdown BroadcastChannel initialized');
      }
    } catch (err) {
      console.warn('BroadcastChannel not available, using fallback:', err);
      this.initFallback();
    }
  }

  /**
   * 降级方案：使用 Storage 事件监听（针对不支持 BroadcastChannel 的浏览器）
   */
  initFallback() {
    globalThis.addEventListener('storage', (event) => {
      if (event.key === 'win7_todos_changed') {
        this.notifyListeners('todos', JSON.parse(event.newValue || '{}'));
      } else if (event.key === 'win7_drawing_changed') {
        this.notifyListeners('drawing', JSON.parse(event.newValue || '{}'));
      } else if (event.key === 'win7_markdown_changed') {
        this.notifyListeners('markdown', JSON.parse(event.newValue || '{}'));
      }
    });
    console.log('Using localStorage storage event as BroadcastChannel fallback');
  }

  /**
   * 注册同步监听器
   */
  onTodosChange(callback) {
    this.listeners.todos.push(callback);
    return () => {
      this.listeners.todos = this.listeners.todos.filter(cb => cb !== callback);
    };
  }

  onDrawingChange(callback) {
    this.listeners.drawing.push(callback);
    return () => {
      this.listeners.drawing = this.listeners.drawing.filter(cb => cb !== callback);
    };
  }

  onMarkdownChange(callback) {
    this.listeners.markdown.push(callback);
    return () => {
      this.listeners.markdown = this.listeners.markdown.filter(cb => cb !== callback);
    };
  }

  /**
   * 触发监听器
   */
  notifyListeners(type, data) {
    if (this.listeners[type]) {
      this.listeners[type].forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in ${type} sync listener:`, err);
        }
      });
    }
  }

  /**
   * 广播待办事项变化
   */
  broadcastTodosChange(data) {
    if (this.channels.todos) {
      try {
        this.channels.todos.postMessage({ action: 'todos_updated', data, timestamp: Date.now() });
      } catch (err) {
        console.warn('Error broadcasting todos:', err);
        this.broadcastTodosFallback(data);
      }
    } else {
      this.broadcastTodosFallback(data);
    }
  }

  broadcastTodosFallback(data) {
    try {
      localStorage.setItem('win7_todos_changed', JSON.stringify({ action: 'todos_updated', data, timestamp: Date.now() }));
    } catch (err) {
      console.error('Error in todos fallback:', err);
    }
  }

  /**
   * 广播画板变化
   */
  broadcastDrawingChange(data) {
    if (this.channels.drawing) {
      try {
        this.channels.drawing.postMessage({ action: 'drawing_updated', data, timestamp: Date.now() });
      } catch (err) {
        console.warn('Error broadcasting drawing:', err);
        this.broadcastDrawingFallback(data);
      }
    } else {
      this.broadcastDrawingFallback(data);
    }
  }

  broadcastDrawingFallback(data) {
    try {
      localStorage.setItem('win7_drawing_changed', JSON.stringify({ action: 'drawing_updated', data, timestamp: Date.now() }));
    } catch (err) {
      console.error('Error in drawing fallback:', err);
    }
  }

  /**
   * 广播 Markdown 变化
   */
  broadcastMarkdownChange(data) {
    if (this.channels.markdown) {
      try {
        this.channels.markdown.postMessage({ action: 'markdown_updated', data, timestamp: Date.now() });
      } catch (err) {
        console.warn('Error broadcasting markdown:', err);
        this.broadcastMarkdownFallback(data);
      }
    } else {
      this.broadcastMarkdownFallback(data);
    }
  }

  broadcastMarkdownFallback(data) {
    try {
      localStorage.setItem('win7_markdown_changed', JSON.stringify({ action: 'markdown_updated', data, timestamp: Date.now() }));
    } catch (err) {
      console.error('Error in markdown fallback:', err);
    }
  }

  /**
   * 关闭所有频道
   */
  closeChannels() {
    Object.values(this.channels).forEach(channel => {
      if (channel) {
        try {
          channel.close();
        } catch (err) {
          console.warn('Error closing channel:', err);
        }
      }
    });
  }
}

// 全局同步管理器实例
if (typeof globalThis.window !== 'undefined') {
  globalThis.syncManager = new SyncManager();
}

// 导出用于 Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SyncManager;
}
