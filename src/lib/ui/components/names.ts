import { fingerForKey } from '$lib/keyboard/fingering';
import type {
	Finger,
	FingeringProfile,
	KeyCode,
	KeyPress,
	LayoutDefinition,
	ModifierLevel
} from '$lib/keyboard/types';
import { m } from '$lib/paraglide/messages.js';
import { pressLabel } from './key-labels';

const KEY_NAMES: Readonly<Record<KeyCode, () => string>> = {
	Space: m.ui_key_space,
	ShiftLeft: m.ui_key_shift,
	ShiftRight: m.ui_key_shift,
	Tab: m.ui_key_tab,
	Enter: m.ui_key_enter,
	Backspace: m.ui_key_backspace,
	CapsLock: m.ui_key_caps_lock,
	ControlLeft: m.ui_key_control,
	ControlRight: m.ui_key_control,
	AltLeft: m.ui_key_alt,
	AltRight: m.ui_key_alt_gr
};

const FINGER_NAMES: Readonly<Record<Finger, () => string>> = {
	'left-pinky': m.ui_finger_left_pinky,
	'left-ring': m.ui_finger_left_ring,
	'left-middle': m.ui_finger_left_middle,
	'left-index': m.ui_finger_left_index,
	'left-thumb': m.ui_finger_left_thumb,
	'right-thumb': m.ui_finger_right_thumb,
	'right-index': m.ui_finger_right_index,
	'right-middle': m.ui_finger_right_middle,
	'right-ring': m.ui_finger_right_ring,
	'right-pinky': m.ui_finger_right_pinky
};

const HINT_MESSAGES: Readonly<
	Record<ModifierLevel, (inputs: { key: string; finger: string }) => string>
> = {
	base: m.ui_finger_hint,
	shift: m.ui_finger_hint_shift,
	altgr: m.ui_finger_hint_altgr,
	shiftAltgr: m.ui_finger_hint_shift_altgr
};

/** Name of a key that is not printed with a character: Space, Shift, Enter... */
export function keyName(code: KeyCode): string | null {
	return Object.hasOwn(KEY_NAMES, code) ? (KEY_NAMES[code]?.() ?? null) : null;
}

export function fingerName(finger: Finger): string {
	return FINGER_NAMES[finger]();
}

/** One short sentence naming the key to press and the finger to use, e.g. "Touche F — index gauche". */
export function fingerHint(
	layout: LayoutDefinition,
	fingering: FingeringProfile,
	target: KeyPress | null
): string {
	if (target === null) return m.ui_finger_hint_none();
	const printed = pressLabel(layout, target);
	const key = printed ? printed : (keyName(target.code) ?? target.code);
	const finger = fingerForKey(fingering, target.code);
	return HINT_MESSAGES[target.level]({
		key,
		finger: finger === null ? m.ui_finger_free() : fingerName(finger)
	});
}
