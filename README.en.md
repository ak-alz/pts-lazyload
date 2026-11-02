# pts-lazyload v3

[Русский](README.md) | **English**

The script delays loading of analytics counters (Yandex Metrica, Google Analytics, etc.), ads and any other code until the
visitor **confirms they are human** by clicking the button in a welcome dialog. Bots that don't interact with the dialog,
or interact with it "like a robot", never reach your analytics, so they distort behavioral metrics less.

- No runtime dependencies: no jQuery, no FancyBox.
- Counter snippets go into `<template>` as is, without escaping.
- The dialog is created by the script; no HTML markup needs to be added to the page.
- BEM styles (block `pts-lazyload`); theming via CSS custom properties, the `theme` option or SCSS.
- The dialog structure can be fully replaced with templates, like in [Choices](https://github.com/Choices-js/Choices).
- Ready-made examples for [1C-Bitrix, WordPress, Tilda, MODX, OpenCart, Laravel and Symfony](docs/cms.en.md).
- Compatible with v2.x configuration (see "[Migrating from v2.x](#migrating-from-v2x)").

> [!TIP]
> **[Online configurator](https://ak-alz.github.io/pts-lazyload/)** — set up the dialog visually, enter your counter ID and copy the ready-made code
> (the interface is in Russian).
>
> Questions about installation and usage — Pixel Tools support: **https://tools.pixelplus.ru/ask**

---

## Contents

- [Quick start](#quick-start)
- [CMS installation](#cms-installation)
- [Options](#options)
- [Options reference](#options-reference)
- [API](#api)
- [Theming](#theming)
- [Dialog templates](#dialog-templates)
- [Events and callbacks](#events-and-callbacks)
- [How the protection works](#how-the-protection-works)
- [Accessibility and validity](#accessibility-and-validity)
- [Capabilities and limitations](#capabilities-and-limitations)
- [Migrating from v2.x](#migrating-from-v2x)
- [FAQ](#faq)
- [Articles and support](#articles-and-support)
- [Development](#development)

---

## Quick start

The easiest way is the **[online configurator](https://ak-alz.github.io/pts-lazyload/)**: set up the dialog appearance, enter your Yandex Metrica or
Google Analytics ID, copy the ready-made code and paste it before `</body>`. Below is the same done by hand.

### 1. Files

Built files are in `build/`:

| File                   | Purpose                            |
|------------------------|------------------------------------|
| `pts.lazyload.min.js`  | Production script                  |
| `pts.lazyload.min.css` | Production styles                  |
| `pts.lazyload.js`      | Unminified script, for debugging   |
| `pts.lazyload.css`     | Unminified styles                  |

Copy `pts.lazyload.min.js` and `pts.lazyload.min.css` to your site, for example to `/libs/pts-lazyload/`.

If you can't upload files to the server (Tilda, site builders), load them from the jsDelivr CDN straight from the repository:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/ak-alz/pts-lazyload@v3.0.0/build/pts.lazyload.min.css">
<script src="https://cdn.jsdelivr.net/gh/ak-alz/pts-lazyload@v3.0.0/build/pts.lazyload.min.js"></script>
```

Pin an exact version (`@v3.0.0`) rather than a branch, so a script update never changes your site's behavior without you knowing.

### 2. Styles

```html
<link rel="stylesheet" href="/libs/pts-lazyload/pts.lazyload.min.css">
```

### 3. Counter snippets

Wrap your counter snippets in `<template data-pts-lazyload>`. The code goes in **as is**, exactly as Yandex Metrica or
Google Analytics gives it to you, nothing needs escaping:

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

Until the visitor confirms they are human, the browser does not execute the contents of `<template>`. After
confirmation the code is inserted in place of the template (or into the element from `data-area`, see
[`counterSelector`](#counterselector)). Templates can go in `<head>` or `<body>`, as many as you need.

> [!IMPORTANT]
> Remove the counters from every other place: CMS settings, analytics modules and plugins, Google Tag Manager.
> Otherwise they load bypassing the script and the protection doesn't work.

### 4. Script and initialization

```html
<script src="/libs/pts-lazyload/pts.lazyload.min.js"></script>
<script>
    new PtsLazyLoad().init();
</script>
```

The script and the initialization can go anywhere: in `<head>`, at the start or at the end of `<body>`. The script waits
until the whole page is parsed and finds all templates.

### 5. Check

Open the site in a private window, DevTools → Network → JS filter. While the dialog is open, `tag.js` (Metrica) and
`gtag/js` (Google Analytics) are not loaded. After clicking the button they are. More in the [FAQ](#faq).

---

## CMS installation

Step-by-step instructions with ready-made code are in **[docs/cms.en.md](docs/cms.en.md)**:

- [Plain HTML](docs/cms.en.md#plain-html)
- [1C-Bitrix](docs/cms.en.md#1c-bitrix)
- [WordPress](docs/cms.en.md#wordpress)
- [Tilda](docs/cms.en.md#tilda)
- [MODX Revolution](docs/cms.en.md#modx-revolution)
- [OpenCart](docs/cms.en.md#opencart)
- [Laravel and Symfony](docs/cms.en.md#laravel-and-symfony)
- [Google Tag Manager](docs/cms.en.md#google-tag-manager)

---

## Options

Summary table. Each option is described in detail with examples [below](#options-reference).

| Option | Type | Default | Summary |
|---|---|---|---|
| [`counterSelector`](#counterselector) | `string \| false` | `'template[data-pts-lazyload]'` | Selector of counter templates |
| [`counters`](#counters) | `Array` | `[]` | Counters as JS strings (v2.x way) |
| [`cookieName`](#cookiename) | `string` | `'pts-lazyload-verified'` | Cookie and `localStorage` key name |
| [`cookieTime`](#cookietime) | `number` | `365` | Confirmation lifetime in days (max 400) |
| [`cookieDomain`](#cookiedomain) | `string` | `''` | Cookie domain (`.site.com` for `www` and bare) |
| [`salt`](#salt) | `string` | `location.hostname` | Token signature salt |
| [`botBehavior`](#botbehavior) | `'skip' \| 'load'` | `'skip'` | What to do with search engine crawlers |
| [`botUserAgents`](#botuseragents) | `string[]` | built-in list | Crawler User-Agents |
| [`skipForSearchVisitors`](#skipforsearchvisitors) | `boolean` | `false` | No dialog for visitors from search |
| [`searchReferrers`](#searchreferrers) | `Array<RegExp \| string>` | search engines | Search referrer rules |
| [`legacyEvent`](#legacyevent) | `boolean` | `true` | v2.1 `ptz-click` event |
| [`lockScroll`](#lockscroll) | `boolean` | `true` | Lock page scroll under the dialog |
| [`declineButton`](#declinebutton) | `boolean` | `false` | "Only necessary" button: close without counters |
| [`declineTime`](#declinetime) | `number` | `0` | Days to remember the refusal, `0` — until the tab is closed |
| [`closeButton`](#closebutton) | `boolean` | `false` | Close (×) button in the corner |
| [`closeOnOverlay`](#closeonoverlay) | `boolean` | `false` | Close by clicking the backdrop |
| [`closeOnEscape`](#closeonescape) | `boolean` | `false` | Close with the Escape key |
| [`modal.title`](#modaltitle) | `string` | `''` | Dialog title |
| [`modal.text`](#modaltext) | `string` | `'Мы используем файлы cookie…'` | Dialog text |
| [`modal.content`](#modalcontent) | `string \| Element` | `''` | HTML or an element instead of text |
| [`modal.buttonText`](#modalbuttontext) | `string` | `'Принять'` | Button text |
| [`modal.modifier`](#modalmodifier) | `string` | `''` | BEM modifiers of the dialog |
| [`modal.ariaLabel`](#modalarialabel) | `string` | `'Использование файлов cookie'` | Dialog label for screen readers |
| [`modal.closeLabel`](#modalcloselabel) | `string` | `'Закрыть'` | Close button label for screen readers |
| [`modal.closeIcon`](#modalcloseicon) | `string` | `'&times;'` | Close button icon (HTML, SVG) |
| [`modal.declineText`](#modaldeclinetext) | `string` | `'Только необходимые'` | Decline button text |
| [`colorScheme`](#colorscheme) | `'light' \| 'dark' \| 'auto'` | `'light'` | Dialog theme, `auto` follows the OS |
| [`theme`](#theme) | `Object` | `{}` | Colors, fonts, spacing, sizes, animation |
| [`themeDark`](#themedark) | `Object` | `{}` | Colors for the dark theme |
| [`autoFocus`](#autofocus) | `boolean` | `true` | Focus the button when opened |
| [`classNames`](#classnames) | `Object` | `pts-lazyload*` classes | Dialog part classes |
| [`templates`](#templates) | `Function \| Object` | `null` | Custom dialog templates |
| [`protection.minDelay`](#protectionmindelay) | `number` | `1200` | Minimum delay before a click, ms |
| [`protection.requirePointerMovement`](#protectionrequirepointermovement) | `boolean` | `true` | Require mouse movement |
| [`protection.rejectCenterClick`](#protectionrejectcenterclick) | `boolean` | `true` | Reject clicks exactly in the center |
| [`protection.honeypot`](#protectionhoneypot) | `boolean` | `true` | Honeypot button |
| [`protection.detectWebdriver`](#protectiondetectwebdriver) | `boolean` | `true` | Block automated browsers |
| [`intercept`](#intercept) | `Object` | `{}` | Intercept visitor actions |
| [`onShow`](#onshow) | `Function` | `null` | Dialog shown |
| [`onVerify`](#onverify) | `Function` | `null` | Counters loaded |
| [`onReject`](#onreject) | `Function` | `null` | Click not accepted |
| [`onBlock`](#onblock) | `Function` | `null` | Visitor blocked |
| [`onDismiss`](#ondismiss) | `Function` | `null` | Dialog closed without confirmation |
| [`debug`](#debug) | `boolean` | `false` | Log decisions to the console |

Default texts are in Russian; set `modal.title`, `modal.text`, `modal.buttonText`, `modal.ariaLabel` and `modal.closeLabel` for other languages:

```js
new PtsLazyLoad({
    modal: {
        text: 'We use cookies to make the site work properly and more convenient for you. By continuing to use the site, you agree to their use.',
        buttonText: 'Accept',
        ariaLabel: 'Use of cookies',
        closeLabel: 'Close',
    },
}).init();
```

---

## Options reference

### Counters

#### `counterSelector`

**Type:** `string | false` **Default:** `'template[data-pts-lazyload]'`

CSS selector of `<template>` elements with counter snippets. After confirmation the contents of every matching template
are inserted into the page and executed.

The insertion point is set with the `data-area` attribute holding a CSS selector. Without it the code replaces the template's position.

Scripts run in the same order as during normal page loading: if an external `<script src>` has no `async`, the code
after it waits until it loads. So "library + initialization" snippets (VK pixel, widgets) work.

`false` disables template lookup; only [`counters`](#counters) are loaded then.

```html
<!-- the code goes in place of the template -->
<template data-pts-lazyload>
    <script src="https://vk.com/js/api/openapi.js?169"></script>
    <script>VK.Retargeting.Init('VK-RTRG-XXXXXX-XXXXX'); VK.Retargeting.Hit();</script>
</template>

<!-- the code is appended to .footer-scripts -->
<template data-pts-lazyload data-area=".footer-scripts">
    ...
</template>
```

```js
// a custom attribute, e.g. if data-pts-lazyload is already taken
new PtsLazyLoad({counterSelector: 'template.lazy-counter'}).init();
```

#### `counters`

**Type:** `Array<{html: string, area?: string}>` **Default:** `[]`

Counter snippets as JS strings — the v2.x way. Handy when snippets come from CMS settings or are built on the server.

- `html` — HTML and scripts. The closing tag must be escaped: `<\/script>`, otherwise the browser closes the outer `<script>` too early.
- `area` — CSS selector of the element the code is appended to. Defaults to `head`.

```js
new PtsLazyLoad({
    counters: [
        {html: `<script src="https://mc.yandex.ru/metrika/tag.js" async><\/script>`},
        {html: `<div id="chat-widget"><\/div><script src="/chat.js"><\/script>`, area: '.footer'},
    ],
}).init();
```

> [!TIP]
> If a person pastes the snippets, use `<template>`: nothing needs escaping there.

### Confirmation token

#### `cookieName`

**Type:** `string` **Default:** `'pts-lazyload-verified'`

Name of the cookie and the `localStorage` key holding the signed confirmation token. Optional. A custom name makes
life a bit harder for generic bots tuned for default values.

```js
new PtsLazyLoad({cookieName: 'shop_v'}).init();
```

#### `cookieTime`

**Type:** `number` **Default:** `365`

How many days a visitor stays confirmed. The lifetime is extended on every visit (the token is reissued once a day),
so regular visitors never see the dialog again.

Invalid values (`'1 year'`, `0`, `NaN`) are replaced with 365; values above 400 are capped at 400 because browsers don't
keep cookies longer.

```js
new PtsLazyLoad({cookieTime: 30}).init(); // dialog again after 30 days without visits
```

#### `cookieDomain`

**Type:** `string` **Default:** `''` (current domain)

Cookie domain. Needed when the site is available both with and without `www`, or confirmation should work across subdomains.
The default signature salt then comes from `cookieDomain` too, so a token issued on one subdomain is valid on all of them.

```js
new PtsLazyLoad({cookieDomain: '.site.com'}).init(); // site.com, www.site.com, shop.site.com
```

#### `salt`

**Type:** `string` **Default:** `location.hostname`

Token signature salt. The signature prevents putting an arbitrary value like `true` into the cookie, and the salt makes
the signature unique per site: a token from another site, or from a generator built for default values, won't fit.

Defaults to the site's domain, so it's optional. Changing `salt` makes every visitor see the dialog once again.

```js
new PtsLazyLoad({salt: 'k8Fq2-zT9xw'}).init();
```

> [!NOTE]
> It's not a secret: the salt is visible in the page source, like the whole script. It stops generic bots, but not a
> bot written specifically for your site.
> See "[What the protection can't do](#what-the-protection-cant-do)".

### Crawlers and search visitors

#### `botBehavior`

**Type:** `'skip' | 'load'` **Default:** `'skip'`

What to do with visitors whose User-Agent belongs to a search engine crawler (see [`botUserAgents`](#botuseragents)):

- `'skip'` — no dialog, no counters. Real crawlers don't need counters, and a bot that fakes its User-Agent gets nothing;
- `'load'` — load counters without the dialog. That's how v2.x worked. Unsafe: faking the User-Agent again opens counters to bots.

With `'skip'`, Yandex Metrica may show the counter status as "Not found" even though visitor data keeps coming in.

```js
new PtsLazyLoad({botBehavior: 'load'}).init();
```

#### `botUserAgents`

**Type:** `string[]` **Default:** Googlebot, YandexBot and other Google, Yandex, Bing, Mail.ru, Rambler, DuckDuckGo, Apple, Baidu crawlers

User-Agent substrings that mark a visitor as a search engine crawler. Case-insensitive. The array replaces the default
list, so to extend it take the list from `PtsLazyLoad.defaults`:

```js
new PtsLazyLoad({
    botUserAgents: PtsLazyLoad.defaults.botUserAgents.concat(['SeznamBot', 'MyMonitoringBot']),
}).init();
```

#### `skipForSearchVisitors`

**Type:** `boolean` **Default:** `false`

Don't show the dialog to visitors coming from search engines (see [`searchReferrers`](#searchreferrers)) and load
counters for them right away.

> [!WARNING]
> Bots that manipulate behavioral factors come exactly from search results, and the referrer can be faked in an
> automated browser with one line. This mode noticeably weakens the protection.

```js
new PtsLazyLoad({skipForSearchVisitors: true}).init();
```

#### `searchReferrers`

**Type:** `Array<RegExp | string>` **Default:** Google, Yandex, ya.ru, Bing, Rambler, Mail.ru Search

Rules for [`skipForSearchVisitors`](#skipforsearchvisitors). A `RegExp` is tested against `document.referrer`; a string
is compared with the beginning of the URL.

```js
new PtsLazyLoad({
    skipForSearchVisitors: true,
    searchReferrers: [/^https:\/\/(www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?\//i, 'https://duckduckgo.com/'],
}).init();
```

### Dialog

#### `modal.title`

**Type:** `string` **Default:** `''`

Dialog title. Without a title the block isn't rendered. The text is escaped.

```js
new PtsLazyLoad({modal: {title: 'Welcome!'}}).init();
```

#### `modal.text`

**Type:** `string` **Default:** `'Мы используем файлы cookie, чтобы сайт работал корректно и был удобнее для вас. Продолжая пользоваться сайтом, вы соглашаетесь с их использованием.'` ("We use cookies to make the site work properly and more convenient for you. By continuing to use the site, you agree to their use.")

Dialog text under the title. A blank line starts a new paragraph; a line break inside a paragraph is kept. The text is
escaped: for links and markup use [`modal.content`](#modalcontent).

The dialog is not limited to a cookie notice: city selection, age confirmation, a greeting.

```js
new PtsLazyLoad({
    modal: {
        title: 'Are you 18 or older?',
        text: 'This site contains adult content.\n\nPlease confirm that you are 18 or older.',
        buttonText: 'Yes',
    },
}).init();
```

#### `modal.content`

**Type:** `string | Element` **Default:** `''`

Dialog content instead of [`modal.text`](#modaltext): several paragraphs, links, lists, images.

- **String** — HTML. Not escaped, so never pass visitor-provided data into it.
- **Element** — copied into the dialog; the original stays on the page. A `<template>` is the most convenient: its
  contents are invisible on the page, and the HTML is written as regular markup, not as a JS string.

```js
new PtsLazyLoad({
    modal: {content: '<p>We use cookies.</p><p><a href="/privacy">Privacy policy</a></p>'},
}).init();
```

```html
<template id="welcome">
    <p>We use cookies to make the site work better.</p>
    <p>More in our <a href="/privacy">privacy policy</a>.</p>
</template>

<script>
    new PtsLazyLoad({modal: {content: document.getElementById('welcome')}}).init();
</script>
```

#### `modal.buttonText`

**Type:** `string` **Default:** `'Принять'` ("Accept")

Confirmation button text. Escaped.

```js
new PtsLazyLoad({modal: {buttonText: 'Accept'}}).init();
```

#### `modal.modifier`

**Type:** `string` **Default:** `''`

Space-separated BEM modifiers of the dialog. Each becomes a `pts-lazyload--<modifier>` class. Built-in:

- `bottom` — a bar at the bottom of the screen, the page stays usable (use together with `lockScroll: false`). The bar
  is non-modal: no `aria-modal`, Tab moves freely between it and the page;
- `inline` — text on the left, buttons on the right, like a cookie bar. On screens up to 575 px (as in Bootstrap) the button moves under
  the text. Usually combined with `bottom`: `modifier: 'bottom inline'`.

Style your own modifiers yourself. The `dark` modifier from early v3 versions works as [`colorScheme: 'dark'`](#colorscheme).

```js
new PtsLazyLoad({modal: {modifier: 'bottom'}, lockScroll: false}).init();
```

#### `modal.ariaLabel`

**Type:** `string` **Default:** `'Использование файлов cookie'` ("Use of cookies")

Screen reader label of the dialog (`aria-label`) when there's no [`modal.title`](#modaltitle). With a title, the dialog is labelled by it.

#### `modal.closeLabel`

**Type:** `string` **Default:** `'Закрыть'` ("Close")

Screen reader label (`aria-label`) of the close button, see [`closeButton`](#closebutton).

#### `modal.closeIcon`

**Type:** `string` **Default:** `'&times;'`

Close button content: a character or HTML, e.g. an SVG icon. The icon size is `1em`, set by `theme.close.fontSize`.

```js
new PtsLazyLoad({
    closeButton: true,
    modal: {closeIcon: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2"/></svg>'},
}).init();
```

### "Only necessary" button

#### `declineButton`

**Type:** `boolean` **Default:** `false`

A second button next to the main one. It closes the dialog, but counters don't load and the confirmation token isn't
stored: the visitor refused optional cookies. A `pts-lazyload:dismiss` event is dispatched with `reason: 'decline'`.

The refusal is remembered for [`declineTime`](#declinetime) so the dialog doesn't show on every page. While it's in
effect, the dialog isn't shown, counters don't load, and `pts-lazyload:blocked` is dispatched with `reason: 'declined'`.
If the visitor later clicks "Accept" (e.g. after reopening the dialog with [`show()`](#show)), the refusal is cleared.

The buttons share the row equally. If they don't fit, they stack with the main button on top.

The click isn't checked for bots: a refusal gives a bot nothing.

Its look is set in the [`theme.decline`](#all-properties) group: by default no fill and a subtle border; size, radius and
font come from the main button. No border — `decline: {border: 'none'}`, grey —
`decline: {background: 'rgba(127, 127, 127, .12)', border: 'none'}`. In the [configurator](https://ak-alz.github.io/pts-lazyload/)
it's the "Only necessary" button section.

```js
new PtsLazyLoad({
    declineButton: true,
    theme: {decline: {color: '#6b7280', border: 'none', backgroundHover: '#f3f4f6'}},
}).init();
```

```js
const pts = new PtsLazyLoad({declineButton: true, declineTime: 30}).init();

// "Cookie settings" link in the site footer
document.querySelector('.cookie-settings').addEventListener('click', () => pts.show());
```

> [!NOTE]
> A visitor who clicked "Only necessary" won't reach analytics, same as a bot. Enable the button when refusing
> analytics cookies is required by law or by your site's policy.

#### `declineTime`

**Type:** `number` (days) **Default:** `0`

How long to remember the refusal. `0` — until the tab is closed (`sessionStorage`): the dialog won't show on the next
pages, but will on a new visit. Above zero — that many days (cookie `<cookieName>-declined`), at most 400.

#### `modal.declineText`

**Type:** `string` **Default:** `'Только необходимые'` ("Only necessary")

Decline button text. Escaped.

### Closing the dialog

By default the dialog closes only with the confirmation button. The options below add other ways to close it.

**Closing counts as confirmation**: counters load and the token is stored, as after clicking the button. Otherwise a
human who closed the dialog would drop out of analytics entirely. The protection doesn't get weaker: closing goes through
the same [checks](#how-the-protection-works) as the button click; if they fail, the dialog stays and a `reject` event is dispatched.

How the visitor confirmed is reported in `reason` of [`onVerify`](#onverify): `click`, `close`, `overlay` or `escape`.

The behavior of any action can be changed with [`intercept`](#intercept): for example, make the close button a refusal.

```js
new PtsLazyLoad({closeButton: true, closeOnOverlay: true, closeOnEscape: true}).init();
```

#### `closeButton`

**Type:** `boolean` **Default:** `false`

A close (×) button in the top right corner of the dialog. Rendered with the [`close`](#dialog-parts) template, so it can be
restyled or replaced, e.g. with a "Not now" button. Screen reader label: [`modal.closeLabel`](#modalcloselabel).

The click is checked the same way as the main button: a real click, a pause after the dialog appears, mouse movement,
not in the center. Keyboard users reach it with Tab.

#### `closeOnOverlay`

**Type:** `boolean` **Default:** `false`

Close by clicking the backdrop around the dialog. A click inside the dialog (on the text or title) doesn't close it.
Neither does selecting text in the dialog and releasing the mouse over the backdrop: the press must start on the backdrop.

With the `bottom` modifier there is no backdrop, clicks go through to the page, and the option has no effect.

#### `closeOnEscape`

**Type:** `boolean` **Default:** `false`

Close with the Escape key. A real key press no earlier than [`minDelay`](#protectionmindelay) after the dialog appears is
accepted, the same as pressing Enter on the button.

#### `autoFocus`

**Type:** `boolean` **Default:** `true`

Focus the confirmation button when the dialog opens: keyboard users can press Enter right away, screen readers announce
the dialog. Disable it if the dialog appears next to an input that must keep focus.

#### `lockScroll`

**Type:** `boolean` **Default:** `true`

Lock page scrolling while the dialog is open: the `pts-lazyload-locked` class is added to `<html>`.

```js
new PtsLazyLoad({lockScroll: false}).init();
```

#### `theme`

**Type:** `Object` **Default:** `{}`

The dialog appearance straight from JS: colors, fonts, spacing, sizes, radii, shadows, animation, mobile values
([`breakpoints`](#mobile-layout-and-breakpoints)). Global keys (`accent`,
`fontFamily`…) go at the top level, element styles go into the `dialog`, `overlay`, `title`, `text`, `actions`, `button`,
`close` groups, animation into `animation`. Numbers become pixels (`fontSize: 18` → `18px`), except unitless properties
(`fontWeight`, `lineHeight`, `opacity`, `zIndex`).

Every key becomes a CSS custom property on the dialog, so the same can be done from CSS. Full list in
"[Theming](#theming)".

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

**Type:** `'light' | 'dark' | 'auto'` **Default:** `'light'`

Dialog theme:

- `'light'` — light;
- `'dark'` — dark;
- `'auto'` — follows the visitor's OS (`prefers-color-scheme`). If the visitor switches the OS theme, the dialog
  updates immediately, even while open.

If your site has its own theme toggle, call [`setColorScheme()`](#setcolorschemescheme):

```js
const pts = new PtsLazyLoad({colorScheme: document.documentElement.classList.contains('dark') ? 'dark' : 'light'}).init();

themeToggle.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    pts.setColorScheme(dark ? 'dark' : 'light');
});
```

#### `themeDark`

**Type:** `Object` **Default:** `{}`

[`theme`](#theme) values for the dark theme, in the same format. In the dark theme `theme` applies, with `themeDark` on top.

Colors, backgrounds, borders and shadows from `theme` (anything with `background`, `color`, `border` or `shadow` in its
name: `dialog.background`, `dialog.border`, `dialog.shadow`, `title.color`, `text.linkColor`, `overlay.background`,
close and decline button colors…) belong to the light theme only: otherwise a light background or border would stay in
the dark theme too. In the dark theme they come from `themeDark` or the dark defaults. Shared by both themes: the
accent (`accent*`), the main button (`button.*`), fonts, sizes, radii, animation.

```js
new PtsLazyLoad({
    colorScheme: 'auto',
    theme: {accent: '#16a34a', dialog: {background: '#fffdf5', radius: 20}},
    themeDark: {accent: '#4ade80', accentText: '#052e16', dialog: {background: '#0f1a14'}},
}).init();
```

#### `classNames`

**Type:** `Object` **Default:** `pts-lazyload*` classes

Classes of the dialog parts. Passed to [templates](#dialog-templates) and used for modifiers, the open state and scroll
locking. You can override some keys; the rest keep their defaults. Full list:
"[`classNames` reference](#classnames-reference)".

```js
// add your design system classes to the button while keeping pts-lazyload styles
new PtsLazyLoad({classNames: {button: 'pts-lazyload__button btn btn-primary'}}).init();
```

#### `templates`

**Type:** `Function | Object` **Default:** `null`

Custom templates for the dialog parts, like `callbackOnCreateTemplates` in Choices. Details in "[Dialog templates](#dialog-templates)".

```js
new PtsLazyLoad({
    templates: ({escape}) => ({
        button: ({classNames}, {text}) => `<button class="${classNames.button}">✓ ${escape(text)}</button>`,
    }),
}).init();
```

### Protection

How the checks work is described in "[How the protection works](#how-the-protection-works)". Disable them only if you
know why: each one filters out its own class of bots.

#### `protection.minDelay`

**Type:** `number` (ms) **Default:** `1200`

Clicks earlier than this after the dialog appears are not accepted: scripts click the button immediately. A human who
clicked too early simply clicks again.

```js
new PtsLazyLoad({protection: {minDelay: 2000}}).init();
```

#### `protection.requirePointerMovement`

**Type:** `boolean` **Default:** `true`

For a mouse, require cursor movement before the click. Automation "teleports" the cursor to the button in a single event.
Doesn't affect touch and keyboard.

#### `protection.rejectCenterClick`

**Type:** `boolean` **Default:** `true`

Reject mouse clicks exactly in the geometric center of the button (±1 px): that's where Puppeteer and Playwright click,
while humans almost never hit it. Doesn't affect touch and keyboard.

#### `protection.honeypot`

**Type:** `boolean` **Default:** `true`

Add an invisible honeypot button with the same class and text before the real one. A bot that looks for the button by
class or text clicks the honeypot, and confirmation becomes impossible until the page reloads.

#### `protection.detectWebdriver`

**Type:** `boolean` **Default:** `true`

Don't show the dialog and don't load counters in automated browsers: `navigator.webdriver`, HeadlessChrome, PhantomJS,
Electron. Disable it for your own end-to-end tests if they need to see the dialog.

```js
new PtsLazyLoad({protection: {detectWebdriver: false}}).init();
```

### Intercepting actions

#### `intercept`

**Type:** `{button?, decline?, close?, overlay?, escape?}` **Default:** `{}`

Intercepts visitor actions: the button (`button`), the decline button (`decline`), the close button (`close`), a
backdrop click (`overlay`) and Escape (`escape`). By default `decline` refuses and the others confirm the visitor.
The interceptor decides:

```js
intercept: {
    close: (ctx, next) => {
        // next()         — default action: confirm the visitor and load counters
        // ctx.dismiss()  — close the dialog without confirmation: counters don't load, the dialog shows again on the next page
        // nothing        — the dialog stays open
    },
}
```

`ctx`: `action` — action name, `event` — the original event (`click` or `keydown`), `dismiss()` — refusal.

- The interceptor is called **only for actions that passed the bot check**. Rejected clicks never reach it; `reject`
  is dispatched for them as before.
- `next()` and `dismiss()` may be called later, e.g. after your own dialog or a server request. Only the first call counts.
- If the interceptor throws, the default action runs: an error in site code must not take away the visitor's ability to confirm.

```js
new PtsLazyLoad({
    closeButton: true,
    closeOnEscape: true,
    intercept: {
        // close button = refusal: the dialog closes, counters don't load
        close: (ctx) => ctx.dismiss(),

        // Escape does nothing, even though closeOnEscape is on
        escape: () => {},

        // notify your backend before confirming
        button: (ctx, next) => {
            fetch('/api/consent', {method: 'POST'}).finally(next);
        },
    },
}).init();
```

To remember the refusal for the session so the dialog doesn't show on every page:

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
> A visitor who closed the dialog with a refusal won't reach analytics — same as a bot. Use `dismiss()` only when a
> refusal is really needed (e.g. a cookie law requirement).

### Callbacks

Callbacks are called together with the [events](#events-and-callbacks) and receive the same `detail` object. An error
inside a callback doesn't prevent counters from loading.

#### `onShow`

**Type:** `Function` **Default:** `null`

The dialog is shown. Counters are not loaded yet at this point.

```js
// e.g. hide a chat widget so it doesn't cover the dialog
new PtsLazyLoad({onShow: () => document.body.classList.add('has-pts-modal')}).init();
```

#### `onVerify`

**Type:** `Function({reason})` **Default:** `null`

Counters are loaded. `reason`: `click` (button), `close` (close button), `overlay` (backdrop click), `escape`,
`token` (returning visit), `no-check` (`init(0)`), `search-bot`, `search-referrer`.

```js
new PtsLazyLoad({
    onVerify: ({reason}) => {
        if (reason === 'click') document.body.classList.add('is-verified');
    },
}).init();
```

#### `onReject`

**Type:** `Function({reason})` **Default:** `null`

The click on the button was not accepted; the dialog stays. `reason`: `untrusted`, `too-fast`, `no-pointerdown`,
`no-movement`, `center-click`, `honeypot`.

```js
new PtsLazyLoad({onReject: ({reason}) => navigator.sendBeacon('/bot-log', reason)}).init();
```

#### `onBlock`

**Type:** `Function({reason})` **Default:** `null`

No dialog shown and no counters loaded. `reason`: `automation`, `search-bot`, `declined` (the visitor clicked
"Only necessary" earlier).

#### `onDismiss`

**Type:** `Function({reason})` **Default:** `null`

The dialog was closed without confirmation via `ctx.dismiss()` in [`intercept`](#intercept). `reason` is the action:
`button`, `close`, `overlay` or `escape`.

### v2.x compatibility

#### `legacyEvent`

**Type:** `boolean` **Default:** `true`

Dispatch the v2.1 `ptz-click` event on `document` along with `pts-lazyload:verified`. Sites that show ads only to
confirmed visitors subscribe to it. Disable it if you don't use it.

```js
new PtsLazyLoad({legacyEvent: false}).init();
```

### Debugging

#### `debug`

**Type:** `boolean` **Default:** `false`

Log the script's decisions to the console: why counters were or weren't loaded, why a click was rejected.

```js
new PtsLazyLoad({debug: true}).init();
// [pts-lazyload] клик отклонён: too-fast
// [pts-lazyload] загрузка счётчиков, причина: click
```

Console messages are in Russian; the reason codes (`too-fast`, `click`) are the same as in events.

---

## API

#### `new PtsLazyLoad(options)`

Creates an instance. Does nothing until `init()` is called. The old v2.x name `ptsLazyLoad` also works.

#### `init(needCheck?)`

Starts the check. Returns the instance. Repeated calls are ignored.

| `needCheck` | Behavior |
|---|---|
| no argument, `1`, `true` | Regular check: dialog, token, crawlers |
| `0`, `false` | No check needed, counters load immediately. E.g. for logged-in users |

```twig
new PtsLazyLoad(options).init({{ app.user ? 0 : 1 }});
```

The script waits until the whole page is parsed (`DOMContentLoaded`), so `init()` may be called above the counter templates.

#### `show()`

Shows the dialog again — e.g. from a "Cookie settings" link in the footer, so a visitor who refused optional cookies can
change their mind. Does nothing if counters are already loaded or the dialog is open. Returns the instance.

#### `setColorScheme(scheme)`

Switches the dialog theme: `'light'`, `'dark'` or `'auto'`. An open dialog updates immediately. Returns the instance.
See the example under [`colorScheme`](#colorscheme).

#### `destroy()`

Closes the dialog and removes listeners, e.g. on SPA navigation. Already loaded counters stay.

#### `PtsLazyLoad.version`

Script version, e.g. `'3.0.0'`.

#### `PtsLazyLoad.defaults`

Default values. Changes apply to every instance created afterwards:

```js
PtsLazyLoad.defaults.modal.buttonText = 'Got it';
```

---

## Theming

The appearance is configured in three ways, which can be combined:

1. **The `theme` option** — from JS, no CSS needed.
2. **CSS** — `--pts-lazyload-*` custom properties or regular class properties.
3. **SCSS** — overriding defaults at build time.

All three work through CSS custom properties: `theme` sets them on the dialog root element, CSS on the `.pts-lazyload`
class, and SCSS provides the values used when a property isn't set. So the dialog styles can be changed any way you
like, and the ways don't get in each other's way.

### BEM structure

```
.pts-lazyload                 root block (role="dialog")
├── .pts-lazyload__overlay    backdrop
└── .pts-lazyload__dialog     dialog
    ├── .pts-lazyload__close  close button (closeButton)
    ├── .pts-lazyload__title  title
    ├── .pts-lazyload__body   text or content
    │   └── .pts-lazyload__text   text paragraph
    └── .pts-lazyload__actions
        ├── .pts-lazyload__decline  decline button (declineButton)
        └── .pts-lazyload__button

.pts-lazyload--open           dialog is open
.pts-lazyload--dark           dark theme (colorScheme)
.pts-lazyload--bottom         bottom bar, the page stays usable (use with lockScroll: false)
.pts-lazyload--inline         text on the left, buttons on the right
.pts-lazyload--pristine       no key pressed yet: the focus ring is hidden
.pts-lazyload__aux            protection helper element, don't touch
```

### With `theme`

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

The `title.fontSize` key becomes `--pts-lazyload-title-font-size`, `button.backgroundHover` becomes
`--pts-lazyload-button-background-hover`, and so on. Custom properties work too: `{'--pts-lazyload-my-gap': '4px'}`.

For responsive values use `clamp()` or CSS media queries:

```js
theme: {title: {fontSize: 'clamp(22px, 5vw, 36px)'}}
```

### With CSS

With custom properties:

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

Or with regular class properties — include your CSS after `pts.lazyload.css`:

```css
.pts-lazyload__title {
    letter-spacing: -.02em;
    text-transform: uppercase;
}
```

> [!NOTE]
> Values from `theme` are set on the dialog element directly, so they win over custom properties from CSS. If a
> property is set both in `theme` and in CSS, `theme` wins.

### All properties

| `theme` | CSS custom property | Default |
|---|---|---|
| **Global** | | |
| `accent` | `--pts-lazyload-accent` | `#0836ff` — button, links, focus |
| `accentHover` | `--pts-lazyload-accent-hover` | `#0435c9` |
| `accentText` | `--pts-lazyload-accent-text` | `#fff` — button text |
| `fontFamily` | `--pts-lazyload-font-family` | `inherit` |
| `zIndex` | `--pts-lazyload-z-index` | `8000` |
| `gutter` | `--pts-lazyload-gutter` | `16px` — dialog distance from the screen edges |
| **Backdrop** | | |
| `overlay.background` | `--pts-lazyload-overlay-background` | `rgba(0, 0, 0, .5)` |
| `overlay.blur` | `--pts-lazyload-overlay-blur` | `0px` — blur of the page under the dialog |
| **Dialog** | | |
| `dialog.background` | `--pts-lazyload-dialog-background` | `#fff` |
| `dialog.color` | `--pts-lazyload-dialog-color` | `#3d424b` — text color |
| `dialog.width` | `--pts-lazyload-dialog-width` | `500px` — max width |
| `dialog.padding` | `--pts-lazyload-dialog-padding` | `30px`, `24px 20px` on mobile |
| `dialog.radius` | `--pts-lazyload-dialog-radius` | `8px` |
| `dialog.shadow` | `--pts-lazyload-dialog-shadow` | Material shadow |
| `dialog.border` | `--pts-lazyload-dialog-border` | `none` |
| `dialog.textAlign` | `--pts-lazyload-dialog-text-align` | `center` |
| **Title** | | |
| `title.color` | `--pts-lazyload-title-color` | `#3d424b` |
| `title.fontSize` | `--pts-lazyload-title-font-size` | `32px`, `26px` on mobile |
| `title.fontWeight` | `--pts-lazyload-title-font-weight` | `300` |
| `title.lineHeight` | `--pts-lazyload-title-line-height` | `1.2` |
| `title.margin` | `--pts-lazyload-title-margin` | `0 0 20px` |
| `title.fontFamily` | `--pts-lazyload-title-font-family` | `inherit` |
| `title.textAlign` | `--pts-lazyload-title-text-align` | same as dialog |
| **Text** | | |
| `text.color` | `--pts-lazyload-text-color` | same as dialog |
| `text.fontSize` | `--pts-lazyload-text-font-size` | `16px` |
| `text.lineHeight` | `--pts-lazyload-text-line-height` | `1.4` |
| `text.paragraphGap` | `--pts-lazyload-text-paragraph-gap` | `.75em` — space between paragraphs |
| `text.linkColor` | `--pts-lazyload-text-link-color` | `accent` |
| `text.linkColorHover` | `--pts-lazyload-text-link-color-hover` | same as `text.linkColor` |
| `text.linkDecoration` | `--pts-lazyload-text-link-decoration` | `underline`; `none` — no underline (a `text-decoration-line` value) |
| `text.linkDecorationHover` | `--pts-lazyload-text-link-decoration-hover` | same as `text.linkDecoration` |
| `text.textAlign` | `--pts-lazyload-text-text-align` | same as dialog |
| **Actions** | | |
| `actions.marginTop` | `--pts-lazyload-actions-margin-top` | `32px` |
| `actions.justify` | `--pts-lazyload-actions-justify` | `center` |
| `actions.gap` | `--pts-lazyload-actions-gap` | `12px` |
| **Button** | | |
| `button.background` | `--pts-lazyload-button-background` | `accent` |
| `button.backgroundHover` | `--pts-lazyload-button-background-hover` | `accentHover` |
| `button.color` | `--pts-lazyload-button-color` | `accentText` |
| `button.colorHover` | `--pts-lazyload-button-color-hover` | same as `button.color` |
| `button.fontSize` | `--pts-lazyload-button-font-size` | `16px` |
| `button.fontWeight` | `--pts-lazyload-button-font-weight` | `400` |
| `button.height` | `--pts-lazyload-button-height` | `50px` — minimum, long text wraps |
| `button.minWidth` | `--pts-lazyload-button-min-width` | `180px` |
| `button.width` | `--pts-lazyload-button-width` | `auto`, `100%` on mobile |
| `button.padding` | `--pts-lazyload-button-padding` | `8px 32px` |
| `button.radius` | `--pts-lazyload-button-radius` | `5px` |
| `button.border` | `--pts-lazyload-button-border` | `none` |
| `button.shadow` | `--pts-lazyload-button-shadow` | Material shadow |
| `button.textTransform` | `--pts-lazyload-button-text-transform` | `uppercase` |
| `button.letterSpacing` | `--pts-lazyload-button-letter-spacing` | `.02em` |
| **Decline button** | | sizes — same as the main button |
| `decline.background` | `--pts-lazyload-decline-background` | `transparent` |
| `decline.backgroundHover` | `--pts-lazyload-decline-background-hover` | `rgba(127, 127, 127, .1)` |
| `decline.color` | `--pts-lazyload-decline-color` | dialog text color |
| `decline.border` | `--pts-lazyload-decline-border` | `1px solid rgba(127, 127, 127, .5)` |
| `decline.borderColorHover` | `--pts-lazyload-decline-border-color-hover` | `rgba(127, 127, 127, .8)` |
| `decline.colorHover` | `--pts-lazyload-decline-color-hover` | same as `decline.color` |
| `decline.minWidth` | `--pts-lazyload-decline-min-width` | `0` |
| `decline.opacity` | `--pts-lazyload-decline-opacity` | `1` — lower values make the text fail contrast requirements |
| `decline.fontWeight` | `--pts-lazyload-decline-font-weight` | same as the main button |
| **Close button** | | |
| `close.size` | `--pts-lazyload-close-size` | `36px` — width and height |
| `close.top` | `--pts-lazyload-close-top` | `8px` |
| `close.right` | `--pts-lazyload-close-right` | `8px` |
| `close.color` | `--pts-lazyload-close-color` | dialog text color |
| `close.fontSize` | `--pts-lazyload-close-font-size` | `28px` — icon size |
| `close.opacity` | `--pts-lazyload-close-opacity` | `.7`, `1` on hover; below `.7` the icon fails contrast requirements |
| `close.background` | `--pts-lazyload-close-background` | `transparent` |
| `close.backgroundHover` | `--pts-lazyload-close-background-hover` | `rgba(127, 127, 127, .12)` |
| `close.radius` | `--pts-lazyload-close-radius` | `50%` |
| **Animation** | | |
| `animation.type` | `--pts-lazyload-animation-transform` | `slide-up` |
| `animation.transform` | `--pts-lazyload-animation-transform` | `translateY(16px)` — where the dialog comes from |
| `animation.duration` | `--pts-lazyload-animation-duration` | `.3s` (a number means milliseconds) |
| `animation.easing` | `--pts-lazyload-animation-easing` | `ease` |

### Mobile layout and breakpoints

`theme.breakpoints` sets values for different screen sizes. The key is a number ("screen up to N px wide, inclusive")
or any media query as a string. The value has the same groups as `theme`.

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

- On a 400 px screen `theme` applies, then the 768 values, then the 575 values on top: a smaller breakpoint wins over
  a larger one, key order doesn't matter. String media queries apply after numeric ones, in declaration order.
- Values are recalculated when the screen rotates or the window is resized, even while the dialog is open.
- `themeDark` supports `breakpoints` too.
- Without breakpoints, screens up to 575 px (as in Bootstrap) get mobile defaults: smaller title and padding, full-width button. Values
  from `theme` and `breakpoints` win over them.

### Appearance animation

The dialog appears smoothly: the backdrop fades in and the dialog moves from `animation.transform` into place.

| `animation.type` | Effect |
|---|---|
| `slide-up` | from below (default) |
| `slide-down` | from above |
| `zoom` | scale up |
| `fade` | fade only |
| `none` | no animation |

```js
theme: {animation: 'zoom'}
theme: {animation: {type: 'fade', duration: 150}}
theme: {animation: {transform: 'translateX(-40px) rotate(-2deg)', duration: 500, easing: 'ease-out'}}
```

For visitors with "Reduce motion" enabled in their OS (`prefers-reduced-motion`), the animation is turned off.

### With SCSS

If your site builds styles from SCSS, use the source and override the defaults.
All variables are listed in `src/scss/_variables.scss`:

```scss
@use 'pts-lazyload/src/scss/pts.lazyload' with (
    $accent: #e11d48,
    $title-font-size: 28px,
    $button-radius: 999px,
    $animation-transform: scale(.92),
    $mobile: 600px
);
```

SCSS provides the defaults, so the `theme` option and CSS custom properties keep working.

---

## Dialog templates

If styles and `modal.*` are not enough (a logo, a custom layout, a button from your design system), the dialog
structure can be overridden with templates. The approach is the same as `callbackOnCreateTemplates` in
[Choices](https://github.com/Choices-js/Choices).

```js
new PtsLazyLoad({
    modal: {title: 'Welcome!', text: 'We use cookies', buttonText: 'Accept'},

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
                <a href="/privacy">Privacy policy</a>
            </div>`,
    }),
}).init();
```

### Dialog parts

```
root                      root block
├── overlay               backdrop
└── dialog                dialog
    ├── close             only when closeButton is enabled
    ├── title             only when modal.title is set
    ├── body
    └── actions
        └── button        confirmation button
```

| Template  | `data`                                  | Child parts in `data` |
|-----------|-----------------------------------------|-----------------------|
| `root`    | `{modifiers}` — array from `modal.modifier` | `overlay`, `dialog` |
| `overlay` | `{}`                                    | —                     |
| `dialog`  | `{}`                                    | `close`, `title`, `body`, `actions` |
| `title`   | `{title}`                               | —                     |
| `body`    | `{text, content}` — `content` is already a string or a ready node | — |
| `actions` | `{}`                                    | `decline`, `button`   |
| `button`  | `{text}`                                | —                     |
| `decline` | `{text}` — from `modal.declineText`     | —                     |
| `close`   | `{label, icon}` — from `modal.closeLabel` and `modal.closeIcon` | — |

Each template is a function `({classNames, options}, data) => string | Element`. Override only the parts you need;
the rest stay default. `templates` can also be passed as a plain object without the wrapper function.

The wrapper function receives helpers:

- `strToEl(html)` — turns an HTML string into an `Element`;
- `escape(text)` — escapes text. **Values in `data` are raw**: insert `title`, `text` and `buttonText` through `escape`;
- `classNames` — the resulting classes.

### Where child parts go

Child parts (e.g. `title`, `body` and `actions` for `dialog`) arrive in `data` as ready elements. There are three ways
to place them:

1. **Do nothing.** They are appended to the element in the order from the table. That's how the default templates work.
2. **Placeholder in the string:** `<div data-slot="actions"></div>` is replaced with the matching element.
3. **Manually:** return an `Element` and insert the part yourself:

   ```js
   actions: ({classNames}, {button}) => {
       const el = strToEl(`<div class="${classNames.actions}"><span>By clicking the button you agree…</span></div>`);
       el.append(button);
       return el;
   }
   ```

### What the library does vs. what the template does

A template is responsible for appearance only. Everything that protection and accessibility depend on is set by the
library after rendering, so a template mistake can't break the protection:

- `role="dialog"`, `aria-modal`, `aria-labelledby` / `aria-label` and the title `id`;
- `type="button"` on the button and the close button, `aria-label` on the close button if the template didn't set one,
  focus on the button when opened, Tab cycling inside the dialog;
- the honeypot button: built with **the same `button` template**, so bots can't tell it from the real one, and placed before it in the DOM;
- the open class (`classNames.open`), scroll lock class (`classNames.locked`) and CSS properties from `theme`.

Template requirements:

- `button` and `close` must return a `<button>` element. A link or a `<div>` won't do: they have no native keyboard activation;
- a template must not lose child parts.

If a template throws, returns something wrong, or the button ends up outside the dialog, an error
`[pts-lazyload] Ошибка в шаблонах окна…` is logged and the dialog is rendered with the default templates. The visitor
can always confirm, and counters will load.

### `classNames` reference

| Key       | Default                   |
|-----------|---------------------------|
| `root`    | `pts-lazyload`            |
| `open`    | `pts-lazyload--open`      |
| `locked`  | `pts-lazyload-locked` (on `<html>`) |
| `overlay` | `pts-lazyload__overlay`   |
| `dialog`  | `pts-lazyload__dialog`    |
| `title`   | `pts-lazyload__title`     |
| `body`    | `pts-lazyload__body`      |
| `text`    | `pts-lazyload__text`      |
| `actions` | `pts-lazyload__actions`   |
| `button`  | `pts-lazyload__button`    |
| `decline` | `pts-lazyload__decline`   |
| `close`   | `pts-lazyload__close`     |
| `aux`     | `pts-lazyload__aux` (honeypot wrapper) |

Styles in `pts.lazyload.css` target the default classes. If you replace them, style the dialog yourself. The honeypot
wrapper (`aux`) must be hidden the same way as in `pts.lazyload.css`: moved off-screen, but not with `display: none`.

---

## Events and callbacks

All events are dispatched on `document`; data is in `event.detail`.

| Event                   | Callback   | When | `detail.reason` |
|-------------------------|------------|------|-----------------|
| `pts-lazyload:show`     | `onShow`   | Dialog shown. | — |
| `pts-lazyload:verified` | `onVerify` | Counters loaded. | `click`, `close`, `overlay`, `escape`, `token`, `no-check`, `search-bot` (with `botBehavior: 'load'`), `search-referrer` |
| `ptz-click`             | —          | Same as `verified`, for v2.1 compatibility. | same |
| `pts-lazyload:reject`   | `onReject` | Button, close button, backdrop click or Escape not accepted, dialog stays. | `untrusted`, `too-fast`, `no-pointerdown`, `no-movement`, `center-click`, `honeypot` |
| `pts-lazyload:blocked`  | `onBlock`  | Counters not loaded, dialog not shown. | `automation`, `search-bot`, `declined` |
| `pts-lazyload:dismiss`  | `onDismiss` | Dialog closed without confirmation: decline button or `ctx.dismiss()` in `intercept`. | `decline`, `button`, `close`, `overlay`, `escape` |

Example: show a Yandex Advertising Network fullscreen ad only to confirmed visitors.

```js
document.addEventListener('pts-lazyload:verified', () => {
    window.yaContextCb.push(() => {
        Ya.Context.AdvManager.render({blockId: 'R-A-XXXXXX-X', type: 'fullscreen', platform: 'touch'});
    });
});
```

---

## How the protection works

```
init(needCheck)
 ├─ needCheck = 0                     → load counters
 ├─ navigator.webdriver / headless    → load nothing
 ├─ crawler User-Agent                → load nothing (botBehavior: 'skip')
 ├─ valid signed token                → renew the token, load counters
 ├─ skipForSearchVisitors + search referrer → load counters
 └─ otherwise                         → show the dialog
                                         └─ click passes the checks → store the token, load counters
                                            click fails → dialog stays, reject event
```

**Click checks** (button, close button and backdrop):

1. `event.isTrusted`: the click was generated by the browser, not by `element.click()` or `dispatchEvent()` from JS.
2. At least `minDelay` ms have passed since the dialog appeared.
3. Mouse: the click was preceded by a press on the button itself and cursor movement (at least 3 `pointermove` events).
   A click exactly in the center of the button (±1 px) is rejected: Puppeteer and Playwright click there, humans almost never do.
4. A click without a pointer press is the keyboard (Enter/Space) or a screen reader: NVDA, JAWS and VoiceOver
   activate the button themselves, without keyboard events on the page. It's checked against items 1 and 2, so the
   dialog works without a mouse. A mouse click always goes through item 3, even with `detail: 0`. Escape
   ([`closeOnEscape`](#closeonescape)) — items 1 and 2.
5. A tap on a touch screen is accepted without the movement check.
6. Honeypot: an invisible button with the same class and text sits before the real one in the DOM. A bot that looks for
   `.pts-lazyload__button` or a button by its text clicks it, and confirmation becomes impossible until the page reloads.

A rejected click is simply ignored: a human who clicked too early clicks again.

**Token.** Instead of `cookie=true` the script stores `v3.<issue time>.<random value>.<signature>`. The signature is
computed from the time, the random value, `salt` and the cookie name. The token is duplicated in `localStorage`: if
one copy is lost, it's restored from the other. Once a day on a visit the token is reissued and its lifetime starts over.

---

## Accessibility and validity

The dialog must not spoil a site's quality checks, so every change goes through automated checks
(`tests/e2e/a11y.spec.js`), and the official W3C validators before a release:

| Check | Result |
|---|---|
| [W3C Nu HTML Checker](https://validator.w3.org/nu/) — a page with the open dialog and counter templates | 0 errors, 0 warnings |
| W3C Nu HTML Checker — code produced by the [configurator](https://ak-alz.github.io/pts-lazyload/) | 0 errors, 0 warnings |
| [W3C CSS Validator](https://jigsaw.w3.org/css-validator/) — `pts.lazyload.css` and `.min.css` | valid, 0 errors |
| axe-core, WCAG 2.2 AA + best practices — all dialog variants, light and dark theme | 0 violations |
| html-validate (HTML specification rules) — dialog markup | 0 errors |

The W3C CSS Validator prints an informational warning "CSS variables are currently not statically checked" for every
`var()`. It's not an error: the validator flags any CSS custom property this way, and the whole theming is built on them.

**Accessibility features:**

- `role="dialog"`, `aria-modal`, a label (`aria-labelledby` or `aria-label`) and a description (`aria-describedby`) —
  screen readers announce the title and the text;
- focus moves to the button when the dialog opens and doesn't leave the dialog on Tab (also with `autoFocus: false`);
  after closing it returns where it was, e.g. to the "Cookie settings" link; everything works from the keyboard;
- the button can be pressed with a screen reader: NVDA, JAWS and VoiceOver activate it without keyboard events, and the
  protection accounts for that;
- the `bottom` bar is non-modal: no `aria-modal` and no focus trap, the page under it stays usable;
- text contrast is at least 4.5:1, the close icon at least 3:1 (checked including opacity, which axe ignores);
- buttons are at least 24×24 px (WCAG 2.5.8), no horizontal scroll on a 320 px screen;
- Windows high contrast mode (`forced-colors`) — the dialog and buttons get borders;
- `prefers-reduced-motion` — animation is turned off;
- the honeypot button is hidden from screen readers (`aria-hidden`) and unreachable with Tab.

If you change colors via `theme`, keep an eye on contrast yourself: the library can't check it for you.

---

## Capabilities and limitations

### What the protection stops

| Bypass scenario | v2.1 | v3.0 |
|---|---|---|
| Faking a crawler User-Agent (Googlebot, YandexBot…) | Dialog skipped, **counters loaded** | No dialog, counters **not** loaded |
| Setting the cookie manually (`PST_VERIFIED_COOKIE=true`, `PTZ__VERIFIED_COOKIE_NAME=1`) | Passed: only a substring of `document.cookie` was checked | A signed token is required; arbitrary values don't work |
| Auto-click `element.click()` / `$.fancybox.close()` / `dispatchEvent` | Accepted | Rejected (`isTrusted`, honeypot) |
| Default Puppeteer/Playwright/Selenium click (immediately, in the center, no mouse movement) | Accepted | Rejected (`webdriver`, `HeadlessChrome`, delay, center, movement) |
| A bot following an internal link without confirmation (`checkInternal`) | Counters loaded based on the internal referrer | Option removed; without a token the dialog is shown on every page |
| Faking a search engine referrer | Dialog skipped, counters loaded | Referrer ignored by default |

### Dialog shown again to regular visitors

In v2.1 the cookie lifetime was set once on click and never extended. Besides, browsers cap the lifetime of cookies set
from JS: Safari (ITP) keeps them for at most 7 days, Chrome for at most 400. If `cookieTime` was not a number
(`'1 year'`), the result was `max-age=NaN`; the browser ignored the attribute and set a session cookie that was deleted
when the browser closed. When the site was opened both with and without `www`, the cookie of one variant wasn't visible on the other.

In v3.0:

- `cookieTime` is validated: invalid values become 365, values above 400 are capped at 400;
- the token is extended on every visit (sliding expiration), so regular visitors don't see the dialog again;
- the token is duplicated in `localStorage`;
- `cookieDomain` covers sites with and without `www`.

A Safari visitor who hasn't visited for more than 7 days will see the dialog again: this can't be fixed from JS.
If that matters, set the cookie from the server (`Set-Cookie` HTTP header); ITP doesn't cap those.

### What the protection can't do

> [!WARNING]
> The protection runs entirely in the visitor's browser, so it **raises the cost of bypassing it, but doesn't guarantee** the absence of bots.

- **Targeted bypass.** The script is open source. A bot written for a specific site can compute the token signature,
  avoid the honeypot, hide `navigator.webdriver` and emulate mouse movement with an off-center click. `salt` only stops
  generic bots that don't read this file.
- **Bots on real devices and browsers** imitating human behavior (typical behavioral-factor manipulation services) pass
  the dialog just like a human.
- **Token transfer.** The token is not bound to the device: a cookie copied from a real browser works for a bot too.
- **Taps** are checked more leniently than mouse clicks: an emulated touch is harder to tell from a real one.
- **Real search engine crawlers** don't load counters. So Yandex Metrica may show the counter status as "Not found"
  while visitor data keeps coming in. If needed, set `botBehavior: 'load'`, but then faking the User-Agent opens
  counters to bots again.
- **`skipForSearchVisitors: true`** is convenient for visitors, but behavioral-factor bots come exactly from search, and
  the referrer is faked in an automated browser with one line. Enable it only if you know why.
- Visitors without JS or with ad blockers won't reach analytics, same as without the script.

### Recommendations

- Enable "Robot filtering" in Yandex Metrica with strict rules and behavior analysis: it's an independent protection layer.
- For serious protection add server-side checks (Yandex SmartCaptcha, Cloudflare Turnstile, log analysis and rate
  limiting on the server). `pts-lazyload` complements them well but doesn't replace them.
- For extra protection set your own `cookieName` and `salt`: it gets in the way of generic bots tuned for default values.

---

## Migrating from v2.x

1. Replace `welcome-pt.css` and `pts.lazyload.js` with `build/pts.lazyload.min.css` and `build/pts.lazyload.min.js`.
2. Remove the dialog markup (`.welcome-pt-modal`) from HTML: the script creates the dialog now. Without the old styles that markup becomes visible.
3. The v2.1 configuration works unchanged, but a warning is logged to the console. Recommended replacements:

   | v2.1               | v3.0                           |
   |--------------------|--------------------------------|
   | `cookie_name`      | `cookieName`                   |
   | `modalText`        | `modal.text`                   |
   | `checkInternal`    | removed, has no effect         |
   | `ptsLazyLoad`      | `PtsLazyLoad` (the old name is kept as an alias) |
   | `ptz-click` event  | `pts-lazyload:verified` (`ptz-click` is still dispatched) |

4. Optionally move counter snippets from `counters[].html` to `<template data-pts-lazyload>` and drop the escaping.
   The old way keeps working.
5. Old cookies (`true`) are no longer accepted, so after the update every visitor sees the dialog once.

The v1 configuration (jQuery, `simpleCheck`, `dataLazyLoadingJS.data`) is not supported: move the snippets from
`data.*.html` to `<template data-pts-lazyload>`.

---

## FAQ

**How do I check that it works?**
Open the site in a private window, DevTools → Network → JS filter. Before the click Metrica's `tag.js` isn't loaded;
after the click it is. The `debug: true` option logs the script's decisions to the console.

**The counter loads before the click.**
It's connected somewhere else: CMS settings, an analytics module or plugin, Google Tag Manager, or right in the site
template. Search the page source (Ctrl+U) for `mc.yandex.ru` or `googletagmanager` outside `<template data-pts-lazyload>`.

**Yandex Metrica shows the counter status as "Not found".**
The Metrica crawler doesn't load counters (see [`botBehavior`](#botbehavior)). Visitor data keeps coming in.

**How do I reset confirmation for testing?**
Delete the cookie and the `localStorage` key named `cookieName`, or open the site in a private window.

**The dialog doesn't show in a headless browser or in automated tests.**
That's by design ([`detectWebdriver`](#protectiondetectwebdriver)). For tests, disable `protection.detectWebdriver`
or call `init(0)`.

**Logged-in users don't need the dialog.**
Pass `0` to `init()`; CMS examples are in [docs/cms.en.md](docs/cms.en.md).

---

## Articles and support

- [Bot protection script 2.0](https://tools.pixelplus.ru/news/skript-zashchity-ot-botov-2) — Pixel Tools article about the script and its installation (in Russian)
- [Bot protection script on Tilda](https://tools.pixelplus.ru/news/skript-zashchity-ot-botov-tilda) — installing on Tilda (in Russian)

The articles cover v2: counter snippets are escaped by hand and the dialog is laid out on the page. v3 doesn't need
that; for current installation see "[Quick start](#quick-start)" and [docs/cms.en.md](docs/cms.en.md#tilda).

**Pixel Tools support: https://tools.pixelplus.ru/ask**

---

## Development

```bash
npm install
npm run dev        # demo page index.html with sources from src/ and hot reload
npm run site:dev   # online configurator (site/) with hot reload
npm run site:build # build the configurator to dist-site/
npm run build      # build to build/: regular and .min JS and CSS
npm test           # all tests
npm run test:unit  # unit tests (Vitest + jsdom), ~1 s
npm run test:e2e   # build + end-to-end tests in Chromium (Playwright)
```

### Tests

- `tests/unit/` — logic without a browser: the token and forgeries, option normalization and v2.x compatibility, crawler
  and search referrer detection, every click rejection reason in `ClickGuard`, dialog rendering from templates and template errors.
- `tests/e2e/` — what can only be checked in a real browser, against the built `build/pts.lazyload.min.js`: `isTrusted`,
  a "bot-like" Playwright click vs. "human-like" mouse movement, tap, keyboard, honeypot, `navigator.webdriver`,
  User-Agent spoofing, cookie and `localStorage`, token expiration and renewal, running Metrica's snippet from
  `<template>`, script order, custom dialog templates, v2.1 configuration.

Playwright sets `navigator.webdriver` like an unmasked bot, so e2e tests hide it (`tests/e2e/helpers.js`), and the
detection itself is covered by a separate test. First e2e run: `npx playwright install chromium`.

CI (`.github/workflows/test.yml`) runs all tests and fails if the committed `build/` differs from a build of `src/`.

### Configurator

The online configurator lives in `site/` and imports the library from `src/`, so it always matches the current code.
Fields are declared in `site/src/schema.js`, code generation is in `site/src/codegen.js` (covered by unit tests), the
preview is `site/preview.html` in an iframe. A new library option shows up in the configurator with a single schema entry.

On push to `master`, `.github/workflows/pages.yml` builds the configurator and publishes it to GitHub Pages:
https://ak-alz.github.io/pts-lazyload/. The repository must have **Settings → Pages → Source: GitHub Actions** enabled.

```
src/
├── index.js          entry point: styles, PtsLazyLoad / ptsLazyLoad globals
├── PtsLazyLoad.js    check order, counter loading, events
├── Modal.js          confirmation dialog, honeypot, protection and accessibility attributes
├── templates.js      classNames, default dialog part templates, rendering and validation
├── theme.js          theme option → CSS custom properties, animation presets
├── ClickGuard.js     click checks
├── token.js          signed token in cookie and localStorage
├── detect.js         crawlers, automation, search referrer
├── options.js        defaults and v2.x compatibility
├── defaults.js       constants and default values
├── utils.js
└── scss/
    ├── _variables.scss
    └── pts.lazyload.scss
```

Build: Vite in library mode, UMD format (`<script>`, CommonJS, AMD), `target: es2018`. Private class fields are
transpiled, so the script also works in Safari older than 14.5. The version in the banner and `PtsLazyLoad.version`
comes from `package.json`. After changing `src/`, rebuild and commit `build/`: sites take the files from there.

Documentation is maintained in two languages: when changing it, update `README.md` and `README.en.md`, `docs/cms.md` and `docs/cms.en.md`.
