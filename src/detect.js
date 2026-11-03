export function isSearchBot(userAgents) {
    const ua = (navigator.userAgent || '').toLowerCase();
    return userAgents.some((item) => ua.includes(String(item).toLowerCase()));
}

export function isAutomation() {
    return navigator.webdriver === true || /HeadlessChrome|PhantomJS|Electron/i.test(navigator.userAgent || '');
}

export function isFromSearch(rules) {
    const ref = document.referrer || '';
    return rules.some((rule) => (rule instanceof RegExp ? rule.test(ref) : ref.startsWith(String(rule))));
}
