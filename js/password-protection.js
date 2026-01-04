/**
 * 密码保护文章功能
 * 使用SHA-256哈希验证密码，并将解锁状态存储在localStorage中
 */

(function() {
    'use strict';

    // 使用Web Crypto API进行SHA-256哈希
    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    // 获取localStorage中的解锁文章列表
    function getUnlockedArticles() {
        try {
            const stored = localStorage.getItem('unlocked_articles');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('读取解锁文章列表失败:', e);
            return [];
        }
    }

    // 保存解锁文章到localStorage
    function saveUnlockedArticle(url, hash) {
        try {
            const unlocked = getUnlockedArticles();
            if (!unlocked.includes(url)) {
                unlocked.push(url);
                localStorage.setItem('unlocked_articles', JSON.stringify(unlocked));
                // 同时保存对应的哈希值，用于验证
                const hashKey = 'article_hash_' + btoa(url).replace(/[+/=]/g, '');
                localStorage.setItem(hashKey, hash);
            }
        } catch (e) {
            console.error('保存解锁文章失败:', e);
        }
    }

    // 检查文章是否已解锁
    function isArticleUnlocked(url, expectedHash) {
        try {
            const unlocked = getUnlockedArticles();
            if (!unlocked.includes(url)) {
                return false;
            }
            // 验证哈希值是否匹配（防止文章密码更改后仍能访问）
            const hashKey = 'article_hash_' + btoa(url).replace(/[+/=]/g, '');
            const storedHash = localStorage.getItem(hashKey);
            return storedHash === expectedHash;
        } catch (e) {
            console.error('检查解锁状态失败:', e);
            return false;
        }
    }

    // 解锁文章
    function unlockArticle(containerElement) {
        const container = containerElement || document.querySelector('[data-password-protected="true"]');
        if (!container) {
            console.error('解锁失败: 未找到密码保护容器');
            return;
        }

        const passwordContainer = container.querySelector('#password-protection-container');
        const articleBody = container.querySelector('#article-body-content');
        const articleUrl = container.getAttribute('data-article-url');

        console.log('解锁文章:', articleUrl);
        console.log('密码容器:', passwordContainer);
        console.log('文章内容容器:', articleBody);

        if (passwordContainer) {
            passwordContainer.style.display = 'none';
            console.log('已隐藏密码输入界面');
        } else {
            console.warn('未找到密码输入容器');
        }

        if (articleBody) {
            articleBody.style.display = 'block';
            articleBody.style.visibility = 'visible';
            articleBody.classList.add('unlocked');
            // 确保内容可见
            const computedStyle = window.getComputedStyle(articleBody);
            console.log('文章内容显示状态:', {
                display: computedStyle.display,
                visibility: computedStyle.visibility,
                opacity: computedStyle.opacity,
                hasContent: articleBody.innerHTML.length > 0
            });
            
            // 检查内容是否真的存在
            if (articleBody.innerHTML.trim().length === 0) {
                console.warn('警告: 文章内容容器为空！');
            } else {
                console.log('文章内容长度:', articleBody.innerHTML.length, '字符');
            }
        } else {
            console.error('未找到文章内容容器 #article-body-content');
            // 尝试查找其他可能的内容容器
            const altContent = container.querySelector('.article-body');
            if (altContent) {
                console.log('找到备用内容容器:', altContent);
                altContent.style.display = 'block';
                altContent.style.visibility = 'visible';
            }
        }

        // 触发内容初始化（用于代码高亮、Mermaid等）
        if (typeof initToc === 'function') {
            setTimeout(initToc, 100);
        }
        
        // 触发代码块初始化
        const event = new CustomEvent('articleUnlocked', { detail: { url: articleUrl } });
        document.dispatchEvent(event);
    }

    // 验证密码
    async function verifyPassword(password, expectedHash) {
        const hash = await sha256(password);
        return hash.toLowerCase() === expectedHash.toLowerCase();
    }

    // 初始化密码保护功能
    function initPasswordProtection(containerElement) {
        // 如果指定了容器元素，使用它；否则查找第一个受保护的容器
        const container = containerElement || document.querySelector('[data-password-protected="true"]');
        if (!container) return false;

        // 检查是否已经初始化过（避免重复绑定事件）
        if (container.hasAttribute('data-password-init')) {
            return true;
        }
        container.setAttribute('data-password-init', 'true');

        const passwordHash = container.getAttribute('data-password-hash');
        const articleUrl = container.getAttribute('data-article-url');
        const passwordInput = container.querySelector('#article-password-input');
        const submitBtn = container.querySelector('#password-submit-btn');
        const errorMessage = container.querySelector('#password-error-message');

        if (!passwordHash || !articleUrl) {
            console.error('密码保护配置错误: 缺少passwordHash或articleUrl');
            return false;
        }

        // 检查是否已解锁
        if (isArticleUnlocked(articleUrl, passwordHash)) {
            console.log('文章已解锁，直接显示内容');
            unlockArticle(container);
            return true;
        } else {
            console.log('文章未解锁，显示密码输入界面');
        }

        // 显示错误信息
        function showError(message) {
            const currentErrorMessage = container.querySelector('#password-error-message');
            if (currentErrorMessage) {
                currentErrorMessage.textContent = message;
                currentErrorMessage.style.display = 'block';
                setTimeout(() => {
                    currentErrorMessage.style.display = 'none';
                }, 3000);
            }
        }

        // 处理密码输入
        function handleSubmit() {
            const currentPasswordInput = container.querySelector('#article-password-input');
            const currentSubmitBtn = container.querySelector('#password-submit-btn');
            
            if (!currentPasswordInput || !currentSubmitBtn) return;
            
            const password = currentPasswordInput.value.trim();
            if (!password) {
                showError('请输入密码');
                return;
            }

            // 禁用输入和按钮
            currentPasswordInput.disabled = true;
            currentSubmitBtn.disabled = true;
            currentSubmitBtn.textContent = '验证中...';

            verifyPassword(password, passwordHash).then(isValid => {
                if (isValid) {
                    console.log('密码验证成功，解锁文章');
                    // 密码正确，解锁文章
                    saveUnlockedArticle(articleUrl, passwordHash);
                    unlockArticle(container);
                } else {
                    console.log('密码验证失败');
                    // 密码错误
                    showError('密码错误，请重试');
                    currentPasswordInput.value = '';
                    currentPasswordInput.focus();
                }
            }).catch(err => {
                console.error('密码验证失败:', err);
                showError('验证失败，请重试');
            }).finally(() => {
                // 恢复输入和按钮
                currentPasswordInput.disabled = false;
                currentSubmitBtn.disabled = false;
                currentSubmitBtn.textContent = '解锁';
            });
        }

        // 绑定事件（先移除旧的事件监听器，避免重复绑定）
        if (submitBtn) {
            // 克隆节点以移除所有事件监听器
            const newSubmitBtn = submitBtn.cloneNode(true);
            submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
            newSubmitBtn.addEventListener('click', handleSubmit);
        }

        if (passwordInput) {
            // 克隆节点以移除所有事件监听器
            const newPasswordInput = passwordInput.cloneNode(true);
            passwordInput.parentNode.replaceChild(newPasswordInput, passwordInput);
            
            newPasswordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    handleSubmit();
                }
            });

            // 聚焦输入框
            setTimeout(() => {
                newPasswordInput.focus();
            }, 100);
        }

        return true;
    }

    // 暴露为全局函数，供AJAX加载后调用
    window.initPasswordProtection = initPasswordProtection;

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initPasswordProtection();
        });
    } else {
        initPasswordProtection();
    }

    // 监听文章解锁事件，重新初始化代码块等功能
    document.addEventListener('articleUnlocked', function() {
        // 重新初始化代码高亮
        if (window.hljs) {
            const codeBlocks = document.querySelectorAll('pre code:not(.hljs)');
            codeBlocks.forEach(block => {
                window.hljs.highlightElement(block);
            });
        }

        // 重新初始化Mermaid图表
        if (window.mermaid) {
            const mermaidElements = document.querySelectorAll('.mermaid');
            mermaidElements.forEach(el => {
                if (!el.querySelector('svg')) {
                    el.removeAttribute('data-processed');
                }
            });
            try {
                window.mermaid.init(undefined, mermaidElements);
            } catch (e) {
                console.error('Mermaid初始化失败:', e);
            }
        }

        // 重新初始化折叠元素
        if (typeof initCollapseElements === 'function') {
            initCollapseElements();
        }

        // 重新初始化标签面板
        if (typeof initTabPanels === 'function') {
            initTabPanels();
        }

        // 重新初始化代码块
        if (typeof initCodeBlocks === 'function') {
            initCodeBlocks();
        }
    });
})();

