import {expect, humanClick, test} from './helpers.js';

const SITE = '/dist-site/index.html';

const preview = (page) => page.frameLocator('#preview');
const code = (page) => page.locator('#code');

test.describe('онлайн-конструктор', () => {
    test.beforeEach(async ({page}) => {
        await page.goto(SITE);
        await expect(preview(page).locator('.pts-lazyload--open')).toBeVisible();
    });

    test('по умолчанию: окно в превью и минимальный код', async ({page}) => {
        await expect(preview(page).locator('.pts-lazyload__text')).toHaveText('Мы используем файлы cookie, чтобы сайт работал корректно и был удобнее для вас. Продолжая пользоваться сайтом, вы соглашаетесь с их использованием.');
        await expect(preview(page).locator('.pts-lazyload__button:not([tabindex="-1"])')).toHaveText('Принять');
        await expect(code(page)).toContainText('new PtsLazyLoad().init();');
        await expect(code(page)).toContainText('https://cdn.jsdelivr.net/gh/ak-alz/pts-lazyload@v3.0.0/build/pts.lazyload.min.js');
    });

    test('изменения сразу видны в превью и в коде', async ({page}) => {
        await page.fill('#f-title', 'Добро пожаловать!');
        await page.check('#f-closeButton');
        await page.locator('[data-section="colors"] #f-accent').fill('#ff0000');

        await expect(preview(page).locator('.pts-lazyload__title')).toHaveText('Добро пожаловать!');
        await expect(preview(page).locator('.pts-lazyload__close')).toBeVisible();
        await expect(preview(page).locator('.pts-lazyload__button:not([tabindex="-1"])')).toHaveCSS('background-color', 'rgb(255, 0, 0)');
        await expect(code(page)).toContainText("title: 'Добро пожаловать!'");
        await expect(code(page)).toContainText('closeButton: true');
        await expect(code(page)).toContainText("accent: '#ff0000'");
    });

    test('фокус не пропадает, пока печатаешь', async ({page}) => {
        const title = page.locator('#f-title');
        await title.click();
        await page.keyboard.type('Добро пожаловать на сайт', {delay: 40});
        await expect(title).toBeFocused();
        await expect(title).toHaveValue('Добро пожаловать на сайт');
        await expect(preview(page).locator('.pts-lazyload__title')).toHaveText('Добро пожаловать на сайт');
    });

    test('формат HTML: поле заполняется примером', async ({page}) => {
        await page.locator('[data-key="textMode"][data-value="html"]').click();
        await expect(page.locator('#f-content')).toHaveValue(/<a href="\/privacy">/);
        await expect(preview(page).locator('.pts-lazyload__body a')).toHaveText('политикой конфиденциальности');
        await expect(code(page)).toContainText('content: `<p>');
    });

    test('пипетка необязательного цвета показывает реальный цвет', async ({page}) => {
        await page.locator('summary', {hasText: /^Текст$/}).click();
        await expect(page.locator('[data-role="picker"][data-key="textColor"]')).toHaveValue('#3d424b');
        await expect(page.locator('[data-role="picker"][data-key="textLinkColor"]')).toHaveValue('#0836ff');
        await page.locator('[data-section="colors"] #f-accent').fill('#ff0000');
        await expect(page.locator('[data-role="picker"][data-key="textLinkColor"]')).toHaveValue('#ff0000');
    });

    test('тема «как в системе»: переключатель в предпросмотре', async ({page}) => {
        await expect(page.locator('#scheme-toggle')).toBeHidden();
        await page.locator('[data-key="colorScheme"][data-value="auto"]').click();
        await expect(page.locator('#scheme-toggle')).toBeVisible();
        await expect(page.locator('[data-section="dark"]')).toBeVisible();

        await page.click('[data-scheme="dark"]');
        await expect(preview(page).locator('.pts-lazyload')).toHaveClass(/pts-lazyload--dark/);
        await page.click('[data-scheme="light"]');
        await expect(preview(page).locator('.pts-lazyload')).not.toHaveClass(/pts-lazyload--dark/);
        await expect(code(page)).toContainText("colorScheme: 'auto'");
    });

    test('пресет «Плашка: кнопка справа»', async ({page}) => {
        await page.locator('.chip', {hasText: 'Плашка: кнопка справа'}).click();
        await expect(preview(page).locator('.pts-lazyload')).toHaveClass(/pts-lazyload--inline/);
        await expect(preview(page).locator('.pts-lazyload')).toHaveClass(/pts-lazyload--bottom/);
        await expect(code(page)).toContainText("modifier: 'bottom inline'");
    });

    test('мобильная версия применяется в превью телефона и попадает в код', async ({page}) => {
        await page.fill('#f-title', 'Заголовок');
        await page.locator('summary', {hasText: 'Мобильная версия'}).click();
        await page.fill('#f-mobileTitleFontSize', '18');
        await expect(code(page)).toContainText('breakpoints: {');
        await expect(code(page)).toContainText('575: {');
        await expect(preview(page).locator('.pts-lazyload__title')).toHaveCSS('font-size', '32px');

        await page.click('[data-device="mobile"]');
        await expect(preview(page).locator('.pts-lazyload__title')).toHaveCSS('font-size', '18px');
    });

    test('ползунок размера заголовка', async ({page}) => {
        await page.fill('#f-title', 'T');
        await page.locator('summary', {hasText: 'Заголовок'}).click();
        await page.locator('#f-titleFontSize').fill('48');
        await expect(preview(page).locator('.pts-lazyload__title')).toHaveCSS('font-size', '48px');
        await expect(page.locator('[data-output="titleFontSize"]')).toHaveText('48 px');
        await expect(code(page)).toContainText('fontSize: 48');
    });

    test('настройки крестика появляются только с крестиком', async ({page}) => {
        await expect(page.locator('[data-section="close"]')).toBeHidden();
        await page.check('#f-closeButton');
        await expect(page.locator('[data-section="close"]')).toBeVisible();
    });

    test('счётчики: Метрика, GA4, свой код; ошибка в номере', async ({page}) => {
        await page.fill('#f-metrikaId', '12ab');
        await expect(page.locator('[data-error="metrikaId"]')).toContainText('только цифры');
        await expect(code(page)).toContainText('Вставьте сюда код счётчика');

        await page.fill('#f-metrikaId', '12345678');
        await page.uncheck('#f-metrikaWebvisor');
        await page.fill('#f-gaId', 'G-TEST1234');
        await page.fill('#f-customCode', '<script>console.log("pixel")</script>');

        await expect(page.locator('[data-error="metrikaId"]')).toBeEmpty();
        await expect(code(page)).toContainText('ym(12345678, "init"');
        await expect(code(page)).toContainText('webvisor:false');
        await expect(code(page)).toContainText("gtag('config', 'G-TEST1234')");
        await expect(code(page)).toContainText('console.log("pixel")');
    });

    test('готовый стиль меняет оформление, но сохраняет счётчики', async ({page}) => {
        await page.fill('#f-metrikaId', '12345678');
        await page.locator('.chip', {hasText: 'Тёплый'}).click();
        await expect(preview(page).locator('.pts-lazyload__title')).toHaveText('Вам есть 18 лет?');
        await expect(page.locator('#f-metrikaId')).toHaveValue('12345678');
        await expect(code(page)).toContainText('ym(12345678');
    });

    test('ссылка на настройки восстанавливает их', async ({page, context}) => {
        await page.fill('#f-title', 'Из ссылки');
        await page.fill('#f-metrikaId', '87654321');
        await expect(page).toHaveURL(/#s=/);
        const url = page.url();

        const other = await context.newPage();
        await other.addInitScript(() => localStorage.clear());
        await other.goto(url);
        await expect(other.locator('#f-title')).toHaveValue('Из ссылки');
        await expect(other.locator('#f-metrikaId')).toHaveValue('87654321');
        await expect(other.frameLocator('#preview').locator('.pts-lazyload__title')).toHaveText('Из ссылки');
    });

    test('сбросить всё', async ({page}) => {
        await page.fill('#f-title', 'X');
        await page.click('#reset');
        await expect(page.locator('#f-title')).toHaveValue('');
        await expect(code(page)).toContainText('new PtsLazyLoad().init();');
    });

    test('вкладка «Только настройки»', async ({page}) => {
        await page.fill('#f-buttonText', 'Согласен');
        await page.click('[data-tab="options"]');
        await expect(code(page)).toHaveText(/^new PtsLazyLoad\(\{[\s\S]*buttonText: 'Согласен'[\s\S]*\}\)\.init\(\);$/);
    });

    test('в превью работает защита и подтверждение', async ({page}) => {
        const frame = page.frame({url: /preview\.html/});
        await frame.waitForTimeout(1300);
        const box = await preview(page).locator('.pts-lazyload__button:not([tabindex="-1"])').boundingBox();
        await page.mouse.move(box.x - 50, box.y - 50);
        await page.mouse.move(box.x + 20, box.y + 15, {steps: 10});
        await page.mouse.down();
        await page.mouse.up();
        await expect(preview(page).locator('#toast')).toContainText('Подтверждено');
    });
});

test('сгенерированный код работает на сайте', async ({page, baseURL}) => {
    await page.goto(SITE);
    await page.fill('#f-title', 'Сгенерировано');
    await page.check('#f-closeButton');
    await page.fill('#f-metrikaId', '12345678');
    await page.selectOption('#assets', 'local');
    const snippet = (await code(page).textContent()).replaceAll('/libs/pts-lazyload/', '/build/');

    await page.route('https://mc.yandex.ru/**', (route) =>
        route.fulfill({status: 200, contentType: 'text/javascript', body: 'window.__tagjs = true;'}));
    await page.route(`${baseURL}/generated.html`, (route) =>
        route.fulfill({contentType: 'text/html', body: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><p>Сайт</p>\n${snippet}\n</body></html>`}));

    await page.goto(`${baseURL}/generated.html`);
    await expect(page.locator('.pts-lazyload__title')).toHaveText('Сгенерировано');
    await expect(page.locator('.pts-lazyload__close')).toBeVisible();
    expect(await page.evaluate(() => typeof window.ym)).toBe('undefined');

    await humanClick(page, '.pts-lazyload__button:not([tabindex="-1"])', {delay: 1300});
    await expect.poll(() => page.evaluate(() => window.__tagjs)).toBe(true);
    expect(await page.evaluate(() => Array.from(window.ym.a[0]).slice(0, 2))).toEqual([12345678, 'init']);

    const cookie = (await page.context().cookies()).find((c) => c.name === 'pts-lazyload-verified');
    expect(cookie.value).toMatch(/^v3\./);
});
