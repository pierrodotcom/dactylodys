import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from '../graphemes';
import { parsePhraseBank, parseWordBank } from './banks';
import { learnedChars, parseProgression } from './definition';
import { generateExercise } from './exercise';
import { seededRng } from './test-support';
import type { Exercise, ExerciseContext, ProgressionDefinition, ProgressState } from './types';

const SPACE = ' ';
const SEEDS = fc.integer({ min: 0, max: 2 ** 32 - 1 });
const RUNS = Array.from({ length: 40 }, (_, seed) => seed);

const RULES = {
	unlockAccuracy: 80,
	starThresholds: [80, 90, 97],
	newCharWeight: 0.6,
	weakCharBoost: 2,
	themeBoost: 2,
	newCharMinCount: 3,
	recentCharWindow: 30,
	lengthSlack: 8,
	wordWarmUp: { minWords: 1, maxWordLength: 6 },
	drillPatterns: {
		vowels: ['a', 'e', 'i', 'o', 'u'],
		shapes: ['CD', 'CDC', 'CDCD', 'C D', 'CD C', 'CVCV', 'CVCW', 'CVDV', 'CV CW', 'CV DV']
	},
	suiteFreeMinWords: 6,
	uppercaseMinCount: 4,
	weakChars: { minCount: 4, maxChars: 2, minAttempts: 5, minErrorRate: 0.2 },
	phraseEnd: '.'
};

const WORDS_MOSTLY = { drills: 1, words: 3, phrases: 0 };
const EVERYTHING = { drills: 1, words: 2, phrases: 2 };

function lesson(id: string, newChars: string[], change: Record<string, unknown> = {}) {
	return {
		id: `fr.lesson.${id}`,
		title: id,
		intro: 'Intro.',
		newChars,
		words: [],
		mix: WORDS_MOSTLY,
		unlocks: [],
		groupCount: 8,
		targetLength: 30,
		groupLength: [4, 6],
		...change
	};
}

const DRILLS_ONLY = { mix: { drills: 1, words: 0, phrases: 0 }, targetLength: 16 };
const FIRST_LESSONS = [
	lesson('fj', ['f', 'j'], { ...DRILLS_ONLY, groupLength: [2, 4] }),
	lesson('space', [SPACE], { ...DRILLS_ONLY, groupLength: [3, 4] }),
	lesson('dk', ['d', 'k'], { ...DRILLS_ONLY, groupLength: [3, 5] }),
	lesson('sl', ['s', 'l'], { ...DRILLS_ONLY, groupLength: [3, 5] })
];

function progressionOf(lessons: Record<string, unknown>[], rules: Record<string, unknown> = {}) {
	return parseProgression({
		schemaVersion: 1,
		id: 'fr.progression.wordy',
		locale: 'fr-FR',
		layoutIds: ['fr-fr-azerty-pc'],
		rules: { ...RULES, ...rules },
		worlds: [
			{
				id: 'fr.world.wordy',
				title: 'Wordy',
				themeId: 'dinos',
				gameIds: ['hatching'],
				lessons: [...FIRST_LESSONS, ...lessons]
			}
		]
	});
}

const WORDY = progressionOf([
	lesson('ei', ['e', 'i']),
	lesson('x', ['x']),
	lesson('caps', [], { unlocks: ['uppercase'], mix: EVERYTHING }),
	lesson('dot', ['.'], { mix: EVERYTHING }),
	lesson('phrases', [], { mix: { drills: 0, words: 0, phrases: 1 }, groupCount: 3 })
]);

const WORD_TEXTS = [
	'le',
	'les',
	'elle',
	'il',
	'ils',
	'fil',
	'fils',
	'sel',
	'ses',
	'si',
	'ski',
	'dis',
	'de',
	'des',
	'je',
	'elfe',
	'file',
	'fille',
	'lisse',
	'idée'
];
const WORDS = parseWordBank({
	schemaVersion: 1,
	id: 'fr.words.wordy',
	locale: 'fr-FR',
	sources: [],
	themes: [],
	words: WORD_TEXTS.map((text) => ({ text, themes: [], level: 1, review: 'agent' }))
});
const USABLE = new Set(WORD_TEXTS.filter((text) => text !== 'idée'));

const EARLY_PHRASES = ['elle file', 'il lie ses skis', 'je dis si'];
const LATE_PHRASES = ['Je lis.', 'Elle skie.'];
const PHRASES = parsePhraseBank({
	schemaVersion: 1,
	id: 'fr.phrases.wordy',
	locale: 'fr-FR',
	phrases: [...EARLY_PHRASES, ...LATE_PHRASES].map((text) => ({
		text,
		themes: [],
		level: 1,
		review: 'agent'
	}))
});

const CONTEXT: ExerciseContext = { words: WORDS, phrases: PHRASES };

function generate(
	progression: ProgressionDefinition,
	id: string,
	seed: number,
	context: ExerciseContext = CONTEXT
): Exercise {
	return generateExercise(progression, `fr.lesson.${id}`, seededRng(seed), context);
}

function withRules(rules: Partial<ProgressionDefinition['rules']>): ProgressionDefinition {
	return { ...WORDY, rules: { ...WORDY.rules, ...rules } };
}

function countOf(groups: readonly string[], char: string): number {
	return groups.flatMap((group) => toGraphemes(group)).filter((grapheme) => grapheme === char)
		.length;
}

function lower(part: string): string {
	const [first = '', ...rest] = toGraphemes(part);
	return `${first.toLowerCase()}${rest.join('')}`;
}

function isWord(part: string): boolean {
	return USABLE.has(part);
}

/** The groups that open an exercise until each of `chars` was asked `min` times. */
function warmUpOf(groups: readonly string[], chars: readonly string[], min: number): string[] {
	const warmUp: string[] = [];
	for (const group of groups) {
		if (chars.every((char) => countOf(warmUp, char) >= min)) break;
		warmUp.push(group);
	}
	return warmUp;
}

function weak(rates: Record<string, number>): ProgressState {
	return {
		lessons: {},
		chars: Object.fromEntries(
			Object.entries(rates).map(([char, rate]) => {
				const sample = { attempts: 10, errors: Math.round(10 * rate), latencyMs: null };
				return [char, { attempts: 10, errors: sample.errors, recent: [sample] }];
			})
		)
	};
}

describe('warm-up made of words', () => {
	it('warms the new characters up with words that hold them, each group holding those lacking', () => {
		for (const seed of RUNS) {
			const { groups } = generate(WORDY, 'ei', seed);
			const warmUp = warmUpOf(groups, ['e', 'i'], 3);
			expect(warmUp.length).toBeGreaterThan(0);
			expect(warmUp.length).toBeLessThanOrEqual(3);
			warmUp.forEach((group, index) => {
				expect(group.split(SPACE).every(isWord), group).toBe(true);
				for (const char of ['e', 'i']) {
					if (countOf(warmUp.slice(0, index), char) < 3) expect(group).toContain(char);
				}
			});
		}
	});

	it('takes the words that hold the new characters most for their length first', () => {
		const richest = ['le', 'de', 'je', 'elle', 'elfe', 'file'];
		for (const seed of RUNS) {
			// Two words side by side come in a drawn order: the richest one is one of them.
			const first = generate(WORDY, 'ei', seed).groups[0] as string;
			expect(first.split(SPACE).some((part) => richest.includes(part))).toBe(true);
		}
	});

	it('never asks the same word twice in a row', () => {
		for (const seed of RUNS) {
			const parts = generate(WORDY, 'ei', seed).groups.flatMap((group) => group.split(SPACE));
			parts.forEach((part, index) => {
				if (index > 0) expect(part, parts.join(' ')).not.toBe(parts[index - 1]);
			});
		}
	});

	it('leaves the longest words out of the warm-up', () => {
		const short = withRules({ wordWarmUp: { minWords: 1, maxWordLength: 3 } });
		for (const seed of RUNS) {
			const warmUp = warmUpOf(generate(short, 'ei', seed).groups, ['e', 'i'], 3);
			for (const part of warmUp.flatMap((group) => group.split(SPACE))) {
				expect(toGraphemes(part).length).toBeLessThanOrEqual(3);
			}
		}
	});

	it('falls back to a suite with a regular shape for a new character no word holds', () => {
		for (const seed of RUNS) {
			const warmUp = warmUpOf(generate(WORDY, 'x', seed).groups, ['x'], 3);
			for (const group of warmUp) {
				expect(group).toMatch(/^[a-z][ei][a-z][ei]$|^[a-z][ei] [a-z][ei]$/);
				expect(group).toContain('x');
			}
		}
	});

	it('falls back to suites when a character has fewer words than the rules ask', () => {
		const demanding = withRules({ wordWarmUp: { minWords: 30, maxWordLength: 6 } });
		for (const seed of RUNS) {
			const warmUp = warmUpOf(generate(demanding, 'ei', seed).groups, ['e', 'i'], 3);
			for (const group of warmUp)
				expect(group).toMatch(/^[a-z][ei][a-z][ei]$|^[a-z][ei] [a-z][ei]$/);
		}
	});

	it('puts a word and a suite side by side when only one new character has words', () => {
		const mixed = progressionOf([lesson('ex', ['e', 'x'])]);
		for (const seed of RUNS) {
			const { groups } = generate(mixed, 'ex', seed);
			const warmUp = warmUpOf(groups, ['e', 'x'], 3);
			warmUp.forEach((group, index) => {
				const parts = group.split(SPACE);
				const before = warmUp.slice(0, index);
				if (countOf(before, 'e') < 3) {
					expect(isWord(parts[0] as string), group).toBe(true);
					expect(parts[0]).toContain('e');
				}
				if (countOf(before, 'x') < 3) {
					expect(parts.filter((part) => !isWord(part)).join(SPACE), group).toContain('x');
				}
			});
			expect(countOf(groups, 'e')).toBeGreaterThanOrEqual(3);
			expect(countOf(groups, 'x')).toBeGreaterThanOrEqual(3);
		}
	});

	it('keeps suites as before without the rule', () => {
		const plain = withRules({ wordWarmUp: undefined, drillPatterns: undefined });
		for (const seed of RUNS) {
			const first = generate(plain, 'ei', seed).groups[0] as string;
			expect(toGraphemes(first).length).toBeLessThanOrEqual(6);
			expect(first).toContain('e');
			expect(first).toContain('i');
		}
	});
});

describe('suites only where no word can do', () => {
	it('never mixes a suite in once the lesson has enough words', () => {
		for (const seed of RUNS) {
			for (const group of generate(WORDY, 'ei', seed).groups) {
				expect(group.split(SPACE).every(isWord), group).toBe(true);
			}
		}
	});

	it('still mixes suites in while the lesson has too few words', () => {
		const few = progressionOf([lesson('ei', ['e', 'i'], { words: ['je', 'de', 'le', 'il'] })]);
		const known = new Set(['je', 'de', 'le', 'il']);
		let suites = 0;
		for (const seed of RUNS) {
			for (const group of generate(few, 'ei', seed, {}).groups) {
				if (!group.split(SPACE).every((part) => known.has(part))) suites += 1;
			}
		}
		expect(suites).toBeGreaterThan(0);
	});

	it('replaces a phrase too long for the room left with a word, not with a suite', () => {
		const tight = withRules({ lengthSlack: 0 });
		const phrases = new Set(LATE_PHRASES.concat(EARLY_PHRASES.map((text) => `${lower(text)}.`)));
		for (const seed of RUNS) {
			const { groups } = generate(tight, 'dot', seed);
			const afterWarmUp = groups.slice(warmUpOf(groups, ['.'], 3).length);
			for (const group of afterWarmUp) {
				const made = group.split(SPACE).every((part) => isWord(lower(part)));
				const completed = [...phrases].some((text) => text.toLowerCase() === group.toLowerCase());
				expect(made || completed, group).toBe(true);
			}
		}
	});

	it('never builds a suite of marks alone, nor one with a capital', () => {
		for (const seed of RUNS) {
			const warmUp = warmUpOf(generate(WORDY, 'dot', seed, {}).groups, ['.'], 3);
			expect(warmUp.length).toBeGreaterThan(0);
			for (const group of warmUp) {
				expect(group).toMatch(/[\p{L}\p{N}]/u);
				expect(group).not.toMatch(/\p{Lu}/u);
				expect(group).toContain('.');
			}
		}
	});
});

describe('capitals of the lesson that unlocks them', () => {
	const capitalsOf = (groups: readonly string[]) =>
		groups.flatMap((group) => toGraphemes(group)).filter((char) => /\p{Lu}/u.test(char)).length;

	it('holds at least the minimum of capitals, each one the first letter of a word', () => {
		for (const seed of RUNS) {
			const { groups } = generate(WORDY, 'caps', seed);
			expect(capitalsOf(groups), groups.join(' | ')).toBeGreaterThanOrEqual(4);
			expect(groups.length).toBeLessThanOrEqual(8);
			for (const part of groups.flatMap((group) => group.split(SPACE))) {
				if (!/\p{Lu}/u.test(part)) continue;
				expect(part).toMatch(/^\p{Lu}\P{Lu}*$/u);
				expect(isWord(lower(part)), part).toBe(true);
			}
		}
	});

	it('asks no capital without the rule, nor in a lesson that does not unlock them', () => {
		const plain = withRules({ uppercaseMinCount: undefined });
		for (const seed of RUNS) {
			expect(capitalsOf(generate(plain, 'caps', seed).groups)).toBe(0);
			expect(capitalsOf(generate(WORDY, 'ei', seed).groups)).toBe(0);
		}
	});

	it('counts the capitals of a warm-up written by hand', () => {
		const written = progressionOf([
			lesson('ei', ['e', 'i']),
			lesson('caps', [], {
				unlocks: ['uppercase'],
				mix: EVERYTHING,
				warmUp: ['Le Il', 'Je Si']
			})
		]);
		for (const seed of RUNS) {
			const { groups } = generate(written, 'caps', seed);
			expect(groups.slice(0, 2)).toEqual(['Le Il', 'Je Si']);
			expect(capitalsOf(groups)).toBe(4);
		}
	});

	it('puts words side by side when few groups are left for the capitals', () => {
		const short = progressionOf([
			lesson('ei', ['e', 'i']),
			lesson('caps', [], { unlocks: ['uppercase'], mix: EVERYTHING, groupCount: 2 })
		]);
		for (const seed of RUNS) {
			const { groups } = generate(short, 'caps', seed);
			expect(groups).toHaveLength(2);
			expect(capitalsOf(groups)).toBeGreaterThanOrEqual(4);
		}
	});

	it('asks nothing it cannot give: no word, no capital', () => {
		for (const seed of RUNS) {
			const { groups } = generate(WORDY, 'caps', seed, {});
			expect(capitalsOf(groups)).toBe(0);
			expect(groups.length).toBeGreaterThan(0);
		}
	});
});

describe('review of the weak characters', () => {
	it('holds each of the weakest characters at least the minimum number of times', () => {
		const progress = weak({ f: 0.8, d: 0.5 });
		let without = 0;
		for (const seed of RUNS) {
			const { groups } = generate(WORDY, 'ei', seed, { ...CONTEXT, progress });
			expect(countOf(groups, 'f'), groups.join(' | ')).toBeGreaterThanOrEqual(4);
			expect(countOf(groups, 'd'), groups.join(' | ')).toBeGreaterThanOrEqual(4);
			expect(groups.length).toBeLessThanOrEqual(8);
			if (countOf(generate(WORDY, 'ei', seed).groups, 'd') < 4) without += 1;
		}
		expect(without).toBeGreaterThan(RUNS.length / 2);
	});

	it('reviews with words that hold the character, right after the warm-up', () => {
		const progress = weak({ d: 0.5 });
		for (const seed of RUNS) {
			const { groups } = generate(WORDY, 'ei', seed, { ...CONTEXT, progress });
			const warmUp = warmUpOf(groups, ['e', 'i'], 3);
			const lacking = 4 - countOf(warmUp, 'd');
			if (lacking <= 0) continue;
			const next = groups[warmUp.length] as string;
			expect(next.split(SPACE).every(isWord), next).toBe(true);
			expect(next).toContain('d');
		}
	});

	it('leaves alone a character that is not weak, typed too little, or that no two words hold', () => {
		const plain = withRules({ weakChars: undefined });
		const cases = [
			weak({ f: 0.2 }),
			{
				lessons: {},
				chars: {
					f: { attempts: 4, errors: 4, recent: [{ attempts: 4, errors: 4, latencyMs: null }] }
				}
			},
			weak({ k: 0.9 }),
			weak({ [SPACE]: 0.9 })
		];
		for (const progress of cases) {
			for (const seed of RUNS.slice(0, 10)) {
				expect(generate(WORDY, 'ei', seed, { ...CONTEXT, progress })).toEqual(
					generate(plain, 'ei', seed, { ...CONTEXT, progress })
				);
			}
		}
	});

	it('reviews only as many characters as the rules allow, the weakest first', () => {
		const one = withRules({ weakChars: { ...RULES.weakChars, maxChars: 1 } });
		const progress = weak({ f: 0.8, d: 0.5 });
		let fewer = 0;
		for (const seed of RUNS) {
			const { groups } = generate(one, 'ei', seed, { ...CONTEXT, progress });
			expect(countOf(groups, 'f')).toBeGreaterThanOrEqual(4);
			if (countOf(groups, 'd') < 4) fewer += 1;
		}
		expect(fewer).toBeGreaterThan(0);
	});

	it('counts what the story phrase already holds', () => {
		const phrases = parsePhraseBank({
			schemaVersion: 1,
			id: 'fr.phrases.story',
			locale: 'fr-FR',
			phrases: [
				{
					text: 'fifi file le fil',
					themes: [],
					level: 1,
					review: 'agent',
					lessonId: 'fr.lesson.ei'
				}
			]
		});
		const story = withRules({ storyPhraseEvery: 1 });
		const plain = { ...story, rules: { ...story.rules, weakChars: undefined } };
		const context = { words: WORDS, phrases, progress: weak({ f: 0.8 }) };
		for (const seed of RUNS) {
			const exercise = generate(story, 'ei', seed, context);
			expect(exercise.groups[exercise.groups.length - 1]).toBe('fifi file le fil');
			expect(exercise).toEqual(generate(plain, 'ei', seed, context));
		}
	});

	it('holds for any seed and any weak characters, with only learned keys, the same each time', () => {
		const eligible = ['f', 'd', 's', 'l', 'e', 'i'];
		fc.assert(
			fc.property(
				SEEDS,
				fc.subarray(eligible, { minLength: 1, maxLength: 2 }),
				fc.constantFrom('ei', 'x', 'caps', 'dot'),
				(seed, chars, id) => {
					const progress = weak(Object.fromEntries(chars.map((char) => [char, 0.6])));
					const context = { ...CONTEXT, progress };
					const exercise = generate(WORDY, id, seed, context);
					const learned = new Set(learnedChars(WORDY, `fr.lesson.${id}`));
					for (const char of exercise.groups.flatMap((group) => toGraphemes(group))) {
						expect(learned.has(char)).toBe(true);
					}
					for (const char of chars) {
						expect(
							countOf(exercise.groups, char),
							exercise.groups.join(' | ')
						).toBeGreaterThanOrEqual(4);
					}
					expect(exercise.groups.length).toBeLessThanOrEqual(8);
					exercise.groups.forEach((group, index) => {
						if (index > 0) expect(group).not.toBe(exercise.groups[index - 1]);
					});
					expect(generate(WORDY, id, seed, context)).toEqual(exercise);
				}
			),
			{ numRuns: 80 }
		);
	});
});

describe('early phrases completed', () => {
	it('gives them their capital and their full stop once both are learned', () => {
		const completed = new Set(['Elle file.', 'Il lie ses skis.', 'Je dis si.', ...LATE_PHRASES]);
		const seen = new Set<string>();
		for (const seed of RUNS) {
			for (const group of generate(WORDY, 'phrases', seed).groups) {
				expect(completed.has(group), group).toBe(true);
				seen.add(group);
			}
		}
		expect(seen.size).toBe(completed.size);
	});

	it('types them as written before the full stop is learned, and without the rule', () => {
		const plain = withRules({ phraseEnd: undefined });
		for (const seed of RUNS) {
			for (const group of generate(WORDY, 'caps', seed).groups) {
				expect(group.endsWith('.')).toBe(false);
				expect(group).not.toBe('Elle file');
			}
			for (const group of generate(plain, 'phrases', seed).groups) {
				expect([...EARLY_PHRASES, ...LATE_PHRASES]).toContain(group);
			}
		}
	});
});

describe('length of the words', () => {
	it('leaves out the words of the bank longer than the context allows', () => {
		for (const seed of RUNS) {
			const { groups } = generate(WORDY, 'ei', seed, { words: WORDS, maxWordLength: 3 });
			for (const part of groups.flatMap((group) => group.split(SPACE))) {
				if (isWord(part)) expect(toGraphemes(part).length).toBeLessThanOrEqual(3);
			}
		}
	});

	it('keeps the words picked by hand for the lesson whatever their length', () => {
		const picked = progressionOf([lesson('ei', ['e', 'i'], { words: ['fidelis', 'lilis'] })]);
		const seen = new Set<string>();
		for (const seed of RUNS) {
			for (const group of generate(picked, 'ei', seed, { words: WORDS, maxWordLength: 3 }).groups) {
				for (const part of group.split(SPACE)) seen.add(part);
			}
		}
		expect(seen.has('lilis') || seen.has('fidelis')).toBe(true);
	});
});
