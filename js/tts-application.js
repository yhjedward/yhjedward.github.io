/**
 * TTS 文本转语音窗口应用
 * 与画板、TODO 类似的可拖动、可最小化的窗口应用
 */

class TTSApplication {
  constructor() {
    this.ttsWindow = document.getElementById('tts-window');
    this.ttsMinimize = document.querySelector('.tts-minimize');
    this.ttsMaximize = document.querySelector('.tts-maximize');
    this.ttsClose = document.querySelector('.tts-close');
    
    this.textInput = document.getElementById('tts-text-input');
    this.languageSelect = document.getElementById('tts-language');
    this.voiceSelect = document.getElementById('tts-voice');
    this.generateBtn = document.getElementById('tts-generate-btn');
    this.playBtn = document.getElementById('tts-play-btn');
    this.downloadBtn = document.getElementById('tts-download-btn');
    this.stopBtn = document.getElementById('tts-stop-btn');
    this.clearBtn = document.getElementById('tts-clear-btn');
    this.statusText = document.getElementById('tts-status');
    this.historyList = document.getElementById('tts-history');
    
    this.currentAudio = null;
    this.isGenerating = false;
    this.isMaximized = false;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };

    // 自动检测API基础URL
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      this.apiBase = 'http://localhost:3001/api/tts';
    } else {
      this.apiBase = '/api/tts';
    }
    
    this.init();
  }
  
  init() {
    this.loadState();
    this.setupEventListeners();
    this.loadVoices();
    this.loadHistory();
  }
  
  setupEventListeners() {
    // 窗口控制按钮
    this.ttsMinimize?.addEventListener('click', () => this.minimize());
    this.ttsMaximize?.addEventListener('click', () => this.maximize());
    this.ttsClose?.addEventListener('click', () => this.close());
    
    // 功能按钮
    this.generateBtn?.addEventListener('click', () => this.generate());
    this.playBtn?.addEventListener('click', () => this.play());
    this.downloadBtn?.addEventListener('click', () => this.download());
    this.stopBtn?.addEventListener('click', () => this.stop());
    this.clearBtn?.addEventListener('click', () => this.clearText());
    
    // 文本框 Enter 键快捷生成
    this.textInput?.addEventListener('keypress', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        this.generate();
      }
    });
    
    // 语言切换
    this.languageSelect?.addEventListener('change', () => {
      this.saveState();
      this.loadVoices();
    });
    
    // 声音切换
    this.voiceSelect?.addEventListener('change', () => {
      this.saveState();
    });
    
    // 窗口拖动
    this.setupDragListeners();
    
    // 任务栏按钮
    this.setupTaskbarListener();
  }
  
  setupDragListeners() {
    const titlebar = this.ttsWindow?.querySelector('.window-titlebar');
    if (!titlebar) return;
    
    titlebar.addEventListener('mousedown', (e) => {
      if (e.target.closest('.window-controls')) return;
      
      this.isDragging = true;
      const rect = this.ttsWindow.getBoundingClientRect();
      this.dragOffset.x = e.clientX - rect.left;
      this.dragOffset.y = e.clientY - rect.top;
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging || !this.ttsWindow) return;
      
      this.ttsWindow.style.left = (e.clientX - this.dragOffset.x) + 'px';
      this.ttsWindow.style.top = (e.clientY - this.dragOffset.y) + 'px';
    });
    
    document.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
  }
  
  setupTaskbarListener() {
    const taskbarBtn = document.querySelector('[data-taskbar-action="tts"]');
    if (taskbarBtn) {
      taskbarBtn.addEventListener('click', () => {
        if (this.ttsWindow?.style.display === 'none') {
          this.ttsWindow.style.display = 'block';
        } else {
          this.minimize();
        }
      });
    }
  }
  
  async loadVoices() {
    try {
      const language = this.languageSelect?.value || 'zh-CN';
      console.log(`[TTS] Loading voices for language: ${language}`);
      
      const response = await fetch(`${this.apiBase}/voices?lang=${language}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[TTS] Voices loaded:', data.voices?.length || 0, 'voices');
      
      // 先用之前保存的 voice 值
      const savedVoice = this.voiceSelect?.value || '';
      
      // 清空并重新填充声音列表
      this.voiceSelect.innerHTML = '<option value="">默认声音</option>';
      data.voices?.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = voice.label;
        
        // 如果是之前保存的声音，选中它
        if (voice.name === savedVoice) {
          option.selected = true;
        }
        
        this.voiceSelect.appendChild(option);
      });
      
      console.log('[TTS] Voice list populated');
    } catch (err) {
      console.error('[TTS] Failed to load voices:', err);
    }
  }
  
  async loadState() {
    try {
      console.log('[TTS] Starting to load state from', `${this.apiBase}/state`);
      this.updateStatus('正在加载配置...', 'info');
      
      const response = await fetch(`${this.apiBase}/state`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const state = await response.json();
      console.log('[TTS] State loaded successfully:', state);
      
      if (this.languageSelect) {
        this.languageSelect.value = state.language || 'zh-CN';
        console.log('[TTS] Language set to:', this.languageSelect.value);
      }
      if (this.voiceSelect) {
        this.voiceSelect.value = state.voice || '';
        console.log('[TTS] Voice set to:', this.voiceSelect.value);
      }
      
      this.updateStatus('配置加载完成', 'success');
      
      // 延迟恢复，确保 UI 完全加载
      setTimeout(() => {
        this.updateStatus('就绪', 'info');
      }, 1000);
    } catch (err) {
      console.error('[TTS] Failed to load TTS state:', err);
      this.updateStatus('配置加载失败', 'error');
      
      // 使用默认值
      if (this.languageSelect) this.languageSelect.value = 'zh-CN';
      if (this.voiceSelect) this.voiceSelect.value = '';
      
      // 5秒后恢复状态
      setTimeout(() => {
        this.updateStatus('就绪', 'info');
      }, 5000);
    }
  }
  
  async saveState() {
    try {
      const state = {
        language: this.languageSelect?.value || 'zh-CN',
        voice: this.voiceSelect?.value || null
      };
      
      console.log('[TTS] Saving state:', state);
      
      const response = await fetch(`${this.apiBase}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('[TTS] State saved successfully:', result);
    } catch (err) {
      console.error('[TTS] Failed to save TTS state:', err);
    }
  }
  
  async generate() {
    let text = this.textInput?.value.trim();

    // 规范化文本：将换行符和多余空格替换为单个空格
    text = text.replace(/\r\n|\n|\r/g, ' ').replace(/\s+/g, ' ').trim();

    if (!text) {
      this.updateStatus('请输入文本', 'error');
      return;
    }

    if (this.isGenerating) {
      this.updateStatus('正在生成中...', 'warning');
      return;
    }

    this.isGenerating = true;
    this.generateBtn.disabled = true;
    this.updateStatus('正在生成音频...', 'info');

    try {
      const language = this.languageSelect?.value || 'zh-CN';
      const voice = this.voiceSelect?.value || undefined;

      const response = await fetch(`${this.apiBase}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language, voice })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      this.currentAudio = new Audio(URL.createObjectURL(blob));

      // 获取缓存ID - 生成格式: tts_${timestamp}
      let cacheId = response.headers.get('X-Cache-ID');
      console.log('[TTS] Received X-Cache-ID:', cacheId);

      // 如果无法从头部获取，生成一个本地ID
      if (!cacheId) {
        cacheId = `tts_${Date.now()}`;
        console.warn('[TTS] X-Cache-ID header not available, using generated ID:', cacheId);
      }

      this.updateStatus('生成成功', 'success');
      this.addToHistory(text, language, voice, cacheId);

      // 自动播放
      this.play();
    } catch (err) {
      console.error('TTS generation error:', err);
      this.updateStatus(`错误: ${err.message}`, 'error');
    } finally {
      this.isGenerating = false;
      this.generateBtn.disabled = false;
    }
  }
  
  play() {
    if (!this.currentAudio) {
      this.updateStatus('请先生成音频', 'warning');
      return;
    }
    
    this.currentAudio.play().catch(err => {
      console.error('Playback error:', err);
      this.updateStatus('播放失败', 'error');
    });
  }
  
  stop() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.updateStatus('已停止', 'info');
    }
  }
  
  download() {
    if (!this.currentAudio) {
      this.updateStatus('请先生成音频', 'warning');
      return;
    }
    
    const link = document.createElement('a');
    link.href = this.currentAudio.src;
    link.download = `tts_${Date.now()}.mp3`;
    link.click();
  }
  
  clearText() {
    if (this.textInput) {
      this.textInput.value = '';
      this.textInput.focus();
    }
  }
  
  addToHistory(text, language, voice, cacheId) {
    if (!this.historyList) return;

    // 规范化文本
    const normalizedText = text.replace(/\r\n|\n|\r/g, ' ').replace(/\s+/g, ' ').trim();

    const item = document.createElement('div');
    item.className = 'tts-history-item';
    item.dataset.text = normalizedText;
    item.dataset.language = language || 'zh-CN';
    item.dataset.voice = voice || '';
    item.dataset.cacheId = cacheId || '';
    item.innerHTML = `
      <span class="history-text">${normalizedText.substring(0, 50)}${normalizedText.length > 50 ? '...' : ''}</span>
      <span class="history-lang">${language || 'zh-CN'}</span>
      <button class="history-delete" title="删除">✕</button>
    `;

    // 点击文本部分播放音频
    item.querySelector('.history-text')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.playFromHistory(normalizedText, language, voice, cacheId);
    });

    // 删除按钮
    item.querySelector('.history-delete')?.addEventListener('click', async (e) => {
      e.stopPropagation();

      // 调用后端删除历史记录及缓存
      try {
        await fetch(`${this.apiBase}/history/${cacheId}`, {
          method: 'DELETE'
        });
        item.remove();
      } catch (err) {
        console.error('Failed to delete history:', err);
        this.updateStatus('删除失败', 'error');
      }
    });

    // 整个项目作为副按钮也可以播放
    item.addEventListener('click', async (e) => {
      if (!e.target.closest('.history-delete')) {
        await this.playFromHistory(normalizedText, language, voice, cacheId);
      }
    });

    this.historyList.insertBefore(item, this.historyList.firstChild);

    // 保持历史记录数量
    while (this.historyList.children.length > 10) {
      const lastChild = this.historyList.lastChild;
      this.historyList.removeChild(lastChild);
    }

    // 保存到后端
    this.saveHistoryItem(normalizedText, language, voice, cacheId);
  }
  
  generateCacheKey(text, lang, voice) {
    const crypto = typeof require !== 'undefined' ? require('node:crypto') : null;
    if (crypto) {
      const voiceStr = voice || 'default';
      const key = `${text}_${lang}_${voiceStr}`;
      return crypto.createHash('md5').update(key).digest('hex');
    } else {
      // 浏览器环境使用简单的哈希模拟
      let h = 0;
      const str = `${text}_${lang}_${voice || 'default'}`;
      for (let i = 0; i < str.length; i++) {
        h = Math.imul(31, h) + str.charCodeAt(i) | 0;
      }
      return Math.abs(h).toString(16);
    }
  }
  
  async saveHistoryItem(text, language, voice, cacheKey) {
    try {
      await fetch(`${this.apiBase}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language,
          voice,
          cacheKey
        })
      });
    } catch (err) {
      console.error('Failed to save history:', err);
    }
  }
  
  async loadHistory() {
    try {
      console.log('[TTS] Loading history...');
      this.updateStatus('正在加载历史记录...', 'info');

      const response = await fetch(`${this.apiBase}/state`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const state = await response.json();
      console.log('[TTS] Full state loaded:', state);

      if (!this.historyList || !Array.isArray(state.history)) {
        console.log('[TTS] No history data or historyList not found');
        this.updateStatus('就绪', 'info');
        return;
      }

      console.log(`[TTS] Found ${state.history.length} history items`);

      // 清空现有历史记录
      this.historyList.innerHTML = '';

      if (state.history.length === 0) {
        console.log('[TTS] History is empty');
        this.updateStatus('历史记录为空', 'info');
        setTimeout(() => {
          this.updateStatus('就绪', 'info');
        }, 2000);
        return;
      }

      // 加载历史记录
      for (const item of state.history) {
        const historyItem = document.createElement('div');
        historyItem.className = 'tts-history-item';
        historyItem.dataset.text = item.text;
        historyItem.dataset.language = item.language;
        historyItem.dataset.voice = item.voice || '';
        historyItem.dataset.cacheId = item.id || '';
        historyItem.innerHTML = `
          <span class="history-text">${item.text.substring(0, 50)}${item.text.length > 50 ? '...' : ''}</span>
          <span class="history-lang">${item.language}</span>
          <button class="history-delete" title="删除">✕</button>
        `;

        // 添加事件监听
        historyItem.querySelector('.history-text')?.addEventListener('click', async (e) => {
          e.stopPropagation();
          await this.playFromHistory(item.text, item.language, item.voice, item.id);
        });

        historyItem.querySelector('.history-delete')?.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            await fetch(`${this.apiBase}/history/${item.id}`, {
              method: 'DELETE'
            });
            historyItem.remove();
            this.updateStatus('已删除', 'success');
          } catch (err) {
            console.error('Failed to delete history:', err);
            this.updateStatus('删除失败', 'error');
          }
        });

        historyItem.addEventListener('click', async (e) => {
          if (!e.target.closest('.history-delete')) {
            await this.playFromHistory(item.text, item.language, item.voice, item.id);
          }
        });

        this.historyList.appendChild(historyItem);
      }

      console.log('[TTS] History loaded successfully');
      this.updateStatus(`已加载 ${state.history.length} 条历史记录`, 'success');

      setTimeout(() => {
        this.updateStatus('就绪', 'info');
      }, 2000);
    } catch (err) {
      console.error('[TTS] Failed to load history:', err);
      this.updateStatus('历史记录加载失败', 'error');

      setTimeout(() => {
        this.updateStatus('就绪', 'info');
      }, 5000);
    }
  }
  
  async playFromHistory(text, language, voice, cacheId) {
    if (!text) return;

    console.log('[TTS] playFromHistory called with cacheId:', cacheId);

    // 如果有缓存ID，直接从缓存读取，不重新生成
    if (cacheId) {
      this.updateStatus('正在加载缓存音频...', 'info');

      try {
        console.log('[TTS] Fetching from cache endpoint:', `${this.apiBase}/history/${cacheId}/audio`);
        const response = await fetch(`${this.apiBase}/history/${cacheId}/audio`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        this.currentAudio = new Audio(URL.createObjectURL(blob));
        this.updateStatus('准备播放', 'success');
        this.play();
        console.log('[TTS] Playing from cache:', cacheId);
      } catch (err) {
        console.error('[TTS] Play from cache error:', err);
        this.updateStatus(`缓存加载失败: ${err.message}，重新生成中...`, 'warning');

        // 备选方案：缓存不存在时，重新生成
        await this.regenerateFromHistory(text, language, voice, cacheId);
      }
    } else {
      // 如果没有缓存ID，则重新生成（兼容旧版本）
      console.warn('[TTS] No cacheId provided, regenerating audio');
      await this.regenerateFromHistory(text, language, voice, cacheId);
    }
  }

  async regenerateFromHistory(text, language, voice, oldCacheId) {
    this.updateStatus('正在生成音频...', 'info');

    try {
      const response = await fetch(`${this.apiBase}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language, voice: voice || undefined })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      this.currentAudio = new Audio(URL.createObjectURL(blob));

      // 获取新的缓存ID
      let newCacheId = response.headers.get('X-Cache-ID');
      if (!newCacheId) {
        newCacheId = `tts_${Date.now()}`;
      }

      console.log('[TTS] Regenerated audio with cacheId:', newCacheId);
      this.updateStatus('准备播放', 'success');
      this.play();
    } catch (err) {
      console.error('[TTS] Play from history error:', err);
      this.updateStatus(`加载失败: ${err.message}`, 'error');
    }
  }
  
  updateStatus(message, type = 'info') {
    if (!this.statusText) return;
    this.statusText.textContent = message;
    this.statusText.className = `tts-status status-${type}`;
  }
  
  minimize() {
    if (this.ttsWindow) {
      this.ttsWindow.style.display = 'none';
      // 在任务栏中显示指示
      const taskbarBtn = document.querySelector('[data-taskbar-action="tts"]');
      if (taskbarBtn) taskbarBtn.classList.add('active');
    }
  }
  
  maximize() {
    if (!this.ttsWindow) return;
    
    this.isMaximized = !this.isMaximized;
    
    if (this.isMaximized) {
      this.ttsWindow.style.width = '90vw';
      this.ttsWindow.style.height = '90vh';
      this.ttsWindow.style.left = '5vw';
      this.ttsWindow.style.top = '5vh';
    } else {
      this.ttsWindow.style.width = '500px';
      this.ttsWindow.style.height = '600px';
      this.ttsWindow.style.left = '200px';
      this.ttsWindow.style.top = '120px';
    }
  }
  
  close() {
    this.minimize();
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  globalThis.ttsApp = new TTSApplication();
  
  // 为开始菜单提供全局访问
  globalThis.startOpenTTS = () => {
    const ttsWindow = document.getElementById('tts-window');
    if (ttsWindow) {
      ttsWindow.style.display = 'block';
      const taskbarBtn = document.querySelector('[data-taskbar-action="tts"]');
      if (taskbarBtn) {
        taskbarBtn.classList.remove('active');
      }
    }
  };
});
