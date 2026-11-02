import {describe, expect, it} from 'vitest';
import {escapeHtml, hash, merge} from '../../src/utils.js';

describe('merge', () => {
    it('глубоко объединяет объекты и не трогает исходные', () => {
        const target = {a: 1, nested: {x: 1, y: 2}};
        const result = merge(target, {nested: {y: 3}});
        expect(result).toEqual({a: 1, nested: {x: 1, y: 3}});
        expect(target.nested.y).toBe(2);
        expect(result.nested).not.toBe(target.nested);
    });

    it('массивы, функции и RegExp заменяются целиком', () => {
        const fn = () => {};
        const result = merge({list: [1, 2], re: /a/, cb: null}, {list: [3], re: /b/, cb: fn});
        expect(result.list).toEqual([3]);
        expect(result.re.source).toBe('b');
        expect(result.cb).toBe(fn);
    });

    it('DOM-элементы и экземпляры классов не копируются', () => {
        const el = document.createElement('div');
        const date = new Date();
        const result = merge({modal: {content: ''}}, {modal: {content: el}, when: date});
        expect(result.modal.content).toBe(el);
        expect(result.when).toBe(date);
    });

    it('undefined не перезаписывает значение', () => {
        expect(merge({a: 1}, {a: undefined}).a).toBe(1);
    });
});

describe('escapeHtml', () => {
    it('экранирует спецсимволы HTML', () => {
        expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
    });
});

describe('hash', () => {
    it('детерминирован и различает входные данные', () => {
        expect(hash('abc')).toBe(hash('abc'));
        expect(hash('abc')).not.toBe(hash('abd'));
        expect(hash('')).toMatch(/^[0-9a-z]+$/);
    });
});
