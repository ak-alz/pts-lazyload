import {describe, expect, it} from 'vitest';
import {CLASS_NAMES, DEFAULT_TEMPLATES, renderModal, resolveTemplates, strToEl, textToParagraphs} from '../../src/templates.js';
import {escapeHtml} from '../../src/utils.js';

const context = {classNames: CLASS_NAMES, options: {}};
const params = (modal = {}, extra = {}) => ({
    modal: {title: '', text: 'Текст', content: '', buttonText: 'OK', closeLabel: 'Закрыть', closeIcon: '&times;', declineText: 'Нет', ...modal},
    protection: {honeypot: true},
    modifiers: [],
    ...extra,
});
const helpers = {strToEl, escape: escapeHtml, classNames: CLASS_NAMES};
const render = (custom, modal, extra) => renderModal(resolveTemplates(custom, helpers), context, params(modal, extra));

describe('renderModal: шаблоны по умолчанию', () => {
    it('собирает БЭМ-структуру окна', () => {
        const {root, button, honeypot, title} = render(null, {title: 'Заголовок'});

        expect(root.className).toBe('pts-lazyload');
        expect([...root.children].map((el) => el.className)).toEqual(['pts-lazyload__overlay', 'pts-lazyload__dialog']);

        const dialog = root.querySelector('.pts-lazyload__dialog');
        expect([...dialog.children].map((el) => el.className)).toEqual([
            'pts-lazyload__title',
            'pts-lazyload__body',
            'pts-lazyload__actions',
        ]);
        expect(title.textContent).toBe('Заголовок');
        expect(button.parentElement.className).toBe('pts-lazyload__actions');
        expect(button.textContent).toBe('OK');
        expect(honeypot.outerHTML).toBe(button.outerHTML);
    });

    it('без заголовка блок заголовка не выводится', () => {
        const {root, title} = render(null);
        expect(title).toBe(null);
        expect(root.querySelector('.pts-lazyload__title')).toBe(null);
    });

    it('без ловушки honeypot не строится', () => {
        expect(render(null, {}, {protection: {honeypot: false}}).honeypot).toBe(null);
    });

    it('модификаторы', () => {
        expect(render(null, {}, {modifiers: ['dark', 'bottom']}).root.className).toBe(
            'pts-lazyload pts-lazyload--dark pts-lazyload--bottom',
        );
    });

    it('экранирует текст, заголовок и кнопку', () => {
        const {root} = render(null, {title: '<b>t</b>', text: '<img src=x onerror=alert(1)>', buttonText: '<i>ok</i>'});
        expect(root.querySelector('b, img, i')).toBe(null);
        expect(root.querySelector('.pts-lazyload__text').textContent).toBe('<img src=x onerror=alert(1)>');
    });

    it('content вставляется как HTML вместо text', () => {
        const {root} = render(null, {content: '<a href="/privacy">Политика</a>'});
        expect(root.querySelector('.pts-lazyload__body a').getAttribute('href')).toBe('/privacy');
        expect(root.querySelector('.pts-lazyload__text')).toBe(null);
    });
});

describe('renderModal: свои шаблоны', () => {
    it('data-slot заменяется дочерней частью', () => {
        const {root} = render({
            dialog: ({classNames}) =>
                `<div class="${classNames.dialog}"><aside data-slot="actions"></aside><main data-slot="body"></main></div>`,
        });
        const dialog = root.querySelector('.pts-lazyload__dialog');
        expect([...dialog.children].map((el) => el.className)).toEqual(['pts-lazyload__actions', 'pts-lazyload__body']);
        expect(root.querySelector('[data-slot]')).toBe(null);
    });

    it('слот отсутствующей части удаляется', () => {
        const {root} = render({
            dialog: () => '<div><div data-slot="title"></div></div>',
        });
        expect(root.querySelector('[data-slot]')).toBe(null);
    });

    it('шаблон может вернуть Element и вставить часть сам', () => {
        const {root, button} = render(({strToEl}) => ({
            actions: (_, {button}) => {
                const el = strToEl('<div class="custom"><span class="place"></span></div>');
                el.querySelector('.place').append(button);
                return el;
            },
        }));
        expect(button.parentElement.className).toBe('place');
        expect(root.contains(button)).toBe(true);
    });

    it('часть, которую шаблон не разместил, добавляется в конец', () => {
        const {root} = render({dialog: () => '<div class="d"><header></header></div>'});
        const dialog = root.querySelector('.d');
        expect(dialog.lastElementChild.className).toBe('pts-lazyload__actions');
    });

    it('шаблоны получают classNames и data без экранирования', () => {
        let received;
        render({button: (ctx, data) => ((received = {ctx, data}), '<button></button>')}, {buttonText: '<b>'});
        expect(received.ctx.classNames.button).toBe('pts-lazyload__button');
        expect(received.data.text).toBe('<b>');
    });

    it('templates можно передать объектом', () => {
        const {button} = render({button: () => '<button class="obj"></button>'});
        expect(button.className).toBe('obj');
    });
});

describe('ошибки в шаблонах', () => {
    it.each([
        ['button — ссылка', {button: () => '<a>OK</a>'}, /<button>/],
        ['button — пустая строка', {button: () => ''}, /<button>/],
        ['шаблон вернул не строку и не Element', {dialog: () => 42}, /HTML-строку или Element/],
        ['исключение в шаблоне', {dialog: () => { throw new Error('boom'); }}, /boom/],
    ])('%s', (_, custom, message) => {
        expect(() => render(custom)).toThrow(message);
    });

    it.each([
        ['неизвестный шаблон', {footer: () => ''}, /неизвестный шаблон «footer»/],
        ['шаблон не функция', {button: '<button>'}, /должен быть функцией/],
        ['templates — строка', '.selector', /объектом или функцией/],
    ])('resolveTemplates: %s', (_, custom, message) => {
        expect(() => resolveTemplates(custom, helpers)).toThrow(message);
    });

    it('без своих шаблонов используются шаблоны по умолчанию', () => {
        expect(resolveTemplates(null, helpers)).toBe(DEFAULT_TEMPLATES);
        expect(resolveTemplates(() => undefined, helpers)).toBe(DEFAULT_TEMPLATES);
    });
});

describe('крестик', () => {
    it('по умолчанию не выводится', () => {
        const {root, close} = render(null);
        expect(close).toBe(null);
        expect(root.querySelector('.pts-lazyload__close')).toBe(null);
    });

    it('closeButton: первым элементом окна, с подписью для скринридеров', () => {
        const {dialog, close} = render(null, {title: 'T', closeLabel: 'Закрыть <окно>'}, {closeButton: true});
        expect(dialog.firstElementChild).toBe(close);
        expect(close.className).toBe('pts-lazyload__close');
        expect(close.getAttribute('aria-label')).toBe('Закрыть <окно>');
    });

    it('свой шаблон крестика', () => {
        const {close} = render({close: () => '<button class="x">Закрыть</button>'}, {}, {closeButton: true});
        expect(close.className).toBe('x');
    });

    it.each([
        ['ссылка вместо <button>', {close: () => '<a>×</a>'}],
        ['пустая строка', {close: () => ''}],
    ])('ошибка: %s', (_, custom) => {
        expect(() => render(custom, {}, {closeButton: true})).toThrow(/«close»/);
    });

    it('шаблон крестика не вызывается, если closeButton выключен', () => {
        expect(() => render({close: () => { throw new Error('boom'); }})).not.toThrow();
    });
});

describe('текст и контент', () => {
    it('пустая строка разделяет абзацы, перенос внутри абзаца сохраняется', () => {
        expect(textToParagraphs('Первый\nвторая строка\n\n  Второй  \n\n\n', 'c')).toBe(
            '<p class="c">Первый<br>вторая строка</p><p class="c">Второй</p>',
        );
    });

    it('абзацы экранируются', () => {
        expect(textToParagraphs('<a href="x">ссылка</a>', 'c')).toBe('<p class="c">&lt;a href=&quot;x&quot;&gt;ссылка&lt;/a&gt;</p>');
    });

    it('modal.text с абзацами', () => {
        const {root} = render(null, {text: 'Один\n\nДва'});
        expect([...root.querySelectorAll('.pts-lazyload__text')].map((p) => p.textContent)).toEqual(['Один', 'Два']);
    });

    it('modal.content — элемент: копируется, оригинал остаётся на месте', () => {
        const source = document.createElement('div');
        source.innerHTML = '<p>Абзац</p><a href="/privacy">Политика</a>';
        document.body.append(source);

        const {root} = render(null, {content: source});
        expect(root.querySelector('.pts-lazyload__body a').getAttribute('href')).toBe('/privacy');
        expect(source.isConnected).toBe(true);
        expect(source.children).toHaveLength(2);
        source.remove();
    });

    it('modal.content — <template> со страницы', () => {
        const tpl = document.createElement('template');
        tpl.innerHTML = '<p>Из шаблона</p>';
        const first = render(null, {content: tpl}).root;
        const second = render(null, {content: tpl}).root;
        expect(first.querySelector('.pts-lazyload__body').innerHTML).toBe('<p>Из шаблона</p>');
        expect(second.querySelector('.pts-lazyload__body').innerHTML).toBe('<p>Из шаблона</p>');
    });

    it('modal.closeIcon — HTML иконки', () => {
        const {close} = render(null, {closeIcon: '<svg viewBox="0 0 10 10"></svg>'}, {closeButton: true});
        expect(close.querySelector('svg')).not.toBe(null);
    });
});

describe('кнопка отказа', () => {
    it('по умолчанию не выводится', () => {
        expect(render(null).decline).toBe(null);
    });

    it('declineButton: в блоке кнопок перед основной кнопкой', () => {
        const {decline, button} = render(null, {declineText: '<b>Нет</b>'}, {declineButton: true});
        expect(decline.className).toBe('pts-lazyload__decline');
        expect(decline.textContent).toBe('<b>Нет</b>');
        expect(decline.parentElement).toBe(button.parentElement);
        expect(decline.nextElementSibling).toBe(button);
    });

    it('свой шаблон и ошибка в нём', () => {
        expect(render({decline: () => '<button class="no">Нет</button>'}, {}, {declineButton: true}).decline.className).toBe('no');
        expect(() => render({decline: () => '<a>Нет</a>'}, {}, {declineButton: true})).toThrow(/«decline»/);
    });
});
