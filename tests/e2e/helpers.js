import {test as base, expect} from '@playwright/test';

export {expect};

export const DAY = 864e5;
export const MODAL = '.pts-lazyload--open';
export const BUTTON = '[role="dialog"] .pts-lazyload__button:not([tabindex="-1"])';
export const HONEYPOT = '[role="dialog"] .pts-lazyload__button[tabindex="-1"]';

/**
 * Playwright выставляет navigator.webdriver, как и любой бот без маскировки.
 * В тестах его скрываем, чтобы проверять остальные уровни защиты; отдельный тест проверяет сам webdriver.
 */
export const test = base.extend({
    revealWebdriver: [false, {option: true}],
    page: async ({page, revealWebdriver}, use) => {
        if (!revealWebdriver) {
            await page.addInitScript(() => {
                Object.defineProperty(Navigator.prototype, 'webdriver', {get: () => false});
            });
        }
        await use(page);
    },
});

/**
 * Открывает фикстуру page.html с параметрами.
 * options — JS-выражение строкой, чтобы можно было передавать функции (шаблоны, колбэки).
 */
export async function openPage(page, {options = '{}', needCheck, timeShift = 0, referer, path = '/tests/e2e/fixtures/page.html'} = {}) {
    await page.addInitScript(
        ({options, needCheck, timeShift}) => {
            // Вычисляется при инициализации, когда DOM страницы уже разобран до скрипта
            window.__PTS_OPTIONS_SRC__ = options;
            if (needCheck !== undefined) window.__PTS_NEED_CHECK__ = needCheck;
            if (timeShift) {
                const realNow = Date.now;
                Date.now = () => realNow() + timeShift;
            }
        },
        {options, needCheck, timeShift},
    );
    await page.goto(path, referer ? {referer} : undefined);
}

export const events = (page) => page.evaluate(() => window.__events);
export const counters = (page) => page.evaluate(() => window.__counters);

export async function getToken(page, name = 'e2e_verified') {
    const cookie = (await page.context().cookies()).find((c) => c.name === name);
    return cookie ? decodeURIComponent(cookie.value) : null;
}

/** Ждёт minDelay и кликает, как человек: курсор приходит к кнопке плавно и попадает не в центр. */
export async function humanClick(page, selector = BUTTON, {delay = 400} = {}) {
    await page.waitForTimeout(delay);
    const box = await page.locator(selector).boundingBox();
    await page.mouse.move(5, 5);
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4, {steps: 12});
    await page.mouse.down();
    await page.mouse.up();
}
