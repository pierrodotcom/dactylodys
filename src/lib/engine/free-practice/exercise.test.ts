import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from '../graphemes';
import { seededRng } from '../progression/test-support';
import { FREE_PRACTICE_EXERCISE_ID, generateFreeExercise } from './exercise';

const RULES = { targetLength: 30 };
const WORDS = ['lune', 'vélo', 'chat', 'soleil'];

function length(groups: readonly string[]): number {
	return groups.reduce((sum, group) => sum + toGraphemes(group).length, 0);
}

describe('generateFreeExercise', () => {
	it('gives the same exercise for the same random source', () => {
		expect(generateFreeExercise(WORDS, RULES, seededRng(7))).toEqual(
			generateFreeExercise(WORDS, RULES, seededRng(7))
		);
	});

	it('belongs to no lesson and types one word of the list per group', () => {
		const exercise = generateFreeExercise(WORDS, RULES, seededRng(1));
		expect(exercise.lessonId).toBe(FREE_PRACTICE_EXERCISE_ID);
		for (const group of exercise.groups) expect(WORDS).toContain(group);
	});

	it('repeats a single word until the length is reached', () => {
		expect(generateFreeExercise(['lune'], { targetLength: 10 }, seededRng(3)).groups).toEqual([
			'lune',
			'lune',
			'lune'
		]);
	});

	it('refuses an empty list and a length that is not a positive integer', () => {
		expect(() => generateFreeExercise([], RULES, seededRng(1))).toThrow(RangeError);
		expect(() => generateFreeExercise(WORDS, { targetLength: 0 }, seededRng(1))).toThrow(
			RangeError
		);
	});

	it('reaches the length, stops at the first word that does, and never repeats a word in a row', () => {
		const word = fc.stringMatching(/^[a-zé]{1,8}$/);
		fc.assert(
			fc.property(
				fc.uniqueArray(word, { minLength: 1, maxLength: 8 }),
				fc.integer({ min: 1, max: 80 }),
				fc.integer(),
				(words, targetLength, seed) => {
					const { groups } = generateFreeExercise(words, { targetLength }, seededRng(seed));
					expect(length(groups)).toBeGreaterThanOrEqual(targetLength);
					expect(length(groups.slice(0, -1))).toBeLessThan(targetLength);
					if (words.length > 1) {
						groups.forEach((group, i) => expect(group).not.toBe(groups[i - 1]));
					}
					// Every word comes once before any comes back.
					const first = groups.slice(0, words.length);
					expect(new Set(first).size).toBe(first.length);
				}
			)
		);
	});
});
