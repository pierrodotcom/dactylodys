import { describe, expect, it } from 'vitest';
import { parseProgression } from './definition';
import type { AgeBand } from './types';
import { parseWordLimitRules, wordLimits, type WordLimitRules } from './word-limits';

const RULES = {
	unlockAccuracy: 80,
	starThresholds: [80, 90, 97],
	newCharWeight: 0.6,
	weakCharBoost: 2,
	themeBoost: 2,
	newCharMinCount: 0,
	recentCharWindow: 30
};

function world(slug: string, lessons: [string, string[]][]) {
	return {
		id: `fr.world.${slug}`,
		title: slug,
		themeId: 'dinos',
		gameIds: ['hatching'],
		lessons: lessons.map(([id, newChars]) => ({
			id: `fr.lesson.${id}`,
			title: id,
			intro: 'Intro.',
			newChars,
			words: [],
			mix: { drills: 1, words: 0, phrases: 0 },
			unlocks: [],
			groupCount: 6,
			targetLength: 20,
			groupLength: [2, 4]
		}))
	};
}

const PROGRESSION = parseProgression({
	schemaVersion: 1,
	id: 'fr.progression.limits',
	locale: 'fr-FR',
	layoutIds: ['fr-fr-azerty-pc'],
	rules: RULES,
	worlds: [
		world('one', [
			['a', ['f', 'j']],
			['b', ['d', 'k']]
		]),
		world('two', [['c', ['s', 'l']]]),
		world('three', [['d', ['e', 'i']]]),
		world('four', [['e', ['r', 'u']]]),
		world('five', [['f', ['t', 'n']]])
	]
});

const LIMITS: WordLimitRules = {
	maxWordLevel: 3,
	wordLevels: { '8-9': [1, 1, 2, 3], '10-12': [1, 2, 3] },
	shortWords: { beforeLesson: 4, maxLength: 7 }
};

describe('wordLimits', () => {
	it.each<[AgeBand, string, 1 | 2 | 3]>([
		['8-9', 'a', 1],
		['8-9', 'b', 1],
		['8-9', 'c', 1],
		['8-9', 'd', 2],
		['8-9', 'e', 3],
		['8-9', 'f', 3],
		['10-12', 'a', 1],
		['10-12', 'c', 2],
		['10-12', 'd', 3],
		['10-12', 'f', 3]
	])('gives the %s year olds, in lesson %s, the level of its world: %i', (band, id, level) => {
		expect(wordLimits(LIMITS, PROGRESSION, `fr.lesson.${id}`, band).maxLevel).toBe(level);
	});

	it('keeps the words short before the lesson named, whatever the age group', () => {
		for (const band of ['8-9', '10-12', undefined] as const) {
			expect(wordLimits(LIMITS, PROGRESSION, 'fr.lesson.a', band).maxWordLength).toBe(7);
			expect(wordLimits(LIMITS, PROGRESSION, 'fr.lesson.c', band).maxWordLength).toBe(7);
			expect(wordLimits(LIMITS, PROGRESSION, 'fr.lesson.d', band)).not.toHaveProperty(
				'maxWordLength'
			);
		}
	});

	it('only keeps the ceiling without an age group, without steps or for an unknown lesson', () => {
		expect(wordLimits(LIMITS, PROGRESSION, 'fr.lesson.a').maxLevel).toBe(3);
		expect(wordLimits({ maxWordLevel: 2 }, PROGRESSION, 'fr.lesson.a', '8-9')).toEqual({
			maxLevel: 2
		});
		expect(wordLimits(LIMITS, PROGRESSION, 'fr.lesson.unknown', '8-9')).toEqual({ maxLevel: 3 });
		expect(
			wordLimits(
				{ maxWordLevel: 3, wordLevels: { '8-9': [1] } },
				PROGRESSION,
				'fr.lesson.a',
				'10-12'
			)
		).toEqual({ maxLevel: 3 });
	});
});

describe('parseWordLimitRules', () => {
	const VALID = {
		maxWordLevel: 3,
		wordLevels: { '8-9': [1, 1, 2, 3], '10-12': [1, 2, 3] },
		shortWords: { beforeLesson: 12, maxLength: 7 },
		other: 'ignored'
	};

	it('reads the level, the steps of each age group and the short words', () => {
		expect(parseWordLimitRules(VALID, 'rules')).toEqual({
			maxWordLevel: 3,
			wordLevels: { '8-9': [1, 1, 2, 3], '10-12': [1, 2, 3] },
			shortWords: { beforeLesson: 12, maxLength: 7 }
		});
	});

	it('leaves the steps and the short words out when they are absent', () => {
		expect(parseWordLimitRules({ maxWordLevel: 2 }, 'rules')).toEqual({ maxWordLevel: 2 });
	});

	it.each([
		['a level that does not exist', { ...VALID, maxWordLevel: 4 }, /rules\.maxWordLevel/],
		['no level', { ...VALID, maxWordLevel: undefined }, /rules\.maxWordLevel/],
		['steps that are not an object', { ...VALID, wordLevels: [1, 2] }, /rules\.wordLevels/],
		['an unknown age group', { ...VALID, wordLevels: { '6-7': [1] } }, /wordLevels\.6-7/],
		['no step for an age group', { ...VALID, wordLevels: { '8-9': [] } }, /wordLevels\.8-9/],
		['a step that is not a level', { ...VALID, wordLevels: { '8-9': [0] } }, /8-9\[0\]/],
		['steps that go down', { ...VALID, wordLevels: { '8-9': [2, 1] } }, /never go down/],
		[
			'a step above the ceiling',
			{ ...VALID, maxWordLevel: 2, wordLevels: { '8-9': [1, 3] } },
			/at most 2/
		],
		['short words that are not an object', { ...VALID, shortWords: 7 }, /rules\.shortWords/],
		[
			'short words of no length',
			{ ...VALID, shortWords: { beforeLesson: 12, maxLength: 0 } },
			/shortWords\.maxLength/
		],
		[
			'short words before no lesson',
			{ ...VALID, shortWords: { beforeLesson: 1.5, maxLength: 7 } },
			/shortWords\.beforeLesson/
		],
		[
			'an unknown rule of short words',
			{ ...VALID, shortWords: { beforeLesson: 12, maxLength: 7, extra: 1 } },
			/shortWords\.extra/
		]
	])('rejects %s', (_name, data, message) => {
		expect(() => parseWordLimitRules(data, 'rules')).toThrow(message);
	});
});
