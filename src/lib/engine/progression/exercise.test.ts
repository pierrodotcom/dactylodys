import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from '../graphemes';
import { findLesson, learnedChars, lessonIds, parseProgression } from './definition';
import { generateExercise } from './exercise';
import { clone, loadShippedProgressions, seededRng } from './test-support';
import type { Exercise, LessonDefinition, ProgressionDefinition } from './types';

const SPACE = ' ';
const SEEDS = fc.integer({ min: 0, max: 2 ** 32 - 1 });
const SHIPPED = loadShippedProgressions();

const SYNTHETIC = parseProgression({
	schemaVersion: 1,
	id: 'fr.progression.synthetic',
	locale: 'fr-FR',
	layoutIds: ['fr-fr-azerty-pc'],
	rules: { unlockAccuracy: 80, starThresholds: [80, 90, 97], newCharWeight: 0.6 },
	worlds: [
		{
			id: 'fr.world.synthetic',
			title: 'Synthetic',
			themeId: 'dinos',
			lessons: [
				{
					id: 'fr.lesson.fj',
					title: 'FJ',
					intro: 'Intro.',
					newChars: ['f', 'j'],
					words: [],
					groupCount: 10,
					groupLength: [2, 4]
				},
				{
					id: 'fr.lesson.space',
					title: 'Space',
					intro: 'Intro.',
					newChars: [SPACE],
					words: [],
					groupCount: 10,
					groupLength: [3, 4]
				},
				{
					id: 'fr.lesson.dk',
					title: 'DK',
					intro: 'Intro.',
					newChars: ['d', 'k'],
					words: [],
					groupCount: 10,
					groupLength: [3, 5]
				},
				{
					id: 'fr.lesson.words',
					title: 'Words',
					intro: 'Intro.',
					newChars: ['e'],
					words: ['fe', 'je', 'de', 'kef'],
					groupCount: 10,
					groupLength: [3, 5]
				}
			]
		}
	]
});

function withRules(
	progression: ProgressionDefinition,
	rules: Partial<ProgressionDefinition['rules']>
): ProgressionDefinition {
	return { ...progression, rules: { ...progression.rules, ...rules } };
}

function allLessons(): (readonly [ProgressionDefinition, LessonDefinition])[] {
	return [SYNTHETIC, ...SHIPPED.map((shipped) => shipped.progression)].flatMap((progression) =>
		lessonIds(progression).map(
			(id) => [progression, findLesson(progression, id) as LessonDefinition] as const
		)
	);
}

function graphemesOfGroups(exercise: Exercise): string[] {
	return exercise.groups.flatMap((group) => toGraphemes(group));
}

function checkExercise(
	progression: ProgressionDefinition,
	lesson: LessonDefinition,
	exercise: Exercise
) {
	const learned = new Set(learnedChars(progression, lesson.id));
	const [min, max] = lesson.groupLength;
	expect(exercise.lessonId).toBe(lesson.id);
	expect(exercise.groups).toHaveLength(lesson.groupCount);

	exercise.groups.forEach((group, index) => {
		const graphemes = toGraphemes(group);
		expect(graphemes.length).toBeGreaterThan(0);
		for (const grapheme of graphemes) expect(learned.has(grapheme)).toBe(true);
		if (!lesson.words.includes(group)) {
			expect(graphemes.length).toBeGreaterThanOrEqual(min);
			expect(graphemes.length).toBeLessThanOrEqual(max);
		}
		expect(group.startsWith(SPACE)).toBe(false);
		expect(group.endsWith(SPACE)).toBe(false);
		expect(group).not.toContain('  ');
		expect(group).not.toMatch(/(.)\1\1/u);
		if (index > 0) expect(group).not.toBe(exercise.groups[index - 1]);
	});

	const present = new Set(graphemesOfGroups(exercise));
	for (const char of lesson.newChars) expect(present.has(char)).toBe(true);
}

describe('generateExercise', () => {
	it('is reproducible for the same sequence of random values', () => {
		const first = generateExercise(SYNTHETIC, 'fr.lesson.dk', seededRng(42));
		const second = generateExercise(SYNTHETIC, 'fr.lesson.dk', seededRng(42));
		expect(second).toEqual(first);
	});

	it('varies with the random values', () => {
		const texts = new Set(
			[1, 2, 3, 4, 5].map((seed) =>
				generateExercise(SYNTHETIC, 'fr.lesson.dk', seededRng(seed)).groups.join('|')
			)
		);
		expect(texts.size).toBeGreaterThan(1);
	});

	it('produces the number of groups asked by the lesson', () => {
		expect(generateExercise(SYNTHETIC, 'fr.lesson.fj', seededRng(1)).groups).toHaveLength(10);
	});

	it('refuses an unknown lesson', () => {
		expect(() => generateExercise(SYNTHETIC, 'fr.lesson.zzz', seededRng(1))).toThrow(RangeError);
	});

	it('uses only the new characters of the first lesson', () => {
		const exercise = generateExercise(SYNTHETIC, 'fr.lesson.fj', seededRng(7));
		expect(new Set(graphemesOfGroups(exercise))).toEqual(new Set(['f', 'j']));
	});

	it('mixes new and known characters', () => {
		const exercise = generateExercise(SYNTHETIC, 'fr.lesson.dk', seededRng(7));
		const present = new Set(graphemesOfGroups(exercise));
		expect([...present].some((char) => 'dk'.includes(char))).toBe(true);
		expect([...present].some((char) => 'fj '.includes(char))).toBe(true);
	});

	it('draws only new characters when their weight is 1', () => {
		const progression = withRules(SYNTHETIC, { newCharWeight: 1 });
		for (let seed = 0; seed < 20; seed++) {
			const exercise = generateExercise(progression, 'fr.lesson.dk', seededRng(seed));
			expect(new Set(graphemesOfGroups(exercise))).toEqual(new Set(['d', 'k']));
		}
	});

	it('only places new characters when needed if their weight is 0', () => {
		const progression = withRules(SYNTHETIC, { newCharWeight: 0 });
		for (let seed = 0; seed < 20; seed++) {
			const exercise = generateExercise(progression, 'fr.lesson.dk', seededRng(seed));
			const fresh = graphemesOfGroups(exercise).filter((char) => 'dk'.includes(char));
			expect(fresh.sort()).toEqual(['d', 'k']);
		}
	});

	it('keeps the space inside the group when the space is the new character', () => {
		for (let seed = 0; seed < 50; seed++) {
			const exercise = generateExercise(SYNTHETIC, 'fr.lesson.space', seededRng(seed));
			for (const group of exercise.groups) {
				expect(group).toMatch(/^\S.*\S$/u);
				expect(toGraphemes(group).length).toBeGreaterThanOrEqual(3);
				expect(toGraphemes(group).length).toBeLessThanOrEqual(4);
			}
			expect(exercise.groups.some((group) => group.includes(SPACE))).toBe(true);
		}
	});

	it('turns about half of the groups into words when the lesson has some', () => {
		let words = 0;
		let total = 0;
		for (let seed = 0; seed < 100; seed++) {
			const exercise = generateExercise(SYNTHETIC, 'fr.lesson.words', seededRng(seed));
			const lesson = findLesson(SYNTHETIC, 'fr.lesson.words') as LessonDefinition;
			for (const group of exercise.groups) {
				total += 1;
				if (lesson.words.includes(group)) words += 1;
			}
		}
		expect(words / total).toBeGreaterThan(0.35);
		expect(words / total).toBeLessThan(0.65);
	});

	it('still covers the new character when words are the only way it would appear', () => {
		const progression = withRules(SYNTHETIC, { newCharWeight: 0 });
		for (let seed = 0; seed < 50; seed++) {
			const exercise = generateExercise(progression, 'fr.lesson.words', seededRng(seed));
			expect(graphemesOfGroups(exercise)).toContain('e');
		}
	});

	it('gives up with an explicit error when two different groups are impossible', () => {
		const impossible: ProgressionDefinition = {
			...SYNTHETIC,
			worlds: [
				{
					id: 'fr.world.synthetic',
					title: 'Synthetic',
					themeId: 'dinos',
					lessons: [
						{
							id: 'fr.lesson.one',
							title: 'One',
							intro: 'Intro.',
							newChars: ['f'],
							words: [],
							groupCount: 3,
							groupLength: [1, 1]
						}
					]
				}
			]
		};
		expect(() => generateExercise(impossible, 'fr.lesson.one', seededRng(1))).toThrow(
			/two different consecutive groups/
		);
	});

	it('does not modify the progression', () => {
		const before = clone(SYNTHETIC);
		generateExercise(SYNTHETIC, 'fr.lesson.words', seededRng(3));
		expect(SYNTHETIC).toEqual(before);
	});

	describe('properties on every lesson', () => {
		it.each(allLessons().map(([progression, lesson]) => [lesson.id, progression, lesson] as const))(
			'%s: respects the constraints for any seed',
			(_id, progression, lesson) => {
				fc.assert(
					fc.property(SEEDS, (seed) => {
						checkExercise(
							progression,
							lesson,
							generateExercise(progression, lesson.id, seededRng(seed))
						);
					}),
					{ numRuns: 200 }
				);
			}
		);

		it.each(allLessons().map(([progression, lesson]) => [lesson.id, progression, lesson] as const))(
			'%s: is deterministic for any seed',
			(_id, progression, lesson) => {
				fc.assert(
					fc.property(SEEDS, (seed) => {
						expect(generateExercise(progression, lesson.id, seededRng(seed))).toEqual(
							generateExercise(progression, lesson.id, seededRng(seed))
						);
					}),
					{ numRuns: 100 }
				);
			}
		);

		it('holds with arbitrary random values, not only a seeded generator', () => {
			const lesson = findLesson(SYNTHETIC, 'fr.lesson.words') as LessonDefinition;
			fc.assert(
				fc.property(
					fc.array(fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true }), { minLength: 1 }),
					(values) => {
						let cursor = 0;
						const rng = () => values[cursor++ % values.length] as number;
						try {
							checkExercise(SYNTHETIC, lesson, generateExercise(SYNTHETIC, lesson.id, rng));
						} catch (error) {
							expect(String(error)).toMatch(/two different consecutive groups/);
						}
					}
				),
				{ numRuns: 200 }
			);
		});
	});
});
