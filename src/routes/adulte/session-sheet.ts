import { findLesson, lessonIds, lessonNumber } from '$lib/engine/progression/definition';
import { masteryGroups } from '$lib/engine/progression/mastery';
import type { ProgressionDefinition } from '$lib/engine/progression/types';
import type { CharIndex } from '$lib/keyboard/types';
import type { Profile } from '$lib/state/types';
import { isEarlyLesson } from '../jouer/break';
import { focusLessonId, worldOfLesson } from '../jouer/map';
import type { PlayRules } from '../jouer/play-rules';
import type { AdultRules } from './adult-rules';
import { hesitantKeys } from './report';

/** The lesson the child plays now: the most advanced open one, as the map shows it. */
export interface SheetLesson {
	readonly worldTitle: string;
	readonly title: string;
	/** Rank in the whole progression, from 1. */
	readonly number: number;
}

/**
 * What the keys say today. `first`: nothing typed yet; `quiet`: typed, nothing to point out;
 * `keys`: at least one of the lists is not empty.
 */
export type SheetKeysStatus = 'first' | 'quiet' | 'keys';

/** The part of a session sheet that depends on the child; the rest is the same for every child. */
export interface SessionSheet {
	readonly lesson: SheetLesson | null;
	readonly status: SheetKeysStatus;
	/** Typed, but neither acquired nor fragile yet (the report's « pas encore assez tapées »). */
	readonly learning: readonly string[];
	/** Often wrong lately. */
	readonly fragile: readonly string[];
	/** Acquired, but long to find (ADR-056); empty while the layout is unknown. */
	readonly hesitant: readonly string[];
	/** Time spent in the games after which the game suggests a break, for this child. */
	readonly breakAfterMinutes: number;
	/**
	 * Finished games after which the game suggests a break, where the child is now and with the
	 * length of session the adult chose; 0: the games are not counted.
	 */
	readonly breakAfterExercises: number;
	/**
	 * Minutes spent typing after which it suggests one; `null` in the first worlds, where only the
	 * games are counted.
	 */
	readonly breakAfterTypingMinutes: number | null;
}

export interface SessionSheetInput {
	readonly profile: Profile;
	readonly progression: ProgressionDefinition | undefined;
	/** `null` while the layout of the child is not loaded, or when it could not be. */
	readonly charIndex: CharIndex | null;
	readonly rules: Pick<AdultRules, 'mastery' | 'hesitation'>;
	readonly playRules: Pick<PlayRules, 'sessionLengths' | 'earlyWorlds'>;
	readonly compare: (first: string, second: string) => number;
}

/** The lesson the map proposes to the child, if any. */
function focusOf(progression: ProgressionDefinition | undefined, profile: Profile): string | null {
	if (!progression) return null;
	return focusLessonId(
		progression,
		profile.progress,
		profile.openedWorldIds,
		profile.keptOpenLessonIds
	);
}

/** The lesson the child plays now, as the map proposes it; also said at the top of the report. */
export function currentLesson(
	progression: ProgressionDefinition | undefined,
	profile: Profile
): SheetLesson | null {
	const id = focusOf(progression, profile);
	if (!progression || id === null) return null;
	const lesson = findLesson(progression, id);
	const world = worldOfLesson(progression, id);
	if (!lesson || !world) return null;
	return {
		worldTitle: world.title,
		title: lesson.title,
		// The number the child reads on the map; the lesson proposed is never a detour.
		number: lessonNumber(progression, id) ?? lessonIds(progression).indexOf(id) + 1
	};
}

/** Computed from the profile each time: the sheet stores nothing. */
export function sessionSheet(input: SessionSheetInput): SessionSheet {
	const { profile, charIndex, rules, playRules, compare } = input;
	const groups = masteryGroups(profile.progress, rules.mastery, compare);
	const hesitant = charIndex
		? hesitantKeys(profile.progress, charIndex, rules.mastery, rules.hesitation, compare)
		: [];
	const typed = groups.acquired.length + groups.fragile.length + groups.learning.length > 0;
	const flagged = groups.learning.length + groups.fragile.length + hesitant.length > 0;
	const length = playRules.sessionLengths[profile.settings.sessionLength];
	// A child who has not started, or whose lessons are unknown, is counted as a beginner.
	const focus = focusOf(input.progression, profile);
	const early =
		!input.progression ||
		(focus === null
			? !typed
			: isEarlyLesson({ earlyWorlds: playRules.earlyWorlds }, input.progression, focus));
	return {
		lesson: currentLesson(input.progression, profile),
		status: !typed ? 'first' : flagged ? 'keys' : 'quiet',
		learning: groups.learning,
		fragile: groups.fragile,
		hesitant,
		breakAfterMinutes: length.clockMinutes,
		breakAfterExercises: early ? length.earlyExercises : length.exercises,
		breakAfterTypingMinutes: early ? null : length.typingMinutes
	};
}
