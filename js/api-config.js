/**
 * API 配置文件
 * 统一管理所有API相关的配置信息
 */

class ApiConfig {
  static BASE_URL = 'http://localhost:3001/api';
  static HEALTH_CHECK_URL = `${this.BASE_URL}/health`;
  
  // 自动保存间隔（毫秒）
  static AUTOSAVE_INTERVAL = 30000;
  
  // 连接检查间隔（毫秒）
  static CONNECTION_CHECK_INTERVAL = 30000;
  
  // 请求超时时间（毫秒）
  static REQUEST_TIMEOUT = 5000;
  
  /**
   * 获取指定模块的API基础URL
   * @param {string} module - 模块名称（如 'todos', 'drawing', 'markdown'）
   * @returns {string} API URL
   */
  static getModuleUrl(module) {
    return `${this.BASE_URL}/${module}`;
  }
  
  /**
   * 获取模块状态API URL
   * @param {string} module - 模块名称
   * @returns {string} 状态API URL
   */
  static getStateUrl(module) {
    return `${this.getModuleUrl(module)}/state`;
  }
  
  /**
   * 获取导出API URL
   * @param {string} module - 模块名称
   * @param {string} format - 导出格式（默认json）
   * @returns {string} 导出API URL
   */
  static getExportUrl(module, format = 'json') {
    return `${this.getModuleUrl(module)}/export/${format}`;
  }
  
  /**
   * 获取导入API URL
   * @param {string} module - 模块名称
   * @returns {string} 导入API URL
   */
  static getImportUrl(module) {
    return `${this.getModuleUrl(module)}/import`;
  }
}

// 导出到全局作用域
if (typeof globalThis !== 'undefined') {
  globalThis.ApiConfig = ApiConfig;
}

// 导出用于 Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiConfig;
}