import { describe, expect, it } from 'vitest';
import { parseLayout } from '$lib/keyboard/layout';
import type { LayoutDefinition, NormalizedKeystroke } from '$lib/keyboard/types';
import azertyPc from '../../../layouts/fr-fr-azerty-pc.json';
import azertyMac from '../../../layouts/fr-fr-azerty-mac.json';
import { PLAY_RULES } from './play-rules';
import { checkOutcome, chooseCheckSteps, stepMatches, type CheckStep } from './keyboard-check';

const pc = parseLayout(azertyPc);
const mac = parseLayout(azertyMac);

function keystroke(code: string | null, char: string): NormalizedKeystroke {
	return { kind: 'char', char, code, timestamp: 0, composed: false };
}

describe('chooseCheckSteps', () => {
	it.each([
		['PC', pc],
		['Mac', mac]
	])(
		'picks a, z and m on the AZERTY %s layout from the physical keys of the rules',
		(_n, layout) => {
			const steps = chooseCheckSteps(layout, PLAY_RULES.keyboardCheckCodes);

			expect(steps.map((step) => step.char)).toEqual(['a', 'z', 'm']);
			expect(steps.map((step) => step.code)).toEqual(PLAY_RULES.keyboardCheckCodes);
			expect(steps.map((step) => step.label)).toEqual(['A', 'Z', 'M']);
		}
	);

	it('follows the layout, not a fixed alphabet', () => {
		const qwerty: LayoutDefinition = {
			...pc,
			keys: { KeyQ: { base: 'q', shift: 'Q' }, KeyW: { base: 'w', shift: 'W' } }
		};

		const steps = chooseCheckSteps(qwerty, ['KeyQ', 'KeyW']);

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
});

describe('stepMatches', () => {
	const step: CheckStep = { code: 'KeyQ', char: 'a', label: 'A' };

	it('accepts the expected physical key', () => {
		expect(stepMatches(step, keystroke('KeyQ', 'a'))).toBe(true);
	});

	it('refuses another physical key, even when the character is the same', () => {
		expect(stepMatches(step, keystroke('KeyA', 'a'))).toBe(false);
	});

	it('falls back on the produced character when the key is unknown', () => {
		expect(stepMatches(step, keystroke(null, 'a'))).toBe(true);
		expect(stepMatches(step, keystroke(null, 'q'))).toBe(false);
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
