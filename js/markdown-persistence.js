/**
 * Markdown 编辑器数据持久化管理器
 * 负责将 Markdown 内容保存到服务器文件系统
 */

class MarkdownPersistence {
  constructor() {
    this.apiUrl = ApiConfig.getModuleUrl('markdown');
    this.autosaveInterval = ApiConfig.AUTOSAVE_INTERVAL;
    this.autosaveTimer = null;
    this.lastSavedContent = null;
    
    this.initConnectionListener();
  }

  /**
   * 初始化连接状态监听器
   */
  initConnectionListener() {
    if (globalThis.serverConnection) {
      globalThis.serverConnection.onConnectionChange((isOnline) => {
        console.log(`Markdown manager: Server ${isOnline ? 'online' : 'offline'}`);
        if (isOnline) {
          // 连接恢复时重新加载数据
          this.loadMarkdown().then(data => {
            if (data && globalThis.syncManager) {
              globalThis.syncManager.broadcastMarkdownChange(data);
            }
          });
        }
      });
    }
  }

  /**
   * 加载 Markdown 内容
   */
  async loadMarkdown() {
    try {
      if (!this.isOnline) {
        return this.loadMarkdownFromLocalStorage();
      }

      const response = await fetch(this.apiUrl, {
        method: 'GET',
        mode: 'cors'
      });

      if (!response.ok) throw new Error('Failed to load markdown');

      const data = await response.json();
      this.saveMarkdownToLocalStorage(data);
      return data;
    } catch (err) {
      console.error('Error loading markdown from server:', err);
      return this.loadMarkdownFromLocalStorage();
    }
  }

  /**
   * 保存 Markdown 内容
   */
  async saveMarkdown(content) {
    this.lastSavedContent = content;
    this.saveMarkdownToLocalStorage({ content, timestamp: Date.now() });

    // 广播 Markdown 变化到其他窗口
    if (globalThis.syncManager) {
      globalThis.syncManager.broadcastMarkdownChange({ content, timestamp: Date.now() });
    }

    if (!this.isOnline) {
      console.warn('Server offline, markdown saved to local backup only');
      return false;
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, timestamp: Date.now() })
      });

      if (!response.ok) throw new Error('Failed to save markdown');

      const result = await response.json();
      console.log('Markdown saved:', result.message);
      return true;
    } catch (err) {
      console.error('Error saving markdown:', err);
      return false;
    }
  }

  /**
   * 更新 Markdown 编辑器状态（光标位置、滚动位置等）
   */
  async updateMarkdownState(state) {
    this.saveMarkdownStateToLocalStorage(state);

    if (!globalThis.serverConnection?.getStatus()) {
      console.warn('Server offline, markdown state saved to local backup only');
      return false;
    }

    try {
      const response = await fetch(ApiConfig.getStateUrl('markdown'), {
        method: 'PUT',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });

      if (!response.ok) throw new Error('Failed to update markdown state');

      return true;
    } catch (err) {
      console.error('Error updating markdown state:', err);
      return false;
    }
  }

  /**
   * 加载 Markdown 编辑器状态（光标位置、滚动位置等）
   */
  async loadMarkdownState() {
    try {
      if (!this.isOnline) {
        return this.loadMarkdownStateFromLocalStorage();
      }

      const response = await fetch(`${this.apiUrl}/state`, {
        method: 'GET',
        mode: 'cors'
      });

      if (!response.ok) throw new Error('Failed to load markdown state');

      const state = await response.json();
      this.saveMarkdownStateToLocalStorage(state);
      return state;
    } catch (err) {
      console.error('Error loading markdown state from server:', err);
      return this.loadMarkdownStateFromLocalStorage();
    }
  }

  /**
   * 从本地存储加载 Markdown 内容（备份）
   */
  loadMarkdownFromLocalStorage() {
    try {
      const saved = localStorage.getItem('markdown_backup');
      if (saved) {
        const data = JSON.parse(saved);
        console.log('Loaded markdown from local backup');
        return data;
      }
    } catch (err) {
      console.error('Error loading markdown from localStorage:', err);
    }
    return null;
  }

  /**
   * 保存 Markdown 内容到本地存储（备份）
   */
  saveMarkdownToLocalStorage(data) {
    try {
      localStorage.setItem('markdown_backup', JSON.stringify(data));
    } catch (err) {
      console.error('Error saving markdown to localStorage:', err);
    }
  }

  /**
   * 从本地存储加载编辑器状态（备份）
   */
  loadMarkdownStateFromLocalStorage() {
    try {
      const saved = localStorage.getItem('markdown_state_backup');
      if (saved) {
        const state = JSON.parse(saved);
        console.log('Loaded markdown state from local backup');
        return state;
      }
    } catch (err) {
      console.error('Error loading markdown state from localStorage:', err);
    }
    return null;
  }

  /**
   * 保存编辑器状态到本地存储（备份）
   */
  saveMarkdownStateToLocalStorage(state) {
    try {
      localStorage.setItem('markdown_state_backup', JSON.stringify(state));
    } catch (err) {
      console.error('Error saving markdown state to localStorage:', err);
    }
  }

  /**
   * 清空 Markdown 内容
   */
  async clearMarkdown() {
    if (!this.isOnline) {
      localStorage.removeItem('markdown_backup');
      return true;
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'DELETE',
        mode: 'cors'
      });

      if (!response.ok) throw new Error('Failed to clear markdown');

      localStorage.removeItem('markdown_backup');
      return true;
    } catch (err) {
      console.error('Error clearing markdown:', err);
      return false;
    }
  }

  /**
   * 导出 Markdown 为文件
   */
  async exportMarkdown() {
    try {
      const response = await fetch(`${this.apiUrl}/export`, {
        method: 'GET',
        mode: 'cors'
      });

      if (!response.ok) throw new Error('Failed to export markdown');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `markdown_${Date.now()}.md`;
      link.click();
      URL.revokeObjectURL(url);

      return true;
    } catch (err) {
      console.error('Error exporting markdown:', err);
      return false;
    }
  }

  /**
   * 导入 Markdown 文件
   */
  async importMarkdown(file) {
    try {
      const text = await file.text();

      if (!this.isOnline) {
        this.saveMarkdownToLocalStorage({ content: text, timestamp: Date.now() });
        return true;
      }

      const response = await fetch(`${this.apiUrl}/import`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      });

      if (!response.ok) throw new Error('Failed to import markdown');

      this.saveMarkdownToLocalStorage({ content: text, timestamp: Date.now() });
      return true;
    } catch (err) {
      console.error('Error importing markdown:', err);
      return false;
    }
  }

  /**
   * 启用自动保存
   */
  enableAutosave(saveCallback) {
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
    }

    this.autosaveTimer = setInterval(() => {
      try {
        saveCallback();
      } catch (err) {
        console.error('Autosave error:', err);
      }
    }, this.autosaveInterval);

    console.log(`Markdown autosave enabled (every ${this.autosaveInterval / 1000} seconds)`);
  }

  /**
   * 禁用自动保存
   */
  disableAutosave() {
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
      this.autosaveTimer = null;
      console.log('Markdown autosave disabled');
    }
  }
}

// 全局实例
if (typeof globalThis.window !== 'undefined') {
  globalThis.markdownPersistence = new MarkdownPersistence();
}

// 导出用于 Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarkdownPersistence;
}
