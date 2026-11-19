import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isDetour, parseProgression } from '$lib/engine/progression/definition';
import { charMastery } from '$lib/engine/progression/mastery';
import type { CharSample, LessonProgress, ProgressState } from '$lib/engine/progression/types';
import { buildCharIndex, parseLayout } from '$lib/keyboard/layout';
import { CHAR_DAYS_RULES } from '$lib/state/char-days';
import { createProfile } from '$lib/state/profile';
import type { Profile } from '$lib/state/types';
import { ADULT_RULES } from './adult-rules';
import {
	adultKeyStates,
	hesitantKeys,
	isTypedOnDays,
	keyMasteries,
	sortChildren,
	worldSummaries
} from './report';

const progression = parseProgression(
	JSON.parse(readFileSync('content/fr/progression/azerty-decouverte.json', 'utf8'))
);
const charIndex = buildCharIndex(
	parseLayout(JSON.parse(readFileSync('layouts/fr-fr-azerty-pc.json', 'utf8')))
);
const ACQUIRED: CharSample = { attempts: 30, errors: 0, latencyMs: null };
const FRAGILE: CharSample = { attempts: 30, errors: 15, latencyMs: null };
const collator = new Intl.Collator('fr');

function progressOf(chars: Record<string, CharSample>): ProgressState {
	return {
		lessons: {},
		chars: Object.fromEntries(
			Object.entries(chars).map(([char, sample]) => [
				char,
				{ attempts: sample.attempts, errors: sample.errors, recent: [sample] }
			])
		)
	};
}

function timed(sample: CharSample, latencyMs: number): CharSample {
	return { ...sample, latencyMs };
}

/** Acquired keys found in 300 ms, the time of the child, plus those given. */
function steadyWith(chars: Record<string, CharSample>): ProgressState {
	const steady = Object.fromEntries(
		['s', 'd', 'j', 'k', 'l'].map((char) => [char, timed(ACQUIRED, 300)])
	);
	return progressOf({ ...steady, ...chars });
}

function hesitant(progress: ProgressState): readonly string[] {
	return hesitantKeys(
		progress,
		charIndex,
		ADULT_RULES.mastery,
		ADULT_RULES.hesitation,
		collator.compare
	);
}

describe('worldSummaries', () => {
	it('counts the lessons passed and the stars of each world', () => {
		const [first] = progression.worlds;
		const [lesson] = first?.lessons ?? [];
		if (!first || !lesson) throw new Error('no lesson');
		const progress: ProgressState = {
			lessons: { [lesson.id]: { bestAccuracy: 100, stars: 2, attempts: 1, lastPlayedAt: 1 } },
			chars: {}
		};
		const [summary, ...others] = worldSummaries(progression, progress);
		// Its grand tour, a detour, is not counted before it is passed.
		const onTheWay = first.lessons.filter((each) => !isDetour(each)).length;
		expect(summary).toMatchObject({
			worldId: first.id,
			lessonCount: onTheWay,
			lessonsPassed: 1,
			stars: 2,
			maxStars: onTheWay * 3
		});
		expect(others.every((world) => world.lessonsPassed === 0 && world.stars === 0)).toBe(true);
	});

	it('counts a grand tour like a detour: only once the child passed it (ADR-075, choice 3)', () => {
		const [first] = progression.worlds;
		const tour = first?.lessons.find((lesson) => lesson.tour !== undefined);
		if (!first || !tour) throw new Error('no grand tour');
		const passed: LessonProgress = { bestAccuracy: 92, stars: 2, attempts: 3, lastPlayedAt: 1 };
		const onTheWay = first.lessons.filter((lesson) => !isDetour(lesson));
		const wayDone = Object.fromEntries(onTheWay.map((lesson) => [lesson.id, passed]));
		const summaryOf = (lessons: ProgressState['lessons']) =>
			worldSummaries(progression, { lessons, chars: {} })[0];
		expect(summaryOf(wayDone)?.lessonCount).toBe(onTheWay.length);
		// Played but not passed: not counted yet.
		const tried = { ...passed, bestAccuracy: 60, stars: 0 as const };
		expect(summaryOf({ ...wayDone, [tour.id]: tried })?.lessonCount).toBe(onTheWay.length);
		expect(summaryOf({ ...wayDone, [tour.id]: passed })).toMatchObject({
			lessonCount: onTheWay.length + 1,
			lessonsPassed: onTheWay.length + 1,
			stars: (onTheWay.length + 1) * 2
		});
	});

	it('counts a detour only once the child passed it: a way finished is never short of a lesson', () => {
		const world = progression.worlds.find((each) => each.lessons.some(isDetour));
		if (!world) throw new Error('no detour');
		const onTheWay = world.lessons.filter((lesson) => !isDetour(lesson));
		const [detour] = world.lessons.filter(isDetour);
		if (!detour) throw new Error('no detour');
		const passed: LessonProgress = { bestAccuracy: 100, stars: 3, attempts: 1, lastPlayedAt: 1 };
		const wayDone = Object.fromEntries(onTheWay.map((lesson) => [lesson.id, passed]));
		const summaryOf = (lessons: ProgressState['lessons']) =>
			worldSummaries(progression, { lessons, chars: {} }).find(
				(summary) => summary.worldId === world.id
			);

		expect(summaryOf(wayDone)).toMatchObject({
			lessonCount: onTheWay.length,
			lessonsPassed: onTheWay.length,
			maxStars: onTheWay.length * 3
		});
		expect(summaryOf({ ...wayDone, [detour.id]: passed })).toMatchObject({
			lessonCount: onTheWay.length + 1,
			lessonsPassed: onTheWay.length + 1,
			maxStars: (onTheWay.length + 1) * 3
		});
	});
});

describe('keyMasteries', () => {
	it('colours the key of each character typed, and leaves out the others', () => {
		const keys = keyMasteries(
			progressOf({ q: ACQUIRED, s: FRAGILE }),
			charIndex,
			ADULT_RULES.mastery
		);
		expect(keys.get('KeyA')).toBe('acquired');
		expect(keys.get('KeyS')).toBe('fragile');
		expect(keys.has('KeyD')).toBe(false);
	});

	it('lets the weakest character of a key win', () => {
		const keys = keyMasteries(
			progressOf({ q: ACQUIRED, Q: FRAGILE }),
			charIndex,
			ADULT_RULES.mastery
		);
		expect(keys.get('KeyA')).toBe('fragile');
	});

	it('puts a character typed after a dead key on its letter', () => {
		const keys = keyMasteries(progressOf({ ê: FRAGILE }), charIndex, ADULT_RULES.mastery);
		expect(keys.get('KeyE')).toBe('fragile');
	});
});

describe('hesitantKeys', () => {
	it('lists an acquired key found much later than the other keys of the child', () => {
		const progress = steadyWith({ f: timed(ACQUIRED, 600), g: timed(ACQUIRED, 400) });
		expect(hesitant(progress)).toEqual(['f']);
	});

	it('counts a key whose time is exactly the factor times the median', () => {
		const factor = ADULT_RULES.hesitation.factor;
		expect(hesitant(steadyWith({ f: timed(ACQUIRED, 300 * factor) }))).toEqual(['f']);
		expect(hesitant(steadyWith({ f: timed(ACQUIRED, 300 * factor - 1) }))).toEqual([]);
	});

	it('lists nothing while fewer keys than the minimum have a time', () => {
		const { minKeys } = ADULT_RULES.hesitation;
		const few = Object.fromEntries(
			['s', 'd', 'j', 'k', 'l'].slice(0, minKeys - 2).map((char) => [char, timed(ACQUIRED, 300)])
		);
		expect(hesitant(progressOf({ ...few, f: timed(ACQUIRED, 3000) }))).toEqual([]);
	});

	it('never lists a fragile key, however long it takes', () => {
		expect(hesitant(steadyWith({ f: timed(FRAGILE, 3000) }))).toEqual([]);
	});

	it('neither measures nor lists a key with fewer right keystrokes than the minimum', () => {
		const { minCorrect } = ADULT_RULES.hesitation;
		const few: CharSample = { attempts: minCorrect - 1, errors: 0, latencyMs: 3000 };
		expect(hesitant(steadyWith({ f: few }))).toEqual([]);
		const fourMeasured = progressOf({
			s: timed(ACQUIRED, 300),
			d: timed(ACQUIRED, 300),
			j: timed(ACQUIRED, 300),
			f: few,
			g: timed(ACQUIRED, 3000)
		});
		expect(hesitant(fourMeasured)).toEqual([]);
	});

	it('gathers the small letter and the capital of a key, and names the key once', () => {
		const progress = steadyWith({
			f: timed(ACQUIRED, 400),
			F: timed({ attempts: 20, errors: 0, latencyMs: null }, 1200)
		});
		expect(hesitant(progress)).toEqual(['f']);
	});

	it('does not count a capital as a key of its own among the keys with a time', () => {
		const progress = progressOf({
			s: timed(ACQUIRED, 300),
			d: timed(ACQUIRED, 300),
			f: timed(ACQUIRED, 300),
			F: timed(ACQUIRED, 300),
			k: timed(ACQUIRED, 3000)
		});
		expect(hesitant(progress)).toEqual([]);
	});

	it('lists nothing for a profile whose plays were kept without a time', () => {
		const progress = steadyWith({ f: ACQUIRED });
		const untimed = progressOf(
			Object.fromEntries(Object.keys(progress.chars).map((char) => [char, ACQUIRED]))
		);
		expect(hesitant(untimed)).toEqual([]);
	});
});

describe('sortChildren', () => {
	it('orders the children by nickname, never by what they did', () => {
		const make = (id: string, name: string, now: number) =>
			createProfile({ id, name, now, platform: 'pc' });
		const sorted = sortChildren(
			[make('1', 'Zoé', 1), make('2', 'ali', 2), make('3', 'Élio', 3), make('4', 'ali', 0)],
			new Intl.Collator('fr').compare
		);
		expect(sorted.map((profile) => profile.id)).toEqual(['4', '2', '3', '1']);
	});
});

describe('adultKeyStates (P-17)', () => {
	const RULES = ADULT_RULES;
	const day = (on: string | null, attempts: number, errors = 0) => ({ day: on, attempts, errors });
	const THREE_DAYS = [day('2026-11-17', 14), day('2026-11-18', 14), day('2026-11-19', 14)];

	function statesOf(progress: ProgressState, charDays: Profile['charDays']) {
		return adultKeyStates({ progress, charDays }, charIndex, RULES, collator.compare);
	}

	it('calls a key typed right on three days acquired', () => {
		const states = statesOf(progressOf({ f: ACQUIRED }), { f: THREE_DAYS });
		expect(states.groups.acquired).toEqual(['f']);
		expect(states.keys.get('KeyF')).toBe('acquired');
	});

	it('says only « typed right » of a key typed right in one evening, however many times', () => {
		const states = statesOf(progressOf({ f: ACQUIRED }), { f: [day('2026-11-19', 200)] });
		expect(states.groups.acquired).toEqual([]);
		expect(states.groups['typed-right']).toEqual(['f']);
		expect(states.keys.get('KeyF')).toBe('typed-right');
	});

	it('asks for enough keystrokes over the days, and few errors', () => {
		const few = [day('2026-11-17', 13), day('2026-11-18', 13), day('2026-11-19', 13)];
		expect(statesOf(progressOf({ f: ACQUIRED }), { f: few }).groups.acquired).toEqual([]);
		const wrong = [day('2026-11-17', 14, 2), day('2026-11-18', 14, 2), day('2026-11-19', 14, 1)];
		expect(statesOf(progressOf({ f: ACQUIRED }), { f: wrong }).groups.acquired).toEqual([]);
		const atTheLimit = [
			day('2026-11-17', 14, 2),
			day('2026-11-18', 14, 1),
			day('2026-11-19', 12, 1)
		];
		expect(statesOf(progressOf({ f: ACQUIRED }), { f: atTheLimit }).groups.acquired).toEqual(['f']);
	});

	it('counts the days of a profile older than version 18 as one day', () => {
		const days = [day(null, 30), day('2026-11-18', 10)];
		expect(statesOf(progressOf({ f: ACQUIRED }), { f: days }).groups.acquired).toEqual([]);
		const later = [...days, day('2026-11-19', 10)];
		expect(statesOf(progressOf({ f: ACQUIRED }), { f: later }).groups.acquired).toEqual(['f']);
	});

	it('never calls acquired a key the child is long to find (ADR-056)', () => {
		const progress = steadyWith({ m: timed(ACQUIRED, 900) });
		const charDays = Object.fromEntries(
			['s', 'd', 'j', 'k', 'l', 'm'].map((char) => [char, THREE_DAYS])
		);
		const states = statesOf(progress, charDays);
		expect(states.hesitant).toEqual(['m']);
		expect(states.groups['typed-right']).toEqual(['m']);
		expect(states.groups.acquired).toEqual(['d', 'j', 'k', 'l', 's']);
	});

	it('follows the recent results first: a key wrong lately is fragile, whatever its days', () => {
		const states = statesOf(progressOf({ f: FRAGILE }), { f: THREE_DAYS });
		expect(states.groups.fragile).toEqual(['f']);
		expect(states.keys.get('KeyF')).toBe('fragile');
	});

	it('gives a key the weakest state of its characters', () => {
		const states = statesOf(progressOf({ e: ACQUIRED, E: FRAGILE }), { e: THREE_DAYS });
		expect(states.keys.get('KeyE')).toBe('fragile');
	});

	it('never calls acquired a key that is not typed right, and puts each character in one group', () => {
		const sampleArb = fc
			.record({ attempts: fc.integer({ min: 1, max: 60 }), errors: fc.nat({ max: 60 }) })
			.map(({ attempts, errors }) => ({
				attempts,
				errors: Math.min(attempts, errors),
				latencyMs: null
			}));
		const daysArb = fc.array(
			fc.record({ attempts: fc.integer({ min: 1, max: 40 }), errors: fc.nat({ max: 8 }) }),
			{ maxLength: 5 }
		);
		const chars = ['f', 'j', 'd', 'k', 'é', 'E'];
		fc.assert(
			fc.property(
				fc.dictionary(
					fc.constantFrom(...chars),
					fc.array(sampleArb, { minLength: 1, maxLength: 3 })
				),
				fc.dictionary(fc.constantFrom(...chars), daysArb),
				(recents, dayCounts) => {
					const progress: ProgressState = {
						lessons: {},
						chars: Object.fromEntries(
							Object.entries(recents).map(([char, recent]) => [
								char,
								{
									attempts: recent.reduce((sum, sample) => sum + sample.attempts, 0),
									errors: recent.reduce((sum, sample) => sum + sample.errors, 0),
									recent
								}
							])
						)
					};
					const charDays = Object.fromEntries(
						Object.entries(dayCounts).map(([char, counts]) => [
							char,
							counts.map((count, index) => ({
								day: `2026-11-${String(10 + index).padStart(2, '0')}`,
								attempts: count.attempts,
								errors: Math.min(count.attempts, count.errors)
							}))
						])
					);
					const states = statesOf(progress, charDays);
					for (const char of states.groups.acquired) {
						expect(charMastery(progress, char, RULES.mastery)).toBe('acquired');
						expect(isTypedOnDays(charDays[char] ?? [], RULES.acquired)).toBe(true);
					}
					const grouped = Object.values(states.groups).flat();
					expect([...grouped].sort()).toEqual(Object.keys(progress.chars).sort());
				}
			)
		);
	});

	it('is read on days the profile keeps: they cover what an acquired key asks for', () => {
		expect(CHAR_DAYS_RULES.keptKeystrokes).toBeGreaterThanOrEqual(RULES.acquired.minAttempts);
		expect(CHAR_DAYS_RULES.keptDays).toBeGreaterThanOrEqual(RULES.acquired.minDays);
		expect(RULES.acquired.minAttempts).toBeGreaterThan(RULES.mastery.acquiredMinAttempts);
	});
});
