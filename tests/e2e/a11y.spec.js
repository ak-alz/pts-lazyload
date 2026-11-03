import AxeBuilder from '@axe-core/playwright';
import {HtmlValidate} from 'html-validate';
import {BUTTON, MODAL, expect, openPage, test} from './helpers.js';

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const CONTENT = `'<p>Мы используем cookie.</p><p>Подробнее — в <a href="/privacy">политике конфиденциальности</a>.</p>'`;

const VARIANTS = {
    'по умолчанию': '{}',
    'заголовок, HTML, крестик, отказ': `{modal: {title: 'Файлы cookie', content: ${CONTENT}}, closeButton: true, declineButton: true}`,
    'тёмная тема': `{colorScheme: 'dark', modal: {title: 'Файлы cookie', content: ${CONTENT}}, closeButton: true, declineButton: true}`,
    'плашка: кнопка справа': `{modal: {modifier: 'bottom inline', content: ${CONTENT}}, lockScroll: false, closeButton: true, declineButton: true}`,
};

/**
 * Контраст текста с учётом opacity элемента и его предков. axe-core прозрачность не учитывает
 * и пропускает полупрозрачный текст, который на деле не проходит WCAG.
 */
async function contrast(page, selector) {
    return page.locator(selector).first().evaluate((el) => {
        const parse = (color) => {
            const numbers = color.match(/[\d.]+/g).map(Number);
            const scale = color.startsWith('color(') ? 255 : 1;
            return {r: numbers[0] * scale, g: numbers[1] * scale, b: numbers[2] * scale, a: numbers[3] ?? 1};
        };
        const luminance = ({r, g, b}) => [r, g, b]
            .map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4))
            .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
        const blend = (fg, bg, alpha) => ({
            r: fg.r * alpha + bg.r * (1 - alpha), g: fg.g * alpha + bg.g * (1 - alpha), b: fg.b * alpha + bg.b * (1 - alpha),
        });

        const dialog = parse(getComputedStyle(el.closest('.pts-lazyload__dialog')).backgroundColor);
        const own = parse(getComputedStyle(el).backgroundColor);
        const background = own.a > 0 ? blend(own, dialog, own.a) : dialog;

        let opacity = 1;
        for (let node = el; node && !node.classList.contains('pts-lazyload__dialog'); node = node.parentElement) {
            opacity *= Number(getComputedStyle(node).opacity);
        }
        const fg = parse(getComputedStyle(el).color);
        const text = blend(fg, background, fg.a * opacity);
        const [light, dark] = [luminance(text), luminance(background)].sort((a, b) => b - a);
        return (light + 0.05) / (dark + 0.05);
    });
}

test.describe('доступность окна (WCAG 2.2 AA)', () => {
    for (const [name, options] of Object.entries(VARIANTS)) {
        test.describe(name, () => {
            test.beforeEach(async ({page}) => {
                await openPage(page, {options: options.replace(/^\{/, "{theme: {animation: 'none'}, ")});
                await expect(page.locator(MODAL)).toBeVisible();
            });

            test('axe: нарушений нет', async ({page}) => {
                const result = await new AxeBuilder({page}).withTags(WCAG).include('.pts-lazyload').analyze();
                expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
            });

            test('контраст текста не ниже 4.5:1, значка крестика — 3:1', async ({page}) => {
                for (const selector of ['.pts-lazyload__body', BUTTON, '.pts-lazyload__decline', '.pts-lazyload__body a', '.pts-lazyload__title']) {
                    if (await page.locator(selector).count()) expect.soft(await contrast(page, selector), selector).toBeGreaterThanOrEqual(4.5);
                }
                if (await page.locator('.pts-lazyload__close').count()) {
                    expect(await contrast(page, '.pts-lazyload__close')).toBeGreaterThanOrEqual(3);
                }
            });

            test('разметка окна валидна (html-validate, правила HTML-спецификации)', async ({page}) => {
                const modal = await page.locator('.pts-lazyload').evaluate((el) => el.outerHTML);
                const report = await new HtmlValidate({extends: ['html-validate:recommended']}).validateString(
                    `<!DOCTYPE html><html lang="ru"><head><title>t</title></head><body>${modal}</body></html>`,
                );
                expect(report.results.flatMap((r) => r.messages.map((m) => `${m.ruleId}: ${m.message}`))).toEqual([]);
            });
        });
    }

    test('окно подписано и описано для скринридеров', async ({page}) => {
        await openPage(page, {options: `{modal: {title: 'Файлы cookie'}}`});
        const dialog = page.getByRole('dialog', {name: 'Файлы cookie'});
        await expect(dialog).toHaveAttribute('aria-modal', 'true');
        await expect(dialog).toHaveAccessibleDescription(/Мы используем файлы cookie/);
    });

    test('цели нажатия не меньше 24×24 (WCAG 2.5.8)', async ({page}) => {
        await page.setViewportSize({width: 375, height: 700});
        await openPage(page, {options: `{closeButton: true, declineButton: true, theme: {animation: 'none'}}`});
        for (const selector of [BUTTON, '.pts-lazyload__decline', '.pts-lazyload__close']) {
            const box = await page.locator(selector).boundingBox();
            expect(box.width, selector).toBeGreaterThanOrEqual(24);
            expect(box.height, selector).toBeGreaterThanOrEqual(24);
        }
    });

    test('режим высокой контрастности: у окна и кнопок есть рамки', async ({page}) => {
        await page.emulateMedia({forcedColors: 'active'});
        await openPage(page, {options: `{closeButton: true, declineButton: true}`});
        for (const selector of ['.pts-lazyload__dialog', BUTTON, '.pts-lazyload__decline', '.pts-lazyload__close']) {
            const width = await page.locator(selector).evaluate((el) => getComputedStyle(el).borderTopWidth);
            expect(width, selector).toBe('1px');
        }
    });

    test('уменьшение движения: без анимации', async ({page}) => {
        await page.emulateMedia({reducedMotion: 'reduce'});
        await openPage(page);
        const duration = await page.locator('.pts-lazyload__dialog').evaluate((el) => getComputedStyle(el).transitionDuration);
        expect(duration).toBe('0s');
    });
});

test.describe('конструктор', () => {
    test('axe: нарушений нет при всех открытых разделах', async ({page}) => {
        await page.goto('/dist-site/index.html');
        await expect(page.frameLocator('#preview').locator(MODAL)).toBeVisible();
        await page.check('#f-closeButton');
        await page.check('#f-declineButton');
        await page.locator('details.section').evaluateAll((sections) => sections.forEach((s) => (s.open = true)));
        const result = await new AxeBuilder({page}).withTags(WCAG).analyze();
        expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
    });

    for (const file of ['index.html', 'preview.html']) {
        test(`${file}: разметка валидна`, async () => {
            const report = await new HtmlValidate({
                extends: ['html-validate:recommended'],
                // Атрибуты и порядок, которые расставляет сборщик Vite, на валидность не влияют
                rules: {'no-inline-style': 'off'},
            }).validateFile(`dist-site/${file}`);
            expect(report.results.flatMap((r) => r.messages.map((m) => `${m.line}: ${m.ruleId}: ${m.message}`))).toEqual([]);
        });
    }
});
