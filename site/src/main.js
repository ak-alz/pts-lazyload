import {DEFAULT_STATE, FIELDS, HTML_EXAMPLE, PRESETS, SECTIONS, isVisible} from './schema.js';
import {buildOptions, buildSnippet, initCall} from './codegen.js';
import {isGaId, isMetrikaId} from './counters.js';

const STORAGE_KEY = 'pts-constructor';
const DEVICES = {desktop: '100%', tablet: '768px', mobile: '375px'};
const VALIDATORS = {
    metrikaId: (value) => !value || isMetrikaId(value) || 'Номер счётчика — только цифры, например 12345678',
    gaId: (value) => !value || isGaId(value) || 'Идентификатор начинается с G-, например G-AB12CD34EF',
};

const $ = (selector, root = document) => root.querySelector(selector);
const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (value === undefined || value === null || value === false) continue;
        if (key === 'class') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (/^(data-|aria-)|^(for|role|inputmode|spellcheck)$/.test(key) || !(key in node)) {
            node.setAttribute(key, value === true ? '' : value);
        } else node[key] = value;
    }
    node.append(...children);
    return node;
};

let state = loadState();
let tab = 'snippet';
let previewReady = false;
let renderTimer = 0;

/* ---------- состояние: адрес страницы → localStorage → значения по умолчанию ---------- */

function diffFromDefaults(value) {
    return Object.fromEntries(Object.entries(value).filter(([key, item]) => item !== DEFAULT_STATE[key]));
}

function encode(value) {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    // Частями: String.fromCharCode(...bytes) на большом коде счётчиков упирается в лимит аргументов функции
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decode(str) {
    const binary = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (ch) => ch.charCodeAt(0))));
}

// Ссылки и сохранённые настройки из версии конструктора с галочкой «Тёмная тема»
function migrate(saved) {
    const {dark, ...rest} = saved;
    if (dark && !rest.colorScheme) rest.colorScheme = 'dark';
    return rest;
}

function loadState() {
    const fromHash = location.hash.match(/[#&]s=([\w-]+)/);
    try {
        if (fromHash) return {...DEFAULT_STATE, ...migrate(decode(fromHash[1]))};
    } catch {
        // повреждённая ссылка — открываем сохранённые или стандартные настройки
    }
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return {...DEFAULT_STATE, ...migrate(JSON.parse(saved))};
    } catch {
        // без localStorage настройки живут только в адресе страницы
    }
    return {...DEFAULT_STATE};
}

function saveState() {
    const diff = diffFromDefaults(state);
    const hash = Object.keys(diff).length ? `#s=${encode(diff)}` : '';
    history.replaceState(null, '', `${location.pathname}${location.search}${hash}`);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(diff));
    } catch {
        // см. loadState
    }
}

/* ---------- форма ---------- */

function fieldControl(field) {
    const value = state[field.key];
    const id = `f-${field.key}`;
    const common = {id, 'data-key': field.key};

    switch (field.type) {
        case 'checkbox':
            return el('label', {class: 'check'}, [
                el('input', {...common, type: 'checkbox', checked: !!value}),
                el('span', {text: field.label}),
            ]);
        case 'textarea':
            return el('textarea', {
                ...common, class: `input${field.mono ? ' input--mono' : ''}`, rows: field.rows || 3,
                placeholder: field.placeholder, value: value ?? '', spellcheck: field.mono ? 'false' : undefined,
            });
        case 'select':
            return el('select', {...common, class: 'input'}, field.options.map(([optionValue, label]) =>
                el('option', {value: String(optionValue), text: label, selected: String(optionValue) === String(value)})));
        case 'segmented':
            return el('div', {class: 'segmented segmented--block', role: 'radiogroup'}, field.options.map(([optionValue, label]) =>
                el('button', {
                    type: 'button',
                    class: `segmented__item${optionValue === value ? ' segmented__item--active' : ''}`,
                    'data-key': field.key, 'data-value': optionValue, role: 'radio', 'aria-checked': String(optionValue === value),
                    text: label,
                })));
        case 'color':
            return el('div', {class: 'color'}, [
                el('input', {
                    type: 'color', class: 'color__picker', 'data-key': field.key, 'data-role': 'picker',
                    value: pickerValue(field), 'aria-label': field.label,
                }),
                el('input', {...common, class: 'input', value: value ?? '', placeholder: colorPlaceholder(field)}),
            ]);
        case 'range':
            return el('div', {class: 'range'}, [
                el('input', {...common, type: 'range', min: field.min, max: field.max, step: field.step || 1, value}),
                el('output', {class: 'range__value', for: id, 'data-output': field.key, text: `${value}${field.unit ? ` ${field.unit}` : ''}`}),
            ]);
        case 'number':
            return el('input', {
                ...common, class: 'input', type: 'number', min: field.min, max: field.max, step: field.step || 1,
                value: value ?? '', placeholder: field.placeholder,
            });
        default:
            return el('input', {
                ...common, class: 'input', type: 'text', value: value ?? '', placeholder: field.placeholder, inputmode: field.inputmode,
            });
    }
}

const isHex = (value) => /^#[0-9a-f]{6}$/i.test(value || '');

// Пустое необязательное поле наследует цвет другого (текст — цвет окна, ссылки — акцент).
// Пипетка показывает тот цвет, который реально применится, а не белый
function effectiveColor(field) {
    const value = state[field.key];
    if (isHex(value)) return value;
    if (field.inherits) {
        const parent = FIELDS.find((item) => item.key === field.inherits);
        return effectiveColor(parent);
    }
    return isHex(field.default) ? field.default : '#000000';
}

const pickerValue = (field) => effectiveColor(field);

function colorPlaceholder(field) {
    if (!field.optional) return field.default;
    const parent = FIELDS.find((item) => item.key === field.inherits);
    return parent ? `по умолчанию: ${effectiveColor(parent)}` : 'по умолчанию';
}

function syncColorFields() {
    for (const field of FIELDS.filter((item) => item.type === 'color')) {
        const picker = $(`[data-role="picker"][data-key="${field.key}"]`);
        if (picker) picker.value = pickerValue(field);
        const input = $(`#f-${field.key}`);
        if (input && field.optional) input.placeholder = colorPlaceholder(field);
    }
}

function renderForm() {
    const form = $('#form');
    form.replaceChildren(...SECTIONS.map((section) => {
        const fields = section.fields.map((field) => {
            const wrapper = el('div', {class: `field field--${field.type}`, 'data-field': field.key});
            if (field.type !== 'checkbox') wrapper.append(el('label', {class: 'field__label', for: `f-${field.key}`, text: field.label}));
            wrapper.append(fieldControl(field));
            if (field.hint) wrapper.append(el('p', {class: 'field__hint', text: field.hint}));
            wrapper.append(el('p', {class: 'field__error', 'data-error': field.key}));
            return wrapper;
        });
        return el('details', {class: 'section', open: !!section.open, 'data-section': section.id}, [
            el('summary', {class: 'section__title', text: section.title}),
            el('div', {class: 'section__body'}, fields),
        ]);
    }));
    updateVisibility();
    validate();
    updateSchemeToggle();
}

function updateVisibility() {
    for (const field of FIELDS) {
        const wrapper = $(`[data-field="${field.key}"]`);
        if (wrapper) wrapper.hidden = !isVisible({...field, section: null}, state);
    }
    for (const section of SECTIONS) {
        $(`[data-section="${section.id}"]`).hidden = section.showIf ? !section.showIf(state) : false;
    }
}

function validate() {
    for (const [key, check] of Object.entries(VALIDATORS)) {
        const result = check(String(state[key] || '').trim());
        const error = $(`[data-error="${key}"]`);
        error.textContent = result === true ? '' : result;
        $(`#f-${key}`).classList.toggle('input--invalid', result !== true);
    }
}

function readValue(field, input) {
    if (field.type === 'checkbox') return input.checked;
    if (field.type === 'range' || field.type === 'number') return input.value === '' ? field.default : Number(input.value);
    if (field.type === 'select' && field.number) return Number(input.value);
    return input.value;
}

function setValue(key, value, {replay = false} = {}) {
    state = {...state, [key]: value};

    // Плашке внизу блокировка прокрутки мешает: страница под ней должна оставаться доступной
    if (key === 'bottom' && value) state.lockScroll = false;

    // Пустое поле HTML сразу заполняется примером, который остаётся только поправить
    if (key === 'textMode' && value === 'html' && !String(state.content || '').trim()) {
        state.content = HTML_EXAMPLE;
        $('#f-content').value = HTML_EXAMPLE;
    }

    syncControls(key);
    syncColorFields();
    updateSchemeToggle();
    updateVisibility();
    validate();
    update({replay: replay || key.startsWith('animation') || key === 'bottom'});
}

function syncControls(changedKey) {
    for (const key of [changedKey, 'lockScroll']) {
        const field = FIELDS.find((item) => item.key === key);
        const value = state[key];
        if (field.type === 'checkbox') $(`#f-${key}`).checked = !!value;
        if (field.type === 'range') $(`[data-output="${key}"]`).textContent = `${value}${field.unit ? ` ${field.unit}` : ''}`;
        if (field.type === 'color' && /^#[0-9a-f]{6}$/i.test(value)) $(`[data-role="picker"][data-key="${key}"]`).value = value;
        if (field.type === 'segmented') {
            for (const button of document.querySelectorAll(`[data-key="${key}"][data-value]`)) {
                const active = button.dataset.value === value;
                button.classList.toggle('segmented__item--active', active);
                button.setAttribute('aria-checked', String(active));
            }
        }
    }
}

function bindForm() {
    const form = $('#form');
    form.addEventListener('input', (event) => {
        const key = event.target.dataset.key;
        if (!key) return;
        const field = FIELDS.find((item) => item.key === key);
        if (event.target.dataset.role === 'picker') {
            $(`#f-${key}`).value = event.target.value;
            setValue(key, event.target.value);
            return;
        }
        setValue(key, readValue(field, event.target));
    });
    form.addEventListener('click', (event) => {
        const button = event.target.closest('[data-value]');
        if (button) setValue(button.dataset.key, button.dataset.value);
    });
}

/* ---------- предпросмотр и код ---------- */

let previewScheme = 'light';

// Тему «как в системе» в предпросмотре можно посмотреть в обоих вариантах
function updateSchemeToggle() {
    $('#scheme-toggle').hidden = state.colorScheme !== 'auto';
}

function sendPreview(replay) {
    if (!previewReady) return;
    const options = buildOptions(state);
    if (state.colorScheme === 'auto') options.colorScheme = previewScheme;
    $('#preview').contentWindow.postMessage({type: 'pts-render', options, replay}, location.origin);
}

function renderCode() {
    const assets = $('#assets').value;
    const code = tab === 'snippet'
        ? buildSnippet(state, {version: __VERSION__, assets})
        : initCall(buildOptions(state));
    $('#code').textContent = code;

    $('#code-hint').innerHTML = tab === 'snippet'
        ? (assets === 'cdn'
            ? 'Вставьте код перед <code>&lt;/body&gt;</code>. Счётчики уберите из всех других мест: настроек CMS, плагинов, шаблона сайта.'
            : 'Скачайте <code>pts.lazyload.min.js</code> и <code>pts.lazyload.min.css</code> из папки <code>build/</code> репозитория в <code>/libs/pts-lazyload/</code>, затем вставьте код перед <code>&lt;/body&gt;</code>.')
            + ' Авторизованным пользователям окно можно не показывать — <a href="https://github.com/ak-alz/pts-lazyload/blob/master/docs/cms.md" target="_blank" rel="noopener">примеры для CMS</a>.'
        : 'Только вызов скрипта — если файлы и счётчики на сайте уже подключены.';
}

function update({replay = false} = {}) {
    saveState();
    renderCode();
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => sendPreview(replay), replay ? 0 : 60);
}

/* ---------- прочее ---------- */

let toastTimer = 0;
function toast(text) {
    const node = $('#toast');
    node.textContent = text;
    node.classList.add('toast--visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('toast--visible'), 2000);
}

async function copy(text, message) {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        const area = el('textarea', {value: text, style: 'position:fixed;opacity:0'});
        document.body.append(area);
        area.select();
        document.execCommand('copy');
        area.remove();
    }
    toast(message);
}

function applyState(next) {
    state = {...DEFAULT_STATE, ...next};
    renderForm();
    update({replay: true});
}

// Готовый стиль меняет только оформление: счётчики и дополнительные настройки остаются
const PRESET_KEEPS = new Set(SECTIONS.filter((section) => ['counters', 'advanced'].includes(section.id))
    .flatMap((section) => section.fields.map((field) => field.key)));

function renderPresets() {
    $('#presets').replaceChildren(...Object.entries(PRESETS).map(([, preset]) =>
        el('button', {
            type: 'button', class: 'chip', text: preset.label,
            onclick: () => {
                const kept = Object.fromEntries(Object.entries(state).filter(([key]) => PRESET_KEEPS.has(key)));
                applyState({...kept, ...preset.state});
            },
        })));
}

function bindUi() {
    for (const button of document.querySelectorAll('[data-device]')) {
        button.addEventListener('click', () => {
            document.querySelectorAll('[data-device]').forEach((item) => item.classList.toggle('segmented__item--active', item === button));
            $('#preview').style.width = DEVICES[button.dataset.device];
            sendPreview(false);
        });
    }
    for (const button of document.querySelectorAll('[data-tab]')) {
        button.addEventListener('click', () => {
            tab = button.dataset.tab;
            document.querySelectorAll('[data-tab]').forEach((item) => {
                item.classList.toggle('tabs__item--active', item === button);
                item.setAttribute('aria-selected', String(item === button));
            });
            renderCode();
        });
    }
    $('#assets').addEventListener('change', renderCode);
    for (const button of document.querySelectorAll('[data-scheme]')) {
        button.addEventListener('click', () => {
            previewScheme = button.dataset.scheme;
            document.querySelectorAll('[data-scheme]').forEach((item) => item.classList.toggle('segmented__item--active', item === button));
            sendPreview(false);
        });
    }
    $('#replay').addEventListener('click', () => sendPreview(true));
    $('#copy').addEventListener('click', () => copy($('#code').textContent, 'Код скопирован'));
    $('#share').addEventListener('click', () => copy(location.href, 'Ссылка на настройки скопирована'));
    $('#reset').addEventListener('click', () => applyState({}));

    const onPreviewReady = () => {
        if (previewReady) return;
        previewReady = true;
        sendPreview(true);
    };
    window.addEventListener('message', (event) => {
        if (event.origin === location.origin && event.data?.type === 'pts-preview-ready') onPreviewReady();
    });
    // Превью могло загрузиться раньше, чем этот скрипт начал слушать сообщения
    if ($('#preview').contentWindow?.__ptsPreviewReady) onPreviewReady();
}

renderPresets();
renderForm();
bindForm();
bindUi();
update();
