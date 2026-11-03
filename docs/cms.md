# Установка pts-lazyload в CMS

**Русский** | [English](cms.en.md)

← [Назад к README](../README.md)

> [!TIP]
> Код для любой CMS можно собрать в **[онлайн-конструкторе](https://ak-alz.github.io/pts-lazyload/)**: он сам сформирует шаблоны счётчиков и вызов скрипта.

Во всех примерах:

- `12345678` — номер вашего счётчика Метрики, `G-XXXXXXX` — идентификатор Google Analytics;
- параметры `cookieName` и `salt` задавать не обязательно, у них есть разумные значения по умолчанию (см. [`cookieName`](../README.md#cookiename) и [`salt`](../README.md#salt));
- авторизованным пользователям окно не показывается: в `init()` передаётся `0`.

Коды счётчиков в примерах сокращены. Вставляйте **полный код из интерфейса Метрики или Google Analytics без изменений**,
экранировать ничего не нужно.

> [!IMPORTANT]
> **Общее правило для всех CMS.** Счётчик должен подключаться только внутри `<template data-pts-lazyload>`.
> Отключите его во всех остальных местах: в настройках CMS, модулях и плагинах аналитики, Google Tag Manager, шаблоне сайта.
> Проверка: в коде страницы (Ctrl+U) `mc.yandex.ru` и `googletagmanager.com` встречаются только внутри `<template data-pts-lazyload>`.

> [!WARNING]
> **Оптимизаторы JS.** Функции вроде «Перемещать JS в конец страницы», «Объединять JS», «Отложить JS» могут вытащить
> `<script>` из `<template>`, и счётчик выполнится сразу, в обход защиты. Исключите шаблоны счётчиков из оптимизации,
> как описано для каждой CMS ниже, и проверьте результат в коде страницы.

## Содержание

- [HTML-сайт](#html-сайт)
- [1С-Битрикс](#1с-битрикс)
- [WordPress](#wordpress)
- [Tilda](#tilda)
- [MODX Revolution](#modx-revolution)
- [OpenCart](#opencart)
- [Laravel и Symfony](#laravel-и-symfony)
- [Google Tag Manager](#google-tag-manager)
- [Если `<template>` использовать нельзя](#если-template-использовать-нельзя)

---

## HTML-сайт

Скопируйте `build/pts.lazyload.min.js` и `build/pts.lazyload.min.css` в `/libs/pts-lazyload/` и добавьте на каждую страницу:

```html
<!DOCTYPE html>
<html lang="ru">
<head>
    ...
    <link rel="stylesheet" href="/libs/pts-lazyload/pts.lazyload.min.css">
</head>
<body>
    ...

    <template data-pts-lazyload>
        <!-- Yandex.Metrika counter -->
        <script type="text/javascript">
           (function(m,e,t,r,i,k,a){ ... })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
           ym(12345678, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true});
        </script>
        <noscript><div><img src="https://mc.yandex.ru/watch/12345678" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
        <!-- /Yandex.Metrika counter -->
    </template>

    <script src="/libs/pts-lazyload/pts.lazyload.min.js"></script>
    <script>
        new PtsLazyLoad().init();
    </script>
</body>
</html>
```

---

## 1С-Битрикс

### 1. Файлы

Скопируйте `pts.lazyload.min.js` и `pts.lazyload.min.css` в папку шаблона сайта:
`/local/templates/<шаблон>/libs/pts-lazyload/` (или `/bitrix/templates/<шаблон>/…`, если шаблон лежит там).

### 2. Подключение в `header.php`

Добавьте до вызова `$APPLICATION->ShowHead()`:

```php
<?php
use Bitrix\Main\Page\Asset;

Asset::getInstance()->addCss(SITE_TEMPLATE_PATH . '/libs/pts-lazyload/pts.lazyload.min.css');
Asset::getInstance()->addJs(SITE_TEMPLATE_PATH . '/libs/pts-lazyload/pts.lazyload.min.js');
?>
```

### 3. Счётчики и инициализация в `footer.php`

Перед `</body>`:

```php
<template data-pts-lazyload>
    <!-- Yandex.Metrika counter -->
    <script type="text/javascript" data-skip-moving="true">
       (function(m,e,t,r,i,k,a){ ... })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
       ym(12345678, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true});
    </script>
    <noscript><div><img src="https://mc.yandex.ru/watch/12345678" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
    <!-- /Yandex.Metrika counter -->
</template>

<script>
    new PtsLazyLoad().init(<?= $USER->IsAuthorized() ? 0 : 1 ?>);
</script>
```

### Особенности

- **`data-skip-moving="true"`.** Если в настройках главного модуля включено «Перемещать весь JS-код в конец страницы»,
  Битрикс вынесет скрипты из `<template>`, и счётчик выполнится сразу. Атрибут `data-skip-moving="true"` на **каждом**
  `<script>` внутри шаблона запрещает это. Если опция выключена, атрибут ничему не мешает.
- **Композитный сайт.** Анонимным посетителям отдаётся закэшированная страница, где в `init()` выведено `1`, — это
  правильно. Авторизованным композитный кэш по умолчанию не отдаётся, они получают `0`.
- **Где ещё может быть счётчик.** Включаемые области, настройки шаблона, модули маркетплейса для Метрики и GA — уберите
  счётчик оттуда.

---

## WordPress

### 1. Файлы

Скопируйте `pts.lazyload.min.js` и `pts.lazyload.min.css` в дочернюю тему: `wp-content/themes/<тема>/libs/pts-lazyload/`.
В родительскую тему класть не стоит: файлы пропадут при её обновлении.

### 2. Код в `functions.php` дочерней темы

```php
<?php
add_action('wp_enqueue_scripts', function () {
    $dir = get_stylesheet_directory_uri() . '/libs/pts-lazyload';

    wp_enqueue_style('pts-lazyload', "$dir/pts.lazyload.min.css", [], '3.0.0');
    wp_enqueue_script('pts-lazyload', "$dir/pts.lazyload.min.js", [], '3.0.0', true);

    wp_add_inline_script('pts-lazyload', sprintf('new PtsLazyLoad().init(%d);', is_user_logged_in() ? 0 : 1));
});

add_action('wp_footer', function () {
    ?>
    <template data-pts-lazyload>
        <!-- Yandex.Metrika counter -->
        <script type="text/javascript">
           (function(m,e,t,r,i,k,a){ ... })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
           ym(12345678, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true});
        </script>
        <noscript><div><img src="https://mc.yandex.ru/watch/12345678" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
        <!-- /Yandex.Metrika counter -->
    </template>
    <?php
});
```

Если правка `functions.php` недоступна, тот же HTML можно вставить плагином для кода в шапку и подвал
(например, WPCode): в подвал — шаблоны со счётчиками и `<script>` с инициализацией, `<link>` — в шапку.

### Особенности

- **Плагины аналитики.** Site Kit by Google, плагины Яндекс Метрики, MonsterInsights и т. п. выводят счётчик сами.
  Отключите в них вывод кода или удалите плагин.
- **Плагины оптимизации** (WP Rocket, Autoptimize, LiteSpeed Cache, SG Optimizer и др.): функции объединения и
  отложенной загрузки JS могут вытащить скрипты из `<template>`. Добавьте в исключения `mc.yandex.ru`, `ym(`,
  `googletagmanager.com`, `gtag(` и `pts.lazyload`, затем проверьте код страницы.
- **Кэширование страниц.** Анонимным посетителям отдаётся кэш с `init(1)`, авторизованные пользователи кэш обычно
  не получают — это правильное поведение.

---

## Tilda

Загружать файлы на Tilda нельзя, поэтому скрипт и стили подключаются с CDN jsDelivr.

### 1. Уберите встроенные счётчики

**Настройки сайта → Аналитика**: удалите номер счётчика Яндекс Метрики и идентификатор Google Analytics. Если их оставить,
Tilda подключит счётчики сама, в обход скрипта.

### 2. Блок в общем футере

Чтобы скрипт работал на всех страницах, используйте общий футер (**Настройки сайта → Хедер и футер**) или добавьте блок
на каждую страницу. Добавьте блок **Другое → T123 «HTML-код»** и вставьте:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/ak-alz/pts-lazyload@v3.0.0/build/pts.lazyload.min.css">

<template data-pts-lazyload>
    <!-- Yandex.Metrika counter -->
    <script type="text/javascript">
       (function(m,e,t,r,i,k,a){ ... })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
       ym(12345678, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true});
    </script>
    <noscript><div><img src="https://mc.yandex.ru/watch/12345678" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
    <!-- /Yandex.Metrika counter -->
</template>

<script src="https://cdn.jsdelivr.net/gh/ak-alz/pts-lazyload@v3.0.0/build/pts.lazyload.min.js"></script>
<script>
    new PtsLazyLoad({
        modal: {title: 'Добро пожаловать!', text: 'Мы используем файлы cookie'},
        theme: {accent: '#ff8562'}
    }).init();
</script>
```

Вёрстка окна и CSS из [статьи для v2](https://tools.pixelplus.ru/news/skript-zashchity-ot-botov-tilda) больше не нужны:
окно создаёт скрипт, цвета задаются параметром [`theme`](../README.md#theme).

### 3. Публикация

Опубликуйте все страницы, на которых стоит блок (при изменении общего футера — все страницы сайта).

### Проверка

Откройте опубликованный сайт в режиме инкогнито и посмотрите код страницы (Ctrl+U): шаблон
`<template data-pts-lazyload>` должен быть на месте вместе со счётчиком внутри. Если редактор Tilda изменил или удалил
шаблон, используйте вариант из раздела «[Если `<template>` использовать нельзя](#если-template-использовать-нельзя)».

---

## MODX Revolution

### 1. Файлы

Скопируйте `pts.lazyload.min.js` и `pts.lazyload.min.css` в `/assets/libs/pts-lazyload/`.

### 2. Чанк `ptsLazyload`

Создайте чанк **ptsLazyload**:

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

<script src="/assets/libs/pts-lazyload/pts.lazyload.min.js"></script>
<script>
    new PtsLazyLoad().init([[!+modx.user.id:isloggedin:is=`1`:then=`0`:else=`1`]]);
</script>
```

### 3. Шаблоны

Во всех шаблонах сайта: в `<head>` подключите стили, перед `</body>` — чанк.

```html
<link rel="stylesheet" href="/assets/libs/pts-lazyload/pts.lazyload.min.css">
...
[[$ptsLazyload]]
</body>
```

### Особенности

- Восклицательный знак в `[[!+modx.user.id…]]` обязателен: без него значение закэшируется для всех посетителей.
- Если для вывода счётчиков используется отдельный чанк или компонент, уберите счётчик оттуда.

---

## OpenCart

Пути даны для OpenCart 3.x, в 4.x они аналогичны (`catalog/view/template/common/…`).

### 1. Файлы

Скопируйте `pts.lazyload.min.js` и `pts.lazyload.min.css` в `catalog/view/javascript/pts-lazyload/`.

### 2. `header.twig`

Файл `catalog/view/theme/<тема>/template/common/header.twig`, перед `</head>`:

```twig
<link rel="stylesheet" href="catalog/view/javascript/pts-lazyload/pts.lazyload.min.css">
<script src="catalog/view/javascript/pts-lazyload/pts.lazyload.min.js"></script>
<script>
    new PtsLazyLoad().init({{ logged ? 0 : 1 }});
</script>
```

Переменная `logged` (покупатель вошёл в аккаунт) уже передаётся в `header.twig` стандартным контроллером.

### 3. `footer.twig`

Файл `catalog/view/theme/<тема>/template/common/footer.twig`, перед `</body>`:

```twig
{% verbatim %}
<template data-pts-lazyload>
    <!-- Yandex.Metrika counter -->
    <script type="text/javascript">
       (function(m,e,t,r,i,k,a){ ... })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
       ym(12345678, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true});
    </script>
    <noscript><div><img src="https://mc.yandex.ru/watch/12345678" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
    <!-- /Yandex.Metrika counter -->
</template>
{% endverbatim %}
```

`{% verbatim %}` защищает код счётчика от обработки Twig: в некоторых кодах встречаются `{{` и `{%`.

### Особенности

- **Сбросьте кэш шаблонов** после правки: «Панель управления» → шестерёнка справа вверху → «Тема» → «Обновить».
  Если правки не применились, проверьте, не перекрывают ли их модификаторы OCMOD.
- **Расширения аналитики:** «Расширения → Аналитика» — отключите модули Метрики и Google Analytics.

---

## Laravel и Symfony

### Через файлы в `public/`

Скопируйте `pts.lazyload.min.js` и `pts.lazyload.min.css` в `public/libs/pts-lazyload/`.

**Laravel (Blade)**, общий layout:

```blade
<head>
    ...
    <link rel="stylesheet" href="{{ asset('libs/pts-lazyload/pts.lazyload.min.css') }}">
</head>
<body>
    ...
    @verbatim
    <template data-pts-lazyload>
        <!-- код счётчика без изменений -->
    </template>
    @endverbatim

    <script src="{{ asset('libs/pts-lazyload/pts.lazyload.min.js') }}"></script>
    <script>
        new PtsLazyLoad().init({{ auth()->check() ? 0 : 1 }});
    </script>
</body>
```

**Symfony (Twig)**, `base.html.twig`:

```twig
<link rel="stylesheet" href="{{ asset('libs/pts-lazyload/pts.lazyload.min.css') }}">
...
{% verbatim %}
<template data-pts-lazyload>
    <!-- код счётчика без изменений -->
</template>
{% endverbatim %}

<script src="{{ asset('libs/pts-lazyload/pts.lazyload.min.js') }}"></script>
<script>
    new PtsLazyLoad().init({{ app.user ? 0 : 1 }});
</script>
```

`@verbatim` / `{% verbatim %}` защищают код счётчика от шаблонизатора.

### Через сборщик (Vite, Webpack)

```bash
npm install github:ak-alz/pts-lazyload#v3.0.0
```

```js
import PtsLazyLoad from 'pts-lazyload';
import 'pts-lazyload/build/pts.lazyload.min.css';

new PtsLazyLoad().init(document.body.dataset.auth === '1' ? 0 : 1);
```

Признак авторизации удобно передать атрибутом: `<body data-auth="{{ auth()->check() ? 1 : 0 }}">`.

---

## Google Tag Manager

Если счётчики подключены через GTM, есть два варианта.

### Вариант 1. Весь контейнер GTM в шаблоне

Перенесите код контейнера GTM в `<template data-pts-lazyload>`. Все теги GTM загрузятся только после подтверждения.
Часть `<noscript>` с `<iframe>` из инструкции GTM можно оставить на своём месте.

```html
<template data-pts-lazyload>
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){ ... })(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
    <!-- End Google Tag Manager -->
</template>
```

### Вариант 2. GTM загружается сразу, теги — по событию

Подходит, если в GTM есть теги, которые должны работать у всех посетителей.

1. Отправляйте событие в `dataLayer` после подтверждения:

   ```js
   new PtsLazyLoad({
       counterSelector: false,
       onVerify: () => {
           window.dataLayer = window.dataLayer || [];
           window.dataLayer.push({event: 'pts_verified'});
       },
   }).init();
   ```

2. В GTM создайте триггер «Специальное событие» с именем `pts_verified`.
3. Назначьте его тегам Метрики и Google Analytics вместо «All Pages» / «Initialization».

> [!NOTE]
> Во втором варианте сам контейнер GTM загружается и у ботов. Проверьте, что ни один тег аналитики не срабатывает
> по другим триггерам.

---

## Если `<template>` использовать нельзя

Некоторые конструкторы и редакторы удаляют `<template>` или меняют его содержимое. Тогда передайте коды счётчиков
параметром [`counters`](../README.md#counters). Закрывающие теги в строке нужно экранировать: `<\/script>`.

```html
<script>
    new PtsLazyLoad({
        counters: [
            {
                html: `<script type="text/javascript">
                   (function(m,e,t,r,i,k,a){ ... })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
                   ym(12345678, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true});
                <\/script>`
            }
        ]
    }).init();
</script>
```

Код пишется в обратных кавычках, поэтому кавычки внутри экранировать не нужно. Экранировать нужно только `</script>`
→ `<\/script>` и, если в коде встречаются, обратные кавычки `` ` `` → `` \` `` и `${` → `\${`.

---

Вопросы по установке — в техподдержку Pixel Tools: **https://tools.pixelplus.ru/ask**
