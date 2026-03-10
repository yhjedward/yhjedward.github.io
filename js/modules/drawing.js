/**
 * Drawing Module
 * 画板：支持画笔/橡皮/文本、图层、撤销/重做、导出 PNG。
 */

export const Drawing = (() => {
    // API Base URL configuration
    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3001'
        : '';

    const selectors = {
        window: '#drawing-window',
        icon: '#drawing-board',
        canvas: '#drawing-canvas',
        canvasWrap: '#drawing-window .canvas-wrap',
        toolbar: '#drawing-window .drawing-toolbar',
        layersList: '#layers-list',
        layerAdd: '#layer-add',
        layerDelete: '#layer-delete',
        layerUp: '#layer-up',
        layerDown: '#layer-down',
        colorInput: '#drawing-window .color-input',
        sizeInput: '#drawing-window .size-input',
        textOverlay: '#text-overlay',
        textEditor: '#text-editor'
    };

    const state = {
        tool: 'pen',
        color: '#1f2937',
        size: 4,
        isDrawing: false,
        lastX: 0,
        lastY: 0,
        activeLayerId: null,
        layers: /** @type {Array<any>} */ ([]),
        persistTimer: null,
        lastRemoteTimestamp: 0
    };

    let win;
    let canvas;
    /** @type {CanvasRenderingContext2D | null} */
    let viewCtx;
    let wrap;
    let toolbar;
    let layersList;
    let colorInput;
    let sizeInput;
    let textOverlay;
    let textEditor;

    function init() {
        win = document.querySelector(selectors.window);
        canvas = document.querySelector(selectors.canvas);
        wrap = document.querySelector(selectors.canvasWrap);
        toolbar = document.querySelector(selectors.toolbar);
        layersList = document.querySelector(selectors.layersList);
        colorInput = document.querySelector(selectors.colorInput);
        sizeInput = document.querySelector(selectors.sizeInput);
        textOverlay = document.querySelector(selectors.textOverlay);
        textEditor = document.querySelector(selectors.textEditor);

        if (!win || !canvas || !wrap) {
            console.warn('[Drawing] Required elements not found, drawing disabled');
            return;
        }

        viewCtx = canvas.getContext('2d');
        if (!viewCtx) {
            console.warn('[Drawing] Canvas context not available');
            return;
        }

        bindDesktopIcon();
        bindToolbar();
        bindLayersPanel();
        bindCanvasPointer();
        bindTextOverlay();

        // 暴露给 ToolbarManager / win7-loader
        globalThis.resizeCanvas = resizeCanvas;
        globalThis.clearDrawing = clearAllLayers;
        globalThis.saveDrawingState = persist;

        // 初始化尺寸与默认图层
        resizeCanvas();
        ensureAtLeastOneLayer();
        renderLayersUI();
        renderComposite();

        // 尝试加载持久化数据
        loadPersisted();

        // 自动保存（如果有持久化模块）
        if (globalThis.drawingPersistence?.enableAutosave) {
            try {
                globalThis.drawingPersistence.enableAutosave(() => persist());
            } catch (e) {
                console.warn('[Drawing] enableAutosave failed', e);
            }
        }

        // 监听跨窗口同步
        if (globalThis.syncManager?.onDrawingChange) {
            globalThis.syncManager.onDrawingChange((payload) => {
                try {
                    handleRemoteSync(payload);
                } catch (e) {
                    console.error('[Drawing] Sync apply failed', e);
                }
            });
        }

        // 窗口变化时自动重算
        window.addEventListener('resize', () => {
            if (win && win.style.display !== 'none') {
                resizeCanvas();
            }
        });

        const observer = new MutationObserver(() => {
            if (win && win.style.display !== 'none') {
                setTimeout(() => resizeCanvas(), 40);
            }
        });
        observer.observe(win, { attributes: true, attributeFilter: ['style', 'class'] });

        // 绑定页面关闭事件 - 自动保存画板
        window.addEventListener('beforeunload', () => {
            console.log('[Drawing] beforeunload event triggered');
            autoSaveDrawingToServer();
        });

        // 监听窗口关闭事件 - 需要在WindowShell之前拦截
        // 我们需要在WindowShell初始化之前绑定，或者用更高优先级
        if (win) {
            // 在capture phase拦截close button点击（优先于WindowShell的bubbling listeners）
            const handleCloseClick = (e) => {
                const closeBtn = e.target.closest('.drawing-close');
                if (!closeBtn) return;

                console.log('[Drawing] Close button clicked (capture phase)');
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                // 自动保存，完成后隐藏窗口
                console.log('[Drawing] Starting auto-save before close...');
                autoSaveDrawingToServer().then(() => {
                    console.log('[Drawing] Auto-save completed, hiding window');
                    hideWindowAndTaskbarIcon();
                });
            };

            // 在capture phase添加监听器（这样能在bubble phase之前执行）
            document.addEventListener('click', handleCloseClick, true);
            console.log('[Drawing] Close button listener installed in capture phase');
        }
    }

    function bindDesktopIcon() {
        const icon = document.querySelector(selectors.icon);
        if (!icon || ('win7DrawingIconInit' in icon.dataset)) return;
        icon.dataset.win7DrawingIconInit = 'true';

        icon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            open();
        });

        icon.addEventListener('dblclick', (e) => {
            e.preventDefault();
            e.stopPropagation();
            open();
        });
    }

    function open() {
        if (typeof globalThis.startOpenDrawing === 'function') {
            globalThis.startOpenDrawing();
        } else {
            const w = document.querySelector(selectors.window);
            if (w) w.style.display = 'flex';
        }

        // 加载最新保存的画板内容
        loadLatestDrawing();

        setTimeout(() => {
            resizeCanvas();
            renderComposite();
        }, 60);
    }

    function bindToolbar() {
        if (!toolbar) return;

        // 初始化工具状态
        if (colorInput) {
            colorInput.value = state.color;
            colorInput.addEventListener('input', () => {
                state.color = colorInput.value;
                schedulePersist();
            });
        }

        if (sizeInput) {
            sizeInput.value = String(state.size);
            sizeInput.addEventListener('input', () => {
                const v = Number(sizeInput.value);
                if (Number.isFinite(v)) state.size = v;
                schedulePersist();
            });
        }

        toolbar.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-tool], [data-action]');
            if (!btn) return;

            const tool = btn.dataset.tool;
            const action = btn.dataset.action;

            if (tool) {
                setTool(tool);
                return;
            }

            if (!action) return;

            if (action === 'undo') {
                undo();
            } else if (action === 'redo') {
                redo();
            } else if (action === 'clear') {
                clearAllLayers();
            } else if (action === 'generate-image') {
                openAIImageModal();
            } else if (action === 'save') {
                exportCompositePng();
            }
        });
    }

    function setTool(tool) {
        state.tool = tool;
        schedulePersist();
    }

    function bindLayersPanel() {
        if (!layersList) return;

        document.querySelector(selectors.layerAdd)?.addEventListener('click', (e) => {
            e.preventDefault();
            addLayer();
        });

        document.querySelector(selectors.layerDelete)?.addEventListener('click', (e) => {
            e.preventDefault();
            deleteActiveLayer();
        });

        document.querySelector(selectors.layerUp)?.addEventListener('click', (e) => {
            e.preventDefault();
            moveActiveLayer(1);
        });

        document.querySelector(selectors.layerDown)?.addEventListener('click', (e) => {
            e.preventDefault();
            moveActiveLayer(-1);
        });

        layersList.addEventListener('click', (e) => {
            const eye = e.target.closest('.eye');
            if (eye) {
                const item = eye.closest('.layer-item');
                const id = item?.dataset.layerId;
                if (id) {
                    toggleLayerVisible(id);
                }
                e.stopPropagation();
                return;
            }

            const item = e.target.closest('.layer-item');
            if (!item) return;
            const id = item.dataset.layerId;
            if (!id) return;
            state.activeLayerId = id;
            renderLayersUI();
            schedulePersist();
        });
    }

    function bindCanvasPointer() {
        canvas.addEventListener('pointerdown', (e) => {
            // 如果窗口正在被拖动，忽略 canvas 事件
            if (globalThis._windowDragging) {
                return;
            }

            // 确保事件来自 canvas，忽略冒泡的事件
            if (e.target !== canvas && !canvas.contains(e.target)) return;

            if (state.tool === 'text') {
                openTextEditorAtPointer(e);
                return;
            }

            const layer = getActiveLayer();
            if (!layer || !layer.ctx) return;

            state.isDrawing = true;
            canvas.setPointerCapture(e.pointerId);

            const { x, y } = getCanvasPoint(e);
            state.lastX = x;
            state.lastY = y;

            layer.ctx.lineCap = 'round';
            layer.ctx.lineJoin = 'round';
            layer.ctx.lineWidth = state.size;

            if (state.tool === 'eraser') {
                layer.ctx.globalCompositeOperation = 'destination-out';
                layer.ctx.strokeStyle = 'rgba(0,0,0,1)';
            } else {
                layer.ctx.globalCompositeOperation = 'source-over';
                layer.ctx.strokeStyle = state.color;
            }

            layer.ctx.beginPath();
            layer.ctx.moveTo(x, y);
        });

        canvas.addEventListener('pointermove', (e) => {
            if (!state.isDrawing) return;
            const layer = getActiveLayer();
            if (!layer || !layer.ctx) return;

            const { x, y } = getCanvasPoint(e);
            layer.ctx.lineTo(x, y);
            layer.ctx.stroke();
            state.lastX = x;
            state.lastY = y;
            renderComposite();
        });

        const end = (e) => {
            if (!state.isDrawing) return;
            state.isDrawing = false;

            try {
                canvas.releasePointerCapture(e.pointerId);
            } catch (_) {}

            const layer = getActiveLayer();
            if (layer) {
                commitLayerSnapshot(layer);
                renderComposite();
                schedulePersist();
            }
        };

        canvas.addEventListener('pointerup', end);
        canvas.addEventListener('pointercancel', end);
        canvas.addEventListener('pointerleave', end);
    }

    function bindTextOverlay() {
        if (!textEditor || !textOverlay) return;

        textEditor.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeTextEditor(false);
                return;
            }

            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                closeTextEditor(true);
            }
        });

        textEditor.addEventListener('blur', () => {
            // blur 时也提交（更符合用户预期）
            if (textOverlay.style.display !== 'none') {
                closeTextEditor(true);
            }
        });
    }

    function openTextEditorAtPointer(e) {
        if (!textOverlay || !textEditor) return;
        const { x, y } = getCanvasPoint(e);

        textOverlay.style.display = 'block';
        textEditor.style.left = `${Math.round(x)}px`;
        textEditor.style.top = `${Math.round(y)}px`;
        textEditor.value = '';
        textEditor.dataset.canvasX = String(x);
        textEditor.dataset.canvasY = String(y);

        setTimeout(() => textEditor.focus(), 0);
    }

    function closeTextEditor(commit) {
        if (!textOverlay || !textEditor) return;

        const text = (textEditor.value || '').replace(/\s+$/g, '');
        const x = Number(textEditor.dataset.canvasX || '0');
        const y = Number(textEditor.dataset.canvasY || '0');

        textOverlay.style.display = 'none';

        if (!commit || !text) return;

        const layer = getActiveLayer();
        if (!layer || !layer.ctx) return;

        const fontSize = Math.max(12, Math.round(state.size * 4));
        layer.ctx.save();
        layer.ctx.globalCompositeOperation = 'source-over';
        layer.ctx.fillStyle = state.color;
        layer.ctx.font = `${fontSize}px "Segoe UI", "Microsoft YaHei", sans-serif`;
        layer.ctx.textBaseline = 'top';

        const lines = text.split(/\n/g);
        lines.forEach((line, idx) => {
            layer.ctx.fillText(line, x, y + idx * (fontSize + 4));
        });

        layer.ctx.restore();

        commitLayerSnapshot(layer);
        renderComposite();
        schedulePersist();
    }

    function getCanvasPoint(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    function resizeCanvas() {
        if (!canvas || !wrap) return;

        const rect = wrap.getBoundingClientRect();
        let w = Math.max(800, Math.floor(rect.width));  // 最小宽度 800
        let h = Math.max(600, Math.floor(rect.height)); // 最小高度 600

        // 避免无限循环，检查当前尺寸
        if (canvas.width === w && canvas.height === h) return;

        const prevW = canvas.width;
        const prevH = canvas.height;

        canvas.width = w;
        canvas.height = h;

        // 重新缩放所有离屏图层
        for (const layer of state.layers) {
            if (!layer.canvas) continue;

            const oldCanvas = layer.canvas;
            const oldW = oldCanvas.width;
            const oldH = oldCanvas.height;

            const nextCanvas = document.createElement('canvas');
            nextCanvas.width = w;
            nextCanvas.height = h;
            const nextCtx = nextCanvas.getContext('2d');

            if (nextCtx) {
                nextCtx.clearRect(0, 0, w, h);

                if (oldW > 0 && oldH > 0 && prevW > 0 && prevH > 0) {
                    // 尽量按比例保留已有内容
                    try {
                        nextCtx.drawImage(oldCanvas, 0, 0, oldW, oldH, 0, 0, w, h);
                    } catch (_) {}
                }
            }

            layer.canvas = nextCanvas;
            layer.ctx = nextCtx;
        }

        renderComposite();
    }

    function ensureAtLeastOneLayer() {
        if (state.layers.length) return;
        const layer = createLayer({ name: '图层 1' });
        state.layers.push(layer);
        state.activeLayerId = layer.id;
    }

    function createLayer({ id, name, visible = true, dataUrl } = {}) {
        const layerId = id || `layer_${Date.now()}_${Math.random().toString(16).slice(2)}`;
        const c = document.createElement('canvas');
        c.width = canvas.width;
        c.height = canvas.height;
        const ctx = c.getContext('2d');

        const layer = {
            id: layerId,
            name: name || `图层 ${state.layers.length + 1}`,
            visible,
            canvas: c,
            ctx,
            history: [],
            redo: []
        };

        // 初始化快照（保证撤销有基线）
        commitLayerSnapshot(layer, true);

        if (dataUrl) {
            restoreLayerFromDataUrl(layer, dataUrl).then(() => {
                commitLayerSnapshot(layer, true);
                renderComposite();
            });
        }

        return layer;
    }

    function getActiveLayer() {
        if (!state.layers.length) return null;
        const found = state.layers.find(l => l.id === state.activeLayerId);
        if (found) return found;
        state.activeLayerId = state.layers[state.layers.length - 1].id;
        return state.layers[state.layers.length - 1];
    }

    function addLayer() {
        const layer = createLayer({ name: `图层 ${state.layers.length + 1}` });
        state.layers.push(layer);
        state.activeLayerId = layer.id;
        renderLayersUI();
        renderComposite();
        schedulePersist();
    }

    function deleteActiveLayer() {
        if (!state.layers.length) return;

        if (state.layers.length === 1) {
            clearLayer(state.layers[0]);
            renderComposite();
            schedulePersist();
            return;
        }

        const idx = state.layers.findIndex(l => l.id === state.activeLayerId);
        if (idx < 0) return;
        state.layers.splice(idx, 1);

        state.activeLayerId = state.layers[Math.min(idx, state.layers.length - 1)].id;
        renderLayersUI();
        renderComposite();
        schedulePersist();
    }

    function moveActiveLayer(delta) {
        if (state.layers.length < 2) return;
        const idx = state.layers.findIndex(l => l.id === state.activeLayerId);
        if (idx < 0) return;

        const next = idx + delta;
        if (next < 0 || next >= state.layers.length) return;

        const tmp = state.layers[idx];
        state.layers[idx] = state.layers[next];
        state.layers[next] = tmp;

        renderLayersUI();
        renderComposite();
        schedulePersist();
    }

    function toggleLayerVisible(id) {
        const layer = state.layers.find(l => l.id === id);
        if (!layer) return;
        layer.visible = !layer.visible;
        renderLayersUI();
        renderComposite();
        schedulePersist();
    }

    function clearLayer(layer) {
        if (!layer?.ctx || !layer.canvas) return;
        layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
        layer.history = [];
        layer.redo = [];
        commitLayerSnapshot(layer, true);
    }

    function clearAllLayers() {
        for (const layer of state.layers) {
            clearLayer(layer);
        }
        renderComposite();
        schedulePersist();
    }

    function commitLayerSnapshot(layer, silent = false) {
        if (!layer?.canvas) return;
        try {
            const url = layer.canvas.toDataURL('image/png');
            if (!layer.history) layer.history = [];
            if (!layer.redo) layer.redo = [];

            // 防止重复快照膨胀
            if (layer.history.length && layer.history[layer.history.length - 1] === url) return;

            layer.history.push(url);
            if (!silent) layer.redo = [];

            // 限制历史长度
            if (layer.history.length > 30) {
                layer.history = layer.history.slice(layer.history.length - 30);
            }
        } catch (e) {
            console.warn('[Drawing] Snapshot failed', e);
        }
    }

    function restoreLayerFromDataUrl(layer, url) {
        return new Promise((resolve) => {
            if (!layer?.ctx || !layer.canvas || !url) {
                resolve();
                return;
            }

            const img = new Image();
            img.onload = () => {
                try {
                    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
                    layer.ctx.drawImage(img, 0, 0, layer.canvas.width, layer.canvas.height);
                } catch (e) {
                    console.warn('[Drawing] restore failed', e);
                }
                resolve();
            };
            img.onerror = () => resolve();
            img.src = url;
        });
    }

    function undo() {
        const layer = getActiveLayer();
        if (!layer || !layer.history || layer.history.length <= 1) return;

        const current = layer.history.pop();
        layer.redo.push(current);
        const prev = layer.history[layer.history.length - 1];
        restoreLayerFromDataUrl(layer, prev).then(() => {
            renderComposite();
            schedulePersist();
        });
    }

    function redo() {
        const layer = getActiveLayer();
        if (!layer || !layer.redo || !layer.redo.length) return;

        const next = layer.redo.pop();
        layer.history.push(next);
        restoreLayerFromDataUrl(layer, next).then(() => {
            renderComposite();
            schedulePersist();
        });
    }

    function renderLayersUI() {
        if (!layersList) return;
        layersList.innerHTML = '';

        // UI 上显示从上到下（顶层在前）
        const ordered = [...state.layers].slice().reverse();

        for (const layer of ordered) {
            const item = document.createElement('div');
            item.className = 'layer-item' + (layer.id === state.activeLayerId ? ' active' : '');
            item.dataset.layerId = layer.id;

            const eye = document.createElement('span');
            eye.className = 'eye';
            eye.textContent = layer.visible ? '👁' : '🚫';

            const name = document.createElement('span');
            name.className = 'name';
            name.textContent = layer.name;

            item.appendChild(eye);
            item.appendChild(name);
            layersList.appendChild(item);
        }
    }

    function renderComposite() {
        if (!viewCtx || !canvas) return;
        viewCtx.clearRect(0, 0, canvas.width, canvas.height);

        for (const layer of state.layers) {
            if (!layer?.canvas || !layer.visible) continue;
            try {
                viewCtx.drawImage(layer.canvas, 0, 0);
            } catch (_) {}
        }
    }

    function exportCompositePng() {
        if (!canvas) return;

        try {
            const link = document.createElement('a');
            link.download = `drawing_${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            console.error('[Drawing] Export failed', e);
        }
    }

    /**
     * 打开AI文生图模态框
     */
    function openAIImageModal() {
        const modal = document.getElementById('ai-image-modal');
        if (!modal) return;

        // 重置表单
        const prompt = document.getElementById('ai-prompt');
        const styleSelect = document.getElementById('ai-style');
        const sizeSelect = document.getElementById('ai-size');
        const preview = document.getElementById('ai-preview');
        const previewImg = document.getElementById('ai-preview-img');
        const error = document.getElementById('ai-error');
        const generateBtn = document.getElementById('ai-generate-btn');
        const insertBtn = document.getElementById('ai-insert-btn');

        if (prompt) prompt.value = '';
        if (styleSelect) styleSelect.value = '';
        if (sizeSelect) sizeSelect.value = '512x512';
        if (preview) preview.style.display = 'none';
        if (error) error.style.display = 'none';
        if (generateBtn) generateBtn.disabled = false;
        if (insertBtn) insertBtn.style.display = 'none';

        // 显示模态框
        modal.style.display = 'flex';

        // 设置事件监听
        setupAIModalEventListeners();
    }

    /**
     * 关闭AI文生图模态框
     */
    function closeAIImageModal() {
        const modal = document.getElementById('ai-image-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * 设置AI模态框事件监听
     */
    function setupAIModalEventListeners() {
        const generateBtn = document.getElementById('ai-generate-btn');
        const cancelBtn = document.getElementById('ai-cancel-btn');
        const closeBtn = document.querySelector('[data-action="close-ai-modal"]');

        // 绑定生成按钮
        if (generateBtn && !generateBtn.dataset.aiListenersBound) {
            generateBtn.addEventListener('click', async () => {
                await generateAIImage();
            });
            generateBtn.dataset.aiListenersBound = 'true';
        }

        // 绑定取消和关闭按钮
        const closeHandler = () => closeAIImageModal();
        
        if (cancelBtn && !cancelBtn.dataset.aiListenersBound) {
            cancelBtn.addEventListener('click', closeHandler);
            cancelBtn.dataset.aiListenersBound = 'true';
        }

        if (closeBtn && !closeBtn.dataset.aiListenersBound) {
            closeBtn.addEventListener('click', closeHandler);
            closeBtn.dataset.aiListenersBound = 'true';
        }
    }

    /**
     * 生成AI图像
     */
    async function generateAIImage() {
        const prompt = document.getElementById('ai-prompt');
        const styleSelect = document.getElementById('ai-style');
        const sizeSelect = document.getElementById('ai-size');
        const loading = document.getElementById('ai-loading');
        const error = document.getElementById('ai-error');
        const generateBtn = document.getElementById('ai-generate-btn');

        if (!prompt || !prompt.value.trim()) {
            if (error) {
                error.textContent = '请输入图像描述';
                error.style.display = 'block';
            }
            return;
        }

        // 隐藏错误，显示加载状态
        if (error) error.style.display = 'none';
        if (loading) loading.style.display = 'flex';
        if (generateBtn) generateBtn.disabled = true;

        if (!globalThis.aiImageGenerator) {
            if (error) {
                error.textContent = 'AI图像生成器未初始化';
                error.style.display = 'block';
            }
            if (loading) loading.style.display = 'none';
            if (generateBtn) generateBtn.disabled = false;
            return;
        }

        try {
            const result = await globalThis.aiImageGenerator.generate(
                prompt.value,
                {
                    style: styleSelect?.value || '',
                    size: sizeSelect?.value || '512x512'
                }
            );

            if (result.success) {
                // 直接绘制到画布而不是显示预览
                drawGeneratedImageToLayer(result.image);

                if (error) error.style.display = 'none';
            } else {
                if (error) {
                    error.textContent = result.error || '生成失败';
                    error.style.display = 'block';
                }
            }
        } catch (err) {
            console.error('[Drawing] Generate image error:', err);
            if (error) {
                error.textContent = '生成失败: ' + err.message;
                error.style.display = 'block';
            }
        } finally {
            if (loading) loading.style.display = 'none';
            if (generateBtn) generateBtn.disabled = false;
        }
    }

    /**
     * 直接绘制生成的图像到活动图层
     */
    function drawGeneratedImageToLayer(imageData) {
        const layer = getActiveLayer();
        if (!layer || !layer.ctx || !layer.canvas) {
            console.error('[Drawing] 无活动图层或画布无效');
            return;
        }

        const img = new Image();
        
        // 设置超时防止加载卡住
        const loadTimeout = setTimeout(() => {
            console.error('[Drawing] 图像加载超时');
        }, 10000);

        img.onload = () => {
            clearTimeout(loadTimeout);
            console.log('[Drawing] 图像加载成功:', img.width, 'x', img.height);
            
            // 清除当前图层
            layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);

            // 计算缩放和位置以适应canvas
            const scale = Math.min(
                layer.canvas.width / img.width,
                layer.canvas.height / img.height
            );

            const x = (layer.canvas.width - img.width * scale) / 2;
            const y = (layer.canvas.height - img.height * scale) / 2;

            console.log('[Drawing] 以缩放比', scale, '在位置', x, y, '绘制图像');

            // 绘制图像
            layer.ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

            commitLayerSnapshot(layer);
            renderComposite();
            schedulePersist();
            
            // 关闭模态框
            const modal = document.getElementById('ai-image-modal');
            if (modal) modal.style.display = 'none';
            
            console.log('[Drawing] 图像已成功绘制到画布');
        };

        img.onerror = (event) => {
            clearTimeout(loadTimeout);
            console.error('[Drawing] 图像加载失败', event);
            console.error('[Drawing] 图像源:', imageData.substring(0, 100));
            
            // 显示错误提示
            const error = document.getElementById('ai-error');
            if (error) {
                error.textContent = '图像加载失败，请重试';
                error.style.display = 'block';
            }
        };

        img.src = imageData;
    }

    /**
     * 将生成的图像插入到画板
     * （已废弃 - 现在直接绘制图像）
     */
    // 函数已移除，使用 drawGeneratedImageToLayer() 代替

    function schedulePersist() {
        if (state.persistTimer) clearTimeout(state.persistTimer);
        state.persistTimer = setTimeout(() => {
            persist();
        }, 250);
    }

    /**
     * 加载最新保存的画板内容
     */
    async function loadLatestDrawing() {
        try {
            console.log('[Drawing] Loading latest drawing from server...');
            const response = await fetch(`${API_BASE}/api/drawing`);

            if (!response.ok) {
                console.warn('[Drawing] Failed to load latest drawing:', response.status);
                return;
            }

            const data = await response.json();
            if (!data || !data.data) {
                console.log('[Drawing] No previous drawing found');
                return;
            }

            // 解析base64图片数据并还原到画板
            await restoreDrawingFromBase64(data.data);
            console.log('[Drawing] Latest drawing loaded successfully');
        } catch (err) {
            console.error('[Drawing] Failed to load latest drawing:', err);
        }
    }

    /**
     * 从base64数据还原画板
     */
    async function restoreDrawingFromBase64(base64Data) {
        return new Promise((resolve) => {
            if (!canvas || !viewCtx) {
                resolve();
                return;
            }

            const img = new Image();
            img.onload = () => {
                try {
                    // 清除现有的图层
                    ensureAtLeastOneLayer();
                    const layer = getActiveLayer();

                    if (layer && layer.ctx) {
                        layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
                        layer.ctx.drawImage(img, 0, 0);
                        commitLayerSnapshot(layer, true);
                    }

                    renderComposite();
                    console.log('[Drawing] Drawing restored from base64');
                } catch (e) {
                    console.error('[Drawing] Failed to restore drawing:', e);
                }
                resolve();
            };

            img.onerror = () => {
                console.error('[Drawing] Failed to load image');
                resolve();
            };

            img.src = `data:image/png;base64,${base64Data}`;
        });
    }

    /**
     * 自动保存画板到服务器（导出为PNG）
     */
    async function autoSaveDrawingToServer() {
        try {
            if (!canvas) {
                console.warn('[Drawing] Canvas not available, cannot auto-save');
                return;
            }

            console.log('[Drawing] Auto-saving drawing to server...');

            // 将canvas导出为PNG的base64数据
            const pngDataUrl = canvas.toDataURL('image/png');
            const base64Data = pngDataUrl.replace(/^data:image\/png;base64,/, '');

            console.log('[Drawing] Base64 data prepared, size:', base64Data.length);

            const payload = {
                name: `Drawing ${new Date().toLocaleString()}`,
                data: base64Data
            };

            const response = await fetch(`${API_BASE}/api/drawing`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                keepalive: true  // 确保在页面卸载时请求能完成
            });

            if (response.ok) {
                const result = await response.json();
                console.log('[Drawing] Auto-saved successfully:', result.id);
                return result;
            } else {
                console.warn('[Drawing] Auto-save failed:', response.status, response.statusText);
                const errorText = await response.text();
                console.warn('[Drawing] Error details:', errorText.substring(0, 200));
                return null;
            }
        } catch (err) {
            console.error('[Drawing] Auto-save error:', err.message);
            console.error('[Drawing] Error details:', err);
            return null;
        }
    }

    /**
     * 隐藏窗口和任务栏图标
     */
    function hideWindowAndTaskbarIcon() {
        const w = document.querySelector(selectors.window);
        if (w) {
            w.style.display = 'none';
            w.style.visibility = 'hidden';
            w.style.opacity = '0';
            w.classList.remove('minimized', 'restored', 'active', 'maximized');
        }

        // 隐藏任务栏图标
        const taskbarIcon = document.querySelector('[data-app="drawing"]');
        if (taskbarIcon) {
            taskbarIcon.style.display = 'none';
            taskbarIcon.classList.remove('active');
        }
    }

    function serializeLayers() {
        return state.layers.map(l => ({
            id: l.id,
            name: l.name,
            visible: !!l.visible,
            dataUrl: l.canvas ? l.canvas.toDataURL('image/png') : null
        }));
    }

    function serializeState() {
        return {
            tool: state.tool,
            color: state.color,
            size: state.size,
            activeLayerId: state.activeLayerId
        };
    }

    function persist() {
        if (!globalThis.drawingPersistence?.saveDrawing) return;

        const layers = serializeLayers();
        const drawingState = serializeState();

        try {
            globalThis.drawingPersistence.saveDrawing(layers, drawingState);
        } catch (e) {
            console.warn('[Drawing] Persist failed', e);
        }
    }

    function loadPersisted() {
        if (!globalThis.drawingPersistence?.loadDrawing) return;

        globalThis.drawingPersistence.loadDrawing().then((data) => {
            if (!data) return;
            const layers = Array.isArray(data.layers) ? data.layers : [];
            const savedState = data.state && typeof data.state === 'object' ? data.state : null;

            if (savedState) {
                if (typeof savedState.tool === 'string') state.tool = savedState.tool;
                if (typeof savedState.color === 'string') state.color = savedState.color;
                if (typeof savedState.size === 'number') state.size = savedState.size;
                if (typeof savedState.activeLayerId === 'string') state.activeLayerId = savedState.activeLayerId;

                if (colorInput) colorInput.value = state.color;
                if (sizeInput) sizeInput.value = String(state.size);
            }

            if (layers.length) {
                state.layers = [];

                const tasks = [];
                for (const l of layers) {
                    const layer = createLayer({
                        id: l.id,
                        name: l.name,
                        visible: l.visible !== false,
                        dataUrl: l.dataUrl || l.data || l.image || l.content
                    });
                    state.layers.push(layer);

                    // 若 dataUrl 异步加载，createLayer 里已经触发 restore，这里不需要额外 await
                    tasks.push(Promise.resolve());
                }

                Promise.all(tasks).then(() => {
                    ensureAtLeastOneLayer();
                    if (!state.layers.some(l => l.id === state.activeLayerId)) {
                        state.activeLayerId = state.layers[state.layers.length - 1].id;
                    }
                    renderLayersUI();
                    renderComposite();
                });
            }
        }).catch((e) => {
            console.warn('[Drawing] loadDrawing failed', e);
        });
    }

    function handleRemoteSync(payload) {
        // payload could be {action, data, timestamp} or raw {layers,state,timestamp}
        if (!payload) return;

        const envelope = payload.action ? payload : { action: 'drawing_updated', data: payload, timestamp: payload.timestamp };
        if (envelope.action !== 'drawing_updated') return;

        const ts = Number(envelope.timestamp || envelope.data?.timestamp || 0);
        if (ts && ts <= state.lastRemoteTimestamp) return;
        if (ts) state.lastRemoteTimestamp = ts;

        const data = envelope.data?.data ? envelope.data.data : envelope.data;
        if (!data) return;

        const layers = Array.isArray(data.layers) ? data.layers : [];
        const savedState = data.state && typeof data.state === 'object' ? data.state : null;

        if (layers.length) {
            state.layers = [];
            for (const l of layers) {
                const layer = createLayer({
                    id: l.id,
                    name: l.name,
                    visible: l.visible !== false,
                    dataUrl: l.dataUrl || l.data || l.image || l.content
                });
                state.layers.push(layer);
            }
        }

        if (savedState) {
            if (typeof savedState.tool === 'string') state.tool = savedState.tool;
            if (typeof savedState.color === 'string') state.color = savedState.color;
            if (typeof savedState.size === 'number') state.size = savedState.size;
            if (typeof savedState.activeLayerId === 'string') state.activeLayerId = savedState.activeLayerId;

            if (colorInput) colorInput.value = state.color;
            if (sizeInput) sizeInput.value = String(state.size);
        }

        ensureAtLeastOneLayer();
        if (!state.layers.some(l => l.id === state.activeLayerId)) {
            state.activeLayerId = state.layers[state.layers.length - 1].id;
        }

        renderLayersUI();
        renderComposite();
    }

    return {
        init,
        open
    };
})();
