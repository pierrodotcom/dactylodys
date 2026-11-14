import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from '../../src/lib/engine/graphemes';
import {
	usablePhrases,
	usableWords,
	lessonTexts,
	parsePhraseBank,
	parseTextBank,
	parseWordBank,
	storyPhrases,
	textGroups,
	textOf,
	validateStoryPhrases,
	validateTexts
} from '../../src/lib/engine/progression/banks';
import {
	findLesson,
	learnedChars,
	parseProgression
} from '../../src/lib/engine/progression/definition';
import { generateExercise } from '../../src/lib/engine/progression/exercise';
import { keyNeighbors } from '../../src/lib/engine/progression/repair';
import { parseGeometry } from '../../src/lib/keyboard/geometry';
import { parseLayout } from '../../src/lib/keyboard/layout';
import { emptyProgress } from '../../src/lib/engine/progression/progress';
import { seededRng } from '../../src/lib/engine/progression/test-support';
import type { ProgressState } from '../../src/lib/engine/progression/types';
import { findGame } from '../../src/lib/games/registry';
import {
	generateHelpExercise,
	parseHelpQuestRules,
	parseRewardCatalogue,
	validateRewardCatalogue
} from '../../src/lib/engine/rewards';
import { PLAY_RULES } from '../../src/routes/jouer/play-rules';

const PROGRESSION_FILE = 'content/fr/progression/azerty-decouverte.json';
const WORDS_FILE = 'content/fr/words/base.json';
const PHRASES_FILE = 'content/fr/phrases/base.json';
const TEXTS_FILE = 'content/fr/texts/base.json';
const LINE_BREAK = String.fromCharCode(10);
const TEXT_LINES = { min: 2, max: 5 };
const MIN_TEXTS_PER_LESSON = 2;
/** The addresses of the texts are invented, on a domain reserved for examples. */
const EXAMPLE_ADDRESS = /^[a-z0-9.-]+@(exemple\.org|exemple\.com|example\.org)$/;
const REWARDS_FILE = 'content/fr/rewards/azerty-decouverte.json';
const HELP_QUEST_FILE = 'content/common/help-quest.json';
const CONDITION_KINDS = [
	'lesson-passed',
	'lesson-stars',
	'world-passed',
	'world-stars',
	'chars-mastered'
];
const MIN_USABLE_WORDS = 8;
const MIN_USABLE_PHRASES = 6;
const MIN_PHRASES_PER_NEW_CHAR = 6;
const MAX_STORY_PHRASE_LENGTH = 45;
const SEED_COUNT = 20;
const STORY_SEED_COUNT = 5;
const HELP_SEED_COUNT = 8;

function readJson(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf8'));
}

const progression = parseProgression(readJson(PROGRESSION_FILE));
const words = parseWordBank(readJson(WORDS_FILE));
const phrases = parsePhraseBank(readJson(PHRASES_FILE));
const texts = parseTextBank(readJson(TEXTS_FILE));
const options = { maxLevel: PLAY_RULES.maxWordLevel };
const entries = progression.worlds.flatMap((world) =>
	world.lessons.map((lesson) => ({ world, lesson }))
);

/** The progress of a child who has played the lesson this many times. */
function playedTimes(lessonId: string, attempts: number): ProgressState {
	const lesson = { bestAccuracy: 90, stars: 2, attempts, lastPlayedAt: 0 } as const;
	return { ...emptyProgress(), lessons: attempts === 0 ? {} : { [lessonId]: lesson } };
}

/** One play made: not a multiple of `storyPhraseEvery`, so the exercise has no story phrase. */
function playedOnce(lessonId: string): ProgressState {
	return playedTimes(lessonId, 1);
}

function usableWordTexts(lessonId: string): Set<string> {
	const lesson = entries.find((entry) => entry.lesson.id === lessonId)?.lesson;
	const learned = learnedChars(progression, lessonId);
	return new Set([
		...(lesson?.words ?? []),
		...usableWords(words, learned, options).map((entry) => entry.text)
	]);
}

describe('progression and banks together', () => {
	it.each(entries.filter(({ lesson }) => lesson.mix.words > 0).map(({ lesson }) => lesson.id))(
		`%s has at least ${MIN_USABLE_WORDS} usable words`,
		(lessonId) => {
			expect(usableWordTexts(lessonId).size).toBeGreaterThanOrEqual(MIN_USABLE_WORDS);
		}
	);

	it.each(entries.filter(({ lesson }) => lesson.mix.phrases > 0).map(({ lesson }) => lesson.id))(
		`%s has at least ${MIN_USABLE_PHRASES} usable phrases`,
		(lessonId) => {
			const count = usablePhrases(phrases, learnedChars(progression, lessonId), options).length;
			expect(count).toBeGreaterThanOrEqual(MIN_USABLE_PHRASES);
		}
	);

	const phraseOnlyChars = entries
		.filter(({ lesson }) => lesson.mix.phrases > 0)
		.flatMap(({ lesson }) => {
			const inWords = new Set([...usableWordTexts(lesson.id)].flatMap((text) => toGraphemes(text)));
			// Enter, the digits and @ are in no phrase: the warm-up and the texts of their lessons ask
			// for them (tested below).
			if (lessonTexts(texts, lesson.id).length > 0) return [];
			return lesson.newChars
				.filter((char) => !inWords.has(char) && char !== LINE_BREAK)
				.map((char) => [lesson.id, char] as const);
		});

	it.each(phraseOnlyChars)(
		`%s has at least ${MIN_PHRASES_PER_NEW_CHAR} usable phrases with "%s", which no word contains`,
		(lessonId, char) => {
			const count = usablePhrases(phrases, learnedChars(progression, lessonId), options).filter(
				(phrase) => phrase.text.includes(char)
			).length;
			expect(count).toBeGreaterThanOrEqual(MIN_PHRASES_PER_NEW_CHAR);
		}
	);

	it.each(
		entries
			.filter(({ lesson }) => lesson.mix.words > 0)
			.map(({ world, lesson }) => [lesson.id, world.themeId] as const)
	)(
		`%s gives at least one word in every exercise without story phrase over ${SEED_COUNT} seeds`,
		(lessonId, themeId) => {
			const usable = usableWordTexts(lessonId);
			for (let seed = 1; seed <= SEED_COUNT; seed++) {
				const exercise = generateExercise(progression, lessonId, seededRng(seed), {
					words,
					phrases,
					progress: playedOnce(lessonId),
					themeId,
					maxLevel: PLAY_RULES.maxWordLevel
				});
				// A word alone, one of the words put side by side to warm a new key up, or a word
				// drawn with a capital in the lesson of capitals.
				const isWord = (part: string) =>
					usable.has(part) || usable.has(`${part.charAt(0).toLowerCase()}${part.slice(1)}`);
				expect(
					exercise.groups.some((group) => group.split(' ').some(isWord)),
					`${lessonId} seed ${seed}: ${exercise.groups.join(' | ')}`
				).toBe(true);
			}
		}
	);

	it('offers only games that exist in the registry', () => {
		for (const world of progression.worlds) {
			for (const gameId of world.gameIds) {
				expect(findGame(gameId), `${world.id}: ${gameId}`).toBeDefined();
			}
		}
	});

	it('gives every world a theme declared by the word bank', () => {
		const declared = new Set(words.themes.map((theme) => theme.id));
		for (const world of progression.worlds) {
			expect(declared.has(world.themeId), `${world.id}: ${world.themeId}`).toBe(true);
		}
	});

	it.each(entries.map(({ world, lesson }) => [lesson.id, world.themeId] as const))(
		`%s only asks for known characters over ${SEED_COUNT} seeds, with or without story phrase`,
		(lessonId, themeId) => {
			const known = new Set(learnedChars(progression, lessonId));
			for (const progress of [emptyProgress(), playedOnce(lessonId)]) {
				for (let seed = 1; seed <= SEED_COUNT; seed++) {
					const exercise = generateExercise(progression, lessonId, seededRng(seed), {
						words,
						phrases,
						progress,
						themeId,
						maxLevel: PLAY_RULES.maxWordLevel
					});
					expect(exercise.groups.length).toBeGreaterThan(0);
					for (const group of exercise.groups) {
						const unknown = toGraphemes(group).filter((char) => !known.has(char));
						expect(unknown, `${lessonId} seed ${seed}: "${group}"`).toEqual([]);
					}
				}
			}
		}
	);

	it('writes every story phrase for an existing lesson, with the keys learned there', () => {
		expect(validateStoryPhrases(phrases, progression)).toEqual([]);
	});

	it.each(phrases.phrases.filter((phrase) => phrase.lessonId !== undefined).map((p) => p.text))(
		`keeps the story phrase "%s" within ${MAX_STORY_PHRASE_LENGTH} characters`,
		(text) => {
			expect(toGraphemes(text).length).toBeLessThanOrEqual(MAX_STORY_PHRASE_LENGTH);
		}
	);

	const storyLessons = entries
		.map(
			({ world, lesson }) => [lesson.id, world.themeId, storyPhrases(phrases, lesson.id)] as const
		)
		.filter(([, , story]) => story.length > 0);

	it.each(storyLessons)(
		'%s ends its exercises of even plays with its story phrases, in turn',
		(lessonId, themeId, story) => {
			const every = progression.rules.storyPhraseEvery ?? 0;
			expect(every).toBeGreaterThan(0);
			for (let turn = 0; turn < story.length * 2; turn++) {
				const plays = turn * every;
				for (let seed = 1; seed <= STORY_SEED_COUNT; seed++) {
					const exercise = generateExercise(progression, lessonId, seededRng(seed), {
						words,
						phrases,
						progress: playedTimes(lessonId, plays),
						themeId,
						maxLevel: PLAY_RULES.maxWordLevel
					});
					expect(exercise.groups.at(-1), `${lessonId} plays ${plays} seed ${seed}`).toBe(
						story[turn % story.length]?.text
					);
					expect(exercise.groups.length, `${lessonId} plays ${plays} seed ${seed}`).toBeGreaterThan(
						1
					);
				}
			}
		}
	);

	it.each(
		entries
			.filter(({ lesson }) => lesson.newChars.length > 0)
			.map(({ world, lesson }) => [lesson.id, world.themeId, lesson.newChars] as const)
	)(
		`%s asks each new character at least the minimum number of times over ${SEED_COUNT} seeds`,
		(lessonId, themeId, newChars) => {
			// A warm-up written by hand shows a mark in its place: it has its own, lower, minimum.
			const written = findLesson(progression, lessonId)?.warmUp !== undefined;
			const minimum =
				(written ? progression.rules.writtenWarmUpMinCount : undefined) ??
				progression.rules.newCharMinCount;
			for (let seed = 1; seed <= SEED_COUNT; seed++) {
				const exercise = generateExercise(progression, lessonId, seededRng(seed), {
					words,
					phrases,
					progress: emptyProgress(),
					themeId,
					maxLevel: PLAY_RULES.maxWordLevel
				});
				const asked = exercise.groups.flatMap((group) => toGraphemes(group));
				for (const char of newChars) {
					const count = asked.filter((grapheme) => grapheme === char).length;
					expect(count, `${lessonId} seed ${seed}: "${char}"`).toBeGreaterThanOrEqual(minimum);
				}
			}
		}
	);
});

describe('reward catalogue and progression together', () => {
	const catalogue = parseRewardCatalogue(readJson(REWARDS_FILE));
	const ofKind = (kind: string, key: 'lessonId' | 'worldId', id: string) =>
		catalogue.rewards.filter(
			({ condition }) =>
				condition.kind === kind && (condition as Record<string, unknown>)[key] === id
		);

	it('is coherent with the progression it names', () => {
		expect(validateRewardCatalogue(catalogue, progression)).toEqual([]);
		expect(catalogue.progressionId).toBe(progression.id);
	});

	it.each(entries.map(({ lesson }) => lesson.id))(
		'gives %s exactly one item for passing it',
		(id) => {
			const rewards = ofKind('lesson-passed', 'lessonId', id);
			expect(rewards).toHaveLength(1);
			expect(rewards[0]?.kind).toBe('item');
		}
	);

	it.each(progression.worlds.map((world) => world.id))(
		'gives %s one skill for passing it and one trophy for its stars',
		(id) => {
			const passed = ofKind('world-passed', 'worldId', id);
			const starred = ofKind('world-stars', 'worldId', id);
			expect(passed.map(({ kind }) => kind)).toEqual(['skill']);
			expect(starred.map(({ kind }) => kind)).toEqual(['trophy']);
		}
	);

	it('draws every reward with its own picture', () => {
		const artIds = catalogue.rewards.map((reward) => reward.artId);
		expect(new Set(artIds).size).toBe(artIds.length);
	});

	it('asks nothing about time, days, plays or speed', () => {
		for (const reward of catalogue.rewards) {
			expect(CONDITION_KINDS, reward.id).toContain(reward.condition.kind);
		}
	});

	it('parses the rules of the help quest', () => {
		const rules = parseHelpQuestRules(readJson(HELP_QUEST_FILE));
		expect(rules.minRecentAttempts).toBeLessThanOrEqual(progression.rules.recentCharWindow);
		expect(rules.minCharCount).toBeLessThanOrEqual(rules.targetLength);
	});
});

describe('help quest exercises over the shipped content', () => {
	const rules = parseHelpQuestRules(readJson(HELP_QUEST_FILE));
	// No quest is ever asked for Enter (`helpQuestFor`): its world's texts practise it.
	const keys = entries.flatMap(({ world, lesson }) =>
		lesson.newChars
			.filter((char) => char !== LINE_BREAK)
			.map((char) => [lesson.id, char, world.themeId] as const)
	);

	it.each(keys)(
		'builds a typable exercise for the key of %s "%s" over the seeds',
		(lessonId, char, themeId) => {
			const allowed = new Set(learnedChars(progression, lessonId));
			for (let seed = 1; seed <= HELP_SEED_COUNT; seed++) {
				const exercise = generateHelpExercise(
					progression,
					{ char, lessonId },
					rules,
					seededRng(seed),
					{ words, themeId, maxLevel: PLAY_RULES.maxWordLevel }
				);
				const asked = exercise.groups.flatMap((group) => toGraphemes(group));
				const label = `${lessonId} "${char}" seed ${seed}: ${exercise.groups.join(' | ')}`;
				expect(exercise.lessonId, label).toBe(lessonId);
				expect(asked.length, label).toBeGreaterThanOrEqual(rules.targetLength);
				expect(asked.filter((grapheme) => grapheme === char).length, label).toBeGreaterThanOrEqual(
					rules.minCharCount
				);
				expect(
					asked.filter((grapheme) => !allowed.has(grapheme)),
					label
				).toEqual([]);
			}
		}
	);
});

describe('useful texts and progression together', () => {
	const ids = entries.map(({ lesson }) => lesson.id);
	const enterLesson = ids.findIndex((id) =>
		entries.some(({ lesson }) => lesson.id === id && lesson.newChars.includes(LINE_BREAK))
	);
	const textLessons = entries.filter(({ lesson }) => lessonTexts(texts, lesson.id).length > 0);
	const maxLine = progression.rules.textGroupLength ?? 0;

	it('writes every text for an existing lesson, with the keys learned there, Enter included', () => {
		expect(texts.id).toBe('fr.texts.base');
		expect(validateTexts(texts, progression)).toEqual([]);
	});

	it('gives texts to every lesson of the last world, and to no lesson before Enter', () => {
		const lastWorld = progression.worlds.at(-1);
		expect(enterLesson).toBeGreaterThan(0);
		expect(textLessons.map(({ lesson }) => lesson.id)).toEqual(
			lastWorld?.lessons.map((lesson) => lesson.id)
		);
		for (const { lesson } of textLessons) {
			expect(ids.indexOf(lesson.id)).toBeGreaterThanOrEqual(enterLesson);
			expect(lessonTexts(texts, lesson.id).length).toBeGreaterThanOrEqual(MIN_TEXTS_PER_LESSON);
		}
	});

	it.each(texts.texts.map((entry) => [entry.id, entry] as const))(
		'keeps %s short: 2 to 5 lines, none longer than a group of text',
		(_id, entry) => {
			expect(entry.lines.length).toBeGreaterThanOrEqual(TEXT_LINES.min);
			expect(entry.lines.length).toBeLessThanOrEqual(TEXT_LINES.max);
			for (const line of entry.lines) {
				expect(toGraphemes(line).length, line).toBeLessThanOrEqual(maxLine);
			}
			expect(entry.level).toBeLessThanOrEqual(PLAY_RULES.maxWordLevel);
		}
	);

	it.each(textLessons.map(({ lesson }) => [lesson.id, lesson] as const))(
		'fits the warm-up and every text of %s within its groups',
		(lessonId, lesson) => {
			const warmUp =
				lesson.newChars.length === 0
					? 0
					: (lesson.warmUp?.length ?? progression.rules.newCharMinCount);
			for (const entry of lessonTexts(texts, lessonId)) {
				const groups = textGroups(entry, progression.rules.textGroupLength);
				expect(warmUp + groups.length, entry.id).toBeLessThanOrEqual(lesson.groupCount);
			}
		}
	);

	it.each(textLessons.map(({ world, lesson }) => [lesson.id, world.themeId] as const))(
		`ends every exercise of %s with its texts in turn, over ${SEED_COUNT} seeds`,
		(lessonId, themeId) => {
			const own = lessonTexts(texts, lessonId);
			const known = new Set(learnedChars(progression, lessonId));
			for (let plays = 0; plays < own.length * 2; plays++) {
				const expected = own[plays % own.length];
				for (let seed = 1; seed <= SEED_COUNT; seed++) {
					const exercise = generateExercise(progression, lessonId, seededRng(seed), {
						words,
						phrases,
						texts,
						progress: playedTimes(lessonId, plays),
						themeId,
						maxLevel: PLAY_RULES.maxWordLevel
					});
					const typed = exercise.groups.join('');
					expect(typed.endsWith(textOf(expected ?? own[0]!)), `${lessonId} ${plays}`).toBe(true);
					expect(toGraphemes(typed).filter((char) => !known.has(char))).toEqual([]);
					for (const group of exercise.groups) {
						expect(group.slice(0, -1)).not.toContain(LINE_BREAK + LINE_BREAK);
						expect(group.startsWith(LINE_BREAK)).toBe(false);
					}
				}
			}
		}
	);

	it('writes every e-mail address on a domain reserved for examples, never a real one', () => {
		const addresses = texts.texts.flatMap((entry) =>
			entry.lines.flatMap((line) => line.split(' ').filter((token) => token.includes('@')))
		);
		expect(addresses.length).toBeGreaterThan(0);
		for (const address of addresses) expect(address).toMatch(EXAMPLE_ADDRESS);
	});

	it.each(
		textLessons
			.filter(({ lesson }) => lesson.newChars.some((char) => char !== LINE_BREAK))
			.map(({ lesson }) => [lesson.id, lesson] as const)
	)('uses a new key of %s in every one of its texts', (_id, lesson) => {
		for (const entry of lessonTexts(texts, lesson.id)) {
			const typed = toGraphemes(textOf(entry));
			expect(
				lesson.newChars.some((char) => typed.includes(char)),
				entry.id
			).toBe(true);
		}
	});
});

describe('the lesson of repairs over the shipped content', () => {
	const layout = parseLayout(readJson('layouts/fr-fr-azerty-pc.json'));
	const geometry = parseGeometry(readJson('layouts/geometry/iso-105.json'));
	const neighbors = keyNeighbors(layout, geometry);
	const repairLessons = entries.filter(({ lesson }) => lesson.repair !== undefined);

	it('ends the last world with the only lesson of repairs, after the last key', () => {
		expect(repairLessons.map(({ lesson }) => lesson.id)).toEqual(['fr.lesson.reparer-message']);
		expect(entries.at(-1)?.lesson.id).toBe('fr.lesson.reparer-message');
	});

	it.each(repairLessons.map(({ world, lesson }) => [lesson.id, world, lesson] as const))(
		`plants in %s mistakes of learned keys, ending with a text with some lines to repair, over ${SEED_COUNT} seeds`,
		(lessonId, world, lesson) => {
			const learned = learnedChars(progression, lessonId);
			for (let seed = 0; seed < SEED_COUNT; seed++) {
				const exercise = generateExercise(progression, lessonId, seededRng(seed), {
					words,
					phrases,
					texts,
					...options,
					themeId: world.themeId,
					progress: playedOnce(lessonId),
					neighbors
				});
				const starts = exercise.starts ?? [];
				expect(starts).toHaveLength(exercise.groups.length);
				const begun = starts.filter((start) => start !== null);
				expect(begun.length).toBeGreaterThan(0);
				expect(begun.length).toBeLessThan(exercise.groups.length);
				exercise.groups.forEach((group, index) => {
					const start = starts[index] ?? null;
					if (start === null) return;
					expect(start.pending.length).toBeLessThanOrEqual(lesson.repair?.maxPending ?? 0);
					for (const char of start.pending) expect(learned).toContain(char);
					expect(start.pending[0]).not.toBe(toGraphemes(group)[start.typed]);
				});
			}
		}
	);
});
