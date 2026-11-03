import {BLOCK} from './defaults.js';
import {isPlainObject} from './utils.js';

const UNITLESS = new Set(['fontWeight', 'lineHeight', 'opacity', 'zIndex']);

export const ANIMATIONS = {
    'slide-up': 'translateY(16px)',
    'slide-down': 'translateY(-16px)',
    zoom: 'scale(.92)',
    fade: 'none',
    none: 'none',
};

// Короткие имена из первых версий v3: theme.title — это цвет заголовка, theme.radius — скругление окна и т. д.
const FLAT_ALIASES = {
    background: 'dialog-background',
    text: 'dialog-color',
    title: 'title-color',
    overlay: 'overlay-background',
    radius: 'dialog-radius',
    buttonRadius: 'button-radius',
    width: 'dialog-width',
    padding: 'dialog-padding',
    shadow: 'dialog-shadow',
    duration: 'animation-duration',
};

const kebab = (name) => name.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);

function toCssValue(key, value) {
    if (typeof value !== 'number') return String(value);
    // Длительности задаются в миллисекундах, размеры — в пикселях
    if (/duration$/i.test(key)) return `${value}ms`;
    return UNITLESS.has(key) ? String(value) : `${value}px`;
}

function animationVars(animation) {
    const config = typeof animation === 'string' ? {type: animation} : animation || {};
    const vars = {};

    if (config.type) {
        if (!(config.type in ANIMATIONS)) {
            console.warn(`[pts-lazyload] Неизвестная анимация «${config.type}», доступны: ${Object.keys(ANIMATIONS).join(', ')}`);
        } else {
            vars['animation-transform'] = ANIMATIONS[config.type];
            if (config.type === 'none') vars['animation-duration'] = '0s';
        }
    }
    if (config.transform) vars['animation-transform'] = config.transform;
    if (config.duration !== undefined) {
        vars['animation-duration'] = typeof config.duration === 'number' ? `${config.duration}ms` : String(config.duration);
    }
    if (config.easing) vars['animation-easing'] = config.easing;
    return vars;
}

/**
 * Превращает theme в CSS-переменные --pts-lazyload-*.
 * {accent: '#f00'} → --pts-lazyload-accent, {button: {fontSize: 18}} → --pts-lazyload-button-font-size: 18px.
 * Переменные ставятся на корневой элемент окна, поэтому их можно задавать и обычным CSS.
 */
export function themeToCssVars(theme) {
    const vars = {};
    const put = (name, key, value) => {
        if (value === null || value === undefined || value === '') return;
        vars[name] = toCssValue(key, value);
    };

    for (const [key, value] of Object.entries(theme || {})) {
        if (key === 'breakpoints') continue;
        if (key === 'animation') {
            Object.assign(vars, animationVars(value));
        } else if (isPlainObject(value)) {
            for (const [prop, propValue] of Object.entries(value)) put(`${kebab(key)}-${kebab(prop)}`, prop, propValue);
        } else {
            const name = key.replace(/^--pts-lazyload-/, '');
            put(FLAT_ALIASES[name] || kebab(name), name, value);
        }
    }

    return Object.fromEntries(Object.entries(vars).map(([name, value]) => [`--${BLOCK}-${name}`, value]));
}

/** Ключ брейкпоинта: число — «экран до N px включительно», строка — медиазапрос как есть. */
export function toMediaQuery(key) {
    return /^\d+$/.test(String(key).trim()) ? `(max-width: ${String(key).trim()}px)` : String(key);
}

/**
 * Брейкпоинты темы в порядке применения. Числовые — от широкого к узкому, чтобы на маленьком экране
 * значения для меньшей ширины перекрывали значения для большей. Медиазапросы-строки — в порядке объявления, после числовых.
 */
export function breakpointsOf(theme) {
    const entries = Object.entries(theme?.breakpoints || {});
    const numeric = entries.filter(([key]) => /^\d+$/.test(key.trim())).sort(([a], [b]) => Number(b) - Number(a));
    const queries = entries.filter(([key]) => !/^\d+$/.test(key.trim()));
    return [...numeric, ...queries].map(([key, value]) => [toMediaQuery(key), value]);
}

/** CSS-переменные темы для текущего экрана: базовые значения и поверх них подходящие брейкпоинты. */
export function themeVarsFor(theme, matches = (query) => !!window.matchMedia?.(query).matches) {
    const vars = themeToCssVars(theme);
    for (const [query, part] of breakpointsOf(theme)) {
        if (matches(query)) Object.assign(vars, themeToCssVars(part));
    }
    return vars;
}
