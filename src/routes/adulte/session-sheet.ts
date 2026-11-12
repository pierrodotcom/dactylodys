import { findLesson, lessonIds } from '$lib/engine/progression/definition';
import { masteryGroups } from '$lib/engine/progression/mastery';
import type { ProgressionDefinition } from '$lib/engine/progression/types';
import type { CharIndex } from '$lib/keyboard/types';
import type { Profile } from '$lib/state/types';
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
	/** Play time after which the game suggests a break. */
	readonly breakAfterMinutes: number;
	/** Finished games after which the game suggests a break; 0: only the time counts. */
	readonly breakAfterExercises: number;
}

export interface SessionSheetInput {
	readonly profile: Profile;
	readonly progression: ProgressionDefinition | undefined;
	/** `null` while the layout of the child is not loaded, or when it could not be. */
	readonly charIndex: CharIndex | null;
	readonly rules: Pick<AdultRules, 'mastery' | 'hesitation'>;
	readonly playRules: Pick<PlayRules, 'breakAfterMinutes' | 'breakAfterExercises'>;
	readonly compare: (first: string, second: string) => number;
}

function currentLesson(
	progression: ProgressionDefinition | undefined,
	profile: Profile
): SheetLesson | null {
	if (!progression) return null;
	const id = focusLessonId(progression, profile.progress, profile.openedWorldIds);
	if (id === null) return null;
	const lesson = findLesson(progression, id);
	const world = worldOfLesson(progression, id);
	if (!lesson || !world) return null;
	return {
		worldTitle: world.title,
		title: lesson.title,
		number: lessonIds(progression).indexOf(id) + 1
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
	return {
		lesson: currentLesson(input.progression, profile),
		status: !typed ? 'first' : flagged ? 'keys' : 'quiet',
		learning: groups.learning,
		fragile: groups.fragile,
		hesitant,
		breakAfterMinutes: playRules.breakAfterMinutes,
		breakAfterExercises: playRules.breakAfterExercises
	};
}
