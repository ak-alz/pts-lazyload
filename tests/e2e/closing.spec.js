import {BUTTON, MODAL, counters, events, expect, humanClick, openPage, test} from './helpers.js';

const CLOSE = '.pts-lazyload__close';
const ALL = '{closeButton: true, closeOnOverlay: true, closeOnEscape: true}';

/** Клик «как человек» в произвольную точку экрана. */
async function humanClickAt(page, x, y, {delay = 400} = {}) {
    await page.waitForTimeout(delay);
    await page.mouse.move(600, 300);
    await page.mouse.move(x, y, {steps: 12});
    await page.mouse.down();
    await page.mouse.up();
}

test.describe('по умолчанию окно закрывается только кнопкой', () => {
    test('крестика нет', async ({page}) => {
        await openPage(page);
        await expect(page.locator(CLOSE)).toHaveCount(0);
    });

    test('клик по оверлею ничего не делает', async ({page}) => {
        await openPage(page);
        await humanClickAt(page, 30, 30);
        await expect(page.locator(MODAL)).toBeVisible();
        expect(await events(page)).toEqual(['show']);
    });

    test('Escape ничего не делает', async ({page}) => {
        await openPage(page);
        await page.waitForTimeout(400);
        await page.keyboard.press('Escape');
        await expect(page.locator(MODAL)).toBeVisible();
        expect(await events(page)).toEqual(['show']);
    });
});

test.describe('крестик', () => {
    test('виден, подписан для скринридеров, нажатие подтверждает', async ({page}) => {
        await openPage(page, {options: ALL});
        const close = page.getByRole('button', {name: 'Закрыть'});
        await expect(close).toBeVisible();
        await expect(close).toHaveAttribute('type', 'button');

        await humanClick(page, CLOSE);
        await expect.poll(() => counters(page)).toEqual(['counter']);
        expect(await events(page)).toContain('verified:close');
    });

    test('проходит те же проверки: page.click в центр отклоняется', async ({page}) => {
        await openPage(page, {options: ALL});
        await page.waitForTimeout(400);
        await page.locator(CLOSE).click();
        expect((await events(page)).some((e) => /reject:(no-movement|center-click)/.test(e))).toBe(true);
        expect(await counters(page)).toEqual([]);
    });

    test('dispatchEvent — untrusted', async ({page}) => {
        await openPage(page, {options: ALL});
        await page.waitForTimeout(400);
        await page.locator(CLOSE).dispatchEvent('click');
        expect(await events(page)).toContain('reject:untrusted');
    });

    test('доступен с клавиатуры', async ({page}) => {
        await openPage(page, {options: '{closeButton: true}'});
        await page.waitForTimeout(400);
        await page.keyboard.press('Shift+Tab');
        await expect(page.locator(CLOSE)).toBeFocused();
        await page.keyboard.press('Enter');
        await expect.poll(() => events(page)).toContain('verified:close');
    });

    for (const [name, modal] of Object.entries({
        'заголовок': `{title: 'Добро пожаловать на наш сайт!'}`,
        'текст без заголовка': `{text: 'Мы используем файлы cookie, чтобы сайт работал лучше для вас'}`,
    })) {
        test(`на узком экране не перекрывает ${name}`, async ({page}) => {
            await page.setViewportSize({width: 320, height: 640});
            await openPage(page, {options: `{closeButton: true, modal: ${modal}}`});
            const overlap = await page.evaluate(() => {
                const close = document.querySelector('.pts-lazyload__close').getBoundingClientRect();
                const block = document.querySelector('.pts-lazyload__close + *');
                const range = document.createRange();
                range.selectNodeContents(block);
                return [...range.getClientRects()].some((r) =>
                    r.left < close.right && r.right > close.left && r.top < close.bottom && r.bottom > close.top);
            });
            expect(overlap).toBe(false);
        });
    }
});

test.describe('клик по оверлею', () => {
    test('засчитывается как подтверждение', async ({page}) => {
        await openPage(page, {options: ALL});
        await humanClickAt(page, 30, 30);
        await expect.poll(() => counters(page)).toEqual(['counter']);
        expect(await events(page)).toContain('verified:overlay');
    });

    test('клик внутри окна (не по кнопке) не подтверждает', async ({page}) => {
        await openPage(page, {options: ALL});
        const box = await page.locator('.pts-lazyload__body').boundingBox();
        await humanClickAt(page, box.x + 10, box.y + 5);
        await expect(page.locator(MODAL)).toBeVisible();
        expect(await counters(page)).toEqual([]);
    });

    test('выделение текста в окне с отпусканием на оверлее не подтверждает', async ({page}) => {
        await openPage(page, {options: ALL});
        await page.waitForTimeout(400);
        const box = await page.locator('.pts-lazyload__body').boundingBox();
        await page.mouse.move(box.x + 10, box.y + 5, {steps: 5});
        await page.mouse.down();
        await page.mouse.move(20, 20, {steps: 10});
        await page.mouse.up();
        await expect(page.locator(MODAL)).toBeVisible();
        expect(await counters(page)).toEqual([]);
    });

    test('слишком ранний клик отклоняется', async ({page}) => {
        await openPage(page, {options: `{closeOnOverlay: true, protection: {minDelay: 1500}}`});
        await humanClickAt(page, 30, 30, {delay: 0});
        expect(await events(page)).toContain('reject:too-fast');
        await expect(page.locator(MODAL)).toBeVisible();
    });

    test('page.mouse.click без движения отклоняется', async ({page}) => {
        await openPage(page, {options: ALL});
        await page.waitForTimeout(400);
        await page.mouse.click(30, 30);
        expect(await events(page)).toContain('reject:no-movement');
        expect(await counters(page)).toEqual([]);
    });

    test('в режиме bottom оверлея нет: клик проходит на страницу', async ({page}) => {
        await openPage(page, {options: `{closeOnOverlay: true, lockScroll: false, modal: {modifier: 'bottom'}}`});
        await page.waitForTimeout(400);
        const link = await page.locator('#page-link').boundingBox();
        await page.evaluate(() => document.querySelector('#page-link').addEventListener('click', (e) => {
            e.preventDefault();
            window.__pageClicked = true;
        }));
        await humanClickAt(page, link.x + 5, link.y + 5, {delay: 0});
        expect(await page.evaluate(() => window.__pageClicked)).toBe(true);
        await expect(page.locator(MODAL)).toBeVisible();
    });
});

test.describe('Escape', () => {
    test('засчитывается как подтверждение', async ({page}) => {
        await openPage(page, {options: ALL});
        await page.waitForTimeout(400);
        await page.keyboard.press('Escape');
        await expect.poll(() => counters(page)).toEqual(['counter']);
        expect(await events(page)).toContain('verified:escape');
    });

    test('слишком раннее нажатие отклоняется, повторное — засчитывается', async ({page}) => {
        await openPage(page, {options: `{closeOnEscape: true, protection: {minDelay: 800}}`});
        await page.keyboard.press('Escape');
        expect(await events(page)).toContain('reject:too-fast');
        await page.waitForTimeout(900);
        await page.keyboard.press('Escape');
        await expect.poll(() => counters(page)).toEqual(['counter']);
    });

    test('Escape из JS (dispatchEvent) — untrusted', async ({page}) => {
        await openPage(page, {options: ALL});
        await page.waitForTimeout(400);
        await page.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})));
        expect(await events(page)).toContain('reject:untrusted');
        await expect(page.locator(MODAL)).toBeVisible();
    });

    test('после ловушки Escape не помогает', async ({page}) => {
        await openPage(page, {options: ALL});
        await page.waitForTimeout(400);
        await page.evaluate(() => document.querySelector('.pts-lazyload__button').click());
        await page.keyboard.press('Escape');
        expect(await events(page)).toEqual(['show', 'reject:honeypot', 'reject:honeypot']);
    });
});

test('после подтверждения токен записан, при повторном визите окна нет', async ({page}) => {
    await openPage(page, {options: ALL});
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    await expect.poll(() => counters(page)).toEqual(['counter']);
    await page.reload();
    await expect.poll(() => events(page)).toEqual(['verified:token', 'ptz-click']);
    await expect(page.locator(BUTTON)).toHaveCount(0);
});

test('свой шаблон крестика', async ({page}) => {
    await openPage(page, {
        options: `{closeButton: true, templates: {close: ({classNames}) => '<button class="' + classNames.close + ' my-close">Не сейчас</button>'}}`,
    });
    await expect(page.locator('.my-close')).toHaveText('Не сейчас');
    await expect(page.locator('.my-close')).toHaveAttribute('aria-label', 'Закрыть');
    await humanClick(page, '.my-close');
    await expect.poll(() => events(page)).toContain('verified:close');
});
