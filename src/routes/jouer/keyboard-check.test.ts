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
