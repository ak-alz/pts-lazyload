import {afterEach, describe, expect, it, vi} from 'vitest';
import {normalizeOptions} from '../../src/options.js';
import {DEFAULTS} from '../../src/defaults.js';

describe('normalizeOptions', () => {
    afterEach(() => vi.restoreAllMocks());

    it('без параметров возвращает значения по умолчанию', () => {
        const options = normalizeOptions();
        expect(options.cookieName).toBe('pts-lazyload-verified');
        expect(options.cookieTime).toBe(365);
        expect(options.botBehavior).toBe('skip');
        expect(options.skipForSearchVisitors).toBe(false);
        expect(options.protection.minDelay).toBe(1200);
    });

    it('вложенные параметры дополняют значения по умолчанию, а не заменяют их', () => {
        const options = normalizeOptions({modal: {title: 'Привет'}, protection: {honeypot: false}});
        expect(options.modal.title).toBe('Привет');
        expect(options.modal.buttonText).toBe('Принять');
        expect(options.protection.honeypot).toBe(false);
        expect(options.protection.minDelay).toBe(1200);
    });

    it('не изменяет значения по умолчанию', () => {
        normalizeOptions({protection: {minDelay: 5}, modal: {text: 'x'}, classNames: {button: 'b'}});
        expect(DEFAULTS.protection.minDelay).toBe(1200);
        expect(DEFAULTS.modal.text).toMatch(/^Мы используем файлы cookie/);
        expect(DEFAULTS.classNames.button).toBe('pts-lazyload__button');
    });

    it.each([
        ['строка с числом', '30', 30],
        ['нечисловая строка', '1 год', 365],
        ['NaN', NaN, 365],
        ['ноль', 0, 365],
        ['отрицательное', -5, 365],
        ['больше 400', 1000, 400],
    ])('cookieTime: %s', (_, value, expected) => {
        expect(normalizeOptions({cookieTime: value}).cookieTime).toBe(expected);
    });

    it('понимает параметры v2.1 и предупреждает о них', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const options = normalizeOptions({cookie_name: 'OLD', modalText: 'Старый текст', checkInternal: true});

        expect(options.cookieName).toBe('OLD');
        expect(options.modal.text).toBe('Старый текст');
        expect(options).not.toHaveProperty('cookie_name', undefined);
        expect(warn).toHaveBeenCalledOnce();
        expect(warn.mock.calls[0][0]).toMatch(/cookie_name.*modalText.*checkInternal/);
    });

    it('новые имена параметров важнее старых', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(normalizeOptions({cookie_name: 'OLD', cookieName: 'NEW'}).cookieName).toBe('NEW');
    });

    it('без устаревших параметров не предупреждает', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        normalizeOptions({cookieName: 'x'});
        expect(warn).not.toHaveBeenCalled();
    });

    it('modal.modifier: dark — то же, что colorScheme: dark', () => {
        const options = normalizeOptions({modal: {modifier: 'dark bottom'}});
        expect(options.colorScheme).toBe('dark');
        expect(options.modal.modifier).toBe('bottom');
    });

    it('colorScheme важнее модификатора dark', () => {
        expect(normalizeOptions({colorScheme: 'auto', modal: {modifier: 'dark'}}).colorScheme).toBe('auto');
    });

    it('неизвестный colorScheme — светлая тема и предупреждение', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        expect(normalizeOptions({colorScheme: 'night'}).colorScheme).toBe('light');
        expect(warn).toHaveBeenCalledOnce();
    });

    it.each([[undefined, 0], [-5, 0], ['30', 30], ['abc', 0], [1000, 400]])('declineTime %s → %s', (value, expected) => {
        expect(normalizeOptions({declineTime: value}).declineTime).toBe(expected);
    });

    it('counters не массив — пустой список', () => {
        expect(normalizeOptions({counters: 'oops'}).counters).toEqual([]);
    });
});
