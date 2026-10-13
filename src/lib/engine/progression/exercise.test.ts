import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from '../graphemes';
import { parsePhraseBank, parseWordBank, usablePhrases, usableWords } from './banks';
import { findLesson, learnedChars, lessonIds, parseProgression } from './definition';
import { generateExercise } from './exercise';
import { clone, deepFreeze, loadShippedProgressions, seededRng } from './test-support';
import type {
	CharSample,
	Exercise,
	ExerciseContext,
	ExerciseMix,
	LessonDefinition,
	PhraseBank,
	ProgressionDefinition,
	ProgressState,
	WordBank
} from './types';

const SPACE = ' ';
const SEEDS = fc.integer({ min: 0, max: 2 ** 32 - 1 });
const SHIPPED = loadShippedProgressions();

const DRILLS: ExerciseMix = { drills: 1, words: 0, phrases: 0 };
const WORDS_ONLY: ExerciseMix = { drills: 0, words: 1, phrases: 0 };
const PHRASES_ONLY: ExerciseMix = { drills: 0, words: 0, phrases: 1 };
const EVERYTHING: ExerciseMix = { drills: 1, words: 2, phrases: 2 };

const RULES = {
	unlockAccuracy: 80,
	starThresholds: [80, 90, 97],
	newCharWeight: 0.6,
	weakCharBoost: 2,
	themeBoost: 2,
	newCharMinCount: 0,
	recentCharWindow: 30
};

function lesson(id: string, newChars: string[], change: Record<string, unknown> = {}) {
	return {
		id: `fr.lesson.${id}`,
		title: id,
		intro: 'Intro.',
		newChars,
		words: [],
		mix: DRILLS,
		unlocks: [],
		groupCount: 10,
		targetLength: 100,
		groupLength: [3, 5],
		...change
	};
}

function progressionOf(lessons: Record<string, unknown>[], rules: Record<string, unknown> = {}) {
	return parseProgression({
		schemaVersion: 1,
		id: 'fr.progression.synthetic',
		locale: 'fr-FR',
		layoutIds: ['fr-fr-azerty-pc'],
		rules: { ...RULES, ...rules },
		worlds: [
			{
				id: 'fr.world.synthetic',
				title: 'Synthetic',
				themeId: 'dinos',
				gameIds: ['hatching'],
				lessons
			}
		]
	});
}

const SYNTHETIC = progressionOf([
	lesson('fj', ['f', 'j'], { groupLength: [2, 4] }),
	lesson('space', [SPACE], { groupLength: [3, 4] }),
	lesson('dk', ['d', 'k']),
	lesson('words', ['e'], {
		words: ['fe', 'je', 'de', 'kef'],
		mix: { drills: 1, words: 1, phrases: 0 }
	}),
	lesson('sl', ['s', 'l']),
	lesson('i', ['i'], { mix: EVERYTHING }),
	lesson('caps', [], { unlocks: ['uppercase'] }),
	lesson('dot', ['.'], { mix: EVERYTHING }),
	lesson('only-words', [], { mix: WORDS_ONLY, groupCount: 6 }),
	lesson('only-phrases', [], { mix: PHRASES_ONLY, groupCount: 3 }),
	lesson('long-drills', [], { groupLength: [7, 8] }),
	lesson('hand-words', [], {
		words: ['fils', 'elfe'],
		mix: WORDS_ONLY,
		groupCount: 4
	})
]);

const WORD_BANK: WordBank = parseWordBank({
	schemaVersion: 1,
	id: 'fr.words.synthetic',
	locale: 'fr-FR',
	sources: [],
	themes: [
		{ id: 'dinos', title: 'Dinos' },
		{ id: 'cuisine', title: 'Cuisine' }
	],
	words: [
		{ text: 'les', themes: ['dinos'], level: 1, review: 'agent' },
		{ text: 'elle', themes: [], level: 1, review: 'agent' },
		{ text: 'il', themes: [], level: 1, review: 'agent' },
		{ text: 'ils', themes: ['dinos'], level: 1, review: 'agent' },
		{ text: 'fil', themes: [], level: 1, review: 'agent' },
		{ text: 'sel', themes: ['cuisine'], level: 1, review: 'agent' },
		{ text: 'ses', themes: [], level: 1, review: 'agent' },
		{ text: 'ski', themes: [], level: 2, review: 'agent' },
		{ text: 'fille', themes: [], level: 2, review: 'agent' },
		{ text: 'lisse', themes: [], level: 3, review: 'agent' },
		{ text: 'dis', themes: [], level: 1, review: 'agent' },
		{ text: 'table', themes: ['cuisine'], level: 1, review: 'agent' },
		{ text: 'chat', themes: [], level: 1, review: 'agent' }
	]
});

const PHRASE_BANK: PhraseBank = parsePhraseBank({
	schemaVersion: 1,
	id: 'fr.phrases.synthetic',
	locale: 'fr-FR',
	phrases: [
		{ text: 'Je lis.', themes: [], level: 1, review: 'agent' },
		{ text: 'Il file.', themes: ['dinos'], level: 1, review: 'agent' },
		{ text: 'Elle lie ses skis.', themes: [], level: 2, review: 'agent' },
		{ text: 'Je dis le sel.', themes: ['cuisine'], level: 1, review: 'agent' },
		{ text: 'Elle lie ses fils si je lis des lis.', themes: [], level: 3, review: 'agent' },
		{ text: 'Le chat dort.', themes: [], level: 1, review: 'agent' }
	]
});

const SHIPPED_WORDS = parseWordBank({
	schemaVersion: 1,
	id: 'fr.words.shipped-check',
	locale: 'fr-FR',
	sources: [],
	themes: [
		{ id: 'cuisine', title: 'Cuisine' },
		{ id: 'animaux', title: 'Animaux' },
		{ id: 'espace', title: 'Espace' },
		{ id: 'vehicules', title: 'Véhicules' }
	],
	words: [
		['sel', 'cuisine', 1],
		['lait', 'cuisine', 1],
		['pain', 'cuisine', 1],
		['sucre', 'cuisine', 1],
		['tarte', 'cuisine', 2],
		['poire', 'cuisine', 2],
		['citron', 'cuisine', 2],
		['chat', 'animaux', 1],
		['chien', 'animaux', 1],
		['vache', 'animaux', 2],
		['zèbre', 'animaux', 3],
		['lune', 'espace', 1],
		['étoile', 'espace', 2],
		['fusée', 'espace', 2],
		['planète', 'espace', 3],
		['train', 'vehicules', 1],
		['avion', 'vehicules', 1],
		['vélo', 'vehicules', 2],
		['camion', 'vehicules', 2],
		['à', 'vehicules', 1],
		['où', 'vehicules', 1],
		['être', 'vehicules', 2],
		['île', 'vehicules', 3]
	].map(([text, theme, level]) => ({
		text,
		themes: [theme],
		level,
		review: 'agent'
	}))
});

const SHIPPED_PHRASES = parsePhraseBank({
	schemaVersion: 1,
	id: 'fr.phrases.shipped-check',
	locale: 'fr-FR',
	phrases: [
		['Je lis.', 1],
		['Le chat dort.', 1],
		['Tu veux du pain?', 1],
		["L'avion vole haut!", 2],
		['Où est la lune?', 2],
		['La fusée part, vite!', 2],
		['Le train rapide file là-bas.', 3],
		['Le zèbre mange à la ferme, et le chien dort.', 3]
	].map(([text, level]) => ({ text, themes: [], level, review: 'agent' }))
});

const FULL_CONTEXT: ExerciseContext = {
	words: WORD_BANK,
	phrases: PHRASE_BANK,
	themeId: 'dinos'
};

const SHIPPED_CONTEXT: ExerciseContext = {
	words: SHIPPED_WORDS,
	phrases: SHIPPED_PHRASES,
	themeId: 'espace'
};

function withRules(
	progression: ProgressionDefinition,
	rules: Partial<ProgressionDefinition['rules']>
): ProgressionDefinition {
	return { ...progression, rules: { ...progression.rules, ...rules } };
}

function allLessons(): (readonly [ProgressionDefinition, LessonDefinition, ExerciseContext])[] {
	return [
		...lessonIds(SYNTHETIC).map(
			(id) => [SYNTHETIC, findLesson(SYNTHETIC, id) as LessonDefinition, FULL_CONTEXT] as const
		),
		...SHIPPED.flatMap((shipped) =>
			lessonIds(shipped.progression).map(
				(id) =>
					[
						shipped.progression,
						findLesson(shipped.progression, id) as LessonDefinition,
						SHIPPED_CONTEXT
					] as const
			)
		)
	];
}

function graphemesOfGroups(exercise: Exercise): string[] {
	return exercise.groups.flatMap((group) => toGraphemes(group));
}

function lengthOf(group: string): number {
	return toGraphemes(group).length;
}

function playableTexts(
	progression: ProgressionDefinition,
	lessonId: string,
	context: ExerciseContext
): { words: Set<string>; phrases: Set<string> } {
	const learned = learnedChars(progression, lessonId);
	const options = { maxLevel: context.maxLevel };
	const words = new Set(findLesson(progression, lessonId)?.words ?? []);
	if (context.words)
		for (const w of usableWords(context.words, learned, options)) words.add(w.text);
	const phrases = new Set<string>();
	if (context.phrases) {
		for (const p of usablePhrases(context.phrases, learned, options)) phrases.add(p.text);
	}
	return { words, phrases };
}

function countOf(groups: readonly string[], char: string): number {
	return groups.flatMap((group) => toGraphemes(group)).filter((grapheme) => grapheme === char)
		.length;
}

function checkExercise(
	progression: ProgressionDefinition,
	lessonDefinition: LessonDefinition,
	exercise: Exercise,
	context: ExerciseContext
) {
	const learned = new Set(learnedChars(progression, lessonDefinition.id));
	const { words, phrases } = playableTexts(progression, lessonDefinition.id, context);
	const [min, max] = lessonDefinition.groupLength;
	expect(exercise.lessonId).toBe(lessonDefinition.id);

	const minimum = progression.rules.newCharMinCount;
	const isComplete = (groups: readonly string[]): boolean =>
		groups.reduce((sum, group) => sum + lengthOf(group), 0) >= lessonDefinition.targetLength &&
		lessonDefinition.newChars.every((char) => countOf(groups, char) >= minimum);
	expect(exercise.groups.length).toBeGreaterThan(0);
	expect(exercise.groups.length).toBeLessThanOrEqual(lessonDefinition.groupCount);
	const reachedCount = exercise.groups.length === lessonDefinition.groupCount;
	expect(reachedCount || isComplete(exercise.groups)).toBe(true);
	expect(isComplete(exercise.groups.slice(0, -1))).toBe(false);

	exercise.groups.forEach((group, index) => {
		const graphemes = toGraphemes(group);
		expect(graphemes.length).toBeGreaterThan(0);
		for (const grapheme of graphemes) expect(learned.has(grapheme)).toBe(true);
		expect(group.startsWith(SPACE)).toBe(false);
		expect(group.endsWith(SPACE)).toBe(false);
		expect(group).not.toContain('  ');
		if (!phrases.has(group)) {
			if (!words.has(group)) {
				expect(graphemes.length).toBeGreaterThanOrEqual(min);
				expect(graphemes.length).toBeLessThanOrEqual(max);
			}
			expect(group).not.toMatch(/(.)\1\1/u);
		}
		if (index > 0) expect(group).not.toBe(exercise.groups[index - 1]);
	});

	for (const char of lessonDefinition.newChars) {
		expect(countOf(exercise.groups, char)).toBeGreaterThanOrEqual(Math.max(1, minimum));
	}
}

function generate(
	progression: ProgressionDefinition,
	lessonId: string,
	seed: number,
	context?: ExerciseContext
): Exercise {
	return generateExercise(progression, lessonId, seededRng(seed), context);
}

function share(count: number, total: number): number {
	return count / total;
}

describe('generateExercise', () => {
	it('is reproducible for the same sequence of random values', () => {
		const first = generate(SYNTHETIC, 'fr.lesson.dot', 42, FULL_CONTEXT);
		const second = generate(SYNTHETIC, 'fr.lesson.dot', 42, FULL_CONTEXT);
		expect(second).toEqual(first);
	});

	it('varies with the random values', () => {
		const texts = new Set(
			[1, 2, 3, 4, 5].map((seed) => generate(SYNTHETIC, 'fr.lesson.dk', seed).groups.join('|'))
		);
		expect(texts.size).toBeGreaterThan(1);
	});

	it('behaves like an empty context when none is given', () => {
		for (const id of lessonIds(SYNTHETIC)) {
			expect(generate(SYNTHETIC, id, 5)).toEqual(generate(SYNTHETIC, id, 5, {}));
		}
	});

	it('produces the number of groups asked by the lesson when the length is not reached', () => {
		expect(generate(SYNTHETIC, 'fr.lesson.fj', 1).groups).toHaveLength(10);
	});

	it('refuses an unknown lesson', () => {
		expect(() => generateExercise(SYNTHETIC, 'fr.lesson.zzz', seededRng(1))).toThrow(RangeError);
	});

	it('uses only the new characters of the first lesson', () => {
		const exercise = generate(SYNTHETIC, 'fr.lesson.fj', 7);
		expect(new Set(graphemesOfGroups(exercise))).toEqual(new Set(['f', 'j']));
	});

	it('mixes new and known characters', () => {
		const exercise = generate(SYNTHETIC, 'fr.lesson.dk', 7);
		const present = new Set(graphemesOfGroups(exercise));
		expect([...present].some((char) => 'dk'.includes(char))).toBe(true);
		expect([...present].some((char) => 'fj '.includes(char))).toBe(true);
	});

	it('draws only new characters when their weight is 1', () => {
		const progression = withRules(SYNTHETIC, { newCharWeight: 1 });
		for (let seed = 0; seed < 20; seed++) {
			const exercise = generate(progression, 'fr.lesson.dk', seed);
			expect(new Set(graphemesOfGroups(exercise))).toEqual(new Set(['d', 'k']));
		}
	});

	it('only places new characters when needed if their weight is 0', () => {
		const progression = withRules(SYNTHETIC, { newCharWeight: 0 });
		for (let seed = 0; seed < 20; seed++) {
			const exercise = generate(progression, 'fr.lesson.dk', seed);
			const fresh = graphemesOfGroups(exercise).filter((char) => 'dk'.includes(char));
			expect(fresh.sort()).toEqual(['d', 'k']);
		}
	});

	it('keeps the space inside the group when the space is the new character', () => {
		for (let seed = 0; seed < 50; seed++) {
			const exercise = generate(SYNTHETIC, 'fr.lesson.space', seed);
			for (const group of exercise.groups) {
				expect(group).toMatch(/^\S.*\S$/u);
				expect(lengthOf(group)).toBeGreaterThanOrEqual(3);
				expect(lengthOf(group)).toBeLessThanOrEqual(4);
			}
			expect(exercise.groups.some((group) => group.includes(SPACE))).toBe(true);
		}
	});

	it('does not modify the progression, the banks or the progress', () => {
		const before = clone(SYNTHETIC);
		const progress: ProgressState = {
			lessons: {},
			chars: { k: { attempts: 4, errors: 2, recent: [{ attempts: 4, errors: 2 }] } }
		};
		const context = deepFreeze({ ...FULL_CONTEXT, progress: clone(progress) });
		generate(deepFreeze(clone(SYNTHETIC)), 'fr.lesson.dot', 3, context);
		generate(SYNTHETIC, 'fr.lesson.words', 3);
		expect(SYNTHETIC).toEqual(before);
	});

	it('gives up with an explicit error when two different groups are impossible', () => {
		const only: LessonDefinition = {
			id: 'fr.lesson.one',
			title: 'One',
			intro: 'Intro.',
			newChars: ['f'],
			words: [],
			mix: DRILLS,
			unlocks: [],
			groupCount: 3,
			targetLength: 100,
			groupLength: [1, 1]
		};
		const impossible: ProgressionDefinition = {
			...SYNTHETIC,
			worlds: [
				{
					id: 'fr.world.synthetic',
					title: 'Synthetic',
					themeId: 'dinos',
					gameIds: ['hatching'],
					lessons: [only]
				}
			]
		};
		expect(() => generateExercise(impossible, 'fr.lesson.one', seededRng(1))).toThrow(
			/two different consecutive groups/
		);
	});

	describe('length and group count', () => {
		const short = progressionOf([
			lesson('fj', ['f', 'j'], { groupCount: 50, targetLength: 12, groupLength: [2, 4] })
		]);
		const few = progressionOf([
			lesson('fj', ['f', 'j'], { groupCount: 3, targetLength: 500, groupLength: [2, 4] })
		]);

		it('stops once the target length is reached', () => {
			for (let seed = 0; seed < 30; seed++) {
				const lengths = generate(short, 'fr.lesson.fj', seed).groups.map(lengthOf);
				const total = lengths.reduce((sum, length) => sum + length, 0);
				expect(total).toBeGreaterThanOrEqual(12);
				expect(total - (lengths[lengths.length - 1] as number)).toBeLessThan(12);
			}
		});

		it('stops at the group count when the target length is out of reach', () => {
			for (let seed = 0; seed < 30; seed++) {
				expect(generate(few, 'fr.lesson.fj', seed).groups).toHaveLength(3);
			}
		});

		it('stops at whichever limit comes first, for any pair of limits', () => {
			fc.assert(
				fc.property(
					fc.integer({ min: 2, max: 12 }),
					fc.integer({ min: 1, max: 60 }),
					SEEDS,
					(groupCount, targetLength, seed) => {
						const progression = progressionOf([
							lesson('fj', ['f', 'j'], { groupCount, targetLength, groupLength: [2, 4] })
						]);
						const lengths = generate(progression, 'fr.lesson.fj', seed).groups.map(lengthOf);
						const total = lengths.reduce((sum, length) => sum + length, 0);
						expect(lengths.length).toBeLessThanOrEqual(groupCount);
						expect(lengths.length === groupCount || total >= targetLength).toBe(true);
						expect(total - (lengths[lengths.length - 1] as number)).toBeLessThan(targetLength);
					}
				)
			);
		});

		it('still covers every new character when the limits are tight', () => {
			const tight = progressionOf([
				lesson('fj', ['f', 'j'], { groupCount: 2, targetLength: 1, groupLength: [2, 4] }),
				lesson('five', ['d', 'k', 's', 'l', 'e'], {
					groupCount: 5,
					targetLength: 1,
					groupLength: [5, 5]
				})
			]);
			for (let seed = 0; seed < 50; seed++) {
				const exercise = generate(tight, 'fr.lesson.five', seed);
				expect(new Set(graphemesOfGroups(exercise))).toContain('d');
				for (const char of 'dksle') expect(graphemesOfGroups(exercise)).toContain(char);
			}
		});
	});

	describe('kinds of groups', () => {
		const learnedAtDot = learnedChars(SYNTHETIC, 'fr.lesson.dot');

		it('draws only suites when the mix asks for suites only, even with material available', () => {
			const { words, phrases } = playableTexts(SYNTHETIC, 'fr.lesson.long-drills', FULL_CONTEXT);
			expect(words.size).toBeGreaterThan(5);
			for (let seed = 0; seed < 30; seed++) {
				const exercise = generate(SYNTHETIC, 'fr.lesson.long-drills', seed, FULL_CONTEXT);
				for (const group of exercise.groups) {
					expect(words.has(group) || phrases.has(group)).toBe(false);
					expect(lengthOf(group)).toBeGreaterThanOrEqual(7);
				}
			}
		});

		it('draws only words from the bank when the mix asks for words only', () => {
			const { words } = playableTexts(SYNTHETIC, 'fr.lesson.only-words', FULL_CONTEXT);
			expect(words.size).toBeGreaterThan(5);
			for (let seed = 0; seed < 30; seed++) {
				const exercise = generate(SYNTHETIC, 'fr.lesson.only-words', seed, FULL_CONTEXT);
				for (const group of exercise.groups) expect(words.has(group)).toBe(true);
			}
		});

		it('draws only phrases when the mix asks for phrases only', () => {
			const { phrases } = playableTexts(SYNTHETIC, 'fr.lesson.only-phrases', FULL_CONTEXT);
			expect(phrases.size).toBeGreaterThan(2);
			for (let seed = 0; seed < 30; seed++) {
				const exercise = generate(SYNTHETIC, 'fr.lesson.only-phrases', seed, FULL_CONTEXT);
				for (const group of exercise.groups) expect(phrases.has(group)).toBe(true);
			}
		});

		it('draws words from the hand-picked list of the lesson without any bank', () => {
			for (let seed = 0; seed < 20; seed++) {
				const exercise = generate(SYNTHETIC, 'fr.lesson.hand-words', seed);
				for (const group of exercise.groups) expect(['fils', 'elfe']).toContain(group);
			}
		});

		it('falls back to suites when the mix wants words and phrases but there are none', () => {
			const progression = progressionOf([
				lesson('fj', ['f', 'j'], { mix: { drills: 0, words: 1, phrases: 1 } })
			]);
			for (let seed = 0; seed < 20; seed++) {
				const exercise = generate(progression, 'fr.lesson.fj', seed);
				expect(exercise.groups.length).toBeGreaterThan(0);
				for (const group of exercise.groups) expect(lengthOf(group)).toBeLessThanOrEqual(5);
			}
		});

		it('does not offer a phrase before its capitals and punctuation are learned', () => {
			expect(usablePhrases(PHRASE_BANK, learnedChars(SYNTHETIC, 'fr.lesson.caps'))).toEqual([]);
			expect(usablePhrases(PHRASE_BANK, learnedAtDot).length).toBeGreaterThan(0);
			const progression = progressionOf([
				lesson('fj', ['f', 'j']),
				lesson('space', [SPACE]),
				lesson('es', ['e', 's', 'l', 'i'], { mix: PHRASES_ONLY, groupLength: [3, 5] })
			]);
			const exercise = generate(progression, 'fr.lesson.es', 2, FULL_CONTEXT);
			for (const group of exercise.groups) expect(group).not.toMatch(/\./u);
		});

		it('follows the proportions of the mix', () => {
			const progression = progressionOf([
				...(SYNTHETIC.worlds[0]?.lessons.slice(0, 8) ?? []).map((l) => ({ ...l })),
				lesson('mixed', [], { mix: { drills: 1, words: 2, phrases: 1 }, groupCount: 20 })
			] as Record<string, unknown>[]);
			const { words, phrases } = playableTexts(progression, 'fr.lesson.mixed', FULL_CONTEXT);
			let drills = 0;
			let wordGroups = 0;
			let phraseGroups = 0;
			for (let seed = 0; seed < 100; seed++) {
				for (const group of generate(progression, 'fr.lesson.mixed', seed, FULL_CONTEXT).groups) {
					if (phrases.has(group)) phraseGroups += 1;
					else if (words.has(group)) wordGroups += 1;
					else drills += 1;
				}
			}
			const total = drills + wordGroups + phraseGroups;
			expect(share(drills, total)).toBeGreaterThan(0.15);
			expect(share(drills, total)).toBeLessThan(0.35);
			expect(share(wordGroups, total)).toBeGreaterThan(0.38);
			expect(share(wordGroups, total)).toBeLessThan(0.62);
			expect(share(phraseGroups, total)).toBeGreaterThan(0.15);
			expect(share(phraseGroups, total)).toBeLessThan(0.35);
		});
	});

	describe('words and phrases', () => {
		it('never uses a character that is not learned yet, even when the bank has such words', () => {
			const learned = new Set(learnedChars(SYNTHETIC, 'fr.lesson.only-words'));
			for (let seed = 0; seed < 50; seed++) {
				const exercise = generate(SYNTHETIC, 'fr.lesson.only-words', seed, FULL_CONTEXT);
				expect(exercise.groups).not.toContain('table');
				expect(exercise.groups).not.toContain('chat');
				for (const char of graphemesOfGroups(exercise)) expect(learned.has(char)).toBe(true);
			}
		});

		it('respects the maximum level', () => {
			for (let seed = 0; seed < 40; seed++) {
				const exercise = generate(SYNTHETIC, 'fr.lesson.only-words', seed, {
					...FULL_CONTEXT,
					maxLevel: 1
				});
				for (const group of exercise.groups) {
					expect(['les', 'elle', 'il', 'ils', 'fil', 'sel', 'ses', 'dis']).toContain(group);
				}
				const phrases = generate(SYNTHETIC, 'fr.lesson.only-phrases', seed, {
					...FULL_CONTEXT,
					maxLevel: 2
				});
				expect(phrases.groups).not.toContain('Elle lie ses fils si je lis des lis.');
			}
		});

		it('allows every level by default', () => {
			const seen = new Set<string>();
			for (let seed = 0; seed < 60; seed++) {
				for (const group of generate(SYNTHETIC, 'fr.lesson.only-words', seed, FULL_CONTEXT)
					.groups) {
					seen.add(group);
				}
			}
			expect(seen).toContain('lisse');
		});

		it('does not repeat a word or a phrase before the reserve is exhausted', () => {
			const wordCount = playableTexts(SYNTHETIC, 'fr.lesson.only-words', FULL_CONTEXT).words.size;
			const phraseCount = playableTexts(SYNTHETIC, 'fr.lesson.only-phrases', FULL_CONTEXT).phrases
				.size;
			expect(wordCount).toBeGreaterThanOrEqual(6);
			expect(phraseCount).toBeGreaterThanOrEqual(3);
			for (let seed = 0; seed < 100; seed++) {
				const words = generate(SYNTHETIC, 'fr.lesson.only-words', seed, FULL_CONTEXT).groups;
				expect(new Set(words).size).toBe(words.length);
				const phrases = generate(SYNTHETIC, 'fr.lesson.only-phrases', seed, FULL_CONTEXT).groups;
				expect(new Set(phrases).size).toBe(phrases.length);
			}
		});

		it('repeats words once the reserve is exhausted, never two in a row', () => {
			for (let seed = 0; seed < 30; seed++) {
				const exercise = generate(SYNTHETIC, 'fr.lesson.hand-words', seed);
				expect(exercise.groups).toHaveLength(4);
				expect(new Set(exercise.groups.slice(0, 2)).size).toBe(2);
				expect(new Set(exercise.groups.slice(2, 4)).size).toBe(2);
			}
		});

		it('prefers words with the new characters with the probability of the new character weight', () => {
			const progression = progressionOf(
				[
					lesson('fj', ['f', 'j']),
					lesson('space', [SPACE]),
					lesson('dk', ['d', 'k']),
					lesson('sl', ['s', 'l']),
					lesson('i', ['i'], {
						words: ['fil', 'dis', 'lis', 'ski'],
						mix: WORDS_ONLY,
						groupCount: 2
					}),
					lesson('e', ['e'], {
						words: ['sel', 'les', 'des', 'fil', 'dis'],
						mix: WORDS_ONLY,
						groupCount: 3
					})
				],
				{ newCharWeight: 1 }
			);
			for (let seed = 0; seed < 50; seed++) {
				expect(generate(progression, 'fr.lesson.e', seed).groups[0]).toMatch(/e/u);
				for (const group of generate(progression, 'fr.lesson.i', seed).groups) {
					expect(group).toMatch(/i/u);
				}
			}
			const never = withRules(progression, { newCharWeight: 0 });
			let withE = 0;
			for (let seed = 0; seed < 400; seed++) {
				if (generate(never, 'fr.lesson.e', seed).groups[0]?.includes('e')) withE += 1;
			}
			expect(share(withE, 400)).toBeGreaterThan(0.5);
			expect(share(withE, 400)).toBeLessThan(0.75);
		});

		describe('a lesson that asks for words', () => {
			const base = [
				lesson('fj', ['f', 'j']),
				lesson('space', [SPACE]),
				lesson('dk', ['d', 'k']),
				lesson('sl', ['s', 'l']),
				lesson('ei', ['e', 'i']),
				lesson('ru', ['r', 'u'])
			];
			const longPhrases = parsePhraseBank({
				schemaVersion: 1,
				id: 'fr.phrases.long-check',
				locale: 'fr-FR',
				phrases: [
					'elle relie les fils de fer',
					'je fuis le feu le jeudi',
					'il file sur ses skis lisses',
					'je lis les feuilles de elle'
				].map((text) => ({ text, themes: [], level: 1, review: 'agent' }))
			});
			const hasWord = (exercise: Exercise, words: readonly string[]) =>
				exercise.groups.some((group) => words.includes(group));

			it('always holds a word, even when two phrases would fill it', () => {
				const words = ['fil', 'sel', 'ski', 'dis'];
				const progression = progressionOf([
					...base,
					lesson('mostly-phrases', [], {
						words,
						mix: { drills: 1, words: 1, phrases: 20 },
						groupCount: 8,
						targetLength: 40
					})
				]);
				for (let seed = 0; seed < 300; seed++) {
					const exercise = generate(progression, 'fr.lesson.mostly-phrases', seed, {
						phrases: longPhrases
					});
					expect(hasWord(exercise, words), exercise.groups.join(' | ')).toBe(true);
				}
			});

			it('holds a word after the warm-up of its new characters', () => {
				const words = ['tes', 'net', 'lent', 'dent'];
				const progression = progressionOf(
					[
						...base,
						lesson('tn', ['t', 'n'], {
							words,
							mix: { drills: 1, words: 1, phrases: 20 },
							groupCount: 12,
							targetLength: 50
						})
					],
					{ newCharMinCount: 4 }
				);
				for (let seed = 0; seed < 300; seed++) {
					const exercise = generate(progression, 'fr.lesson.tn', seed, { phrases: longPhrases });
					expect(hasWord(exercise, words), exercise.groups.join(' | ')).toBe(true);
				}
			});

			it('asks for no word when the mix has none', () => {
				const progression = progressionOf([
					...base,
					lesson('no-words', [], { words: ['fil', 'sel'], mix: PHRASES_ONLY, groupCount: 3 })
				]);
				for (let seed = 0; seed < 50; seed++) {
					const exercise = generate(progression, 'fr.lesson.no-words', seed, {
						phrases: longPhrases
					});
					expect(hasWord(exercise, ['fil', 'sel'])).toBe(false);
				}
			});
		});

		describe('phrases with the new characters', () => {
			const phrases = (texts: string[]): PhraseBank =>
				parsePhraseBank({
					schemaVersion: 1,
					id: 'fr.phrases.fresh-check',
					locale: 'fr-FR',
					phrases: texts.map((text) => ({ text, themes: [], level: 1, review: 'agent' }))
				});
			const base = [
				lesson('fj', ['f', 'j']),
				lesson('space', [SPACE]),
				lesson('dk', ['d', 'k']),
				lesson('sl', ['s', 'l']),
				lesson('ei', ['e', 'i'])
			];
			const firstGroups = (
				progression: ProgressionDefinition,
				lessonId: string,
				bank: PhraseBank,
				runs: number
			) =>
				Array.from(
					{ length: runs },
					(_, seed) => generate(progression, lessonId, seed, { phrases: bank }).groups[0] as string
				);

			const withComma = progressionOf(
				[
					...base,
					lesson('caps', [], { unlocks: ['uppercase'] }),
					lesson('comma', [','], { mix: PHRASES_ONLY, groupCount: 2 })
				],
				{ newCharWeight: 1 }
			);
			const commaBank = phrases([
				'Je lis, il file',
				'Elle skie, je file',
				'Je lis',
				'Il file',
				'Elle lie ses skis',
				'Je dis le sel'
			]);

			it('prefers phrases with the new punctuation with the probability of the new character weight', () => {
				for (let seed = 0; seed < 50; seed++) {
					const { groups } = generate(withComma, 'fr.lesson.comma', seed, { phrases: commaBank });
					for (const group of groups) expect(group).toContain(',');
				}
				const never = withRules(withComma, { newCharWeight: 0 });
				const drawn = firstGroups(never, 'fr.lesson.comma', commaBank, 600);
				const commas = share(drawn.filter((group) => group.includes(',')).length, 600);
				expect(commas).toBeGreaterThan(0.25);
				expect(commas).toBeLessThan(0.42);
			});

			it('prefers phrases with capitals in the lesson that unlocks them', () => {
				const progression = progressionOf(
					[...base, lesson('caps', [], { unlocks: ['uppercase'], mix: PHRASES_ONLY })],
					{ newCharWeight: 1 }
				);
				const bank = phrases(['Je lis', 'je lis des lis', 'elle file', 'il skie', 'je dis le sel']);
				for (const group of firstGroups(progression, 'fr.lesson.caps', bank, 50)) {
					expect(group).toBe('Je lis');
				}
			});

			it('falls back to the other phrases when none has the new characters', () => {
				const bank = phrases(['Je lis', 'Il file', 'Elle lie ses skis']);
				for (const group of firstGroups(withComma, 'fr.lesson.comma', bank, 50)) {
					expect(bank.phrases.map((phrase) => phrase.text)).toContain(group);
				}
			});
		});
	});

	describe('theme boost', () => {
		const firstGroupShare = (rules: Record<string, unknown>, themeId: string | undefined) => {
			const progression = withRules(SYNTHETIC, rules);
			let themed = 0;
			const runs = 600;
			for (let seed = 0; seed < runs; seed++) {
				const group = generate(progression, 'fr.lesson.only-words', seed, {
					...FULL_CONTEXT,
					themeId
				}).groups[0] as string;
				if (['les', 'ils'].includes(group)) themed += 1;
			}
			return share(themed, runs);
		};
		const themedCount = 2;
		const poolSize = playableTexts(SYNTHETIC, 'fr.lesson.only-words', FULL_CONTEXT).words.size;
		const baseline = themedCount / poolSize;

		it('picks the words of the theme more often', () => {
			const boosted = firstGroupShare({ themeBoost: 4 }, 'dinos');
			expect(boosted).toBeGreaterThan(baseline * 1.8);
		});

		it('has no effect when the boost is 0', () => {
			const plain = firstGroupShare({ themeBoost: 0 }, 'dinos');
			expect(plain).toBeGreaterThan(baseline - 0.06);
			expect(plain).toBeLessThan(baseline + 0.06);
		});

		it('has no effect without a theme in the context or with an unrelated theme', () => {
			for (const themeId of [undefined, 'espace']) {
				const plain = firstGroupShare({ themeBoost: 4 }, themeId);
				expect(plain).toBeGreaterThan(baseline - 0.06);
				expect(plain).toBeLessThan(baseline + 0.06);
			}
		});

		it('also applies to phrases', () => {
			const progression = withRules(SYNTHETIC, { themeBoost: 6 });
			const runs = 400;
			let themed = 0;
			for (let seed = 0; seed < runs; seed++) {
				const group = generate(progression, 'fr.lesson.only-phrases', seed, FULL_CONTEXT)
					.groups[0] as string;
				if (group === 'Il file.') themed += 1;
			}
			const pool = playableTexts(SYNTHETIC, 'fr.lesson.only-phrases', FULL_CONTEXT).phrases.size;
			expect(share(themed, runs)).toBeGreaterThan((1 / pool) * 2);
		});
	});

	describe('weak characters', () => {
		/** Every keystroke of these totals was typed in one recent play. */
		const weak = (chars: Record<string, CharSample>): ProgressState => ({
			lessons: {},
			chars: Object.fromEntries(
				Object.entries(chars).map(([char, sample]) => [
					char,
					{ ...sample, recent: sample.attempts > 0 ? [sample] : [] }
				])
			)
		});

		it('picks words that contain a character the child gets wrong more often', () => {
			const progress = weak({ k: { attempts: 10, errors: 10 }, d: { attempts: 10, errors: 10 } });
			const withWeak = ['dis'];
			const runs = 600;
			const count = (context: ExerciseContext, rules: Record<string, unknown>) => {
				const progression = withRules(SYNTHETIC, rules);
				let hits = 0;
				for (let seed = 0; seed < runs; seed++) {
					const group = generate(progression, 'fr.lesson.only-words', seed, context)
						.groups[0] as string;
					if (withWeak.includes(group)) hits += 1;
				}
				return share(hits, runs);
			};
			const pool = playableTexts(SYNTHETIC, 'fr.lesson.only-words', FULL_CONTEXT).words.size;
			const baseline = 1 / pool;
			expect(count({ ...FULL_CONTEXT, progress }, { weakCharBoost: 4 })).toBeGreaterThan(
				baseline * 2
			);
			const off = count({ ...FULL_CONTEXT, progress }, { weakCharBoost: 0 });
			expect(off).toBeGreaterThan(baseline - 0.05);
			expect(off).toBeLessThan(baseline + 0.05);
			const noData = count(FULL_CONTEXT, { weakCharBoost: 4 });
			expect(noData).toBeGreaterThan(baseline - 0.05);
			expect(noData).toBeLessThan(baseline + 0.05);
		});

		it('practises a weak character more often in suites', () => {
			const progression = progressionOf([
				lesson('fj', ['f', 'j']),
				lesson('space', [SPACE]),
				lesson('dk', ['d', 'k']),
				lesson('none', [], { groupCount: 20, targetLength: 1000 })
			]);
			const frequency = (context: ExerciseContext, weakCharBoost: number) => {
				const configured = withRules(progression, { weakCharBoost });
				let k = 0;
				let all = 0;
				for (let seed = 0; seed < 100; seed++) {
					const chars = graphemesOfGroups(
						generate(configured, 'fr.lesson.none', seed, context)
					).filter((char) => char !== SPACE);
					k += chars.filter((char) => char === 'k').length;
					all += chars.length;
				}
				return share(k, all);
			};
			const progress = weak({ k: { attempts: 20, errors: 20 } });
			const boosted = frequency({ progress }, 2);
			const plain = frequency({}, 2);
			expect(plain).toBeGreaterThan(0.1);
			expect(plain).toBeLessThan(0.3);
			expect(boosted).toBeGreaterThan(plain * 1.5);
			expect(frequency({ progress }, 0)).toBeLessThan(plain * 1.3);
		});

		it('reads the recent plays of a character, not its lifetime totals', () => {
			const progression = progressionOf([
				lesson('fj', ['f', 'j']),
				lesson('space', [SPACE]),
				lesson('dk', ['d', 'k']),
				lesson('none', [], { groupCount: 20, targetLength: 1000 })
			]);
			const frequency = (context: ExerciseContext) => {
				let k = 0;
				let all = 0;
				for (let seed = 0; seed < 100; seed++) {
					const chars = graphemesOfGroups(
						generate(progression, 'fr.lesson.none', seed, context)
					).filter((char) => char !== SPACE);
					k += chars.filter((char) => char === 'k').length;
					all += chars.length;
				}
				return share(k, all);
			};
			const tamed: ProgressState = {
				lessons: {},
				chars: { k: { attempts: 500, errors: 500, recent: [{ attempts: 30, errors: 0 }] } }
			};
			const slipping: ProgressState = {
				lessons: {},
				chars: { k: { attempts: 500, errors: 0, recent: [{ attempts: 20, errors: 20 }] } }
			};
			const plain = frequency({});
			expect(frequency({ progress: tamed })).toBe(plain);
			expect(frequency({ progress: slipping })).toBeGreaterThan(plain * 1.5);
			for (let seed = 0; seed < 20; seed++) {
				expect(generate(progression, 'fr.lesson.none', seed, { progress: tamed })).toEqual(
					generate(progression, 'fr.lesson.none', seed)
				);
			}
		});

		it('treats missing or empty statistics as no error', () => {
			const progression = SYNTHETIC;
			const empty = weak({ k: { attempts: 0, errors: 0 } });
			expect(generate(progression, 'fr.lesson.dk', 9, { progress: empty })).toEqual(
				generate(progression, 'fr.lesson.dk', 9)
			);
		});
	});

	describe('capitals', () => {
		it('practises the capitals in the lesson that unlocks them', () => {
			const progression = withRules(SYNTHETIC, { newCharWeight: 1 });
			for (let seed = 0; seed < 20; seed++) {
				const exercise = generate(progression, 'fr.lesson.caps', seed);
				expect(graphemesOfGroups(exercise).every((char) => /[A-Z]/u.test(char))).toBe(true);
			}
		});

		it('does not ask for a capital before the unlocking lesson', () => {
			for (let seed = 0; seed < 20; seed++) {
				const exercise = generate(SYNTHETIC, 'fr.lesson.sl', seed);
				expect(graphemesOfGroups(exercise).some((char) => /[A-Z]/u.test(char))).toBe(false);
			}
		});

		it('keeps asking for capitals in later lessons, only for letters that are known', () => {
			const learned = new Set(learnedChars(SYNTHETIC, 'fr.lesson.long-drills'));
			const seen = new Set<string>();
			for (let seed = 0; seed < 50; seed++) {
				for (const char of graphemesOfGroups(generate(SYNTHETIC, 'fr.lesson.long-drills', seed))) {
					expect(learned.has(char)).toBe(true);
					seen.add(char);
				}
			}
			expect([...seen].some((char) => /[A-Z]/u.test(char))).toBe(true);
		});
	});

	describe('minimum count of each new character', () => {
		const withMinimum = (newCharMinCount: number) => withRules(SYNTHETIC, { newCharMinCount });
		const lessonsWithNewChars = lessonIds(SYNTHETIC).filter(
			(id) => (findLesson(SYNTHETIC, id) as LessonDefinition).newChars.length > 0
		);

		it('keeps the exact exercises of before the rule existed when the minimum is 0', () => {
			expect(generate(SYNTHETIC, 'fr.lesson.dk', 7).groups).toEqual([
				'jdd',
				'djdkk',
				'ddkkd',
				'jfddk',
				'k dd',
				'kdj',
				'jk jk',
				'fdjj',
				'kjddj',
				'j k'
			]);
			expect(generate(SYNTHETIC, 'fr.lesson.dot', 42, FULL_CONTEXT).groups).toEqual([
				'Je dis le sel.',
				'Il file.',
				'sel',
				'Je lis.',
				'Elle lie ses skis.',
				'J.f.',
				'les',
				'..E..',
				'ses',
				'ski'
			]);
		});

		it.each(lessonsWithNewChars)(
			'%s: asks every new character at least that many times',
			(lessonId) => {
				const { newChars } = findLesson(SYNTHETIC, lessonId) as LessonDefinition;
				for (let seed = 0; seed < 50; seed++) {
					const { groups } = generate(withMinimum(4), lessonId, seed, FULL_CONTEXT);
					for (const char of newChars) expect(countOf(groups, char)).toBeGreaterThanOrEqual(4);
				}
			}
		);

		it('starts with groups that hold every new character still below the minimum', () => {
			for (let seed = 0; seed < 50; seed++) {
				const { groups } = generate(withMinimum(3), 'fr.lesson.words', seed, FULL_CONTEXT);
				let warmUps = 0;
				while (countOf(groups.slice(0, warmUps), 'e') < 3) {
					expect(groups[warmUps]).toContain('e');
					warmUps += 1;
				}
				expect(warmUps).toBeGreaterThan(0);
				expect(warmUps).toBeLessThanOrEqual(3);
			}
		});

		it('warms up with suites, even when the mix asks for words only', () => {
			const progression = progressionOf(
				[
					lesson('fj', ['f', 'j']),
					lesson('e', ['e'], { words: ['fe', 'je', 'fjef'], mix: WORDS_ONLY, groupLength: [5, 5] })
				],
				{ newCharMinCount: 2 }
			);
			for (let seed = 0; seed < 30; seed++) {
				const first = generate(progression, 'fr.lesson.e', seed).groups[0] as string;
				expect(lengthOf(first)).toBe(5);
				expect(first).toContain('e');
			}
		});

		it('counts the warm-up groups in the group count', () => {
			const progression = progressionOf(
				[lesson('fj', ['f', 'j'], { groupCount: 6, targetLength: 500, groupLength: [2, 4] })],
				{ newCharMinCount: 6 }
			);
			for (let seed = 0; seed < 30; seed++) {
				const { groups } = generate(progression, 'fr.lesson.fj', seed);
				expect(groups).toHaveLength(6);
				for (const char of 'fj') expect(countOf(groups, char)).toBeGreaterThanOrEqual(6);
			}
		});

		it('counts the warm-up groups in the target length', () => {
			const progression = progressionOf(
				[
					lesson('fj', ['f', 'j']),
					lesson('dk', ['d', 'k'], { groupCount: 50, targetLength: 30, groupLength: [3, 5] })
				],
				{ newCharMinCount: 3 }
			);
			for (let seed = 0; seed < 30; seed++) {
				const lengths = generate(progression, 'fr.lesson.dk', seed).groups.map(lengthOf);
				const total = lengths.reduce((sum, length) => sum + length, 0);
				expect(total).toBeGreaterThanOrEqual(30);
				expect(total - (lengths[lengths.length - 1] as number)).toBeLessThan(30);
			}
		});

		it('goes past the target length rather than below the minimum', () => {
			const progression = progressionOf(
				[lesson('fj', ['f', 'j'], { groupCount: 10, targetLength: 1, groupLength: [2, 4] })],
				{ newCharMinCount: 5 }
			);
			for (let seed = 0; seed < 30; seed++) {
				const { groups } = generate(progression, 'fr.lesson.fj', seed);
				expect(groups.length).toBeLessThanOrEqual(5);
				for (const char of 'fj') expect(countOf(groups, char)).toBeGreaterThanOrEqual(5);
				const before = groups.slice(0, -1);
				expect(['f', 'j'].some((char) => countOf(before, char) < 5)).toBe(true);
			}
		});

		it('keeps the space inside the warm-up groups', () => {
			for (let seed = 0; seed < 50; seed++) {
				const { groups } = generate(withMinimum(6), 'fr.lesson.space', seed);
				expect(countOf(groups, SPACE)).toBeGreaterThanOrEqual(6);
				for (const group of groups) expect(group).toMatch(/^\S+( \S+)*$/u);
			}
		});

		it('does not concern the capitals a lesson unlocks, nor a lesson without new character', () => {
			for (const id of ['fr.lesson.caps', 'fr.lesson.only-words', 'fr.lesson.long-drills']) {
				for (let seed = 0; seed < 10; seed++) {
					expect(generate(withMinimum(5), id, seed, FULL_CONTEXT)).toEqual(
						generate(SYNTHETIC, id, seed, FULL_CONTEXT)
					);
				}
			}
		});

		it.each(
			allLessons().map(([progression, l, context]) => [l.id, progression, l, context] as const)
		)(
			'%s: respects the constraints for any seed and any minimum',
			(_id, progression, lessonDefinition, context) => {
				fc.assert(
					fc.property(SEEDS, fc.integer({ min: 1, max: 8 }), (seed, newCharMinCount) => {
						const configured = withRules(progression, { newCharMinCount });
						const exercise = generate(configured, lessonDefinition.id, seed, context);
						checkExercise(configured, lessonDefinition, exercise, context);
						checkExercise(
							configured,
							lessonDefinition,
							generate(configured, lessonDefinition.id, seed),
							{}
						);
						expect(generate(configured, lessonDefinition.id, seed, context)).toEqual(exercise);
					}),
					{ numRuns: 25 }
				);
			}
		);
	});

	describe('properties on every lesson', () => {
		it.each(
			allLessons().map(([progression, l, context]) => [l.id, progression, l, context] as const)
		)(
			'%s: respects the constraints for any seed',
			(_id, progression, lessonDefinition, context) => {
				fc.assert(
					fc.property(SEEDS, (seed) => {
						checkExercise(
							progression,
							lessonDefinition,
							generate(progression, lessonDefinition.id, seed, context),
							context
						);
						checkExercise(
							progression,
							lessonDefinition,
							generate(progression, lessonDefinition.id, seed),
							{}
						);
					}),
					{ numRuns: 40 }
				);
			}
		);

		it.each(
			allLessons().map(([progression, l, context]) => [l.id, progression, l, context] as const)
		)('%s: is deterministic for any seed', (_id, progression, lessonDefinition, context) => {
			fc.assert(
				fc.property(SEEDS, (seed) => {
					expect(generate(progression, lessonDefinition.id, seed, context)).toEqual(
						generate(progression, lessonDefinition.id, seed, context)
					);
				}),
				{ numRuns: 20 }
			);
		});

		it.each(
			allLessons().map(([progression, l, context]) => [l.id, progression, l, context] as const)
		)(
			'%s: keeps to the maximum level and to the learned characters with a weak-character history',
			(_id, progression, lessonDefinition, context) => {
				const learned = learnedChars(progression, lessonDefinition.id);
				const history: ProgressState = {
					lessons: {},
					chars: Object.fromEntries(
						learned
							.slice(0, 4)
							.map((char) => [
								char,
								{ attempts: 5, errors: 3, recent: [{ attempts: 5, errors: 3 }] }
							])
					)
				};
				fc.assert(
					fc.property(SEEDS, fc.constantFrom<1 | 2 | 3>(1, 2, 3), (seed, maxLevel) => {
						const configured = { ...context, maxLevel, progress: history };
						checkExercise(
							progression,
							lessonDefinition,
							generate(progression, lessonDefinition.id, seed, configured),
							configured
						);
					}),
					{ numRuns: 20 }
				);
			}
		);

		it('holds with arbitrary random values, not only a seeded generator', () => {
			const lessonDefinition = findLesson(SYNTHETIC, 'fr.lesson.dot') as LessonDefinition;
			fc.assert(
				fc.property(
					fc.array(fc.double({ min: 0, max: 1, maxExcluded: true, noNaN: true }), { minLength: 1 }),
					fc.constantFrom(0, 3),
					(values, newCharMinCount) => {
						let cursor = 0;
						const rng = () => values[cursor++ % values.length] as number;
						const configured = withRules(SYNTHETIC, { newCharMinCount });
						try {
							checkExercise(
								configured,
								lessonDefinition,
								generateExercise(configured, lessonDefinition.id, rng, FULL_CONTEXT),
								FULL_CONTEXT
							);
						} catch (error) {
							expect(String(error)).toMatch(/two different consecutive groups|cannot place/);
						}
					}
				),
				{ numRuns: 100 }
			);
		});
	});
});
