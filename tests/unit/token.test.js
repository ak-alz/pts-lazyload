import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import TokenStore, {defaultSalt} from '../../src/token.js';

const DAY = 864e5;
const options = {cookieName: 'verified', cookieTime: 365, cookieDomain: '', salt: 'salt'};

function clearStorage() {
    document.cookie = 'verified=; max-age=0; path=/';
    document.cookie = 'verified-declined=; max-age=0; path=/';
    localStorage.clear();
    sessionStorage.clear();
}

describe('TokenStore', () => {
    beforeEach(clearStorage);
    afterEach(() => vi.useRealTimers());

    it('создаёт токен, который проходит проверку', () => {
        const store = new TokenStore(options);
        const token = store.create();
        expect(token).toMatch(/^v3\.[0-9a-z]+\.[0-9a-z]+\.[0-9a-z]+$/);
        expect(store.isValid(token)).toBe(true);
    });

    it.each([
        ['значение из v2.x', 'true'],
        ['пустая строка', ''],
        ['null', null],
        ['не тот префикс', 'v2.abc.def.ghi'],
        ['не хватает частей', 'v3.abc.def'],
    ])('отклоняет подделку: %s', (_, value) => {
        expect(new TokenStore(options).isValid(value)).toBe(false);
    });

    it('отклоняет токен с изменённой подписью или частями', () => {
        const store = new TokenStore(options);
        const [prefix, issued, nonce, sign] = store.create().split('.');
        expect(store.isValid([prefix, issued, nonce, sign + 'x'].join('.'))).toBe(false);
        expect(store.isValid([prefix, issued, nonce + 'x', sign].join('.'))).toBe(false);
        expect(store.isValid([prefix, (parseInt(issued, 36) + 1).toString(36), nonce, sign].join('.'))).toBe(false);
    });

    it('токен другого сайта или с другим именем cookie не подходит', () => {
        const token = new TokenStore(options).create();
        expect(new TokenStore({...options, salt: 'other'}).isValid(token)).toBe(false);
        expect(new TokenStore({...options, cookieName: 'other'}).isValid(token)).toBe(false);
    });

    it('без salt и cookieDomain соль — домен страницы', () => {
        expect(defaultSalt({}, 'www.site.ru')).toBe('www.site.ru');
    });

    it('с cookieDomain соль общая для всех поддоменов', () => {
        const options = {cookieDomain: '.site.ru'};
        expect(defaultSalt(options, 'www.site.ru')).toBe('site.ru');
        expect(defaultSalt(options, 'site.ru')).toBe('site.ru');
        expect(defaultSalt(options, 'msk.site.ru')).toBe('site.ru');
        expect(defaultSalt({cookieDomain: 'SITE.RU'}, 'www.site.ru')).toBe('site.ru');
    });

    it('явный salt важнее', () => {
        expect(defaultSalt({salt: 'x', cookieDomain: '.site.ru'}, 'www.site.ru')).toBe('x');
    });

    it('без salt подпись привязана к домену', () => {
        const token = new TokenStore({...options, salt: ''}).create();
        expect(new TokenStore({...options, salt: location.hostname}).isValid(token)).toBe(true);
    });

    it('токен истекает через cookieTime дней', () => {
        vi.useFakeTimers({now: new Date('2026-01-01T00:00:00Z')});
        const store = new TokenStore({...options, cookieTime: 30});
        const token = store.create();

        vi.setSystemTime(Date.now() + 29 * DAY);
        expect(store.isValid(token)).toBe(true);

        vi.setSystemTime(Date.now() + 2 * DAY);
        expect(store.isValid(token)).toBe(false);
    });

    it('токен из будущего (больше суток) не принимается', () => {
        vi.useFakeTimers({now: new Date('2026-01-10T00:00:00Z')});
        const store = new TokenStore(options);
        const token = store.create();
        vi.setSystemTime(Date.now() - 2 * DAY);
        expect(store.isValid(token)).toBe(false);
    });

    it('пишет токен в cookie и localStorage', () => {
        const store = new TokenStore(options);
        const token = store.create();
        store.write(token);
        expect(document.cookie).toContain(`verified=${encodeURIComponent(token)}`);
        expect(localStorage.getItem('verified')).toBe(token);
        expect(store.read()).toBe(token);
    });

    it('восстанавливает токен из localStorage, если cookie удалили', () => {
        const store = new TokenStore(options);
        const token = store.create();
        store.write(token);
        document.cookie = 'verified=; max-age=0; path=/';
        expect(store.read()).toBe(token);
    });

    it('не принимает поддельную cookie, даже если имя совпадает', () => {
        document.cookie = 'verified=true; path=/';
        localStorage.setItem('verified', 'true');
        expect(new TokenStore(options).read()).toBe(null);
    });

    it('не путает cookie с похожим именем', () => {
        const store = new TokenStore(options);
        document.cookie = `xverified=${encodeURIComponent(store.create())}; path=/`;
        expect(store.read()).toBe(null);
        document.cookie = 'xverified=; max-age=0; path=/';
    });

    it('renew: свежий токен сохраняется, старше суток — перевыпускается', () => {
        vi.useFakeTimers({now: new Date('2026-01-01T00:00:00Z')});
        const store = new TokenStore(options);
        const token = store.create();

        vi.setSystemTime(Date.now() + DAY / 2);
        store.renew(token);
        expect(store.read()).toBe(token);

        vi.setSystemTime(Date.now() + DAY);
        store.renew(token);
        const renewed = store.read();
        expect(renewed).not.toBe(token);
        expect(store.isValid(renewed)).toBe(true);
        expect(parseInt(renewed.split('.')[1], 36)).toBe(Date.now());
    });
});

describe('отказ от необязательных cookie', () => {
    beforeEach(clearStorage);

    it('declineTime 0 — до закрытия вкладки (sessionStorage)', () => {
        const store = new TokenStore(options);
        expect(store.isDeclined()).toBe(false);
        store.decline(0);
        expect(store.isDeclined()).toBe(true);
        expect(sessionStorage.getItem('verified-declined')).toBe('1');
        expect(document.cookie).not.toContain('verified-declined');
    });

    it('declineTime в днях — cookie', () => {
        const store = new TokenStore(options);
        store.decline(30);
        expect(document.cookie).toContain('verified-declined=1');
        expect(sessionStorage.getItem('verified-declined')).toBe(null);
        expect(store.isDeclined()).toBe(true);
    });

    it('clearDecline убирает отказ из обоих хранилищ', () => {
        const store = new TokenStore(options);
        store.decline(0);
        store.decline(30);
        store.clearDecline();
        expect(store.isDeclined()).toBe(false);
    });
});
