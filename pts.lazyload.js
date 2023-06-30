class ptsLazyLoad {
    constructor(dataLazyLoadingJS, dataSettings) {
        this.dataLazyLoadingJS = dataLazyLoadingJS;
        this.dataSettings = dataSettings;
    }
    #engines =
        [
            'https://www.google.',
            'https://yandex.',
            'https://nova.rambler.ru',
            'https://www.bing.com/',
        ];
    checkReferrer(){
        this.#engines.find(item => {
            return document.referrer.startsWith(item);
        })
    }
    lazyLoadingJS(type, area) {
        // if (this.dataLazyLoadingJS['data'][type]['status'] === false) {
        //     this.dataLazyLoadingJS['data'][type]['status'] = true;

            const render = (relEl, tpl) => {
                const range = document.createRange();
                range.selectNode(relEl);
                const child = range.createContextualFragment(tpl);
                return relEl.appendChild(child);
            };
            render(area, this.dataLazyLoadingJS['data'][type]['html']);
        // }
    }
    loadAllDataScripts() {
        for (let key in this.dataLazyLoadingJS['data']) {
            this.lazyLoadingJS(key, document.querySelector(this.dataLazyLoadingJS['data'][key]['area']));
        }
    }
    showMessage() {
        let that = this;
        let modal = document.querySelector('.welcome-pt-overlay');
        let closeButton = document.querySelector('.welcome-pt-close');
        modal.classList.add('is-active');
        closeButton.addEventListener('click', function(event) {    
            event.preventDefault();  
            modal.classList.remove('is-active');
            that.cookieSet();
            that.loadAllDataScripts();
            // setTimeout(function() {
            //     modal.style.display = 'none';
            // }, 300);
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
        // let sBrowser = false, sUsrAg = navigator.userAgent;
        // for (let i = 0; i < uaList.length; i += 1) {
        //     if (sUsrAg.indexOf(uaList[i]) > -1) {
        //         sBrowser = true;
        //         break;
        //     }
        // }

        // return sBrowser;
    }
    cookieCheck() {
        return document.cookie.includes(this.dataSettings.cookie_name);
    }
    cookieSet() {
        document.cookie = `${this.dataSettings.cookie_name}=true; max-age=${365 * 30 * 24 * 60 * 60 * 1000}; path=/`;
        // const date = new Date();
        // date.setTime(`${date.getTime()}${(365 * 30 * 24 * 60 * 60 * 1000)}`);
        // let expiryDate = `expiryDate=" ${date.toUTCString()}`;
        // document.cookie = `${this.dataSettings.cookie_name}=true; ${expiryDate}; path=/`;
    }
    simpleCheck(need_check) {
        if (+need_check === 1 && !this.cookieCheck() && !this.isSearchSystemBotSigns() && !this.checkReferrer()) {
            this.showMessage();
        } else {
            this.loadAllDataScripts();
        }
    }
}