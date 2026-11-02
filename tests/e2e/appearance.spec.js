import {BUTTON, MODAL, expect, humanClick, openPage, test} from './helpers.js';

const css = (page, selector, prop) => page.locator(selector).evaluate((el, p) => getComputedStyle(el)[p], prop);

test.describe('стили через theme', () => {
    test('заголовок, текст, кнопка, окно, затемнение, крестик', async ({page}) => {
        await openPage(page, {
            options: `{
                closeButton: true,
                modal: {title: 'Заголовок'},
                theme: {
                    dialog: {background: 'rgb(250, 250, 240)', padding: 40, radius: 20, width: 600},
                    overlay: {background: 'rgba(10, 20, 30, 0.8)', blur: 4},
                    title: {fontSize: 40, fontWeight: 700, color: 'rgb(200, 0, 0)'},
                    text: {fontSize: 18, color: 'rgb(0, 100, 0)'},
                    button: {background: 'rgb(0, 0, 200)', color: 'rgb(255, 255, 0)', fontSize: 20, padding: '0 50px', radius: 25, textTransform: 'none'},
                    close: {size: 48, color: 'rgb(255, 0, 255)', opacity: 1},
                },
            }`,
        });
        await expect(page.locator(MODAL)).toBeVisible();

        expect(await css(page, '.pts-lazyload__dialog', 'backgroundColor')).toBe('rgb(250, 250, 240)');
        expect(await css(page, '.pts-lazyload__dialog', 'paddingTop')).toBe('40px');
        expect(await css(page, '.pts-lazyload__dialog', 'borderTopLeftRadius')).toBe('20px');
        expect(await css(page, '.pts-lazyload__dialog', 'maxWidth')).toBe('600px');
        expect(await css(page, '.pts-lazyload__overlay', 'backgroundColor')).toBe('rgba(10, 20, 30, 0.8)');
        expect(await css(page, '.pts-lazyload__overlay', 'backdropFilter')).toBe('blur(4px)');
        expect(await css(page, '.pts-lazyload__title', 'fontSize')).toBe('40px');
        expect(await css(page, '.pts-lazyload__title', 'fontWeight')).toBe('700');
        expect(await css(page, '.pts-lazyload__title', 'color')).toBe('rgb(200, 0, 0)');
        expect(await css(page, '.pts-lazyload__text', 'fontSize')).toBe('18px');
        expect(await css(page, '.pts-lazyload__text', 'color')).toBe('rgb(0, 100, 0)');
        expect(await css(page, BUTTON, 'backgroundColor')).toBe('rgb(0, 0, 200)');
        expect(await css(page, BUTTON, 'color')).toBe('rgb(255, 255, 0)');
        expect(await css(page, BUTTON, 'paddingLeft')).toBe('50px');
        expect(await css(page, BUTTON, 'borderTopLeftRadius')).toBe('25px');
        expect(await css(page, BUTTON, 'textTransform')).toBe('none');
        expect(await css(page, '.pts-lazyload__close', 'width')).toBe('48px');
        expect(await css(page, '.pts-lazyload__close', 'color')).toBe('rgb(255, 0, 255)');
    });

    test('accent красит кнопку и ссылки, button.background важнее accent', async ({page}) => {
        await openPage(page, {
            options: `{modal: {content: '<a href="#x">ссылка</a>'}, theme: {accent: 'rgb(1, 2, 3)'}}`,
        });
        expect(await css(page, BUTTON, 'backgroundColor')).toBe('rgb(1, 2, 3)');
        expect(await css(page, '.pts-lazyload__body a', 'color')).toBe('rgb(1, 2, 3)');
    });

    test('стили через CSS продолжают работать', async ({page}) => {
        await page.addInitScript(() => document.addEventListener('DOMContentLoaded', () => {
            const style = document.createElement('style');
            style.textContent = `
                .pts-lazyload { --pts-lazyload-button-background: rgb(9, 9, 9); }
                .pts-lazyload__title { letter-spacing: 3px; }
            `;
            document.head.append(style);
        }));
        await openPage(page, {options: `{modal: {title: 'T'}}`});
        expect(await css(page, BUTTON, 'backgroundColor')).toBe('rgb(9, 9, 9)');
        expect(await css(page, '.pts-lazyload__title', 'letterSpacing')).toBe('3px');
    });

    test('мобильные значения по умолчанию не мешают значениям из theme', async ({page}) => {
        await page.setViewportSize({width: 360, height: 700});
        await openPage(page, {options: `{modal: {title: 'T'}, theme: {title: {fontSize: 20}, button: {width: 'auto'}}}`});
        expect(await css(page, '.pts-lazyload__title', 'fontSize')).toBe('20px');
        const button = await page.locator(BUTTON).boundingBox();
        expect(button.width).toBeLessThan(300);
    });
});

test.describe('тёмная тема', () => {
    const DARK_BG = 'rgb(31, 35, 41)';
    const bg = (page) => css(page, '.pts-lazyload__dialog', 'backgroundColor');

    test('colorScheme: dark', async ({page}) => {
        await openPage(page, {options: `{colorScheme: 'dark'}`});
        await expect(page.locator('.pts-lazyload')).toHaveClass(/pts-lazyload--dark/);
        expect(await bg(page)).toBe(DARK_BG);
    });

    test('colorScheme: auto следует системе и переключается на лету', async ({page}) => {
        await page.emulateMedia({colorScheme: 'light'});
        await openPage(page, {options: `{colorScheme: 'auto'}`});
        expect(await bg(page)).toBe('rgb(255, 255, 255)');

        await page.emulateMedia({colorScheme: 'dark'});
        await expect.poll(() => bg(page)).toBe(DARK_BG);

        await page.emulateMedia({colorScheme: 'light'});
        await expect.poll(() => bg(page)).toBe('rgb(255, 255, 255)');
    });

    test('setColorScheme переключает открытое окно', async ({page}) => {
        await openPage(page);
        await page.evaluate(() => window.__pts.setColorScheme('dark'));
        expect(await bg(page)).toBe(DARK_BG);
        await page.evaluate(() => window.__pts.setColorScheme('light'));
        expect(await bg(page)).toBe('rgb(255, 255, 255)');
    });

    test('themeDark; светлые цвета фона и текста из theme в тёмной теме не применяются, акцент — применяется', async ({page}) => {
        await openPage(page, {
            options: `{
                theme: {accent: 'rgb(1, 2, 3)', dialog: {background: 'rgb(255, 248, 237)', radius: 20}},
                themeDark: {title: {color: 'rgb(0, 255, 0)'}},
                modal: {title: 'T'},
            }`,
        });
        expect(await bg(page)).toBe('rgb(255, 248, 237)');

        await page.evaluate(() => window.__pts.setColorScheme('dark'));
        expect(await bg(page)).toBe(DARK_BG);
        expect(await css(page, '.pts-lazyload__dialog', 'borderTopLeftRadius')).toBe('20px');
        expect(await css(page, BUTTON, 'backgroundColor')).toBe('rgb(1, 2, 3)');
        expect(await css(page, '.pts-lazyload__title', 'color')).toBe('rgb(0, 255, 0)');
    });

    test('ссылки в тёмной теме светлее акцента', async ({page}) => {
        await openPage(page, {options: `{colorScheme: 'dark', theme: {accent: 'rgb(0, 0, 255)'}, modal: {content: '<a href="#x">ссылка</a>'}}`});
        const color = await css(page, '.pts-lazyload__body a', 'color');
        const [r, g, b] = color.match(/[\d.]+/g).slice(-3).map(Number).map((v) => (v <= 1 && color.startsWith('color(') ? v * 255 : v));
        expect(r + g + b).toBeGreaterThan(255 + 200);
    });

    test('модификатор dark из первых версий v3', async ({page}) => {
        await openPage(page, {options: `{modal: {modifier: 'dark'}}`});
        expect(await bg(page)).toBe(DARK_BG);
    });
});

test.describe('мобильные экраны', () => {
    test('окно не шире экрана минус отступы, длинная кнопка переносится', async ({page}) => {
        await page.setViewportSize({width: 320, height: 640});
        await openPage(page, {
            options: `{
                closeButton: true,
                modal: {title: 'Оченьдлинноезаголовочноесловобезпробелов', buttonText: 'Да, я согласен на обработку данных и продолжаю'},
                theme: {dialog: {width: 900, padding: 40}, button: {minWidth: 400}},
            }`,
        });
        const sizes = await page.evaluate(() => {
            const rect = (s) => document.querySelector(s).getBoundingClientRect();
            return {dialog: rect('.pts-lazyload__dialog'), button: rect('.pts-lazyload__button:not([tabindex="-1"])'),
                title: document.querySelector('.pts-lazyload__title').scrollWidth, titleBox: rect('.pts-lazyload__title').width};
        });
        expect(sizes.dialog.left).toBeGreaterThanOrEqual(16);
        expect(sizes.dialog.right).toBeLessThanOrEqual(320 - 16);
        expect(sizes.button.right).toBeLessThanOrEqual(sizes.dialog.right);
        expect(sizes.button.height).toBeGreaterThan(50);
        expect(sizes.title).toBeLessThanOrEqual(Math.ceil(sizes.titleBox));
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
    });

    test('отступ от краёв экрана настраивается', async ({page}) => {
        await page.setViewportSize({width: 360, height: 640});
        await openPage(page, {options: `{theme: {gutter: 4}}`});
        const box = await page.locator('.pts-lazyload__dialog').boundingBox();
        expect(box.x).toBe(4);
        expect(box.width).toBe(352);
    });
});

test.describe('брейкпоинты', () => {
    const OPTIONS = `{
        modal: {title: 'Заголовок'},
        theme: {
            title: {fontSize: 40},
            breakpoints: {600: {title: {fontSize: 28}, dialog: {padding: 12}}, 400: {title: {fontSize: 20}}},
        },
    }`;
    const size = (page) => css(page, '.pts-lazyload__title', 'fontSize');

    test('значения зависят от ширины экрана', async ({page}) => {
        await page.setViewportSize({width: 1000, height: 700});
        await openPage(page, {options: OPTIONS});
        expect(await size(page)).toBe('40px');
    });

    test('меньший брейкпоинт перекрывает больший, остальное наследуется', async ({page}) => {
        await page.setViewportSize({width: 360, height: 700});
        await openPage(page, {options: OPTIONS});
        expect(await size(page)).toBe('20px');
        expect(await css(page, '.pts-lazyload__dialog', 'paddingTop')).toBe('12px');
    });

    test('пересчитываются при изменении размера окна', async ({page}) => {
        await page.setViewportSize({width: 1000, height: 700});
        await openPage(page, {options: OPTIONS});
        await page.setViewportSize({width: 500, height: 700});
        await expect.poll(() => size(page)).toBe('28px');
        await page.setViewportSize({width: 1000, height: 700});
        await expect.poll(() => size(page)).toBe('40px');
    });

    test('работают и в themeDark', async ({page}) => {
        await page.setViewportSize({width: 360, height: 700});
        await openPage(page, {options: `{colorScheme: 'dark', modal: {title: 'T'}, themeDark: {breakpoints: {600: {title: {color: 'rgb(0, 200, 0)'}}}}}`});
        expect(await css(page, '.pts-lazyload__title', 'color')).toBe('rgb(0, 200, 0)');
    });
});

test.describe('модификатор inline: текст слева, кнопка справа', () => {
    const OPTIONS = `{closeButton: true, lockScroll: false, modal: {title: 'Файлы cookie', modifier: 'bottom inline'}, theme: {dialog: {width: 900}}}`;

    test('на широком экране кнопка справа от текста, крестик правее кнопки', async ({page}) => {
        await page.setViewportSize({width: 1200, height: 700});
        await openPage(page, {options: OPTIONS});
        const [text, button, close] = await Promise.all(['.pts-lazyload__body', BUTTON, '.pts-lazyload__close'].map((s) => page.locator(s).boundingBox()));
        expect(button.x).toBeGreaterThan(text.x + text.width);
        expect(close.x).toBeGreaterThan(button.x + button.width);
        expect(Math.abs((button.y + button.height / 2) - (text.y + text.height / 2))).toBeLessThan(40);
        expect(await css(page, '.pts-lazyload__body', 'textAlign')).toBe('left');
    });

    test('на телефоне кнопка под текстом на всю ширину', async ({page}) => {
        await page.setViewportSize({width: 375, height: 700});
        await openPage(page, {options: OPTIONS});
        const [text, button, dialog] = await Promise.all(['.pts-lazyload__body', BUTTON, '.pts-lazyload__dialog'].map((s) => page.locator(s).boundingBox()));
        expect(button.y).toBeGreaterThan(text.y + text.height);
        expect(button.width).toBeGreaterThan(dialog.width - 60);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
    });

    test('подтверждение работает', async ({page}) => {
        await page.setViewportSize({width: 1200, height: 700});
        await openPage(page, {options: OPTIONS});
        await humanClick(page);
        await expect.poll(() => page.evaluate(() => window.__counters)).toEqual(['counter']);
    });
});

test.describe('ссылки', () => {
    test('подчёркивание и цвет при наведении', async ({page}) => {
        await openPage(page, {
            options: `{modal: {content: '<a href="#x">ссылка</a>'}, theme: {text: {linkDecoration: 'none', linkColorHover: 'rgb(9, 8, 7)'}}}`,
        });
        const link = page.locator('.pts-lazyload__body a');
        expect(await css(page, '.pts-lazyload__body a', 'textDecorationLine')).toBe('none');
        await link.hover();
        await expect.poll(() => css(page, '.pts-lazyload__body a', 'color')).toBe('rgb(9, 8, 7)');
    });

    test('по умолчанию ссылки подчёркнуты', async ({page}) => {
        await openPage(page, {options: `{modal: {content: '<a href="#x">ссылка</a>'}}`});
        expect(await css(page, '.pts-lazyload__body a', 'textDecorationLine')).toBe('underline');
    });
});

test('autoFocus: false — окно не забирает фокус', async ({page}) => {
    await openPage(page, {options: `{autoFocus: false}`});
    await expect(page.locator(MODAL)).toBeVisible();
    expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
});

test.describe('кольцо фокуса', () => {
    test('при открытии скрыто, после нажатия клавиши видно', async ({page}) => {
        await openPage(page);
        await expect(page.locator(BUTTON)).toBeFocused();
        expect(await css(page, BUTTON, 'outlineStyle')).toBe('none');

        await page.keyboard.press('Shift');
        expect(await css(page, BUTTON, 'outlineStyle')).toBe('solid');
    });
});

test.describe('анимация появления', () => {
    test('пресет zoom', async ({page}) => {
        await openPage(page, {options: `{theme: {animation: 'zoom'}}`});
        await expect(page.locator(MODAL)).toBeVisible();
        const transform = await page.locator('.pts-lazyload__dialog').evaluate((el) =>
            getComputedStyle(el).getPropertyValue('--pts-lazyload-animation-transform').trim());
        expect(transform).toBe('scale(.92)');
    });

    test('none: окно появляется и убирается из DOM без задержки', async ({page}) => {
        await openPage(page, {options: `{theme: {animation: 'none'}}`});
        expect(await css(page, '.pts-lazyload', 'transitionDuration')).toBe('0s, 0s');
        await page.evaluate(() => window.__pts.destroy());
        await expect(page.locator('.pts-lazyload')).toHaveCount(0, {timeout: 200});
    });

    test('длительность в мс', async ({page}) => {
        await openPage(page, {options: `{theme: {animation: {duration: 120, easing: 'linear'}}}`});
        expect(await css(page, '.pts-lazyload', 'transitionDuration')).toBe('0.12s, 0s');
        expect(await css(page, '.pts-lazyload__dialog', 'transitionTimingFunction')).toBe('linear');
    });
});

test.describe('контент', () => {
    test('modal.text: абзацы и переносы, HTML экранируется', async ({page}) => {
        await openPage(page, {options: `{modal: {text: 'Первый абзац\\nвторая строка\\n\\nВторой <b>абзац</b>'}}`});
        await expect(page.locator('.pts-lazyload__text')).toHaveCount(2);
        await expect(page.locator('.pts-lazyload__text').first().locator('br')).toHaveCount(1);
        await expect(page.locator('.pts-lazyload__text').last()).toHaveText('Второй <b>абзац</b>');
    });

    test('modal.content: <template> со страницы', async ({page}) => {
        await openPage(page, {options: `{modal: {content: document.querySelector('#welcome')}}`});
        await expect(page.locator('.pts-lazyload__body p')).toHaveCount(2);
        await expect(page.getByRole('link', {name: 'ссылкой'})).toBeVisible();
    });

    test('modal.closeIcon', async ({page}) => {
        await openPage(page, {options: `{closeButton: true, modal: {closeIcon: '<svg viewBox="0 0 10 10"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor"/></svg>'}}`});
        await expect(page.locator('.pts-lazyload__close svg')).toHaveCount(1);
        await expect(page.getByRole('button', {name: 'Закрыть'})).toBeVisible();
    });
});
