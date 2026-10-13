import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from '../../src/lib/engine/graphemes';
import {
	usablePhrases,
	usableWords,
	parsePhraseBank,
	parseWordBank
} from '../../src/lib/engine/progression/banks';
import { learnedChars, parseProgression } from '../../src/lib/engine/progression/definition';
import { generateExercise } from '../../src/lib/engine/progression/exercise';
import { emptyProgress } from '../../src/lib/engine/progression/progress';
import { seededRng } from '../../src/lib/engine/progression/test-support';
import { findGame } from '../../src/lib/games/registry';
import { PLAY_RULES } from '../../src/routes/jouer/play-rules';

const PROGRESSION_FILE = 'content/fr/progression/azerty-decouverte.json';
const WORDS_FILE = 'content/fr/words/base.json';
const PHRASES_FILE = 'content/fr/phrases/base.json';
const MIN_USABLE_WORDS = 8;
const MIN_USABLE_PHRASES = 6;
const MIN_PHRASES_PER_NEW_CHAR = 6;
const SEED_COUNT = 20;

function readJson(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf8'));
}

const progression = parseProgression(readJson(PROGRESSION_FILE));
const words = parseWordBank(readJson(WORDS_FILE));
const phrases = parsePhraseBank(readJson(PHRASES_FILE));
const options = { maxLevel: PLAY_RULES.maxWordLevel };
const entries = progression.worlds.flatMap((world) =>
	world.lessons.map((lesson) => ({ world, lesson }))
);

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
			return lesson.newChars
				.filter((char) => !inWords.has(char))
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
		`%s only asks for known characters over ${SEED_COUNT} seeds`,
		(lessonId, themeId) => {
			const known = new Set(learnedChars(progression, lessonId));
			for (let seed = 1; seed <= SEED_COUNT; seed++) {
				const exercise = generateExercise(progression, lessonId, seededRng(seed), {
					words,
					phrases,
					progress: emptyProgress(),
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
	);

	it.each(
		entries
			.filter(({ lesson }) => lesson.newChars.length > 0)
			.map(({ world, lesson }) => [lesson.id, world.themeId, lesson.newChars] as const)
	)(
		`%s asks each new character at least the minimum number of times over ${SEED_COUNT} seeds`,
		(lessonId, themeId, newChars) => {
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
					expect(count, `${lessonId} seed ${seed}: "${char}"`).toBeGreaterThanOrEqual(
						progression.rules.newCharMinCount
					);
				}
			}
		}
	);
});
