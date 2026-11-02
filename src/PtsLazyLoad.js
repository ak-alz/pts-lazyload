import {COLOR_SCHEMES, DEFAULTS} from './defaults.js';
import {normalizeOptions} from './options.js';
import {isAutomation, isFromSearch, isSearchBot} from './detect.js';
import {emit, insertHtml} from './utils.js';
import TokenStore from './token.js';
import Modal from './Modal.js';

export default class PtsLazyLoad {
    static version = __VERSION__;
    static defaults = DEFAULTS;

    #options;
    #token;
    #modal = null;
    #started = false;
    #loaded = false;
    #queue = Promise.resolve();

    constructor(options) {
        this.#options = normalizeOptions(options);
        this.#token = new TokenStore(this.#options);
    }

    /**
     * @param {boolean|number} [needCheck=true] 0/false — проверка не нужна (например, авторизованный пользователь)
     */
    init(needCheck) {
        if (this.#started) return this;
        this.#started = true;

        // Шаблоны со счётчиками могут стоять ниже вызова init(), например в футере, а init — в <head>
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.#run(needCheck), {once: true});
        } else {
            this.#run(needCheck);
        }

        return this;
    }

    /**
     * Сменить тему окна: 'light', 'dark' или 'auto' (как в системе посетителя).
     * Подходит для сайтов со своим переключателем темы: вызывайте при каждом переключении.
     */
    setColorScheme(scheme) {
        if (!COLOR_SCHEMES.includes(scheme)) {
            console.warn(`[pts-lazyload] colorScheme: ожидается ${COLOR_SCHEMES.join(', ')}, получено «${scheme}»`);
            return this;
        }
        this.#options.colorScheme = scheme;
        this.#modal?.setColorScheme(scheme);
        return this;
    }

    /**
     * Показать окно ещё раз, например по ссылке «Настройки cookie» в футере: посетитель, отказавшийся
     * от необязательных cookie, может передумать. Если счётчики уже загружены или окно открыто, ничего не делает.
     */
    show() {
        const open = () => {
            if (this.#loaded || this.#modal) return;
            this.#showModal();
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', open, {once: true});
        else open();
        return this;
    }

    destroy() {
        this.#modal?.close();
        this.#modal = null;
    }

    #run(needCheck) {
        const options = this.#options;

        if (needCheck !== undefined && !Number(needCheck)) {
            this.#load('no-check');
            return;
        }

        if (options.protection.detectWebdriver && isAutomation()) {
            this.#block('automation');
            return;
        }

        // UA легко подделать, поэтому «поисковому роботу» счётчики не отдаём: настоящему они не нужны
        if (isSearchBot(options.botUserAgents)) {
            if (options.botBehavior === 'load') this.#load('search-bot');
            else this.#block('search-bot');
            return;
        }

        const token = this.#token.read();
        if (token) {
            this.#token.renew(token);
            this.#load('token');
            return;
        }

        // Посетитель отказался от необязательных cookie: окно не показываем, счётчики не загружаем
        if (this.#token.isDeclined()) {
            this.#block('declined');
            return;
        }

        // Ослабляет защиту: боты накрутки ПФ приходят именно из поиска
        if (options.skipForSearchVisitors && isFromSearch(options.searchReferrers)) {
            this.#load('search-referrer');
            return;
        }

        this.#showModal();
    }

    #showModal() {
        // Окно могли уже открыть через show() до init()
        if (this.#modal) return;
        this.#modal = new Modal(this.#options, {
            onConfirm: (reason) => {
                this.#token.clearDecline();
                this.#token.write(this.#token.create());
                this.destroy();
                this.#load(reason);
            },
            onDismiss: (action) => {
                if (action === 'decline') this.#token.decline(this.#options.declineTime);
                this.destroy();
                this.#log('окно закрыто без подтверждения:', action);
                this.#notify('dismiss', this.#options.onDismiss, {reason: action});
            },
            onReject: (reason) => {
                this.#log('клик отклонён:', reason);
                this.#notify('reject', this.#options.onReject, {reason});
            },
        });
        this.#modal.open();
        this.#notify('show', this.#options.onShow, {});
    }

    #load(reason) {
        if (this.#loaded) return;
        this.#loaded = true;
        this.#log('загрузка счётчиков, причина:', reason);

        // Окно, открытое через show() до init(), не нужно, если посетитель уже подтверждён
        this.destroy();

        // Код счётчика в <template> вставляется как есть, без экранирования </script>
        if (this.#options.counterSelector) {
            document.querySelectorAll(this.#options.counterSelector).forEach((template) => {
                const area = template.dataset.area && this.#query(template.dataset.area, 'data-area');
                if (area) {
                    this.#insert(template, (node) => area.appendChild(node));
                    return;
                }
                // Без data-area код встаёт на место шаблона, сохраняя порядок узлов
                const marker = document.createTextNode('');
                template.after(marker);
                this.#insert(template, (node) => marker.before(node));
            });
        }

        this.#options.counters.forEach((counter) => {
            if (!counter?.html) return;
            const area = (counter.area && this.#query(counter.area, 'counters[].area')) || document.head;
            this.#insert(counter.html, (node) => area.appendChild(node));
        });

        const detail = {reason};
        this.#notify('verified', this.#options.onVerify, detail);
        // Сайты на v2.1 подписаны на ptz-click, например для показа рекламы только людям
        if (this.#options.legacyEvent) emit('ptz-click', detail);
    }

    // Счётчики вставляются строго по очереди, как браузер выполняет скрипты при разборе страницы:
    // библиотека из одного шаблона успевает загрузиться до инициализации из следующего
    #insert(source, place) {
        this.#queue = this.#queue
            .then(() => insertHtml(source, place))
            .catch((error) => console.error('[pts-lazyload] Ошибка вставки счётчика', source, error));
    }

    // Ошибка в селекторе одного счётчика не должна отключать остальные: код вставляется в место по умолчанию
    #query(selector, name) {
        try {
            return document.querySelector(selector);
        } catch {
            console.warn(`[pts-lazyload] Некорректный селектор в ${name}: «${selector}», код вставлен в место по умолчанию`);
            return null;
        }
    }

    #block(reason) {
        this.#log('счётчики не загружены, причина:', reason);
        this.#notify('blocked', this.#options.onBlock, {reason});
    }

    #notify(name, callback, detail) {
        emit(`pts-lazyload:${name}`, detail);
        if (typeof callback !== 'function') return;
        try {
            callback(detail);
        } catch (error) {
            console.error(error);
        }
    }

    #log(...args) {
        if (this.#options.debug) console.log('[pts-lazyload]', ...args);
    }
}
