/**
 * Desktop Typing Module
 * 桌面中央打字机效果
 */

export const DesktopTyping = (() => {
    function init() {
        const textEl = document.getElementById('desktop-central-text');
        const caretEl = document.getElementById('desktop-central-caret');
        const wrapper = document.getElementById('desktop-central');

        if (!textEl || !wrapper) return;

        const ds = textEl.dataset || {};
        const raw = (ds.text || document.title || '').toString();

        // support multiple messages separated by '||'
        const messages = raw.split('||').map(s => s.trim()).filter(Boolean);
        if (messages.length === 0) messages.push(document.title || '');

        const typingSpeed = Math.max(10, Number.parseInt(ds.speed || '80', 10));
        const deleteSpeed = Math.max(10, Number.parseInt(ds.deleteSpeed || ds['deleteSpeed'] || '40', 10));
        const pause = Math.max(0, Number.parseInt(ds.pause || '1500', 10));
        const loop = (ds.loop === undefined) ? true : !(['false', '0', 'no'].includes(String(ds.loop).toLowerCase()));

        // apply style overrides
        try {
            if (ds.color) wrapper.style.setProperty('--desktop-text-color', ds.color);
            if (ds.size) wrapper.style.setProperty('--desktop-text-size', ds.size);
            if (ds.zindex) wrapper.style.setProperty('--desktop-z-index', ds.zindex);
        } catch (err) {
            console.error('[DesktopTyping] Error applying style overrides:', err);
        }

        textEl.textContent = '';
        if (caretEl) caretEl.style.visibility = 'visible';

        let msgIndex = 0;
        let charIndex = 0;
        let deleting = false;

        function step() {
            const msg = messages[msgIndex] || '';
            if (!deleting) {
                charIndex++;
                textEl.textContent = msg.slice(0, charIndex);
                if (charIndex >= msg.length) {
                    // finished typing
                    setTimeout(() => {
                        deleting = true;
                        setTimeout(step, deleteSpeed);
                    }, pause);
                    return;
                }
                setTimeout(step, typingSpeed);
            } else {
                charIndex--;
                textEl.textContent = msg.slice(0, charIndex);
                if (charIndex <= 0) {
                    deleting = false;
                    msgIndex = msgIndex + 1;
                    if (msgIndex >= messages.length) {
                        if (!loop) {
                            return;
                        }
                        msgIndex = 0;
                    }
                    setTimeout(step, typingSpeed);
                    return;
                }
                setTimeout(step, deleteSpeed);
            }
        }

        // small initial delay so fade-in can occur
        setTimeout(() => { step(); }, 250);
    }

    return {
        init
    };
})();
