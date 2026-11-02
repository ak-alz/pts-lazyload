# pts-lazyload v3

**Русский** | [English](README.en.md)

Скрипт откладывает загрузку счётчиков (Яндекс Метрика, Google Analytics и т. д.), рекламы и любого другого кода до момента,
когда посетитель **подтвердит, что он человек**: нажмёт кнопку в приветственном окне. Боты, которые не взаимодействуют
с окном или делают это «по-роботски», не попадают в статистику, поэтому меньше искажают поведенческие факторы.

- Без runtime-зависимостей: jQuery и FancyBox не нужны.
- Коды счётчиков вставляются в `<template>` как есть, без экранирования.
- Окно создаётся скриптом, HTML-разметку на страницу добавлять не нужно.
- Стили по БЭМ (блок `pts-lazyload`), тема настраивается через CSS-переменные, параметр `theme` или SCSS.
- Структуру окна можно полностью заменить шаблонами, как в [Choices](https://github.com/Choices-js/Choices).
- Готовые примеры для [1С-Битрикс, WordPress, Tilda, MODX, OpenCart, Laravel и Symfony](docs/cms.md).
- Совместим с конфигурацией v2.x (см. «[Переход с v2.x](#переход-с-v2x)»).

> [!TIP]
> **[Онлайн-конструктор](https://ak-alz.github.io/pts-lazyload/)** — настройте окно визуально, вставьте номер счётчика и скопируйте готовый код.
>
> Вопросы по установке и работе скрипта — в техподдержку Pixel Tools: **https://tools.pixelplus.ru/ask**

---

## Содержание

- [Быстрый старт](#быстрый-старт)
- [Установка в CMS](#установка-в-cms)
- [Параметры](#параметры)
- [Описание параметров](#описание-параметров)
- [API](#api)
- [Темы и внешний вид](#темы-и-внешний-вид)
- [Шаблоны окна](#шаблоны-окна)
- [События и колбэки](#события-и-колбэки)
- [Как работает защита](#как-работает-защита)
- [Доступность и валидность](#доступность-и-валидность)
- [Возможности и ограничения](#возможности-и-ограничения)
- [Переход с v2.x](#переход-с-v2x)
- [FAQ](#faq)
- [Статьи и поддержка](#статьи-и-поддержка)
- [Разработка](#разработка)

---

## Быстрый старт

Самый простой способ — **[онлайн-конструктор](https://ak-alz.github.io/pts-lazyload/)**: настройте внешний вид окна, укажите номер счётчика
Яндекс Метрики или Google Analytics, скопируйте готовый код и вставьте его перед `</body>`. Ниже — то же самое вручную.

### 1. Файлы

Готовые файлы лежат в `build/`:

| Файл                   | Назначение                          |
|------------------------|-------------------------------------|
| `pts.lazyload.min.js`  | Скрипт для продакшена               |
| `pts.lazyload.min.css` | Стили для продакшена                |
| `pts.lazyload.js`      | Скрипт без минификации, для отладки |
| `pts.lazyload.css`     | Стили без минификации               |

Скопируйте `pts.lazyload.min.js` и `pts.lazyload.min.css` на сайт, например в `/libs/pts-lazyload/`.

Если загрузить файлы на сервер нельзя (Tilda, конструкторы сайтов), подключите их с CDN jsDelivr прямо из репозитория:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/ak-alz/pts-lazyload@v3.0.0/build/pts.lazyload.min.css">
<script src="https://cdn.jsdelivr.net/gh/ak-alz/pts-lazyload@v3.0.0/build/pts.lazyload.min.js"></script>
```

Указывайте точную версию (`@v3.0.0`), а не ветку: так обновление скрипта не изменит поведение сайта без вашего ведома.

### 2. Стили

```html
<link rel="stylesheet" href="/libs/pts-lazyload/pts.lazyload.min.css">
```

### 3. Коды счётчиков

Оберните коды счётчиков в `<template data-pts-lazyload>`. Код вставляется **как есть**, в том виде, в каком его выдаёт
Метрика или Google Analytics, ничего экранировать не нужно:

```html
<template data-pts-lazyload>
    <!-- Yandex.Metrika counter -->
    <script type="text/javascript">
       (function(m,e,t,r,i,k,a){ ... })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
       ym(12345678, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true});
    </script>
    <noscript><div><img src="https://mc.yandex.ru/watch/12345678" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
    <!-- /Yandex.Metrika counter -->
</template>

<template data-pts-lazyload>
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-XXXXXXX');
    </script>
</template>
```

Пока посетитель не подтвердил, что он человек, браузер не выполняет содержимое `<template>`. После подтверждения код
вставляется на место шаблона (или в элемент из `data-area`, см. [`counterSelector`](#counterselector)). Шаблоны можно
ставить и в `<head>`, и в `<body>`, в любом количестве.

> [!IMPORTANT]
> Уберите счётчики из всех остальных мест: из настроек CMS, модулей и плагинов аналитики, Google Tag Manager.
> Иначе они загрузятся в обход скрипта, и защита не будет работать.

### 4. Скрипт и инициализация

```html
<script src="/libs/pts-lazyload/pts.lazyload.min.js"></script>
<script>
    new PtsLazyLoad().init();
</script>
```

Скрипт и инициализацию можно поставить где угодно: в `<head>`, в начале или в конце `<body>`. Скрипт дождётся загрузки
всей страницы и найдёт все шаблоны.

### 5. Проверка

Откройте сайт в режиме инкогнито, DevTools → Network → фильтр JS. Пока окно открыто, `tag.js` (Метрика) и `gtag/js`
(Google Analytics) не загружаются. После нажатия кнопки — загружаются. Подробности: [FAQ](#faq).

---

## Установка в CMS

Пошаговые инструкции с готовым кодом — в отдельном файле **[docs/cms.md](docs/cms.md)**:

- [HTML-сайт](docs/cms.md#html-сайт)
- [1С-Битрикс](docs/cms.md#1с-битрикс)
- [WordPress](docs/cms.md#wordpress)
- [Tilda](docs/cms.md#tilda)
- [MODX Revolution](docs/cms.md#modx-revolution)
- [OpenCart](docs/cms.md#opencart)
- [Laravel и Symfony](docs/cms.md#laravel-и-symfony)
- [Google Tag Manager](docs/cms.md#google-tag-manager)

---

## Параметры

Сводная таблица. Подробное описание каждого параметра с примерами — [ниже](#описание-параметров).

| Параметр | Тип | По умолчанию | Кратко |
|---|---|---|---|
| [`counterSelector`](#counterselector) | `string \| false` | `'template[data-pts-lazyload]'` | Селектор шаблонов со счётчиками |
| [`counters`](#counters) | `Array` | `[]` | Счётчики в JS-строках (способ из v2.x) |
| [`cookieName`](#cookiename) | `string` | `'pts-lazyload-verified'` | Имя cookie и ключа `localStorage` |
| [`cookieTime`](#cookietime) | `number` | `365` | Срок жизни подтверждения, дней (до 400) |
| [`cookieDomain`](#cookiedomain) | `string` | `''` | Домен cookie (`.site.ru` для `www` и без) |
| [`salt`](#salt) | `string` | `location.hostname` | Соль подписи токена |
| [`botBehavior`](#botbehavior) | `'skip' \| 'load'` | `'skip'` | Что делать с поисковыми роботами |
| [`botUserAgents`](#botuseragents) | `string[]` | список в коде | User-Agent поисковых роботов |
| [`skipForSearchVisitors`](#skipforsearchvisitors) | `boolean` | `false` | Без окна для переходов из поиска |
| [`searchReferrers`](#searchreferrers) | `Array<RegExp \| string>` | поисковики | Правила поискового реферера |
| [`legacyEvent`](#legacyevent) | `boolean` | `true` | Событие `ptz-click` из v2.1 |
| [`lockScroll`](#lockscroll) | `boolean` | `true` | Блокировать прокрутку под окном |
| [`declineButton`](#declinebutton) | `boolean` | `false` | Кнопка «Только необходимые»: закрыть без счётчиков |
| [`declineTime`](#declinetime) | `number` | `0` | Сколько дней помнить отказ, `0` — до закрытия вкладки |
| [`closeButton`](#closebutton) | `boolean` | `false` | Крестик в углу окна |
| [`closeOnOverlay`](#closeonoverlay) | `boolean` | `false` | Закрытие кликом по затемнению |
| [`closeOnEscape`](#closeonescape) | `boolean` | `false` | Закрытие клавишей Escape |
| [`modal.title`](#modaltitle) | `string` | `''` | Заголовок окна |
| [`modal.text`](#modaltext) | `string` | `'Мы используем файлы cookie…'` | Текст окна |
| [`modal.content`](#modalcontent) | `string \| Element` | `''` | HTML или элемент вместо текста |
| [`modal.buttonText`](#modalbuttontext) | `string` | `'Принять'` | Текст кнопки |
| [`modal.modifier`](#modalmodifier) | `string` | `''` | БЭМ-модификаторы окна |
| [`modal.ariaLabel`](#modalarialabel) | `string` | `'Использование файлов cookie'` | Подпись окна для скринридеров |
| [`modal.closeLabel`](#modalcloselabel) | `string` | `'Закрыть'` | Подпись крестика для скринридеров |
| [`modal.closeIcon`](#modalcloseicon) | `string` | `'&times;'` | Иконка крестика (HTML, SVG) |
| [`modal.declineText`](#modaldeclinetext) | `string` | `'Только необходимые'` | Текст кнопки отказа |
| [`colorScheme`](#colorscheme) | `'light' \| 'dark' \| 'auto'` | `'light'` | Тема окна, `auto` — как в системе |
| [`theme`](#theme) | `Object` | `{}` | Цвета, шрифты, отступы, размеры, анимация |
| [`themeDark`](#themedark) | `Object` | `{}` | Цвета для тёмной темы |
| [`autoFocus`](#autofocus) | `boolean` | `true` | Ставить фокус на кнопку при открытии |
| [`classNames`](#classnames) | `Object` | классы `pts-lazyload*` | Классы частей окна |
| [`templates`](#templates) | `Function \| Object` | `null` | Свои шаблоны окна |
| [`protection.minDelay`](#protectionmindelay) | `number` | `1200` | Минимальная пауза перед кликом, мс |
| [`protection.requirePointerMovement`](#protectionrequirepointermovement) | `boolean` | `true` | Требовать движение мыши |
| [`protection.rejectCenterClick`](#protectionrejectcenterclick) | `boolean` | `true` | Отклонять клик ровно в центр |
| [`protection.honeypot`](#protectionhoneypot) | `boolean` | `true` | Кнопка-ловушка |
| [`protection.detectWebdriver`](#protectiondetectwebdriver) | `boolean` | `true` | Блокировать автоматизированные браузеры |
| [`intercept`](#intercept) | `Object` | `{}` | Перехват действий посетителя |
| [`onShow`](#onshow) | `Function` | `null` | Окно показано |
| [`onVerify`](#onverify) | `Function` | `null` | Счётчики загружены |
| [`onReject`](#onreject) | `Function` | `null` | Клик не засчитан |
| [`onBlock`](#onblock) | `Function` | `null` | Посетитель заблокирован |
| [`onDismiss`](#ondismiss) | `Function` | `null` | Окно закрыто без подтверждения |
| [`debug`](#debug) | `boolean` | `false` | Логировать решения в консоль |

---

## Описание параметров

### Счётчики

#### `counterSelector`

**Тип:** `string | false` **По умолчанию:** `'template[data-pts-lazyload]'`

CSS-селектор шаблонов `<template>` с кодами счётчиков. После подтверждения содержимое каждого найденного шаблона
вставляется в страницу и выполняется.

Место вставки задаётся атрибутом `data-area` с CSS-селектором. Без него код встаёт на место шаблона.

Скрипты выполняются в том же порядке, что и при обычной загрузке страницы: если внешний `<script src>` идёт без `async`,
следующий за ним код ждёт его загрузки. Поэтому коды вида «библиотека + инициализация» (VK-пиксель, виджеты) работают.

`false` отключает поиск шаблонов, тогда загружаются только [`counters`](#counters).

```html
<!-- код встанет на место шаблона -->
<template data-pts-lazyload>
    <script src="https://vk.com/js/api/openapi.js?169"></script>
    <script>VK.Retargeting.Init('VK-RTRG-XXXXXX-XXXXX'); VK.Retargeting.Hit();</script>
</template>

<!-- код вставится в конец .footer-scripts -->
<template data-pts-lazyload data-area=".footer-scripts">
    ...
</template>
```

```js
// свой атрибут, например если data-pts-lazyload уже занят
new PtsLazyLoad({counterSelector: 'template.lazy-counter'}).init();
```

#### `counters`

**Тип:** `Array<{html: string, area?: string}>` **По умолчанию:** `[]`

Коды счётчиков в JS-строках — способ из v2.x. Удобен, если коды приходят из настроек CMS или собираются на сервере.

- `html` — HTML и скрипты. Закрывающий тег нужно экранировать: `<\/script>`, иначе браузер закроет внешний `<script>` раньше времени.
- `area` — CSS-селектор элемента, в конец которого вставляется код. По умолчанию `head`.

```js
new PtsLazyLoad({
    counters: [
        {html: `<script src="https://mc.yandex.ru/metrika/tag.js" async><\/script>`},
        {html: `<div id="chat-widget"><\/div><script src="/chat.js"><\/script>`, area: '.footer'},
    ],
}).init();
```

> [!TIP]
> Если коды вставляет человек, используйте `<template>`: в нём экранировать ничего не нужно.

### Токен подтверждения

#### `cookieName`

**Тип:** `string` **По умолчанию:** `'pts-lazyload-verified'`

Имя cookie и ключа `localStorage`, в которых хранится подписанный токен подтверждения. Задавать не обязательно. Своё
имя немного усложняет жизнь универсальным ботам, настроенным под стандартные значения.

```js
new PtsLazyLoad({cookieName: 'shop_v'}).init();
```

#### `cookieTime`

**Тип:** `number` **По умолчанию:** `365`

Сколько дней посетитель считается подтверждённым. Срок продлевается при каждом визите (раз в сутки токен
перевыпускается), поэтому постоянные посетители окно больше не увидят.

Некорректное значение (`'1 год'`, `0`, `NaN`) заменяется на 365, значение больше 400 обрезается до 400: браузеры не
хранят cookie дольше.

```js
new PtsLazyLoad({cookieTime: 30}).init(); // окно снова через 30 дней без визитов
```

#### `cookieDomain`

**Тип:** `string` **По умолчанию:** `''` (текущий домен)

Домен cookie. Нужен, если сайт открывается и с `www`, и без него, или подтверждение должно действовать на поддоменах.
Соль подписи по умолчанию тогда тоже берётся из `cookieDomain`, поэтому токен, выданный на одном поддомене,
подходит на всех.

```js
new PtsLazyLoad({cookieDomain: '.site.ru'}).init(); // site.ru, www.site.ru, msk.site.ru
```

#### `salt`

**Тип:** `string` **По умолчанию:** `location.hostname`

Соль подписи токена. Подпись не даёт подставить в cookie произвольное значение вроде `true`, а соль делает подпись
своей для каждого сайта: токен с другого сайта или от генератора, рассчитанного на значения по умолчанию, не подойдёт.

По умолчанию соль — домен сайта, поэтому задавать её не обязательно. При смене `salt` все посетители один раз увидят
окно снова.

```js
new PtsLazyLoad({salt: 'k8Fq2-zT9xw'}).init();
```

> [!NOTE]
> Это не секрет: соль видна в коде страницы, как и весь скрипт. Она отсекает универсальных ботов, но не бота,
> написанного под ваш сайт.
> См. «[Чего защита не может](#чего-защита-не-может)».

### Роботы и переходы из поиска

#### `botBehavior`

**Тип:** `'skip' | 'load'` **По умолчанию:** `'skip'`

Что делать с посетителями, у которых User-Agent поискового робота (см. [`botUserAgents`](#botuseragents)):

- `'skip'` — окно не показывать, счётчики не загружать. Настоящим роботам счётчики не нужны, а бот, подменивший User-Agent, ничего не получит;
- `'load'` — загрузить счётчики без окна. Так работала v2.x. Небезопасно: подмена User-Agent снова откроет счётчики ботам.

В режиме `'skip'` статус счётчика в интерфейсе Метрики может быть «Не найден», хотя данные от посетителей поступают.

```js
new PtsLazyLoad({botBehavior: 'load'}).init();
```

#### `botUserAgents`

**Тип:** `string[]` **По умолчанию:** Googlebot, YandexBot и другие роботы Google, Яндекса, Bing, Mail.ru, Rambler, DuckDuckGo, Apple, Baidu

Подстроки User-Agent, по которым посетитель считается поисковым роботом. Сравнение без учёта регистра. Массив заменяет
список по умолчанию, поэтому для расширения возьмите его из `PtsLazyLoad.defaults`:

```js
new PtsLazyLoad({
    botUserAgents: PtsLazyLoad.defaults.botUserAgents.concat(['SeznamBot', 'MyMonitoringBot']),
}).init();
```

#### `skipForSearchVisitors`

**Тип:** `boolean` **По умолчанию:** `false`

Не показывать окно посетителям, пришедшим из поисковиков (см. [`searchReferrers`](#searchreferrers)), и сразу загружать
им счётчики.

> [!WARNING]
> Боты накрутки поведенческих факторов приходят именно из поиска, а реферер в автоматизированном браузере
> подделывается одной строкой. Этот режим заметно ослабляет защиту.

```js
new PtsLazyLoad({skipForSearchVisitors: true}).init();
```

#### `searchReferrers`

**Тип:** `Array<RegExp | string>` **По умолчанию:** Google, Яндекс, ya.ru, Bing, Rambler, Поиск Mail.ru

Правила для [`skipForSearchVisitors`](#skipforsearchvisitors). `RegExp` проверяется против `document.referrer`, строка
сравнивается с началом адреса.

```js
new PtsLazyLoad({
    skipForSearchVisitors: true,
    searchReferrers: [/^https:\/\/(www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?\//i, 'https://duckduckgo.com/'],
}).init();
```

### Окно

#### `modal.title`

**Тип:** `string` **По умолчанию:** `''`

Заголовок окна. Без заголовка блок не выводится. Текст экранируется.

```js
new PtsLazyLoad({modal: {title: 'Добро пожаловать!'}}).init();
```

#### `modal.text`

**Тип:** `string` **По умолчанию:** `'Мы используем файлы cookie, чтобы сайт работал корректно и был удобнее для вас. Продолжая пользоваться сайтом, вы соглашаетесь с их использованием.'`

Текст окна под заголовком. Пустая строка начинает новый абзац, перенос строки внутри абзаца сохраняется. Текст
экранируется: для ссылок и разметки используйте [`modal.content`](#modalcontent).

Окно можно использовать не только как уведомление о cookie: выбор города, подтверждение возраста, приветствие.

```js
new PtsLazyLoad({
    modal: {
        title: 'Вам есть 18 лет?',
        text: 'Сайт содержит информацию для взрослых.\n\nПодтвердите, что вам исполнилось 18 лет.',
        buttonText: 'Да',
    },
}).init();
```

#### `modal.content`

**Тип:** `string | Element` **По умолчанию:** `''`

Содержимое окна вместо [`modal.text`](#modaltext): несколько абзацев, ссылки, списки, картинки.

- **Строка** — HTML. Не экранируется, поэтому не передавайте в него данные от посетителей.
- **Элемент** — копируется в окно, оригинал остаётся на странице. Удобнее всего `<template>`: его содержимое не видно
  на странице, а HTML пишется обычной вёрсткой, без JS-строк.

```js
new PtsLazyLoad({
    modal: {content: '<p>Мы используем cookie.</p><p><a href="/privacy">Политика конфиденциальности</a></p>'},
}).init();
```

```html
<template id="welcome">
    <p>Мы используем файлы cookie, чтобы сайт работал лучше.</p>
    <p>Подробнее — в <a href="/privacy">политике конфиденциальности</a>.</p>
</template>

<script>
    new PtsLazyLoad({modal: {content: document.getElementById('welcome')}}).init();
</script>
```

#### `modal.buttonText`

**Тип:** `string` **По умолчанию:** `'Принять'`

Текст кнопки подтверждения. Экранируется.

```js
new PtsLazyLoad({modal: {buttonText: 'Принять'}}).init();
```

#### `modal.modifier`

**Тип:** `string` **По умолчанию:** `''`

БЭМ-модификаторы окна через пробел. Каждый превращается в класс `pts-lazyload--<модификатор>`. Встроенные:

- `bottom` — плашка внизу экрана, страница остаётся доступной (используйте вместе с `lockScroll: false`). Плашка
  немодальная: без `aria-modal`, фокус по Tab свободно переходит между ней и страницей;
- `inline` — текст слева, кнопки справа, как в cookie-плашке. На экранах до 575 px (как в Bootstrap) кнопка переносится под текст.
  Чаще всего — вместе с `bottom`: `modifier: 'bottom inline'`.

Свои модификаторы стилизуйте сами. Модификатор `dark` из первых версий v3 работает как [`colorScheme: 'dark'`](#colorscheme).

```js
new PtsLazyLoad({modal: {modifier: 'bottom'}, lockScroll: false}).init();
```

#### `modal.ariaLabel`

**Тип:** `string` **По умолчанию:** `'Использование файлов cookie'`

Подпись окна для скринридеров (`aria-label`), если нет [`modal.title`](#modaltitle). С заголовком окно подписывается им.

#### `modal.closeLabel`

**Тип:** `string` **По умолчанию:** `'Закрыть'`

Подпись крестика для скринридеров (`aria-label`), см. [`closeButton`](#closebutton).

#### `modal.closeIcon`

**Тип:** `string` **По умолчанию:** `'&times;'`

Содержимое крестика: символ или HTML, например SVG-иконка. Размер иконки — `1em`, его задаёт `theme.close.fontSize`.

```js
new PtsLazyLoad({
    closeButton: true,
    modal: {closeIcon: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2"/></svg>'},
}).init();
```

### Кнопка «Только необходимые»

#### `declineButton`

**Тип:** `boolean` **По умолчанию:** `false`

Вторая кнопка рядом с основной. Она закрывает окно, но счётчики не загружаются и токен подтверждения не записывается:
посетитель отказался от необязательных cookie. Генерируется событие `pts-lazyload:dismiss` с `reason: 'decline'`.

Отказ запоминается на срок [`declineTime`](#declinetime), чтобы окно не появлялось на каждой странице. Пока он действует,
окно не показывается, счётчики не загружаются, генерируется `pts-lazyload:blocked` с `reason: 'declined'`. Если
посетитель позже нажмёт «Принять» (например, открыв окно через [`show()`](#show)), отказ снимается.

Кнопки делят строку поровну. Если не помещаются — встают друг под другом, основная сверху.

Нажатие не проверяется на бота: боту отказ ничего не даёт.

Вид кнопки настраивается в группе [`theme.decline`](#все-переменные): по умолчанию — без заливки, с неяркой рамкой;
размеры, скругление и шрифт берутся у основной кнопки. Без рамки — `decline: {border: 'none'}`, серая —
`decline: {background: 'rgba(127, 127, 127, .12)', border: 'none'}`. В [конструкторе](https://ak-alz.github.io/pts-lazyload/)
это раздел «Кнопка „Только необходимые“».

```js
new PtsLazyLoad({
    declineButton: true,
    theme: {decline: {color: '#6b7280', border: 'none', backgroundHover: '#f3f4f6'}},
}).init();
```

```js
const pts = new PtsLazyLoad({declineButton: true, declineTime: 30}).init();

// ссылка «Настройки cookie» в футере сайта
document.querySelector('.cookie-settings').addEventListener('click', () => pts.show());
```

> [!NOTE]
> Посетитель, нажавший «Только необходимые», не попадёт в статистику, как и бот. Включайте кнопку, если отказ от
> аналитических cookie нужен по закону или по политике сайта.

#### `declineTime`

**Тип:** `number` (дни) **По умолчанию:** `0`

Сколько помнить отказ. `0` — до закрытия вкладки (`sessionStorage`): на следующих страницах окно не появится, при
новом визите — появится снова. Больше нуля — столько дней (cookie `<cookieName>-declined`), не больше 400.

#### `modal.declineText`

**Тип:** `string` **По умолчанию:** `'Только необходимые'`

Текст кнопки отказа. Экранируется.

### Закрытие окна

По умолчанию окно закрывается только кнопкой подтверждения. Опции ниже добавляют другие способы закрыть его.

**Закрытие засчитывается как подтверждение**: счётчики загружаются, токен записывается, как после нажатия кнопки.
Иначе человек, закрывший окно, полностью выпал бы из статистики. Защита при этом не слабеет: закрытие проходит те же
[проверки](#как-работает-защита), что и нажатие кнопки, а при отказе окно остаётся и генерируется событие `reject`.

Как именно посетитель подтвердил, видно по `reason` в [`onVerify`](#onverify): `click`, `close`, `overlay` или `escape`.

Поведение любого действия можно изменить через [`intercept`](#intercept): например, сделать крестик отказом.

```js
new PtsLazyLoad({closeButton: true, closeOnOverlay: true, closeOnEscape: true}).init();
```

#### `closeButton`

**Тип:** `boolean` **По умолчанию:** `false`

Крестик в правом верхнем углу окна. Рендерится шаблоном [`close`](#части-окна), поэтому его можно перестилить или
заменить, например на кнопку «Не сейчас». Подпись для скринридеров — [`modal.closeLabel`](#modalcloselabel).

Нажатие проверяется так же, как нажатие основной кнопки: настоящий клик, пауза после показа окна, движение мыши,
не в центр. С клавиатуры крестик доступен через Tab.

#### `closeOnOverlay`

**Тип:** `boolean` **По умолчанию:** `false`

Закрытие кликом по затемнению вокруг окна. Клик внутри окна (по тексту, заголовку) окно не закрывает. Не закрывает его
и выделение текста в окне, если кнопку мыши отпустили на затемнении: нажатие должно начаться на затемнении.

С модификатором `bottom` затемнения нет, клики проходят на страницу, и опция ни на что не влияет.

#### `closeOnEscape`

**Тип:** `boolean` **По умолчанию:** `false`

Закрытие клавишей Escape. Засчитывается настоящее нажатие клавиши не раньше [`minDelay`](#protectionmindelay) после показа
окна, так же как нажатие Enter на кнопке.

#### `autoFocus`

**Тип:** `boolean` **По умолчанию:** `true`

При открытии поставить фокус на кнопку подтверждения: посетитель с клавиатуры сразу нажмёт Enter, скринридер
прочитает окно. Отключайте, если окно показывается рядом с полем ввода и не должно забирать у него фокус.

#### `lockScroll`

**Тип:** `boolean` **По умолчанию:** `true`

Блокировать прокрутку страницы, пока окно открыто: на `<html>` ставится класс `pts-lazyload-locked`.

```js
new PtsLazyLoad({lockScroll: false}).init();
```

#### `theme`

**Тип:** `Object` **По умолчанию:** `{}`

Внешний вид окна прямо из JS: цвета, шрифты, отступы, размеры, скругления, тени, анимация, значения для мобильных
([`breakpoints`](#мобильная-версия-и-брейкпоинты)). Общие ключи (`accent`,
`fontFamily`…) задаются на верхнем уровне, стили элементов — в группах `dialog`, `overlay`, `title`, `text`, `actions`,
`button`, `close`, анимация — в `animation`. Числа становятся пикселями (`fontSize: 18` → `18px`), кроме безразмерных
свойств (`fontWeight`, `lineHeight`, `opacity`, `zIndex`).

Каждый ключ превращается в CSS-переменную на окне, поэтому всё то же можно задать и из CSS. Полный список — в разделе
«[Темы и внешний вид](#темы-и-внешний-вид)».

```js
new PtsLazyLoad({
    theme: {
        accent: '#16a34a',
        title: {fontSize: 28, fontWeight: 700},
        text: {fontSize: 15, color: '#555'},
        button: {radius: 999, textTransform: 'none', padding: '0 40px'},
        close: {color: '#999', size: 40},
        animation: 'zoom',
    },
}).init();
```

#### `colorScheme`

**Тип:** `'light' | 'dark' | 'auto'` **По умолчанию:** `'light'`

Тема окна:

- `'light'` — светлая;
- `'dark'` — тёмная;
- `'auto'` — как в системе посетителя (`prefers-color-scheme`). Если посетитель переключит тему системы, окно
  перекрасится сразу, даже открытое.

Если на сайте есть свой переключатель темы, вызывайте [`setColorScheme()`](#setcolorschemescheme):

```js
const pts = new PtsLazyLoad({colorScheme: document.documentElement.classList.contains('dark') ? 'dark' : 'light'}).init();

themeToggle.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    pts.setColorScheme(dark ? 'dark' : 'light');
});
```

#### `themeDark`

**Тип:** `Object` **По умолчанию:** `{}`

Значения [`theme`](#theme) для тёмной темы, в том же формате. В тёмной теме применяются `theme` и поверх него `themeDark`.

Цвета, фоны, рамки и тени из `theme` (всё, где в имени есть `background`, `color`, `border` или `shadow`: `dialog.background`,
`dialog.border`, `dialog.shadow`, `title.color`, `text.linkColor`, `overlay.background`, цвета крестика и кнопки отказа…)
относятся только к светлой теме: иначе светлый фон или рамка окна остались бы и в тёмной. Для тёмной темы их берут
из `themeDark` или из тёмных значений по умолчанию. Общие для обеих тем — акцент (`accent*`), основная кнопка
(`button.*`), шрифты, размеры, скругления, анимация.

```js
new PtsLazyLoad({
    colorScheme: 'auto',
    theme: {accent: '#16a34a', dialog: {background: '#fffdf5', radius: 20}},
    themeDark: {accent: '#4ade80', accentText: '#052e16', dialog: {background: '#0f1a14'}},
}).init();
```

#### `classNames`

**Тип:** `Object` **По умолчанию:** классы `pts-lazyload*`

Классы частей окна. Передаются в [шаблоны](#шаблоны-окна) и используются для модификаторов, открытия и блокировки
прокрутки. Можно заменить часть ключей, остальные останутся по умолчанию. Полный список — в разделе
«[`classNames`](#полный-список-classnames)».

```js
// добавить кнопке классы дизайн-системы сайта, сохранив стили pts-lazyload
new PtsLazyLoad({classNames: {button: 'pts-lazyload__button btn btn-primary'}}).init();
```

#### `templates`

**Тип:** `Function | Object` **По умолчанию:** `null`

Свои шаблоны частей окна, как `callbackOnCreateTemplates` в Choices. Подробно — в разделе «[Шаблоны окна](#шаблоны-окна)».

```js
new PtsLazyLoad({
    templates: ({escape}) => ({
        button: ({classNames}, {text}) => `<button class="${classNames.button}">✓ ${escape(text)}</button>`,
    }),
}).init();
```

### Защита

Как работают проверки — в разделе «[Как работает защита](#как-работает-защита)». Отключать их стоит, только если
понимаете, зачем: каждая отсекает свой класс ботов.

#### `protection.minDelay`

**Тип:** `number` (мс) **По умолчанию:** `1200`

Клики раньше этого времени после появления окна не засчитываются: скрипты нажимают кнопку сразу. Человек, который
кликнул слишком рано, просто нажмёт ещё раз.

```js
new PtsLazyLoad({protection: {minDelay: 2000}}).init();
```

#### `protection.requirePointerMovement`

**Тип:** `boolean` **По умолчанию:** `true`

Для мыши требовать движение курсора перед кликом. Автоматизация «телепортирует» курсор к кнопке одним событием.
На касания и клавиатуру не влияет.

#### `protection.rejectCenterClick`

**Тип:** `boolean` **По умолчанию:** `true`

Отклонять клики мышью ровно в геометрический центр кнопки (±1 px): так кликают Puppeteer и Playwright, а человек туда
почти не попадает. На касания и клавиатуру не влияет.

#### `protection.honeypot`

**Тип:** `boolean` **По умолчанию:** `true`

Добавлять перед настоящей кнопкой невидимую кнопку-ловушку с тем же классом и текстом. Бот, который ищет кнопку по
классу или тексту, нажмёт ловушку, и до перезагрузки страницы подтверждение станет невозможным.

#### `protection.detectWebdriver`

**Тип:** `boolean` **По умолчанию:** `true`

Не показывать окно и не загружать счётчики в автоматизированных браузерах: `navigator.webdriver`, HeadlessChrome,
PhantomJS, Electron. Отключите для своих автотестов, если они должны видеть окно.

```js
new PtsLazyLoad({protection: {detectWebdriver: false}}).init();
```

### Перехват действий

#### `intercept`

**Тип:** `{button?, decline?, close?, overlay?, escape?}` **По умолчанию:** `{}`

Перехват действий посетителя: нажатия кнопки (`button`), кнопки отказа (`decline`), крестика (`close`), клика по
затемнению (`overlay`) и Escape (`escape`). По умолчанию `decline` — отказ, остальные подтверждают посетителя.
Перехватчик решает сам:

```js
intercept: {
    close: (ctx, next) => {
        // next()         — выполнить действие по умолчанию: подтвердить посетителя и загрузить счётчики
        // ctx.dismiss()  — закрыть окно без подтверждения: счётчики не загрузятся, на следующей странице окно появится снова
        // ничего         — окно остаётся открытым
    },
}
```

`ctx`: `action` — имя действия, `event` — исходное событие (`click` или `keydown`), `dismiss()` — отказ.

- Перехватчик вызывается **только для действий, прошедших проверку на бота**. Отклонённые клики до него не доходят,
  для них по-прежнему генерируется `reject`.
- `next()` и `dismiss()` можно вызвать позже, например после своего диалога или запроса на сервер. Срабатывает только
  первый вызов.
- Если перехватчик выбросил исключение, действие выполняется по умолчанию: ошибка в коде сайта не должна лишать
  посетителя возможности подтвердиться.

```js
new PtsLazyLoad({
    closeButton: true,
    closeOnEscape: true,
    intercept: {
        // крестик — отказ: окно закрывается, счётчики не загружаются
        close: (ctx) => ctx.dismiss(),

        // Escape ничего не делает, хотя closeOnEscape включён
        escape: () => {},

        // перед подтверждением отправить цель в свою систему аналитики
        button: (ctx, next) => {
            fetch('/api/consent', {method: 'POST'}).finally(next);
        },
    },
}).init();
```

Отказ можно запомнить на сессию, чтобы окно не появлялось на каждой странице:

```js
if (!sessionStorage.getItem('pts-dismissed')) {
    new PtsLazyLoad({
        closeButton: true,
        intercept: {close: (ctx) => ctx.dismiss()},
        onDismiss: () => sessionStorage.setItem('pts-dismissed', '1'),
    }).init();
}
```

> [!WARNING]
> Посетитель, закрывший окно отказом, не попадёт в статистику — так же, как бот. Используйте `dismiss()`, только если
> отказ действительно нужен (например, требование законодательства о cookie).

### Колбэки

Колбэки вызываются вместе с [событиями](#события-и-колбэки) и получают тот же объект `detail`. Ошибка внутри колбэка
не мешает загрузке счётчиков.

#### `onShow`

**Тип:** `Function` **По умолчанию:** `null`

Окно показано. Счётчики в этот момент ещё не загружены.

```js
// например, спрятать онлайн-чат, чтобы он не перекрывал окно
new PtsLazyLoad({onShow: () => document.body.classList.add('has-pts-modal')}).init();
```

#### `onVerify`

**Тип:** `Function({reason})` **По умолчанию:** `null`

Счётчики загружены. `reason`: `click` (кнопка), `close` (крестик), `overlay` (клик по затемнению), `escape`,
`token` (повторный визит), `no-check` (`init(0)`), `search-bot`, `search-referrer`.

```js
new PtsLazyLoad({
    onVerify: ({reason}) => {
        if (reason === 'click') document.body.classList.add('is-verified');
    },
}).init();
```

#### `onReject`

**Тип:** `Function({reason})` **По умолчанию:** `null`

Клик по кнопке не засчитан, окно осталось. `reason`: `untrusted`, `too-fast`, `no-pointerdown`, `no-movement`,
`center-click`, `honeypot`.

```js
new PtsLazyLoad({onReject: ({reason}) => navigator.sendBeacon('/bot-log', reason)}).init();
```

#### `onBlock`

**Тип:** `Function({reason})` **По умолчанию:** `null`

Окно не показано и счётчики не загружены. `reason`: `automation`, `search-bot`, `declined` (посетитель ранее нажал
«Только необходимые»).

#### `onDismiss`

**Тип:** `Function({reason})` **По умолчанию:** `null`

Окно закрыто без подтверждения через `ctx.dismiss()` в [`intercept`](#intercept). `reason` — действие: `button`,
`close`, `overlay` или `escape`.

### Совместимость с v2.x

#### `legacyEvent`

**Тип:** `boolean` **По умолчанию:** `true`

Вместе с `pts-lazyload:verified` генерировать на `document` событие `ptz-click` из v2.1. На него подписываются сайты,
которые показывают рекламу только подтверждённым посетителям. Если вы его не используете, отключите.

```js
new PtsLazyLoad({legacyEvent: false}).init();
```

### Отладка

#### `debug`

**Тип:** `boolean` **По умолчанию:** `false`

Писать в консоль решения скрипта: почему загружены или не загружены счётчики, почему отклонён клик.

```js
new PtsLazyLoad({debug: true}).init();
// [pts-lazyload] клик отклонён: too-fast
// [pts-lazyload] загрузка счётчиков, причина: click
```

---

## API

#### `new PtsLazyLoad(options)`

Создаёт экземпляр. Ничего не делает до вызова `init()`. Старое имя `ptsLazyLoad` из v2.x тоже работает.

#### `init(needCheck?)`

Запускает проверку. Возвращает экземпляр. Повторные вызовы игнорируются.

| `needCheck` | Поведение |
|---|---|
| без аргумента, `1`, `true` | Обычная проверка: окно, токен, роботы |
| `0`, `false` | Проверка не нужна, счётчики загружаются сразу. Например, для авторизованных пользователей |

```twig
new PtsLazyLoad(options).init({{ app.user ? 0 : 1 }});
```

Скрипт дожидается разбора всей страницы (`DOMContentLoaded`), поэтому `init()` можно вызывать выше шаблонов со счётчиками.

#### `show()`

Показывает окно ещё раз — например, по ссылке «Настройки cookie» в футере, чтобы посетитель, отказавшийся от
необязательных cookie, мог передумать. Если счётчики уже загружены или окно открыто, ничего не делает. Возвращает экземпляр.

#### `setColorScheme(scheme)`

Меняет тему окна: `'light'`, `'dark'` или `'auto'`. Если окно открыто, оно перекрашивается сразу. Возвращает экземпляр.
Пример — в описании [`colorScheme`](#colorscheme).

#### `destroy()`

Закрывает окно и снимает обработчики, например при переходе в SPA. Уже загруженные счётчики остаются.

#### `PtsLazyLoad.version`

Версия скрипта, например `'3.0.0'`.

#### `PtsLazyLoad.defaults`

Значения по умолчанию. Изменения действуют на все экземпляры, созданные после них:

```js
PtsLazyLoad.defaults.modal.buttonText = 'Понятно';
```

---

## Темы и внешний вид

Внешний вид настраивается тремя способами, их можно сочетать:

1. **Параметр `theme`** — из JS, без CSS.
2. **CSS** — переменными `--pts-lazyload-*` или обычными свойствами классов.
3. **SCSS** — переопределением значений по умолчанию при сборке.

Все три работают через CSS-переменные: `theme` ставит их на корневой элемент окна, CSS — на класс `.pts-lazyload`,
SCSS задаёт значения на случай, если переменная не задана. Поэтому стили окна можно поменять любым способом, и они не
мешают друг другу.

### БЭМ-структура

```
.pts-lazyload                 корневой блок (role="dialog")
├── .pts-lazyload__overlay    затемнение
└── .pts-lazyload__dialog     окно
    ├── .pts-lazyload__close  крестик (closeButton)
    ├── .pts-lazyload__title  заголовок
    ├── .pts-lazyload__body   текст или content
    │   └── .pts-lazyload__text   абзац текста
    └── .pts-lazyload__actions
        ├── .pts-lazyload__decline  кнопка отказа (declineButton)
        └── .pts-lazyload__button

.pts-lazyload--open           окно открыто
.pts-lazyload--dark           тёмная тема (colorScheme)
.pts-lazyload--bottom         плашка внизу экрана, страница остаётся доступной (используйте с lockScroll: false)
.pts-lazyload--inline         текст слева, кнопки справа
.pts-lazyload--pristine       посетитель ещё не нажимал клавиш: кольцо фокуса скрыто
.pts-lazyload__aux            служебный элемент защиты, не трогайте
```

### Через `theme`

```js
new PtsLazyLoad({
    theme: {
        accent: '#ea580c',
        accentHover: '#c2410c',
        fontFamily: 'Georgia, serif',

        overlay: {background: 'rgba(30, 20, 10, .6)', blur: 4},
        dialog: {background: '#fff8ed', width: 560, padding: 44, radius: 24},
        title: {fontSize: 36, fontWeight: 700, color: '#7c2d12'},
        text: {fontSize: 18, color: '#9a3412', linkColor: '#ea580c'},
        button: {radius: 999, textTransform: 'none', fontSize: 18, padding: '0 40px'},
        close: {color: '#7c2d12', size: 40, opacity: 0.8},

        animation: {type: 'slide-down', duration: 450, easing: 'cubic-bezier(.2, .8, .2, 1.2)'},
    },
}).init();
```

Ключ `title.fontSize` превращается в переменную `--pts-lazyload-title-font-size`, `button.backgroundHover` — в
`--pts-lazyload-button-background-hover` и т. д. Можно задать и свою переменную: `{'--pts-lazyload-my-gap': '4px'}`.

Для адаптивных значений используйте `clamp()` или CSS-медиазапросы:

```js
theme: {title: {fontSize: 'clamp(22px, 5vw, 36px)'}}
```

### Через CSS

Переменными:

```css
.pts-lazyload {
    --pts-lazyload-accent: #e11d48;
    --pts-lazyload-title-font-size: 28px;
    --pts-lazyload-button-radius: 999px;
}

@media (max-width: 600px) {
    .pts-lazyload {
        --pts-lazyload-dialog-padding: 20px;
    }
}
```

Или обычными свойствами классов — подключите свой CSS после `pts.lazyload.css`:

```css
.pts-lazyload__title {
    letter-spacing: -.02em;
    text-transform: uppercase;
}
```

> [!NOTE]
> Значения из `theme` ставятся на элемент окна напрямую и поэтому важнее переменных из CSS. Если переменная задана
> и в `theme`, и в CSS, победит `theme`.

### Все переменные

| `theme` | CSS-переменная | По умолчанию |
|---|---|---|
| **Общие** | | |
| `accent` | `--pts-lazyload-accent` | `#0836ff` — кнопка, ссылки, фокус |
| `accentHover` | `--pts-lazyload-accent-hover` | `#0435c9` |
| `accentText` | `--pts-lazyload-accent-text` | `#fff` — текст кнопки |
| `fontFamily` | `--pts-lazyload-font-family` | `inherit` |
| `zIndex` | `--pts-lazyload-z-index` | `8000` |
| `gutter` | `--pts-lazyload-gutter` | `16px` — отступ окна от краёв экрана |
| **Затемнение** | | |
| `overlay.background` | `--pts-lazyload-overlay-background` | `rgba(0, 0, 0, .5)` |
| `overlay.blur` | `--pts-lazyload-overlay-blur` | `0px` — размытие страницы под окном |
| **Окно** | | |
| `dialog.background` | `--pts-lazyload-dialog-background` | `#fff` |
| `dialog.color` | `--pts-lazyload-dialog-color` | `#3d424b` — цвет текста |
| `dialog.width` | `--pts-lazyload-dialog-width` | `500px` — максимальная ширина |
| `dialog.padding` | `--pts-lazyload-dialog-padding` | `30px`, на мобильных `24px 20px` |
| `dialog.radius` | `--pts-lazyload-dialog-radius` | `8px` |
| `dialog.shadow` | `--pts-lazyload-dialog-shadow` | тень Material |
| `dialog.border` | `--pts-lazyload-dialog-border` | `none` |
| `dialog.textAlign` | `--pts-lazyload-dialog-text-align` | `center` |
| **Заголовок** | | |
| `title.color` | `--pts-lazyload-title-color` | `#3d424b` |
| `title.fontSize` | `--pts-lazyload-title-font-size` | `32px`, на мобильных `26px` |
| `title.fontWeight` | `--pts-lazyload-title-font-weight` | `300` |
| `title.lineHeight` | `--pts-lazyload-title-line-height` | `1.2` |
| `title.margin` | `--pts-lazyload-title-margin` | `0 0 20px` |
| `title.fontFamily` | `--pts-lazyload-title-font-family` | `inherit` |
| `title.textAlign` | `--pts-lazyload-title-text-align` | как у окна |
| **Текст** | | |
| `text.color` | `--pts-lazyload-text-color` | как у окна |
| `text.fontSize` | `--pts-lazyload-text-font-size` | `16px` |
| `text.lineHeight` | `--pts-lazyload-text-line-height` | `1.4` |
| `text.paragraphGap` | `--pts-lazyload-text-paragraph-gap` | `.75em` — отступ между абзацами |
| `text.linkColor` | `--pts-lazyload-text-link-color` | `accent` |
| `text.linkColorHover` | `--pts-lazyload-text-link-color-hover` | как `text.linkColor` |
| `text.linkDecoration` | `--pts-lazyload-text-link-decoration` | `underline`; `none` — без подчёркивания (значение `text-decoration-line`) |
| `text.linkDecorationHover` | `--pts-lazyload-text-link-decoration-hover` | как `text.linkDecoration` |
| `text.textAlign` | `--pts-lazyload-text-text-align` | как у окна |
| **Блок кнопок** | | |
| `actions.marginTop` | `--pts-lazyload-actions-margin-top` | `32px` |
| `actions.justify` | `--pts-lazyload-actions-justify` | `center` |
| `actions.gap` | `--pts-lazyload-actions-gap` | `12px` |
| **Кнопка** | | |
| `button.background` | `--pts-lazyload-button-background` | `accent` |
| `button.backgroundHover` | `--pts-lazyload-button-background-hover` | `accentHover` |
| `button.color` | `--pts-lazyload-button-color` | `accentText` |
| `button.colorHover` | `--pts-lazyload-button-color-hover` | как `button.color` |
| `button.fontSize` | `--pts-lazyload-button-font-size` | `16px` |
| `button.fontWeight` | `--pts-lazyload-button-font-weight` | `400` |
| `button.height` | `--pts-lazyload-button-height` | `50px` — минимальная, длинный текст переносится |
| `button.minWidth` | `--pts-lazyload-button-min-width` | `180px` |
| `button.width` | `--pts-lazyload-button-width` | `auto`, на мобильных `100%` |
| `button.padding` | `--pts-lazyload-button-padding` | `8px 32px` |
| `button.radius` | `--pts-lazyload-button-radius` | `5px` |
| `button.border` | `--pts-lazyload-button-border` | `none` |
| `button.shadow` | `--pts-lazyload-button-shadow` | тень Material |
| `button.textTransform` | `--pts-lazyload-button-text-transform` | `uppercase` |
| `button.letterSpacing` | `--pts-lazyload-button-letter-spacing` | `.02em` |
| **Кнопка отказа** | | размеры — как у основной кнопки |
| `decline.background` | `--pts-lazyload-decline-background` | `transparent` |
| `decline.backgroundHover` | `--pts-lazyload-decline-background-hover` | `rgba(127, 127, 127, .1)` |
| `decline.color` | `--pts-lazyload-decline-color` | цвет текста окна |
| `decline.border` | `--pts-lazyload-decline-border` | `1px solid rgba(127, 127, 127, .5)` |
| `decline.borderColorHover` | `--pts-lazyload-decline-border-color-hover` | `rgba(127, 127, 127, .8)` |
| `decline.colorHover` | `--pts-lazyload-decline-color-hover` | как `decline.color` |
| `decline.minWidth` | `--pts-lazyload-decline-min-width` | `0` |
| `decline.opacity` | `--pts-lazyload-decline-opacity` | `1` — ниже текст перестаёт проходить требования к контрасту |
| `decline.fontWeight` | `--pts-lazyload-decline-font-weight` | как у основной кнопки |
| **Крестик** | | |
| `close.size` | `--pts-lazyload-close-size` | `36px` — ширина и высота |
| `close.top` | `--pts-lazyload-close-top` | `8px` |
| `close.right` | `--pts-lazyload-close-right` | `8px` |
| `close.color` | `--pts-lazyload-close-color` | цвет текста окна |
| `close.fontSize` | `--pts-lazyload-close-font-size` | `28px` — размер иконки |
| `close.opacity` | `--pts-lazyload-close-opacity` | `.7`, при наведении `1`; ниже `.7` значок не проходит требования к контрасту |
| `close.background` | `--pts-lazyload-close-background` | `transparent` |
| `close.backgroundHover` | `--pts-lazyload-close-background-hover` | `rgba(127, 127, 127, .12)` |
| `close.radius` | `--pts-lazyload-close-radius` | `50%` |
| **Анимация** | | |
| `animation.type` | `--pts-lazyload-animation-transform` | `slide-up` |
| `animation.transform` | `--pts-lazyload-animation-transform` | `translateY(16px)` — откуда появляется окно |
| `animation.duration` | `--pts-lazyload-animation-duration` | `.3s` (число — миллисекунды) |
| `animation.easing` | `--pts-lazyload-animation-easing` | `ease` |

### Мобильная версия и брейкпоинты

В `theme.breakpoints` задаются значения для разных размеров экрана. Ключ — число («экран шириной до N px
включительно») или любой медиазапрос строкой. Значение — те же группы, что и в `theme`.

```js
new PtsLazyLoad({
    theme: {
        title: {fontSize: 36},
        dialog: {padding: 44},
        breakpoints: {
            768: {title: {fontSize: 30}},
            575: {title: {fontSize: 24}, dialog: {padding: 20}, gutter: 8},
            '(orientation: landscape) and (max-height: 500px)': {dialog: {padding: 16}},
        },
    },
}).init();
```

- На экране шириной 400 px применятся `theme`, затем значения для 768 и поверх них — для 575: меньший брейкпоинт
  важнее большего, порядок ключей неважен. Медиазапросы-строки применяются после числовых, в порядке объявления.
- Значения пересчитываются при повороте экрана и изменении размера окна, даже когда окно открыто.
- `themeDark` тоже поддерживает `breakpoints`.
- Без брейкпоинтов на экранах до 575 px (как в Bootstrap) действуют мобильные значения по умолчанию: меньше заголовок и отступы,
  кнопка на всю ширину. Значения из `theme` и `breakpoints` важнее их.

### Анимация появления

Окно появляется плавно: затемнение проявляется, а окно приезжает из положения `animation.transform` на своё место.

| `animation.type` | Эффект |
|---|---|
| `slide-up` | снизу вверх (по умолчанию) |
| `slide-down` | сверху вниз |
| `zoom` | увеличение |
| `fade` | только проявление |
| `none` | без анимации |

```js
theme: {animation: 'zoom'}
theme: {animation: {type: 'fade', duration: 150}}
theme: {animation: {transform: 'translateX(-40px) rotate(-2deg)', duration: 500, easing: 'ease-out'}}
```

У посетителей с включённым в системе «Уменьшением движения» (`prefers-reduced-motion`) анимация отключается.

### Через SCSS

Если сайт собирает стили из SCSS, подключите исходник и переопределите значения по умолчанию.
Все переменные перечислены в `src/scss/_variables.scss`:

```scss
@use 'pts-lazyload/src/scss/pts.lazyload' with (
    $accent: #e11d48,
    $title-font-size: 28px,
    $button-radius: 999px,
    $animation-transform: scale(.92),
    $mobile: 600px
);
```

SCSS задаёт значения по умолчанию, поэтому параметр `theme` и CSS-переменные продолжают работать.

---

## Шаблоны окна

Если стилей и `modal.*` недостаточно (нужен логотип, своя сетка, кнопка из дизайн-системы сайта), структуру окна можно
переопределить шаблонами. Подход такой же, как `callbackOnCreateTemplates` в [Choices](https://github.com/Choices-js/Choices).

```js
new PtsLazyLoad({
    modal: {title: 'Добро пожаловать!', text: 'Мы используем файлы cookie', buttonText: 'Принять'},

    classNames: {
        button: 'pts-lazyload__button site-btn site-btn--green',
    },

    templates: ({strToEl, escape, classNames}) => ({
        dialog: ({classNames}) => `
            <div class="${classNames.dialog} site-welcome">
                <img class="site-welcome__logo" src="/logo.svg" alt="">
                <div class="site-welcome__content">
                    <div data-slot="title"></div>
                    <div data-slot="body"></div>
                </div>
                <div data-slot="actions"></div>
            </div>`,

        body: ({classNames}, {text}) => `
            <div class="${classNames.body}">
                <p>${escape(text)}</p>
                <a href="/privacy">Политика конфиденциальности</a>
            </div>`,
    }),
}).init();
```

### Части окна

```
root                      корневой блок
├── overlay               затемнение
└── dialog                окно
    ├── close             только если включён closeButton
    ├── title             только если задан modal.title
    ├── body
    └── actions
        └── button        кнопка подтверждения
```

| Шаблон    | `data`                                  | Дочерние части в `data` |
|-----------|-----------------------------------------|-------------------------|
| `root`    | `{modifiers}` — массив из `modal.modifier` | `overlay`, `dialog`  |
| `overlay` | `{}`                                    | —                       |
| `dialog`  | `{}`                                    | `close`, `title`, `body`, `actions` |
| `title`   | `{title}`                               | —                       |
| `body`    | `{text, content}` — `content` уже строка или готовый узел | — |
| `actions` | `{}`                                    | `decline`, `button`     |
| `button`  | `{text}`                                | —                       |
| `decline` | `{text}` — из `modal.declineText`       | —                       |
| `close`   | `{label, icon}` — из `modal.closeLabel` и `modal.closeIcon` | —   |

Каждый шаблон — функция `({classNames, options}, data) => string | Element`. Переопределяйте только нужные части,
остальные будут по умолчанию. `templates` можно передать и объектом, без функции-обёртки.

В функцию-обёртку передаются помощники:

- `strToEl(html)` — превращает HTML-строку в `Element`;
- `escape(text)` — экранирует текст. **Данные в `data` приходят как есть**: `title`, `text` и `buttonText` вставляйте через `escape`;
- `classNames` — итоговые классы.

### Куда попадают дочерние части

Дочерние части (например, `title`, `body` и `actions` для `dialog`) приходят в `data` уже готовыми элементами. Есть три
способа их разместить:

1. **Ничего не делать.** Они добавятся в конец элемента в порядке из таблицы. Так работают шаблоны по умолчанию.
2. **Плейсхолдер в строке:** `<div data-slot="actions"></div>` заменяется соответствующим элементом.
3. **Вручную:** вернуть `Element` и вставить в него часть самостоятельно:

   ```js
   actions: ({classNames}, {button}) => {
       const el = strToEl(`<div class="${classNames.actions}"><span>Нажимая кнопку, вы соглашаетесь…</span></div>`);
       el.append(button);
       return el;
   }
   ```

### Что делает библиотека, а что шаблон

Шаблон отвечает только за внешний вид. Всё, от чего зависят защита и доступность, библиотека ставит сама после рендера,
поэтому ошибиться в шаблоне так, чтобы сломать защиту, нельзя:

- `role="dialog"`, `aria-modal`, `aria-labelledby` / `aria-label` и `id` заголовка;
- `type="button"` у кнопки и крестика, `aria-label` у крестика, если шаблон его не задал, фокус на кнопке при открытии,
  переход по Tab только внутри окна;
- кнопка-ловушка: строится **тем же шаблоном `button`**, поэтому для бота неотличима от настоящей, и ставится в DOM перед ней;
- класс открытия (`classNames.open`) и блокировки прокрутки (`classNames.locked`), CSS-переменные из `theme`.

Требования к шаблонам:

- `button` и `close` должны вернуть элемент `<button>`. Ссылка или `<div>` не подходят: у них нет нативной активации с клавиатуры;
- шаблон не должен терять дочерние части.

Если шаблон выбросил исключение, вернул не то или кнопка не попала в окно, в консоль выводится ошибка
`[pts-lazyload] Ошибка в шаблонах окна…` и окно рисуется шаблонами по умолчанию. Посетитель всегда сможет подтвердиться,
а счётчики загрузятся.

### Полный список `classNames`

| Ключ      | По умолчанию              |
|-----------|---------------------------|
| `root`    | `pts-lazyload`            |
| `open`    | `pts-lazyload--open`      |
| `locked`  | `pts-lazyload-locked` (на `<html>`) |
| `overlay` | `pts-lazyload__overlay`   |
| `dialog`  | `pts-lazyload__dialog`    |
| `title`   | `pts-lazyload__title`     |
| `body`    | `pts-lazyload__body`      |
| `text`    | `pts-lazyload__text`      |
| `actions` | `pts-lazyload__actions`   |
| `button`  | `pts-lazyload__button`    |
| `decline` | `pts-lazyload__decline`   |
| `close`   | `pts-lazyload__close`     |
| `aux`     | `pts-lazyload__aux` (обёртка ловушки) |

Стили из `pts.lazyload.css` привязаны к классам по умолчанию. Если вы их заменили, стилизуйте окно сами. Обёртку ловушки
(`aux`) обязательно скройте так же, как в `pts.lazyload.css`: вынесите за пределы экрана, но не через `display: none`.

---

## События и колбэки

Все события генерируются на `document`, данные лежат в `event.detail`.

| Событие                 | Колбэк     | Когда | `detail.reason` |
|-------------------------|------------|-------|-----------------|
| `pts-lazyload:show`     | `onShow`   | Окно показано. | — |
| `pts-lazyload:verified` | `onVerify` | Счётчики загружены. | `click`, `close`, `overlay`, `escape`, `token`, `no-check`, `search-bot` (при `botBehavior: 'load'`), `search-referrer` |
| `ptz-click`             | —          | То же, что `verified`, для совместимости с v2.1. | то же |
| `pts-lazyload:reject`   | `onReject` | Нажатие кнопки, крестика, клик по затемнению или Escape не засчитаны, окно осталось. | `untrusted`, `too-fast`, `no-pointerdown`, `no-movement`, `center-click`, `honeypot` |
| `pts-lazyload:blocked`  | `onBlock`  | Счётчики не загружены, окно не показано. | `automation`, `search-bot`, `declined` |
| `pts-lazyload:dismiss`  | `onDismiss` | Окно закрыто без подтверждения: кнопкой отказа или `ctx.dismiss()` в `intercept`. | `decline`, `button`, `close`, `overlay`, `escape` |

Пример: показывать полноэкранную рекламу РСЯ только подтверждённым посетителям.

```js
document.addEventListener('pts-lazyload:verified', () => {
    window.yaContextCb.push(() => {
        Ya.Context.AdvManager.render({blockId: 'R-A-XXXXXX-X', type: 'fullscreen', platform: 'touch'});
    });
});
```

---

## Как работает защита

```
init(needCheck)
 ├─ needCheck = 0                    → загрузить счётчики
 ├─ navigator.webdriver / headless   → ничего не загружать
 ├─ User-Agent поискового робота     → ничего не загружать (botBehavior: 'skip')
 ├─ есть валидный подписанный токен  → продлить токен, загрузить счётчики
 ├─ skipForSearchVisitors и реферер поисковика → загрузить счётчики
 └─ иначе                            → показать окно
                                        └─ клик проходит проверки → записать токен, загрузить счётчики
                                           клик не прошёл → окно остаётся, событие reject
```

**Проверки клика** (по кнопке, крестику и затемнению):

1. `event.isTrusted`: клик сгенерировал браузер, а не `element.click()` или `dispatchEvent()` из JS.
2. С момента показа окна прошло не меньше `minDelay` мс.
3. Для мыши: перед кликом было нажатие на саму кнопку и движение курсора (не менее 3 событий `pointermove`). Клик точно в
   центр кнопки (±1 px) отклоняется: так кликают Puppeteer и Playwright, а человек почти никогда не попадает туда.
4. Клик без нажатия указателя — это клавиатура (Enter/Пробел) или скринридер: NVDA, JAWS и VoiceOver нажимают
   кнопку сами, без событий клавиатуры на странице. Он проверяется по пунктам 1 и 2, окно доступно без мыши.
   Клик мышью проходит проверки пункта 3 всегда, даже с `detail: 0`. Escape ([`closeOnEscape`](#closeonescape)) —
   по пунктам 1 и 2.
5. Касание на тач-экране принимается без проверки движения.
6. Ловушка: перед настоящей кнопкой в DOM стоит невидимая кнопка с тем же классом и текстом. Бот, который ищет
   `.pts-lazyload__button` или кнопку по тексту, нажимает её, и до перезагрузки страницы подтверждение становится невозможным.

Отклонённый клик просто игнорируется: человек, кликнувший слишком рано, нажмёт ещё раз.

**Токен.** Вместо `cookie=true` записывается `v3.<время выдачи>.<случайное значение>.<подпись>`. Подпись вычисляется
от времени, случайного значения, `salt` и имени cookie. Токен дублируется в `localStorage`: если пропала одна копия,
она восстанавливается из другой. Раз в сутки при визите токен перевыпускается, и срок жизни отсчитывается заново.

---

## Доступность и валидность

Окно не должно портить сайту проверки качества, поэтому каждое изменение проходит автоматические проверки
(`tests/e2e/a11y.spec.js`), а перед выпуском — официальные валидаторы W3C:

| Проверка | Результат |
|---|---|
| [W3C Nu HTML Checker](https://validator.w3.org/nu/) — страница с открытым окном и шаблонами счётчиков | 0 ошибок, 0 предупреждений |
| W3C Nu HTML Checker — код, который выдаёт [конструктор](https://ak-alz.github.io/pts-lazyload/) | 0 ошибок, 0 предупреждений |
| [W3C CSS Validator](https://jigsaw.w3.org/css-validator/) — `pts.lazyload.css` и `.min.css` | валиден, 0 ошибок |
| axe-core, WCAG 2.2 AA + best practices — все варианты окна, светлая и тёмная тема | 0 нарушений |
| html-validate (правила HTML-спецификации) — разметка окна | 0 ошибок |

W3C CSS Validator на каждое `var()` выводит информационное предупреждение «CSS-переменные не проверяются статически».
Это не ошибка: так валидатор помечает любые CSS-переменные, а на них построена вся настройка внешнего вида.

**Что сделано для доступности:**

- `role="dialog"`, `aria-modal`, подпись (`aria-labelledby` или `aria-label`) и описание (`aria-describedby`) — скринридер
  зачитывает заголовок и текст окна;
- фокус переходит на кнопку при открытии и не уходит на страницу под окном по Tab (в том числе при `autoFocus: false`);
  после закрытия возвращается туда, где был, например на ссылку «Настройки cookie»; всё управляется с клавиатуры;
- кнопку можно нажать скринридером: NVDA, JAWS и VoiceOver активируют её без событий клавиатуры, и защита это учитывает;
- плашка `bottom` немодальная: без `aria-modal` и без ловушки фокуса, страница под ней остаётся доступной;
- контраст текста не ниже 4.5:1, значка крестика — не ниже 3:1 (проверяется с учётом прозрачности, которую axe не учитывает);
- кнопки не меньше 24×24 px (WCAG 2.5.8), окно без горизонтальной прокрутки на экране 320 px;
- режим высокой контрастности Windows (`forced-colors`) — у окна и кнопок появляются рамки;
- `prefers-reduced-motion` — анимация отключается;
- кнопка-ловушка скрыта от скринридеров (`aria-hidden`) и не доступна по Tab.

Если вы меняете цвета через `theme`, следите за контрастом сами: библиотека не может проверить его за вас.

---

## Возможности и ограничения

### Что защита отсекает

| Сценарий обхода | v2.1 | v3.0 |
|---|---|---|
| Подмена User-Agent на поискового робота (Googlebot, YandexBot…) | Окно пропускалось, **счётчики загружались** | Окно не показывается, счётчики **не** загружаются |
| Ручная установка cookie (`PST_VERIFIED_COOKIE=true`, `PTZ__VERIFIED_COOKIE_NAME=1`) | Пропускало: проверялось только наличие подстроки в `document.cookie` | Нужен подписанный токен, произвольное значение не подходит |
| Автоклик `element.click()` / `$.fancybox.close()` / `dispatchEvent` | Засчитывался | Отклоняется (`isTrusted`, ловушка) |
| Клик Puppeteer/Playwright/Selenium «по умолчанию» (сразу, в центр, без движения мыши) | Засчитывался | Отклоняется (`webdriver`, `HeadlessChrome`, задержка, центр, движение) |
| Переход бота по внутренней ссылке без подтверждения (`checkInternal`) | Счётчики загружались по внутреннему рефереру | Опция удалена, без токена окно показывается на каждой странице |
| Подмена реферера на поисковик | Окно пропускалось, счётчики загружались | По умолчанию реферер не учитывается |

### Повторный показ окна обычным посетителям

В v2.1 срок cookie задавался один раз при клике и не продлевался. Кроме того, браузеры урезают срок cookie, записанных
из JS: Safari (ITP) держит их не дольше 7 дней, Chrome не дольше 400. Если `cookieTime` передан нечислом (`'1 год'`),
выходило `max-age=NaN`, браузер игнорировал атрибут и ставил сессионную cookie, которая удалялась при закрытии браузера.
При открытии сайта то с `www`, то без него cookie одного варианта не видна на другом.

В v3.0:

- `cookieTime` проверяется: некорректное значение заменяется на 365, значение больше 400 обрезается до 400;
- токен продлевается при каждом визите (скользящий срок), поэтому регулярные посетители окно больше не видят;
- токен дублируется в `localStorage`;
- для сайтов с `www` и без него есть `cookieDomain`.

Посетитель Safari, который не заходил на сайт больше 7 дней, увидит окно снова: из JS это не исправить.
Если это критично, ставьте cookie с сервера (HTTP-заголовок `Set-Cookie`). На такие cookie ограничение ITP не действует.

### Чего защита не может

> [!WARNING]
> Защита работает целиком в браузере посетителя, поэтому она **повышает стоимость обхода, но не гарантирует** отсутствие ботов.

- **Целевой обход.** Код скрипта открыт. Бот, написанный под конкретный сайт, может вычислить подпись токена, обойти
  ловушку, скрыть `navigator.webdriver` и эмулировать движение мыши с кликом не в центр. `salt` защищает только от
  универсальных ботов, которые не читают этот файл.
- **Боты на реальных устройствах и браузерах** с имитацией человеческого поведения (типичные сервисы накрутки ПФ) пройдут
  окно так же, как человек.
- **Перенос токена.** Токен не привязан к устройству: cookie, скопированная из реального браузера, будет работать и у бота.
- **Тач-клики** проверяются мягче мышиных: эмуляцию мобильного касания отличить от реального сложнее.
- **Настоящие поисковые роботы** не загружают счётчики. Поэтому статус счётчика в интерфейсе Метрики может быть
  «Не найден», хотя данные от посетителей поступают. Если нужно, задайте `botBehavior: 'load'`, но тогда подмена
  User-Agent снова откроет счётчики ботам.
- **`skipForSearchVisitors: true`** удобен для посетителей, но боты накрутки ПФ приходят именно из поиска, а реферер
  в автоматизированном браузере подделывается одной строкой. Включайте только если понимаете, зачем.
- Посетители без JS и с блокировщиками рекламы не попадут в статистику, как и без скрипта.

### Рекомендации

- Включите в Метрике «Фильтрацию роботов» по строгим правилам и по поведению: это независимый уровень защиты.
- Для серьёзной защиты добавьте серверную проверку (Yandex SmartCaptcha, Cloudflare Turnstile, анализ логов
  и ограничение частоты запросов на сервере). `pts-lazyload` хорошо дополняет их, но не заменяет.
- Для дополнительной защиты задайте свои `cookieName` и `salt`: универсальным ботам, настроенным под стандартные значения, это мешает.

---

## Переход с v2.x

1. Замените `welcome-pt.css` и `pts.lazyload.js` на `build/pts.lazyload.min.css` и `build/pts.lazyload.min.js`.
2. Удалите из HTML разметку окна (`.welcome-pt-modal`): теперь окно создаёт скрипт. Без старых стилей эта разметка станет видимой.
3. Конфигурация v2.1 работает без изменений, но в консоли появится предупреждение. Рекомендуемая замена:

   | v2.1               | v3.0                           |
   |--------------------|--------------------------------|
   | `cookie_name`      | `cookieName`                   |
   | `modalText`        | `modal.text`                   |
   | `checkInternal`    | удалён, ни на что не влияет    |
   | `ptsLazyLoad`      | `PtsLazyLoad` (старое имя оставлено как алиас) |
   | событие `ptz-click`| `pts-lazyload:verified` (`ptz-click` по-прежнему генерируется) |

4. По желанию перенесите коды счётчиков из `counters[].html` в `<template data-pts-lazyload>` и уберите экранирование.
   Старый вариант продолжает работать.
5. Старые cookie (`true`) больше не принимаются, поэтому после обновления все посетители один раз увидят окно.

Конфигурация v1 (jQuery, `simpleCheck`, `dataLazyLoadingJS.data`) не поддерживается: перенесите коды из `data.*.html`
в `<template data-pts-lazyload>`.

---

## FAQ

**Как проверить, что всё работает?**
Откройте сайт в режиме инкогнито, DevTools → Network → фильтр JS. До клика `tag.js` Метрики не загружается, после клика
загружается. Параметр `debug: true` выводит решения скрипта в консоль.

**Счётчик загружается до клика.**
Значит, он подключён где-то ещё: в настройках CMS, модуле или плагине аналитики, Google Tag Manager или прямо в шаблоне
сайта. Найдите в коде страницы (Ctrl+U) `mc.yandex.ru` или `googletagmanager` вне `<template data-pts-lazyload>`.

**Статус счётчика в Метрике — «Не найден».**
Робот Метрики не загружает счётчики (см. [`botBehavior`](#botbehavior)). Данные от посетителей при этом поступают.

**Как сбросить подтверждение для теста?**
Удалите cookie и ключ `localStorage` с именем `cookieName` или откройте сайт в режиме инкогнито.

**Окно не появляется в headless-браузере или автотестах.**
Так и задумано ([`detectWebdriver`](#protectiondetectwebdriver)). Для автотестов отключите `protection.detectWebdriver`
или вызывайте `init(0)`.

**Авторизованным пользователям окно не нужно.**
Передайте `0` в `init()`, примеры для CMS — в [docs/cms.md](docs/cms.md).

---

## Статьи и поддержка

- [Скрипт защиты от ботов 2.0](https://tools.pixelplus.ru/news/skript-zashchity-ot-botov-2) — статья Pixel Tools о назначении скрипта и установке
- [Скрипт защиты от ботов на Tilda](https://tools.pixelplus.ru/news/skript-zashchity-ot-botov-tilda) — установка на Tilda

Статьи написаны для v2: в них коды счётчиков экранируются вручную, а окно верстается на странице. В v3 это не нужно,
актуальная установка — в «[Быстром старте](#быстрый-старт)» и [docs/cms.md](docs/cms.md#tilda).

**Техподдержка Pixel Tools: https://tools.pixelplus.ru/ask**

---

## Разработка

```bash
npm install
npm run dev        # демо-страница index.html с исходниками из src/ и hot reload
npm run site:dev   # онлайн-конструктор (site/) с hot reload
npm run site:build # сборка конструктора в dist-site/
npm run build      # сборка в build/: обычная и .min версии JS и CSS
npm test           # все тесты
npm run test:unit  # unit-тесты (Vitest + jsdom), ~1 с
npm run test:e2e   # сборка + e2e-тесты в Chromium (Playwright)
```

### Тесты

- `tests/unit/` — логика без браузера: токен и его подделки, нормализация параметров и совместимость с v2.x, определение
  роботов и поисковых рефереров, все причины отклонения клика в `ClickGuard`, сборка окна из шаблонов и ошибки в них.
- `tests/e2e/` — то, что проверяется только в настоящем браузере, на собранном `build/pts.lazyload.min.js`: `isTrusted`,
  клик Playwright «как у бота» и движение мыши «как у человека», тап, клавиатура, ловушка, `navigator.webdriver`,
  подмена User-Agent, cookie и `localStorage`, срок жизни и продление токена, выполнение кода Метрики из `<template>`,
  порядок скриптов, свои шаблоны окна, конфигурация v2.1.

Playwright выставляет `navigator.webdriver`, как бот без маскировки, поэтому в e2e он скрыт (`tests/e2e/helpers.js`),
а сам детект проверяется отдельным тестом. Первый запуск e2e: `npx playwright install chromium`.

CI (`.github/workflows/test.yml`) запускает все тесты и падает, если закоммиченный `build/` не совпадает со сборкой из `src/`.

### Конструктор

Онлайн-конструктор лежит в `site/` и подключает библиотеку из `src/`, поэтому всегда соответствует текущему коду.
Поля описаны декларативно в `site/src/schema.js`, генерация кода — в `site/src/codegen.js` (покрыта unit-тестами),
предпросмотр — `site/preview.html` в iframe. Новый параметр библиотеки появляется в конструкторе одной записью в схеме.

При пуше в `master` workflow `.github/workflows/pages.yml` собирает конструктор и публикует его на GitHub Pages:
https://ak-alz.github.io/pts-lazyload/. В настройках репозитория должно быть включено **Settings → Pages → Source: GitHub Actions**.

```
src/
├── index.js          точка входа: стили, глобальные PtsLazyLoad / ptsLazyLoad
├── PtsLazyLoad.js    порядок проверок, загрузка счётчиков, события
├── Modal.js          окно подтверждения, ловушка, атрибуты защиты и доступности
├── templates.js      classNames, шаблоны частей окна по умолчанию, сборка и проверка
├── theme.js          параметр theme → CSS-переменные, пресеты анимации
├── ClickGuard.js     проверки клика
├── token.js          подписанный токен в cookie и localStorage
├── detect.js         поисковые роботы, автоматизация, поисковый реферер
├── options.js        параметры по умолчанию и совместимость с v2.x
├── defaults.js       константы и значения по умолчанию
├── utils.js
└── scss/
    ├── _variables.scss
    └── pts.lazyload.scss
```

Сборка: Vite в режиме библиотеки, формат UMD (`<script>`, CommonJS, AMD), `target: es2018`. Приватные поля
классов транспилируются, поэтому скрипт работает и в Safari старше 14.5. Версия в баннере и `PtsLazyLoad.version`
берётся из `package.json`. После изменений в `src/` пересоберите проект и закоммитьте `build/`: сайты берут файлы оттуда.

Документация ведётся на двух языках: при изменениях обновляйте `README.md` и `README.en.md`, `docs/cms.md` и `docs/cms.en.md`.
