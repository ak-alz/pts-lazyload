# pts-lazyload v2.1
Lazy loading JS (без подключения доп. библиотек)
____
В версии 2.1 добавлены следующие опции:    
:white_check_mark: При переходе из поисковых систем Yandex, Google, Rambler, Bing окно пользователю не показывается.    
:white_check_mark: Текст сообщения можно задать в параметрах (по-умолчанию "Мы используем файлы cookie на нашем сайте").    
:white_check_mark: При загрузке скриптов генерируется событие 'ptz-click', по которому, например, можно загружать рекламу (мы ведь не хотим её показывать ботам).    
:white_check_mark: Добавлен параметр checkInternal - если пользователь переходит по внутренним ссылкам, и cookie не установлены, при checkInternal=true окно не показывается.    
:white_check_mark: Добавлен параметр cookieTime - время жизни cookie в днях, по-умолчанию 365
____

Для фильтрации ботов и отложенной загрузки JS скриптов требуется выполнить следующие шаги.

1. Подключить файл стилей welcome-pt.css
2. Подключить скрипт pts.lazyload;

Инициализируем параметры скриптов для отложенной загрузки:
```javascript
const data = {
    counters: [
        {
            html: `Код для загрузки, тут могут быть скрипты, загружаемые скрипты и HTML куски`,
            area: 'Идентификатор блока, в конец которого будет добавлен код из секции html, по-умолчанию - head'
        },
        {
            html: ``,
            area: '.before-footer-scripts-place'
        },
    ],
    cookie_name: 'Как будут называться cookie, по-умолчанию PTZ__VERIFIED_COOKIE_NAME',
    modalText: 'Текст сообщения в модальном окне',
    cookieTime: 100 //cookie будут жить 100 дней
}
```

Пример:
```javascript
const data = {
    counters: [
        {
            html: `<script>console.log('Modal open 1)<\/script>`,
            //если параметр area не указан, код будет записан в head
        },
        {
            html: `<script>console.log('Modal open 2)<\/script>`,//тут обязательны именно обратные кавычки
            area: '.before-footer-scripts-place'
        },
    ],
    cookie_name: 'Как будут называться cookie, по-умолчанию PTZ__VERIFIED_COOKIE_NAME',
    modalText: 'Текст сообщения в модальном окне'
}
```
Пример 2 (простая инициализация):
```javascript
const data = {
    counters: [
        {
            html: `<script>console.log('Modal open 1')<\/script>`,
        },
        {
            html: `<script>console.log('Modal open 2')<\/script>`,
        },
    ],
}
```
____
:exclamation: То есть обязательными являются только скрипты (коды счетчиков)    
:exclamation: В закрывающем теге script обязательно экранировать слэш "<\/script>"        
____
Инициализируем отложенную загрузку:
```javascript
new ptsLazyLoad(data).init(1);//метод ожидает 0 или 1, 1 в случае, если необходимо выводить сообщение, 0, если не надо
```

Пример:
```html
<div class="welcome-pt-modal">
    <div class="welcome-pt-overlay">
        <div class="site-popup-inner welcome-pt-message">
            <form method="post" enctype="multipart/form-data" action="">
                <div class="site-form-title">Добро пожаловать!</div>
                <div class="site-row">
                    <p class="site-form-text">Благодарим за посещение нашего ресурса.</p>
                </div>
                <div class="site-form-buttons">
                    <div class="site-form-button">
                        <a href="#" class="welcome-pt-close">Продолжить</a>
                    </div>
                </div>
            </form>
        </div>
    </div>
</div>

<script src="/libs/pts-lazyload/pts.lazyload.js"></script>
```
```javascript
const data = {
    counters: [
        {
            html: `<script>console.log('Modal open 1')<\/script>`,

        },
        {
            html: `<script>console.log('Modal open 2')<\/script>`,
            area: '.before-footer-scripts-place'
        },
    ],
    cookie_name: 'PTZ__VERIFIED_COOKIE_NAME',
    modalText: 'Мы используем файлы cookie на нашем сайте'
}
new ptsLazyLoad(data).init(1);
```
____
## Пример инициализации рекламного блока по событию ptz-click
```javascript
document.addEventListener('ptz-click', () => {
    window.yaContextCb.push(()=>{
        Ya.Context.AdvManager.render({
            "blockId": "R-A-20041454-45",
            "type": "fullscreen",
            "platform": "touch"
        })
    })
})
```
:+1: То есть загружаем fullscreen рекламу от Яндекса только для реального посетителя
____