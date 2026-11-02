import {CLASS_NAMES} from './templates.js';

export const BLOCK = 'pts-lazyload';
export const TOKEN_PREFIX = 'v3';
export const DAY_MS = 864e5;
export const COLOR_SCHEMES = ['light', 'dark', 'auto'];

// Браузеры не хранят cookie дольше 400 дней, больший срок всё равно будет обрезан
export const MAX_COOKIE_DAYS = 400;

export const BOT_USER_AGENTS = [
    'Googlebot', 'Google-InspectionTool', 'GoogleOther', 'Storebot-Google', 'APIs-Google',
    'AdsBot-Google', 'Mediapartners-Google', 'FeedFetcher-Google',
    'YandexBot', 'YandexMobileBot', 'YandexDirectDyn', 'YandexScreenshotBot', 'YandexImages',
    'YandexVideo', 'YandexVideoParser', 'YandexMedia', 'YandexBlogs', 'YandexFavicons',
    'YandexWebmaster', 'YandexPagechecker', 'YandexImageResizer', 'YandexAdNet', 'YandexDirect',
    'YaDirectFetcher', 'YandexCalendar', 'YandexSitelinks', 'YandexMetrika', 'YandexNews',
    'YandexCatalog', 'YandexMarket', 'YandexVertis', 'YandexForDomain', 'YandexSpravBot',
    'YandexSearchShop', 'YandexMedianaBot', 'YandexOntoDB', 'YandexOntoDBAPI', 'YandexVerticals',
    'YandexRenderResourcesBot', 'YandexAccessibilityBot', 'YandexAdditional',
    'Mail.RU_Bot', 'StackRambler', 'Yahoo! Slurp', 'bingbot', 'msnbot', 'BingPreview',
    'DuckDuckBot', 'Applebot', 'Baiduspider', 'PixelTools', 'PixelBot',
];

export const SEARCH_REFERRERS = [
    /^https?:\/\/(www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?\//i,
    /^https?:\/\/(www\.)?yandex\.[a-z]{2,3}(\.[a-z]{2})?\//i,
    /^https?:\/\/ya\.ru\//i,
    /^https?:\/\/(www\.)?bing\.com\//i,
    /^https?:\/\/nova\.rambler\.ru\//i,
    /^https?:\/\/go\.mail\.ru\//i,
];

export const DEFAULTS = {
    counters: [],
    counterSelector: 'template[data-pts-lazyload]',
    cookieName: 'pts-lazyload-verified',
    cookieTime: 365,
    cookieDomain: '',
    salt: '',
    botBehavior: 'skip',
    botUserAgents: BOT_USER_AGENTS,
    skipForSearchVisitors: false,
    searchReferrers: SEARCH_REFERRERS,
    legacyEvent: true,
    lockScroll: true,
    closeButton: false,
    declineButton: false,
    declineTime: 0,
    closeOnOverlay: false,
    closeOnEscape: false,
    colorScheme: 'light',
    autoFocus: true,
    theme: {},
    themeDark: {},
    classNames: CLASS_NAMES,
    templates: null,
    modal: {
        title: '',
        text: 'Мы используем файлы cookie, чтобы сайт работал корректно и был удобнее для вас. Продолжая пользоваться сайтом, вы соглашаетесь с их использованием.',
        content: '',
        buttonText: 'Принять',
        modifier: '',
        ariaLabel: 'Использование файлов cookie',
        closeLabel: 'Закрыть',
        closeIcon: '&times;',
        declineText: 'Только необходимые',
    },
    protection: {
        minDelay: 1200,
        requirePointerMovement: true,
        rejectCenterClick: true,
        honeypot: true,
        detectWebdriver: true,
    },
    intercept: {},
    onShow: null,
    onVerify: null,
    onReject: null,
    onBlock: null,
    onDismiss: null,
    debug: false,
};
