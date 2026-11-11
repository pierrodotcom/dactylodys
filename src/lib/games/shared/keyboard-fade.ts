import type { CharIndex, KeyCode } from '../../keyboard/types';

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
