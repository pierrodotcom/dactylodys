import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parseLayout } from '$lib/keyboard/layout';
import type { KeyCode, LayoutDefinition, NormalizedKeystroke } from '$lib/keyboard/types';
import azertyPc from '../../../layouts/fr-fr-azerty-pc.json';
import azertyMac from '../../../layouts/fr-fr-azerty-mac.json';
import { PLAY_RULES } from './play-rules';
import {
	CHECK_RULES,
	checkOutcome,
	chooseCheckSteps,
	currentStep,
	needsAdultHelp,
	reduceCheck,
	startCheck,
	stepMatches,
	type CheckState,
	type CheckStep
} from './keyboard-check';

const pc = parseLayout(azertyPc);
const mac = parseLayout(azertyMac);
const LAYOUTS = [
	['PC', pc],
	['Mac', mac]
] as const;

function keystroke(code: string | null, char: string): NormalizedKeystroke {
	return { kind: 'char', char, code, timestamp: 0, composed: false };
}

/** What a keyboard writes for the key printed with `label`, and the key the browser reports. */
type Keyboard = (step: CheckStep) => NormalizedKeystroke | 'not-found';

/** The child presses, for each step, the key that shows the character asked for. */
function check(steps: readonly CheckStep[], keyboard: Keyboard, from?: CheckState): CheckState {
	let state = from ?? startCheck(steps);
	for (let step = currentStep(state); step !== undefined; step = currentStep(state)) {
		const pressed = keyboard(step);
		state = reduceCheck(
			state,
			pressed === 'not-found' ? { type: 'not-found' } : { type: 'typed', keystroke: pressed }
		);
	}
	return state;
}

/** Physical keys of an American keyboard, by the character printed on them. */
const QWERTY_KEYS: Readonly<Record<string, KeyCode>> = { a: 'KeyA', z: 'KeyZ', m: 'KeyM' };
/** What an American layout writes on the physical keys the check asks for. */
const QWERTY_WRITES: Readonly<Record<KeyCode, string>> = {
	KeyQ: 'q',
	KeyW: 'w',
	Semicolon: ';',
	Digit2: '2'
};

/** An AZERTY keyboard in a browser that tells the truth about the physical keys. */
const azerty: Keyboard = (step) => keystroke(step.code, step.char);
/** The same in a browser that resists fingerprinting: the keys of an American keyboard. */
const azertyLyingAboutKeys: Keyboard = (step) =>
	keystroke(QWERTY_KEYS[step.char] ?? null, step.char);
/** A real QWERTY keyboard: the letters are found elsewhere, the accented key does not exist. */
const qwerty: Keyboard = (step) => {
	const code = QWERTY_KEYS[step.char];
	return code === undefined ? 'not-found' : keystroke(code, step.char);
};
/** The same, when the child presses the 2 for want of an accented key. */
const qwertyPressingDigit: Keyboard = (step) => {
	const pressed = qwerty(step);
	return pressed === 'not-found' ? keystroke('Digit2', '2') : pressed;
};
/** An AZERTY keyboard on a system set to QWERTY: the right keys write other characters. */
const azertySetToQwerty: Keyboard = (step) => keystroke(step.code, QWERTY_WRITES[step.code] ?? '');
/** An AZERTY keyboard with Caps Lock on, where Caps Lock writes capital letters (Mac, Linux). */
const azertyWithCapsLock: Keyboard = (step) =>
	keystroke(step.code, step.char.toLocaleUpperCase('fr'));

describe('chooseCheckSteps', () => {
	it.each(LAYOUTS)(
		'picks a, z, m and é on the AZERTY %s layout from the physical keys of the rules',
		(_n, layout) => {
			const steps = chooseCheckSteps(layout, PLAY_RULES.keyboardCheckCodes);

			expect(steps.map((step) => step.char)).toEqual(['a', 'z', 'm', 'é']);
			expect(steps.map((step) => step.code)).toEqual(PLAY_RULES.keyboardCheckCodes);
			expect(steps.map((step) => step.label)).toEqual(['A', 'Z', 'M', 'é']);
		}
	);

	it.each(LAYOUTS)(
		'draws a key with two characters as it is printed on the AZERTY %s keyboard',
		(_n, layout) => {
			const steps = chooseCheckSteps(layout, PLAY_RULES.keyboardCheckCodes);

			expect(steps.map((step) => step.above)).toEqual([null, null, null, '2']);
		}
	);

	it('follows the layout, not a fixed alphabet', () => {
		const qwertyLayout: LayoutDefinition = {
			...pc,
			keys: { KeyQ: { base: 'q', shift: 'Q' }, KeyW: { base: 'w', shift: 'W' } }
		};

		const steps = chooseCheckSteps(qwertyLayout, ['KeyQ', 'KeyW']);

		expect(steps.map((step) => step.char)).toEqual(['q', 'w']);
	});

	it('skips keys that the layout does not define or that are dead keys', () => {
		const layout: LayoutDefinition = {
			...pc,
			keys: { KeyQ: { base: 'a', shift: 'A' }, KeyW: { base: { dead: 'circumflex' } } }
		};

		const steps = chooseCheckSteps(layout, ['KeyQ', 'KeyW', 'KeyZ']);

		expect(steps.map((step) => step.code)).toEqual(['KeyQ']);
	});

	it('shows nothing above a key whose other level is a dead key or the same character', () => {
		const layout: LayoutDefinition = {
			...pc,
			keys: {
				Digit2: { base: 'é', shift: { dead: 'circumflex' } },
				Digit7: { base: 'è', shift: 'è' },
				Digit9: { base: 'ç' }
			}
		};

		const steps = chooseCheckSteps(layout, ['Digit2', 'Digit7', 'Digit9']);

		expect(steps.map((step) => step.above)).toEqual([null, null, null]);
	});
});

describe('the keys checked by the rules', () => {
	// The physical keys tell nothing in some browsers: a keyboard of another family must write
	// another character on at least one key, or have no such key at all.
	it.each(LAYOUTS)(
		'ask the AZERTY %s layout for a character an American keyboard has no key for',
		(_n, layout) => {
			const steps = chooseCheckSteps(layout, PLAY_RULES.keyboardCheckCodes);
			const american = new Set("`1234567890-=qwertyuiop[]\\asdfghjkl;'zxcvbnm,./");

			expect(steps.some((step) => !american.has(step.char))).toBe(true);
		}
	);
});

describe('stepMatches', () => {
	const step: CheckStep = { code: 'KeyQ', char: 'a', label: 'A', above: null };
	const accent: CheckStep = { code: 'Digit2', char: 'é', label: 'é', above: '2' };

	it('accepts the expected character on the expected physical key', () => {
		expect(stepMatches(step, keystroke('KeyQ', 'a'))).toBe(true);
	});

	// A browser that resists fingerprinting (LibreWolf, Tor Browser, Firefox with the setting on)
	// reports the keys of an American keyboard: a real AZERTY keyboard says KeyA for the letter a.
	it('accepts the expected character whatever physical key the browser reports', () => {
		expect(stepMatches(step, keystroke('KeyA', 'a'))).toBe(true);
		expect(stepMatches(step, keystroke(null, 'a'))).toBe(true);
	});

	// An AZERTY keyboard on a system set to QWERTY: the key printed A writes q.
	it('refuses another character, even on the expected physical key', () => {
		expect(stepMatches(step, keystroke('KeyQ', 'q'))).toBe(false);
		expect(stepMatches(step, keystroke(null, 'q'))).toBe(false);
	});

	it('accepts the capital of the expected letter, typed with Caps Lock on', () => {
		expect(stepMatches(step, keystroke('KeyQ', 'A'))).toBe(true);
		expect(stepMatches(accent, keystroke('Digit2', 'É'))).toBe(true);
	});

	// An American keyboard writes 2 on that key: taking it would call any keyboard an AZERTY one.
	it('refuses the other character printed on the key', () => {
		expect(stepMatches(accent, keystroke('Digit2', '2'))).toBe(false);
	});

	it('refuses a key that writes nothing', () => {
		expect(stepMatches(step, { ...keystroke('Enter', ''), kind: 'enter', char: null })).toBe(false);
	});

	it('never looks at the physical key reported', () => {
		fc.assert(
			fc.property(
				fc.string({ unit: 'grapheme', minLength: 1, maxLength: 1 }),
				fc.option(fc.string({ maxLength: 12 }), { nil: null }),
				(char, code) => {
					expect(stepMatches(step, keystroke(code, char))).toBe(
						stepMatches(step, keystroke(null, char))
					);
				}
			)
		);
	});
});

describe('checkOutcome', () => {
	it('is a match when every key is the expected one', () => {
		expect(checkOutcome([true, true, true])).toBe('match');
	});

	it('is a mismatch as soon as one key differs', () => {
		expect(checkOutcome([true, false, true])).toBe('mismatch');
	});

	it('is a mismatch when nothing was checked', () => {
		expect(checkOutcome([])).toBe('mismatch');
	});
});

describe.each(LAYOUTS)('a check on the AZERTY %s layout', (_n, layout) => {
	const steps = chooseCheckSteps(layout, PLAY_RULES.keyboardCheckCodes);

	it('asks for one key at a time, in order, and has no result before the last one', () => {
		let state = startCheck(steps);

		for (const step of steps) {
			expect(state.outcome).toBeNull();
			expect(currentStep(state)).toBe(step);
			state = reduceCheck(state, { type: 'typed', keystroke: azerty(step) as NormalizedKeystroke });
		}

		expect(currentStep(state)).toBeUndefined();
		expect(state.outcome).toBe('match');
	});

	it('says ready to an AZERTY keyboard', () => {
		expect(check(steps, azerty).outcome).toBe('match');
	});

	it('says ready to an AZERTY keyboard in a browser that lies about the physical keys', () => {
		expect(check(steps, azertyLyingAboutKeys).outcome).toBe('match');
	});

	it('says ready to an AZERTY keyboard that writes capitals, Caps Lock on', () => {
		expect(check(steps, azertyWithCapsLock).outcome).toBe('match');
	});

	it('sees a real QWERTY keyboard, whose letters are found but not the accented key', () => {
		expect(check(steps, qwerty).outcome).toBe('mismatch');
		expect(check(steps, qwertyPressingDigit).outcome).toBe('mismatch');
	});

	it('sees an AZERTY keyboard on a system set to QWERTY', () => {
		expect(check(steps, azertySetToQwerty).outcome).toBe('mismatch');
	});

	it('counts a key the child does not find as a difference, and goes on with the next key', () => {
		const first = reduceCheck(startCheck(steps), { type: 'not-found' });

		expect(first.outcome).toBeNull();
		expect(currentStep(first)).toBe(steps[1]);
		expect(check(steps, azerty, first).outcome).toBe('mismatch');
	});

	it('takes nothing more once the result is known', () => {
		const done = check(steps, azerty);

		expect(reduceCheck(done, { type: 'not-found' })).toBe(done);
		expect(reduceCheck(done, { type: 'typed', keystroke: keystroke(null, 'q') })).toBe(done);
	});

	it('ignores Backspace and Enter: only a key that writes answers a step', () => {
		const state = startCheck(steps);
		const enter: NormalizedKeystroke = { ...keystroke('Enter', ''), kind: 'enter', char: null };
		const backspace: NormalizedKeystroke = { ...enter, kind: 'backspace', code: 'Backspace' };

		expect(reduceCheck(state, { type: 'typed', keystroke: enter })).toBe(state);
		expect(reduceCheck(state, { type: 'typed', keystroke: backspace })).toBe(state);
	});

	describe('trying again', () => {
		it('asks for every key again', () => {
			const again = reduceCheck(check(steps, azertySetToQwerty), { type: 'retry' });

			expect(again.outcome).toBeNull();
			expect(currentStep(again)).toBe(steps[0]);
			expect(check(steps, azerty, again).outcome).toBe('match');
		});

		it('does nothing while the keys are asked for', () => {
			const state = reduceCheck(startCheck(steps), { type: 'not-found' });

			expect(reduceCheck(state, { type: 'retry' })).toBe(state);
		});

		it('tells the child to ask an adult from the second difference in a row, not before', () => {
			const once = check(steps, azertySetToQwerty);
			expect(needsAdultHelp(once)).toBe(false);

			const twice = check(steps, qwerty, reduceCheck(once, { type: 'retry' }));
			expect(twice.outcome).toBe('mismatch');
			expect(needsAdultHelp(twice)).toBe(true);

			const thrice = check(steps, azertySetToQwerty, reduceCheck(twice, { type: 'retry' }));
			expect(needsAdultHelp(thrice)).toBe(true);
		});

		it('never tells a child whose keyboard is ready to ask an adult', () => {
			const once = check(steps, azertySetToQwerty);
			const ready = check(steps, azerty, reduceCheck(once, { type: 'retry' }));

			expect(ready.outcome).toBe('match');
			expect(needsAdultHelp(ready)).toBe(false);
		});
	});

	it('has one result only for any answers: ready when every key wrote its character', () => {
		const answer = fc.constantFrom<'right' | 'wrong' | 'not-found'>('right', 'wrong', 'not-found');
		fc.assert(
			fc.property(
				fc.array(answer, { minLength: steps.length, maxLength: steps.length }),
				(list) => {
					let index = 0;
					const state = check(steps, (step) => {
						const given = list[index++];
						if (given === 'not-found') return 'not-found';
						return keystroke(null, given === 'right' ? step.char : `${step.char}x`);
					});

					expect(state.outcome).toBe(
						list.every((given) => given === 'right') ? 'match' : 'mismatch'
					);
				}
			)
		);
	});
});

describe('a layout with no key to check', () => {
	it('is a difference at once', () => {
		expect(startCheck([]).outcome).toBe('mismatch');
	});
});

describe('the rules of the check', () => {
	it('ask for an adult from the second difference in a row', () => {
		expect(CHECK_RULES.adultHelpFromMismatch).toBe(2);
	});
});
