import { fingerForKey } from '$lib/keyboard/fingering';
import type {
	FingeringProfile,
	KeyCode,
	KeyOutput,
	KeyPress,
	LayoutDefinition
} from '$lib/keyboard/types';

const SHIFT_BY_OPPOSITE_HAND = { left: 'ShiftRight', right: 'ShiftLeft' } as const;
const DEFAULT_SHIFT = 'ShiftLeft';
const ALTGR = 'AltRight';
const INDEX_FINGERS = ['left-index', 'right-index'] as const;

function outputText(layout: LayoutDefinition, output: KeyOutput | undefined): string | null {
	if (output === undefined) return null;
	if (typeof output === 'string') return output;
	return Object.hasOwn(layout.deadKeys, output.dead)
		? (layout.deadKeys[output.dead]?.standalone ?? null)
		: null;
}

/**
 * Character printed on a physical key of a real keyboard: capital letters, the isolated sign
 * for a dead key, an empty string for Space. `null` when the layout does not define the key.
 */
export function keyLabel(layout: LayoutDefinition, code: KeyCode): string | null {
	if (!Object.hasOwn(layout.keys, code)) return null;
	const levels = layout.keys[code];
	const base = outputText(layout, levels?.base ?? levels?.shift);
	if (base === null) return null;
	if (base === ' ') return '';
	const shifted = outputText(layout, levels?.shift);
	const isLetterKey =
		typeof levels?.base === 'string' &&
		shifted !== null &&
		shifted !== base &&
		shifted === base.toLocaleUpperCase(layout.locale);
	return isLetterKey ? shifted : base;
}

/** Character produced by a key press, as shown to the child (base level uses the printed label). */
export function pressLabel(layout: LayoutDefinition, press: KeyPress): string | null {
	if (press.level === 'base') return keyLabel(layout, press.code);
	if (!Object.hasOwn(layout.keys, press.code)) return null;
	return outputText(layout, layout.keys[press.code]?.[press.level]);
}

/** Modifier keys to hold for a press: Shift on the hand opposite to the typing finger, then AltGr. */
export function modifierCodes(press: KeyPress, fingering: FingeringProfile): KeyCode[] {
	const needsShift = press.level === 'shift' || press.level === 'shiftAltgr';
	const needsAltgr = press.level === 'altgr' || press.level === 'shiftAltgr';
	const hand = fingerForKey(fingering, press.code)?.split('-')[0];
	const shift = hand === 'left' || hand === 'right' ? SHIFT_BY_OPPOSITE_HAND[hand] : DEFAULT_SHIFT;
	return [...(needsShift ? [shift] : []), ...(needsAltgr ? [ALTGR] : [])];
}

/** Home keys marked on a real keyboard: the ones under the two index fingers (F and J on AZERTY). */
export function homeKeyCodes(fingering: FingeringProfile): KeyCode[] {
	return INDEX_FINGERS.flatMap((finger) => {
		const code = fingering.homeKeys[finger];
		return code === undefined ? [] : [code];
	});
}
