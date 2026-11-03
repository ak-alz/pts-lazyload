import {DEFAULT_STATE, FIELDS, isVisible} from './schema.js';
import {countersFromState} from './counters.js';

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

function setPath(target, path, value) {
    const keys = path.split('.');
    let node = target;
    for (const key of keys.slice(0, -1)) node = node[key] ??= {};
    node[keys.at(-1)] = value;
}

const isSet = (value, fallback) => value !== '' && value !== null && value !== undefined && value !== fallback;

/**
 * Параметры PtsLazyLoad из состояния конструктора. В результат попадает только то, что отличается
 * от значений по умолчанию: итоговый код остаётся коротким.
 */
export function buildOptions(state) {
    const s = {...DEFAULT_STATE, ...state};
    const options = {};

    for (const field of FIELDS) {
        if (!field.path || !isVisible(field, s)) continue;
        if (field.key === 'text' && s.textMode !== 'text') continue;
        if (field.key === 'content' && s.textMode !== 'html') continue;
        if (isSet(s[field.key], field.default)) setPath(options, field.path, s[field.key]);
    }

    // В режиме HTML пустое поле оставляет текст по умолчанию, иначе окно было бы пустым
    if (s.textMode === 'html' && !String(s.content || '').trim()) delete options.modal?.content;
    if (options.modal && !Object.keys(options.modal).length) delete options.modal;

    const modifiers = [s.bottom && 'bottom', s.inline && 'inline'].filter(Boolean);
    if (modifiers.length) setPath(options, 'modal.modifier', modifiers.join(' '));

    // Мобильная версия — брейкпоинт темы: значения действуют на экранах уже mobileBreakpoint
    const mobile = {};
    if (isSet(s.mobileGutter, '')) setPath(mobile, 'gutter', s.mobileGutter);
    if (isSet(s.mobileDialogPadding, '')) setPath(mobile, 'dialog.padding', s.mobileDialogPadding);
    if (isSet(s.mobileTitleFontSize, '')) setPath(mobile, 'title.fontSize', s.mobileTitleFontSize);
    if (isSet(s.mobileTextFontSize, '')) setPath(mobile, 'text.fontSize', s.mobileTextFontSize);
    if (!s.mobileButtonFullWidth) setPath(mobile, 'button.width', 'auto');
    if (Object.keys(mobile).length) {
        const breakpoint = Number(s.mobileBreakpoint) || DEFAULT_STATE.mobileBreakpoint;
        setPath(options, `theme.breakpoints.${breakpoint}`, mobile);
    }
    if (!s.textLinkUnderline) setPath(options, 'theme.text.linkDecoration', 'none');

    if (s.declineButton && s.declineStyle === 'filled') {
        setPath(options, 'theme.decline.background', 'rgba(127, 127, 127, .12)');
        setPath(options, 'theme.decline.backgroundHover', 'rgba(127, 127, 127, .2)');
        setPath(options, 'theme.decline.border', 'none');
    }
    if (s.declineButton && s.declineStyle === 'text') setPath(options, 'theme.decline.border', 'none');

    if (isSet(s.buttonPaddingX, DEFAULT_STATE.buttonPaddingX)) setPath(options, 'theme.button.padding', `8px ${s.buttonPaddingX}px`);

    const animation = {};
    if (s.animationType !== DEFAULT_STATE.animationType) animation.type = s.animationType;
    if (s.animationType !== 'none') {
        if (isSet(s.animationDuration, DEFAULT_STATE.animationDuration)) animation.duration = s.animationDuration;
        if (isSet(s.animationEasing, DEFAULT_STATE.animationEasing)) animation.easing = s.animationEasing;
    }
    const animationKeys = Object.keys(animation);
    if (animationKeys.length === 1 && animation.type) setPath(options, 'theme.animation', animation.type);
    else if (animationKeys.length) setPath(options, 'theme.animation', animation);

    return options;
}

function quoteString(value, indent) {
    const str = String(value);
    // Многострочный текст — шаблонной строкой, чтобы его было удобно править в коде
    if (str.includes('\n')) {
        const body = str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${').replace(/<\/(script)/gi, '<\\/$1');
        return `\`${body.split('\n').join(`\n${indent}`)}\``;
    }
    return `'${str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/<\/(script)/gi, '<\\/$1')}'`;
}

/** JS-литерал объекта: ключи без кавычек, строки в одинарных кавычках, отступ 4 пробела. */
export function toJs(value, level = 0) {
    const indent = '    '.repeat(level);
    const inner = '    '.repeat(level + 1);

    if (Array.isArray(value)) {
        if (!value.length) return '[]';
        return `[\n${value.map((item) => inner + toJs(item, level + 1)).join(',\n')},\n${indent}]`;
    }
    if (value && typeof value === 'object') {
        const entries = Object.entries(value);
        if (!entries.length) return '{}';
        const lines = entries.map(([key, item]) => {
            const name = IDENTIFIER.test(key) || /^(0|[1-9]\d*)$/.test(key) ? key : quoteString(key, inner);
            return `${inner}${name}: ${toJs(item, level + 1)}`;
        });
        return `{\n${lines.join(',\n')},\n${indent}}`;
    }
    if (typeof value === 'string') return quoteString(value, inner);
    return String(value);
}

export function initCall(options) {
    return Object.keys(options).length ? `new PtsLazyLoad(${toJs(options)}).init();` : 'new PtsLazyLoad().init();';
}

const indentBlock = (text, spaces) => text.split('\n').map((line) => (line ? ' '.repeat(spaces) + line : line)).join('\n');

/**
 * Готовый HTML для вставки на сайт.
 * assets: 'cdn' — файлы с jsDelivr, 'local' — со своего сервера по пути assetsPath.
 */
export function buildSnippet(state, {version, assets = 'cdn', assetsPath = '/libs/pts-lazyload/'} = {}) {
    const base = assets === 'cdn'
        ? `https://cdn.jsdelivr.net/gh/ak-alz/pts-lazyload@v${version}/build/`
        : assetsPath.replace(/\/?$/, '/');

    const counters = countersFromState(state);
    const templates = counters.length
        ? counters.map((code) => `<template data-pts-lazyload>\n${indentBlock(code, 4)}\n</template>`).join('\n\n')
        : '<template data-pts-lazyload>\n    <!-- Вставьте сюда код счётчика без изменений -->\n</template>';

    return `<!-- pts-lazyload: стили, лучше подключить в <head> -->
<link rel="stylesheet" href="${base}pts.lazyload.min.css">

<!-- Счётчики: загрузятся только после подтверждения -->
${templates}

<!-- pts-lazyload: скрипт и настройки -->
<script src="${base}pts.lazyload.min.js"></script>
<script>
${indentBlock(initCall(buildOptions(state)), 4)}
</script>`;
}
