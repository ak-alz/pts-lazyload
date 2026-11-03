import {BUTTON, MODAL, counters, events, expect, getToken, humanClick, openPage, test} from './helpers.js';

const CLOSE = '.pts-lazyload__close';

test.describe('intercept: перехват действий посетителя', () => {
    test('пустая функция: окно остаётся, счётчики не загружаются', async ({page}) => {
        await openPage(page, {options: `{closeButton: true, intercept: {close: () => {}}}`});
        await humanClick(page, CLOSE);
        await page.waitForTimeout(300);
        await expect(page.locator(MODAL)).toBeVisible();
        expect(await counters(page)).toEqual([]);
        expect(await events(page)).toEqual(['show']);
    });

    test('dismiss: окно закрыто без подтверждения, токена нет, при следующем визите окно снова', async ({page}) => {
        await openPage(page, {
            options: `{
                closeButton: true,
                intercept: {close: (ctx) => { __events.push('intercept:' + ctx.action + ':' + ctx.event.type); ctx.dismiss(); }},
                onDismiss: (d) => __events.push('cb:dismiss:' + d.reason),
            }`,
        });
        await humanClick(page, CLOSE);
        await expect(page.locator('.pts-lazyload')).toHaveCount(0);
        expect(await events(page)).toEqual(['show', 'intercept:close:click', 'dismiss:close', 'cb:dismiss:close']);
        expect(await counters(page)).toEqual([]);
        expect(await getToken(page)).toBe(null);
        await expect(page.locator('html')).not.toHaveClass(/pts-lazyload-locked/);

        await page.reload();
        await expect(page.locator(MODAL)).toBeVisible();
    });

    test('next() выполняет действие по умолчанию — подтверждение', async ({page}) => {
        await openPage(page, {options: `{intercept: {button: (ctx, next) => { __events.push('before'); next(); }}}`});
        await humanClick(page);
        await expect.poll(() => counters(page)).toEqual(['counter']);
        expect(await events(page)).toEqual(['show', 'before', 'verified:click', 'ptz-click']);
    });

    test('next() можно вызвать позже, например после своего диалога', async ({page}) => {
        await openPage(page, {options: `{intercept: {button: (ctx, next) => { window.__next = next; }}}`});
        await humanClick(page);
        await page.waitForTimeout(300);
        expect(await counters(page)).toEqual([]);
        await expect(page.locator(MODAL)).toBeVisible();

        await page.evaluate(() => window.__next());
        await expect.poll(() => counters(page)).toEqual(['counter']);
    });

    test('повторные next() и dismiss() после решения игнорируются', async ({page}) => {
        await openPage(page, {
            options: `{onDismiss: () => __events.push('cb:dismiss'), intercept: {button: (ctx, next) => { next(); next(); ctx.dismiss(); }}}`,
        });
        await humanClick(page);
        await expect.poll(() => events(page)).toEqual(['show', 'verified:click', 'ptz-click']);
    });

    test('перехватчик не вызывается для действий, не прошедших проверку на бота', async ({page}) => {
        await openPage(page, {options: `{intercept: {button: (ctx, next) => { __events.push('intercepted'); next(); }}}`});
        await page.waitForTimeout(400);
        await page.locator(BUTTON).dispatchEvent('click');
        await page.locator(BUTTON).click();
        expect(await events(page)).not.toContain('intercepted');
        expect(await counters(page)).toEqual([]);
    });

    test('ошибка в перехватчике: действие выполняется по умолчанию', async ({page}) => {
        const errors = [];
        page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
        await openPage(page, {options: `{intercept: {button: () => { throw new Error('boom'); }}}`});
        await humanClick(page);
        await expect.poll(() => counters(page)).toEqual(['counter']);
        expect(errors.join('\n')).toContain('intercept.button');
    });

    test('свой отказ на крестик, подтверждение на Escape и оверлей по умолчанию', async ({page}) => {
        await openPage(page, {
            options: `{closeButton: true, closeOnEscape: true, intercept: {close: (ctx) => ctx.dismiss()}}`,
        });
        await page.waitForTimeout(400);
        await page.keyboard.press('Escape');
        await expect.poll(() => events(page)).toContain('verified:escape');
    });

    test('перехват Escape и оверлея', async ({page}) => {
        await openPage(page, {
            options: `{
                closeOnEscape: true, closeOnOverlay: true,
                intercept: {
                    escape: (ctx) => __events.push('esc'),
                    overlay: (ctx) => __events.push('overlay'),
                },
            }`,
        });
        await page.waitForTimeout(400);
        await page.keyboard.press('Escape');
        await page.mouse.move(600, 300);
        await page.mouse.move(30, 30, {steps: 10});
        await page.mouse.down();
        await page.mouse.up();
        expect(await events(page)).toEqual(['show', 'esc', 'overlay']);
        await expect(page.locator(MODAL)).toBeVisible();
    });
});
