import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from '../graphemes';
import { parsePhraseBank, parseWordBank, usablePhrases, usableWords } from './banks';
import { clone, deepFreeze } from './test-support';

type RawBank = { [key: string]: unknown; words: Record<string, unknown>[] };
type RawPhrases = { [key: string]: unknown; phrases: Record<string, unknown>[] };

const WORDS: RawBank = {
	schemaVersion: 1,
	id: 'fr.words.test',
	locale: 'fr-FR',
	sources: [{ name: 'Test', url: 'https://example.org/test', license: 'CC0-1.0' }],
	themes: [
		{ id: 'cuisine', title: 'Cuisine' },
		{ id: 'animaux', title: 'Animaux' }
	],
	words: [
		{ text: 'le', themes: [], level: 1, review: 'agent' },
		{ text: 'sel', themes: ['cuisine'], level: 1, review: 'human' },
		{ text: 'chat', themes: ['animaux'], level: 2, review: 'agent' },
		{ text: 'été', themes: [], level: 3, review: 'agent' },
		{ text: 'peut-être', themes: [], level: 3, review: 'agent' }
	]
};

const PHRASES: RawPhrases = {
	schemaVersion: 1,
	id: 'fr.phrases.test',
	locale: 'fr-FR',
	phrases: [
		{ text: 'Je lis.', themes: [], level: 1, review: 'agent' },
		{ text: 'Le chat dort!', themes: ['animaux'], level: 2, review: 'agent' },
		{ text: "L'été est là.", themes: [], level: 3, review: 'human' }
	]
};

function wordVariant(change: (raw: RawBank) => void): unknown {
	const raw = clone(WORDS);
	change(raw);
	return raw;
}

function phraseVariant(change: (raw: RawPhrases) => void): unknown {
	const raw = clone(PHRASES);
	change(raw);
	return raw;
}

describe('parseWordBank', () => {
	it('accepts a valid bank and returns its content', () => {
		expect(parseWordBank(clone(WORDS))).toEqual(WORDS);
	});

	it('does not keep a reference to the input', () => {
		const raw = clone(WORDS);
		const parsed = parseWordBank(raw);
		(raw.words[0] as Record<string, unknown>)['text'] = 'changed';
		expect(parsed.words[0]?.text).toBe('le');
	});

	const invalid: [string, (raw: RawBank) => void, RegExp][] = [
		['unknown schema version', (raw) => (raw['schemaVersion'] = 2), /words\.schemaVersion/],
		['unknown root property', (raw) => (raw['extra'] = 1), /words\.extra: unknown property/],
		['malformed id', (raw) => (raw['id'] = 'fr-words-test'), /words\.id/],
		['id of another type', (raw) => (raw['id'] = 'fr.phrases.test'), /words\.id/],
		['id of another language', (raw) => (raw['id'] = 'en.words.test'), /words\.id.*"fr"/],
		['invalid locale', (raw) => (raw['locale'] = 'not a locale'), /words\.locale/],
		[
			'source with an unknown property',
			(raw) => (((raw['sources'] as object[])[0] as Record<string, unknown>)['note'] = 'x'),
			/sources\[0\]\.note/
		],
		[
			'theme that is not a slug',
			(raw) => (raw['themes'] = [{ id: 'Cuisine', title: 'C' }]),
			/themes\[0\]\.id/
		],
		[
			'duplicate theme',
			(raw) =>
				(raw['themes'] = [
					{ id: 'cuisine', title: 'A' },
					{ id: 'cuisine', title: 'B' }
				]),
			/themes\[1\]\.id.*duplicate/
		],
		['word with a capital', (raw) => (raw.words[0]!['text'] = 'Le'), /words\[0\]\.text.*lowercase/],
		['word in NFD', (raw) => (raw.words[3]!['text'] = 'été'), /words\[3\]\.text.*NFC/],
		['word with a space', (raw) => (raw.words[0]!['text'] = 'le chat'), /words\[0\]\.text.*space/],
		['word with a tab', (raw) => (raw.words[0]!['text'] = 'le\tchat'), /words\[0\]\.text/],
		['empty word', (raw) => (raw.words[0]!['text'] = ''), /words\[0\]\.text/],
		['duplicate word', (raw) => (raw.words[1]!['text'] = 'le'), /words\[1\]\.text.*duplicate/],
		[
			'theme that the bank does not declare',
			(raw) => (raw.words[0]!['themes'] = ['espace']),
			/words\[0\]\.themes\[0\].*not declared/
		],
		[
			'duplicate theme on an entry',
			(raw) => (raw.words[1]!['themes'] = ['cuisine', 'cuisine']),
			/words\[1\]\.themes\[1\].*duplicate/
		],
		['level 0', (raw) => (raw.words[0]!['level'] = 0), /words\[0\]\.level/],
		['level 4', (raw) => (raw.words[0]!['level'] = 4), /words\[0\]\.level/],
		['level as text', (raw) => (raw.words[0]!['level'] = '1'), /words\[0\]\.level/],
		['unknown review', (raw) => (raw.words[0]!['review'] = 'robot'), /words\[0\]\.review/],
		['missing review', (raw) => delete raw.words[0]!['review'], /words\[0\]\.review/],
		['unknown entry property', (raw) => (raw.words[0]!['rank'] = 1), /words\[0\]\.rank: unknown/]
	];

	it.each(invalid)('rejects %s', (_name, change, message) => {
		expect(() => parseWordBank(wordVariant(change))).toThrow(message);
	});

	it.each([null, undefined, 3, 'x', []])('rejects %j as a bank', (value) => {
		expect(() => parseWordBank(value)).toThrow(/words: expected an object/);
	});
});

describe('parsePhraseBank', () => {
	it('accepts a valid bank and returns its content', () => {
		expect(parsePhraseBank(clone(PHRASES))).toEqual(PHRASES);
	});

	const invalid: [string, (raw: RawPhrases) => void, RegExp][] = [
		['unknown root property', (raw) => (raw['sources'] = []), /phrases\.sources: unknown property/],
		['id of another type', (raw) => (raw['id'] = 'fr.words.test'), /phrases\.id/],
		['empty phrase', (raw) => (raw.phrases[0]!['text'] = ''), /phrases\[0\]\.text/],
		['phrase made of spaces', (raw) => (raw.phrases[0]!['text'] = '   '), /phrases\[0\]\.text/],
		['phrase in NFD', (raw) => (raw.phrases[2]!['text'] = "L'été."), /phrases\[2\]\.text.*NFC/],
		[
			'leading space',
			(raw) => (raw.phrases[0]!['text'] = ' Je lis.'),
			/phrases\[0\]\.text.*start or end/
		],
		[
			'trailing space',
			(raw) => (raw.phrases[0]!['text'] = 'Je lis. '),
			/phrases\[0\]\.text.*start or end/
		],
		[
			'double space',
			(raw) => (raw.phrases[0]!['text'] = 'Je  lis.'),
			/phrases\[0\]\.text.*two spaces/
		],
		[
			'non-breaking space',
			(raw) => (raw.phrases[0]!['text'] = 'Je lis.'),
			/phrases\[0\]\.text.*plain spaces/
		],
		['line break', (raw) => (raw.phrases[0]!['text'] = 'Je\nlis.'), /phrases\[0\]\.text/],
		[
			'duplicate phrase',
			(raw) => (raw.phrases[1]!['text'] = 'Je lis.'),
			/phrases\[1\]\.text.*duplicate/
		],
		['theme that is not a slug', (raw) => (raw.phrases[0]!['themes'] = ['Mer']), /themes\[0\]/],
		['level 0', (raw) => (raw.phrases[0]!['level'] = 0), /phrases\[0\]\.level/],
		['unknown review', (raw) => (raw.phrases[0]!['review'] = 'x'), /phrases\[0\]\.review/],
		['unknown entry property', (raw) => (raw.phrases[0]!['mood'] = 'x'), /phrases\[0\]\.mood/]
	];

	it.each(invalid)('rejects %s', (_name, change, message) => {
		expect(() => parsePhraseBank(phraseVariant(change))).toThrow(message);
	});

	it('keeps a phrase with capitals, punctuation and single spaces', () => {
		const bank = parsePhraseBank(
			phraseVariant((raw) => (raw.phrases[0]!['text'] = 'Où est-il ? Là-bas, très loin!'))
		);
		expect(bank.phrases[0]?.text).toBe('Où est-il ? Là-bas, très loin!');
	});
});

describe('usableWords', () => {
	const bank = parseWordBank(clone(WORDS));
	const texts = (learned: string[], maxLevel?: 1 | 2 | 3) =>
		usableWords(bank, learned, maxLevel === undefined ? undefined : { maxLevel }).map(
			(entry) => entry.text
		);

	it('keeps only the words written with known characters', () => {
		expect(texts(['l', 'e', 's'])).toEqual(['le', 'sel']);
		expect(texts([...'lesch', ...'at'])).toEqual(['le', 'sel', 'chat']);
	});

	it('returns nothing when no character is known', () => {
		expect(texts([])).toEqual([]);
	});

	it('treats an accented letter as a character of its own', () => {
		expect(texts([...'ét'])).toEqual(['été']);
		expect(texts([...'et'])).toEqual([]);
	});

	it('handles a word with a hyphen only when the hyphen is known', () => {
		expect(texts([...'peut-êr'])).toEqual(['peut-être']);
		expect(texts([...'peutêr'])).toEqual([]);
	});

	it('filters by level and allows every level by default', () => {
		const everything = [...'lescha t-éêipru'];
		expect(texts(everything, 1)).toEqual(['le', 'sel']);
		expect(texts(everything, 2)).toEqual(['le', 'sel', 'chat']);
		expect(texts(everything)).toEqual(['le', 'sel', 'chat', 'été', 'peut-être']);
	});

	it('accepts any iterable of known characters', () => {
		expect(usableWords(bank, new Set(['l', 'e'])).map((entry) => entry.text)).toEqual(['le']);
	});

	it('does not modify the bank', () => {
		const frozen = deepFreeze(parseWordBank(clone(WORDS)));
		expect(() => usableWords(frozen, ['l', 'e'])).not.toThrow();
	});

	it('only returns words whose characters are all known, for any set of known characters', () => {
		const alphabet = [...'leschatéêipru-'];
		fc.assert(
			fc.property(
				fc.subarray(alphabet),
				fc.constantFrom<1 | 2 | 3>(1, 2, 3),
				(learned, maxLevel) => {
					const known = new Set(learned);
					for (const entry of usableWords(bank, learned, { maxLevel })) {
						expect(entry.level).toBeLessThanOrEqual(maxLevel);
						for (const char of toGraphemes(entry.text)) expect(known.has(char)).toBe(true);
					}
				}
			)
		);
	});
});

describe('usablePhrases', () => {
	const bank = parsePhraseBank(clone(PHRASES));
	const texts = (learned: string[], maxLevel?: 1 | 2 | 3) =>
		usablePhrases(bank, learned, maxLevel === undefined ? undefined : { maxLevel }).map(
			(entry) => entry.text
		);

	it('needs the capital, the space and the punctuation, not only the letters', () => {
		expect(texts([...'jelis'])).toEqual([]);
		expect(texts([...'Jelis .'])).toEqual(['Je lis.']);
		expect(texts([...'Jelis'])).toEqual([]);
	});

	it('filters by level', () => {
		const everything = [..."Jelis .LchatdormLté!'à"];
		expect(texts(everything, 1)).toEqual(['Je lis.']);
		expect(texts(everything, 2)).toEqual(['Je lis.', 'Le chat dort!']);
		expect(texts(everything)).toEqual(['Je lis.', 'Le chat dort!', "L'été est là."]);
	});

	it('returns nothing without known characters', () => {
		expect(texts([])).toEqual([]);
	});
});
