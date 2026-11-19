import { modifierCodes } from '../../keyboard/fingering';
import type { CharIndex, FingeringProfile, KeyCode, KeyPress } from '../../keyboard/types';

/**
 * The keys whose letter is faded right now: those the route faded, except the keys of the
 * characters the child missed in this game, written again until its end (ADR-057).
 */
export function fadedKeysShown(
	faded: readonly KeyCode[],
	charIndex: CharIndex,
	missedChars: readonly string[]
): KeyCode[] {
	if (faded.length === 0) return [];
	const written = new Set(
		missedChars.flatMap((char) => (charIndex.get(char)?.[0] ?? []).map((press) => press.code))
	);
	return faded.filter((code) => !written.has(code));
}

/** What the keyboard drawn lights for the character expected. */
export interface LitTarget {
	/** The key to type, lit on the keyboard and named by the hint of the finger; `null`: none. */
	readonly target: KeyPress | null;
	/** Modifier keys lit on their own: those held with a key that stays dark. */
	readonly modifiers: readonly KeyCode[];
}

/**
 * A key whose letter faded (`faded`, the keys missed in this game already left out) no longer
 * lights when it is expected, and its finger is not named (audit P-07): the child finds it from
 * memory. It lights again while the hand shows it or would show it (`helped`: the child
 * hesitates, a key the lesson brings, every key). Space, Enter, Backspace and the modifiers never
 * fade: Shift or AltGr held with a key that stays dark keep their light.
 */
export function litTarget(
	target: KeyPress | null,
	faded: readonly KeyCode[],
	helped: boolean,
	fingering: FingeringProfile
): LitTarget {
	if (target === null || helped || !faded.includes(target.code)) return { target, modifiers: [] };
	return { target: null, modifiers: modifierCodes(target, fingering) };
}
