import { describe, expect, it } from 'vitest';
import { loadFingeringProfile, loadLayout } from '$lib/keyboard/registry';
import { homeKeyCodes, keyLabel, modifierCodes, pressLabel } from './key-labels';

const layout = await loadLayout('fr-fr-azerty-pc');
const fingering = await loadFingeringProfile('ten-fingers-iso');

describe('keyLabel', () => {
	it('prints letters in capitals, like a real keyboard', () => {
		expect(keyLabel(layout, 'KeyF')).toBe('F');
		expect(keyLabel(layout, 'KeyA')).toBe('Q');
		expect(keyLabel(layout, 'Semicolon')).toBe('M');
	});

	it('keeps the base sign of keys whose shifted level is not the capital', () => {
		expect(keyLabel(layout, 'Digit2')).toBe('é');
		expect(keyLabel(layout, 'Quote')).toBe('ù');
	});

	it('prints the isolated sign of a dead key', () => {
		expect(keyLabel(layout, 'BracketLeft')).toBe('^');
	});

	it('prints nothing on Space', () => {
		expect(keyLabel(layout, 'Space')).toBe('');
	});

	it('returns null for a key the layout does not define', () => {
		expect(keyLabel(layout, 'Tab')).toBeNull();
		expect(keyLabel(layout, 'constructor')).toBeNull();
	});
});

describe('pressLabel', () => {
	it('uses the printed label at base level', () => {
		expect(pressLabel(layout, { code: 'KeyF', level: 'base' })).toBe('F');
	});

	it('uses the produced character at the other levels', () => {
		expect(pressLabel(layout, { code: 'KeyF', level: 'shift' })).toBe('F');
		expect(pressLabel(layout, { code: 'Digit1', level: 'shift' })).toBe('1');
		expect(pressLabel(layout, { code: 'KeyE', level: 'altgr' })).toBe('€');
	});

	it('returns null for a level the key does not have', () => {
		expect(pressLabel(layout, { code: 'KeyF', level: 'altgr' })).toBeNull();
	});
});

describe('modifierCodes', () => {
	it('needs no modifier at base level', () => {
		expect(modifierCodes({ code: 'KeyF', level: 'base' }, fingering)).toEqual([]);
	});

	it('uses the Shift key of the hand that does not type the key', () => {
		expect(modifierCodes({ code: 'KeyF', level: 'shift' }, fingering)).toEqual(['ShiftRight']);
		expect(modifierCodes({ code: 'KeyJ', level: 'shift' }, fingering)).toEqual(['ShiftLeft']);
	});

	it('uses AltRight for AltGr, and both keys for Shift with AltGr', () => {
		expect(modifierCodes({ code: 'KeyE', level: 'altgr' }, fingering)).toEqual(['AltRight']);
		expect(modifierCodes({ code: 'KeyE', level: 'shiftAltgr' }, fingering)).toEqual([
			'ShiftRight',
			'AltRight'
		]);
	});

	it('falls back to the left Shift key when the key has no finger', () => {
		expect(modifierCodes({ code: 'Unknown', level: 'shift' }, fingering)).toEqual(['ShiftLeft']);
	});
});

describe('homeKeyCodes', () => {
	it('returns the home keys of the two index fingers', () => {
		expect(homeKeyCodes(fingering)).toEqual(['KeyF', 'KeyJ']);
	});
});
