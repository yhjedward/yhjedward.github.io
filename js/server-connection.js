/**
 * 服务器连接管理器
 * 提供统一的服务器连接检查和状态管理功能
 */

class ServerConnectionManager {
  constructor() {
    this.isOnline = true;
    this.checkTimer = null;
    this.connectionListeners = new Set();
    this.initConnectionCheck();
  }

  /**
   * 初始化连接检查
   */
  initConnectionCheck() {
    this.checkServerConnection();
    
    // 定期检查连接
    setTimeout(() => this.initConnectionCheck(), ApiConfig.CONNECTION_CHECK_INTERVAL);
  }

  /**
   * 检查服务器连接状态
   */
  async checkServerConnection() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ApiConfig.REQUEST_TIMEOUT);
      
      const response = await fetch(ApiConfig.HEALTH_CHECK_URL, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const wasOnline = this.isOnline;
      this.isOnline = response.ok;
      
      // 如果连接状态发生变化，通知所有监听器
      if (wasOnline !== this.isOnline) {
        this.notifyConnectionChange(this.isOnline);
      }
      
      return this.isOnline;
    } catch (err) {
      const wasOnline = this.isOnline;
      this.isOnline = false;
      
      if (wasOnline) {
        this.notifyConnectionChange(false);
      }
      
      return false;
    }
  }

  /**
   * 注册连接状态变化监听器
   * @param {Function} callback - 回调函数，接收 isOnline 参数
   */
  onConnectionChange(callback) {
    this.connectionListeners.add(callback);
  }

  /**
   * 移除连接状态变化监听器
   * @param {Function} callback - 回调函数
   */
  removeConnectionListener(callback) {
    this.connectionListeners.delete(callback);
  }

  /**
   * 通知所有监听器连接状态变化
   * @param {boolean} isOnline - 是否在线
   */
  notifyConnectionChange(isOnline) {
    console.warn(`Server connection ${isOnline ? 'restored' : 'lost'}`);
    this.connectionListeners.forEach(callback => {
      try {
        callback(isOnline);
      } catch (err) {
        console.error('Error in connection change callback:', err);
      }
    });
  }

  /**
   * 等待服务器恢复连接
   * @param {number} maxWait - 最大等待时间（毫秒），默认60000ms
   * @returns {Promise<boolean>} 是否恢复连接
   */
  async waitForConnection(maxWait = 60000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      if (await this.checkServerConnection()) {
        return true;
      }
      
      // 等待5秒后重试
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    return false;
  }

  /**
   * 获取当前连接状态
   * @returns {boolean} 是否在线
   */
  getStatus() {
    return this.isOnline;
  }
}

// 创建全局实例
if (typeof globalThis !== 'undefined') {
  globalThis.serverConnection = new ServerConnectionManager();
}

// 导出用于 Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ServerConnectionManager;
}