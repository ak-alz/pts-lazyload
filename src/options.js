import {COLOR_SCHEMES, DEFAULTS, MAX_COOKIE_DAYS} from './defaults.js';
import {merge, toPositiveNumber} from './utils.js';

// Сайты на v2.x передают старые имена параметров, они продолжают работать
function mapLegacy(raw) {
    const legacy = {};
    const warnings = [];

    if (raw.cookie_name !== undefined) {
        legacy.cookieName = raw.cookie_name;
        warnings.push('cookie_name → cookieName');
    }
    if (raw.modalText !== undefined) {
        legacy.modal = {text: raw.modalText};
        warnings.push('modalText → modal.text');
    }
    // checkInternal пропускал бота на второй странице без подтверждения, поэтому параметр удалён
    if (raw.checkInternal !== undefined) {
        warnings.push('checkInternal больше не поддерживается: внутренние переходы без подтверждения не загружают счётчики');
    }

    if (warnings.length) {
        console.warn(`[pts-lazyload] Устаревшие параметры v2.x: ${warnings.join('; ')}`);
    }
    return legacy;
}

export function normalizeOptions(raw = {}) {
    const options = merge(merge(DEFAULTS, mapLegacy(raw)), raw);

    // Нечисловой срок давал max-age=NaN, и cookie жила только до закрытия браузера
    options.cookieTime = Math.min(toPositiveNumber(options.cookieTime, DEFAULTS.cookieTime), MAX_COOKIE_DAYS);
    options.protection.minDelay = Math.max(0, Number(options.protection.minDelay) || 0);
    options.declineTime = Math.min(Math.max(0, Number(options.declineTime) || 0), MAX_COOKIE_DAYS);
    options.counters = Array.isArray(options.counters) ? options.counters : [];

    // Модификатор dark из первых версий v3 — то же самое, что colorScheme: 'dark'
    const modifiers = String(options.modal.modifier || '').split(/\s+/).filter(Boolean);
    if (modifiers.includes('dark')) {
        if (!raw.colorScheme) options.colorScheme = 'dark';
        options.modal.modifier = modifiers.filter((mod) => mod !== 'dark').join(' ');
    }
    if (!COLOR_SCHEMES.includes(options.colorScheme)) {
        console.warn(`[pts-lazyload] colorScheme: ожидается ${COLOR_SCHEMES.join(', ')}, получено «${options.colorScheme}»`);
        options.colorScheme = DEFAULTS.colorScheme;
    }

    return options;
}
