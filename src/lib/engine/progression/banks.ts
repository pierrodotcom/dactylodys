import { toGraphemes } from '../graphemes';
import type {
	BankSource,
	PhraseBank,
	PhraseEntry,
	ReviewStatus,
	ThemeDefinition,
	WordBank,
	WordEntry,
	WordLevel
} from './types';

const SLUG = '[a-z0-9]+(?:-[a-z0-9]+)*';
const SLUG_PATTERN = new RegExp(`^${SLUG}$`);
const CONTROL_PATTERN = /\p{Cc}/u;
const WHITESPACE_PATTERN = /\s/u;
const LEVELS: readonly WordLevel[] = [1, 2, 3];
const REVIEWS: readonly ReviewStatus[] = ['agent', 'human'];
const DEFAULT_MAX_LEVEL: WordLevel = 3;

export interface UsableOptions {
	/** Highest level allowed; defaults to 3. */
	readonly maxLevel?: WordLevel;
}

function fail(path: string, message: string): never {
	throw new Error(`${path}: ${message}`);
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		fail(path, 'expected an object');
	}
	return value as Record<string, unknown>;
}

function expectArray(value: unknown, path: string): unknown[] {
	if (!Array.isArray(value)) fail(path, 'expected an array');
	return value as unknown[];
}

function expectString(value: unknown, path: string): string {
	if (typeof value !== 'string' || value.trim() === '') fail(path, 'expected a non-empty string');
	return value;
}

function rejectUnknown(record: Record<string, unknown>, allowed: readonly string[], path: string) {
	for (const name of Object.keys(record)) {
		if (!allowed.includes(name)) fail(`${path}.${name}`, 'unknown property');
	}
}

function expectSlug(value: unknown, path: string): string {
	const slug = expectString(value, path);
	if (!SLUG_PATTERN.test(slug)) fail(path, 'expected lowercase words separated by hyphens');
	return slug;
}

function parseHeader(
	root: Record<string, unknown>,
	type: 'words' | 'phrases',
	path: string
): { id: string; locale: string } {
	if (root['schemaVersion'] !== 1) fail(`${path}.schemaVersion`, 'expected 1');
	const locale = expectString(root['locale'], `${path}.locale`);
	let language: string;
	try {
		Intl.getCanonicalLocales(locale);
		language = new Intl.Locale(locale).language;
	} catch {
		fail(`${path}.locale`, 'expected a BCP 47 language tag');
	}
	const id = expectString(root['id'], `${path}.id`);
	const match = new RegExp(`^([a-z]{2,3})\\.${type}\\.${SLUG}$`).exec(id);
	if (match === null) fail(`${path}.id`, `expected <language>.${type}.<slug>`);
	if (match[1] !== language) fail(`${path}.id`, `expected the language prefix "${language}"`);
	return { id, locale };
}

function parseSources(value: unknown, path: string): BankSource[] {
	return expectArray(value, path).map((raw, i) => {
		const here = `${path}[${i}]`;
		const record = expectRecord(raw, here);
		rejectUnknown(record, ['name', 'url', 'license'], here);
		return {
			name: expectString(record['name'], `${here}.name`),
			url: expectString(record['url'], `${here}.url`),
			license: expectString(record['license'], `${here}.license`)
		};
	});
}

function parseThemeDefinitions(value: unknown, path: string): ThemeDefinition[] {
	const seen = new Set<string>();
	return expectArray(value, path).map((raw, i) => {
		const here = `${path}[${i}]`;
		const record = expectRecord(raw, here);
		rejectUnknown(record, ['id', 'title'], here);
		const id = expectSlug(record['id'], `${here}.id`);
		if (seen.has(id)) fail(`${here}.id`, `duplicate theme "${id}"`);
		seen.add(id);
		return { id, title: expectString(record['title'], `${here}.title`) };
	});
}

function parseEntryThemes(
	value: unknown,
	declared: ReadonlySet<string> | null,
	path: string
): string[] {
	const themes: string[] = [];
	expectArray(value, path).forEach((raw, i) => {
		const theme = expectSlug(raw, `${path}[${i}]`);
		if (declared !== null && !declared.has(theme)) {
			fail(`${path}[${i}]`, `theme "${theme}" is not declared by the bank`);
		}
		if (themes.includes(theme)) fail(`${path}[${i}]`, `duplicate theme "${theme}"`);
		themes.push(theme);
	});
	return themes;
}

function parseLevel(value: unknown, path: string): WordLevel {
	const level = LEVELS.find((candidate) => candidate === value);
	if (level === undefined) fail(path, `expected one of: ${LEVELS.join(', ')}`);
	return level;
}

function parseReview(value: unknown, path: string): ReviewStatus {
	const review = REVIEWS.find((candidate) => candidate === value);
	if (review === undefined) fail(path, `expected one of: ${REVIEWS.join(', ')}`);
	return review;
}

function parseWordText(value: unknown, path: string): string {
	const text = expectString(value, path);
	if (text !== text.normalize('NFC')) fail(path, 'expected a word in NFC');
	if (text !== text.toLowerCase()) fail(path, 'expected a lowercase word');
	if (WHITESPACE_PATTERN.test(text)) fail(path, 'a word must not contain a space');
	if (CONTROL_PATTERN.test(text)) fail(path, 'a word must only contain printable characters');
	return text;
}

function parsePhraseText(value: unknown, path: string): string {
	const text = expectString(value, path);
	if (text !== text.normalize('NFC')) fail(path, 'expected a phrase in NFC');
	if (CONTROL_PATTERN.test(text)) fail(path, 'a phrase must only contain printable characters');
	if (text !== text.trim()) fail(path, 'a phrase must not start or end with a space');
	if (/\s{2}/u.test(text)) fail(path, 'a phrase must not contain two spaces in a row');
	if (/[^\S ]/u.test(text)) fail(path, 'a phrase must only contain plain spaces');
	return text;
}

export function parseWordBank(data: unknown): WordBank {
	const root = expectRecord(data, 'words');
	rejectUnknown(root, ['schemaVersion', 'id', 'locale', 'sources', 'themes', 'words'], 'words');
	const { id, locale } = parseHeader(root, 'words', 'words');
	const sources = parseSources(root['sources'], 'words.sources');
	const themes = parseThemeDefinitions(root['themes'], 'words.themes');
	const declared = new Set(themes.map((theme) => theme.id));

	const seen = new Set<string>();
	const words = expectArray(root['words'], 'words.words').map((raw, i): WordEntry => {
		const path = `words.words[${i}]`;
		const record = expectRecord(raw, path);
		rejectUnknown(record, ['text', 'themes', 'level', 'review'], path);
		const text = parseWordText(record['text'], `${path}.text`);
		if (seen.has(text)) fail(`${path}.text`, `duplicate word "${text}"`);
		seen.add(text);
		return {
			text,
			themes: parseEntryThemes(record['themes'], declared, `${path}.themes`),
			level: parseLevel(record['level'], `${path}.level`),
			review: parseReview(record['review'], `${path}.review`)
		};
	});
	return { schemaVersion: 1, id, locale, sources, themes, words };
}

export function parsePhraseBank(data: unknown): PhraseBank {
	const root = expectRecord(data, 'phrases');
	rejectUnknown(root, ['schemaVersion', 'id', 'locale', 'phrases'], 'phrases');
	const { id, locale } = parseHeader(root, 'phrases', 'phrases');

	const seen = new Set<string>();
	const phrases = expectArray(root['phrases'], 'phrases.phrases').map((raw, i): PhraseEntry => {
		const path = `phrases.phrases[${i}]`;
		const record = expectRecord(raw, path);
		rejectUnknown(record, ['text', 'themes', 'level', 'review'], path);
		const text = parsePhraseText(record['text'], `${path}.text`);
		if (seen.has(text)) fail(`${path}.text`, `duplicate phrase "${text}"`);
		seen.add(text);
		return {
			text,
			themes: parseEntryThemes(record['themes'], null, `${path}.themes`),
			level: parseLevel(record['level'], `${path}.level`),
			review: parseReview(record['review'], `${path}.review`)
		};
	});
	return { schemaVersion: 1, id, locale, phrases };
}

function usable<T extends { readonly text: string; readonly level: WordLevel }>(
	entries: readonly T[],
	learned: Iterable<string>,
	options: UsableOptions
): T[] {
	const known = new Set(learned);
	const maxLevel = options.maxLevel ?? DEFAULT_MAX_LEVEL;
	return entries.filter(
		(entry) => entry.level <= maxLevel && toGraphemes(entry.text).every((char) => known.has(char))
	);
}

export function usableWords(
	bank: WordBank,
	learned: Iterable<string>,
	options: UsableOptions = {}
): WordEntry[] {
	return usable(bank.words, learned, options);
}

export function usablePhrases(
	bank: PhraseBank,
	learned: Iterable<string>,
	options: UsableOptions = {}
): PhraseEntry[] {
	return usable(bank.phrases, learned, options);
}
