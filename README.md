# pts-lazyload
Lazy loading JS

Для фильтрации ботов и отложенной загрузки JS скриптов требуется выполнить следующие шаги.

1. Подключить JQuery v2+ https://code.jquery.com/jquery/;
2. Подключить JQuery cookie https://plugins.jquery.com/cookie/;
3. Подключить FancyBox v2+ https://fancyapps.com/fancybox/;
4. Подключить скрипт pts.lazyload;

Инициализируем параметры скриптов для отложенной загрузки:
```javascript
let dataLazyLoadingJS = {
    data: {
        script_name: {
            status: false,
            html: 'Код для загрузки, тут могут быть скрипты, загружаемые скрипты и HTML куски',
            area: 'Идентификатор блока, в конец которого будет добавлен код из секции html, например head или .some-class-name'
        }
    }
};
```

Инициализируем параметры для отрисовки сообщения и установки кук:
```javascript
let dataSettings = {
    cookie_name: 'SOME_UNIQUE_COOIE_NAME',
    fancybox: {
        content: $('.welcome-pt-message'),
        wrapCSS: 'site-scrollable-fancybox'
    }
};
```

Инициализируем отложенную загрузку:
```javascript
let LazyLoad = new ptsLazyLoad(dataLazyLoadingJS, dataSettings);
let need_check = 1;
LazyLoad.simpleCheck( need_check ); //метод ожидает 0 или 1, 1 в случае, если необходимо выводить сообщение, 0, если не надо
```

Пример:
```javascript
<div class="site-row">
    <div class="site-popup-inner welcome-pt-message" style="display: none;">
        <fo rm method="post" enctype="multipart/form-data" action="">
            <div class="site-form-title">Добро пожаловать</div>
            <div class="site-row">
                <p class="site-form-text">Благодарим за посещение нашего ресурса.</p>
            </div>
            <div class="site-form-buttons site-form--center">
                <div class="site-form-button">
                    <a href="jav * ascript:void(0);" class="site-btn--submit green welcome-pt-message-btn" oncl ick="$.fancybox.close();">Продолжить</a>
                </div>
            </div>
        </form>
    </div>
</div>

<script src="/libs/pts-lazyload/pts.lazyload.js"></script>

<script>
    $(function() {
        let dataLazyLoadingJS = {
            data: {
                ya_counter: {
                    status: false,
                    html: '<script src="/libs/counters/counters.js"><\/script><noscript><div><img src="https://mc.yandex.ru/watch/unique_id?ut=noindex" style="position:absolute; left:-9999px;" alt=""><\/div><\/noscript>',
                    area: '.before-footer-scripts-place'
                },
                ga_counter: {
                    status: false,
                    html: `<script async src="https://www.googletagmanager.com/gtag/js?id=ga-unique-id"><\/script><script>function getCid() {var match = document.cookie.match('(?:^|;)\\\\s*_ga=([^;]*)');var raw = (match) ? decodeURIComponent(match[1]) : null;if (raw) match = raw.match(/(\\d+\\.\\d+)$/);var gacid = (match) ? match[1] : null;return gacid ? gacid : false;}<\/script>`,
                    area: 'head'
                }
            }
        };
        let dataSettings = {
            cookie_name: '__UNIQUE_VERIFIED_COOKIE_NAME',
            fancybox: {
                content: $('.welcome-pt-message'),
                wrapCSS: 'site-scrollable-fancybox'
            }
        };
        let LazyLoad = new ptsLazyLoad(dataLazyLoadingJS, dataSettings);
        LazyLoad.simpleCheck({{ app['user'] ? 0 : 1 }})
    });
</script>
```
