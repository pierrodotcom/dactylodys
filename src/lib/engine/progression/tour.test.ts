import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from '../graphemes';
import { parsePhraseBank, parseWordBank } from './banks';
import { isTour, learnedChars, parseProgression, tourOfWorld, wayCharsOfWorld } from './definition';
import { generateExercise } from './exercise';
import { detourChars, emptyProgress, isLessonUnlocked } from './progress';
import { seededRng } from './test-support';
import { tourKeys, tourKeyWeight } from './tour';
import type { CharProgress, ProgressState } from './types';

/*
 * The grand tour of a world (ADR-075, choice 3): the optional lesson that ends a world and goes
 * over its keys, with words and phrases only, the keys the child masters least more often.
 */

const WORLD_ONE = 'fr.world.one';
const FIRST = 'fr.lesson.first';
const SECOND = 'fr.lesson.second';
const DETOUR = 'fr.lesson.detour';
const TOUR = 'fr.lesson.tour';
const AFTER = 'fr.lesson.after';

function lesson(id: string, newChars: string[], extra: Record<string, unknown> = {}) {
	return {
		id,
		title: id,
		intro: 'Intro.',
		newChars,
		words: [],
		mix: { drills: 1, words: 2, phrases: 1 },
		unlocks: [],
		groupCount: 8,
		targetLength: 30,
		groupLength: [3, 5],
		...extra
	};
}

const TOUR_LESSON = lesson(TOUR, [], {
	mix: { drills: 0, words: 3, phrases: 1 },
	optional: true,
	tour: { worldId: WORLD_ONE }
});

const RULES = {
	unlockAccuracy: 80,
	starThresholds: [80, 90, 97],
	newCharWeight: 0.6,
	weakCharBoost: 2,
	themeBoost: 0,
	newCharMinCount: 0,
	recentCharWindow: 30,
	lengthSlack: 10,
	keyboardFade: {
		acquiredMinAttempts: 20,
		acquiredMaxErrorRate: 0.1,
		fragileMinAttempts: 5,
		fragileMinErrorRate: 0.2
	},
	tour: {
		minWorldKeystrokes: 8,
		keyWeights: { acquired: 1, learning: 2, fragile: 4 },
		scoreShare: 0.6
	}
};

function progressionWith(tour: Record<string, unknown> = TOUR_LESSON, rules: object = RULES) {
	return parseProgression({
		schemaVersion: 1,
		id: 'fr.progression.tours',
		locale: 'fr-FR',
		layoutIds: ['fr-fr-azerty-pc'],
		rules,
		worlds: [
			{
				id: WORLD_ONE,
				title: 'One',
				themeId: 'general',
				gameIds: ['hatching'],
				lessons: [
					lesson(FIRST, ['l', 'e', 'a', 's']),
					lesson(SECOND, [' ', 'r', 'u', 'i']),
					lesson(DETOUR, ['î'], { optional: true }),
					tour
				]
			},
			{
				id: 'fr.world.two',
				title: 'Two',
				themeId: 'general',
				gameIds: ['hatching'],
				lessons: [lesson(AFTER, ['t', 'o'])]
			}
		]
	});
}

const PROGRESSION = progressionWith();

const WORDS = parseWordBank({
	schemaVersion: 1,
	id: 'fr.words.tours',
	locale: 'fr-FR',
	sources: [{ name: 'Test', url: 'https://example.org', license: 'CC0' }],
	themes: [{ id: 'general', title: 'General' }],
	words: [
		'les',
		'rue',
		'lire',
		'rire',
		'sur',
		'sel',
		'ail',
		'lui',
		'rues',
		'salle',
		'ile',
		'île',
		'sire',
		'aile',
		'alors',
		'tes'
	].map((text) => ({ text, themes: ['general'], level: 1, review: 'agent' }))
});

const PHRASES = parsePhraseBank({
	schemaVersion: 1,
	id: 'fr.phrases.tours',
	locale: 'fr-FR',
	phrases: [
		'elle lira sur la rue',
		'les rues sales',
		'il rira seul',
		'le tas est sur la table'
	].map((text) => ({ text, themes: [], level: 1, review: 'agent' }))
});

const ONE_KEYS = ['l', 'e', 'a', 's', ' ', 'r', 'u', 'i'];
const PASSED = { bestAccuracy: 90, stars: 2, attempts: 1, lastPlayedAt: 0 } as const;

function passing(...ids: string[]): ProgressState {
	return { ...emptyProgress(), lessons: Object.fromEntries(ids.map((id) => [id, PASSED])) };
}

function withChars(
	progress: ProgressState,
	chars: Record<string, [number, number]>
): ProgressState {
	const entries = Object.entries(chars).map(
		([char, [attempts, errors]]): [string, CharProgress] => [
			char,
			{ attempts, errors, recent: [{ attempts, errors, latencyMs: null }] }
		]
	);
	return { ...progress, chars: { ...progress.chars, ...Object.fromEntries(entries) } };
}

/** Every key of the world acquired: 30 recent keystrokes, no error. */
function mastering(progress: ProgressState, ...fragile: string[]): ProgressState {
	return withChars(
		progress,
		Object.fromEntries(ONE_KEYS.map((char) => [char, fragile.includes(char) ? [30, 12] : [30, 0]]))
	);
}

function tourOf(progress: ProgressState, seed: number) {
	return generateExercise(PROGRESSION, TOUR, seededRng(seed), {
		words: WORDS,
		phrases: PHRASES,
		progress
	});
}

describe('a grand tour in the progression', () => {
	it('is the detour that ends its world, without new keys', () => {
		const tour = tourOfWorld(PROGRESSION, WORLD_ONE);
		expect(tour?.id).toBe(TOUR);
		expect(tour?.optional).toBe(true);
		expect(tour?.tour).toEqual({ worldId: WORLD_ONE });
		expect(tour && isTour(tour)).toBe(true);
		expect(tourOfWorld(PROGRESSION, 'fr.world.two')).toBeUndefined();
	});

	it('names the keys its world brings on the way, never those of a detour', () => {
		expect(wayCharsOfWorld(PROGRESSION, WORLD_ONE)).toEqual(ONE_KEYS);
	});

	it.each([
		['not last of its world', { lessons: 'tour first' }, /last lesson/],
		['the tour of another world', { tour: { worldId: 'fr.world.two' } }, /the world it ends/],
		['not a detour', { optional: undefined }, /a tour is a detour/],
		['with a new key', { newChars: ['o'] }, /no new character/],
		['with suites', { mix: { drills: 1, words: 1, phrases: 0 } }, /mix\.drills 0/],
		['with an unknown property', { tour: { worldId: WORLD_ONE, keys: [] } }, /unknown property/]
	])('refuses a tour %s', (_name, change, error) => {
		if ('lessons' in change) {
			expect(() =>
				parseProgression({
					schemaVersion: 1,
					id: 'fr.progression.tours',
					locale: 'fr-FR',
					layoutIds: ['fr-fr-azerty-pc'],
					rules: RULES,
					worlds: [
						{
							id: WORLD_ONE,
							title: 'One',
							themeId: 'general',
							gameIds: ['hatching'],
							lessons: [lesson(FIRST, ['l', 'e', 'a', 's']), TOUR_LESSON, lesson(SECOND, [' '])]
						}
					]
				})
			).toThrow(error);
			return;
		}
		expect(() => progressionWith({ ...TOUR_LESSON, ...change })).toThrow(error);
	});

	it('refuses a tour without the rules that say how it is made', () => {
		const withoutTour: Record<string, unknown> = { ...RULES };
		delete withoutTour['tour'];
		expect(() => progressionWith(TOUR_LESSON, withoutTour)).toThrow(/rules\.tour/);
		const withoutFade: Record<string, unknown> = { ...RULES };
		delete withoutFade['keyboardFade'];
		expect(() => progressionWith(TOUR_LESSON, withoutFade)).toThrow(/keyboardFade/);
		const weightless = { ...RULES, tour: { ...RULES.tour, keyWeights: { acquired: 0 } } };
		expect(() => progressionWith(TOUR_LESSON, weightless)).toThrow(/keyWeights/);
	});

	it('knows what a detour brings only for the child who passed it', () => {
		expect(learnedChars(PROGRESSION, TOUR)).not.toContain('î');
		expect(learnedChars(PROGRESSION, DETOUR)).toContain('î');
		expect(detourChars(PROGRESSION, passing(FIRST, SECOND, DETOUR), TOUR)).toEqual(['î']);
	});

	it('opens once the last lesson on the way of its world is passed, its detours left aside', () => {
		const open = (progress: ProgressState) => isLessonUnlocked(PROGRESSION, progress, TOUR);
		expect(open(emptyProgress())).toBe(false);
		expect(open(passing(FIRST))).toBe(false);
		expect(open(passing(FIRST, SECOND))).toBe(true);
		expect(open(passing(FIRST, SECOND, DETOUR))).toBe(true);
		// It goes over a world the child went through: a lesson passed further on does not open it,
		// though it opens the whole way up to it; once passed, it stays open.
		expect(open(passing(AFTER))).toBe(false);
		expect(isLessonUnlocked(PROGRESSION, passing(AFTER), SECOND)).toBe(true);
		expect(open(passing(TOUR))).toBe(true);
	});

	it('holds nothing: the next world opens without it', () => {
		expect(isLessonUnlocked(PROGRESSION, passing(FIRST, SECOND), AFTER)).toBe(true);
	});
});

describe('the keys of a grand tour', () => {
	it('goes over the keys of its world, those of a detour once the child passed it', () => {
		expect(tourKeys(PROGRESSION, emptyProgress(), TOUR)).toEqual(ONE_KEYS);
		expect(tourKeys(PROGRESSION, passing(FIRST, SECOND, DETOUR), TOUR)).toEqual([...ONE_KEYS, 'î']);
		expect(tourKeys(PROGRESSION, emptyProgress(), FIRST)).toEqual([]);
	});

	it('weighs a key by how well the child masters it lately', () => {
		const progress = withChars(emptyProgress(), { a: [30, 0], e: [30, 12], l: [8, 0] });
		const weight = (char: string) => tourKeyWeight(PROGRESSION.rules, progress, char);
		expect(weight('a')).toBe(1);
		expect(weight('e')).toBe(4);
		expect(weight('l')).toBe(2);
		// A key never typed is a key being learned.
		expect(weight('s')).toBe(2);
	});
});

describe('the exercise of a grand tour', () => {
	const seeds = fc.integer({ min: 0, max: 2 ** 31 - 1 });
	const usable = new Set([...WORDS.words.map((word) => word.text)]);
	const phraseTexts = new Set(PHRASES.phrases.map((phrase) => phrase.text));

	it('is made of words and phrases only, never of a suite', () => {
		fc.assert(
			fc.property(seeds, (seed) => {
				for (const group of tourOf(passing(FIRST, SECOND), seed).groups) {
					const whole = phraseTexts.has(group);
					const words = group.split(' ').every((word) => usable.has(word));
					expect(whole || words, group).toBe(true);
				}
			})
		);
	});

	it('asks only what the child knows there, a detour only once passed', () => {
		fc.assert(
			fc.property(seeds, (seed) => {
				const typed = tourOf(passing(FIRST, SECOND), seed).groups.join(' ');
				const known = new Set(learnedChars(PROGRESSION, TOUR));
				expect(toGraphemes(typed).filter((char) => !known.has(char))).toEqual([]);
			})
		);
		const withDetour = Array.from({ length: 30 }, (_, seed) =>
			tourOf(passing(FIRST, SECOND, DETOUR), seed).groups.join(' ')
		).join(' ');
		expect(withDetour).toContain('î');
	});

	it('holds the keystrokes of the world the rules ask, and its length', () => {
		fc.assert(
			fc.property(seeds, (seed) => {
				const groups = tourOf(passing(FIRST, SECOND), seed).groups;
				const typed = toGraphemes(groups.join(''));
				const strokes = typed.filter((char) => ONE_KEYS.includes(char)).length;
				expect(strokes).toBeGreaterThanOrEqual(RULES.tour.minWorldKeystrokes);
				expect(typed.length).toBeLessThanOrEqual(30 + RULES.lengthSlack);
				expect(groups.length).toBeLessThanOrEqual(8);
				groups.forEach((group, i) => expect(group).not.toBe(groups[i - 1]));
			})
		);
	});

	it('gives the same tour for the same seed and the same progress', () => {
		fc.assert(
			fc.property(seeds, (seed) => {
				const progress = mastering(passing(FIRST, SECOND), 'u');
				expect(tourOf(progress, seed)).toEqual(tourOf(progress, seed));
			})
		);
	});

	it('asks a key the child types badly more often than when it is mastered', () => {
		const count = (progress: ProgressState) =>
			Array.from({ length: 200 }, (_, seed) =>
				toGraphemes(tourOf(progress, seed).groups.join('')).filter((char) => char === 'u')
			).flat().length;
		const mastered = count(mastering(passing(FIRST, SECOND)));
		const weak = count(mastering(passing(FIRST, SECOND), 'u'));
		expect(weak).toBeGreaterThan(mastered * 1.3);
	});
});
