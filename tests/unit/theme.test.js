import {afterEach, describe, expect, it, vi} from 'vitest';
import {breakpointsOf, themeToCssVars, themeVarsFor, toMediaQuery} from '../../src/theme.js';

describe('themeToCssVars', () => {
    afterEach(() => vi.restoreAllMocks());

    it('общие ключи — в переменные верхнего уровня', () => {
        expect(themeToCssVars({accent: '#f00', accentHover: '#c00', fontFamily: 'Inter'})).toEqual({
            '--pts-lazyload-accent': '#f00',
            '--pts-lazyload-accent-hover': '#c00',
            '--pts-lazyload-font-family': 'Inter',
        });
    });

    it('группы элементов — в переменные с префиксом группы', () => {
        expect(themeToCssVars({
            title: {fontSize: '28px', color: '#111'},
            button: {backgroundHover: '#000', textTransform: 'none'},
            close: {size: '44px'},
        })).toEqual({
            '--pts-lazyload-title-font-size': '28px',
            '--pts-lazyload-title-color': '#111',
            '--pts-lazyload-button-background-hover': '#000',
            '--pts-lazyload-button-text-transform': 'none',
            '--pts-lazyload-close-size': '44px',
        });
    });

    it('числа становятся пикселями, кроме безразмерных свойств', () => {
        expect(themeToCssVars({
            title: {fontSize: 28, fontWeight: 700, lineHeight: 1.1},
            close: {opacity: 0.8},
            zIndex: 9999,
        })).toEqual({
            '--pts-lazyload-title-font-size': '28px',
            '--pts-lazyload-title-font-weight': '700',
            '--pts-lazyload-title-line-height': '1.1',
            '--pts-lazyload-close-opacity': '0.8',
            '--pts-lazyload-z-index': '9999',
        });
    });

    it('короткие имена первых версий v3 продолжают работать', () => {
        expect(themeToCssVars({title: '#222', text: '#333', background: '#fff', radius: '16px', buttonRadius: 0})).toEqual({
            '--pts-lazyload-title-color': '#222',
            '--pts-lazyload-dialog-color': '#333',
            '--pts-lazyload-dialog-background': '#fff',
            '--pts-lazyload-dialog-radius': '16px',
            '--pts-lazyload-button-radius': '0px',
        });
    });

    it('длительность числом — миллисекунды, в том числе через короткое имя duration', () => {
        expect(themeToCssVars({duration: 120})).toEqual({'--pts-lazyload-animation-duration': '120ms'});
        expect(themeToCssVars({button: {transitionDuration: 200}})).toEqual({'--pts-lazyload-button-transition-duration': '200ms'});
    });

    it('пустые значения пропускаются', () => {
        expect(themeToCssVars({accent: '', title: {color: null, fontSize: undefined}})).toEqual({});
    });

    it('переменную можно задать полным именем', () => {
        expect(themeToCssVars({'--pts-lazyload-my-gap': '4px'})).toEqual({'--pts-lazyload-my-gap': '4px'});
    });

    describe('animation', () => {
        it.each([
            ['slide-up', 'translateY(16px)'],
            ['slide-down', 'translateY(-16px)'],
            ['zoom', 'scale(.92)'],
            ['fade', 'none'],
        ])('пресет %s', (type, transform) => {
            expect(themeToCssVars({animation: type})).toEqual({'--pts-lazyload-animation-transform': transform});
        });

        it('none — без анимации', () => {
            expect(themeToCssVars({animation: 'none'})).toEqual({
                '--pts-lazyload-animation-transform': 'none',
                '--pts-lazyload-animation-duration': '0s',
            });
        });

        it('объект: тип, длительность (число — мс), плавность, свой transform', () => {
            expect(themeToCssVars({animation: {type: 'zoom', duration: 200, easing: 'ease-out', transform: 'rotate(-3deg)'}})).toEqual({
                '--pts-lazyload-animation-transform': 'rotate(-3deg)',
                '--pts-lazyload-animation-duration': '200ms',
                '--pts-lazyload-animation-easing': 'ease-out',
            });
        });

        it('неизвестный тип — предупреждение, переменная не ставится', () => {
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
            expect(themeToCssVars({animation: 'spin'})).toEqual({});
            expect(warn.mock.calls[0][0]).toMatch(/spin/);
        });
    });
});

describe('брейкпоинты', () => {
    const theme = {
        title: {fontSize: 32},
        dialog: {padding: 30},
        breakpoints: {
            '(orientation: landscape)': {dialog: {padding: 10}},
            400: {title: {fontSize: 20}},
            600: {title: {fontSize: 26}, dialog: {padding: 20}},
        },
    };

    it('число — «экран до N px», строка — медиазапрос как есть', () => {
        expect(toMediaQuery(600)).toBe('(max-width: 600px)');
        expect(toMediaQuery('600')).toBe('(max-width: 600px)');
        expect(toMediaQuery('(min-width: 1200px)')).toBe('(min-width: 1200px)');
    });

    it('порядок: числовые от широкого к узкому, затем медиазапросы', () => {
        expect(breakpointsOf(theme).map(([query]) => query)).toEqual([
            '(max-width: 600px)', '(max-width: 400px)', '(orientation: landscape)',
        ]);
    });

    it('breakpoints не превращается в переменную', () => {
        expect(Object.keys(themeToCssVars(theme)).some((name) => name.includes('breakpoints'))).toBe(false);
    });

    it.each([
        ['широкий экран', [], {title: '32px', padding: '30px'}],
        ['до 600', ['(max-width: 600px)'], {title: '26px', padding: '20px'}],
        ['до 400: меньший брейкпоинт перекрывает больший', ['(max-width: 600px)', '(max-width: 400px)'], {title: '20px', padding: '20px'}],
        ['медиазапрос применяется последним', ['(max-width: 600px)', '(orientation: landscape)'], {title: '26px', padding: '10px'}],
    ])('%s', (_, matching, expected) => {
        const vars = themeVarsFor(theme, (query) => matching.includes(query));
        expect(vars['--pts-lazyload-title-font-size']).toBe(expected.title);
        expect(vars['--pts-lazyload-dialog-padding']).toBe(expected.padding);
    });
});
