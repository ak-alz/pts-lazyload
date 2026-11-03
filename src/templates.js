import {escapeHtml} from './utils.js';

export const CLASS_NAMES = {
    root: 'pts-lazyload',
    open: 'pts-lazyload--open',
    locked: 'pts-lazyload-locked',
    overlay: 'pts-lazyload__overlay',
    dialog: 'pts-lazyload__dialog',
    title: 'pts-lazyload__title',
    body: 'pts-lazyload__body',
    text: 'pts-lazyload__text',
    actions: 'pts-lazyload__actions',
    button: 'pts-lazyload__button',
    close: 'pts-lazyload__close',
    decline: 'pts-lazyload__decline',
    aux: 'pts-lazyload__aux',
};

/**
 * Части окна. Каждая получает ({classNames, options}, data) и возвращает HTML-строку или Element.
 * Дочерние части (например, button для actions) приходят в data готовыми элементами: шаблон может вставить их сам,
 * указать место через <div data-slot="имя"></div> или ничего не делать — тогда они добавятся в конец.
 */
export const DEFAULT_TEMPLATES = {
    root: ({classNames}, {modifiers}) =>
        `<div class="${[classNames.root, ...modifiers.map((mod) => `${classNames.root}--${mod}`)].join(' ')}"></div>`,

    overlay: ({classNames}) => `<div class="${classNames.overlay}"></div>`,

    dialog: ({classNames}) => `<div class="${classNames.dialog}"></div>`,

    title: ({classNames}, {title}) => `<div class="${classNames.title}">${escapeHtml(title)}</div>`,

    body: ({classNames}, {text, content}) => {
        const el = strToEl(`<div class="${classNames.body}"></div>`);
        if (content instanceof Node) el.append(content);
        else if (content) el.innerHTML = content;
        else el.innerHTML = textToParagraphs(text, classNames.text);
        return el;
    },

    actions: ({classNames}) => `<div class="${classNames.actions}"></div>`,

    button: ({classNames}, {text}) => `<button type="button" class="${classNames.button}">${escapeHtml(text)}</button>`,

    decline: ({classNames}, {text}) => `<button type="button" class="${classNames.decline}">${escapeHtml(text)}</button>`,

    close: ({classNames}, {label, icon}) =>
        `<button type="button" class="${classNames.close}" aria-label="${escapeHtml(label)}"><span aria-hidden="true">${icon}</span></button>`,
};

/** Пустая строка в тексте начинает новый абзац, перенос строки внутри абзаца сохраняется. */
export function textToParagraphs(text, className) {
    return String(text ?? '')
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph) => `<p class="${className}">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
        .join('');
}

/** modal.content: HTML-строка, элемент или <template> со страницы. Элемент копируется, оригинал остаётся на месте. */
export function resolveContent(content) {
    if (content instanceof HTMLTemplateElement) return document.importNode(content.content, true);
    if (content instanceof Node) return content.cloneNode(true);
    return content ? String(content) : '';
}

export function strToEl(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html).trim();
    return template.content.firstElementChild;
}

export function resolveTemplates(custom, helpers) {
    const overrides = typeof custom === 'function' ? custom(helpers) : custom;
    if (overrides === null || overrides === undefined) return DEFAULT_TEMPLATES;
    if (typeof overrides !== 'object') {
        throw new Error('templates должен быть объектом или функцией, возвращающей объект');
    }

    for (const [name, template] of Object.entries(overrides)) {
        if (!(name in DEFAULT_TEMPLATES)) throw new Error(`неизвестный шаблон «${name}»`);
        if (typeof template !== 'function') throw new Error(`шаблон «${name}» должен быть функцией`);
    }
    return {...DEFAULT_TEMPLATES, ...overrides};
}

function createBuilder(templates, context) {
    return function build(name, data = {}, children = {}) {
        const result = templates[name](context, {...data, ...children});
        if (result === null || result === undefined || result === '') return null;

        const el = typeof result === 'string' ? strToEl(result) : result;
        if (!(el instanceof Element)) {
            throw new Error(`шаблон «${name}» должен вернуть HTML-строку или Element`);
        }

        for (const [slot, child] of Object.entries(children)) {
            const placeholder = el.querySelector(`[data-slot="${slot}"]`);
            if (!child) {
                placeholder?.remove();
            } else if (!el.contains(child)) {
                if (placeholder) placeholder.replaceWith(child);
                else el.append(child);
            }
        }
        return el;
    };
}

/**
 * Собирает окно из шаблонов. Внешний вид — ответственность шаблонов,
 * поэтому всё, от чего зависит возможность подтвердиться, проверяется здесь.
 */
export function renderModal(templates, context, {modal, protection, modifiers, closeButton = false, declineButton = false}) {
    const build = createBuilder(templates, context);

    const button = build('button', {text: modal.buttonText});
    // Ловушка строится тем же шаблоном, что и настоящая кнопка, чтобы бот не мог их различить
    const honeypot = protection.honeypot ? build('button', {text: modal.buttonText}) : null;

    const decline = declineButton ? build('decline', {text: modal.declineText}) : null;
    const actions = build('actions', {}, {decline, button});
    const close = closeButton ? build('close', {label: modal.closeLabel, icon: modal.closeIcon}) : null;
    const title = modal.title ? build('title', {title: modal.title}) : null;
    const body = build('body', {text: modal.text, content: resolveContent(modal.content)});
    const dialog = build('dialog', {}, {close, title, body, actions});
    const overlay = build('overlay');
    const root = build('root', {modifiers}, {overlay, dialog});

    // Без настоящей <button> в окне посетитель не сможет подтвердиться, и счётчики не загрузятся никогда
    if (!(button instanceof HTMLButtonElement)) {
        throw new Error('шаблон «button» должен вернуть элемент <button>');
    }
    if (!root?.contains(button)) {
        throw new Error('кнопка не попала в окно: проверьте, что шаблоны вставляют дочерние элементы');
    }
    if (closeButton && !(close instanceof HTMLButtonElement && dialog.contains(close))) {
        throw new Error('шаблон «close» должен вернуть элемент <button>, и он должен попасть в окно');
    }

    if (declineButton && !(decline instanceof HTMLButtonElement && root.contains(decline))) {
        throw new Error('шаблон «decline» должен вернуть элемент <button>, и он должен попасть в окно');
    }

    return {root, dialog, button, close, decline, honeypot, title, body};
}
