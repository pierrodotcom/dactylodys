import { toGraphemes } from '../graphemes';
import { LINE_BREAK, findLesson, learnedChars } from './definition';
import type {
	AgeBand,
	BankSource,
	PhraseBank,
	PhraseEntry,
	ProgressionDefinition,
	ReviewStatus,
	TextBank,
	TextEntry,
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

/** Every age group, youngest first. */
export const AGE_BANDS: readonly AgeBand[] = ['8-9', '10-12'];

export interface UsableOptions {
	/** Highest level allowed; defaults to 3. */
	readonly maxLevel?: WordLevel;
	/** Age group of the child: entries meant for other groups only are left out; absent: none. */
	readonly ageBand?: AgeBand;
}

/** Whether an entry is offered to this age group: unmarked entries are offered to every one. */
export function fitsAgeBand(
	entry: { readonly ages?: readonly AgeBand[] },
	ageBand: AgeBand | undefined
): boolean {
	return ageBand === undefined || entry.ages === undefined || entry.ages.includes(ageBand);
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
	type: 'words' | 'phrases' | 'texts',
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

/** A marked entry names one or more groups, never all of them: an unmarked entry means that. */
function parseAges(value: unknown, path: string): { ages?: AgeBand[] } {
	if (value === undefined) return {};
	const ages: AgeBand[] = [];
	expectArray(value, path).forEach((raw, i) => {
		const band = AGE_BANDS.find((candidate) => candidate === raw);
		if (band === undefined) fail(`${path}[${i}]`, `expected one of: ${AGE_BANDS.join(', ')}`);
		if (ages.includes(band)) fail(`${path}[${i}]`, `duplicate age group "${band}"`);
		ages.push(band);
	});
	if (ages.length === 0 || ages.length === AGE_BANDS.length) {
		fail(path, 'expected some age groups but not all of them (leave it out for all)');
	}
	return { ages: AGE_BANDS.filter((band) => ages.includes(band)) };
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
		rejectUnknown(record, ['text', 'themes', 'level', 'review', 'ages'], path);
		const text = parseWordText(record['text'], `${path}.text`);
		if (seen.has(text)) fail(`${path}.text`, `duplicate word "${text}"`);
		seen.add(text);
		return {
			text,
			themes: parseEntryThemes(record['themes'], declared, `${path}.themes`),
			level: parseLevel(record['level'], `${path}.level`),
			review: parseReview(record['review'], `${path}.review`),
			...parseAges(record['ages'], `${path}.ages`)
		};
	});
	return { schemaVersion: 1, id, locale, sources, themes, words };
}

function parseLessonId(value: unknown, language: string, path: string): string {
	const lessonId = expectString(value, path);
	if (!new RegExp(`^${language}\\.lesson\\.${SLUG}$`).test(lessonId)) {
		fail(path, `expected ${language}.lesson.<slug>`);
	}
	return lessonId;
}

export function parsePhraseBank(data: unknown): PhraseBank {
	const root = expectRecord(data, 'phrases');
	rejectUnknown(root, ['schemaVersion', 'id', 'locale', 'phrases'], 'phrases');
	const { id, locale } = parseHeader(root, 'phrases', 'phrases');
	const language = new Intl.Locale(locale).language;

	const seen = new Set<string>();
	const phrases = expectArray(root['phrases'], 'phrases.phrases').map((raw, i): PhraseEntry => {
		const path = `phrases.phrases[${i}]`;
		const record = expectRecord(raw, path);
		rejectUnknown(record, ['text', 'themes', 'level', 'review', 'lessonId', 'ages'], path);
		const text = parsePhraseText(record['text'], `${path}.text`);
		if (seen.has(text)) fail(`${path}.text`, `duplicate phrase "${text}"`);
		seen.add(text);
		const lessonId =
			record['lessonId'] === undefined
				? undefined
				: parseLessonId(record['lessonId'], language, `${path}.lessonId`);
		return {
			text,
			themes: parseEntryThemes(record['themes'], null, `${path}.themes`),
			level: parseLevel(record['level'], `${path}.level`),
			review: parseReview(record['review'], `${path}.review`),
			...(lessonId === undefined ? {} : { lessonId }),
			...parseAges(record['ages'], `${path}.ages`)
		};
	});
	return { schemaVersion: 1, id, locale, phrases };
}

/**
 * What is wrong with the story phrases of the bank for this progression: a lesson it does not
 * have, or a character not yet learned at that lesson. Empty when they are all right.
 */
export function validateStoryPhrases(
	bank: PhraseBank,
	progression: ProgressionDefinition
): string[] {
	const issues: string[] = [];
	for (const phrase of bank.phrases) {
		const { lessonId } = phrase;
		if (lessonId === undefined) continue;
		if (findLesson(progression, lessonId) === undefined) {
			issues.push(`"${phrase.text}": unknown lesson ${lessonId}`);
			continue;
		}
		const known = new Set(learnedChars(progression, lessonId));
		const unknown = [...new Set(toGraphemes(phrase.text).filter((char) => !known.has(char)))];
		if (unknown.length > 0) {
			issues.push(`"${phrase.text}": not learned at ${lessonId}: ${unknown.join(' ')}`);
		}
	}
	return issues;
}

/** The story phrases of a lesson, in the order of the bank, of this age group when one is given. */
export function storyPhrases(bank: PhraseBank, lessonId: string, ageBand?: AgeBand): PhraseEntry[] {
	return bank.phrases.filter(
		(phrase) => phrase.lessonId === lessonId && fitsAgeBand(phrase, ageBand)
	);
}

function usable<
	T extends {
		readonly text: string;
		readonly level: WordLevel;
		readonly ages?: readonly AgeBand[];
	}
>(entries: readonly T[], learned: Iterable<string>, options: UsableOptions): T[] {
	const known = new Set(learned);
	const maxLevel = options.maxLevel ?? DEFAULT_MAX_LEVEL;
	return entries.filter(
		(entry) =>
			entry.level <= maxLevel &&
			fitsAgeBand(entry, options.ageBand) &&
			toGraphemes(entry.text).every((char) => known.has(char))
	);
}

export function usableWords(
	bank: WordBank,
	learned: Iterable<string>,
	options: UsableOptions = {}
): WordEntry[] {
	return usable(bank.words, learned, options);
}

/** Story phrases are left out: they belong to their lesson (`storyPhrases`). */
export function usablePhrases(
	bank: PhraseBank,
	learned: Iterable<string>,
	options: UsableOptions = {}
): PhraseEntry[] {
	return usable(
		bank.phrases.filter((phrase) => phrase.lessonId === undefined),
		learned,
		options
	);
}

const MIN_TEXT_LINES = 2;

function parseTextId(value: unknown, language: string, path: string): string {
	const id = expectString(value, path);
	if (!new RegExp(`^${language}\\.text\\.${SLUG}$`).test(id)) {
		fail(path, `expected ${language}.text.<slug>`);
	}
	return id;
}

export function parseTextBank(data: unknown): TextBank {
	const root = expectRecord(data, 'texts');
	rejectUnknown(root, ['schemaVersion', 'id', 'locale', 'texts'], 'texts');
	const { id, locale } = parseHeader(root, 'texts', 'texts');
	const language = new Intl.Locale(locale).language;

	const seen = new Set<string>();
	const texts = expectArray(root['texts'], 'texts.texts').map((raw, i): TextEntry => {
		const path = `texts.texts[${i}]`;
		const record = expectRecord(raw, path);
		rejectUnknown(record, ['id', 'lessonId', 'lines', 'level', 'review', 'ages'], path);
		const textId = parseTextId(record['id'], language, `${path}.id`);
		if (seen.has(textId)) fail(`${path}.id`, `duplicate text "${textId}"`);
		seen.add(textId);
		const lines = expectArray(record['lines'], `${path}.lines`).map((line, j) =>
			parsePhraseText(line, `${path}.lines[${j}]`)
		);
		if (lines.length < MIN_TEXT_LINES) {
			fail(`${path}.lines`, `expected at least ${MIN_TEXT_LINES} lines`);
		}
		return {
			id: textId,
			lessonId: parseLessonId(record['lessonId'], language, `${path}.lessonId`),
			lines,
			level: parseLevel(record['level'], `${path}.level`),
			review: parseReview(record['review'], `${path}.review`),
			...parseAges(record['ages'], `${path}.ages`)
		};
	});
	return { schemaVersion: 1, id, locale, texts };
}

/** The whole text as it is typed: its lines with a line break between two of them. */
export function textOf(entry: TextEntry): string {
	return entry.lines.join(LINE_BREAK);
}

/**
 * What is wrong with the texts of the bank for this progression: a lesson it does not have, or a
 * character (Enter included) not yet learned at that lesson. Empty when they are all right.
 */
export function validateTexts(bank: TextBank, progression: ProgressionDefinition): string[] {
	const issues: string[] = [];
	for (const entry of bank.texts) {
		if (findLesson(progression, entry.lessonId) === undefined) {
			issues.push(`${entry.id}: unknown lesson ${entry.lessonId}`);
			continue;
		}
		const known = new Set(learnedChars(progression, entry.lessonId));
		const unknown = [...new Set(toGraphemes(textOf(entry)).filter((char) => !known.has(char)))];
		if (unknown.length > 0) {
			const shown = unknown.map((char) => JSON.stringify(char)).join(' ');
			issues.push(`${entry.id}: not learned at ${entry.lessonId}: ${shown}`);
		}
	}
	return issues;
}

/** The texts of a lesson, in the order of the bank, of this age group when one is given. */
export function lessonTexts(bank: TextBank, lessonId: string, ageBand?: AgeBand): TextEntry[] {
	return bank.texts.filter((entry) => entry.lessonId === lessonId && fitsAgeBand(entry, ageBand));
}

/**
 * The groups a text is typed in: whole lines, each but the last of the text ending with Enter, put
 * together as long as a group holds at most `maxLength` graphemes; a longer line stays alone.
 * Without `maxLength`, one line per group.
 */
export function textGroups(entry: TextEntry, maxLength = 0): string[] {
	const groups: string[] = [];
	let current = '';
	entry.lines.forEach((line, index) => {
		const piece = index < entry.lines.length - 1 ? `${line}${LINE_BREAK}` : line;
		const joined = current + piece;
		if (current !== '' && toGraphemes(joined).length > maxLength) {
			groups.push(current);
			current = piece;
		} else {
			current = joined;
		}
	});
	if (current !== '') groups.push(current);
	return groups;
}
