import { charMastery, type CharMastery, type MasteryRules } from '$lib/engine/progression/mastery';
import { isLessonPassed, recentCharLatency } from '$lib/engine/progression/progress';
import type { ProgressionDefinition, ProgressState } from '$lib/engine/progression/types';
import type { CharIndex, KeyCode } from '$lib/keyboard/types';
import type { Profile } from '$lib/state/types';
import type { HesitationRules } from './adult-rules';

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

interface KeyLatency {
	/** The character of the key with the most recent right keystrokes: the one named in the list. */
	shown: string;
	shownCorrect: number;
	weighted: number;
	correct: number;
}

function median(values: readonly number[]): number {
	const sorted = [...values].sort((first, second) => first - second);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 1
		? (sorted[middle] as number)
		: ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

/**
 * The acquired keys that the child types right but takes long to find, one character per
 * physical key, in the order of `compare`. The time of a key gathers the recent right keystrokes
 * of all its characters (`recentCharLatency`); a key is measured once it has `minCorrect` of
 * them. A key is hesitant when its time is at least `factor` times the median of the measured
 * keys: the child is compared with the child, never with a speed. Below `minKeys` measured keys,
 * none is.
 */
export function hesitantKeys(
	progress: ProgressState,
	charIndex: CharIndex,
	mastery: MasteryRules,
	hesitation: HesitationRules,
	compare: (first: string, second: string) => number
): readonly string[] {
	const latencies = new Map<KeyCode, KeyLatency>();
	for (const char of Object.keys(progress.chars)) {
		const { latencyMs, correct } = recentCharLatency(progress, char);
		if (latencyMs === null) continue;
		const press = charIndex.get(char)?.[0]?.at(-1);
		if (press === undefined) continue;
		const key = latencies.get(press.code);
		if (key === undefined) {
			latencies.set(press.code, {
				shown: char,
				shownCorrect: correct,
				weighted: latencyMs * correct,
				correct
			});
			continue;
		}
		key.weighted += latencyMs * correct;
		key.correct += correct;
		if (
			correct > key.shownCorrect ||
			(correct === key.shownCorrect && compare(char, key.shown) < 0)
		) {
			key.shown = char;
			key.shownCorrect = correct;
		}
	}
	const measured = [...latencies].filter(([, key]) => key.correct >= hesitation.minCorrect);
	if (measured.length < hesitation.minKeys) return [];
	const threshold =
		hesitation.factor * median(measured.map(([, key]) => key.weighted / key.correct));
	const masteries = keyMasteries(progress, charIndex, mastery);
	return measured
		.filter(
			([code, key]) => masteries.get(code) === 'acquired' && key.weighted / key.correct >= threshold
		)
		.map(([, key]) => key.shown)
		.sort(compare);
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
