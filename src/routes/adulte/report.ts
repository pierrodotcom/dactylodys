import { charMastery, type CharMastery, type MasteryRules } from '$lib/engine/progression/mastery';
import { isLessonPassed } from '$lib/engine/progression/progress';
import type { ProgressionDefinition, ProgressState } from '$lib/engine/progression/types';
import type { CharIndex, KeyCode } from '$lib/keyboard/types';
import type { Profile } from '$lib/state/types';

const MAX_STARS_PER_LESSON = 3;

/** What a child did in one world: never compared with another child. */
export interface WorldSummary {
	readonly worldId: string;
	readonly title: string;
	readonly lessonCount: number;
	readonly lessonsPassed: number;
	readonly stars: number;
	readonly maxStars: number;
}

function starsOf(progress: ProgressState, lessonId: string): number {
	return Object.hasOwn(progress.lessons, lessonId) ? (progress.lessons[lessonId]?.stars ?? 0) : 0;
}

export function worldSummaries(
	progression: ProgressionDefinition,
	progress: ProgressState
): readonly WorldSummary[] {
	return progression.worlds.map((world) => {
		const ids = world.lessons.map((lesson) => lesson.id);
		return {
			worldId: world.id,
			title: world.title,
			lessonCount: ids.length,
			lessonsPassed: ids.filter((id) => isLessonPassed(progression.rules, progress, id)).length,
			stars: ids.reduce((sum, id) => sum + starsOf(progress, id), 0),
			maxStars: ids.length * MAX_STARS_PER_LESSON
		};
	});
}

/** What a key shows on the keyboard of the report; a key whose characters were never typed is absent. */
export type KeyMastery = Exclude<CharMastery, 'new'>;

const SEVERITY: Readonly<Record<KeyMastery, number>> = { acquired: 0, learning: 1, fragile: 2 };

/**
 * The mastery of each physical key, from the characters it types last (the letter after a dead
 * key, the key under Shift): the weakest of them wins, so that a fragile capital is not hidden
 * by an acquired small letter on the same key.
 */
export function keyMasteries(
	progress: ProgressState,
	charIndex: CharIndex,
	rules: MasteryRules
): ReadonlyMap<KeyCode, KeyMastery> {
	const keys = new Map<KeyCode, KeyMastery>();
	for (const char of Object.keys(progress.chars)) {
		const mastery = charMastery(progress, char, rules);
		if (mastery === 'new') continue;
		const press = charIndex.get(char)?.[0]?.at(-1);
		if (press === undefined) continue;
		const current = keys.get(press.code);
		if (current === undefined || SEVERITY[mastery] > SEVERITY[current]) {
			keys.set(press.code, mastery);
		}
	}
	return keys;
}

/** The children of the device in alphabetical order of their nicknames, then by creation. */
export function sortChildren(
	profiles: readonly Profile[],
	compare: (first: string, second: string) => number
): readonly Profile[] {
	return [...profiles].sort(
		(first, second) =>
			compare(first.name, second.name) ||
			first.createdAt - second.createdAt ||
			(first.id < second.id ? -1 : first.id > second.id ? 1 : 0)
	);
}
