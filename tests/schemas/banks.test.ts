import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parsePhraseBank, parseWordBank } from '$lib/engine/progression/banks';
import { parseProgression } from '$lib/engine/progression/definition';

const WORDS_FILE = 'content/fr/words/base.json';
const PHRASES_FILE = 'content/fr/phrases/base.json';
const PROGRESSION_FILE = 'content/fr/progression/azerty-decouverte.json';

const WORLD_THEMES = ['dinos', 'cuisine', 'animaux', 'espace', 'vehicules'];
const MIN_WORDS = 600;
const MIN_WORDS_PER_WORLD_THEME = 40;
const MIN_EARLY_WORDS = 25;
const MIN_PHRASES_PER_EARLY_TIER = 10;
const MIN_ACCENT_PHRASES = 15;
const MIN_FULL_ALPHABET_PHRASES = 15;
const MIN_CAPITAL_PHRASES = 30;
const MIN_CIRCUMFLEX_PHRASES = 10;
const PHRASE_WORDS = { min: 3, max: 8 };

/** Learning order of the French progression (ADR-018); each step adds these characters. */
const STEPS: readonly (readonly string[])[] = [
	['f', 'j'],
	[' '],
	['d', 'k'],
	['s', 'l'],
	['e', 'i'],
	['r', 'u'],
	['t', 'n'],
	['a', 'o'],
	['q', 'm'],
	['c', 'p'],
	['é', "'"],
	['g', 'h'],
	['v', 'b'],
	['y', 'x'],
	['z', 'w'],
	['è', 'à'],
	['ç', 'ù'],
	[],
	[',', '.', ';'],
	['?', '!', '"'],
	['-', ':'],
	['ê', 'â'],
	['î', 'ô', 'û'],
	['ë', 'ï']
];
const STEP = {
	restRowVowels: 5,
	earlyLetters: 7,
	capitalsAndPunctuation: 17,
	lastPunctuation: 20,
	lastAccent: 23
} as const;
const STEP_OF = new Map<string, number>();
STEPS.forEach((chars, step) => chars.forEach((char) => STEP_OF.set(char, step)));

/** Step that makes the text typable, or -1 when a character is never taught. */
function tierOf(text: string): number {
	let tier = 0;
	for (const char of text) {
		if (char >= 'A' && char <= 'Z') {
			const lowerStep = STEP_OF.get(char.toLowerCase());
			if (lowerStep === undefined) return -1;
			tier = Math.max(tier, STEP.capitalsAndPunctuation, lowerStep);
			continue;
		}
		const step = STEP_OF.get(char);
		if (step === undefined) return -1;
		tier = Math.max(tier, step);
	}
	return tier;
}

function readJson(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf8'));
}

const wordBank = parseWordBank(readJson(WORDS_FILE));
const phraseBank = parsePhraseBank(readJson(PHRASES_FILE));

describe('learning order of the bank checks', () => {
	it('is the order in which the progression introduces the characters', () => {
		const progression = parseProgression(readJson(PROGRESSION_FILE));
		expect(STEPS).toEqual(
			progression.worlds.flatMap((world) => world.lessons.map((lesson) => lesson.newChars))
		);
	});
});

describe(WORDS_FILE, () => {
	it('has the expected identity and its sources', () => {
		expect(wordBank.id).toBe('fr.words.base');
		const names = wordBank.sources.map((source) => source.name).join(' ');
		expect(names).toContain('Lexique');
		expect(names).toContain('Wiktionnaire');
		for (const source of wordBank.sources) expect(source.license).toBe('CC BY-SA 4.0');
	});

	it('has no duplicate and only declared themes', () => {
		const texts = wordBank.words.map((word) => word.text);
		expect(new Set(texts).size).toBe(texts.length);
		const declared = new Set(wordBank.themes.map((theme) => theme.id));
		for (const word of wordBank.words) {
			expect(word.themes.length).toBeGreaterThan(0);
			for (const id of word.themes) expect(declared.has(id)).toBe(true);
		}
	});

	it('writes every word with characters of the learning order, in lowercase NFC', () => {
		const offenders = wordBank.words.filter(
			(word) =>
				word.text !== word.text.normalize('NFC') || tierOf(word.text) < 0 || /[A-Z]/.test(word.text)
		);
		expect(offenders.map((word) => word.text)).toEqual([]);
	});

	it('is reviewed by an agent at least', () => {
		for (const word of wordBank.words) expect(['agent', 'human']).toContain(word.review);
	});

	it(`holds at least ${MIN_WORDS} words`, () => {
		expect(wordBank.words.length).toBeGreaterThanOrEqual(MIN_WORDS);
	});

	it.each(WORLD_THEMES)(
		`holds at least ${MIN_WORDS_PER_WORLD_THEME} words for the theme %s`,
		(id) => {
			const count = wordBank.words.filter((word) => word.themes.includes(id)).length;
			expect(count).toBeGreaterThanOrEqual(MIN_WORDS_PER_WORLD_THEME);
		}
	);

	it(`has ${MIN_EARLY_WORDS} words typable once f j d k s l e i r u t n a o are known`, () => {
		const count = wordBank.words.filter((word) => tierOf(word.text) <= STEP.earlyLetters).length;
		expect(count).toBeGreaterThanOrEqual(MIN_EARLY_WORDS);
	});
});

describe(PHRASES_FILE, () => {
	const phrases = phraseBank.phrases;
	const withTier = phrases.map((phrase) => ({ phrase, tier: tierOf(phrase.text) }));
	const count = (predicate: (tier: number, text: string) => boolean) =>
		withTier.filter(({ phrase, tier }) => predicate(tier, phrase.text)).length;

	it('has the expected identity and no duplicate', () => {
		expect(phraseBank.id).toBe('fr.phrases.base');
		const texts = phrases.map((phrase) => phrase.text);
		expect(new Set(texts).size).toBe(texts.length);
	});

	it('uses only characters of the learning order, NFC, with short sentences', () => {
		for (const { phrase, tier } of withTier) {
			expect(phrase.text, phrase.text).toBe(phrase.text.normalize('NFC').trim());
			expect(tier, phrase.text).toBeGreaterThanOrEqual(0);
			const words = phrase.text.split(' ').filter((token) => /\p{L}/u.test(token)).length;
			expect(words, phrase.text).toBeGreaterThanOrEqual(PHRASE_WORDS.min);
			expect(words, phrase.text).toBeLessThanOrEqual(PHRASE_WORDS.max);
		}
	});

	it('starts with a capital and ends with . ? or ! as soon as it uses either', () => {
		for (const { phrase, tier } of withTier) {
			if (tier < STEP.capitalsAndPunctuation) continue;
			expect(phrase.text, phrase.text).toMatch(/^[A-Z]/);
			expect(phrase.text, phrase.text).toMatch(/[.?!]$/);
		}
	});

	it('is reviewed by an agent at least', () => {
		for (const phrase of phrases) expect(['agent', 'human']).toContain(phrase.review);
	});

	it.each([
		['r u', (tier: number) => tier <= STEP.restRowVowels],
		['t n', (tier: number) => tier === 6],
		['a o', (tier: number) => tier === 7],
		['c p', (tier: number) => tier === 8 || tier === 9]
	] as const)(
		`has ${MIN_PHRASES_PER_EARLY_TIER} plain lowercase phrases for the step %s`,
		(_name, inStep) => {
			expect(count((tier) => inStep(tier))).toBeGreaterThanOrEqual(MIN_PHRASES_PER_EARLY_TIER);
		}
	);

	it('has phrases that need é and the apostrophe', () => {
		expect(count((tier) => tier === 10)).toBeGreaterThanOrEqual(MIN_ACCENT_PHRASES);
	});

	it('has phrases that need the complete lowercase alphabet', () => {
		expect(count((tier) => tier >= 11 && tier <= 16)).toBeGreaterThanOrEqual(
			MIN_FULL_ALPHABET_PHRASES
		);
	});

	it('has phrases with a capital and final punctuation', () => {
		const total = count(
			(tier, text) =>
				tier >= STEP.capitalsAndPunctuation &&
				tier <= STEP.lastPunctuation &&
				/^[A-Z].*[.?!]$/.test(text)
		);
		expect(total).toBeGreaterThanOrEqual(MIN_CAPITAL_PHRASES);
	});

	it('has phrases with circumflexes and diaereses', () => {
		expect(
			count((tier) => tier > STEP.lastPunctuation && tier <= STEP.lastAccent)
		).toBeGreaterThanOrEqual(MIN_CIRCUMFLEX_PHRASES);
	});
});
