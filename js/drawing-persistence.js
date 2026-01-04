/**
 * 画板数据持久化管理器
 * 负责将画板数据保存到服务器文件系统
 */

class DrawingPersistence {
  constructor() {
    this.apiUrl = ApiConfig.getModuleUrl('drawing');
    this.autosaveInterval = ApiConfig.AUTOSAVE_INTERVAL;
    this.autosaveTimer = null;
    this.lastSavedState = null;
    
    this.initConnectionListener();
  }

  /**
   * 初始化连接状态监听器
   */
  initConnectionListener() {
    if (globalThis.serverConnection) {
      globalThis.serverConnection.onConnectionChange((isOnline) => {
        console.log(`Drawing manager: Server ${isOnline ? 'online' : 'offline'}`);
        if (isOnline) {
          // 连接恢复时重新加载数据
          this.loadDrawing().then(data => {
            if (data && globalThis.syncManager) {
              globalThis.syncManager.broadcastDrawingChange(data);
            }
          });
        }
      });
    }
  }

  /**
   * 加载画板数据
   */
  async loadDrawing() {
    try {
      if (!globalThis.serverConnection?.getStatus()) {
        return this.loadDrawingFromLocalStorage();
      }

      const response = await fetch(this.apiUrl, {
        method: 'GET',
        mode: 'cors'
      });

      if (!response.ok) throw new Error('Failed to load drawing');

      const data = await response.json();
      this.saveDrawingToLocalStorage(data);
      return data;
    } catch (err) {
      console.error('Error loading drawing from server:', err);
      return this.loadDrawingFromLocalStorage();
    }
  }

  /**
   * 保存画板数据
   */
  async saveDrawing(layers, state) {
    this.saveDrawingToLocalStorage({ layers, state });

    // 广播画板变化到其他窗口
    if (globalThis.syncManager) {
      globalThis.syncManager.broadcastDrawingChange({ layers, state, timestamp: Date.now() });
    }

    if (!globalThis.serverConnection?.getStatus()) {
      console.warn('Server offline, drawing saved to local backup only');
      return false;
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layers, state })
      });

      if (!response.ok) throw new Error('Failed to save drawing');

      const result = await response.json();
      console.log('Drawing saved:', result.message);
      return true;
    } catch (err) {
      console.error('Error saving drawing:', err);
      return false;
    }
  }

  /**
   * 更新画板状态（窗口位置、工具设置等）
   */
  async updateDrawingState(state) {
    this.saveDrawingToLocalStorage({ state });

    if (!globalThis.serverConnection?.getStatus()) {
      console.warn('Server offline, state saved to local backup only');
      return false;
    }

    try {
      const response = await fetch(ApiConfig.getStateUrl('drawing'), {
        method: 'PUT',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });

      if (!response.ok) throw new Error('Failed to update drawing state');

      return true;
    } catch (err) {
      console.error('Error updating drawing state:', err);
      return false;
    }
  }

  /**
   * 加载画板状态（窗口位置、工具设置等）
   */
  async loadDrawingState() {
    try {
      if (!this.isOnline) {
        return this.loadDrawingStateFromLocalStorage();
      }

      const response = await fetch(`${this.apiUrl}/state`, {
        method: 'GET',
        mode: 'cors'
      });

      if (!response.ok) throw new Error('Failed to load drawing state');

      const state = await response.json();
      this.saveDrawingStateToLocalStorage(state);
      return state;
    } catch (err) {
      console.error('Error loading drawing state from server:', err);
      return this.loadDrawingStateFromLocalStorage();
    }
  }

  /**
   * 从本地存储加载画板状态（备份）
   */
  loadDrawingStateFromLocalStorage() {
    try {
      const saved = localStorage.getItem('drawing_state_backup');
      if (saved) {
        const state = JSON.parse(saved);
        console.log('Loaded drawing state from local backup');
        return state;
      }
    } catch (err) {
      console.error('Error loading state from localStorage:', err);
    }
    return null;
  }

  /**
   * 保存画板状态到本地存储（备份）
   */
  saveDrawingStateToLocalStorage(state) {
    try {
      localStorage.setItem('drawing_state_backup', JSON.stringify(state));
    } catch (err) {
      console.error('Error saving state to localStorage:', err);
    }
  }

  /**
   * 从本地存储加载画板数据（备份）
   */
  loadDrawingFromLocalStorage() {
    try {
      const saved = localStorage.getItem('drawing_backup');
      if (saved) {
        const data = JSON.parse(saved);
        console.log('Loaded drawing from local backup');
        return data;
      }
    } catch (err) {
      console.error('Error loading from localStorage:', err);
    }
    return null;
  }

  /**
   * 保存画板数据到本地存储（备份）
   */
  saveDrawingToLocalStorage(data) {
    try {
      localStorage.setItem('drawing_backup', JSON.stringify(data));
    } catch (err) {
      console.error('Error saving to localStorage:', err);
    }
  }

  /**
   * 清空画板
   */
  async clearDrawing() {
    if (!this.isOnline) {
      localStorage.removeItem('drawing_backup');
      return true;
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'DELETE',
        mode: 'cors'
      });

      if (!response.ok) throw new Error('Failed to clear drawing');

      localStorage.removeItem('drawing_backup');
      return true;
    } catch (err) {
      console.error('Error clearing drawing:', err);
      return false;
    }
  }

  /**
   * 导出画板为 JSON 文件
   */
  async exportDrawing() {
    try {
      const response = await fetch(`${this.apiUrl}/export/json`, {
        method: 'GET',
        mode: 'cors'
      });

      if (!response.ok) throw new Error('Failed to export drawing');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `drawing_${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);

      return true;
    } catch (err) {
      console.error('Error exporting drawing:', err);
      return false;
    }
  }

  /**
   * 导入画板数据
   */
  async importDrawing(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!Array.isArray(data.layers)) {
        throw new Error('Invalid drawing format: layers must be an array');
      }

      if (!this.isOnline) {
        this.saveDrawingToLocalStorage(data);
        return true;
      }

      const response = await fetch(`${this.apiUrl}/import`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to import drawing');

      this.saveDrawingToLocalStorage(data);
      return true;
    } catch (err) {
      console.error('Error importing drawing:', err);
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

    console.log(`Autosave enabled (every ${this.autosaveInterval / 1000} seconds)`);
  }

  /**
   * 禁用自动保存
   */
  disableAutosave() {
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
      this.autosaveTimer = null;
      console.log('Autosave disabled');
    }
  }
}

// 全局实例
if (typeof globalThis.window !== 'undefined') {
  globalThis.drawingPersistence = new DrawingPersistence();
}

// 导出用于 Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DrawingPersistence;
}
