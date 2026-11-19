import { ERASE_CHAR } from '$lib/engine/progression/definition';
import type { LessonDefinition } from '$lib/engine/progression/types';
import { targetKeyPress } from '$lib/games/shared/target';
import { fingerForKey, modifierCodes } from '$lib/keyboard/fingering';
import type {
	CharIndex,
	FingeringProfile,
	Hand,
	KeyCode,
	KeyPress,
	ModifierLevel
} from '$lib/keyboard/types';

const CAPITAL_PATTERN = /^\p{Lu}$/u;
const HANDS: readonly Hand[] = ['left', 'right'];
/** The key that erases, whatever the layout: `KeyboardEvent.code` names it the same everywhere. */
const BACKSPACE: KeyPress = { code: 'Backspace', level: 'base' };
/** From this many keys of one hand on the same level, they are said on one line (« Maj + 1 2 3 4 5 »). */
const ONE_LINE_FROM = 3;

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

/**
 * What the keyboard of the introduction shows. `new`: the keys the lesson brings. `practice`: it
 * brings none, and its data says what it works: the gesture of the capitals (`unlocks`), Backspace
 * in a lesson of repairs (`repair`). `null`: nothing to show, the keyboard is left out.
 */
export interface IntroShown {
	readonly kind: 'new' | 'practice';
	readonly keys: readonly IntroKey[];
}

export function introShown(
	lesson: LessonDefinition,
	fresh: readonly string[],
	charIndex: CharIndex,
	fingering: FingeringProfile
): IntroShown | null {
	const keys = introKeys(lesson, fresh, charIndex, fingering);
	const brought = keys.filter((key) => lesson.newChars.includes(key.char));
	if (brought.length > 0) return { kind: 'new', keys };
	const practised =
		lesson.repair === undefined
			? keys
			: [...keys, { char: ERASE_CHAR, press: BACKSPACE, codes: [BACKSPACE.code] }];
	return practised.length > 0 ? { kind: 'practice', keys: practised } : null;
}

/** A short sentence of the instruction, and the key the hand shows while it is said. */
export interface IntroStep {
	readonly char: string;
	readonly text: string;
	/** `null` when the keyboard shows no key for it: the hand then rests while it is said. */
	readonly press: KeyPress | null;
}

/**
 * The short sentences of the instruction of a lesson (audit P-13), each with its key among the keys
 * the introduction shows (`introShown`), in the order they are said.
 */
export function introSteps(lesson: LessonDefinition, keys: readonly IntroKey[]): IntroStep[] {
	return (lesson.steps ?? []).map((step) => ({
		char: step.char,
		text: step.text,
		press: keys.find((key) => key.char === step.char)?.press ?? null
	}));
}

/** How many keys the heading of the keyboard names: the new ones, else all those shown. */
export function headingCount(lesson: LessonDefinition, shown: IntroShown): number {
	return shown.kind === 'new'
		? shown.keys.filter((key) => lesson.newChars.includes(key.char)).length
		: shown.keys.length;
}

/** A line under the keyboard: one key and its finger, or several keys of one hand. */
export type IntroLine =
	| { readonly kind: 'key'; readonly key: IntroKey }
	| {
			readonly kind: 'hand';
			readonly hand: Hand;
			readonly level: ModifierLevel;
			readonly chars: readonly string[];
	  };

function handOf(fingering: FingeringProfile, key: IntroKey): Hand | null {
	const finger = fingerForKey(fingering, key.press.code);
	return finger === null ? null : (HANDS.find((hand) => finger.startsWith(hand)) ?? null);
}

/**
 * The lines that name the keys shown, in their order: the keys of one hand are said on one line
 * when there are several of them on different keys with the same modifiers (the digits: « Maj + 1
 * 2 3 4 5 — main gauche » rather than five lines); otherwise one line for each key and its finger.
 */
export function introLines(keys: readonly IntroKey[], fingering: FingeringProfile): IntroLine[] {
	const byHand = new Map<Hand, IntroKey[]>();
	for (const key of keys) {
		const hand = handOf(fingering, key);
		if (hand !== null) byHand.set(hand, [...(byHand.get(hand) ?? []), key]);
	}
	const together = new Set<Hand>(
		[...byHand].flatMap(([hand, group]) => {
			const levels = new Set(group.map((key) => key.press.level));
			const codes = new Set(group.map((key) => key.press.code));
			return group.length >= ONE_LINE_FROM && levels.size === 1 && codes.size === group.length
				? [hand]
				: [];
		})
	);
	const lines: IntroLine[] = [];
	for (const key of keys) {
		const hand = handOf(fingering, key);
		if (hand === null || !together.has(hand)) {
			lines.push({ kind: 'key', key });
			continue;
		}
		if (lines.some((line) => line.kind === 'hand' && line.hand === hand)) continue;
		const group = byHand.get(hand) ?? [];
		lines.push({
			kind: 'hand',
			hand,
			level: key.press.level,
			chars: group.map((item) => item.char)
		});
	}
	return lines;
}
