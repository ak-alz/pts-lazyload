import {DAY_MS, TOKEN_PREFIX} from './defaults.js';
import {hash, randomId} from './utils.js';

function cookieGet(name) {
    for (const pair of document.cookie ? document.cookie.split('; ') : []) {
        const eq = pair.indexOf('=');
        if (eq > -1 && pair.slice(0, eq) === name) {
            try {
                return decodeURIComponent(pair.slice(eq + 1));
            } catch {
                return null;
            }
        }
    }
    return null;
}

function storageGet(key) {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function sessionGet(key) {
    try {
        return window.sessionStorage.getItem(key);
    } catch {
        return null;
    }
}

function sessionSet(key, value) {
    try {
        if (value === null) window.sessionStorage.removeItem(key);
        else window.sessionStorage.setItem(key, value);
    } catch {
        // без sessionStorage отказ не запоминается, окно покажется на следующей странице
    }
}

function storageSet(key, value) {
    try {
        window.localStorage.setItem(key, value);
    } catch {
        // без localStorage остаётся только cookie
    }
}

/**
 * Соль подписи по умолчанию. С cookieDomain она одна на все поддомены: иначе токен с www.site.ru
 * не прошёл бы проверку подписи на site.ru, хотя cookie видна обоим.
 */
export function defaultSalt({salt, cookieDomain} = {}, hostname = location.hostname) {
    if (salt) return salt;
    if (cookieDomain) return String(cookieDomain).trim().replace(/^\./, '').toLowerCase();
    return hostname;
}

/**
 * Токен подтверждения: v3.<время выдачи>.<случайное значение>.<подпись>.
 * Хранится в cookie и в localStorage: если одну копию удалили, она восстанавливается из другой.
 */
export default class TokenStore {
    #name;
    #days;
    #domain;
    #salt;

    constructor({cookieName, cookieTime, cookieDomain, salt}) {
        this.#name = cookieName;
        this.#days = cookieTime;
        this.#domain = cookieDomain;
        this.#salt = defaultSalt({salt, cookieDomain});
    }

    #sign(issued, nonce) {
        return hash([TOKEN_PREFIX, issued, nonce, this.#salt, this.#name].join('|'));
    }

    create() {
        const issued = Date.now().toString(36);
        const nonce = randomId();
        return [TOKEN_PREFIX, issued, nonce, this.#sign(issued, nonce)].join('.');
    }

    isValid(token) {
        if (!token) return false;
        const parts = String(token).split('.');
        if (parts.length !== 4 || parts[0] !== TOKEN_PREFIX) return false;

        const issued = parseInt(parts[1], 36);
        if (!Number.isFinite(issued)) return false;

        const age = Date.now() - issued;
        if (age < -DAY_MS || age > this.#days * DAY_MS) return false;

        return parts[3] === this.#sign(parts[1], parts[2]);
    }

    read() {
        const fromCookie = cookieGet(this.#name);
        if (this.isValid(fromCookie)) return fromCookie;
        const fromStorage = storageGet(this.#name);
        return this.isValid(fromStorage) ? fromStorage : null;
    }

    write(token) {
        this.#setCookie(this.#name, encodeURIComponent(token), this.#days);
        storageSet(this.#name, token);
    }

    #setCookie(name, value, days) {
        let cookie = `${name}=${value}; max-age=${Math.round(days * 86400)}; path=/; SameSite=Lax`;
        if (this.#domain) cookie += `; domain=${this.#domain}`;
        if (location.protocol === 'https:') cookie += '; Secure';
        document.cookie = cookie;
    }

    get #declineKey() {
        return `${this.#name}-declined`;
    }

    /**
     * Посетитель отказался от необязательных cookie. Отказ запоминается, чтобы окно не появлялось на каждой странице:
     * days = 0 — до закрытия вкладки (sessionStorage), иначе — на указанное число дней (cookie).
     */
    decline(days) {
        if (days > 0) this.#setCookie(this.#declineKey, '1', days);
        else sessionSet(this.#declineKey, '1');
    }

    isDeclined() {
        return sessionGet(this.#declineKey) === '1' || cookieGet(this.#declineKey) === '1';
    }

    clearDecline() {
        sessionSet(this.#declineKey, null);
        if (cookieGet(this.#declineKey) !== null) this.#setCookie(this.#declineKey, '', 0);
    }

    // Скользящий срок: раз в сутки выдаём новый токен, чтобы постоянные посетители не видели окно повторно
    // ни по истечении cookieTime, ни после урезания срока cookie браузером (Safari ITP)
    renew(token) {
        const issued = parseInt(token.split('.')[1], 36);
        this.write(Date.now() - issued > DAY_MS ? this.create() : token);
    }
}
