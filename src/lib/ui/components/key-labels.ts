import { modifierCodes } from '$lib/keyboard/fingering';
import { keyLegend, pressSign } from '$lib/keyboard/legend';
import type { FingeringProfile, KeyCode, KeyPress, LayoutDefinition } from '$lib/keyboard/types';

const INDEX_FINGERS = ['left-index', 'right-index'] as const;

/**
 * Character printed on a physical key of a real keyboard: capital letters, the isolated sign
 * for a dead key, an empty string for Space; the sign without Shift for a key that prints two
 * (`keyLegend` gives both). `null` when the layout does not define the key.
 */
export function keyLabel(layout: LayoutDefinition, code: KeyCode): string | null {
	return keyLegend(layout, code)?.base ?? null;
}

/** Character produced by a key press, as shown to the child (base level uses the printed label). */
export function pressLabel(layout: LayoutDefinition, press: KeyPress): string | null {
	return press.level === 'base' ? keyLabel(layout, press.code) : pressSign(layout, press);
}

export { modifierCodes };

/** Home keys marked on a real keyboard: the ones under the two index fingers (F and J on AZERTY). */
export function homeKeyCodes(fingering: FingeringProfile): KeyCode[] {
	return INDEX_FINGERS.flatMap((finger) => {
		const code = fingering.homeKeys[finger];
		return code === undefined ? [] : [code];
	});
}
