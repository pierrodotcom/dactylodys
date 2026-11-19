import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { fadedKeys } from '../../engine/progression/keyboard-fade';
import type { MasteryRules, ProgressState } from '../../engine/progression/types';
import { modifierCodes, parseFingeringProfile } from '../../keyboard/fingering';
import { buildCharIndex, parseLayout } from '../../keyboard/layout';
import type { KeyPress } from '../../keyboard/types';
import azertyPc from '../../../../layouts/fr-fr-azerty-pc.json';
import tenFingers from '../../../../layouts/fingering/ten-fingers-iso.json';
import { fadedKeysShown, litTarget } from './keyboard-fade';
import { targetKeyPress } from './target';

const charIndex = buildCharIndex(parseLayout(azertyPc));
const fingering = parseFingeringProfile(tenFingers);
const BACKSPACE: KeyPress = { code: 'Backspace', level: 'base' };

function pressOf(char: string): KeyPress {
	const press = targetKeyPress(charIndex, char);
	if (press === null) throw new Error(`no key writes ${char}`);
	return press;
}

describe('fadedKeysShown', () => {
	it('fades every key the route faded while nothing was missed', () => {
		expect(fadedKeysShown(['KeyF', 'KeyJ'], charIndex, [])).toEqual(['KeyF', 'KeyJ']);
	});

	it('writes again the key of a character missed in the game', () => {
		expect(fadedKeysShown(['KeyF', 'KeyJ'], charIndex, ['j'])).toEqual(['KeyF']);
	});

	it('writes again the key of a missed capital, not Shift', () => {
		expect(fadedKeysShown(['KeyF', 'KeyJ'], charIndex, ['F'])).toEqual(['KeyJ']);
	});

	it('leaves the faded keys alone when the missed key was written anyway', () => {
		expect(fadedKeysShown(['KeyF'], charIndex, ['d', ' '])).toEqual(['KeyF']);
	});

	it('fades nothing when the route faded nothing', () => {
		expect(fadedKeysShown([], charIndex, ['f'])).toEqual([]);
	});
});

describe('litTarget (audit P-07)', () => {
	it('lights the key expected when its letter is written', () => {
		expect(litTarget(pressOf('d'), ['KeyF'], false, fingering)).toEqual({
			target: pressOf('d'),
			modifiers: []
		});
	});

	it('lights neither a faded key expected nor anything for it', () => {
		expect(litTarget(pressOf('f'), ['KeyF'], false, fingering)).toEqual({
			target: null,
			modifiers: []
		});
	});

	it('lights a faded key again while the child hesitates or the hand shows it', () => {
		expect(litTarget(pressOf('f'), ['KeyF'], true, fingering)).toEqual({
			target: pressOf('f'),
			modifiers: []
		});
	});

	it('lights again, until the end of the game, a faded key the child missed', () => {
		const faded = fadedKeysShown(['KeyF', 'KeyJ'], charIndex, ['f']);
		expect(litTarget(pressOf('f'), faded, false, fingering).target).toEqual(pressOf('f'));
		expect(litTarget(pressOf('j'), faded, false, fingering).target).toBeNull();
	});

	it('keeps Shift lit for a capital whose key faded: a modifier never fades', () => {
		const capital = pressOf('F');
		expect(capital.level).toBe('shift');
		expect(litTarget(capital, ['KeyF'], false, fingering)).toEqual({
			target: null,
			modifiers: ['ShiftRight']
		});
	});

	it('keeps AltGr lit for a sign written with it on a faded key', () => {
		expect(litTarget(pressOf('@'), ['Digit0'], false, fingering)).toEqual({
			target: null,
			modifiers: ['AltRight']
		});
	});

	it('lights every key as before when nothing fades: the adult turned it off', () => {
		for (const char of ['f', 'F', '@', ' ', 'ê']) {
			expect(litTarget(pressOf(char), [], false, fingering).target).toEqual(pressOf(char));
		}
	});

	it('lights nothing when nothing is expected', () => {
		expect(litTarget(null, ['KeyF'], false, fingering)).toEqual({ target: null, modifiers: [] });
	});

	it('never darkens Space, Backspace or a modifier: the keyboard that fades leaves them', () => {
		const rules: MasteryRules = {
			acquiredMinAttempts: 20,
			acquiredMaxErrorRate: 0.1,
			fragileMinAttempts: 5,
			fragileMinErrorRate: 0.2
		};
		const learned = ['f', 'j', ' ', 'F', 'J', '1', '@', 'à'];
		const known = { attempts: 30, errors: 0, latencyMs: null };
		const progress: ProgressState = {
			lessons: {},
			chars: Object.fromEntries(
				learned.map((char) => [char, { attempts: 30, errors: 0, recent: [known] }])
			)
		};
		const faded = fadedKeys(progress, learned, charIndex, rules);
		expect(faded).toContain('KeyF');
		for (const press of [pressOf(' '), BACKSPACE]) {
			expect(litTarget(press, faded, false, fingering).target).toEqual(press);
		}
		for (const char of ['F', '1', '@']) {
			const press = pressOf(char);
			expect(litTarget(press, faded, false, fingering).modifiers).toEqual(
				faded.includes(press.code) ? modifierCodes(press, fingering) : []
			);
		}
	});

	it('lights the key expected, or none; none only for a faded key without help', () => {
		const presses = [...charIndex.values()]
			.map((ways) => ways[0]?.[0])
			.filter((press): press is KeyPress => press !== undefined);
		const codes = [...new Set(presses.map((press) => press.code))];
		fc.assert(
			fc.property(
				fc.constantFrom(...presses),
				fc.subarray(codes),
				fc.boolean(),
				(press, faded, helped) => {
					const lit = litTarget(press, faded, helped, fingering);
					const dark = !helped && faded.includes(press.code);
					expect(lit.target).toEqual(dark ? null : press);
					expect(lit.modifiers).toEqual(dark ? modifierCodes(press, fingering) : []);
				}
			)
		);
	});
});
