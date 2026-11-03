import {BUTTON, HONEYPOT, MODAL, counters, expect, humanClick, openPage, test} from './helpers.js';

const CUSTOM = `{
    modal: {title: 'Привет <b>', text: 'Текст & <i>'},
    classNames: {button: 'pts-lazyload__button site-btn'},
    templates: ({escape}) => ({
        dialog: ({classNames}) => \`
            <div class="\${classNames.dialog} site-welcome">
                <img class="site-welcome__logo" alt="">
                <div class="site-welcome__content">
                    <div data-slot="title"></div>
                    <div data-slot="body"></div>
                </div>
                <div data-slot="actions"></div>
            </div>\`,
        body: ({classNames}, {text}) => \`
            <div class="\${classNames.body}">\${escape(text)} <a href="#privacy">Политика</a></div>\`,
    }),
}`;

test.describe('свои шаблоны', () => {
    test('структура окна из шаблонов, слоты заменены', async ({page}) => {
        await openPage(page, {options: CUSTOM});
        await expect(page.locator(MODAL)).toBeVisible();
        await expect(page.locator('.site-welcome > .site-welcome__logo')).toHaveCount(1);
        await expect(page.locator('.site-welcome__content > .pts-lazyload__title + .pts-lazyload__body')).toHaveCount(1);
        await expect(page.locator('.site-welcome > .pts-lazyload__actions:last-child')).toHaveCount(1);
        await expect(page.locator('[data-slot]')).toHaveCount(0);
    });

    test('данные экранируются, атрибуты доступности ставит библиотека', async ({page}) => {
        await openPage(page, {options: CUSTOM});
        await expect(page.getByRole('dialog', {name: 'Привет <b>'})).toBeVisible();
        await expect(page.locator('.pts-lazyload__body')).toContainText('Текст & <i>');
        await expect(page.locator(BUTTON)).toHaveAttribute('type', 'button');
    });

    test('ловушка построена тем же шаблоном и с тем же классом', async ({page}) => {
        await openPage(page, {options: CUSTOM});
        await expect(page.locator('.site-btn')).toHaveCount(2);
        await expect(page.locator(HONEYPOT)).toHaveClass('pts-lazyload__button site-btn');
    });

    test('Tab ходит по элементам окна и пропускает ловушку', async ({page}) => {
        await openPage(page, {options: CUSTOM});
        await expect(page.locator(BUTTON)).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(page.getByRole('link', {name: 'Политика'})).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(page.locator(BUTTON)).toBeFocused();
        await page.keyboard.press('Shift+Tab');
        await expect(page.getByRole('link', {name: 'Политика'})).toBeFocused();
    });

    test('подтверждение работает', async ({page}) => {
        await openPage(page, {options: CUSTOM});
        await humanClick(page);
        await expect.poll(() => counters(page)).toEqual(['counter']);
    });

    test('шаблон-Element с ручной вставкой кнопки', async ({page}) => {
        await openPage(page, {
            options: `{templates: ({strToEl}) => ({
                actions: ({classNames}, {button}) => {
                    const el = strToEl('<div class="' + classNames.actions + '"><p>Нажимая кнопку…</p><div class="place"></div></div>');
                    el.querySelector('.place').append(button);
                    return el;
                },
            })}`,
        });
        await expect(page.locator('.place > .pts-lazyload__aux + button')).toHaveCount(1);
        await humanClick(page);
        await expect.poll(() => counters(page)).toEqual(['counter']);
    });

    test('модификаторы попадают в шаблон root', async ({page}) => {
        await openPage(page, {options: `{modal: {modifier: 'dark bottom'}}`});
        const root = page.locator('.pts-lazyload');
        for (const cls of ['pts-lazyload--dark', 'pts-lazyload--bottom', 'pts-lazyload--open']) {
            await expect(root).toHaveClass(new RegExp(`(^| )${cls}( |$)`));
        }
    });

    test('theme задаёт CSS-переменные', async ({page}) => {
        await openPage(page, {options: `{theme: {accent: 'rgb(22, 163, 74)', radius: '16px'}}`});
        await expect(page.locator(BUTTON)).toHaveCSS('background-color', 'rgb(22, 163, 74)');
        await expect(page.locator('.pts-lazyload__dialog')).toHaveCSS('border-radius', '16px');
    });
});

test.describe('ошибка в шаблонах: окно по умолчанию, подтверждение возможно', () => {
    const cases = {
        'button — не <button>': `{templates: {button: () => '<a>OK</a>'}}`,
        'button — пустая строка': `{templates: {button: () => ''}}`,
        'исключение в шаблоне': `{templates: {dialog: () => { throw new Error('boom'); }}}`,
        'неизвестный шаблон': `{templates: {footer: () => ''}}`,
        'templates — строка': `{templates: '.selector'}`,
    };

    for (const [name, options] of Object.entries(cases)) {
        test(name, async ({page}) => {
            const errors = [];
            page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));

            await openPage(page, {options});
            await expect(page.locator('.pts-lazyload__dialog > .pts-lazyload__actions > button:last-child')).toBeVisible();
            expect(errors.join('\n')).toContain('[pts-lazyload] Ошибка в шаблонах окна');

            await humanClick(page);
            await expect.poll(() => counters(page)).toEqual(['counter']);
        });
    }
});
