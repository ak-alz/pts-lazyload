import {BUTTON, MODAL, counters, expect, humanClick, openPage, test} from './helpers.js';

// Регрессии по итогам код-ревью: каждый тест воспроизводит найденную проблему

// №1 и №2 — в unit-тестах (tests/unit/token.test.js, tests/unit/ClickGuard.test.js): там событие и домен можно задать точно

test('№3 порядок скриптов соблюдается и между разными шаблонами', async ({page}) => {
    await page.route('**/fixtures/slow.js', async (route) => {
        await new Promise((r) => setTimeout(r, 500));
        await route.continue();
    });
    await page.goto('/tests/e2e/fixtures/order-across.html');
    await humanClick(page, BUTTON, {delay: 400});
    await expect.poll(() => page.evaluate(() => window.__order)).toEqual(['внешний', 'шаблон 2', 'counters[0]', 'counters[1]']);
});

test('№4 невалидный data-area не отключает остальные счётчики', async ({page}) => {
    const warnings = [];
    page.on('console', (m) => m.type() === 'warning' && warnings.push(m.text()));
    await page.goto('/tests/e2e/fixtures/bad-area.html');
    await humanClick(page, BUTTON, {delay: 400});
    await expect.poll(() => page.evaluate(() => window.__counters)).toEqual(['плохой data-area', 'второй шаблон', 'плохой area']);
    expect(await page.evaluate(() => window.__verified)).toBe(true);
    expect(warnings.join('\n')).toContain('data-area');
});

test('№5 show() до init() не ломает init()', async ({page}) => {
    await openPage(page, {needCheck: 0});
    await expect.poll(() => counters(page)).toEqual(['counter']);

    const result = await page.evaluate(async () => {
        const pts = new PtsLazyLoad({cookieName: 'e2e_show', counters: []});
        pts.show();
        const shown = !!document.querySelector('.pts-lazyload--open');
        const events = [];
        document.addEventListener('pts-lazyload:verified', (e) => events.push(e.detail.reason));
        pts.init(0);
        await new Promise((r) => setTimeout(r, 450));
        return {shown, events, open: !!document.querySelector('.pts-lazyload--open')};
    });
    expect(result).toEqual({shown: true, events: ['no-check'], open: false});
});

test('№6 theme.duration числом — миллисекунды', async ({page}) => {
    await openPage(page, {options: `{theme: {duration: 120}}`});
    const value = await page.locator('.pts-lazyload').evaluate((el) => el.style.getPropertyValue('--pts-lazyload-animation-duration'));
    expect(value).toBe('120ms');
});

test('№7 в тёмной теме не остаются рамка и тень светлой', async ({page}) => {
    await openPage(page, {
        options: `{colorScheme: 'dark', theme: {dialog: {border: '5px solid rgb(255, 0, 0)', shadow: '0 0 0 9px rgb(255, 0, 0)'}, button: {background: 'rgb(1, 2, 3)'}}}`,
    });
    const style = await page.locator('.pts-lazyload__dialog').evaluate((el) => ({border: getComputedStyle(el).borderTopWidth, shadow: getComputedStyle(el).boxShadow}));
    expect(style.border).not.toBe('5px');
    expect(style.shadow).not.toContain('rgb(255, 0, 0)');
    // Кнопка — фирменный элемент, её цвет общий для обеих тем
    expect(await page.locator(BUTTON).evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(1, 2, 3)');
});

test('№8 autoFocus: false — Tab всё равно не уходит на страницу под окном', async ({page}) => {
    await openPage(page, {options: `{autoFocus: false}`});
    await expect(page.locator(MODAL)).toBeVisible();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement.closest('.pts-lazyload'))).toBe(true);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement.closest('.pts-lazyload'))).toBe(true);
});

test('№8 плашка снизу немодальная: без aria-modal, Tab ходит по странице', async ({page}) => {
    await openPage(page, {options: `{lockScroll: false, modal: {modifier: 'bottom'}}`});
    await expect(page.locator(MODAL)).toBeVisible();
    await expect(page.locator('.pts-lazyload')).not.toHaveAttribute('aria-modal', 'true');
    await page.locator('#page-link').focus();
    expect(await page.evaluate(() => document.activeElement.id)).toBe('page-link');
});

test('№9 после закрытия фокус возвращается туда, откуда открыли окно', async ({page}) => {
    await openPage(page, {options: `{declineButton: true, theme: {animation: 'none'}}`});
    await humanClick(page, '.pts-lazyload__decline');
    await expect(page.locator('.pts-lazyload')).toHaveCount(0);

    await page.locator('#page-link').focus();
    await page.evaluate(() => window.__pts.show());
    await expect(page.locator(BUTTON)).toBeFocused();
    await page.waitForTimeout(400);
    await page.keyboard.press('Enter');
    await expect.poll(() => counters(page)).toEqual(['counter']);
    await expect(page.locator('#page-link')).toBeFocused();
});

test('№10 конструктор не падает на большом коде', async ({page}) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/dist-site/index.html');
    await expect(page.frameLocator('#preview').locator(MODAL)).toBeVisible();
    const big = `<script>/* ${'счётчик '.repeat(30000)} */</script>`;
    await page.locator('#f-customCode').evaluate((el, value) => {
        el.value = value;
        el.dispatchEvent(new Event('input', {bubbles: true}));
    }, big);
    await page.fill('#f-title', 'После большого кода');
    await expect(page.frameLocator('#preview').locator('.pts-lazyload__title')).toHaveText('После большого кода');
    expect(errors).toEqual([]);
});
