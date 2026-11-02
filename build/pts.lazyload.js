/*!
 * pts-lazyload v3.0.0
 * Отложенная загрузка счётчиков и скриптов до подтверждённого взаимодействия посетителя
 * https://github.com/ak-alz/pts-lazyload
 */
(function(global, factory) {
	typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define([], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, global.PtsLazyLoad = factory());
})(this, function() {
	// src/utils.js
	function isPlainObject(value) {
		if (value === null || typeof value !== "object") return false;
		const proto = Object.getPrototypeOf(value);
		return proto === Object.prototype || proto === null;
	}
	function merge(target, source = {}) {
		const out = {};
		for (const [key, value] of Object.entries(target)) out[key] = isPlainObject(value) ? merge(value) : value;
		for (const [key, value] of Object.entries(source)) {
			if (value === void 0) continue;
			out[key] = isPlainObject(out[key]) && isPlainObject(value) ? merge(out[key], value) : value;
		}
		return out;
	}
	function toPositiveNumber(value, fallback) {
		const number = Number(value);
		return Number.isFinite(number) && number > 0 ? number : fallback;
	}
	var HTML_ENTITIES = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"\"": "&quot;",
		"'": "&#39;"
	};
	var escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => HTML_ENTITIES[ch]);
	function hash(str) {
		let h1 = 3735928559;
		let h2 = 1103547991;
		for (let i = 0; i < str.length; i++) {
			const ch = str.charCodeAt(i);
			h1 = Math.imul(h1 ^ ch, 2654435761);
			h2 = Math.imul(h2 ^ ch, 1597334677);
		}
		h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
		h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
		return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
	}
	function randomId() {
		var _window$crypto;
		if ((_window$crypto = window.crypto) === null || _window$crypto === void 0 ? void 0 : _window$crypto.getRandomValues) {
			const buf = /* @__PURE__ */ new Uint32Array(2);
			window.crypto.getRandomValues(buf);
			return buf[0].toString(36) + buf[1].toString(36);
		}
		return Math.random().toString(36).slice(2) + Date.now().toString(36);
	}
	var now = () => {
		var _window$performance;
		return ((_window$performance = window.performance) === null || _window$performance === void 0 ? void 0 : _window$performance.now) ? performance.now() : Date.now();
	};
	function emit(name, detail = {}) {
		document.dispatchEvent(new CustomEvent(name, { detail }));
	}
	function reviveScript(inert) {
		const script = document.createElement("script");
		for (const { name, value } of inert.attributes) script.setAttribute(name, value);
		if (inert.nonce) script.nonce = inert.nonce;
		if (!inert.hasAttribute("async")) script.async = false;
		script.text = inert.text;
		return script;
	}
	var isBlockingScript = (inert) => inert.hasAttribute("src") && !inert.hasAttribute("async") && !inert.hasAttribute("defer") && inert.type !== "module";
	/**
	* Вставляет код счётчика так, как его выполнил бы браузер при разборе страницы:
	* пока не загрузился внешний скрипт без async, следующие узлы не вставляются.
	* Иначе инициализация («VK.Retargeting.Init()») выполнится раньше загрузки библиотеки.
	*/
	async function insertHtml(source, place) {
		let template = source;
		if (typeof source === "string") {
			template = document.createElement("template");
			template.innerHTML = source;
		}
		const fragment = document.importNode(template.content, true);
		for (const node of [...fragment.childNodes]) {
			if (node.nodeName !== "SCRIPT") {
				var _node$querySelectorAl;
				(_node$querySelectorAl = node.querySelectorAll) === null || _node$querySelectorAl === void 0 || _node$querySelectorAl.call(node, "script").forEach((inert) => inert.replaceWith(reviveScript(inert)));
				place(node);
				continue;
			}
			const script = reviveScript(node);
			if (!isBlockingScript(node)) {
				place(script);
				continue;
			}
			await new Promise((resolve) => {
				script.addEventListener("load", resolve);
				script.addEventListener("error", resolve);
				place(script);
			});
		}
	}
	// src/templates.js
	var CLASS_NAMES = {
		root: "pts-lazyload",
		open: "pts-lazyload--open",
		locked: "pts-lazyload-locked",
		overlay: "pts-lazyload__overlay",
		dialog: "pts-lazyload__dialog",
		title: "pts-lazyload__title",
		body: "pts-lazyload__body",
		text: "pts-lazyload__text",
		actions: "pts-lazyload__actions",
		button: "pts-lazyload__button",
		close: "pts-lazyload__close",
		decline: "pts-lazyload__decline",
		aux: "pts-lazyload__aux"
	};
	/**
	* Части окна. Каждая получает ({classNames, options}, data) и возвращает HTML-строку или Element.
	* Дочерние части (например, button для actions) приходят в data готовыми элементами: шаблон может вставить их сам,
	* указать место через <div data-slot="имя"></div> или ничего не делать — тогда они добавятся в конец.
	*/
	var DEFAULT_TEMPLATES = {
		root: ({ classNames }, { modifiers }) => `<div class="${[classNames.root, ...modifiers.map((mod) => `${classNames.root}--${mod}`)].join(" ")}"></div>`,
		overlay: ({ classNames }) => `<div class="${classNames.overlay}"></div>`,
		dialog: ({ classNames }) => `<div class="${classNames.dialog}"></div>`,
		title: ({ classNames }, { title }) => `<div class="${classNames.title}">${escapeHtml(title)}</div>`,
		body: ({ classNames }, { text, content }) => {
			const el = strToEl(`<div class="${classNames.body}"></div>`);
			if (content instanceof Node) el.append(content);
			else if (content) el.innerHTML = content;
			else el.innerHTML = textToParagraphs(text, classNames.text);
			return el;
		},
		actions: ({ classNames }) => `<div class="${classNames.actions}"></div>`,
		button: ({ classNames }, { text }) => `<button type="button" class="${classNames.button}">${escapeHtml(text)}</button>`,
		decline: ({ classNames }, { text }) => `<button type="button" class="${classNames.decline}">${escapeHtml(text)}</button>`,
		close: ({ classNames }, { label, icon }) => `<button type="button" class="${classNames.close}" aria-label="${escapeHtml(label)}"><span aria-hidden="true">${icon}</span></button>`
	};
	/** Пустая строка в тексте начинает новый абзац, перенос строки внутри абзаца сохраняется. */
	function textToParagraphs(text, className) {
		return String(text !== null && text !== void 0 ? text : "").split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean).map((paragraph) => `<p class="${className}">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`).join("");
	}
	/** modal.content: HTML-строка, элемент или <template> со страницы. Элемент копируется, оригинал остаётся на месте. */
	function resolveContent(content) {
		if (content instanceof HTMLTemplateElement) return document.importNode(content.content, true);
		if (content instanceof Node) return content.cloneNode(true);
		return content ? String(content) : "";
	}
	function strToEl(html) {
		const template = document.createElement("template");
		template.innerHTML = String(html).trim();
		return template.content.firstElementChild;
	}
	function resolveTemplates(custom, helpers) {
		const overrides = typeof custom === "function" ? custom(helpers) : custom;
		if (overrides === null || overrides === void 0) return DEFAULT_TEMPLATES;
		if (typeof overrides !== "object") throw new Error("templates должен быть объектом или функцией, возвращающей объект");
		for (const [name, template] of Object.entries(overrides)) {
			if (!(name in DEFAULT_TEMPLATES)) throw new Error(`неизвестный шаблон «${name}»`);
			if (typeof template !== "function") throw new Error(`шаблон «${name}» должен быть функцией`);
		}
		return {
			...DEFAULT_TEMPLATES,
			...overrides
		};
	}
	function createBuilder(templates, context) {
		return function build(name, data = {}, children = {}) {
			const result = templates[name](context, {
				...data,
				...children
			});
			if (result === null || result === void 0 || result === "") return null;
			const el = typeof result === "string" ? strToEl(result) : result;
			if (!(el instanceof Element)) throw new Error(`шаблон «${name}» должен вернуть HTML-строку или Element`);
			for (const [slot, child] of Object.entries(children)) {
				const placeholder = el.querySelector(`[data-slot="${slot}"]`);
				if (!child) placeholder === null || placeholder === void 0 || placeholder.remove();
				else if (!el.contains(child)) {
					if (placeholder) placeholder.replaceWith(child);
					else el.append(child);
				}
			}
			return el;
		};
	}
	/**
	* Собирает окно из шаблонов. Внешний вид — ответственность шаблонов,
	* поэтому всё, от чего зависит возможность подтвердиться, проверяется здесь.
	*/
	function renderModal(templates, context, { modal, protection, modifiers, closeButton = false, declineButton = false }) {
		const build = createBuilder(templates, context);
		const button = build("button", { text: modal.buttonText });
		const honeypot = protection.honeypot ? build("button", { text: modal.buttonText }) : null;
		const decline = declineButton ? build("decline", { text: modal.declineText }) : null;
		const actions = build("actions", {}, {
			decline,
			button
		});
		const close = closeButton ? build("close", {
			label: modal.closeLabel,
			icon: modal.closeIcon
		}) : null;
		const title = modal.title ? build("title", { title: modal.title }) : null;
		const body = build("body", {
			text: modal.text,
			content: resolveContent(modal.content)
		});
		const dialog = build("dialog", {}, {
			close,
			title,
			body,
			actions
		});
		const overlay = build("overlay");
		const root = build("root", { modifiers }, {
			overlay,
			dialog
		});
		if (!(button instanceof HTMLButtonElement)) throw new Error("шаблон «button» должен вернуть элемент <button>");
		if (!(root === null || root === void 0 ? void 0 : root.contains(button))) throw new Error("кнопка не попала в окно: проверьте, что шаблоны вставляют дочерние элементы");
		if (closeButton && !(close instanceof HTMLButtonElement && dialog.contains(close))) throw new Error("шаблон «close» должен вернуть элемент <button>, и он должен попасть в окно");
		if (declineButton && !(decline instanceof HTMLButtonElement && root.contains(decline))) throw new Error("шаблон «decline» должен вернуть элемент <button>, и он должен попасть в окно");
		return {
			root,
			dialog,
			button,
			close,
			decline,
			honeypot,
			title,
			body
		};
	}
	// src/defaults.js
	var BLOCK = "pts-lazyload";
	var COLOR_SCHEMES = [
		"light",
		"dark",
		"auto"
	];
	var DEFAULTS = {
		counters: [],
		counterSelector: "template[data-pts-lazyload]",
		cookieName: "pts-lazyload-verified",
		cookieTime: 365,
		cookieDomain: "",
		salt: "",
		botBehavior: "skip",
		botUserAgents: [
			"Googlebot",
			"Google-InspectionTool",
			"GoogleOther",
			"Storebot-Google",
			"APIs-Google",
			"AdsBot-Google",
			"Mediapartners-Google",
			"FeedFetcher-Google",
			"YandexBot",
			"YandexMobileBot",
			"YandexDirectDyn",
			"YandexScreenshotBot",
			"YandexImages",
			"YandexVideo",
			"YandexVideoParser",
			"YandexMedia",
			"YandexBlogs",
			"YandexFavicons",
			"YandexWebmaster",
			"YandexPagechecker",
			"YandexImageResizer",
			"YandexAdNet",
			"YandexDirect",
			"YaDirectFetcher",
			"YandexCalendar",
			"YandexSitelinks",
			"YandexMetrika",
			"YandexNews",
			"YandexCatalog",
			"YandexMarket",
			"YandexVertis",
			"YandexForDomain",
			"YandexSpravBot",
			"YandexSearchShop",
			"YandexMedianaBot",
			"YandexOntoDB",
			"YandexOntoDBAPI",
			"YandexVerticals",
			"YandexRenderResourcesBot",
			"YandexAccessibilityBot",
			"YandexAdditional",
			"Mail.RU_Bot",
			"StackRambler",
			"Yahoo! Slurp",
			"bingbot",
			"msnbot",
			"BingPreview",
			"DuckDuckBot",
			"Applebot",
			"Baiduspider",
			"PixelTools",
			"PixelBot"
		],
		skipForSearchVisitors: false,
		searchReferrers: [
			/^https?:\/\/(www\.)?google\.[a-z]{2,3}(\.[a-z]{2})?\//i,
			/^https?:\/\/(www\.)?yandex\.[a-z]{2,3}(\.[a-z]{2})?\//i,
			/^https?:\/\/ya\.ru\//i,
			/^https?:\/\/(www\.)?bing\.com\//i,
			/^https?:\/\/nova\.rambler\.ru\//i,
			/^https?:\/\/go\.mail\.ru\//i
		],
		legacyEvent: true,
		lockScroll: true,
		closeButton: false,
		declineButton: false,
		declineTime: 0,
		closeOnOverlay: false,
		closeOnEscape: false,
		colorScheme: "light",
		autoFocus: true,
		theme: {},
		themeDark: {},
		classNames: CLASS_NAMES,
		templates: null,
		modal: {
			title: "",
			text: "Мы используем файлы cookie, чтобы сайт работал корректно и был удобнее для вас. Продолжая пользоваться сайтом, вы соглашаетесь с их использованием.",
			content: "",
			buttonText: "Принять",
			modifier: "",
			ariaLabel: "Использование файлов cookie",
			closeLabel: "Закрыть",
			closeIcon: "&times;",
			declineText: "Только необходимые"
		},
		protection: {
			minDelay: 1200,
			requirePointerMovement: true,
			rejectCenterClick: true,
			honeypot: true,
			detectWebdriver: true
		},
		intercept: {},
		onShow: null,
		onVerify: null,
		onReject: null,
		onBlock: null,
		onDismiss: null,
		debug: false
	};
	// src/options.js
	function mapLegacy(raw) {
		const legacy = {};
		const warnings = [];
		if (raw.cookie_name !== void 0) {
			legacy.cookieName = raw.cookie_name;
			warnings.push("cookie_name → cookieName");
		}
		if (raw.modalText !== void 0) {
			legacy.modal = { text: raw.modalText };
			warnings.push("modalText → modal.text");
		}
		if (raw.checkInternal !== void 0) warnings.push("checkInternal больше не поддерживается: внутренние переходы без подтверждения не загружают счётчики");
		if (warnings.length) console.warn(`[pts-lazyload] Устаревшие параметры v2.x: ${warnings.join("; ")}`);
		return legacy;
	}
	function normalizeOptions(raw = {}) {
		const options = merge(merge(DEFAULTS, mapLegacy(raw)), raw);
		options.cookieTime = Math.min(toPositiveNumber(options.cookieTime, DEFAULTS.cookieTime), 400);
		options.protection.minDelay = Math.max(0, Number(options.protection.minDelay) || 0);
		options.declineTime = Math.min(Math.max(0, Number(options.declineTime) || 0), 400);
		options.counters = Array.isArray(options.counters) ? options.counters : [];
		const modifiers = String(options.modal.modifier || "").split(/\s+/).filter(Boolean);
		if (modifiers.includes("dark")) {
			if (!raw.colorScheme) options.colorScheme = "dark";
			options.modal.modifier = modifiers.filter((mod) => mod !== "dark").join(" ");
		}
		if (!COLOR_SCHEMES.includes(options.colorScheme)) {
			console.warn(`[pts-lazyload] colorScheme: ожидается ${COLOR_SCHEMES.join(", ")}, получено «${options.colorScheme}»`);
			options.colorScheme = DEFAULTS.colorScheme;
		}
		return options;
	}
	// src/detect.js
	function isSearchBot(userAgents) {
		const ua = (navigator.userAgent || "").toLowerCase();
		return userAgents.some((item) => ua.includes(String(item).toLowerCase()));
	}
	function isAutomation() {
		return navigator.webdriver === true || /HeadlessChrome|PhantomJS|Electron/i.test(navigator.userAgent || "");
	}
	function isFromSearch(rules) {
		const ref = document.referrer || "";
		return rules.some((rule) => rule instanceof RegExp ? rule.test(ref) : ref.startsWith(String(rule)));
	}
	// \0@oxc-project+runtime@0.156.0/helpers/esm/checkPrivateRedeclaration.js
	function _checkPrivateRedeclaration(e, t) {
		if (t.has(e)) throw new TypeError("Cannot initialize the same private elements twice on an object");
	}
	// \0@oxc-project+runtime@0.156.0/helpers/esm/classPrivateMethodInitSpec.js
	function _classPrivateMethodInitSpec(e, a) {
		_checkPrivateRedeclaration(e, a), a.add(e);
	}
	// \0@oxc-project+runtime@0.156.0/helpers/esm/classPrivateFieldInitSpec.js
	function _classPrivateFieldInitSpec(e, t, a) {
		_checkPrivateRedeclaration(e, t), t.set(e, a);
	}
	// \0@oxc-project+runtime@0.156.0/helpers/esm/assertClassBrand.js
	function _assertClassBrand(e, t, n) {
		if ("function" == typeof e ? e === t : e.has(t)) return arguments.length < 3 ? t : n;
		throw new TypeError("Private element is not present on this object");
	}
	// \0@oxc-project+runtime@0.156.0/helpers/esm/classPrivateFieldSet2.js
	function _classPrivateFieldSet2(s, a, r) {
		return s.set(_assertClassBrand(s, a), r), r;
	}
	// \0@oxc-project+runtime@0.156.0/helpers/esm/classPrivateFieldGet2.js
	function _classPrivateFieldGet2(s, a) {
		return s.get(_assertClassBrand(s, a));
	}
	// src/token.js
	function cookieGet(name) {
		for (const pair of document.cookie ? document.cookie.split("; ") : []) {
			const eq = pair.indexOf("=");
			if (eq > -1 && pair.slice(0, eq) === name) try {
				return decodeURIComponent(pair.slice(eq + 1));
			} catch (_unused) {
				return null;
			}
		}
		return null;
	}
	function storageGet(key) {
		try {
			return window.localStorage.getItem(key);
		} catch (_unused2) {
			return null;
		}
	}
	function sessionGet(key) {
		try {
			return window.sessionStorage.getItem(key);
		} catch (_unused3) {
			return null;
		}
	}
	function sessionSet(key, value) {
		try {
			if (value === null) window.sessionStorage.removeItem(key);
			else window.sessionStorage.setItem(key, value);
		} catch (_unused4) {}
	}
	function storageSet(key, value) {
		try {
			window.localStorage.setItem(key, value);
		} catch (_unused5) {}
	}
	/**
	* Соль подписи по умолчанию. С cookieDomain она одна на все поддомены: иначе токен с www.site.ru
	* не прошёл бы проверку подписи на site.ru, хотя cookie видна обоим.
	*/
	function defaultSalt({ salt, cookieDomain } = {}, hostname = location.hostname) {
		if (salt) return salt;
		if (cookieDomain) return String(cookieDomain).trim().replace(/^\./, "").toLowerCase();
		return hostname;
	}
	var _name = /* @__PURE__ */ new WeakMap();
	var _days = /* @__PURE__ */ new WeakMap();
	var _domain = /* @__PURE__ */ new WeakMap();
	var _salt = /* @__PURE__ */ new WeakMap();
	var _TokenStore_brand = /* @__PURE__ */ new WeakSet();
	/**
	* Токен подтверждения: v3.<время выдачи>.<случайное значение>.<подпись>.
	* Хранится в cookie и в localStorage: если одну копию удалили, она восстанавливается из другой.
	*/
	var TokenStore = class {
		constructor({ cookieName, cookieTime, cookieDomain, salt }) {
			_classPrivateMethodInitSpec(this, _TokenStore_brand);
			_classPrivateFieldInitSpec(this, _name, void 0);
			_classPrivateFieldInitSpec(this, _days, void 0);
			_classPrivateFieldInitSpec(this, _domain, void 0);
			_classPrivateFieldInitSpec(this, _salt, void 0);
			_classPrivateFieldSet2(_name, this, cookieName);
			_classPrivateFieldSet2(_days, this, cookieTime);
			_classPrivateFieldSet2(_domain, this, cookieDomain);
			_classPrivateFieldSet2(_salt, this, defaultSalt({
				salt,
				cookieDomain
			}));
		}
		create() {
			const issued = Date.now().toString(36);
			const nonce = randomId();
			return [
				"v3",
				issued,
				nonce,
				_assertClassBrand(_TokenStore_brand, this, _sign).call(this, issued, nonce)
			].join(".");
		}
		isValid(token) {
			if (!token) return false;
			const parts = String(token).split(".");
			if (parts.length !== 4 || parts[0] !== "v3") return false;
			const issued = parseInt(parts[1], 36);
			if (!Number.isFinite(issued)) return false;
			const age = Date.now() - issued;
			if (age < -864e5 || age > _classPrivateFieldGet2(_days, this) * 864e5) return false;
			return parts[3] === _assertClassBrand(_TokenStore_brand, this, _sign).call(this, parts[1], parts[2]);
		}
		read() {
			const fromCookie = cookieGet(_classPrivateFieldGet2(_name, this));
			if (this.isValid(fromCookie)) return fromCookie;
			const fromStorage = storageGet(_classPrivateFieldGet2(_name, this));
			return this.isValid(fromStorage) ? fromStorage : null;
		}
		write(token) {
			_assertClassBrand(_TokenStore_brand, this, _setCookie).call(this, _classPrivateFieldGet2(_name, this), encodeURIComponent(token), _classPrivateFieldGet2(_days, this));
			storageSet(_classPrivateFieldGet2(_name, this), token);
		}
		/**
		* Посетитель отказался от необязательных cookie. Отказ запоминается, чтобы окно не появлялось на каждой странице:
		* days = 0 — до закрытия вкладки (sessionStorage), иначе — на указанное число дней (cookie).
		*/
		decline(days) {
			if (days > 0) _assertClassBrand(_TokenStore_brand, this, _setCookie).call(this, _get_declineKey.call(_assertClassBrand(_TokenStore_brand, this)), "1", days);
			else sessionSet(_get_declineKey.call(_assertClassBrand(_TokenStore_brand, this)), "1");
		}
		isDeclined() {
			return sessionGet(_get_declineKey.call(_assertClassBrand(_TokenStore_brand, this))) === "1" || cookieGet(_get_declineKey.call(_assertClassBrand(_TokenStore_brand, this))) === "1";
		}
		clearDecline() {
			sessionSet(_get_declineKey.call(_assertClassBrand(_TokenStore_brand, this)), null);
			if (cookieGet(_get_declineKey.call(_assertClassBrand(_TokenStore_brand, this))) !== null) _assertClassBrand(_TokenStore_brand, this, _setCookie).call(this, _get_declineKey.call(_assertClassBrand(_TokenStore_brand, this)), "", 0);
		}
		renew(token) {
			const issued = parseInt(token.split(".")[1], 36);
			this.write(Date.now() - issued > 864e5 ? this.create() : token);
		}
	};
	function _sign(issued, nonce) {
		return hash([
			"v3",
			issued,
			nonce,
			_classPrivateFieldGet2(_salt, this),
			_classPrivateFieldGet2(_name, this)
		].join("|"));
	}
	function _setCookie(name, value, days) {
		let cookie = `${name}=${value}; max-age=${Math.round(days * 86400)}; path=/; SameSite=Lax`;
		if (_classPrivateFieldGet2(_domain, this)) cookie += `; domain=${_classPrivateFieldGet2(_domain, this)}`;
		if (location.protocol === "https:") cookie += "; Secure";
		document.cookie = cookie;
	}
	function _get_declineKey() {
		return `${_classPrivateFieldGet2(_name, this)}-declined`;
	}
	// src/theme.js
	var UNITLESS = /* @__PURE__ */ new Set([
		"fontWeight",
		"lineHeight",
		"opacity",
		"zIndex"
	]);
	var ANIMATIONS = {
		"slide-up": "translateY(16px)",
		"slide-down": "translateY(-16px)",
		zoom: "scale(.92)",
		fade: "none",
		none: "none"
	};
	var FLAT_ALIASES = {
		background: "dialog-background",
		text: "dialog-color",
		title: "title-color",
		overlay: "overlay-background",
		radius: "dialog-radius",
		buttonRadius: "button-radius",
		width: "dialog-width",
		padding: "dialog-padding",
		shadow: "dialog-shadow",
		duration: "animation-duration"
	};
	var kebab = (name) => name.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);
	function toCssValue(key, value) {
		if (typeof value !== "number") return String(value);
		if (/duration$/i.test(key)) return `${value}ms`;
		return UNITLESS.has(key) ? String(value) : `${value}px`;
	}
	function animationVars(animation) {
		const config = typeof animation === "string" ? { type: animation } : animation || {};
		const vars = {};
		if (config.type) {
			if (!(config.type in ANIMATIONS)) console.warn(`[pts-lazyload] Неизвестная анимация «${config.type}», доступны: ${Object.keys(ANIMATIONS).join(", ")}`);
			else {
				vars["animation-transform"] = ANIMATIONS[config.type];
				if (config.type === "none") vars["animation-duration"] = "0s";
			}
		}
		if (config.transform) vars["animation-transform"] = config.transform;
		if (config.duration !== void 0) vars["animation-duration"] = typeof config.duration === "number" ? `${config.duration}ms` : String(config.duration);
		if (config.easing) vars["animation-easing"] = config.easing;
		return vars;
	}
	/**
	* Превращает theme в CSS-переменные --pts-lazyload-*.
	* {accent: '#f00'} → --pts-lazyload-accent, {button: {fontSize: 18}} → --pts-lazyload-button-font-size: 18px.
	* Переменные ставятся на корневой элемент окна, поэтому их можно задавать и обычным CSS.
	*/
	function themeToCssVars(theme) {
		const vars = {};
		const put = (name, key, value) => {
			if (value === null || value === void 0 || value === "") return;
			vars[name] = toCssValue(key, value);
		};
		for (const [key, value] of Object.entries(theme || {})) {
			if (key === "breakpoints") continue;
			if (key === "animation") Object.assign(vars, animationVars(value));
			else if (isPlainObject(value)) for (const [prop, propValue] of Object.entries(value)) put(`${kebab(key)}-${kebab(prop)}`, prop, propValue);
			else {
				const name = key.replace(/^--pts-lazyload-/, "");
				put(FLAT_ALIASES[name] || kebab(name), name, value);
			}
		}
		return Object.fromEntries(Object.entries(vars).map(([name, value]) => [`--${BLOCK}-${name}`, value]));
	}
	/** Ключ брейкпоинта: число — «экран до N px включительно», строка — медиазапрос как есть. */
	function toMediaQuery(key) {
		return /^\d+$/.test(String(key).trim()) ? `(max-width: ${String(key).trim()}px)` : String(key);
	}
	/**
	* Брейкпоинты темы в порядке применения. Числовые — от широкого к узкому, чтобы на маленьком экране
	* значения для меньшей ширины перекрывали значения для большей. Медиазапросы-строки — в порядке объявления, после числовых.
	*/
	function breakpointsOf(theme) {
		const entries = Object.entries((theme === null || theme === void 0 ? void 0 : theme.breakpoints) || {});
		const numeric = entries.filter(([key]) => /^\d+$/.test(key.trim())).sort(([a], [b]) => Number(b) - Number(a));
		const queries = entries.filter(([key]) => !/^\d+$/.test(key.trim()));
		return [...numeric, ...queries].map(([key, value]) => [toMediaQuery(key), value]);
	}
	/** CSS-переменные темы для текущего экрана: базовые значения и поверх них подходящие брейкпоинты. */
	function themeVarsFor(theme, matches = (query) => {
		var _window$matchMedia, _window;
		return !!((_window$matchMedia = (_window = window).matchMedia) === null || _window$matchMedia === void 0 ? void 0 : _window$matchMedia.call(_window, query).matches);
	}) {
		const vars = themeToCssVars(theme);
		for (const [query, part] of breakpointsOf(theme)) if (matches(query)) Object.assign(vars, themeToCssVars(part));
		return vars;
	}
	// src/ClickGuard.js
	/**
	* Область, клик по которой подтверждает посетителя: кнопка, крестик или оверлей.
	* contains(node) — попадает ли узел в область, rect() — её границы для проверки клика в центр.
	*/
	var zoneOf = (el) => ({
		contains: (node) => el.contains(node),
		rect: () => el.getBoundingClientRect()
	});
	var _rules = /* @__PURE__ */ new WeakMap();
	var _shownAt = /* @__PURE__ */ new WeakMap();
	var _pointerMoves = /* @__PURE__ */ new WeakMap();
	var _pointerType = /* @__PURE__ */ new WeakMap();
	var _touched = /* @__PURE__ */ new WeakMap();
	var _pressedTarget = /* @__PURE__ */ new WeakMap();
	var _trapped = /* @__PURE__ */ new WeakMap();
	var _ClickGuard_brand = /* @__PURE__ */ new WeakSet();
	/**
	* Решает, совершил ли действие человек. Методы check*() возвращают null, если действие засчитано,
	* или причину отказа. Отклонённое действие просто игнорируется: человек повторит его.
	*/
	var ClickGuard = class {
		constructor(rules) {
			_classPrivateMethodInitSpec(this, _ClickGuard_brand);
			_classPrivateFieldInitSpec(this, _rules, void 0);
			_classPrivateFieldInitSpec(this, _shownAt, 0);
			_classPrivateFieldInitSpec(this, _pointerMoves, 0);
			_classPrivateFieldInitSpec(this, _pointerType, "");
			_classPrivateFieldInitSpec(this, _touched, false);
			_classPrivateFieldInitSpec(this, _pressedTarget, null);
			_classPrivateFieldInitSpec(this, _trapped, false);
			_classPrivateFieldSet2(_rules, this, rules);
		}
		start() {
			_classPrivateFieldSet2(_shownAt, this, now());
		}
		trap() {
			_classPrivateFieldSet2(_trapped, this, true);
		}
		onPointerMove(event) {
			var _this$pointerMoves;
			if (event.isTrusted) _classPrivateFieldSet2(_pointerMoves, this, (_this$pointerMoves = _classPrivateFieldGet2(_pointerMoves, this), _this$pointerMoves++, _this$pointerMoves));
		}
		onPointerDown(event) {
			if (!event.isTrusted) return;
			if (event.type === "touchstart") _classPrivateFieldSet2(_touched, this, true);
			_classPrivateFieldSet2(_pointerType, this, event.pointerType || (_classPrivateFieldGet2(_touched, this) ? "touch" : "mouse"));
			_classPrivateFieldSet2(_pressedTarget, this, event.target);
		}
		/** Клик по области (кнопке, крестику, оверлею). */
		check(event, zone) {
			const reason = _assertClassBrand(_ClickGuard_brand, this, _clickReason).call(this, event, zone);
			_classPrivateFieldSet2(_pressedTarget, this, null);
			return reason;
		}
		/** Нажатие Escape. */
		checkEscape(event) {
			return _assertClassBrand(_ClickGuard_brand, this, _commonReason).call(this, event);
		}
	};
	function _commonReason(event) {
		if (_classPrivateFieldGet2(_trapped, this)) return "honeypot";
		if (!event.isTrusted) return "untrusted";
		if (now() - _classPrivateFieldGet2(_shownAt, this) < _classPrivateFieldGet2(_rules, this).minDelay) return "too-fast";
		return null;
	}
	function _clickReason(event, zone) {
		const common = _assertClassBrand(_ClickGuard_brand, this, _commonReason).call(this, event);
		if (common) return common;
		if (event.detail === 0 && !_classPrivateFieldGet2(_pressedTarget, this)) return null;
		if (!_classPrivateFieldGet2(_pressedTarget, this) || !zone.contains(_classPrivateFieldGet2(_pressedTarget, this))) return "no-pointerdown";
		if (_classPrivateFieldGet2(_pointerType, this) !== "mouse") return null;
		if (_classPrivateFieldGet2(_rules, this).requirePointerMovement && _classPrivateFieldGet2(_pointerMoves, this) < 3) return "no-movement";
		if (_classPrivateFieldGet2(_rules, this).rejectCenterClick) {
			const rect = zone.rect();
			const dx = Math.abs(event.clientX - (rect.left + rect.width / 2));
			const dy = Math.abs(event.clientY - (rect.top + rect.height / 2));
			if (dx <= 1 && dy <= 1) return "center-click";
		}
		return null;
	}
	// src/Modal.js
	var CONFIRM_REASON = {
		button: "click",
		close: "close",
		overlay: "overlay",
		escape: "escape"
	};
	var FOCUSABLE = "a[href], button, input, select, textarea, [tabindex]:not([tabindex=\"-1\"])";
	var DARK_QUERY = "(prefers-color-scheme: dark)";
	var COLOR_VAR = /-(background|color|border|shadow)(-|$)/;
	var SHARED_VAR = new RegExp(`^--${BLOCK}-(accent|button-)`);
	var isLightOnly = (name) => COLOR_VAR.test(name) && !SHARED_VAR.test(name);
	var _options$1 = /* @__PURE__ */ new WeakMap();
	var _classNames = /* @__PURE__ */ new WeakMap();
	var _onConfirm = /* @__PURE__ */ new WeakMap();
	var _onReject = /* @__PURE__ */ new WeakMap();
	var _onDismiss = /* @__PURE__ */ new WeakMap();
	var _settled = /* @__PURE__ */ new WeakMap();
	var _root = /* @__PURE__ */ new WeakMap();
	var _dialog = /* @__PURE__ */ new WeakMap();
	var _button = /* @__PURE__ */ new WeakMap();
	var _close = /* @__PURE__ */ new WeakMap();
	var _decline = /* @__PURE__ */ new WeakMap();
	var _honeypot = /* @__PURE__ */ new WeakMap();
	var _guard = /* @__PURE__ */ new WeakMap();
	var _listeners = /* @__PURE__ */ new WeakMap();
	var _colorScheme = /* @__PURE__ */ new WeakMap();
	var _appliedVars = /* @__PURE__ */ new WeakMap();
	var _returnFocus = /* @__PURE__ */ new WeakMap();
	var _Modal_brand = /* @__PURE__ */ new WeakSet();
	var Modal = class {
		constructor(options, { onConfirm, onReject, onDismiss }) {
			_classPrivateMethodInitSpec(this, _Modal_brand);
			_classPrivateFieldInitSpec(this, _options$1, void 0);
			_classPrivateFieldInitSpec(this, _classNames, void 0);
			_classPrivateFieldInitSpec(this, _onConfirm, void 0);
			_classPrivateFieldInitSpec(this, _onReject, void 0);
			_classPrivateFieldInitSpec(this, _onDismiss, void 0);
			_classPrivateFieldInitSpec(this, _settled, false);
			_classPrivateFieldInitSpec(this, _root, null);
			_classPrivateFieldInitSpec(this, _dialog, null);
			_classPrivateFieldInitSpec(this, _button, null);
			_classPrivateFieldInitSpec(this, _close, null);
			_classPrivateFieldInitSpec(this, _decline, null);
			_classPrivateFieldInitSpec(this, _honeypot, null);
			_classPrivateFieldInitSpec(this, _guard, null);
			_classPrivateFieldInitSpec(this, _listeners, []);
			_classPrivateFieldInitSpec(this, _colorScheme, void 0);
			_classPrivateFieldInitSpec(this, _appliedVars, []);
			_classPrivateFieldInitSpec(this, _returnFocus, null);
			_classPrivateFieldSet2(_options$1, this, options);
			_classPrivateFieldSet2(_colorScheme, this, options.colorScheme);
			_classPrivateFieldSet2(_classNames, this, options.classNames);
			_classPrivateFieldSet2(_onConfirm, this, onConfirm);
			_classPrivateFieldSet2(_onReject, this, onReject);
			_classPrivateFieldSet2(_onDismiss, this, onDismiss);
		}
		open() {
			_classPrivateFieldSet2(_returnFocus, this, document.activeElement !== document.body ? document.activeElement : null);
			_assertClassBrand(_Modal_brand, this, _render).call(this);
			document.body.appendChild(_classPrivateFieldGet2(_root, this));
			_assertClassBrand(_Modal_brand, this, _bind).call(this);
			if (_classPrivateFieldGet2(_options$1, this).lockScroll) document.documentElement.classList.add(_classPrivateFieldGet2(_classNames, this).locked);
			const pristine = `${_classPrivateFieldGet2(_classNames, this).root}--pristine`;
			_classPrivateFieldGet2(_root, this).classList.add(pristine);
			_assertClassBrand(_Modal_brand, this, _listen).call(this, document, "keydown", () => {
				var _classPrivateFieldGet2$2;
				return (_classPrivateFieldGet2$2 = _classPrivateFieldGet2(_root, this)) === null || _classPrivateFieldGet2$2 === void 0 ? void 0 : _classPrivateFieldGet2$2.classList.remove(pristine);
			}, {
				capture: true,
				once: true
			});
			_classPrivateFieldGet2(_root, this).offsetWidth;
			_classPrivateFieldGet2(_root, this).classList.add(_classPrivateFieldGet2(_classNames, this).open);
			_classPrivateFieldGet2(_guard, this).start();
			if (_classPrivateFieldGet2(_options$1, this).autoFocus) try {
				_classPrivateFieldGet2(_button, this).focus({ preventScroll: true });
			} catch (_unused) {
				_classPrivateFieldGet2(_button, this).focus();
			}
		}
		setColorScheme(scheme) {
			_classPrivateFieldSet2(_colorScheme, this, scheme);
			if (_classPrivateFieldGet2(_root, this)) _assertClassBrand(_Modal_brand, this, _applyColorScheme).call(this);
		}
		close() {
			var _classPrivateFieldGet3;
			_assertClassBrand(_Modal_brand, this, _unbind).call(this);
			const root = _classPrivateFieldGet2(_root, this);
			if (!root) return;
			_classPrivateFieldSet2(_root, this, null);
			document.documentElement.classList.remove(_classPrivateFieldGet2(_classNames, this).locked);
			root.classList.remove(_classPrivateFieldGet2(_classNames, this).open);
			if (root.contains(document.activeElement) && ((_classPrivateFieldGet3 = _classPrivateFieldGet2(_returnFocus, this)) === null || _classPrivateFieldGet3 === void 0 ? void 0 : _classPrivateFieldGet3.isConnected)) _classPrivateFieldGet2(_returnFocus, this).focus({ preventScroll: true });
			_classPrivateFieldSet2(_returnFocus, this, null);
			setTimeout(() => root.remove(), transitionTime(root) + 50);
		}
	};
	function _get_isModal() {
		return !String(_classPrivateFieldGet2(_options$1, this).modal.modifier || "").split(/\s+/).includes("bottom");
	}
	function _isDark() {
		var _window$matchMedia, _window;
		if (_classPrivateFieldGet2(_colorScheme, this) === "auto") return !!((_window$matchMedia = (_window = window).matchMedia) === null || _window$matchMedia === void 0 ? void 0 : _window$matchMedia.call(_window, DARK_QUERY).matches);
		return _classPrivateFieldGet2(_colorScheme, this) === "dark";
	}
	function _applyColorScheme() {
		const root = _classPrivateFieldGet2(_root, this);
		const dark = _assertClassBrand(_Modal_brand, this, _isDark).call(this);
		root.classList.toggle(`${_classPrivateFieldGet2(_classNames, this).root}--dark`, dark);
		const vars = themeVarsFor(_classPrivateFieldGet2(_options$1, this).theme);
		if (dark) {
			for (const name of Object.keys(vars)) if (isLightOnly(name)) delete vars[name];
			Object.assign(vars, themeVarsFor(_classPrivateFieldGet2(_options$1, this).themeDark));
		}
		for (const name of _classPrivateFieldGet2(_appliedVars, this)) root.style.removeProperty(name);
		for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
		_classPrivateFieldSet2(_appliedVars, this, Object.keys(vars));
	}
	function _render() {
		const options = _classPrivateFieldGet2(_options$1, this);
		const context = {
			classNames: _classPrivateFieldGet2(_classNames, this),
			options
		};
		const params = {
			modal: options.modal,
			protection: options.protection,
			modifiers: String(options.modal.modifier || "").split(/\s+/).filter(Boolean),
			closeButton: options.closeButton,
			declineButton: options.declineButton
		};
		let parts;
		try {
			parts = renderModal(resolveTemplates(options.templates, {
				strToEl,
				escape: escapeHtml,
				classNames: _classPrivateFieldGet2(_classNames, this)
			}), context, params);
		} catch (error) {
			console.error("[pts-lazyload] Ошибка в шаблонах окна, используется окно по умолчанию:", error);
			parts = renderModal(DEFAULT_TEMPLATES, context, params);
		}
		_assertClassBrand(_Modal_brand, this, _secure).call(this, parts);
		_classPrivateFieldSet2(_root, this, parts.root);
		_assertClassBrand(_Modal_brand, this, _applyColorScheme).call(this);
		_classPrivateFieldSet2(_dialog, this, parts.dialog);
		_classPrivateFieldSet2(_button, this, parts.button);
		_classPrivateFieldSet2(_close, this, parts.close);
		_classPrivateFieldSet2(_decline, this, parts.decline);
		_classPrivateFieldSet2(_honeypot, this, parts.honeypot);
		_classPrivateFieldSet2(_guard, this, new ClickGuard(options.protection));
	}
	function _secure({ root, button, close, decline, honeypot, title, body }) {
		const id = `${BLOCK}-${randomId()}`;
		root.setAttribute("role", "dialog");
		if (_get_isModal.call(_assertClassBrand(_Modal_brand, this))) root.setAttribute("aria-modal", "true");
		if (title) {
			title.id = `${id}-title`;
			root.setAttribute("aria-labelledby", title.id);
		} else root.setAttribute("aria-label", _classPrivateFieldGet2(_options$1, this).modal.ariaLabel);
		if (body) {
			body.id || (body.id = `${id}-body`);
			root.setAttribute("aria-describedby", body.id);
		}
		button.type = "button";
		if (decline) {
			decline.type = "button";
			root.classList.add(`${_classPrivateFieldGet2(_classNames, this).root}--with-decline`);
		}
		if (close) {
			close.type = "button";
			if (!close.hasAttribute("aria-label")) close.setAttribute("aria-label", _classPrivateFieldGet2(_options$1, this).modal.closeLabel);
		}
		if (honeypot) {
			const aux = document.createElement("div");
			aux.className = _classPrivateFieldGet2(_classNames, this).aux;
			aux.setAttribute("aria-hidden", "true");
			honeypot.type = "button";
			honeypot.tabIndex = -1;
			aux.appendChild(honeypot);
			button.before(aux);
		}
	}
	/**
	* Действие прошло проверку на бота. Если для него задан перехватчик, решение за ним:
	* next() — подтвердить, ctx.dismiss() — закрыть окно без подтверждения, ничего — оставить окно открытым.
	*/
	function _accept(action, event) {
		var _classPrivateFieldGet4;
		if (_classPrivateFieldGet2(_settled, this)) return;
		const dismiss = () => {
			if (_classPrivateFieldGet2(_settled, this)) return;
			_classPrivateFieldSet2(_settled, this, true);
			_classPrivateFieldGet2(_onDismiss, this).call(this, action);
		};
		const next = action === "decline" ? dismiss : () => {
			if (_classPrivateFieldGet2(_settled, this)) return;
			_classPrivateFieldSet2(_settled, this, true);
			_classPrivateFieldGet2(_onConfirm, this).call(this, CONFIRM_REASON[action]);
		};
		const interceptor = (_classPrivateFieldGet4 = _classPrivateFieldGet2(_options$1, this).intercept) === null || _classPrivateFieldGet4 === void 0 ? void 0 : _classPrivateFieldGet4[action];
		if (typeof interceptor !== "function") {
			next();
			return;
		}
		try {
			interceptor({
				action,
				event,
				dismiss
			}, next);
		} catch (error) {
			console.error(`[pts-lazyload] Ошибка в intercept.${action}, действие выполнено по умолчанию:`, error);
			next();
		}
	}
	function _bind() {
		var _window$matchMedia2, _window2;
		const guard = _classPrivateFieldGet2(_guard, this);
		const hasPointerEvents = "onpointerdown" in window;
		const media = (_window$matchMedia2 = (_window2 = window).matchMedia) === null || _window$matchMedia2 === void 0 ? void 0 : _window$matchMedia2.call(_window2, DARK_QUERY);
		if (media === null || media === void 0 ? void 0 : media.addEventListener) _assertClassBrand(_Modal_brand, this, _listen).call(this, media, "change", () => _classPrivateFieldGet2(_colorScheme, this) === "auto" && _assertClassBrand(_Modal_brand, this, _applyColorScheme).call(this));
		const queries = new Set([...breakpointsOf(_classPrivateFieldGet2(_options$1, this).theme), ...breakpointsOf(_classPrivateFieldGet2(_options$1, this).themeDark)].map(([query]) => query));
		for (const query of queries) {
			var _window$matchMedia3, _window3;
			const list = (_window$matchMedia3 = (_window3 = window).matchMedia) === null || _window$matchMedia3 === void 0 ? void 0 : _window$matchMedia3.call(_window3, query);
			if (list === null || list === void 0 ? void 0 : list.addEventListener) _assertClassBrand(_Modal_brand, this, _listen).call(this, list, "change", () => _assertClassBrand(_Modal_brand, this, _applyColorScheme).call(this));
		}
		_assertClassBrand(_Modal_brand, this, _listen).call(this, document, hasPointerEvents ? "pointermove" : "mousemove", (e) => guard.onPointerMove(e), { passive: true });
		_assertClassBrand(_Modal_brand, this, _listen).call(this, document, hasPointerEvents ? "pointerdown" : "mousedown", (e) => guard.onPointerDown(e), true);
		if (!hasPointerEvents) _assertClassBrand(_Modal_brand, this, _listen).call(this, document, "touchstart", (e) => guard.onPointerDown(e), {
			passive: true,
			capture: true
		});
		if (_get_isModal.call(_assertClassBrand(_Modal_brand, this))) _assertClassBrand(_Modal_brand, this, _listen).call(this, document, "keydown", (e) => e.key === "Tab" && _assertClassBrand(_Modal_brand, this, _trapFocus).call(this, e), true);
		const verify = (reason, action, event) => reason ? _classPrivateFieldGet2(_onReject, this).call(this, reason) : _assertClassBrand(_Modal_brand, this, _accept).call(this, action, event);
		_assertClassBrand(_Modal_brand, this, _listen).call(this, _classPrivateFieldGet2(_button, this), "click", (e) => verify(guard.check(e, zoneOf(_classPrivateFieldGet2(_button, this))), "button", e));
		if (_classPrivateFieldGet2(_close, this)) _assertClassBrand(_Modal_brand, this, _listen).call(this, _classPrivateFieldGet2(_close, this), "click", (e) => verify(guard.check(e, zoneOf(_classPrivateFieldGet2(_close, this))), "close", e));
		if (_classPrivateFieldGet2(_decline, this)) _assertClassBrand(_Modal_brand, this, _listen).call(this, _classPrivateFieldGet2(_decline, this), "click", (e) => _assertClassBrand(_Modal_brand, this, _accept).call(this, "decline", e));
		if (_classPrivateFieldGet2(_options$1, this).closeOnOverlay) {
			const root = _classPrivateFieldGet2(_root, this);
			const dialog = _classPrivateFieldGet2(_dialog, this);
			const overlay = {
				contains: (node) => root.contains(node) && !dialog.contains(node),
				rect: () => root.getBoundingClientRect()
			};
			_assertClassBrand(_Modal_brand, this, _listen).call(this, root, "click", (e) => {
				if (!dialog.contains(e.target)) verify(guard.check(e, overlay), "overlay", e);
			});
		}
		if (_classPrivateFieldGet2(_options$1, this).closeOnEscape) _assertClassBrand(_Modal_brand, this, _listen).call(this, document, "keydown", (e) => {
			if (e.key === "Escape") verify(guard.checkEscape(e), "escape", e);
		});
		if (_classPrivateFieldGet2(_honeypot, this)) _assertClassBrand(_Modal_brand, this, _listen).call(this, _classPrivateFieldGet2(_honeypot, this), "click", () => {
			guard.trap();
			_classPrivateFieldGet2(_onReject, this).call(this, "honeypot");
		});
	}
	function _trapFocus(event) {
		const focusable = [..._classPrivateFieldGet2(_root, this).querySelectorAll(FOCUSABLE)].filter((el) => !el.closest(`.${_classPrivateFieldGet2(_classNames, this).aux}`) && !el.disabled);
		if (!focusable.length) return;
		const index = focusable.indexOf(document.activeElement);
		const next = event.shiftKey ? focusable[(index <= 0 ? focusable.length : index) - 1] : focusable[(index + 1) % focusable.length];
		event.preventDefault();
		next.focus();
	}
	function _listen(target, type, handler, options = false) {
		target.addEventListener(type, handler, options);
		_classPrivateFieldGet2(_listeners, this).push(() => target.removeEventListener(type, handler, options));
	}
	function _unbind() {
		_classPrivateFieldGet2(_listeners, this).forEach((remove) => remove());
		_classPrivateFieldSet2(_listeners, this, []);
	}
	function transitionTime(el) {
		const style = getComputedStyle(el);
		const toMs = (value) => (value.endsWith("ms") ? parseFloat(value) : parseFloat(value) * 1e3) || 0;
		const durations = style.transitionDuration.split(",").map(toMs);
		const delays = style.transitionDelay.split(",").map(toMs);
		return Math.max(0, ...durations.map((duration, i) => duration + (delays[i] || 0)));
	}
	// \0@oxc-project+runtime@0.156.0/helpers/esm/typeof.js
	function _typeof(o) {
		"@babel/helpers - typeof";
		return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o) {
			return typeof o;
		} : function(o) {
			return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o;
		}, _typeof(o);
	}
	// \0@oxc-project+runtime@0.156.0/helpers/esm/toPrimitive.js
	function toPrimitive(t, r) {
		if ("object" != _typeof(t) || !t) return t;
		var e = t[Symbol.toPrimitive];
		if (void 0 !== e) {
			var i = e.call(t, r || "default");
			if ("object" != _typeof(i)) return i;
			throw new TypeError("@@toPrimitive must return a primitive value.");
		}
		return ("string" === r ? String : Number)(t);
	}
	// \0@oxc-project+runtime@0.156.0/helpers/esm/toPropertyKey.js
	function toPropertyKey(t) {
		var i = toPrimitive(t, "string");
		return "symbol" == _typeof(i) ? i : i + "";
	}
	// \0@oxc-project+runtime@0.156.0/helpers/esm/defineProperty.js
	function _defineProperty(e, r, t) {
		return (r = toPropertyKey(r)) in e ? Object.defineProperty(e, r, {
			value: t,
			enumerable: !0,
			configurable: !0,
			writable: !0
		}) : e[r] = t, e;
	}
	// src/PtsLazyLoad.js
	var _options = /* @__PURE__ */ new WeakMap();
	var _token = /* @__PURE__ */ new WeakMap();
	var _modal = /* @__PURE__ */ new WeakMap();
	var _started = /* @__PURE__ */ new WeakMap();
	var _loaded = /* @__PURE__ */ new WeakMap();
	var _queue = /* @__PURE__ */ new WeakMap();
	var _PtsLazyLoad_brand = /* @__PURE__ */ new WeakSet();
	var PtsLazyLoad = class {
		constructor(options) {
			_classPrivateMethodInitSpec(this, _PtsLazyLoad_brand);
			_classPrivateFieldInitSpec(this, _options, void 0);
			_classPrivateFieldInitSpec(this, _token, void 0);
			_classPrivateFieldInitSpec(this, _modal, null);
			_classPrivateFieldInitSpec(this, _started, false);
			_classPrivateFieldInitSpec(this, _loaded, false);
			_classPrivateFieldInitSpec(this, _queue, Promise.resolve());
			_classPrivateFieldSet2(_options, this, normalizeOptions(options));
			_classPrivateFieldSet2(_token, this, new TokenStore(_classPrivateFieldGet2(_options, this)));
		}
		/**
		* @param {boolean|number} [needCheck=true] 0/false — проверка не нужна (например, авторизованный пользователь)
		*/
		init(needCheck) {
			if (_classPrivateFieldGet2(_started, this)) return this;
			_classPrivateFieldSet2(_started, this, true);
			if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => _assertClassBrand(_PtsLazyLoad_brand, this, _run).call(this, needCheck), { once: true });
			else _assertClassBrand(_PtsLazyLoad_brand, this, _run).call(this, needCheck);
			return this;
		}
		/**
		* Сменить тему окна: 'light', 'dark' или 'auto' (как в системе посетителя).
		* Подходит для сайтов со своим переключателем темы: вызывайте при каждом переключении.
		*/
		setColorScheme(scheme) {
			var _classPrivateFieldGet2$1;
			if (!COLOR_SCHEMES.includes(scheme)) {
				console.warn(`[pts-lazyload] colorScheme: ожидается ${COLOR_SCHEMES.join(", ")}, получено «${scheme}»`);
				return this;
			}
			_classPrivateFieldGet2(_options, this).colorScheme = scheme;
			(_classPrivateFieldGet2$1 = _classPrivateFieldGet2(_modal, this)) === null || _classPrivateFieldGet2$1 === void 0 || _classPrivateFieldGet2$1.setColorScheme(scheme);
			return this;
		}
		/**
		* Показать окно ещё раз, например по ссылке «Настройки cookie» в футере: посетитель, отказавшийся
		* от необязательных cookie, может передумать. Если счётчики уже загружены или окно открыто, ничего не делает.
		*/
		show() {
			const open = () => {
				if (_classPrivateFieldGet2(_loaded, this) || _classPrivateFieldGet2(_modal, this)) return;
				_assertClassBrand(_PtsLazyLoad_brand, this, _showModal).call(this);
			};
			if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", open, { once: true });
			else open();
			return this;
		}
		destroy() {
			var _classPrivateFieldGet3;
			(_classPrivateFieldGet3 = _classPrivateFieldGet2(_modal, this)) === null || _classPrivateFieldGet3 === void 0 || _classPrivateFieldGet3.close();
			_classPrivateFieldSet2(_modal, this, null);
		}
	};
	function _run(needCheck) {
		const options = _classPrivateFieldGet2(_options, this);
		if (needCheck !== void 0 && !Number(needCheck)) {
			_assertClassBrand(_PtsLazyLoad_brand, this, _load).call(this, "no-check");
			return;
		}
		if (options.protection.detectWebdriver && isAutomation()) {
			_assertClassBrand(_PtsLazyLoad_brand, this, _block).call(this, "automation");
			return;
		}
		if (isSearchBot(options.botUserAgents)) {
			if (options.botBehavior === "load") _assertClassBrand(_PtsLazyLoad_brand, this, _load).call(this, "search-bot");
			else _assertClassBrand(_PtsLazyLoad_brand, this, _block).call(this, "search-bot");
			return;
		}
		const token = _classPrivateFieldGet2(_token, this).read();
		if (token) {
			_classPrivateFieldGet2(_token, this).renew(token);
			_assertClassBrand(_PtsLazyLoad_brand, this, _load).call(this, "token");
			return;
		}
		if (_classPrivateFieldGet2(_token, this).isDeclined()) {
			_assertClassBrand(_PtsLazyLoad_brand, this, _block).call(this, "declined");
			return;
		}
		if (options.skipForSearchVisitors && isFromSearch(options.searchReferrers)) {
			_assertClassBrand(_PtsLazyLoad_brand, this, _load).call(this, "search-referrer");
			return;
		}
		_assertClassBrand(_PtsLazyLoad_brand, this, _showModal).call(this);
	}
	function _showModal() {
		if (_classPrivateFieldGet2(_modal, this)) return;
		_classPrivateFieldSet2(_modal, this, new Modal(_classPrivateFieldGet2(_options, this), {
			onConfirm: (reason) => {
				_classPrivateFieldGet2(_token, this).clearDecline();
				_classPrivateFieldGet2(_token, this).write(_classPrivateFieldGet2(_token, this).create());
				this.destroy();
				_assertClassBrand(_PtsLazyLoad_brand, this, _load).call(this, reason);
			},
			onDismiss: (action) => {
				if (action === "decline") _classPrivateFieldGet2(_token, this).decline(_classPrivateFieldGet2(_options, this).declineTime);
				this.destroy();
				_assertClassBrand(_PtsLazyLoad_brand, this, _log).call(this, "окно закрыто без подтверждения:", action);
				_assertClassBrand(_PtsLazyLoad_brand, this, _notify).call(this, "dismiss", _classPrivateFieldGet2(_options, this).onDismiss, { reason: action });
			},
			onReject: (reason) => {
				_assertClassBrand(_PtsLazyLoad_brand, this, _log).call(this, "клик отклонён:", reason);
				_assertClassBrand(_PtsLazyLoad_brand, this, _notify).call(this, "reject", _classPrivateFieldGet2(_options, this).onReject, { reason });
			}
		}));
		_classPrivateFieldGet2(_modal, this).open();
		_assertClassBrand(_PtsLazyLoad_brand, this, _notify).call(this, "show", _classPrivateFieldGet2(_options, this).onShow, {});
	}
	function _load(reason) {
		if (_classPrivateFieldGet2(_loaded, this)) return;
		_classPrivateFieldSet2(_loaded, this, true);
		_assertClassBrand(_PtsLazyLoad_brand, this, _log).call(this, "загрузка счётчиков, причина:", reason);
		this.destroy();
		if (_classPrivateFieldGet2(_options, this).counterSelector) document.querySelectorAll(_classPrivateFieldGet2(_options, this).counterSelector).forEach((template) => {
			const area = template.dataset.area && _assertClassBrand(_PtsLazyLoad_brand, this, _query).call(this, template.dataset.area, "data-area");
			if (area) {
				_assertClassBrand(_PtsLazyLoad_brand, this, _insert).call(this, template, (node) => area.appendChild(node));
				return;
			}
			const marker = document.createTextNode("");
			template.after(marker);
			_assertClassBrand(_PtsLazyLoad_brand, this, _insert).call(this, template, (node) => marker.before(node));
		});
		_classPrivateFieldGet2(_options, this).counters.forEach((counter) => {
			if (!(counter === null || counter === void 0 ? void 0 : counter.html)) return;
			const area = counter.area && _assertClassBrand(_PtsLazyLoad_brand, this, _query).call(this, counter.area, "counters[].area") || document.head;
			_assertClassBrand(_PtsLazyLoad_brand, this, _insert).call(this, counter.html, (node) => area.appendChild(node));
		});
		const detail = { reason };
		_assertClassBrand(_PtsLazyLoad_brand, this, _notify).call(this, "verified", _classPrivateFieldGet2(_options, this).onVerify, detail);
		if (_classPrivateFieldGet2(_options, this).legacyEvent) emit("ptz-click", detail);
	}
	function _insert(source, place) {
		_classPrivateFieldSet2(_queue, this, _classPrivateFieldGet2(_queue, this).then(() => insertHtml(source, place)).catch((error) => console.error("[pts-lazyload] Ошибка вставки счётчика", source, error)));
	}
	function _query(selector, name) {
		try {
			return document.querySelector(selector);
		} catch (_unused) {
			console.warn(`[pts-lazyload] Некорректный селектор в ${name}: «${selector}», код вставлен в место по умолчанию`);
			return null;
		}
	}
	function _block(reason) {
		_assertClassBrand(_PtsLazyLoad_brand, this, _log).call(this, "счётчики не загружены, причина:", reason);
		_assertClassBrand(_PtsLazyLoad_brand, this, _notify).call(this, "blocked", _classPrivateFieldGet2(_options, this).onBlock, { reason });
	}
	function _notify(name, callback, detail) {
		emit(`pts-lazyload:${name}`, detail);
		if (typeof callback !== "function") return;
		try {
			callback(detail);
		} catch (error) {
			console.error(error);
		}
	}
	function _log(...args) {
		if (_classPrivateFieldGet2(_options, this).debug) console.log("[pts-lazyload]", ...args);
	}
	_defineProperty(PtsLazyLoad, "version", "3.0.0");
	_defineProperty(PtsLazyLoad, "defaults", DEFAULTS);
	// src/index.js
	if (typeof window !== "undefined") {
		window.PtsLazyLoad = PtsLazyLoad;
		window.ptsLazyLoad = PtsLazyLoad;
	}
	return PtsLazyLoad;
});
