export const HTML_EXAMPLE = `<p>Мы используем файлы cookie, чтобы сайт работал лучше.</p>
<p>Продолжая пользоваться сайтом, вы соглашаетесь с <a href="/privacy">политикой конфиденциальности</a>.</p>`;

/**
 * Поля конструктора. key — ключ в состоянии, path — путь в параметрах PtsLazyLoad (если поле напрямую в них попадает).
 * default совпадает со значением по умолчанию в библиотеке: такие значения не попадают в итоговый код.
 */
export const SECTIONS = [
    {
        id: 'content',
        title: 'Тексты',
        open: true,
        fields: [
            {key: 'title', path: 'modal.title', type: 'text', label: 'Заголовок', default: '', placeholder: 'Без заголовка'},
            {
                key: 'textMode', type: 'segmented', label: 'Формат текста', default: 'text',
                options: [['text', 'Текст'], ['html', 'HTML']],
            },
            {
                key: 'text', path: 'modal.text', type: 'textarea', label: 'Текст', rows: 4,
                default: 'Мы используем файлы cookie, чтобы сайт работал корректно и был удобнее для вас. Продолжая пользоваться сайтом, вы соглашаетесь с их использованием.',
                hint: 'Пустая строка — новый абзац', showIf: (s) => s.textMode === 'text',
            },
            {
                key: 'content', path: 'modal.content', type: 'textarea', label: 'HTML', rows: 5, mono: true, default: '',
                placeholder: HTML_EXAMPLE,
                hint: 'Абзацы, ссылки, списки — любая разметка', showIf: (s) => s.textMode === 'html',
            },
            {key: 'buttonText', path: 'modal.buttonText', type: 'text', label: 'Текст кнопки', default: 'Принять'},
            {key: 'declineText', path: 'modal.declineText', type: 'text', label: 'Текст кнопки отказа', default: 'Только необходимые', showIf: (s) => s.declineButton},
        ],
    },
    {
        id: 'behavior',
        title: 'Поведение',
        open: true,
        fields: [
            {
                key: 'declineButton', path: 'declineButton', type: 'checkbox', label: 'Кнопка «Только необходимые»', default: false,
                hint: 'Закрывает окно без загрузки счётчиков',
            },
            {
                key: 'declineTime', path: 'declineTime', type: 'select', label: 'Помнить отказ', default: 0, number: true,
                showIf: (s) => s.declineButton,
                options: [[0, 'До закрытия вкладки'], [1, '1 день'], [30, '30 дней'], [180, '180 дней'], [365, '365 дней']],
            },
            {key: 'closeButton', path: 'closeButton', type: 'checkbox', label: 'Крестик в углу', default: false},
            {key: 'closeOnOverlay', path: 'closeOnOverlay', type: 'checkbox', label: 'Закрывать кликом по затемнению', default: false},
            {key: 'closeOnEscape', path: 'closeOnEscape', type: 'checkbox', label: 'Закрывать клавишей Escape', default: false},
            {key: 'bottom', type: 'checkbox', label: 'Плашка внизу экрана', default: false, hint: 'Страница под плашкой остаётся доступной'},
            {key: 'inline', type: 'checkbox', label: 'Текст слева, кнопка справа', default: false, hint: 'На телефонах кнопка переносится под текст'},
            {key: 'lockScroll', path: 'lockScroll', type: 'checkbox', label: 'Блокировать прокрутку страницы', default: true},
        ],
    },
    {
        id: 'colors',
        title: 'Цвета и шрифт',
        open: true,
        fields: [
            {
                key: 'colorScheme', path: 'colorScheme', type: 'segmented', label: 'Тема', default: 'light',
                options: [['light', 'Светлая'], ['dark', 'Тёмная'], ['auto', 'Как в системе']],
                hint: '«Как в системе» — тёмная, если она включена у посетителя. Для своего переключателя темы на сайте есть метод setColorScheme()',
            },
            {key: 'accent', path: 'theme.accent', type: 'color', label: 'Акцент: кнопка и ссылки', default: '#0836ff'},
            {key: 'accentHover', path: 'theme.accentHover', type: 'color', label: 'Кнопка при наведении', default: '#0435c9'},
            {key: 'accentText', path: 'theme.accentText', type: 'color', label: 'Текст кнопки', default: '#ffffff'},
            {
                key: 'fontFamily', path: 'theme.fontFamily', type: 'select', label: 'Шрифт', default: 'inherit',
                options: [
                    ['inherit', 'Как на сайте'],
                    ['system-ui, sans-serif', 'Системный'],
                    ['Arial, sans-serif', 'Arial'],
                    ['Georgia, serif', 'Georgia'],
                    ['"Times New Roman", serif', 'Times New Roman'],
                    ['"Courier New", monospace', 'Courier New'],
                ],
            },
        ],
    },
    {
        id: 'dialog',
        title: 'Окно',
        fields: [
            {key: 'dialogBackground', path: 'theme.dialog.background', type: 'color', label: 'Фон', default: '#ffffff'},
            {key: 'dialogColor', path: 'theme.dialog.color', type: 'color', label: 'Цвет текста', default: '#3d424b'},
            {key: 'dialogWidth', path: 'theme.dialog.width', type: 'range', label: 'Ширина', default: 500, min: 280, max: 900, step: 10, unit: 'px'},
            {key: 'dialogPadding', path: 'theme.dialog.padding', type: 'range', label: 'Внутренний отступ', default: 30, min: 10, max: 80, unit: 'px'},
            {key: 'dialogRadius', path: 'theme.dialog.radius', type: 'range', label: 'Скругление', default: 8, min: 0, max: 40, unit: 'px'},
            {
                key: 'dialogTextAlign', path: 'theme.dialog.textAlign', type: 'segmented', label: 'Выравнивание', default: 'center',
                options: [['left', 'Слева'], ['center', 'По центру']],
            },
            {
                key: 'dialogShadow', path: 'theme.dialog.shadow', type: 'select', label: 'Тень', default: '',
                options: [
                    ['', 'Обычная'],
                    ['0 4px 20px rgba(0, 0, 0, .12)', 'Мягкая'],
                    ['0 30px 60px rgba(0, 0, 0, .3)', 'Глубокая'],
                    ['none', 'Без тени'],
                ],
            },
            {key: 'overlayBackground', path: 'theme.overlay.background', type: 'text', label: 'Затемнение', default: 'rgba(0, 0, 0, .5)', hint: 'Любой CSS-цвет, например rgba(0, 0, 0, .7)', showIf: (s) => !s.bottom},
            {key: 'gutter', path: 'theme.gutter', type: 'range', label: 'Отступ от краёв экрана', default: 16, min: 0, max: 48, unit: 'px', hint: 'Окно никогда не шире экрана минус два таких отступа'},
            {key: 'overlayBlur', path: 'theme.overlay.blur', type: 'range', label: 'Размытие страницы', default: 0, min: 0, max: 20, unit: 'px', showIf: (s) => !s.bottom},
        ],
    },
    {
        id: 'dark',
        title: 'Цвета тёмной темы',
        showIf: (s) => s.colorScheme !== 'light',
        fields: [
            {key: 'darkDialogBackground', path: 'themeDark.dialog.background', type: 'color', label: 'Фон окна', default: '#1f2329'},
            {key: 'darkDialogColor', path: 'themeDark.dialog.color', type: 'color', label: 'Цвет текста', default: '#d7dbe0'},
            {key: 'darkTitleColor', path: 'themeDark.title.color', type: 'color', label: 'Цвет заголовка', default: '#ffffff'},
            {key: 'darkAccent', path: 'themeDark.accent', type: 'color', label: 'Акцент', default: '', optional: true, inherits: 'accent'},
            {key: 'darkAccentText', path: 'themeDark.accentText', type: 'color', label: 'Текст кнопки', default: '', optional: true, inherits: 'accentText'},
            {key: 'darkOverlayBackground', path: 'themeDark.overlay.background', type: 'text', label: 'Затемнение', default: 'rgba(0, 0, 0, .7)', showIf: (s) => !s.bottom},
        ],
    },
    {
        id: 'title',
        title: 'Заголовок',
        fields: [
            {key: 'titleFontSize', path: 'theme.title.fontSize', type: 'range', label: 'Размер', default: 32, min: 14, max: 64, unit: 'px'},
            {
                key: 'titleFontWeight', path: 'theme.title.fontWeight', type: 'select', label: 'Насыщенность', default: 300, number: true,
                options: [[300, 'Тонкий'], [400, 'Обычный'], [500, 'Средний'], [600, 'Полужирный'], [700, 'Жирный']],
            },
            {key: 'titleColor', path: 'theme.title.color', type: 'color', label: 'Цвет', default: '#3d424b'},
        ],
    },
    {
        id: 'text',
        title: 'Текст',
        fields: [
            {key: 'textFontSize', path: 'theme.text.fontSize', type: 'range', label: 'Размер', default: 16, min: 12, max: 24, unit: 'px'},
            {key: 'textLineHeight', path: 'theme.text.lineHeight', type: 'range', label: 'Межстрочный интервал', default: 1.4, min: 1, max: 2, step: 0.05},
            {key: 'textColor', path: 'theme.text.color', type: 'color', label: 'Цвет', default: '', optional: true, inherits: 'dialogColor'},
            {key: 'textLinkColor', path: 'theme.text.linkColor', type: 'color', label: 'Цвет ссылок', default: '', optional: true, inherits: 'accent'},
            {key: 'textLinkUnderline', type: 'checkbox', label: 'Подчёркивать ссылки', default: true},
        ],
    },
    {
        id: 'button',
        title: 'Кнопка',
        fields: [
            {key: 'buttonRadius', path: 'theme.button.radius', type: 'range', label: 'Скругление', default: 5, min: 0, max: 40, unit: 'px'},
            {key: 'buttonHeight', path: 'theme.button.height', type: 'range', label: 'Минимальная высота', default: 50, min: 32, max: 72, unit: 'px'},
            {key: 'buttonPaddingX', type: 'range', label: 'Отступы по бокам', default: 32, min: 8, max: 80, unit: 'px'},
            {key: 'buttonFontSize', path: 'theme.button.fontSize', type: 'range', label: 'Размер текста', default: 16, min: 12, max: 24, unit: 'px'},
            {
                key: 'buttonTextTransform', path: 'theme.button.textTransform', type: 'segmented', label: 'Регистр', default: 'uppercase',
                options: [['uppercase', 'ПРОПИСНЫЕ'], ['none', 'Как написано']],
            },
            {
                key: 'buttonFontWeight', path: 'theme.button.fontWeight', type: 'select', label: 'Насыщенность', default: 400, number: true,
                options: [[400, 'Обычный'], [500, 'Средний'], [600, 'Полужирный'], [700, 'Жирный']],
            },
        ],
    },
    {
        id: 'decline',
        title: 'Кнопка «Только необходимые»',
        showIf: (s) => s.declineButton,
        fields: [
            {
                key: 'declineStyle', type: 'segmented', label: 'Вид', default: 'outline',
                options: [['outline', 'С рамкой'], ['filled', 'Серая'], ['text', 'Без рамки']],
                hint: 'Размеры, скругление и шрифт — как у основной кнопки',
            },
            {key: 'declineColor', path: 'theme.decline.color', type: 'color', label: 'Цвет текста', default: '', optional: true, inherits: 'dialogColor'},
        ],
    },
    {
        id: 'close',
        title: 'Крестик',
        showIf: (s) => s.closeButton,
        fields: [
            {key: 'closeSize', path: 'theme.close.size', type: 'range', label: 'Размер кнопки', default: 36, min: 24, max: 56, unit: 'px'},
            {key: 'closeFontSize', path: 'theme.close.fontSize', type: 'range', label: 'Размер иконки', default: 28, min: 14, max: 40, unit: 'px'},
            {key: 'closeOpacity', path: 'theme.close.opacity', type: 'range', label: 'Непрозрачность', default: 0.5, min: 0.1, max: 1, step: 0.05},
            {key: 'closeColor', path: 'theme.close.color', type: 'color', label: 'Цвет', default: '', optional: true, inherits: 'dialogColor'},
        ],
    },
    {
        id: 'mobile',
        title: 'Мобильная версия',
        fields: [
            {key: 'mobileBreakpoint', type: 'number', label: 'Для экранов шириной до, px', default: 575, min: 320, max: 1200, step: 1},
            {key: 'mobileGutter', type: 'number', label: 'Отступ от краёв экрана, px', default: '', placeholder: 'как на компьютере', min: 0, max: 48},
            {key: 'mobileDialogPadding', type: 'number', label: 'Внутренний отступ окна, px', default: '', placeholder: 'по умолчанию', min: 0, max: 80},
            {key: 'mobileTitleFontSize', type: 'number', label: 'Размер заголовка, px', default: '', placeholder: '26', min: 12, max: 64},
            {key: 'mobileTextFontSize', type: 'number', label: 'Размер текста, px', default: '', placeholder: 'как на компьютере', min: 10, max: 24},
            {key: 'mobileButtonFullWidth', type: 'checkbox', label: 'Кнопка на всю ширину', default: true},
        ],
    },
    {
        id: 'animation',
        title: 'Анимация появления',
        fields: [
            {
                key: 'animationType', type: 'select', label: 'Эффект', default: 'slide-up',
                options: [['slide-up', 'Снизу вверх'], ['slide-down', 'Сверху вниз'], ['zoom', 'Увеличение'], ['fade', 'Проявление'], ['none', 'Без анимации']],
            },
            {key: 'animationDuration', type: 'range', label: 'Длительность', default: 300, min: 100, max: 1000, step: 50, unit: 'мс', showIf: (s) => s.animationType !== 'none'},
            {
                key: 'animationEasing', type: 'select', label: 'Плавность', default: 'ease', showIf: (s) => s.animationType !== 'none',
                options: [['ease', 'Плавная'], ['ease-out', 'Замедление в конце'], ['linear', 'Равномерная'], ['cubic-bezier(.2, .8, .2, 1.2)', 'Пружина']],
            },
        ],
    },
    {
        id: 'counters',
        title: 'Счётчики',
        open: true,
        fields: [
            {key: 'metrikaId', type: 'text', label: 'Номер счётчика Яндекс Метрики', default: '', placeholder: '12345678', inputmode: 'numeric'},
            {key: 'metrikaWebvisor', type: 'checkbox', label: 'Вебвизор', default: true, showIf: (s) => !!s.metrikaId},
            {key: 'metrikaClickmap', type: 'checkbox', label: 'Карта кликов', default: true, showIf: (s) => !!s.metrikaId},
            {key: 'metrikaTrackLinks', type: 'checkbox', label: 'Внешние ссылки, загрузки файлов', default: true, showIf: (s) => !!s.metrikaId},
            {key: 'metrikaAccurateTrackBounce', type: 'checkbox', label: 'Точный показатель отказов', default: true, showIf: (s) => !!s.metrikaId},
            {key: 'gaId', type: 'text', label: 'Идентификатор Google Analytics 4', default: '', placeholder: 'G-XXXXXXXXXX'},
            {
                key: 'customCode', type: 'textarea', label: 'Другой код', rows: 6, mono: true, default: '',
                placeholder: '<script>…</script>',
                hint: 'Любой код как есть: пиксели, чаты, реклама, свой код Метрики. Экранировать ничего не нужно.',
            },
        ],
    },
    {
        id: 'advanced',
        title: 'Дополнительно',
        fields: [
            {key: 'cookieTime', path: 'cookieTime', type: 'number', label: 'Помнить посетителя, дней', default: 365, min: 1, max: 400},
            {key: 'cookieDomain', path: 'cookieDomain', type: 'text', label: 'Домен cookie', default: '', placeholder: '.site.ru', hint: 'Если сайт открывается и с www, и без'},
            {key: 'minDelay', path: 'protection.minDelay', type: 'number', label: 'Минимальная пауза перед кликом, мс', default: 1200, min: 0, max: 5000, step: 100},
            {key: 'closeLabel', path: 'modal.closeLabel', type: 'text', label: 'Подпись крестика для скринридеров', default: 'Закрыть', showIf: (s) => s.closeButton},
        ],
    },
];

export const FIELDS = SECTIONS.flatMap((section) => section.fields.map((field) => ({...field, section})));

/** Поле видно, если видны и оно само, и его раздел. Скрытые поля не попадают в итоговый код. */
export const isVisible = (field, state) =>
    (!field.section?.showIf || field.section.showIf(state)) && (!field.showIf || field.showIf(state));

export const DEFAULT_STATE = Object.fromEntries(FIELDS.map((field) => [field.key, field.default]));

export const PRESETS = {
    default: {label: 'Стандартный', state: {}},
    soft: {
        label: 'Мягкий',
        state: {
            title: 'Добро пожаловать!', closeButton: true, closeOnEscape: true, closeOnOverlay: true,
            accent: '#16a34a', accentHover: '#15803d', dialogRadius: 20, buttonRadius: 40, buttonTextTransform: 'none',
            titleFontWeight: 600, titleFontSize: 28, dialogShadow: '0 4px 20px rgba(0, 0, 0, .12)', animationType: 'zoom',
        },
    },
    dark: {
        label: 'Тёмный',
        state: {
            title: 'Привет!', colorScheme: 'dark', closeButton: true, accent: '#a78bfa', accentHover: '#8b5cf6', accentText: '#1f2329',
            overlayBlur: 6, buttonTextTransform: 'none', buttonFontWeight: 600,
        },
    },
    barInline: {
        label: 'Плашка: кнопка справа',
        state: {
            bottom: true, inline: true, lockScroll: false, closeButton: true, declineButton: true, dialogWidth: 960, dialogPadding: 20, dialogRadius: 12,
            textFontSize: 15, buttonHeight: 42, buttonPaddingX: 24, buttonTextTransform: 'none', buttonRadius: 8, buttonFontWeight: 600,
            animationType: 'slide-up',
        },
    },
    bar: {
        label: 'Плашка снизу',
        state: {
            bottom: true, lockScroll: false, buttonText: 'Понятно', dialogWidth: 640, dialogPadding: 20,
            buttonHeight: 40, buttonTextTransform: 'none', buttonRadius: 40, animationType: 'slide-up',
        },
    },
    warm: {
        label: 'Тёплый',
        state: {
            title: 'Вам есть 18 лет?', text: 'Сайт содержит информацию для взрослых.', buttonText: 'Да, мне есть 18',
            closeButton: true, fontFamily: 'Georgia, serif', accent: '#ea580c', accentHover: '#c2410c',
            dialogBackground: '#fff8ed', dialogColor: '#9a3412', titleColor: '#7c2d12', titleFontSize: 36, titleFontWeight: 700,
            dialogRadius: 24, dialogPadding: 44, buttonRadius: 40, buttonTextTransform: 'none', buttonFontSize: 18,
            overlayBackground: 'rgba(30, 20, 10, .6)', animationType: 'slide-down', animationDuration: 450,
            animationEasing: 'cubic-bezier(.2, .8, .2, 1.2)',
        },
    },
};
