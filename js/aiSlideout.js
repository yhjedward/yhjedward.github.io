/**
 * AI Slideout Chat functionality
 * Handles the AI chat interface with OpenAI-style dialog
 */

(function() {
    'use strict';

    let isProcessing = false;
    let conversationHistory = []; // 跟踪对话历史

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAISlideout);
    } else {
        initAISlideout();
    }

    document.addEventListener('ai-slideout-reinit', function() {
        console.log('Re-initializing AI Slideout');
        initAISlideout();
    });

    function initAISlideout() {
        // API Base URL configuration (match existing patterns used by other modules)
        const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:3001'
            : '';

        const aiButton = document.getElementById('ai-button');
        const aiSlideout = document.getElementById('ai-slideout');
        const closeButton = document.getElementById('ai-slideout-close');
        const aiInput = document.getElementById('ai-input');
        const sendButton = document.getElementById('ai-send-button');
        const messagesContainer = document.getElementById('ai-messages-container');
        const statusEl = document.getElementById('ai-status');

        if (!aiButton || !aiSlideout || !closeButton || !aiInput || !sendButton) {
            console.warn('AI Slideout: Required elements not found');
            return;
        }

        if (aiButton.dataset.aiInitialized === 'true') {
            console.log('AI Slideout already initialized');
            return;
        }

        aiButton.dataset.aiInitialized = 'true';
        aiSlideout.dataset.aiInitialized = 'true';

        aiButton.addEventListener('click', function() {
            aiSlideout.classList.add('active');
            console.log('AI Slideout opened');
            setTimeout(() => aiInput.focus(), 400);
        });

        closeButton.addEventListener('click', function() {
            aiSlideout.classList.remove('active');
            console.log('AI Slideout closed');
        });

        document.addEventListener('click', function(event) {
            const isClickInsideSlideout = aiSlideout.contains(event.target);
            const isClickOnButton = aiButton.contains(event.target);

            if (!isClickInsideSlideout && !isClickOnButton && aiSlideout.classList.contains('active')) {
                aiSlideout.classList.remove('active');
                console.log('AI Slideout closed (outside click)');
            }
        });

        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && aiSlideout.classList.contains('active')) {
                aiSlideout.classList.remove('active');
                console.log('AI Slideout closed (Escape key)');
            }
        });

        autoResizeTextarea(aiInput);

        aiInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });

        sendButton.addEventListener('click', function() {
            sendMessage();
        });

        function autoResizeTextarea(textarea) {
            textarea.addEventListener('input', function() {
                this.style.height = 'auto';
                const newHeight = Math.min(this.scrollHeight, 150);
                this.style.height = newHeight + 'px';
            });
        }

        function sendMessage() {
            const message = aiInput.value.trim();
            
            if (!message || isProcessing) {
                return;
            }

            addUserMessage(message);
            aiInput.value = '';
            aiInput.style.height = 'auto';

            processAIMessage(message);
        }

        function addUserMessage(text) {
            const messageEl = document.createElement('div');
            messageEl.className = 'ai-message user';
            
            const textNode = document.createTextNode(text);
            messageEl.appendChild(textNode);
            
            const metaEl = document.createElement('div');
            metaEl.className = 'ai-message-meta';
            metaEl.textContent = formatTime(new Date());
            messageEl.appendChild(metaEl);
            
            messagesContainer.appendChild(messageEl);
            scrollToBottom();

            // 记录到对话历史
            conversationHistory.push({
                role: 'user',
                content: text,
                timestamp: new Date()
            });
        }

        function addAssistantMessage(text, isError = false) {
            const messageEl = document.createElement('div');
            messageEl.className = 'ai-message assistant' + (isError ? ' error' : '');
            
            const textNode = document.createTextNode(text);
            messageEl.appendChild(textNode);
            
            const metaEl = document.createElement('div');
            metaEl.className = 'ai-message-meta';
            metaEl.textContent = formatTime(new Date());
            messageEl.appendChild(metaEl);
            
            messagesContainer.appendChild(messageEl);
            scrollToBottom();

            // 记录到对话历史（如果不是错误消息）
            if (!isError) {
                conversationHistory.push({
                    role: 'assistant',
                    content: text,
                    timestamp: new Date()
                });
            }
        }

        function showLoading() {
            const loadingEl = document.createElement('div');
            loadingEl.className = 'ai-message assistant ai-loading-message';
            loadingEl.id = 'ai-loading-indicator';
            
            const loadingDots = document.createElement('div');
            loadingDots.className = 'ai-loading';
            loadingDots.innerHTML = '<span></span><span></span><span></span>';
            
            loadingEl.appendChild(loadingDots);
            messagesContainer.appendChild(loadingEl);
            scrollToBottom();
        }

        function hideLoading() {
            const loadingEl = document.getElementById('ai-loading-indicator');
            if (loadingEl) {
                loadingEl.remove();
            }
        }

        function setStatus(text) {
            if (!statusEl) return;
            statusEl.textContent = text || '';
        }

        function clearStatus() {
            setStatus('');
        }

        // 检测是否是"继续"请求（包含继续、继续生成、继续写、接着等关键词）
        function isContinueRequest(message) {
            const continueKeywords = ['继续', '继续生成', '继续写', '接着', '接着写', '再写', '再生成', '继续补充', '补充', '继续完成'];
            const lowerMessage = message.toLowerCase();
            return continueKeywords.some(keyword => message.includes(keyword) || lowerMessage.includes(keyword.toLowerCase()));
        }

        // 构建对话上下文（最近的几条消息）
        function buildConversationContext() {
            if (conversationHistory.length === 0) {
                return '';
            }

            // 获取最近的对话（最多5条，包括上一个AI回复）
            const recentHistory = conversationHistory.slice(-5);
            let contextText = '之前的对话内容：\n';

            recentHistory.forEach((msg, index) => {
                const prefix = msg.role === 'user' ? '用户问: ' : 'AI答: ';
                contextText += `${prefix}${msg.content}\n`;
            });

            return contextText;
        }

        // 获取最后一条AI回复作为上下文
        function getLastAssistantMessage() {
            const assistantMessages = conversationHistory.filter(msg => msg.role === 'assistant');
            return assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1].content : '';
        }

        function clearStatus() {
            setStatus('');
        }

        async function processAIMessage(userMessage) {
            if (isProcessing) {
                return;
            }

            isProcessing = true;
            sendButton.disabled = true;
            aiInput.disabled = true;

            showLoading();
            setStatus('AI 正在生成...');

            try {
                // 检测是否是"继续"请求
                const isContinue = isContinueRequest(userMessage);
                let finalPrompt = userMessage;
                let articleContent = null;

                if (isContinue) {
                    // 如果是"继续"请求，构建包含之前对话的上下文
                    const conversationContext = buildConversationContext();
                    const lastAssistantMsg = getLastAssistantMessage();

                    if (lastAssistantMsg) {
                        // 添加上下文信息到提示词
                        finalPrompt = `${conversationContext}\n\n用户继续请求: ${userMessage}\n\n请基于之前的回复继续生成内容。`;
                    }
                } else if (userMessage.toLowerCase().includes('当前文章内容')) {
                    // 如果用户提到当前文章内容，获取文章作为上下文
                    articleContent = getArticleContent();
                }

                console.log('Sending AI request:', {
                    isContinue,
                    historyLength: conversationHistory.length,
                    prompt: finalPrompt.substring(0, 100) + '...'
                });

                const response = await fetch(`${API_BASE}/api/ai/generate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt: finalPrompt,
                        context: articleContent,
                        isContinue: isContinue,
                        conversationLength: conversationHistory.length
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || '请求失败');
                }

                const data = await response.json();
                hideLoading();
                
                if (data.content) {
                    addAssistantMessage(data.content);
                    setStatus('');
                } else {
                    throw new Error('AI 返回内容为空');
                }

            } catch (error) {
                console.error('AI request error:', error);
                hideLoading();
                addAssistantMessage('抱歉，处理您的请求时出现错误：' + error.message, true);
                setStatus('请求失败');
                setTimeout(clearStatus, 3000);
            } finally {
                isProcessing = false;
                sendButton.disabled = false;
                aiInput.disabled = false;
                aiInput.focus();
            }
        }

        function getArticleContent() {
            const articleBody = document.querySelector('.article-body');
            if (!articleBody) {
                return '';
            }

            const clonedContent = articleBody.cloneNode(true);
            
            const elementsToRemove = clonedContent.querySelectorAll(
                'script, style, .ai-slideout, .ai-button-container, .toc-container'
            );
            elementsToRemove.forEach(el => el.remove());

            let text = clonedContent.textContent || '';
            text = text.replace(/\s+/g, ' ').trim();
            
            if (text.length > 4000) {
                text = text.substring(0, 4000) + '...';
            }
            
            return text;
        }

        function scrollToBottom() {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        function formatTime(date) {
            const hours = date.getHours().toString().padStart(2, '0');
            const minutes = date.getMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        }

        console.log('AI Slideout initialized successfully');
    }

    window.AISlideout = {
        open: function() {
            const slideout = document.getElementById('ai-slideout');
            if (slideout) {
                slideout.classList.add('active');
                const aiInput = document.getElementById('ai-input');
                if (aiInput) {
                    setTimeout(() => aiInput.focus(), 400);
                }
            }
        },
        close: function() {
            const slideout = document.getElementById('ai-slideout');
            if (slideout) {
                slideout.classList.remove('active');
            }
        },
        toggle: function() {
            const slideout = document.getElementById('ai-slideout');
            if (slideout) {
                slideout.classList.toggle('active');
                if (slideout.classList.contains('active')) {
                    const aiInput = document.getElementById('ai-input');
                    if (aiInput) {
                        setTimeout(() => aiInput.focus(), 400);
                    }
                }
            }
        },
        // 清空对话历史
        clearHistory: function() {
            conversationHistory = [];
            const messagesContainer = document.getElementById('ai-messages-container');
            if (messagesContainer) {
                messagesContainer.innerHTML = '';
            }
            console.log('Conversation history cleared');
        },
        // 获取对话历史
        getHistory: function() {
            return conversationHistory;
        }
    };

})();
