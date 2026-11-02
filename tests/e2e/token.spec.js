import {DAY, MODAL, counters, events, expect, getToken, humanClick, openPage, test} from './helpers.js';

async function confirm(page, options) {
    await openPage(page, {options});
    await humanClick(page);
    await expect.poll(() => counters(page)).toEqual(['counter']);
}

test.describe('токен подтверждения', () => {
    test('после подтверждения записывается подписанный токен на cookieTime дней', async ({page}) => {
        await confirm(page);
        const cookie = (await page.context().cookies()).find((c) => c.name === 'e2e_verified');
        expect(decodeURIComponent(cookie.value)).toMatch(/^v3\.[0-9a-z]+\.[0-9a-z]+\.[0-9a-z]+$/);
        expect(cookie.sameSite).toBe('Lax');
        expect(cookie.path).toBe('/');
        const days = (cookie.expires * 1000 - Date.now()) / DAY;
        expect(days).toBeGreaterThan(364);
        expect(days).toBeLessThanOrEqual(365);

        const stored = await page.evaluate(() => localStorage.getItem('e2e_verified'));
        expect(stored).toBe(decodeURIComponent(cookie.value));
    });

    test('повторный визит: без окна, счётчики сразу', async ({page}) => {
        await confirm(page);
        await page.reload();
        await expect.poll(() => counters(page)).toEqual(['counter']);
        await expect(page.locator('.pts-lazyload')).toHaveCount(0);
        expect(await events(page)).toEqual(['verified:token', 'ptz-click']);
    });

    test('cookieTime: нечисловое значение не превращает cookie в сессионную', async ({page}) => {
        await confirm(page, `{cookieTime: '1 год'}`);
        const cookie = (await page.context().cookies()).find((c) => c.name === 'e2e_verified');
        expect(cookie.expires).toBeGreaterThan(Date.now() / 1000 + 364 * 86400);
    });

    test('cookie удалили — токен восстанавливается из localStorage', async ({page, context}) => {
        await confirm(page);
        const token = await getToken(page);
        await context.clearCookies();
        await page.reload();
        await expect.poll(() => counters(page)).toEqual(['counter']);
        expect(await getToken(page)).toBe(token);
    });

    test('localStorage очистили — хватает cookie', async ({page}) => {
        await confirm(page);
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await expect.poll(() => counters(page)).toEqual(['counter']);
    });

    test('токен истекает через cookieTime дней', async ({page}) => {
        await confirm(page, '{cookieTime: 30}');
        await openPage(page, {options: '{cookieTime: 30}', timeShift: 31 * DAY});
        await expect(page.locator(MODAL)).toBeVisible();
        expect(await counters(page)).toEqual([]);
    });

    test('скользящий срок: через сутки токен перевыпускается', async ({page}) => {
        await confirm(page);
        const first = await getToken(page);

        await page.reload();
        await expect.poll(() => counters(page)).toEqual(['counter']);
        expect(await getToken(page)).toBe(first);

        await openPage(page, {timeShift: 2 * DAY});
        await expect.poll(() => counters(page)).toEqual(['counter']);
        const renewed = await getToken(page);
        expect(renewed).not.toBe(first);
        expect(parseInt(renewed.split('.')[1], 36)).toBeGreaterThan(parseInt(first.split('.')[1], 36) + DAY);
    });

    test('смена salt сбрасывает подтверждение', async ({page}) => {
        await confirm(page);
        await openPage(page, {options: `{salt: 'new-salt'}`});
        await expect(page.locator(MODAL)).toBeVisible();
    });
});

test.describe('подделка токена', () => {
    test.beforeEach(async ({context, baseURL}) => {
        await context.addCookies([{name: 'e2e_verified', value: 'true', url: baseURL}]);
    });

    test('cookie=true (как в v2.x) не пропускает', async ({page}) => {
        await openPage(page);
        await expect(page.locator(MODAL)).toBeVisible();
        expect(await counters(page)).toEqual([]);
    });

    test('токен с чужой подписью не пропускает', async ({page, context, baseURL}) => {
        await context.addCookies([{name: 'e2e_verified', value: 'v3.mvzh5bhi.1x3qwn28gzpko.132h70ntzg6', url: baseURL}]);
        await openPage(page);
        await expect(page.locator(MODAL)).toBeVisible();
    });

    test('поддельное значение в localStorage не пропускает', async ({page}) => {
        await page.addInitScript(() => localStorage.setItem('e2e_verified', 'v3.abc.def.ghi'));
        await openPage(page);
        await expect(page.locator(MODAL)).toBeVisible();
    });
});
