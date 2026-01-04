/**
 * Explorer UI Module
 * 负责资源管理器的UI渲染和样式管理
 */

export const ExplorerUI = (() => {
    // DOM 选择器
    const selectors = {
        window: '#explorer-window',
        container: '.files-container',
        addressBar: '.explorer-address-bar',
        viewGrid: '.grid-view-btn',
        viewList: '.list-view-btn',
        toolbar: '.explorer-toolbar'
    };

    /**
     * 清空内容区域
     */
    function clearContent() {
        const container = document.querySelector(selectors.container);
        if (container) {
            container.innerHTML = '';
        }
    }

    /**
     * 渲染文件列表
     * @param {Array} items - 文件/文件夹项数组
     * @param {String} viewMode - 'grid' 或 'list'
     */
    function renderFiles(items, viewMode = 'grid') {
        const container = document.querySelector(selectors.container);
        if (!container) {
            console.warn('[ExplorerUI] Container not found');
            return;
        }

        clearContent();
        container.className = `files-container ${viewMode === 'list' ? 'list-view' : 'grid-view'}`;

        if (!items || items.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty-folder-message';
            emptyDiv.textContent = '此文件夹为空。';
            container.appendChild(emptyDiv);
            return;
        }

        items.forEach((item, index) => {
            const fileItem = _createFileItem(item, viewMode, index);
            container.appendChild(fileItem);
        });
    }

    /**
     * 创建单个文件/文件夹元素
     */
    function _createFileItem(item, viewMode, index) {
        const el = document.createElement('div');
        el.className = 'file-item';
        el.dataset.itemData = JSON.stringify({
            name: item.name,
            isDir: item.isDir,
            url: item.url,
            filename: item.filename,
            path: item.path,
            section: item.section
        });
        el.dataset.index = index;
        el.dataset.itemName = item.name;

        if (viewMode === 'list') {
            el.classList.add('list-mode');
        }

        // 创建图标
        const iconDiv = document.createElement('div');
        iconDiv.className = 'file-icon';
        iconDiv.textContent = item.isDir ? '📁' : _getFileIcon(item);

        // 创建名称
        const nameDiv = document.createElement('div');
        nameDiv.className = 'file-name';
        nameDiv.textContent = item.name;

        el.appendChild(iconDiv);
        el.appendChild(nameDiv);

        // 添加悬停效果
        el.addEventListener('mouseenter', () => {
            el.classList.add('file-item-hover');
        });
        el.addEventListener('mouseleave', () => {
            el.classList.remove('file-item-hover');
        });

        return el;
    }

    /**
     * 获取文件图标
     */
    function _getFileIcon(item) {
        if (item.filename?.endsWith('.md')) return '📝';
        const p = (item.path || '').toLowerCase();
        if (p.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i)) return '🖼️';
        if (p.match(/\.(mp3|wav|ogg|flac|m4a)$/i)) return '🎵';
        if (p.match(/\.(mp4|webm|avi|mov|mkv)$/i)) return '🎬';
        return '📄';
    }

    /**
     * 更新地址栏
     */
    function updateAddressBar(path) {
        const addressBar = document.querySelector(selectors.addressBar);
        if (addressBar) {
            addressBar.textContent = '地址: ' + (path || '计算机');
        }
    }

    /**
     * 更新视图切换按钮的激活状态
     */
    function updateViewToggles(viewMode) {
        const gridBtn = document.querySelector(selectors.viewGrid);
        const listBtn = document.querySelector(selectors.viewList);

        if (!gridBtn || !listBtn) return;

        if (viewMode === 'grid') {
            gridBtn.classList.add('active');
            listBtn.classList.remove('active');
        } else {
            gridBtn.classList.remove('active');
            listBtn.classList.add('active');
        }
    }

    /**
     * 显示加载状态
     */
    function showLoading() {
        clearContent();
        const container = document.querySelector(selectors.container);
        if (container) {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading-message';
            loadingDiv.textContent = '加载中...';
            container.appendChild(loadingDiv);
        }
    }

    /**
     * 显示错误信息
     */
    function showError(message) {
        clearContent();
        const container = document.querySelector(selectors.container);
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = message || '加载出错';
            container.appendChild(errorDiv);
        }
    }

    /**
     * 获取工具栏按钮元素
     */
    function getToolbarButton(action) {
        const buttons = {
            back: '.toolbar-back',
            up: '.toolbar-up',
            refresh: '.toolbar-refresh'
        };
        return document.querySelector(buttons[action]);
    }

    return {
        clearContent,
        renderFiles,
        updateAddressBar,
        updateViewToggles,
        showLoading,
        showError,
        getToolbarButton,
        getSelectors: () => ({ ...selectors })
    };
})();
