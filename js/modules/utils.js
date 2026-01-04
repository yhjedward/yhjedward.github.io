/**
 * Utilities Module
 * 共享的工具函数
 */

export const Utils = (() => {
    function escapeHtml(str) {
        return String(str || '').replace(/[&<>"']/g, function (s) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[s];
        });
    }

    function decodeMaybeEncoded(t) {
        try {
            if (typeof t !== 'string') return String(t || '');
            if (t.indexOf('+') !== -1 && /%[0-9A-Fa-f]{2}/.test(t)) {
                t = t.replace(/\+/g, ' ');
            }
            if (/%[0-9A-Fa-f]{2}/.test(t)) {
                try {
                    return decodeURIComponent(t);
                } catch (e) { }
            }
            return t;
        } catch (e) {
            return String(t || '');
        }
    }

    function formatBytes(bytes) {
        if (Number.isNaN(bytes) || bytes <= 0) return '—';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
    }

    function debounce(fn, delay) {
        let t = null;
        return function () {
            const ctx = this, args = arguments;
            clearTimeout(t);
            t = setTimeout(() => fn.apply(ctx, args), delay);
        };
    }

    function pad2(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    return {
        escapeHtml,
        decodeMaybeEncoded,
        formatBytes,
        debounce,
        pad2
    };
})();
