import type { CharIndex, KeyCode } from '../../keyboard/types';
import { charMastery } from './mastery';
import type { MasteryRules, ProgressState } from './types';

/** Space and line breaks leave no letter to fade on their key. */
const BLANK_PATTERN = /^\s+$/u;

/**
 * The characters the progression has brought so far on each physical key: those of the presses of
 * the first way the layout produces them, as the keyboard drawn in the games shows it (`Shift` and
 * `AltGr` are levels of a press, never keys of their own).
 */
export function charsByKey(
	charIndex: CharIndex,
	learned: readonly string[]
): ReadonlyMap<KeyCode, readonly string[]> {
	const byKey = new Map<KeyCode, string[]>();
	for (const char of learned) {
		if (BLANK_PATTERN.test(char)) continue;
		for (const press of charIndex.get(char)?.[0] ?? []) {
			const chars = byKey.get(press.code);
			if (chars === undefined) byKey.set(press.code, [char]);
			else if (!chars.includes(char)) chars.push(char);
		}
	}
	return byKey;
}

/**
 * The keys whose letter fades on the keyboard drawn in the games (ADR-057, proposal 8): every
 * character `learned` brought on the key is acquired (`charMastery`, recent results only). A key
 * with no learned character, Space and the modifiers never fade; one wrong lately is written again.
 * The keys come in the order of the first character learned on them.
 */
export function fadedKeys(
	progress: ProgressState,
	learned: readonly string[],
	charIndex: CharIndex,
	rules: MasteryRules
): KeyCode[] {
	const faded: KeyCode[] = [];
	for (const [code, chars] of charsByKey(charIndex, learned)) {
		if (chars.every((char) => charMastery(progress, char, rules) === 'acquired')) {
			faded.push(code);
		}
	}
	return faded;
}
