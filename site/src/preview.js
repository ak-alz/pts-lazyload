import PtsLazyLoad from '../../src/index.js';

const COOKIE = 'pts-preview';
const REASONS = {
    untrusted: 'событие из JS, а не настоящий клик',
    'too-fast': 'клик сразу после появления окна',
    'no-pointerdown': 'нажатие началось в другом месте',
    'no-movement': 'курсор не двигался',
    'center-click': 'клик ровно в центр',
    honeypot: 'нажата кнопка-ловушка',
};

let instance = null;
let toastTimer = 0;

function toast(text, type = '') {
    const el = document.getElementById('toast');
    el.textContent = text;
    el.className = `preview-toast preview-toast--visible${type ? ` preview-toast--${type}` : ''}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('preview-toast--visible'), 2600);
}

function resetVerification() {
    document.cookie = `${COOKIE}=; max-age=0; path=/`;
    document.cookie = `${COOKIE}-declined=; max-age=0; path=/`;
    try {
        localStorage.removeItem(COOKIE);
        sessionStorage.removeItem(`${COOKIE}-declined`);
    } catch {
        // в предпросмотре без localStorage достаточно cookie
    }
}

// На каждое изменение настроек окно пересоздаётся. Анимация проигрывается только по запросу,
// иначе окно «прыгало» бы при каждом движении ползунка
function render(options, replay) {
    instance?.destroy();
    document.querySelectorAll('.pts-lazyload').forEach((el) => el.remove());
    document.documentElement.classList.remove('pts-lazyload-locked');
    resetVerification();

    const theme = {...options.theme};
    if (!replay) theme.animation = 'none';

    instance = new PtsLazyLoad({
        ...options,
        theme,
        cookieName: COOKIE,
        counterSelector: false,
        counters: [],
        // Окно в предпросмотре не должно забирать фокус у полей конструктора
        autoFocus: false,
        // Предпросмотр должен показывать окно всегда, в том числе в браузерах для скриншотов и автотестов
        protection: {...options.protection, detectWebdriver: false},
        botUserAgents: [],
        onVerify: ({reason}) => toast(`✓ Подтверждено (${reason}) — здесь загрузились бы счётчики`, 'ok'),
        onReject: ({reason}) => toast(`✕ Защита отклонила действие: ${REASONS[reason] || reason}`, 'bad'),
        onDismiss: ({reason}) => toast(reason === 'decline'
            ? 'Отказ: окно закрыто, счётчики не загрузятся'
            : 'Окно закрыто без подтверждения'),
    }).init();
}

window.addEventListener('message', (event) => {
    if (event.source !== window.parent || event.data?.type !== 'pts-render') return;
    render(event.data.options, event.data.replay);
});

window.__ptsPreviewReady = true;
window.parent.postMessage({type: 'pts-preview-ready'}, location.origin);
