import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import ClickGuard, {zoneOf} from '../../src/ClickGuard.js';

const RULES = {minDelay: 0, requirePointerMovement: true, rejectCenterClick: true};
const RECT = {left: 100, top: 200, width: 180, height: 50};
const CENTER = {clientX: 190, clientY: 225};

let button;

function createGuard(rules = {}) {
    const guard = new ClickGuard({...RULES, ...rules});
    guard.start();
    return guard;
}

const check = (guard, event, el = button) => guard.check(event, zoneOf(el));

const move = (guard, times = 5) => {
    for (let i = 0; i < times; i++) guard.onPointerMove({isTrusted: true});
};
const press = (guard, pointerType = 'mouse', target = button) =>
    guard.onPointerDown({isTrusted: true, type: 'pointerdown', pointerType, target});
const click = (overrides = {}) => ({isTrusted: true, detail: 1, clientX: 120, clientY: 215, ...overrides});

describe('ClickGuard', () => {
    beforeEach(() => {
        button = document.createElement('button');
        document.body.appendChild(button);
        vi.spyOn(button, 'getBoundingClientRect').mockReturnValue(RECT);
    });

    afterEach(() => {
        button.remove();
        vi.restoreAllMocks();
    });

    it('засчитывает клик человека мышью', () => {
        const guard = createGuard();
        move(guard);
        press(guard);
        expect(check(guard, click())).toBe(null);
    });

    it('untrusted: клик из JS', () => {
        const guard = createGuard();
        move(guard);
        press(guard);
        expect(check(guard, click({isTrusted: false}))).toBe('untrusted');
    });

    it('too-fast: клик раньше minDelay', () => {
        const guard = createGuard({minDelay: 60_000});
        move(guard);
        press(guard);
        expect(check(guard, click())).toBe('too-fast');
    });

    it('no-pointerdown: нажатие было не на кнопке', () => {
        const guard = createGuard();
        move(guard);
        press(guard, 'mouse', document.body);
        expect(check(guard, click())).toBe('no-pointerdown');
    });

    it('no-movement: курсор «телепортировался» к кнопке', () => {
        const guard = createGuard();
        move(guard, 1);
        press(guard);
        expect(check(guard, click())).toBe('no-movement');
    });

    it('проверку движения можно отключить', () => {
        const guard = createGuard({requirePointerMovement: false});
        press(guard);
        expect(check(guard, click())).toBe(null);
    });

    it('center-click: клик ровно в центр кнопки', () => {
        const guard = createGuard();
        move(guard);
        press(guard);
        expect(check(guard, click(CENTER))).toBe('center-click');
    });

    it('центр на полпикселя, координаты клика округлены браузером — всё равно center-click', () => {
        button.getBoundingClientRect.mockReturnValue({left: 100.25, top: 200.5, width: 181, height: 49});
        const guard = createGuard();
        move(guard);
        press(guard);
        expect(check(guard, click({clientX: 191, clientY: 225}))).toBe('center-click');
    });

    it('клик рядом с центром засчитывается', () => {
        const guard = createGuard();
        move(guard);
        press(guard);
        expect(check(guard, click({clientX: CENTER.clientX + 2, clientY: CENTER.clientY}))).toBe(null);
    });

    it('проверку центра можно отключить', () => {
        const guard = createGuard({rejectCenterClick: false});
        move(guard);
        press(guard);
        expect(check(guard, click(CENTER))).toBe(null);
    });

    it('касание засчитывается без движения и даже в центр', () => {
        const guard = createGuard();
        press(guard, 'touch');
        expect(check(guard, click(CENTER))).toBe(null);
    });

    it('старый iOS: touchstart, затем эмулированный mousedown — это касание', () => {
        const guard = createGuard();
        guard.onPointerDown({isTrusted: true, type: 'touchstart', target: button});
        guard.onPointerDown({isTrusted: true, type: 'mousedown', target: button});
        expect(check(guard, click(CENTER))).toBe(null);
    });

    it('клавиатура: Enter или пробел на кнопке (click с detail 0 без нажатия указателя)', () => {
        const guard = createGuard();
        button.focus();
        expect(check(guard, click({detail: 0}))).toBe(null);
    });

    it('скринридер: доверенный click с detail 0 без keydown и pointerdown засчитывается', () => {
        const guard = createGuard();
        expect(check(guard, click({detail: 0, clientX: 0, clientY: 0}))).toBe(null);
    });

    it('скринридер: и без фокуса на кнопке (режим просмотра NVDA/JAWS)', () => {
        const guard = createGuard();
        document.body.focus();
        expect(check(guard, click({detail: 0}))).toBe(null);
    });

    it('клик мышью с detail 0 (CDP clickCount 0) проходит проверки мыши: без движения отклоняется', () => {
        const guard = createGuard();
        move(guard, 1);
        press(guard);
        expect(check(guard, click({detail: 0, ...CENTER}))).toBe('no-movement');
    });

    it('клик мышью с detail 0 в центр после движения отклоняется', () => {
        const guard = createGuard();
        move(guard);
        press(guard);
        expect(check(guard, click({detail: 0, ...CENTER}))).toBe('center-click');
    });

    it('клавиатурный click по-прежнему требует isTrusted и паузу', () => {
        expect(check(createGuard(), click({detail: 0, isTrusted: false}))).toBe('untrusted');
        expect(check(createGuard({minDelay: 60_000}), click({detail: 0}))).toBe('too-fast');
    });

    it('untrusted-события движения и нажатия игнорируются', () => {
        const guard = createGuard();
        for (let i = 0; i < 5; i++) guard.onPointerMove({isTrusted: false});
        guard.onPointerDown({isTrusted: false, type: 'pointerdown', pointerType: 'mouse', target: button});
        expect(check(guard, click())).toBe('no-pointerdown');
    });

    it('после проверки нужно новое нажатие', () => {
        const guard = createGuard();
        move(guard);
        press(guard);
        check(guard, click({isTrusted: false}));
        expect(check(guard, click())).toBe('no-pointerdown');
    });

    it('нажатие на одной кнопке и отпускание на другой не засчитывается', () => {
        const close = document.createElement('button');
        document.body.appendChild(close);
        const guard = createGuard();
        move(guard);
        press(guard, 'mouse', close);
        expect(check(guard, click())).toBe('no-pointerdown');
        close.remove();
    });

    describe('оверлей', () => {
        let root;
        let dialog;
        let overlay;

        beforeEach(() => {
            root = document.createElement('div');
            dialog = document.createElement('div');
            root.append(dialog);
            dialog.append(button);
            document.body.append(root);
            overlay = {
                contains: (node) => root.contains(node) && !dialog.contains(node),
                rect: () => ({left: 0, top: 0, width: 1000, height: 800}),
            };
        });

        afterEach(() => root.remove());

        it('клик по оверлею засчитывается', () => {
            const guard = createGuard();
            move(guard);
            press(guard, 'mouse', root);
            expect(guard.check(click({clientX: 30, clientY: 40}), overlay)).toBe(null);
        });

        it('нажатие внутри окна и отпускание на оверлее не засчитывается', () => {
            const guard = createGuard();
            move(guard);
            press(guard, 'mouse', dialog);
            expect(guard.check(click({clientX: 30, clientY: 40}), overlay)).toBe('no-pointerdown');
        });

        it('клик ровно в центр экрана отклоняется', () => {
            const guard = createGuard();
            move(guard);
            press(guard, 'mouse', root);
            expect(guard.check(click({clientX: 500, clientY: 400}), overlay)).toBe('center-click');
        });
    });

    describe('Escape', () => {
        it('настоящее нажатие после паузы засчитывается', () => {
            expect(createGuard().checkEscape({isTrusted: true})).toBe(null);
        });

        it('untrusted', () => {
            expect(createGuard().checkEscape({isTrusted: false})).toBe('untrusted');
        });

        it('too-fast', () => {
            expect(createGuard({minDelay: 60_000}).checkEscape({isTrusted: true})).toBe('too-fast');
        });

        it('после ловушки не засчитывается', () => {
            const guard = createGuard();
            guard.trap();
            expect(guard.checkEscape({isTrusted: true})).toBe('honeypot');
        });
    });

    it('honeypot: после ловушки ни один клик не засчитывается', () => {
        const guard = createGuard();
        guard.trap();
        move(guard);
        press(guard);
        expect(check(guard, click())).toBe('honeypot');
    });
});
