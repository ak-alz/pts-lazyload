import {expect, humanClick, test} from './helpers.js';

const PAGE = '/tests/e2e/fixtures/counters.html';

test.beforeEach(async ({page}) => {
    await page.route('https://mc.yandex.ru/**', (route) =>
        route.fulfill({status: 200, contentType: 'text/javascript', body: 'window.__tagjs = true;'}),
    );
    await page.route('**/fixtures/slow.js', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
    });
});

test('до подтверждения код из <template> не выполняется', async ({page}) => {
    await page.goto(PAGE);
    await page.waitForTimeout(700);
    const state = await page.evaluate(() => ({
        ym: typeof window.ym,
        order: window.__order,
        counters: window.__counters,
        inPlace: document.querySelector('#in-place'),
    }));
    expect(state).toEqual({ym: 'undefined', order: undefined, counters: [], inPlace: null});
});

test.describe('init() выше шаблонов со счётчиками', () => {
    const HEAD_PAGE = '/tests/e2e/fixtures/init-above-counters.html';

    test('после клика счётчик из футера загружается', async ({page}) => {
        await page.goto(HEAD_PAGE);
        await humanClick(page);
        await expect.poll(() => page.evaluate(() => window.__counters)).toEqual(['из футера']);
    });

    test('повторный визит: счётчик из футера загружается сразу', async ({page}) => {
        await page.goto(HEAD_PAGE);
        await humanClick(page);
        await expect.poll(() => page.evaluate(() => window.__counters)).toEqual(['из футера']);

        await page.reload();
        await expect.poll(() => page.evaluate(() => window.__counters)).toEqual(['из футера']);
    });
});

test.describe('после подтверждения', () => {
    test.beforeEach(async ({page}) => {
        await page.goto(PAGE);
        await humanClick(page);
    });

    test('код Метрики без правок выполняется и загружает tag.js', async ({page}) => {
        await expect.poll(() => page.evaluate(() => window.__tagjs)).toBe(true);
        const queued = await page.evaluate(() => Array.from(window.ym.a[0]));
        expect(queued.slice(0, 2)).toEqual([12345678, 'init']);
        await expect(page.locator('script[src="https://mc.yandex.ru/metrika/tag.js"]')).toHaveCount(1);
    });

    test('без data-area код встаёт на место шаблона', async ({page}) => {
        await expect(page.locator('#before + template + #in-place + #after')).toHaveCount(1);
    });

    test('data-area: код вставляется в указанный элемент', async ({page}) => {
        await expect(page.locator('#area > script[src$="slow.js"]')).toHaveCount(1);
    });

    test('внешний скрипт без async выполняется раньше следующего за ним кода', async ({page}) => {
        await expect.poll(() => page.evaluate(() => window.__order)).toEqual(['внешний', 'inline после внешнего']);
    });

    test('коды из JS-строк (counters[].html) тоже загружаются', async ({page}) => {
        await expect.poll(() => page.evaluate(() => window.__counters)).toEqual(['строка в head', 'строка в #area']);
    });
});
