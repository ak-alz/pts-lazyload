import {BUTTON, MODAL, counters, events, expect, getToken, humanClick, openPage, test} from './helpers.js';

const DECLINE = '.pts-lazyload__decline';

test.describe('кнопка «Только необходимые»', () => {
    test('по умолчанию её нет', async ({page}) => {
        await openPage(page);
        await expect(page.locator(DECLINE)).toHaveCount(0);
    });

    test('закрывает окно без счётчиков и токена; до закрытия вкладки окно больше не показывается', async ({page}) => {
        await openPage(page, {options: `{declineButton: true, onDismiss: (d) => __events.push('cb:dismiss:' + d.reason)}`});
        await expect(page.getByRole('button', {name: 'Только необходимые'})).toBeVisible();

        await humanClick(page, DECLINE);
        await expect(page.locator('.pts-lazyload')).toHaveCount(0);
        expect(await counters(page)).toEqual([]);
        expect(await getToken(page)).toBe(null);
        expect(await events(page)).toEqual(['show', 'dismiss:decline', 'cb:dismiss:decline']);

        await page.reload();
        await expect.poll(() => events(page)).toEqual(['blocked:declined']);
        await expect(page.locator('.pts-lazyload')).toHaveCount(0);
        expect(await counters(page)).toEqual([]);
    });

    test('declineTime 0: в новой вкладке окно снова показывается', async ({page, context}) => {
        await openPage(page, {options: `{declineButton: true}`});
        await humanClick(page, DECLINE);

        const other = await context.newPage();
        await other.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', {get: () => false}));
        await openPage(other, {options: `{declineButton: true}`});
        await expect(other.locator(MODAL)).toBeVisible();
    });

    test('declineTime в днях: отказ хранится в cookie и действует в новой вкладке', async ({page, context}) => {
        await openPage(page, {options: `{declineButton: true, declineTime: 30}`});
        await humanClick(page, DECLINE);
        const cookie = (await context.cookies()).find((c) => c.name === 'e2e_verified-declined');
        expect(cookie.value).toBe('1');
        expect(cookie.expires).toBeGreaterThan(Date.now() / 1000 + 29 * 86400);

        const other = await context.newPage();
        await other.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', {get: () => false}));
        await openPage(other, {options: `{declineButton: true, declineTime: 30}`});
        await expect.poll(() => events(other)).toEqual(['blocked:declined']);
    });

    test('show(): передумал — открыл окно ссылкой и принял; отказ снят', async ({page, context}) => {
        await openPage(page, {options: `{declineButton: true, declineTime: 30}`});
        await humanClick(page, DECLINE);
        await page.reload();
        await expect.poll(() => events(page)).toEqual(['blocked:declined']);

        await page.evaluate(() => window.__pts.show());
        await expect(page.locator(MODAL)).toBeVisible();
        await humanClick(page);
        await expect.poll(() => counters(page)).toEqual(['counter']);
        expect((await context.cookies()).find((c) => c.name === 'e2e_verified-declined')).toBeUndefined();

        await page.reload();
        await expect.poll(() => events(page)).toEqual(['verified:token', 'ptz-click']);
    });

    test('show() ничего не делает, если счётчики уже загружены', async ({page}) => {
        await openPage(page, {needCheck: 0});
        await expect.poll(() => counters(page)).toEqual(['counter']);
        await page.evaluate(() => window.__pts.show());
        await expect(page.locator('.pts-lazyload')).toHaveCount(0);
    });

    test('ловушка для ботов остаётся первой кнопкой с классом основной', async ({page}) => {
        await openPage(page, {options: `{declineButton: true}`});
        await page.waitForTimeout(400);
        await page.evaluate(() => document.querySelector('.pts-lazyload__button').click());
        expect(await events(page)).toContain('reject:honeypot');
    });

    test('intercept.decline: next() — отказ, ctx можно перехватить', async ({page}) => {
        await openPage(page, {options: `{declineButton: true, intercept: {decline: (ctx, next) => { __events.push('intercepted'); next(); }}}`});
        await humanClick(page, DECLINE);
        await expect.poll(() => events(page)).toEqual(['show', 'intercepted', 'dismiss:decline']);
    });

    test('доступна с клавиатуры', async ({page}) => {
        await openPage(page, {options: `{declineButton: true}`});
        await page.keyboard.press('Shift+Tab');
        await expect(page.locator(DECLINE)).toBeFocused();
        await page.keyboard.press('Enter');
        await expect.poll(() => events(page)).toContain('dismiss:decline');
    });

    test('в широком окне — слева от основной, кнопки делят строку', async ({page}) => {
        await page.setViewportSize({width: 1200, height: 700});
        await openPage(page, {options: `{declineButton: true, theme: {dialog: {width: 700}, animation: 'none'}}`});
        const [decline, button, actions] = await Promise.all([DECLINE, BUTTON, '.pts-lazyload__actions'].map((s) => page.locator(s).boundingBox()));
        expect(decline.x + decline.width).toBeLessThanOrEqual(button.x);
        expect(decline.y).toBe(button.y);
        expect(decline.height).toBe(button.height);
        expect(Math.round(button.x + button.width)).toBe(Math.round(actions.x + actions.width));
    });

    for (const [name, width] of [['в узком окне', 1200], ['на телефоне', 375]]) {
        test(`${name} — под основной кнопкой, той же ширины`, async ({page}) => {
            await page.setViewportSize({width, height: 700});
            await openPage(page, {options: `{declineButton: true, theme: {animation: 'none'}}`});
            const [decline, button] = await Promise.all([DECLINE, BUTTON].map((s) => page.locator(s).boundingBox()));
            expect(decline.y).toBeGreaterThan(button.y + button.height - 1);
            expect(Math.round(decline.width)).toBe(Math.round(button.width));
        });
    }
});
