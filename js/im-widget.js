/**
 * IM 小部件 - 即时消息功能
 */

class IMWidget {
    constructor() {
        this.button = document.getElementById('im-button');
        this.chatWindow = document.getElementById('im-chat-window');
        this.closeBtn = document.getElementById('im-close-btn');
        this.inputField = document.getElementById('im-input-field');
        this.sendBtn = document.getElementById('im-send-btn');
        this.messagesContainer = document.getElementById('im-messages');
        this.avatar = document.getElementById('im-avatar');
        this.displayName = document.getElementById('im-display-name');

        // 设置 API 基础 URL
        this.apiBaseUrl = this.getApiBaseUrl();

        this.isOpen = false;
        this.messages = [];
        this.unreadCount = 0;

        this.init();
    }

    /**
     * 获取 API 基础 URL
     * 支持开发环境 (localhost:3001) 和生产环境
     */
    getApiBaseUrl() {
        // 如果当前页面来自 Hugo 开发服务器（localhost:1313）
        // 则 API 应该指向 Express 服务器（localhost:3001）
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // 开发环境：尝试连接到 Express 服务器
            return 'http://localhost:3001/api';
        }
        // 生产环境：API 与网站同源
        return '/api';
    }

    /**
     * 初始化小部件
     */
    init() {
        // 加载配置
        this.loadConfig();

        // 绑定事件
        this.bindEvents();

        // 显示欢迎消息
        this.addBotMessage('Hi👋 ！有什么可以帮助您吗？留言请带上您的接收邮箱');

        // 从localStorage加载消息历史
        this.loadMessageHistory();

        console.log('[IM] Widget initialized, API URL:', this.apiBaseUrl);
    }

    /**
     * 加载配置
     */
    loadConfig() {
        fetch(`${this.apiBaseUrl}/im/config`)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(config => {
                if (config.displayName) {
                    this.displayName.textContent = config.displayName;
                }
                if (config.avatarUrl) {
                    this.avatar.style.backgroundImage = `url(${config.avatarUrl})`;
                }
                console.log('[IM] Config loaded successfully');
            })
            .catch(err => {
                console.warn('[IM] Failed to load config:', err);
                console.log('[IM] Using default configuration');
            });
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 打开/关闭窗口
        this.button.addEventListener('click', () => this.toggle());
        this.closeBtn.addEventListener('click', () => this.close());

        // 发送消息
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 自动调整输入框高度
        this.inputField.addEventListener('input', () => this.autoResizeTextarea());
    }

    /**
     * 切换窗口打开/关闭
     */
    toggle() {
        this.isOpen ? this.close() : this.open();
    }

    /**
     * 打开聊天窗口
     */
    open() {
        this.isOpen = true;
        this.chatWindow.classList.remove('hidden');
        this.inputField.focus();
        this.clearUnreadCount();
        console.log('[IM] Chat window opened');
    }

    /**
     * 关闭聊天窗口
     */
    close() {
        this.isOpen = false;
        this.chatWindow.classList.add('hidden');
        console.log('[IM] Chat window closed');
    }

    /**
     * 发送消息
     */
    sendMessage() {
        const text = this.inputField.value.trim();
        if (!text) return;

        // 显示用户消息
        this.addUserMessage(text);

        // 清空输入框
        this.inputField.value = '';
        this.autoResizeTextarea();

        // 发送到后端
        this.sendToServer(text);
    }

    /**
     * 发送消息到服务器
     */
    sendToServer(message) {
        fetch(`${this.apiBaseUrl}/im/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            })
        })
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                if (data.success) {
                    console.log('[IM] Message sent successfully');
                    // 显示确认消息
                    this.addBotMessage('您的消息已发送，我们会尽快回复您！');
                } else {
                    this.addBotMessage('消息发送失败，请重试');
                }
            })
            .catch(err => {
                console.error('[IM] Failed to send message:', err);
                this.addBotMessage('网络错误，请检查连接后重试');
                console.error('[IM] Error details:', err.message);
                console.log('[IM] API URL used:', `${this.apiBaseUrl}/im/send`);
            });
    }

    /**
     * 添加用户消息
     */
    addUserMessage(text) {
        const message = {
            type: 'user',
            text: text,
            time: new Date()
        };
        this.messages.push(message);
        this.renderMessage(message);
        this.saveMessageHistory();
    }

    /**
     * 添加机器人消息
     */
    addBotMessage(text) {
        const message = {
            type: 'bot',
            text: text,
            time: new Date()
        };
        this.messages.push(message);
        this.renderMessage(message);

        if (!this.isOpen) {
            this.unreadCount++;
            this.updateUnreadBadge();
        }
    }

    /**
     * 渲染消息
     */
    renderMessage(message) {
        const div = document.createElement('div');
        div.className = `im-message ${message.type}`;

        const content = document.createElement('div');
        content.className = 'im-message-content';
        content.textContent = message.text;

        const time = document.createElement('div');
        time.className = 'im-message-time';
        time.textContent = this.formatTime(message.time);

        div.appendChild(content);
        div.appendChild(time);
        this.messagesContainer.appendChild(div);

        // 自动滚动到底部
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 0);
    }

    /**
     * 格式化时间
     */
    formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    /**
     * 自动调整 textarea 高度
     */
    autoResizeTextarea() {
        this.inputField.style.height = 'auto';
        const height = Math.min(this.inputField.scrollHeight, 80);
        this.inputField.style.height = height + 'px';
    }

    /**
     * 更新未读消息徽章
     */
    updateUnreadBadge() {
        let badge = document.querySelector('.im-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'im-badge';
            this.button.appendChild(badge);
        }
        badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
    }

    /**
     * 清除未读计数
     */
    clearUnreadCount() {
        this.unreadCount = 0;
        const badge = document.querySelector('.im-badge');
        if (badge) {
            badge.remove();
        }
    }

    /**
     * 保存消息历史到 localStorage
     */
    saveMessageHistory() {
        const history = this.messages.map(msg => ({
            type: msg.type,
            text: msg.text,
            time: msg.time.toISOString()
        }));
        localStorage.setItem('im-messages', JSON.stringify(history));
    }

    /**
     * 从 localStorage 加载消息历史
     */
    loadMessageHistory() {
        const stored = localStorage.getItem('im-messages');
        if (stored) {
            try {
                const history = JSON.parse(stored);
                // 只加载最近的消息（防止过多历史）
                const recentMessages = history.slice(-20);
                this.messages = recentMessages.map(msg => ({
                    ...msg,
                    time: new Date(msg.time)
                }));
                this.messages.forEach(msg => this.renderMessage(msg));
            } catch (err) {
                console.error('[IM] Failed to load message history:', err);
            }
        }
    }
}

// 初始化小部件
document.addEventListener('DOMContentLoaded', () => {
    window.imWidget = new IMWidget();
});
