import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from '../graphemes';
import { learnedChars } from '../progression/definition';
import { seededRng } from '../progression/test-support';
import type { ExerciseContext, WordBank, WordEntry, WordLevel } from '../progression/types';
import { generateHelpExercise } from './help-exercise';
import {
	HELP_CHARS,
	HELP_LESSON_HOME,
	HELP_LESSON_LATE,
	HELP_LESSON_SPACE,
	HELP_LESSON_WORDS,
	HELP_PROGRESSION,
	HELP_RULES,
	playLesson
} from './test-support';
import { emptyProgress } from '../progression/progress';
import type { HelpQuest, HelpQuestRules } from './types';

const SPACE = ' ';
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

const LESSON_OF: Record<string, string> = {
	f: HELP_LESSON_HOME,
	j: HELP_LESSON_HOME,
	[SPACE]: HELP_LESSON_SPACE,
	d: HELP_LESSON_WORDS,
	k: HELP_LESSON_WORDS,
	s: HELP_LESSON_LATE,
	l: HELP_LESSON_LATE
};

function questOf(char: string): HelpQuest {
	return { char, lessonId: LESSON_OF[char] as string };
}

function word(text: string, level: WordLevel): WordEntry {
	return { text, themes: [], level, review: 'agent' };
}

const BANK: WordBank = {
	schemaVersion: 1,
	id: 'fr.words.test',
	locale: 'fr-FR',
	sources: [],
	themes: [],
	words: [
		word('sdf', 1),
		word('lsk', 1),
		word('fkl', 1),
		word('dsl', 1),
		word('jkl', 2),
		word('fldsk', 3),
		word('kfjs', 3)
	]
};

function exerciseOf(
	quest: HelpQuest,
	seed: number,
	context?: ExerciseContext,
	rules: HelpQuestRules = HELP_RULES
) {
	return generateHelpExercise(HELP_PROGRESSION, quest, rules, seededRng(seed), context);
}

function lengthOf(groups: readonly string[]): number {
	return groups.reduce((sum, group) => sum + toGraphemes(group).length, 0);
}

function countIn(groups: readonly string[], char: string): number {
	return groups.flatMap((group) => toGraphemes(group)).filter((c) => c === char).length;
}

describe('generateHelpExercise', () => {
	describe.each(HELP_CHARS)('for the key "%s"', (char) => {
		const quest = questOf(char);
		const allowed = new Set(learnedChars(HELP_PROGRESSION, quest.lessonId));

		it('names the lesson of the quest and holds at least one group', () => {
			for (const seed of SEEDS) {
				const exercise = exerciseOf(quest, seed);
				expect(exercise.lessonId).toBe(quest.lessonId);
				expect(exercise.groups.length).toBeGreaterThan(0);
				for (const group of exercise.groups) expect(group).not.toBe('');
			}
		});

		it('asks the key at least the minimum number of times', () => {
			for (const seed of SEEDS) {
				const { groups } = exerciseOf(quest, seed);
				expect(countIn(groups, char), `seed ${seed}: ${groups.join(' | ')}`).toBeGreaterThanOrEqual(
					HELP_RULES.minCharCount
				);
			}
		});

		it('only uses characters the child knows', () => {
			for (const seed of SEEDS) {
				for (const group of exerciseOf(quest, seed, { words: BANK }).groups) {
					for (const grapheme of toGraphemes(group)) {
						expect(allowed.has(grapheme), `seed ${seed}: "${group}"`).toBe(true);
					}
				}
			}
		});

		it('is at least as long as asked and stops as soon as it is', () => {
			for (const seed of SEEDS) {
				const { groups } = exerciseOf(quest, seed, { words: BANK });
				const total = lengthOf(groups);
				expect(total, `seed ${seed}`).toBeGreaterThanOrEqual(HELP_RULES.targetLength);
				const withoutLast = groups.slice(0, -1);
				const lastIsNeeded =
					lengthOf(withoutLast) < HELP_RULES.targetLength ||
					countIn(withoutLast, char) < HELP_RULES.minCharCount;
				expect(lastIsNeeded, `seed ${seed}: ${groups.join(' | ')}`).toBe(true);
			}
		});

		it('keeps every group typable: no space at an edge or doubled, no letter three times', () => {
			for (const seed of SEEDS) {
				for (const group of exerciseOf(quest, seed, { words: BANK }).groups) {
					const graphemes = toGraphemes(group);
					expect(graphemes[0], group).not.toBe(SPACE);
					expect(graphemes[graphemes.length - 1], group).not.toBe(SPACE);
					expect(group, group).not.toContain('  ');
					graphemes.forEach((grapheme, i) => {
						const triple = i >= 2 && graphemes[i - 1] === grapheme && graphemes[i - 2] === grapheme;
						expect(triple, group).toBe(false);
					});
				}
			}
		});

		it('is the same exercise for the same seed', () => {
			for (const seed of SEEDS) {
				expect(exerciseOf(quest, seed, { words: BANK })).toEqual(
					exerciseOf(quest, seed, { words: BANK })
				);
			}
		});

		it('varies with the seed', () => {
			const texts = new Set(SEEDS.map((seed) => exerciseOf(quest, seed).groups.join('|')));
			expect(texts.size).toBeGreaterThan(1);
		});

		it('never repeats the same group twice in a row', () => {
			for (const seed of SEEDS) {
				const { groups } = exerciseOf(quest, seed, { words: BANK });
				groups.forEach((group, i) => {
					if (i > 0) expect(group, `seed ${seed}`).not.toBe(groups[i - 1]);
				});
			}
		});
	});

	it('mixes words that hold the key with warm-up suites', () => {
		const quest = questOf('s');
		const holding = new Set(['sdf', 'lsk', 'dsl', 'sdl', 'lks', 'fsj']);
		let withWord = 0;
		let withSuite = 0;
		for (const seed of SEEDS) {
			const { groups } = exerciseOf(quest, seed, { words: BANK });
			if (groups.some((group) => holding.has(group))) withWord += 1;
			if (groups.some((group) => !holding.has(group))) withSuite += 1;
		}
		expect(withWord).toBeGreaterThan(SEEDS.length / 2);
		expect(withSuite).toBe(SEEDS.length);
	});

	it('uses the words of the lessons even without a word bank', () => {
		const lessonWords = new Set(['sdl', 'lks', 'fsj']);
		const seen = SEEDS.some((seed) =>
			exerciseOf(questOf('s'), seed).groups.some((group) => lessonWords.has(group))
		);
		expect(seen).toBe(true);
	});

	it('leaves out the words above the level allowed', () => {
		for (const seed of SEEDS) {
			const { groups } = exerciseOf(questOf('s'), seed, { words: BANK, maxLevel: 1 });
			expect(groups).not.toContain('fldsk');
			expect(groups).not.toContain('kfjs');
			expect(groups).not.toContain('jkl');
		}
	});

	it('puts two words side by side for the space', () => {
		const sides = new Set(['sdf', 'lsk', 'fkl', 'dsl', 'jkl', 'fkd', 'jdk', 'dkf', 'kdj', 'fd jk']);
		const lessons = HELP_PROGRESSION.worlds[1]?.lessons ?? [];
		const known = new Set([...sides, ...lessons.flatMap((lesson) => lesson.words)]);
		const progress = playLesson(
			playLesson(playLesson(emptyProgress(), HELP_LESSON_HOME, 90), HELP_LESSON_SPACE, 90),
			HELP_LESSON_WORDS,
			90
		);
		const pairs = SEEDS.flatMap((seed) =>
			exerciseOf(questOf(SPACE), seed, { words: BANK, progress }).groups.filter((group) =>
				group.split(SPACE).every((part) => known.has(part))
			)
		);
		expect(pairs.length).toBeGreaterThan(0);
	});

	it('widens the characters to the last lesson passed, not to the one of the quest', () => {
		const progress = playLesson(
			playLesson(playLesson(emptyProgress(), HELP_LESSON_HOME, 90), HELP_LESSON_SPACE, 90),
			HELP_LESSON_WORDS,
			90
		);
		const quest = questOf('f');
		const narrow = new Set(learnedChars(HELP_PROGRESSION, HELP_LESSON_HOME));
		const wide = new Set(learnedChars(HELP_PROGRESSION, HELP_LESSON_WORDS));
		let beyond = false;
		for (const seed of SEEDS) {
			const { groups, lessonId } = exerciseOf(quest, seed, { progress });
			expect(lessonId).toBe(HELP_LESSON_HOME);
			for (const grapheme of groups.flatMap((group) => toGraphemes(group))) {
				expect(wide.has(grapheme)).toBe(true);
				if (!narrow.has(grapheme)) beyond = true;
			}
		}
		expect(beyond).toBe(true);
	});

	it('never goes beyond the lesson of the quest when the later lessons are not passed', () => {
		const progress = playLesson(emptyProgress(), HELP_LESSON_HOME, 90);
		const narrow = new Set(learnedChars(HELP_PROGRESSION, HELP_LESSON_HOME));
		for (const seed of SEEDS) {
			for (const group of exerciseOf(questOf('f'), seed, { progress }).groups) {
				for (const grapheme of toGraphemes(group)) expect(narrow.has(grapheme)).toBe(true);
			}
		}
	});

	it('refuses a key that is not taught by the progression at that point', () => {
		expect(() => exerciseOf({ char: 'd', lessonId: HELP_LESSON_HOME }, 1)).toThrow(RangeError);
		expect(() => exerciseOf({ char: 'f', lessonId: 'fr.lesson.unknown' }, 1)).toThrow(RangeError);
	});

	it('follows the rules it receives: longer, and more copies of the key', () => {
		const rules: HelpQuestRules = { ...HELP_RULES, targetLength: 40, minCharCount: 15 };
		for (const char of ['f', 'd', SPACE]) {
			for (const seed of SEEDS.slice(0, 10)) {
				const { groups } = exerciseOf(questOf(char), seed, { words: BANK }, rules);
				expect(lengthOf(groups)).toBeGreaterThanOrEqual(40);
				expect(countIn(groups, char), `"${char}" seed ${seed}`).toBeGreaterThanOrEqual(15);
			}
		}
	});

	it('keeps the minimum of copies even when it is almost the whole length', () => {
		const rules: HelpQuestRules = { ...HELP_RULES, targetLength: 10, minCharCount: 9 };
		for (const char of ['f', 'd']) {
			for (const seed of SEEDS) {
				const { groups } = exerciseOf(questOf(char), seed, undefined, rules);
				expect(countIn(groups, char), `"${char}" seed ${seed}`).toBeGreaterThanOrEqual(9);
			}
		}
	});

	it('does not read the rules it receives as anything but numbers', () => {
		fc.assert(
			fc.property(
				fc.constantFrom(...HELP_CHARS),
				fc.integer({ min: 1, max: 60 }),
				fc.integer({ min: 1, max: 12 }),
				fc.integer({ min: 1, max: 100_000 }),
				(char, targetLength, wanted, seed) => {
					const minCharCount = Math.min(wanted, targetLength);
					const rules: HelpQuestRules = { ...HELP_RULES, targetLength, minCharCount };
					const quest = questOf(char);
					const allowed = new Set(learnedChars(HELP_PROGRESSION, quest.lessonId));
					const { groups } = exerciseOf(quest, seed, { words: BANK }, rules);
					expect(groups.length).toBeGreaterThan(0);
					expect(lengthOf(groups)).toBeGreaterThanOrEqual(targetLength);
					expect(countIn(groups, char)).toBeGreaterThanOrEqual(minCharCount);
					for (const grapheme of groups.flatMap((group) => toGraphemes(group))) {
						expect(allowed.has(grapheme)).toBe(true);
					}
					expect(exerciseOf(quest, seed, { words: BANK }, rules)).toEqual({
						lessonId: quest.lessonId,
						groups
					});
				}
			)
		);
	});
});
