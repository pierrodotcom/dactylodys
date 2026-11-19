import { charMastery, type CharMastery, type MasteryRules } from '$lib/engine/progression/mastery';
import { isDetour } from '$lib/engine/progression/definition';
import { isLessonPassed, recentCharLatency } from '$lib/engine/progression/progress';
import type { ProgressionDefinition, ProgressState } from '$lib/engine/progression/types';
import type { CharIndex, KeyCode } from '$lib/keyboard/types';
import type { CharDay, Profile } from '$lib/state/types';
import type { AcquiredRules, AdultRules, HesitationRules } from './adult-rules';

const MAX_STARS_PER_LESSON = 3;

/**
 * What a child did in one world: never compared with another child. A detour counts once the
 * child passed it, never before: a way finished is not short of a lesson.
 */
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
		const passed = (id: string) => isLessonPassed(progression.rules, progress, id);
		const ids = world.lessons
			.filter((lesson) => !isDetour(lesson) || passed(lesson.id))
			.map((lesson) => lesson.id);
		return {
			worldId: world.id,
			title: world.title,
			lessonCount: ids.length,
			lessonsPassed: ids.filter(passed).length,
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
 * The keys typed right (`charMastery`) that the child takes long to find, one character per
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
	return [...hesitantKeyMap(progress, charIndex, mastery, hesitation, compare).values()].sort(
		compare
	);
}

/** The hesitant keys (`hesitantKeys`), by physical key: the character each one is named by. */
function hesitantKeyMap(
	progress: ProgressState,
	charIndex: CharIndex,
	mastery: MasteryRules,
	hesitation: HesitationRules,
	compare: (first: string, second: string) => number
): ReadonlyMap<KeyCode, string> {
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
	if (measured.length < hesitation.minKeys) return new Map();
	const threshold =
		hesitation.factor * median(measured.map(([, key]) => key.weighted / key.correct));
	const masteries = keyMasteries(progress, charIndex, mastery);
	return new Map(
		measured
			.filter(
				([code, key]) =>
					masteries.get(code) === 'acquired' && key.weighted / key.correct >= threshold
			)
			.map(([code, key]) => [code, key.shown])
	);
}

/**
 * Where a character stands for the adult (P-17). `typed-right`: right lately, on its recent
 * results, as the game reads them to fade its letter; `acquired`: typed right on several days as
 * well, and found without hesitating; `fragile`: often wrong lately; `learning`: typed, not enough
 * yet. A character never typed has none.
 */
export type AdultCharState = 'acquired' | 'typed-right' | 'learning' | 'fragile';

/** The weakest character of a key wins: a fragile capital is not hidden by its letter. */
const ADULT_SEVERITY: Readonly<Record<AdultCharState, number>> = {
	acquired: 0,
	'typed-right': 1,
	learning: 2,
	fragile: 3
};

/** What the report says of the keys of a child. */
export interface AdultKeyStates {
	/** The characters typed so far, by state, each group in the order of `compare`. */
	readonly groups: Readonly<Record<AdultCharState, readonly string[]>>;
	/** The physical keys typed so far, each in the weakest state of its characters. */
	readonly keys: ReadonlyMap<KeyCode, AdultCharState>;
	/** The keys typed right but long to find (`hesitantKeys`). */
	readonly hesitant: readonly string[];
}

/**
 * Whether the days kept of a character (`Profile.charDays`) show it typed right on several days:
 * enough keystrokes, on enough days, few of them wrong. The days of a profile older than version
 * 18 make one day without a date: they count once.
 */
export function isTypedOnDays(days: readonly CharDay[], rules: AcquiredRules): boolean {
	let attempts = 0;
	let errors = 0;
	for (const day of days) {
		attempts += day.attempts;
		errors += day.errors;
	}
	if (attempts <= 0) return false;
	const rate = Math.min(1, Math.max(0, errors / attempts));
	return (
		attempts >= rules.minAttempts && days.length >= rules.minDays && rate <= rules.maxErrorRate
	);
}

/**
 * The state of each character the child typed, and of each physical key, for the report. A
 * character typed right (`charMastery` on its recent results, as the game reads them: nothing
 * changes for the child) is acquired once it was typed right on several days (`isTypedOnDays`) and
 * its key is not long to find (`hesitantKeys`): « acquired » implies « typed right ».
 */
export function adultKeyStates(
	profile: Pick<Profile, 'progress' | 'charDays'>,
	charIndex: CharIndex,
	rules: Pick<AdultRules, 'mastery' | 'acquired' | 'hesitation'>,
	compare: (first: string, second: string) => number
): AdultKeyStates {
	const { progress } = profile;
	const hesitant = hesitantKeyMap(progress, charIndex, rules.mastery, rules.hesitation, compare);
	const groups: Record<AdultCharState, string[]> = {
		acquired: [],
		'typed-right': [],
		learning: [],
		fragile: []
	};
	const keys = new Map<KeyCode, AdultCharState>();
	for (const char of Object.keys(progress.chars)) {
		const mastery = charMastery(progress, char, rules.mastery);
		if (mastery === 'new') continue;
		const code = charIndex.get(char)?.[0]?.at(-1)?.code;
		const days = Object.hasOwn(profile.charDays, char) ? (profile.charDays[char] ?? []) : [];
		let state: AdultCharState = mastery;
		if (mastery === 'acquired') {
			const steady = code === undefined || !hesitant.has(code);
			state = steady && isTypedOnDays(days, rules.acquired) ? 'acquired' : 'typed-right';
		}
		groups[state].push(char);
		if (code === undefined) continue;
		const current = keys.get(code);
		if (current === undefined || ADULT_SEVERITY[state] > ADULT_SEVERITY[current]) {
			keys.set(code, state);
		}
	}
	return {
		groups: {
			acquired: groups.acquired.sort(compare),
			'typed-right': groups['typed-right'].sort(compare),
			learning: groups.learning.sort(compare),
			fragile: groups.fragile.sort(compare)
		},
		keys,
		hesitant: [...hesitant.values()].sort(compare)
	};
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
