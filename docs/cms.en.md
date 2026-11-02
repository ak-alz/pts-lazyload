# Installing pts-lazyload in a CMS

[Русский](cms.md) | **English**

← [Back to README](../README.en.md)

> [!TIP]
> The **[online configurator](https://ak-alz.github.io/pts-lazyload/)** builds the code for any CMS: counter templates and the script call.

In all examples:

- `12345678` is your Yandex Metrica counter ID, `G-XXXXXXX` is your Google Analytics ID;
- `cookieName` and `salt` are optional, they have sensible defaults (see [`cookieName`](../README.en.md#cookiename) and [`salt`](../README.en.md#salt));
- logged-in users don't see the dialog: `0` is passed to `init()`.

Counter snippets are shortened in the examples. Paste **the full snippet from Yandex Metrica or Google Analytics
unchanged** — nothing needs escaping.

> [!IMPORTANT]
> **General rule for every CMS.** The counter must be included only inside `<template data-pts-lazyload>`.
> Disable it everywhere else: CMS settings, analytics modules and plugins, Google Tag Manager, the site template.
> Check: in the page source (Ctrl+U) `mc.yandex.ru` and `googletagmanager.com` appear only inside `<template data-pts-lazyload>`.

> [!WARNING]
> **JS optimizers.** Features like "Move JS to the end of the page", "Combine JS", "Delay JS" may pull `<script>` out of
> `<template>`, and the counter runs immediately, bypassing the protection. Exclude counter templates from optimization
> as described for each CMS below, and check the page source.

## Contents

- [Plain HTML](#plain-html)
- [1C-Bitrix](#1c-bitrix)
- [WordPress](#wordpress)
- [Tilda](#tilda)
- [MODX Revolution](#modx-revolution)
- [OpenCart](#opencart)
- [Laravel and Symfony](#laravel-and-symfony)
- [Google Tag Manager](#google-tag-manager)
- [When `<template>` can't be used](#when-template-cant-be-used)

---

## Plain HTML

Copy `build/pts.lazyload.min.js` and `build/pts.lazyload.min.css` to `/libs/pts-lazyload/` and add to every page:

```html
<!DOCTYPE html>
<html lang="en">
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
        new PtsLazyLoad({
            modal: {text: 'We use cookies to make the site work properly. By continuing to use the site, you agree to their use.', buttonText: 'Accept', ariaLabel: 'Use of cookies'}
        }).init();
    </script>
</body>
</html>
```

---

## 1C-Bitrix

### 1. Files

Copy `pts.lazyload.min.js` and `pts.lazyload.min.css` to the site template folder:
`/local/templates/<template>/libs/pts-lazyload/` (or `/bitrix/templates/<template>/…` if the template lives there).

### 2. Include in `header.php`

Add before `$APPLICATION->ShowHead()`:

```php
<?php
use Bitrix\Main\Page\Asset;

Asset::getInstance()->addCss(SITE_TEMPLATE_PATH . '/libs/pts-lazyload/pts.lazyload.min.css');
Asset::getInstance()->addJs(SITE_TEMPLATE_PATH . '/libs/pts-lazyload/pts.lazyload.min.js');
?>
```

### 3. Counters and initialization in `footer.php`

Before `</body>`:

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

### Notes

- **`data-skip-moving="true"`.** If the main module setting "Move all JS code to the end of the page" is enabled, Bitrix
  pulls scripts out of `<template>` and the counter runs immediately. The `data-skip-moving="true"` attribute on **every**
  `<script>` inside the template prevents that. If the setting is off, the attribute does no harm.
- **Composite site.** Anonymous visitors get a cached page with `1` in `init()`, which is correct. Logged-in users don't
  get the composite cache by default and receive `0`.
- **Where else the counter may be.** Include areas, template settings, marketplace modules for Metrica and GA — remove the counter from there.

---

## WordPress

### 1. Files

Copy `pts.lazyload.min.js` and `pts.lazyload.min.css` to a child theme: `wp-content/themes/<theme>/libs/pts-lazyload/`.
Don't put them into the parent theme: they'll be lost on its update.

### 2. Code in the child theme's `functions.php`

```php
<?php
add_action('wp_enqueue_scripts', function () {
    $dir = get_stylesheet_directory_uri() . '/libs/pts-lazyload';

    wp_enqueue_style('pts-lazyload', "$dir/pts.lazyload.min.css", [], '3.0.0');
    wp_enqueue_script('pts-lazyload', "$dir/pts.lazyload.min.js", [], '3.0.0', true);

    $options = [
        'modal' => ['text' => 'We use cookies to make the site work properly. By continuing to use the site, you agree to their use.', 'buttonText' => 'Accept'],
    ];
    wp_add_inline_script(
        'pts-lazyload',
        sprintf('new PtsLazyLoad(%s).init(%d);', wp_json_encode($options), is_user_logged_in() ? 0 : 1)
    );
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

If you can't edit `functions.php`, paste the same HTML with a header/footer code plugin (e.g. WPCode): counter
templates and the initialization `<script>` into the footer, `<link>` into the header.

### Notes

- **Analytics plugins.** Site Kit by Google, Yandex Metrica plugins, MonsterInsights etc. output the counter themselves.
  Disable their code output or remove the plugin.
- **Optimization plugins** (WP Rocket, Autoptimize, LiteSpeed Cache, SG Optimizer, etc.): JS combining and delaying may
  pull scripts out of `<template>`. Add `mc.yandex.ru`, `ym(`, `googletagmanager.com`, `gtag(` and `pts.lazyload` to the
  exclusions, then check the page source.
- **Page caching.** Anonymous visitors get a cached page with `init(1)`; logged-in users usually bypass the cache — this is the correct behavior.

---

## Tilda

Tilda doesn't allow uploading files, so the script and styles are loaded from the jsDelivr CDN.

### 1. Remove built-in counters

**Site Settings → Analytics**: remove the Yandex Metrica counter ID and the Google Analytics ID. If you leave them,
Tilda includes the counters itself, bypassing the script.

### 2. Block in the shared footer

To cover all pages, use the shared footer (**Site Settings → Header and Footer**) or add the block to every page. Add the
**Other → T123 "HTML code"** block and paste:

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
        modal: {title: 'Welcome!', text: 'We use cookies', buttonText: 'Accept'},
        theme: {accent: '#ff8562'}
    }).init();
</script>
```

The dialog markup and CSS from the [v2 article](https://tools.pixelplus.ru/news/skript-zashchity-ot-botov-tilda) are no
longer needed: the script creates the dialog, colors are set with the [`theme`](../README.en.md#theme) option.

### 3. Publishing

Publish every page with the block (when changing the shared footer — every page of the site).

### Check

Open the published site in a private window and view the page source (Ctrl+U): the `<template data-pts-lazyload>` must be
there with the counter inside. If the Tilda editor changed or removed the template, use the option from
"[When `<template>` can't be used](#when-template-cant-be-used)".

---

## MODX Revolution

### 1. Files

Copy `pts.lazyload.min.js` and `pts.lazyload.min.css` to `/assets/libs/pts-lazyload/`.

### 2. `ptsLazyload` chunk

Create a **ptsLazyload** chunk:

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

### 3. Templates

In every site template: include the styles in `<head>` and the chunk before `</body>`.

```html
<link rel="stylesheet" href="/assets/libs/pts-lazyload/pts.lazyload.min.css">
...
[[$ptsLazyload]]
</body>
```

### Notes

- The exclamation mark in `[[!+modx.user.id…]]` is required: without it the value is cached for all visitors.
- If counters are output by a separate chunk or extra, remove the counter from there.

---

## OpenCart

Paths are for OpenCart 3.x; 4.x is similar (`catalog/view/template/common/…`).

### 1. Files

Copy `pts.lazyload.min.js` and `pts.lazyload.min.css` to `catalog/view/javascript/pts-lazyload/`.

### 2. `header.twig`

File `catalog/view/theme/<theme>/template/common/header.twig`, before `</head>`:

```twig
<link rel="stylesheet" href="catalog/view/javascript/pts-lazyload/pts.lazyload.min.css">
<script src="catalog/view/javascript/pts-lazyload/pts.lazyload.min.js"></script>
<script>
    new PtsLazyLoad().init({{ logged ? 0 : 1 }});
</script>
```

The `logged` variable (customer is signed in) is already passed to `header.twig` by the stock controller.

### 3. `footer.twig`

File `catalog/view/theme/<theme>/template/common/footer.twig`, before `</body>`:

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

`{% verbatim %}` protects the counter snippet from Twig: some snippets contain `{{` and `{%`.

### Notes

- **Clear the template cache** after editing: Dashboard → gear icon at the top right → Theme → Refresh.
  If the changes don't apply, check whether OCMOD modifications override them.
- **Analytics extensions:** Extensions → Analytics — disable the Metrica and Google Analytics modules.

---

## Laravel and Symfony

### With files in `public/`

Copy `pts.lazyload.min.js` and `pts.lazyload.min.css` to `public/libs/pts-lazyload/`.

**Laravel (Blade)**, the shared layout:

```blade
<head>
    ...
    <link rel="stylesheet" href="{{ asset('libs/pts-lazyload/pts.lazyload.min.css') }}">
</head>
<body>
    ...
    @verbatim
    <template data-pts-lazyload>
        <!-- counter snippet unchanged -->
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
    <!-- counter snippet unchanged -->
</template>
{% endverbatim %}

<script src="{{ asset('libs/pts-lazyload/pts.lazyload.min.js') }}"></script>
<script>
    new PtsLazyLoad().init({{ app.user ? 0 : 1 }});
</script>
```

`@verbatim` / `{% verbatim %}` protect the counter snippet from the template engine.

### With a bundler (Vite, Webpack)

```bash
npm install github:ak-alz/pts-lazyload#v3.0.0
```

```js
import PtsLazyLoad from 'pts-lazyload';
import 'pts-lazyload/build/pts.lazyload.min.css';

new PtsLazyLoad().init(document.body.dataset.auth === '1' ? 0 : 1);
```

The login state is easy to pass via an attribute: `<body data-auth="{{ auth()->check() ? 1 : 0 }}">`.

---

## Google Tag Manager

If counters are included via GTM, there are two options.

### Option 1. The whole GTM container in a template

Move the GTM container snippet into `<template data-pts-lazyload>`. All GTM tags load only after confirmation.
The `<noscript>` part with the `<iframe>` from the GTM instructions can stay where it is.

```html
<template data-pts-lazyload>
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){ ... })(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
    <!-- End Google Tag Manager -->
</template>
```

### Option 2. GTM loads right away, tags fire on an event

Use it if GTM has tags that must work for every visitor.

1. Push an event to `dataLayer` after confirmation:

   ```js
   new PtsLazyLoad({
       counterSelector: false,
       onVerify: () => {
           window.dataLayer = window.dataLayer || [];
           window.dataLayer.push({event: 'pts_verified'});
       },
   }).init();
   ```

2. In GTM create a "Custom Event" trigger named `pts_verified`.
3. Assign it to the Metrica and Google Analytics tags instead of "All Pages" / "Initialization".

> [!NOTE]
> In option 2 the GTM container itself loads for bots too. Make sure no analytics tag fires on other triggers.

---

## When `<template>` can't be used

Some site builders and editors remove `<template>` or alter its contents. In that case pass counter snippets with the
[`counters`](../README.en.md#counters) option. Closing tags inside the string must be escaped: `<\/script>`.

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

The code is written in backticks, so quotes inside don't need escaping. Only `</script>` → `<\/script>` and, if present,
backticks `` ` `` → `` \` `` and `${` → `\${` need escaping.

---

Questions about installation — Pixel Tools support: **https://tools.pixelplus.ru/ask**
