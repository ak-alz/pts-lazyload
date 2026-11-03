import {now} from './utils.js';

/**
 * Область, клик по которой подтверждает посетителя: кнопка, крестик или оверлей.
 * contains(node) — попадает ли узел в область, rect() — её границы для проверки клика в центр.
 */
export const zoneOf = (el) => ({
    contains: (node) => el.contains(node),
    rect: () => el.getBoundingClientRect(),
});

/**
 * Решает, совершил ли действие человек. Методы check*() возвращают null, если действие засчитано,
 * или причину отказа. Отклонённое действие просто игнорируется: человек повторит его.
 */
export default class ClickGuard {
    #rules;
    #shownAt = 0;
    #pointerMoves = 0;
    #pointerType = '';
    #touched = false;
    #pressedTarget = null;
    #trapped = false;

    constructor(rules) {
        this.#rules = rules;
    }

    start() {
        this.#shownAt = now();
    }

    // Бот нажал на ловушку: до перезагрузки страницы подтверждение невозможно
    trap() {
        this.#trapped = true;
    }

    onPointerMove(event) {
        if (event.isTrusted) this.#pointerMoves++;
    }

    onPointerDown(event) {
        if (!event.isTrusted) return;
        if (event.type === 'touchstart') this.#touched = true;
        // Старый iOS Safari без Pointer Events после касания эмулирует mousedown, но это всё ещё касание
        this.#pointerType = event.pointerType || (this.#touched ? 'touch' : 'mouse');
        this.#pressedTarget = event.target;
    }

    /** Клик по области (кнопке, крестику, оверлею). */
    check(event, zone) {
        const reason = this.#clickReason(event, zone);
        this.#pressedTarget = null;
        return reason;
    }

    /** Нажатие Escape. */
    checkEscape(event) {
        return this.#commonReason(event);
    }

    #commonReason(event) {
        if (this.#trapped) return 'honeypot';
        // Действие из JS: element.click(), dispatchEvent()
        if (!event.isTrusted) return 'untrusted';
        // Скрипты действуют сразу после появления окна
        if (now() - this.#shownAt < this.#rules.minDelay) return 'too-fast';
        return null;
    }

    #clickReason(event, zone) {
        const common = this.#commonReason(event);
        if (common) return common;

        // Клик без нажатия указателя — это клавиатура (Enter/пробел) или скринридер: NVDA, JAWS и VoiceOver
        // активируют кнопку сами, без keydown на странице. Окно должно оставаться доступным без мыши.
        // Клик мышью с detail 0 (так умеет CDP) нажатие указателя даёт и дальше проходит проверки мыши
        if (event.detail === 0 && !this.#pressedTarget) return null;

        // Нажатие должно начаться в той же области: иначе это не клик по ней, а, например, выделение текста
        if (!this.#pressedTarget || !zone.contains(this.#pressedTarget)) return 'no-pointerdown';

        // Касание на тач-экране проверяется мягче: эмуляцию тапа сложно отличить от настоящего
        if (this.#pointerType !== 'mouse') return null;

        // Автоматизация «телепортирует» курсор к цели одним событием
        if (this.#rules.requirePointerMovement && this.#pointerMoves < 3) return 'no-movement';

        // Puppeteer и Playwright кликают ровно в центр элемента, человек туда почти не попадает.
        // Браузер округляет координаты клика до целых, а центр может приходиться на полпикселя, поэтому допуск — 1 px
        if (this.#rules.rejectCenterClick) {
            const rect = zone.rect();
            const dx = Math.abs(event.clientX - (rect.left + rect.width / 2));
            const dy = Math.abs(event.clientY - (rect.top + rect.height / 2));
            if (dx <= 1 && dy <= 1) return 'center-click';
        }

        return null;
    }
}
