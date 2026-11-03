import {afterEach, describe, expect, it, vi} from 'vitest';
import {isAutomation, isFromSearch, isSearchBot} from '../../src/detect.js';
import {BOT_USER_AGENTS, SEARCH_REFERRERS} from '../../src/defaults.js';

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

const setUserAgent = (ua) => vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
const setReferrer = (ref) => vi.spyOn(document, 'referrer', 'get').mockReturnValue(ref);
const setWebdriver = (value) => Object.defineProperty(navigator, 'webdriver', {configurable: true, get: () => value});

describe('isSearchBot', () => {
    afterEach(() => vi.restoreAllMocks());

    it.each([
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
        'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
        'Mozilla/5.0 (compatible; YANDEXMETRIKA/2.0)',
    ])('узнаёт робота: %s', (ua) => {
        setUserAgent(ua);
        expect(isSearchBot(BOT_USER_AGENTS)).toBe(true);
    });

    it('обычный браузер — не робот', () => {
        setUserAgent(CHROME);
        expect(isSearchBot(BOT_USER_AGENTS)).toBe(false);
    });

    it('браузер Yahoo — не робот (в списке только Yahoo! Slurp)', () => {
        setUserAgent(`${CHROME} YahooMobile/1.0`);
        expect(isSearchBot(BOT_USER_AGENTS)).toBe(false);
    });
});

describe('isAutomation', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        delete navigator.webdriver;
    });

    it('navigator.webdriver', () => {
        setUserAgent(CHROME);
        setWebdriver(true);
        expect(isAutomation()).toBe(true);
    });

    it.each(['HeadlessChrome/141.0.0.0', 'PhantomJS/2.1.1', 'Electron/30.0.0'])('%s в User-Agent', (marker) => {
        setUserAgent(`Mozilla/5.0 (X11; Linux x86_64) ${marker}`);
        expect(isAutomation()).toBe(true);
    });

    it('обычный браузер', () => {
        setUserAgent(CHROME);
        setWebdriver(false);
        expect(isAutomation()).toBe(false);
    });
});

describe('isFromSearch', () => {
    afterEach(() => vi.restoreAllMocks());

    it.each([
        'https://yandex.ru/search/?text=окна',
        'https://ya.ru/search/?text=окна',
        'https://www.google.com/',
        'https://www.google.kz/',
        'https://www.google.co.uk/',
        'https://yandex.com.tr/search/?text=x',
        'https://www.bing.com/search?q=x',
        'https://go.mail.ru/search?q=x',
    ])('поисковик: %s', (ref) => {
        setReferrer(ref);
        expect(isFromSearch(SEARCH_REFERRERS)).toBe(true);
    });

    it.each([
        '',
        'https://example.com/',
        'https://evil.com/?https://yandex.ru/',
        'https://yandex.ru.evil.com/',
        'https://www.google.com.evil.io/',
    ])('не поисковик: «%s»', (ref) => {
        setReferrer(ref);
        expect(isFromSearch(SEARCH_REFERRERS)).toBe(false);
    });

    it('строковые правила сравниваются с началом адреса', () => {
        setReferrer('https://search.example.com/?q=1');
        expect(isFromSearch(['https://search.example.com/'])).toBe(true);
        expect(isFromSearch(['https://example.com/'])).toBe(false);
    });
});
