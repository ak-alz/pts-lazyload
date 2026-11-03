import {describe, expect, it} from 'vitest';
import {buildOptions, buildSnippet, initCall, toJs} from '../../site/src/codegen.js';
import {countersFromState, gaSnippet, isGaId, isMetrikaId, metrikaSnippet} from '../../site/src/counters.js';
import {DEFAULT_STATE, FIELDS, PRESETS} from '../../site/src/schema.js';
import {DEFAULTS} from '../../src/defaults.js';
import {normalizeOptions} from '../../src/options.js';

const get = (obj, path) => path.split('.').reduce((node, key) => node?.[key], obj);

describe('схема конструктора', () => {
    it('значения по умолчанию в конструкторе совпадают с библиотекой', () => {
        for (const field of FIELDS) {
            if (!field.path || /^theme(Dark)?\./.test(field.path)) continue;
            expect([field.key, field.default]).toEqual([field.key, get(DEFAULTS, field.path)]);
        }
    });

    it('у полей уникальные ключи', () => {
        const keys = FIELDS.map((field) => field.key);
        expect(new Set(keys).size).toBe(keys.length);
    });

    it('пресеты ссылаются только на существующие поля', () => {
        for (const preset of Object.values(PRESETS)) {
            for (const key of Object.keys(preset.state)) expect(DEFAULT_STATE).toHaveProperty(key);
        }
    });
});

describe('buildOptions', () => {
    it('без изменений — пустые параметры', () => {
        expect(buildOptions(DEFAULT_STATE)).toEqual({});
        expect(initCall(buildOptions(DEFAULT_STATE))).toBe('new PtsLazyLoad().init();');
    });

    it('попадает только изменённое', () => {
        expect(buildOptions({title: 'Привет', closeButton: true, accent: '#ff0000', titleFontSize: 28})).toEqual({
            modal: {title: 'Привет'},
            closeButton: true,
            theme: {accent: '#ff0000', title: {fontSize: 28}},
        });
    });

    it('режим HTML: content вместо text', () => {
        expect(buildOptions({textMode: 'html', text: 'не попадёт', content: '<p>a</p>'})).toEqual({modal: {content: '<p>a</p>'}});
    });

    it('режим HTML с пустым полем — текст по умолчанию', () => {
        expect(buildOptions({textMode: 'html', content: '  '})).toEqual({});
    });

    it('текст слева, кнопка справа', () => {
        expect(buildOptions({bottom: true, inline: true})).toEqual({modal: {modifier: 'bottom inline'}});
    });

    it('мобильная версия — брейкпоинт темы', () => {
        expect(buildOptions({mobileTitleFontSize: 22, mobileGutter: 8, mobileButtonFullWidth: false})).toEqual({
            theme: {breakpoints: {575: {gutter: 8, title: {fontSize: 22}, button: {width: 'auto'}}}},
        });
        expect(buildOptions({mobileBreakpoint: 700, mobileTextFontSize: 14})).toEqual({
            theme: {breakpoints: {700: {text: {fontSize: 14}}}},
        });
        expect(buildOptions({mobileBreakpoint: 700})).toEqual({});
    });

    it('кнопка «Только необходимые»: текст и срок — только вместе с кнопкой', () => {
        expect(buildOptions({declineText: 'Нет', declineTime: 30})).toEqual({});
        expect(buildOptions({declineButton: true, declineText: 'Нет', declineTime: 30})).toEqual({
            declineButton: true,
            declineTime: 30,
            modal: {declineText: 'Нет'},
        });
    });

    it('вид кнопки отказа', () => {
        expect(buildOptions({declineStyle: 'filled'})).toEqual({});
        expect(buildOptions({declineButton: true, declineStyle: 'text', declineColor: '#ff0000'})).toEqual({
            declineButton: true,
            theme: {decline: {color: '#ff0000', border: 'none'}},
        });
        expect(buildOptions({declineButton: true, declineStyle: 'filled'}).theme.decline).toEqual({
            background: 'rgba(127, 127, 127, .12)', backgroundHover: 'rgba(127, 127, 127, .2)', border: 'none',
        });
    });

    it('плашка снизу', () => {
        expect(buildOptions({bottom: true, lockScroll: false})).toEqual({lockScroll: false, modal: {modifier: 'bottom'}});
    });

    it('тема и цвета тёмной темы', () => {
        expect(buildOptions({colorScheme: 'auto', darkDialogBackground: '#000000', darkAccent: '#ff00ff'})).toEqual({
            colorScheme: 'auto',
            themeDark: {dialog: {background: '#000000'}, accent: '#ff00ff'},
        });
    });

    it('скрытые поля не попадают: крестик выключен, светлая тема', () => {
        expect(buildOptions({closeSize: 48, closeLabel: 'X'})).toEqual({});
        expect(buildOptions({darkDialogBackground: '#000000'})).toEqual({});
    });

    it('подчёркивание ссылок и отступ от краёв', () => {
        expect(buildOptions({textLinkUnderline: false, gutter: 8})).toEqual({
            theme: {gutter: 8, text: {linkDecoration: 'none'}},
        });
    });

    it('отступ кнопки и анимация', () => {
        expect(buildOptions({buttonPaddingX: 40})).toEqual({theme: {button: {padding: '8px 40px'}}});
        expect(buildOptions({animationType: 'zoom'})).toEqual({theme: {animation: 'zoom'}});
        expect(buildOptions({animationDuration: 500, animationEasing: 'linear'})).toEqual({
            theme: {animation: {duration: 500, easing: 'linear'}},
        });
        expect(buildOptions({animationType: 'none', animationDuration: 500})).toEqual({theme: {animation: 'none'}});
    });

    it('результат понимает библиотека', () => {
        const options = normalizeOptions(buildOptions({...PRESETS.warm.state}));
        expect(options.modal.title).toBe('Вам есть 18 лет?');
        expect(options.theme.animation.type).toBe('slide-down');
    });
});

describe('toJs', () => {
    it('ключи без кавычек, строки в одинарных', () => {
        expect(toJs({a: 1, 'b-c': 'x', d: {e: true}})).toBe(`{
    a: 1,
    'b-c': 'x',
    d: {
        e: true,
    },
}`);
    });

    it('экранирует кавычки и закрывающий script', () => {
        expect(toJs("It's </script>")).toBe("'It\\'s <\\/script>'");
    });

    it('многострочный текст — шаблонной строкой', () => {
        expect(toJs('a\n\nb `c` ${d}')).toBe('`a\n    \n    b \\`c\\` \\${d}`');
    });

    it('результат — корректный JS, который даёт те же данные', () => {
        const value = {modal: {text: 'Строка 1\n\nСтрока 2', content: '<p>It\'s</p></script>'}, theme: {title: {fontSize: 28}}};
        const parsed = new Function(`return ${toJs(value)};`)();
        expect(parsed.theme).toEqual(value.theme);
        expect(parsed.modal.content).toBe(value.modal.content);
        expect(parsed.modal.text.replace(/\s+/g, ' ')).toBe(value.modal.text.replace(/\s+/g, ' '));
    });
});

describe('счётчики', () => {
    it.each([['12345678', true], ['1234', false], ['12a45678', false], ['', false]])('isMetrikaId(%s)', (id, ok) => {
        expect(isMetrikaId(id)).toBe(ok);
    });

    it.each([['G-AB12CD34EF', true], ['g-ab12cd34', true], ['UA-12345-1', false], ['G-', false]])('isGaId(%s)', (id, ok) => {
        expect(isGaId(id)).toBe(ok);
    });

    it('код Метрики с номером и настройками', () => {
        const code = metrikaSnippet('12345678', {webvisor: false});
        expect(code).toContain('ym(12345678, "init"');
        expect(code).toContain('webvisor:false');
        expect(code).toContain('clickmap:true');
        expect(code).toContain('https://mc.yandex.ru/watch/12345678');
    });

    it('код GA4', () => {
        expect(gaSnippet('G-TEST1234')).toContain("gtag('config', 'G-TEST1234')");
    });

    it('некорректные номера пропускаются, свой код — как есть', () => {
        expect(countersFromState({metrikaId: 'abc', gaId: 'UA-1', customCode: '  <script>x()</script>  '})).toEqual(['<script>x()</script>']);
    });
});

describe('buildSnippet', () => {
    it('CDN с версией, шаблоны счётчиков и вызов', () => {
        const code = buildSnippet({...DEFAULT_STATE, metrikaId: '12345678', gaId: 'G-TEST1234'}, {version: '3.0.0'});
        expect(code).toContain('https://cdn.jsdelivr.net/gh/ak-alz/pts-lazyload@v3.0.0/build/pts.lazyload.min.css');
        expect(code).toContain('https://cdn.jsdelivr.net/gh/ak-alz/pts-lazyload@v3.0.0/build/pts.lazyload.min.js');
        expect(code.match(/<template data-pts-lazyload>/g)).toHaveLength(2);
        expect(code).toContain('new PtsLazyLoad().init();');
    });

    it('файлы со своего сервера', () => {
        const code = buildSnippet(DEFAULT_STATE, {version: '3.0.0', assets: 'local', assetsPath: '/static/pts'});
        expect(code).toContain('href="/static/pts/pts.lazyload.min.css"');
        expect(code).toContain('src="/static/pts/pts.lazyload.min.js"');
    });

    it('без счётчиков — шаблон-заготовка', () => {
        expect(buildSnippet(DEFAULT_STATE, {version: '3.0.0'})).toContain('Вставьте сюда код счётчика');
    });
});
