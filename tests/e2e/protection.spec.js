import {BUTTON, HONEYPOT, MODAL, counters, events, expect, humanClick, openPage, test} from './helpers.js';

const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

test.describe('обычный посетитель', () => {
    test('видит окно, счётчики не загружены до подтверждения', async ({page}) => {
        await openPage(page);
        await expect(page.locator(MODAL)).toBeVisible();
        expect(await counters(page)).toEqual([]);
        expect(await events(page)).toEqual(['show']);
    });

    test('клик мышью подтверждает: окно закрывается, счётчики загружаются', async ({page}) => {
        await openPage(page);
        await humanClick(page);
        await expect(page.locator('.pts-lazyload')).toHaveCount(0);
        expect(await counters(page)).toEqual(['counter']);
        expect(await events(page)).toEqual(['show', 'verified:click', 'ptz-click']);
    });

    test('подтверждение с клавиатуры: фокус на кнопке, Enter', async ({page}) => {
        await openPage(page);
        await expect(page.locator(BUTTON)).toBeFocused();
        await page.waitForTimeout(400);
        await page.keyboard.press('Enter');
        await expect.poll(() => counters(page)).toEqual(['counter']);
    });

    test('подтверждение с клавиатуры: пробел', async ({page}) => {
        await openPage(page);
        await page.waitForTimeout(400);
        await page.keyboard.press('Space');
        await expect.poll(() => counters(page)).toEqual(['counter']);
    });

    test('повторный клик после слишком раннего засчитывается', async ({page}) => {
        await openPage(page, {options: '{protection: {minDelay: 800}}'});
        await humanClick(page, BUTTON, {delay: 0});
        expect(await events(page)).toContain('reject:too-fast');
        await expect(page.locator(MODAL)).toBeVisible();

        await humanClick(page, BUTTON, {delay: 900});
        await expect.poll(() => counters(page)).toEqual(['counter']);
    });

    test('init(0): проверка не нужна, счётчики сразу', async ({page}) => {
        await openPage(page, {needCheck: 0});
        await expect.poll(() => counters(page)).toEqual(['counter']);
        await expect(page.locator('.pts-lazyload')).toHaveCount(0);
        expect(await events(page)).toEqual(['verified:no-check', 'ptz-click']);
    });

    test('страница под окном недоступна для Tab', async ({page}) => {
        await openPage(page);
        await page.keyboard.press('Tab');
        await expect(page.locator(BUTTON)).toBeFocused();
        await page.keyboard.press('Shift+Tab');
        await expect(page.locator(BUTTON)).toBeFocused();
    });

    test('без заголовка окно подписано для скринридеров', async ({page}) => {
        await expect(page.getByRole('dialog', {name: 'Использование файлов cookie'})).toHaveCount(0);
        await openPage(page);
        await expect(page.getByRole('dialog', {name: 'Использование файлов cookie'})).toBeVisible();
    });

    test('доступность: role, aria-modal, подпись', async ({page}) => {
        await openPage(page, {options: `{modal: {title: 'Добро пожаловать'}}`});
        const dialog = page.getByRole('dialog', {name: 'Добро пожаловать'});
        await expect(dialog).toHaveAttribute('aria-modal', 'true');
        await expect(page.getByRole('button', {name: 'Принять'})).toHaveCount(1);
    });

    test('прокрутка страницы заблокирована, пока открыто окно', async ({page}) => {
        await openPage(page);
        await expect(page.locator('html')).toHaveClass(/pts-lazyload-locked/);
        await humanClick(page);
        await expect(page.locator('html')).not.toHaveClass(/pts-lazyload-locked/);
    });
});

test.describe('мобильный посетитель', () => {
    test.use({hasTouch: true, isMobile: true, viewport: {width: 390, height: 844}});

    test('тап подтверждает', async ({page}) => {
        await openPage(page);
        await page.waitForTimeout(400);
        await page.locator(BUTTON).tap();
        await expect.poll(() => counters(page)).toEqual(['counter']);
    });
});

test.describe('автоматизация', () => {
    test('element.click() попадает в ловушку, окно остаётся навсегда', async ({page}) => {
        await openPage(page);
        await page.waitForTimeout(400);
        await page.evaluate(() => document.querySelector('.pts-lazyload__button').click());
        expect(await events(page)).toContain('reject:honeypot');

        await humanClick(page);
        await expect(page.locator(MODAL)).toBeVisible();
        expect(await counters(page)).toEqual([]);
        expect((await events(page)).filter((e) => e === 'reject:honeypot')).toHaveLength(2);
    });

    test('ловушка стоит в DOM раньше настоящей кнопки и выглядит так же', async ({page}) => {
        await openPage(page);
        const [first, second] = await page.locator('.pts-lazyload__button').evaluateAll((els) => els.map((el) => el.outerHTML));
        expect(first).toContain('tabindex="-1"');
        expect(first.replace(' tabindex="-1"', '')).toBe(second);
        await expect(page.locator(HONEYPOT)).not.toBeInViewport();
    });

    test('dispatchEvent(click) по настоящей кнопке — untrusted', async ({page}) => {
        await openPage(page);
        await page.waitForTimeout(400);
        await page.locator(BUTTON).dispatchEvent('click');
        expect(await events(page)).toContain('reject:untrusted');
        expect(await counters(page)).toEqual([]);
    });

    test('мгновенный клик после появления окна — too-fast', async ({page}) => {
        await openPage(page, {options: '{protection: {minDelay: 1200}}'});
        await page.locator(BUTTON).click();
        expect(await events(page)).toContain('reject:too-fast');
        expect(await counters(page)).toEqual([]);
    });

    test('page.click() Playwright (курсор телепортируется в центр) отклоняется', async ({page}) => {
        await openPage(page);
        await page.waitForTimeout(400);
        await page.locator(BUTTON).click();
        expect((await events(page)).some((e) => /reject:(no-movement|center-click)/.test(e))).toBe(true);
        expect(await counters(page)).toEqual([]);
    });

    test('клик в центр даже после движения мыши отклоняется', async ({page}) => {
        await openPage(page);
        await page.waitForTimeout(400);
        const box = await page.locator(BUTTON).boundingBox();
        await page.mouse.move(5, 5);
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {steps: 10});
        await page.mouse.down();
        await page.mouse.up();
        expect(await events(page)).toContain('reject:center-click');
    });

    test('проверки клика можно отключить', async ({page}) => {
        await openPage(page, {options: '{protection: {requirePointerMovement: false, rejectCenterClick: false}}'});
        await page.waitForTimeout(400);
        await page.locator(BUTTON).click();
        await expect.poll(() => counters(page)).toEqual(['counter']);
    });

    test.describe('navigator.webdriver не скрыт', () => {
        test.use({revealWebdriver: true});

        test('окна и счётчиков нет', async ({page}) => {
            await openPage(page);
            await expect(page.locator('.pts-lazyload')).toHaveCount(0);
            expect(await counters(page)).toEqual([]);
            expect(await events(page)).toEqual(['blocked:automation']);
        });

        test('detectWebdriver: false — окно показывается', async ({page}) => {
            await openPage(page, {options: '{protection: {detectWebdriver: false}}'});
            await expect(page.locator(MODAL)).toBeVisible();
        });
    });

    test.describe('HeadlessChrome в User-Agent', () => {
        test.use({userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0.0.0 Safari/537.36'});

        test('окна и счётчиков нет', async ({page}) => {
            await openPage(page);
            expect(await events(page)).toEqual(['blocked:automation']);
        });
    });
});

test.describe('поисковые роботы и подмена User-Agent', () => {
    test.use({userAgent: GOOGLEBOT});

    test('по умолчанию: без окна и без счётчиков', async ({page}) => {
        await openPage(page);
        await expect(page.locator('.pts-lazyload')).toHaveCount(0);
        expect(await counters(page)).toEqual([]);
        expect(await events(page)).toEqual(['blocked:search-bot']);
    });

    test("botBehavior: 'load' — счётчики без окна, как в v2.x", async ({page}) => {
        await openPage(page, {options: `{botBehavior: 'load'}`});
        await expect.poll(() => counters(page)).toEqual(['counter']);
        expect(await events(page)).toEqual(['verified:search-bot', 'ptz-click']);
    });
});

test.describe('переход из поиска', () => {
    const YANDEX = 'https://yandex.ru/search/?text=купить окна';

    test('по умолчанию окно показывается', async ({page}) => {
        await openPage(page, {referer: YANDEX});
        await expect(page.locator(MODAL)).toBeVisible();
        expect(await counters(page)).toEqual([]);
    });

    test('skipForSearchVisitors: счётчики без окна', async ({page}) => {
        await openPage(page, {referer: YANDEX, options: '{skipForSearchVisitors: true}'});
        await expect.poll(() => counters(page)).toEqual(['counter']);
        expect(await events(page)).toContain('verified:search-referrer');
    });

    test('skipForSearchVisitors: поддомен-подделка не считается поисковиком', async ({page}) => {
        await openPage(page, {referer: 'https://yandex.ru.evil.com/', options: '{skipForSearchVisitors: true}'});
        await expect(page.locator(MODAL)).toBeVisible();
    });
});

test.describe('события и колбэки', () => {
    test('колбэки вызываются вместе с событиями', async ({page}) => {
        await openPage(page, {
            options: `{
                onShow: () => __events.push('cb:show'),
                onReject: (d) => __events.push('cb:reject:' + d.reason),
                onVerify: (d) => __events.push('cb:verify:' + d.reason),
            }`,
        });
        await page.locator(BUTTON).dispatchEvent('click');
        await humanClick(page);
        await expect.poll(() => events(page)).toEqual([
            'show', 'cb:show', 'reject:untrusted', 'cb:reject:untrusted', 'verified:click', 'cb:verify:click', 'ptz-click',
        ]);
    });

    test('ошибка в колбэке не ломает загрузку счётчиков', async ({page}) => {
        await openPage(page, {options: `{onVerify: () => { throw new Error('boom'); }}`});
        await humanClick(page);
        await expect.poll(() => counters(page)).toEqual(['counter']);
    });

    test('legacyEvent: false — без ptz-click', async ({page}) => {
        await openPage(page, {options: '{legacyEvent: false}'});
        await humanClick(page);
        await expect.poll(() => events(page)).toEqual(['show', 'verified:click']);
    });
});
