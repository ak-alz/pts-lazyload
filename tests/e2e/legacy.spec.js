import {BUTTON, expect, humanClick, test} from './helpers.js';

const PAGE = '/tests/e2e/fixtures/legacy-v2.html';

test('конфигурация v2.1 работает без изменений', async ({page}) => {
    const warnings = [];
    page.on('console', (msg) => msg.type() === 'warning' && warnings.push(msg.text()));

    await page.goto(PAGE);
    await expect(page.locator('.pts-lazyload__text')).toHaveText('Мы используем файлы cookie на нашем сайте');
    expect(warnings.join('\n')).toMatch(/Устаревшие параметры v2\.x: cookie_name → cookieName; modalText → modal\.text; checkInternal/);

    // minDelay по умолчанию — 1200 мс
    await humanClick(page, BUTTON, {delay: 1300});
    await expect.poll(() => page.evaluate(() => window.__counters)).toEqual(['Modal open 1', 'Modal open 2']);
    expect(await page.evaluate(() => window.__ptz)).toBe(1);
    await expect(page.locator('.before-footer-scripts-place > script')).toHaveCount(1);

    const cookie = (await page.context().cookies()).find((c) => c.name === 'PTZ__VERIFIED_COOKIE_NAME');
    expect(cookie.value).toMatch(/^v3\./);
});

test('старая cookie v2.x (true) больше не пропускает', async ({page, context, baseURL}) => {
    await context.addCookies([{name: 'PTZ__VERIFIED_COOKIE_NAME', value: 'true', url: baseURL}]);
    await page.goto(PAGE);
    await expect(page.locator('.pts-lazyload--open')).toBeVisible();
});

test('init(0) из v2.x', async ({page}) => {
    await page.goto(`${PAGE}#auth`);
    await expect.poll(() => page.evaluate(() => window.__counters)).toEqual(['Modal open 1', 'Modal open 2']);
    await expect(page.locator('.pts-lazyload')).toHaveCount(0);
});
