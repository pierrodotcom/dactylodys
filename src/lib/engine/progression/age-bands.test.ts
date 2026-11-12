import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
	ageCoverageIssues,
	lessonEntryCounts,
	parseAgeCoverageRules,
	type AgeCoverageRules
} from './age-coverage';
import {
	AGE_BANDS,
	fitsAgeBand,
	lessonTexts,
	parsePhraseBank,
	parseTextBank,
	parseWordBank,
	storyPhrases,
	usablePhrases,
	usableWords
} from './banks';
import { parseProgression } from './definition';
import { generateExercise } from './exercise';
import { seededRng } from './test-support';
import type { AgeBand, ExerciseContext, ExerciseMix } from './types';

const SEEDS = fc.integer({ min: 0, max: 2 ** 32 - 1 });
const AGE_MARKS: readonly (readonly AgeBand[] | undefined)[] = [undefined, ['8-9'], ['10-12']];
const markArb = fc.constantFrom(...AGE_MARKS);
const bandArb = fc.constantFrom<AgeBand>(...AGE_BANDS);

const WORD_TEXTS = [
	'les',
	'elle',
	'il',
	'ils',
	'fil',
	'sel',
	'ses',
	'ski',
	'fille',
	'lisse',
	'dis'
];
const PHRASE_TEXTS = ['Je lis.', 'Il file.', 'Elle lie ses skis.', 'Je dis le sel.', 'Il lisse.'];

const WORDS_ONLY: ExerciseMix = { drills: 0, words: 1, phrases: 0 };
const PHRASES_ONLY: ExerciseMix = { drills: 0, words: 0, phrases: 1 };

function wordBankWith(marks: readonly (readonly AgeBand[] | undefined)[]) {
	return parseWordBank({
		schemaVersion: 1,
		id: 'fr.words.ages',
		locale: 'fr-FR',
		sources: [],
		themes: [],
		words: WORD_TEXTS.map((text, i) => ({
			text,
			themes: [],
			level: 1,
			review: 'agent',
			...(marks[i] === undefined ? {} : { ages: marks[i] })
		}))
	});
}

function phraseBankWith(marks: readonly (readonly AgeBand[] | undefined)[]) {
	return parsePhraseBank({
		schemaVersion: 1,
		id: 'fr.phrases.ages',
		locale: 'fr-FR',
		phrases: PHRASE_TEXTS.map((text, i) => ({
			text,
			themes: [],
			level: 1,
			review: 'agent',
			...(marks[i] === undefined ? {} : { ages: marks[i] })
		}))
	});
}

const TEXTS = parseTextBank({
	schemaVersion: 1,
	id: 'fr.texts.ages',
	locale: 'fr-FR',
	texts: [
		{
			id: 'fr.text.young',
			lessonId: 'fr.lesson.words',
			lines: ['je lis', 'il file'],
			level: 1,
			review: 'agent',
			ages: ['8-9']
		},
		{
			id: 'fr.text.old',
			lessonId: 'fr.lesson.words',
			lines: ['elle lisse', 'ses skis'],
			level: 1,
			review: 'agent',
			ages: ['10-12']
		},
		{
			id: 'fr.text.all',
			lessonId: 'fr.lesson.words',
			lines: ['des fils', 'du sel'],
			level: 1,
			review: 'agent'
		}
	]
});

function lesson(id: string, newChars: string[], mix: ExerciseMix, extra = {}) {
	return {
		id: `fr.lesson.${id}`,
		title: id,
		intro: 'Intro.',
		newChars,
		words: [],
		mix,
		unlocks: [],
		groupCount: 10,
		targetLength: 200,
		groupLength: [3, 5],
		...extra
	};
}

const PROGRESSION = parseProgression({
	schemaVersion: 1,
	id: 'fr.progression.ages',
	locale: 'fr-FR',
	layoutIds: ['fr-fr-azerty-pc'],
	rules: {
		unlockAccuracy: 80,
		starThresholds: [80, 90, 97],
		newCharWeight: 0.6,
		weakCharBoost: 2,
		themeBoost: 2,
		newCharMinCount: 0,
		recentCharWindow: 30
	},
	worlds: [
		{
			id: 'fr.world.ages',
			title: 'Ages',
			themeId: 'dinos',
			gameIds: ['hatching'],
			lessons: [
				lesson('fjdk', [...'fjdk'], { drills: 1, words: 0, phrases: 0 }),
				lesson('slei', [...'slei'], { drills: 1, words: 0, phrases: 0 }),
				lesson('words', [' ', 'u', '.', String.fromCharCode(10)], WORDS_ONLY, {
					unlocks: ['uppercase']
				}),
				lesson('phrases', [], PHRASES_ONLY)
			]
		}
	]
});

const RULES: AgeCoverageRules = { minWords: 4, minPhrases: 2, minStoryPhrases: 1, minTexts: 1 };

describe('age groups of the bank entries', () => {
	it('reads the age groups of a word, a phrase and a text, and leaves them out when absent', () => {
		const words = wordBankWith([['10-12'], ['8-9']]);
		expect(words.words[0]?.ages).toEqual(['10-12']);
		expect(words.words[1]?.ages).toEqual(['8-9']);
		expect(words.words[2]).not.toHaveProperty('ages');
		expect(phraseBankWith([['8-9']]).phrases[0]?.ages).toEqual(['8-9']);
		expect(TEXTS.texts.map((entry) => entry.ages)).toEqual([['8-9'], ['10-12'], undefined]);
	});

	it.each<[string, unknown]>([
		['an unknown group', ['6-7']],
		['an exact age', [10]],
		['a group given twice', ['8-9', '8-9']],
		['every group', ['8-9', '10-12']],
		['no group at all', []],
		['a group that is not in a list', '8-9']
	])('refuses %s', (_, ages) => {
		const raw = (entry: Record<string, unknown>) => ({ ...entry, ages });
		const word = { text: 'les', themes: [], level: 1, review: 'agent' };
		expect(() =>
			parseWordBank({
				schemaVersion: 1,
				id: 'fr.words.ages',
				locale: 'fr-FR',
				sources: [],
				themes: [],
				words: [raw(word)]
			})
		).toThrow(/words\.words\[0\]\.ages/);
		expect(() =>
			parsePhraseBank({
				schemaVersion: 1,
				id: 'fr.phrases.ages',
				locale: 'fr-FR',
				phrases: [raw({ ...word, text: 'Je lis.' })]
			})
		).toThrow(/phrases\.phrases\[0\]\.ages/);
	});

	it('offers an unmarked entry to every group, and a marked one to its groups only', () => {
		expect(fitsAgeBand({}, '8-9')).toBe(true);
		expect(fitsAgeBand({}, '10-12')).toBe(true);
		expect(fitsAgeBand({ ages: ['8-9'] }, '8-9')).toBe(true);
		expect(fitsAgeBand({ ages: ['8-9'] }, '10-12')).toBe(false);
		expect(fitsAgeBand({ ages: ['10-12'] }, '8-9')).toBe(false);
		expect(fitsAgeBand({ ages: ['10-12'] }, undefined)).toBe(true);
	});

	it('never gives a word or a phrase of another group, and always gives the unmarked ones', () => {
		const learned = [...'fjdksleiu JIE.'];
		fc.assert(
			fc.property(
				fc.array(markArb, { minLength: WORD_TEXTS.length, maxLength: WORD_TEXTS.length }),
				fc.array(markArb, { minLength: PHRASE_TEXTS.length, maxLength: PHRASE_TEXTS.length }),
				bandArb,
				(wordMarks, phraseMarks, band) => {
					const words = wordBankWith(wordMarks);
					const phrases = phraseBankWith(phraseMarks);
					const given = [
						...usableWords(words, learned, { ageBand: band }),
						...usablePhrases(phrases, learned, { ageBand: band })
					];
					for (const entry of given) expect(fitsAgeBand(entry, band)).toBe(true);
					const all = [...usableWords(words, learned), ...usablePhrases(phrases, learned)];
					for (const entry of all) {
						if (entry.ages === undefined) expect(given).toContain(entry);
						if (entry.ages?.includes(band)) expect(given).toContain(entry);
					}
				}
			)
		);
	});

	it('keeps the story phrases and the texts of the group asked for', () => {
		expect(lessonTexts(TEXTS, 'fr.lesson.words', '8-9').map((entry) => entry.id)).toEqual([
			'fr.text.young',
			'fr.text.all'
		]);
		expect(lessonTexts(TEXTS, 'fr.lesson.words', '10-12').map((entry) => entry.id)).toEqual([
			'fr.text.old',
			'fr.text.all'
		]);
		expect(lessonTexts(TEXTS, 'fr.lesson.words')).toHaveLength(3);
		const story = parsePhraseBank({
			schemaVersion: 1,
			id: 'fr.phrases.story',
			locale: 'fr-FR',
			phrases: [
				{ text: 'Il lit.', themes: [], level: 1, review: 'agent', lessonId: 'fr.lesson.x' },
				{
					text: 'Je lis.',
					themes: [],
					level: 1,
					review: 'agent',
					lessonId: 'fr.lesson.x',
					ages: ['10-12']
				}
			]
		});
		expect(storyPhrases(story, 'fr.lesson.x', '8-9').map((phrase) => phrase.text)).toEqual([
			'Il lit.'
		]);
		expect(storyPhrases(story, 'fr.lesson.x', '10-12')).toHaveLength(2);
	});
});

describe('exercises for an age group', () => {
	it('draws words as if the bank held only those of the age group', () => {
		fc.assert(
			fc.property(
				fc.array(markArb, { minLength: WORD_TEXTS.length, maxLength: WORD_TEXTS.length }),
				bandArb,
				SEEDS,
				(marks, band, seed) => {
					const words = wordBankWith(marks);
					const kept = { ...words, words: words.words.filter((w) => fitsAgeBand(w, band)) };
					const generate = (context: ExerciseContext) =>
						generateExercise(PROGRESSION, 'fr.lesson.words', seededRng(seed), context).groups;
					expect(generate({ words, ageBand: band })).toEqual(generate({ words: kept }));
				}
			)
		);
	});

	it('draws phrases as if the bank held only those of the age group', () => {
		fc.assert(
			fc.property(
				fc.array(markArb, { minLength: PHRASE_TEXTS.length, maxLength: PHRASE_TEXTS.length }),
				bandArb,
				SEEDS,
				(marks, band, seed) => {
					const phrases = phraseBankWith(marks);
					const kept = {
						...phrases,
						phrases: phrases.phrases.filter((p) => fitsAgeBand(p, band))
					};
					const generate = (context: ExerciseContext) =>
						generateExercise(PROGRESSION, 'fr.lesson.phrases', seededRng(seed), context).groups;
					const groups = generate({ phrases, ageBand: band });
					expect(groups).toEqual(generate({ phrases: kept }));
					const refused = phrases.phrases.filter((p) => !fitsAgeBand(p, band));
					for (const phrase of refused) expect(groups).not.toContain(phrase.text);
				}
			)
		);
	});

	it('ends the first play of a lesson with the first text of the age group', () => {
		const groupsOf = (band: AgeBand) =>
			generateExercise(PROGRESSION, 'fr.lesson.words', seededRng(1), {
				texts: TEXTS,
				ageBand: band
			}).groups.join('');
		expect(groupsOf('8-9').endsWith('je lis\nil file')).toBe(true);
		expect(groupsOf('10-12').endsWith('elle lisse\nses skis')).toBe(true);
	});
});

describe('age coverage of the lessons', () => {
	it('reads its rules and refuses what is not a count of at least 1', () => {
		const data = { schemaVersion: 1, minWords: 3, minPhrases: 2, minStoryPhrases: 1, minTexts: 1 };
		expect(parseAgeCoverageRules(data)).toEqual({
			minWords: 3,
			minPhrases: 2,
			minStoryPhrases: 1,
			minTexts: 1
		});
		expect(() => parseAgeCoverageRules({ ...data, minWords: 0 })).toThrow(/minWords/);
		expect(() => parseAgeCoverageRules({ ...data, minTexts: 1.5 })).toThrow(/minTexts/);
		expect(() => parseAgeCoverageRules({ ...data, extra: 1 })).toThrow(/extra/);
		expect(() => parseAgeCoverageRules({ ...data, schemaVersion: 2 })).toThrow(/schemaVersion/);
		expect(() => parseAgeCoverageRules([])).toThrow();
	});

	it('counts what a lesson can draw for each age group', () => {
		const words = wordBankWith([['8-9'], ['10-12']]);
		const all = lessonEntryCounts(PROGRESSION, 'fr.lesson.words', { words, texts: TEXTS });
		const young = lessonEntryCounts(PROGRESSION, 'fr.lesson.words', { words, texts: TEXTS }, '8-9');
		expect(all.words - young.words).toBe(1);
		expect(all.texts).toBe(3);
		expect(young.texts).toBe(2);
	});

	it('says nothing when every lesson keeps enough for every group', () => {
		const banks = { words: wordBankWith([]), phrases: phraseBankWith([]), texts: TEXTS };
		expect(ageCoverageIssues(PROGRESSION, banks, RULES)).toEqual([]);
	});

	it('names the lesson and the group that lack entries', () => {
		const marks = WORD_TEXTS.map((): readonly AgeBand[] => ['10-12']);
		const banks = { words: wordBankWith(marks) };
		expect(ageCoverageIssues(PROGRESSION, banks, RULES)).toEqual([
			'fr.lesson.words, 8-9: 0 words (at least 4)'
		]);
	});

	it('asks a lesson that has few entries for every group together only to keep them', () => {
		const banks = { words: wordBankWith([]) };
		const strict = { ...RULES, minWords: 1000 };
		expect(ageCoverageIssues(PROGRESSION, banks, strict)).toEqual([]);
	});
});
