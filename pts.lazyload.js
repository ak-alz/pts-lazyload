document.addEventListener('ptz-click', () => {
    console.log('ptz-click')
})
class ptsLazyLoad {
    constructor({
                    counters = [],
                    cookie_name = 'PTZ__VERIFIED_COOKIE_NAME',
                    modalText = 'Мы используем файлы cookie на нашем сайте',
                    checkInternal = true
                }) {
        this.dataLazyLoadingJS = counters;
        this.cookie_name = cookie_name;
        this.modalText = modalText;
        checkInternal && this.#engines.push(this.siteUrl);
    }
    #engines =
        [
            'https://www.google.',
            'https://yandex.',
            'https://nova.rambler.ru',
            'https://www.bing.com/',
        ];
    checkReferrer(){
        return !!this.#engines.find(item => document.referrer.includes(item))
    }
    lazyLoadingJS(counter) {
        const render = (relEl, tpl) => {
            const range = document.createRange();
            range.selectNode(relEl);
            const child = range.createContextualFragment(tpl);
            return relEl.appendChild(child);
        };
        const area = document.querySelector(counter.area) || document.querySelector('head');
        render(area, counter['html']);
    }
    loadAllDataScripts() {
        document.dispatchEvent(new Event("ptz-click"));
        this.dataLazyLoadingJS.forEach(item => {
            this.lazyLoadingJS(item);
        })
    }
    get siteUrl(){
        return `${document.location.protocol}//${document.location.host}`;
    }
    showMessage() {
        let modal = document.querySelector('.welcome-pt-overlay');
        let text = modal.querySelector('.site-form-text');
        text.innerText = this.modalText;
        modal.classList.add('is-active');
        modal.addEventListener('click', (event) =>{
            if(event.target.closest('.welcome-pt-close')){
                modal.classList.remove('is-active');
                this.cookieSet();
                this.loadAllDataScripts();
            }
        });
    }
    isSearchSystemBotSigns() {
        let uaList = [
            'APIs-Google', 'Mediapartners-Google', 'AdsBot-Google-Mobile', 'AdsBot-Google', 'Googlebot', 'AdsBot-Google-Mobile-Apps',
            'YandexBot', 'YandexMobileBot', 'YandexDirectDyn', 'YandexScreenshotBot', 'YandexImages', 'YandexVideo', 'YandexVideoParser',
            'YandexMedia', 'YandexBlogs', 'YandexFavicons', 'YandexWebmaster', 'YandexPagechecker', 'YandexImageResizer', 'YandexAdNet',
            'YandexDirect', 'YaDirectFetcher', 'YandexCalendar', 'YandexSitelinks', 'YandexMetrika', 'YandexNews', 'YandexCatalog',
            'YandexMarket', 'YandexVertis', 'YandexForDomain', 'YandexSpravBot', 'YandexSearchShop', 'YandexMedianaBot', 'YandexOntoDB',
            'YandexOntoDBAPI', 'YandexVerticals', 'Mail.RU_Bot', 'StackRambler', 'Yahoo', 'msnbot', 'bingbot', 'PixelTools', 'PixelBot'
        ];
        let   sUsrAg = navigator.userAgent;
        return !!uaList.find(item => sUsrAg.includes(item));
    }
    cookieCheck() {
        return document.cookie.includes(this.cookie_name);
    }
    cookieSet() {
        document.cookie = `${this.cookie_name}=true; max-age=${365 * 30 * 24 * 60 * 60 * 1000}; path=/`;
    }
    init(need_check) {
        if (!!need_check && !this.cookieCheck() && !this.isSearchSystemBotSigns() && !this.checkReferrer()) {
            this.showMessage();
        } else {
            this.loadAllDataScripts();
        }
    }
}
