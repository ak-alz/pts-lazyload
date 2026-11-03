import {BLOCK} from './defaults.js';
import {escapeHtml, randomId} from './utils.js';
import {DEFAULT_TEMPLATES, renderModal, resolveTemplates, strToEl} from './templates.js';
import {breakpointsOf, themeVarsFor} from './theme.js';
import ClickGuard, {zoneOf} from './ClickGuard.js';

// Действие посетителя → причина в событии verified
const CONFIRM_REASON = {button: 'click', close: 'close', overlay: 'overlay', escape: 'escape'};
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
const DARK_QUERY = '(prefers-color-scheme: dark)';

// Цвета, фоны, рамки и тени из theme относятся к светлой теме: в тёмной их заменяют themeDark и тёмные значения из CSS,
// иначе светлый фон или рамка окна остались бы и в тёмной теме. Правило, а не список: новые переменные подчиняются ему сами.
// Акцент и основная кнопка — фирменные, они общие для обеих тем
const COLOR_VAR = /-(background|color|border|shadow)(-|$)/;
const SHARED_VAR = new RegExp(`^--${BLOCK}-(accent|button-)`);
const isLightOnly = (name) => COLOR_VAR.test(name) && !SHARED_VAR.test(name);

export default class Modal {
    #options;
    #classNames;
    #onConfirm;
    #onReject;
    #onDismiss;
    #settled = false;
    #root = null;
    #dialog = null;
    #button = null;
    #close = null;
    #decline = null;
    #honeypot = null;
    #guard = null;
    #listeners = [];
    #colorScheme;
    #appliedVars = [];
    #returnFocus = null;

    constructor(options, {onConfirm, onReject, onDismiss}) {
        this.#options = options;
        this.#colorScheme = options.colorScheme;
        this.#classNames = options.classNames;
        this.#onConfirm = onConfirm;
        this.#onReject = onReject;
        this.#onDismiss = onDismiss;
    }

    // Плашка внизу экрана не перекрывает страницу: она немодальная, фокус в ней не запирается
    get #isModal() {
        return !String(this.#options.modal.modifier || '').split(/\s+/).includes('bottom');
    }

    open() {
        // Куда вернуть фокус после закрытия, например на ссылку «Настройки cookie», которой окно открыли
        this.#returnFocus = document.activeElement !== document.body ? document.activeElement : null;
        this.#render();
        document.body.appendChild(this.#root);
        this.#bind();

        if (this.#options.lockScroll) document.documentElement.classList.add(this.#classNames.locked);

        // Фокус ставится скриптом, и браузер сразу рисует кольцо :focus-visible, хотя посетитель ещё ничего не нажимал.
        // Кольцо скрыто до первого нажатия клавиши: тем, кто пользуется клавиатурой, оно нужно, остальным мешает
        const pristine = `${this.#classNames.root}--pristine`;
        this.#root.classList.add(pristine);
        this.#listen(document, 'keydown', () => this.#root?.classList.remove(pristine), {capture: true, once: true});

        void this.#root.offsetWidth;
        this.#root.classList.add(this.#classNames.open);
        this.#guard.start();

        if (this.#options.autoFocus) {
            try {
                this.#button.focus({preventScroll: true});
            } catch {
                this.#button.focus();
            }
        }
    }

    setColorScheme(scheme) {
        this.#colorScheme = scheme;
        if (this.#root) this.#applyColorScheme();
    }

    #isDark() {
        if (this.#colorScheme === 'auto') return !!window.matchMedia?.(DARK_QUERY).matches;
        return this.#colorScheme === 'dark';
    }

    #applyColorScheme() {
        const root = this.#root;
        const dark = this.#isDark();
        root.classList.toggle(`${this.#classNames.root}--dark`, dark);

        const vars = themeVarsFor(this.#options.theme);
        if (dark) {
            for (const name of Object.keys(vars)) if (isLightOnly(name)) delete vars[name];
            Object.assign(vars, themeVarsFor(this.#options.themeDark));
        }

        for (const name of this.#appliedVars) root.style.removeProperty(name);
        for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
        this.#appliedVars = Object.keys(vars);
    }

    close() {
        this.#unbind();
        const root = this.#root;
        if (!root) return;

        this.#root = null;
        document.documentElement.classList.remove(this.#classNames.locked);
        root.classList.remove(this.#classNames.open);

        // Фокус был в окне, которое сейчас исчезнет: без возврата посетитель с клавиатуры окажется в начале страницы
        if (root.contains(document.activeElement) && this.#returnFocus?.isConnected) {
            this.#returnFocus.focus({preventScroll: true});
        }
        this.#returnFocus = null;

        setTimeout(() => root.remove(), transitionTime(root) + 50);
    }

    #render() {
        const options = this.#options;
        const context = {classNames: this.#classNames, options};
        const params = {
            modal: options.modal,
            protection: options.protection,
            modifiers: String(options.modal.modifier || '').split(/\s+/).filter(Boolean),
            closeButton: options.closeButton,
            declineButton: options.declineButton,
        };

        let parts;
        try {
            const templates = resolveTemplates(options.templates, {strToEl, escape: escapeHtml, classNames: this.#classNames});
            parts = renderModal(templates, context, params);
        } catch (error) {
            // Ошибка в своих шаблонах не должна лишать посетителя возможности подтвердиться
            console.error('[pts-lazyload] Ошибка в шаблонах окна, используется окно по умолчанию:', error);
            parts = renderModal(DEFAULT_TEMPLATES, context, params);
        }

        this.#secure(parts);

        this.#root = parts.root;
        this.#applyColorScheme();
        this.#dialog = parts.dialog;
        this.#button = parts.button;
        this.#close = parts.close;
        this.#decline = parts.decline;
        this.#honeypot = parts.honeypot;
        this.#guard = new ClickGuard(options.protection);
    }

    // Атрибуты, от которых зависят защита и доступность, ставятся здесь, а не в шаблонах
    #secure({root, button, close, decline, honeypot, title, body}) {
        const id = `${BLOCK}-${randomId()}`;

        root.setAttribute('role', 'dialog');
        if (this.#isModal) root.setAttribute('aria-modal', 'true');
        if (title) {
            title.id = `${id}-title`;
            root.setAttribute('aria-labelledby', title.id);
        } else {
            root.setAttribute('aria-label', this.#options.modal.ariaLabel);
        }
        // Скринридер при открытии окна зачитывает не только заголовок, но и текст
        if (body) {
            body.id ||= `${id}-body`;
            root.setAttribute('aria-describedby', body.id);
        }

        button.type = 'button';
        if (decline) {
            decline.type = 'button';
            root.classList.add(`${this.#classNames.root}--with-decline`);
        }
        if (close) {
            close.type = 'button';
            if (!close.hasAttribute('aria-label')) close.setAttribute('aria-label', this.#options.modal.closeLabel);
        }

        // Ловушка стоит в DOM прямо перед настоящей кнопкой: бот, который ищет кнопку по классу или тексту, нажмёт её первой
        if (honeypot) {
            const aux = document.createElement('div');
            aux.className = this.#classNames.aux;
            aux.setAttribute('aria-hidden', 'true');
            honeypot.type = 'button';
            honeypot.tabIndex = -1;
            aux.appendChild(honeypot);
            button.before(aux);
        }
    }

    /**
     * Действие прошло проверку на бота. Если для него задан перехватчик, решение за ним:
     * next() — подтвердить, ctx.dismiss() — закрыть окно без подтверждения, ничего — оставить окно открытым.
     */
    #accept(action, event) {
        if (this.#settled) return;

        const dismiss = () => {
            if (this.#settled) return;
            this.#settled = true;
            this.#onDismiss(action);
        };
        // Для кнопки отказа действие по умолчанию — отказ, для остальных — подтверждение
        const next = action === 'decline' ? dismiss : () => {
            if (this.#settled) return;
            this.#settled = true;
            this.#onConfirm(CONFIRM_REASON[action]);
        };

        const interceptor = this.#options.intercept?.[action];
        if (typeof interceptor !== 'function') {
            next();
            return;
        }
        try {
            interceptor({action, event, dismiss}, next);
        } catch (error) {
            // Ошибка в перехватчике не должна лишать посетителя возможности подтвердиться
            console.error(`[pts-lazyload] Ошибка в intercept.${action}, действие выполнено по умолчанию:`, error);
            next();
        }
    }

    #bind() {
        const guard = this.#guard;
        const hasPointerEvents = 'onpointerdown' in window;

        // colorScheme: 'auto' — тема окна меняется вместе с системной, даже если окно уже открыто
        const media = window.matchMedia?.(DARK_QUERY);
        if (media?.addEventListener) {
            this.#listen(media, 'change', () => this.#colorScheme === 'auto' && this.#applyColorScheme());
        }

        // Брейкпоинты темы: значения пересчитываются при повороте экрана и изменении размера окна
        const queries = new Set([...breakpointsOf(this.#options.theme), ...breakpointsOf(this.#options.themeDark)].map(([query]) => query));
        for (const query of queries) {
            const list = window.matchMedia?.(query);
            if (list?.addEventListener) this.#listen(list, 'change', () => this.#applyColorScheme());
        }

        this.#listen(document, hasPointerEvents ? 'pointermove' : 'mousemove', (e) => guard.onPointerMove(e), {passive: true});
        this.#listen(document, hasPointerEvents ? 'pointerdown' : 'mousedown', (e) => guard.onPointerDown(e), true);
        if (!hasPointerEvents) {
            this.#listen(document, 'touchstart', (e) => guard.onPointerDown(e), {passive: true, capture: true});
        }

        // На уровне документа: при autoFocus: false фокус остаётся на странице, и Tab должен вернуть его в окно
        if (this.#isModal) {
            this.#listen(document, 'keydown', (e) => e.key === 'Tab' && this.#trapFocus(e), true);
        }

        const verify = (reason, action, event) => (reason ? this.#onReject(reason) : this.#accept(action, event));

        this.#listen(this.#button, 'click', (e) => verify(guard.check(e, zoneOf(this.#button)), 'button', e));

        // Закрытие окна крестиком, по оверлею или Escape засчитывается как подтверждение и проходит те же проверки:
        // иначе человек, закрывший окно, выпал бы из статистики
        if (this.#close) {
            this.#listen(this.#close, 'click', (e) => verify(guard.check(e, zoneOf(this.#close)), 'close', e));
        }

        // Отказ не требует проверки на бота: боту он ничего не даёт, счётчики не загрузятся
        if (this.#decline) {
            this.#listen(this.#decline, 'click', (e) => this.#accept('decline', e));
        }

        if (this.#options.closeOnOverlay) {
            const root = this.#root;
            const dialog = this.#dialog;
            const overlay = {
                contains: (node) => root.contains(node) && !dialog.contains(node),
                rect: () => root.getBoundingClientRect(),
            };
            this.#listen(root, 'click', (e) => {
                if (!dialog.contains(e.target)) verify(guard.check(e, overlay), 'overlay', e);
            });
        }

        if (this.#options.closeOnEscape) {
            this.#listen(document, 'keydown', (e) => {
                if (e.key === 'Escape') verify(guard.checkEscape(e), 'escape', e);
            });
        }

        if (this.#honeypot) {
            this.#listen(this.#honeypot, 'click', () => {
                guard.trap();
                this.#onReject('honeypot');
            });
        }
    }

    // Пока модальное окно открыто, фокус не должен уходить на страницу под ним
    #trapFocus(event) {
        const focusable = [...this.#root.querySelectorAll(FOCUSABLE)].filter(
            (el) => !el.closest(`.${this.#classNames.aux}`) && !el.disabled,
        );
        if (!focusable.length) return;

        const index = focusable.indexOf(document.activeElement);
        const next = event.shiftKey
            ? focusable[(index <= 0 ? focusable.length : index) - 1]
            : focusable[(index + 1) % focusable.length];
        event.preventDefault();
        next.focus();
    }

    #listen(target, type, handler, options = false) {
        target.addEventListener(type, handler, options);
        this.#listeners.push(() => target.removeEventListener(type, handler, options));
    }

    #unbind() {
        this.#listeners.forEach((remove) => remove());
        this.#listeners = [];
    }
}

// Окно удаляется из DOM после анимации закрытия, длительность которой задаётся темой или CSS
function transitionTime(el) {
    const style = getComputedStyle(el);
    const toMs = (value) => (value.endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000) || 0;
    const durations = style.transitionDuration.split(',').map(toMs);
    const delays = style.transitionDelay.split(',').map(toMs);
    return Math.max(0, ...durations.map((duration, i) => duration + (delays[i] || 0)));
}
