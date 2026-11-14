import type { LessonDefinition } from '$lib/engine/progression/types';
import { targetKeyPress } from '$lib/games/shared/target';
import { fingerForKey, modifierCodes } from '$lib/keyboard/fingering';
import type { CharIndex, FingeringProfile, Hand, KeyCode, KeyPress } from '$lib/keyboard/types';

const CAPITAL_PATTERN = /^\p{Lu}$/u;
const HANDS: readonly Hand[] = ['left', 'right'];

/** A key shown before a lesson: the character it gives and how to press it. */
export interface IntroKey {
	readonly char: string;
	readonly press: KeyPress;
	/** Keys lit on the keyboard: the key itself and, for a capital, the key held with it. */
	readonly codes: readonly KeyCode[];
}

/**
 * The keys the introduction of a lesson shows: one for each new character, then, when the lesson
 * unlocks capitals, the gesture once for each hand: the first capital learned (`fresh`, in the
 * order of the progression) whose letter is under a finger of the left hand, and the first under
 * one of the right hand. Nothing is assumed about the layout: hands come from the fingering.
 */
export function introKeys(
	lesson: LessonDefinition,
	fresh: readonly string[],
	charIndex: CharIndex,
	fingering: FingeringProfile
): IntroKey[] {
	const keys: IntroKey[] = [];
	for (const char of lesson.newChars) {
		const press = targetKeyPress(charIndex, char);
		if (press !== null) keys.push({ char, press, codes: [press.code] });
	}
	if (!lesson.unlocks.includes('uppercase')) return keys;
	for (const hand of HANDS) {
		for (const char of fresh) {
			if (!CAPITAL_PATTERN.test(char)) continue;
			const press = targetKeyPress(charIndex, char);
			if (press === null || !fingerForKey(fingering, press.code)?.startsWith(hand)) continue;
			keys.push({ char, press, codes: [press.code, ...modifierCodes(press, fingering)] });
			break;
		}
	}
	return keys;
}
