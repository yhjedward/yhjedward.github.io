/**
 * Calendar Flyout Module
 * 点击任务栏时钟弹出日历，并根据 Hugo 注入的文章数据按日期展示文章
 */

export const Calendar = (() => {
    const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六'];

    let initialized = false;

    let clockEl;
    let flyoutEl;
    let titleEl;
    let gridEl;
    let postsTitleEl;
    let postsListEl;
    let prevBtn;
    let nextBtn;

    let viewYear;
    let viewMonth; // 0-11
    let selectedDateKey;

    /** @type {Map<string, Array<{title:string,url:string,date:string,filename?:string,section?:string,lastmod?:string}>>} */
    let postsByDate = new Map();

    function pad2(n) {
        return String(n).padStart(2, '0');
    }

    function toDateKey(d) {
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    }

    function parseDateKey(key) {
        const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(key);
        if (!m) return null;
        const y = Number(m[1]);
        const mo = Number(m[2]) - 1;
        const da = Number(m[3]);
        if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da)) return null;
        return new Date(y, mo, da);
    }

    function readBlogData() {
        const el = document.getElementById('blog-data');
        if (!el) return [];
        const raw = (el.textContent || '').trim();
        if (!raw) return [];

        try {
            const parsed = JSON.parse(raw);
            const posts = Array.isArray(parsed?.posts) ? parsed.posts : [];
            return posts.filter(p => p && typeof p.date === 'string' && typeof p.url === 'string');
        } catch (e) {
            console.error('[Calendar] Failed to parse #blog-data JSON', e);
            return [];
        }
    }

    function buildIndex() {
        postsByDate = new Map();
        const posts = readBlogData();
        for (const p of posts) {
            const key = String(p.date || '').trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
            if (!postsByDate.has(key)) postsByDate.set(key, []);
            postsByDate.get(key).push(p);
        }

        // 同一天按标题排序，稳定展示
        for (const [key, list] of postsByDate.entries()) {
            list.sort((a, b) => (a.title || '').localeCompare((b.title || ''), 'zh-CN'));
            postsByDate.set(key, list);
        }
    }

    function isOpen() {
        return flyoutEl?.classList.contains('open');
    }

    function open() {
        if (!flyoutEl || !clockEl) return;

        flyoutEl.classList.add('open');
        flyoutEl.setAttribute('aria-hidden', 'false');
        clockEl.setAttribute('aria-expanded', 'true');

        // 每次打开都重建索引，避免热更新/局部刷新带来的数据不一致
        buildIndex();

        const now = new Date();
        viewYear = now.getFullYear();
        viewMonth = now.getMonth();

        const todayKey = toDateKey(now);
        selectedDateKey = todayKey;

        render();
        renderPostsForSelected();
    }

    function close() {
        if (!flyoutEl || !clockEl) return;
        flyoutEl.classList.remove('open');
        flyoutEl.setAttribute('aria-hidden', 'true');
        clockEl.setAttribute('aria-expanded', 'false');
    }

    function toggle() {
        if (isOpen()) close();
        else open();
    }

    function formatMonthTitle(year, month) {
        try {
            return new Date(year, month, 1).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
        } catch (_) {
            return `${year}-${pad2(month + 1)}`;
        }
    }

    function render() {
        if (!titleEl || !gridEl) return;
        titleEl.textContent = formatMonthTitle(viewYear, viewMonth);

        gridEl.innerHTML = '';

        for (const w of WEEKDAYS_ZH) {
            const el = document.createElement('div');
            el.className = 'calendar-weekday';
            el.textContent = w;
            gridEl.appendChild(el);
        }

        const first = new Date(viewYear, viewMonth, 1);
        const firstDow = first.getDay();
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

        for (let i = 0; i < firstDow; i++) {
            const blank = document.createElement('div');
            blank.className = 'calendar-day empty';
            blank.textContent = '0';
            gridEl.appendChild(blank);
        }

        const todayKey = toDateKey(new Date());

        for (let day = 1; day <= daysInMonth; day++) {
            const d = new Date(viewYear, viewMonth, day);
            const key = toDateKey(d);

            const cell = document.createElement('div');
            cell.className = 'calendar-day';
            cell.textContent = String(day);
            cell.dataset.date = key;

            if (key === todayKey) cell.classList.add('today');
            if (postsByDate.has(key)) cell.classList.add('has-posts');
            if (key === selectedDateKey) cell.classList.add('selected');

            cell.addEventListener('click', (e) => {
                e.preventDefault();
                setSelectedDate(key);
            });

            gridEl.appendChild(cell);
        }

        const totalCells = firstDow + daysInMonth;
        const remainder = totalCells % 7;
        const trailing = remainder === 0 ? 0 : 7 - remainder;
        for (let i = 0; i < trailing; i++) {
            const blank = document.createElement('div');
            blank.className = 'calendar-day empty';
            blank.textContent = '0';
            gridEl.appendChild(blank);
        }
    }

    function setSelectedDate(key) {
        if (!key || key === selectedDateKey) return;
        selectedDateKey = key;
        render();
        renderPostsForSelected();
    }

    function renderPostsForSelected() {
        if (!postsTitleEl || !postsListEl) return;

        const dt = selectedDateKey ? parseDateKey(selectedDateKey) : null;
        const label = dt
            ? dt.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
            : '选择日期查看文章';

        const list = selectedDateKey && postsByDate.has(selectedDateKey) ? postsByDate.get(selectedDateKey) : [];

        postsTitleEl.textContent = list && list.length ? `${label}（${list.length}）` : `${label}（无文章）`;
        postsListEl.innerHTML = '';

        if (!list || !list.length) return;

        for (const p of list) {
            const item = document.createElement('div');
            item.className = 'calendar-post-item';
            item.tabIndex = 0;

            const title = document.createElement('div');
            title.className = 'title';
            title.textContent = p.title || '(未命名)';

            const meta = document.createElement('div');
            meta.className = 'meta';
            meta.textContent = p.date || '';

            item.appendChild(title);
            item.appendChild(meta);

            const openPost = (e) => {
                e.preventDefault();
                e.stopPropagation();

                try {
                    if (globalThis.articleReader && typeof globalThis.articleReader.openBlogArticle === 'function') {
                        globalThis.articleReader.openBlogArticle(p.url, p.filename);
                    } else {
                        // fallback：直接跳转
                        window.location.href = p.url;
                    }
                } finally {
                    close();
                }
            };

            item.addEventListener('click', openPost);
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') openPost(e);
            });

            postsListEl.appendChild(item);
        }
    }

    function bindEvents() {
        if (!clockEl || !flyoutEl) return;

        clockEl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle();
        });

        clockEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle();
            }
        });

        prevBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            viewMonth -= 1;
            if (viewMonth < 0) {
                viewMonth = 11;
                viewYear -= 1;
            }
            render();
        });

        nextBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            viewMonth += 1;
            if (viewMonth > 11) {
                viewMonth = 0;
                viewYear += 1;
            }
            render();
        });

        document.addEventListener('click', (e) => {
            if (!isOpen()) return;
            const t = e.target;
            if (!(t instanceof Node)) return;
            if (flyoutEl.contains(t)) return;
            if (clockEl.contains(t)) return;
            close();
        });

        document.addEventListener('keydown', (e) => {
            if (!isOpen()) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                close();
            }
        });

        // 防止点击飞出层内部触发 document click 关闭
        flyoutEl.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    function init() {
        if (initialized) return;
        initialized = true;

        clockEl = document.getElementById('time-display');
        flyoutEl = document.getElementById('calendar-flyout');
        titleEl = document.getElementById('calendar-title');
        gridEl = document.getElementById('calendar-grid');
        postsTitleEl = document.getElementById('calendar-posts-title');
        postsListEl = document.getElementById('calendar-posts-list');

        prevBtn = flyoutEl?.querySelector('.cal-prev') || null;
        nextBtn = flyoutEl?.querySelector('.cal-next') || null;

        if (!clockEl || !flyoutEl) {
            console.warn('[Calendar] Required elements not found, calendar disabled');
            return;
        }

        bindEvents();
    }

    return {
        init,
        open,
        close,
        toggle
    };
})();
