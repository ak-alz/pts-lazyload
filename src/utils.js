export function isPlainObject(value) {
    if (value === null || typeof value !== 'object') return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

export function merge(target, source = {}) {
    const out = {};
    for (const [key, value] of Object.entries(target)) {
        out[key] = isPlainObject(value) ? merge(value) : value;
    }
    for (const [key, value] of Object.entries(source)) {
        if (value === undefined) continue;
        out[key] = isPlainObject(out[key]) && isPlainObject(value) ? merge(out[key], value) : value;
    }
    return out;
}

export function toPositiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
}

const HTML_ENTITIES = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => HTML_ENTITIES[ch]);

// Подпись защищает от ручной подстановки cookie, но не от того, кто прочитал этот код
export function hash(str) {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function randomId() {
    if (window.crypto?.getRandomValues) {
        const buf = new Uint32Array(2);
        window.crypto.getRandomValues(buf);
        return buf[0].toString(36) + buf[1].toString(36);
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const now = () => (window.performance?.now ? performance.now() : Date.now());

export function emit(name, detail = {}) {
    document.dispatchEvent(new CustomEvent(name, {detail}));
}

function reviveScript(inert) {
    const script = document.createElement('script');
    for (const {name, value} of inert.attributes) script.setAttribute(name, value);
    if (inert.nonce) script.nonce = inert.nonce;
    if (!inert.hasAttribute('async')) script.async = false;
    script.text = inert.text;
    return script;
}

const isBlockingScript = (inert) =>
    inert.hasAttribute('src') && !inert.hasAttribute('async') && !inert.hasAttribute('defer') && inert.type !== 'module';

/**
 * Вставляет код счётчика так, как его выполнил бы браузер при разборе страницы:
 * пока не загрузился внешний скрипт без async, следующие узлы не вставляются.
 * Иначе инициализация («VK.Retargeting.Init()») выполнится раньше загрузки библиотеки.
 */
export async function insertHtml(source, place) {
    let template = source;
    if (typeof source === 'string') {
        template = document.createElement('template');
        template.innerHTML = source;
    }
    const fragment = document.importNode(template.content, true);

    for (const node of [...fragment.childNodes]) {
        if (node.nodeName !== 'SCRIPT') {
            node.querySelectorAll?.('script').forEach((inert) => inert.replaceWith(reviveScript(inert)));
            place(node);
            continue;
        }

        const script = reviveScript(node);
        if (!isBlockingScript(node)) {
            place(script);
            continue;
        }
        await new Promise((resolve) => {
            script.addEventListener('load', resolve);
            script.addEventListener('error', resolve);
            place(script);
        });
    }
}
