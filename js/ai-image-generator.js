/**
 * AI 图像生成器
 * 调用后端 API 使用配置的 AI 提供商生成图像
 */

class AIImageGenerator {
  constructor() {
    // 配置 API 地址：在本地开发时使用 localhost:3001，否则使用相对路径
    const apiBase = (globalThis.location.hostname === 'localhost' || globalThis.location.hostname === '127.0.0.1')
      ? 'http://localhost:3001'
      : '';
    this.apiUrl = apiBase + '/api/generate-image';
    this.generatedImage = null;
    this.isGenerating = false;
  }

  /**
   * 生成图像
   * @param {string} prompt - 图像描述文本
   * @param {Object} options - 选项
   * @param {string} options.style - 风格
   * @param {string} options.size - 尺寸 (如 "512x512")
   * @returns {Promise<{success: boolean, image?: string, error?: string}>}
   */
  async generate(prompt, options = {}) {
    if (!prompt || !prompt.trim()) {
      return { success: false, error: '请输入图像描述' };
    }

    if (this.isGenerating) {
      return { success: false, error: '正在生成中，请稍候...' };
    }

    this.isGenerating = true;

    try {
      const payload = {
        prompt: prompt.trim(),
        style: options.style || '',
        size: options.size || '512x512'
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // 首先尝试解析为JSON
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (e) {
          console.error('JSON解析失败:', e);
          return {
            success: false,
            error: `服务器返回无效的JSON (${response.status})`
          };
        }
      } else {
        // 如果不是JSON，说明服务器返回了错误页面（如HTML）
        const text = await response.text();
        console.error('服务器返回非JSON响应:', text.substring(0, 200));
        return {
          success: false,
          error: `服务器错误: ${response.status} ${response.statusText}`
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `生成失败 (${response.status})`
        };
      }

      if (data.success && data.image) {
        this.generatedImage = data.image;
        console.log('[AIImageGenerator] Image generated successfully');
        console.log('[AIImageGenerator] Image data type:', typeof data.image);
        console.log('[AIImageGenerator] Image data length:', data.image?.length || 'N/A');
        console.log('[AIImageGenerator] Image data preview:', data.image?.substring(0, 100) || 'N/A');
        return {
          success: true,
          image: data.image
        };
      } else {
        return {
          success: false,
          error: data.error || '未知错误'
        };
      }
    } catch (err) {
      console.error('AI image generation error:', err);
      return {
        success: false,
        error: `网络错误: ${err.message}`
      };
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * 获取生成的图像
   * @returns {string|null}
   */
  getGeneratedImage() {
    return this.generatedImage;
  }

  /**
   * 清空生成的图像
   */
  clear() {
    this.generatedImage = null;
  }
}

// 全局实例
if (typeof globalThis !== 'undefined') {
  globalThis.aiImageGenerator = new AIImageGenerator();
}

// Node.js 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIImageGenerator;
}
