import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { toGraphemes } from '../graphemes';
import {
	lessonTexts,
	parsePhraseBank,
	parseTextBank,
	parseWordBank,
	storyPhrases,
	textGroups,
	textOf,
	usablePhrases,
	usableWords,
	validateStoryPhrases,
	validateTexts
} from './banks';
import { parseProgression } from './definition';
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
			(raw) => (raw.phrases[0]!['text'] = 'Je\u00A0lis.'),
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

	it('keeps the lesson of a story phrase, and adds nothing to the others', () => {
		const bank = parsePhraseBank(
			phraseVariant((raw) => (raw.phrases[1]!['lessonId'] = 'fr.lesson.chat-dort'))
		);
		expect(bank.phrases[1]?.lessonId).toBe('fr.lesson.chat-dort');
		expect(bank.phrases[0]).not.toHaveProperty('lessonId');
	});

	it.each([
		['an empty lesson', ''],
		['a lesson of another language', 'en.lesson.cat'],
		['a world instead of a lesson', 'fr.world.cuisine'],
		['a lesson that is not a slug', 'fr.lesson.Chat'],
		['a lesson that is not a string', 3]
	])('rejects a story phrase of %s', (_name, lessonId) => {
		expect(() =>
			parsePhraseBank(phraseVariant((raw) => (raw.phrases[0]!['lessonId'] = lessonId)))
		).toThrow(/phrases\[0\]\.lessonId/);
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

	it('leaves out the story phrases, which belong to their lesson', () => {
		const story = parsePhraseBank(
			phraseVariant((raw) => (raw.phrases[0]!['lessonId'] = 'fr.lesson.lis'))
		);
		expect(usablePhrases(story, [...'Jelis .']).map((entry) => entry.text)).toEqual([]);
	});
});

describe('story phrases', () => {
	const progression = parseProgression({
		schemaVersion: 1,
		id: 'fr.progression.story',
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
				id: 'fr.world.one',
				title: 'One',
				themeId: 'dinos',
				gameIds: ['hatching'],
				lessons: [
					['fjds', ['f', 'j', 'd', 's', ' ']],
					['el', ['e', 'l']],
					['i', ['i']]
				].map(([slug, newChars]) => ({
					id: `fr.lesson.${String(slug)}`,
					title: String(slug),
					intro: 'Intro.',
					newChars,
					words: [],
					mix: { drills: 1, words: 0, phrases: 0 },
					unlocks: [],
					groupCount: 8,
					targetLength: 20,
					groupLength: [5, 6]
				}))
			}
		]
	});
	const bankOf = (entries: [string, string][]) =>
		parsePhraseBank({
			schemaVersion: 1,
			id: 'fr.phrases.story',
			locale: 'fr-FR',
			phrases: [
				{ text: 'je lis', themes: [], level: 1, review: 'agent' },
				...entries.map(([text, lessonId]) => ({
					text,
					themes: [],
					level: 1,
					review: 'human',
					lessonId
				}))
			]
		});

	it('lists the story phrases of one lesson, in the order of the bank', () => {
		const bank = bankOf([
			['elle se lasse', 'fr.lesson.el'],
			['il lit', 'fr.lesson.i'],
			['elle file', 'fr.lesson.el']
		]);
		expect(storyPhrases(bank, 'fr.lesson.el').map((entry) => entry.text)).toEqual([
			'elle se lasse',
			'elle file'
		]);
		expect(storyPhrases(bank, 'fr.lesson.fjds')).toEqual([]);
	});

	it('finds nothing wrong with phrases written with the keys of their lesson', () => {
		const bank = bankOf([
			['elle se fe', 'fr.lesson.el'],
			['si je lis', 'fr.lesson.i']
		]);
		expect(validateStoryPhrases(bank, progression)).toEqual([]);
	});

	it('refuses a story phrase whose lesson does not exist', () => {
		const bank = bankOf([['elle se fe', 'fr.lesson.zzz']]);
		expect(validateStoryPhrases(bank, progression)).toEqual([
			'"elle se fe": unknown lesson fr.lesson.zzz'
		]);
	});

	it('refuses a story phrase that needs a key learned after its lesson', () => {
		const bank = bankOf([['si je lis', 'fr.lesson.el']]);
		expect(validateStoryPhrases(bank, progression)).toEqual([
			'"si je lis": not learned at fr.lesson.el: i'
		]);
	});
});

describe('text bank', () => {
	const NL = String.fromCharCode(10);
	const RAW = {
		schemaVersion: 1,
		id: 'fr.texts.test',
		locale: 'fr-FR',
		texts: [
			{
				id: 'fr.text.liste',
				lessonId: 'fr.lesson.enter',
				lines: ['liste :', 'du sel', 'des fils'],
				level: 1,
				review: 'agent'
			},
			{
				id: 'fr.text.mot',
				lessonId: 'fr.lesson.after',
				lines: ['Salut !', 'Je lis.'],
				level: 2,
				review: 'human'
			}
		]
	};
	type RawTexts = typeof RAW;
	const textsWith = (change: (raw: RawTexts) => void) => {
		const raw = clone(RAW);
		change(raw);
		return raw;
	};
	const textAt = (raw: RawTexts, index: number) => raw.texts[index] as RawTexts['texts'][number];
	const progression = parseProgression({
		schemaVersion: 1,
		id: 'fr.progression.texts',
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
				id: 'fr.world.texts',
				title: 'Texts',
				themeId: 'general',
				gameIds: ['dialogue'],
				lessons: [
					{ slug: 'letters', newChars: [...'abcdefghijlmnorstu'] },
					{ slug: 'space', newChars: [' ', ':', '.', '!'] },
					{ slug: 'enter', newChars: [NL] },
					{ slug: 'after', newChars: [] }
				].map(({ slug, newChars }) => ({
					id: `fr.lesson.${slug}`,
					title: slug,
					intro: 'Intro.',
					newChars,
					words: [],
					mix: { drills: 1, words: 0, phrases: 0 },
					unlocks: slug === 'after' ? ['uppercase'] : [],
					groupCount: 20,
					targetLength: 20,
					groupLength: [3, 20]
				}))
			}
		]
	});

	it('reads a valid bank', () => {
		const bank = parseTextBank(RAW);
		expect(bank.id).toBe('fr.texts.test');
		expect(bank.texts.map((entry) => entry.lines)).toEqual([
			['liste :', 'du sel', 'des fils'],
			['Salut !', 'Je lis.']
		]);
		expect(bank.texts[1]?.review).toBe('human');
	});

	it.each([
		['a text of one line', (raw: RawTexts) => (textAt(raw, 0).lines = ['liste :']), /lines/],
		[
			'a line with Enter in it',
			(raw: RawTexts) => (textAt(raw, 0).lines[1] = `du${NL}sel`),
			/lines\[1\]/
		],
		['an empty line', (raw: RawTexts) => (textAt(raw, 0).lines[1] = ''), /lines\[1\]/],
		[
			'a line ending with a space',
			(raw: RawTexts) => (textAt(raw, 0).lines[1] = 'du sel '),
			/lines\[1\]/
		],
		['a duplicate id', (raw: RawTexts) => (textAt(raw, 1).id = 'fr.text.liste'), /duplicate/],
		['an id of another type', (raw: RawTexts) => (textAt(raw, 0).id = 'fr.phrase.liste'), /\.id/],
		[
			'a lesson of another language',
			(raw: RawTexts) => (textAt(raw, 0).lessonId = 'en.lesson.enter'),
			/lessonId/
		],
		['a bank id of another type', (raw: RawTexts) => (raw.id = 'fr.phrases.test'), /texts\.id/],
		[
			'an unknown property',
			(raw: RawTexts) => Object.assign(textAt(raw, 0), { title: 'x' }),
			/title/
		]
	])('rejects %s', (_name, change, message) => {
		expect(() => parseTextBank(textsWith(change))).toThrow(message);
	});

	it('types a text as its lines with Enter between them, never after the last one', () => {
		const [liste] = parseTextBank(RAW).texts;
		expect(liste && textOf(liste)).toBe(`liste :${NL}du sel${NL}des fils`);
	});

	it('lists the texts of a lesson in the order of the bank', () => {
		const bank = parseTextBank(RAW);
		expect(lessonTexts(bank, 'fr.lesson.after').map((entry) => entry.id)).toEqual(['fr.text.mot']);
		expect(lessonTexts(bank, 'fr.lesson.letters')).toEqual([]);
	});

	it('finds nothing wrong with texts written with the keys of their lesson', () => {
		expect(validateTexts(parseTextBank(RAW), progression)).toEqual([]);
	});

	it('refuses a text before Enter, with keys learned after its lesson, or for no lesson', () => {
		const bank = parseTextBank(
			textsWith((raw) => {
				textAt(raw, 0).lessonId = 'fr.lesson.space';
				textAt(raw, 1).lessonId = 'fr.lesson.enter';
				raw.texts.push({ ...textAt(raw, 1), id: 'fr.text.ghost', lessonId: 'fr.lesson.zzz' });
			})
		);
		expect(validateTexts(bank, progression)).toEqual([
			`fr.text.liste: not learned at fr.lesson.space: ${JSON.stringify(NL)}`,
			'fr.text.mot: not learned at fr.lesson.enter: "S" "J"',
			'fr.text.ghost: unknown lesson fr.lesson.zzz'
		]);
	});

	describe('textGroups', () => {
		const entry = (lines: string[]) => ({
			id: 'fr.text.x',
			lessonId: 'fr.lesson.after',
			lines,
			level: 1 as const,
			review: 'agent' as const
		});

		it('gives one line per group without a length, Enter ending all but the last', () => {
			expect(textGroups(entry(['liste :', 'du sel', 'des fils']))).toEqual([
				`liste :${NL}`,
				`du sel${NL}`,
				'des fils'
			]);
		});

		it('puts whole lines together as long as they fit, a long line alone', () => {
			expect(textGroups(entry(['liste :', 'du sel', 'des fils', 'un ballon rouge']), 16)).toEqual([
				`liste :${NL}du sel${NL}`,
				`des fils${NL}`,
				'un ballon rouge'
			]);
			expect(textGroups(entry(['une ligne bien trop longue', 'fin']), 8)).toEqual([
				`une ligne bien trop longue${NL}`,
				'fin'
			]);
		});

		it('keeps every character in order, and a group of several lines within its length', () => {
			fc.assert(
				fc.property(
					fc.array(fc.stringMatching(/^[a-z]([a-z ]{0,10}[a-z])?$/), {
						minLength: 2,
						maxLength: 5
					}),
					fc.integer({ min: 0, max: 30 }),
					(lines, maxLength) => {
						const groups = textGroups(entry(lines), maxLength);
						expect(groups.join('')).toBe(lines.join(NL));
						for (const group of groups) {
							expect(group.startsWith(NL)).toBe(false);
							const linesInside = group.split(NL).filter((line) => line !== '').length;
							if (linesInside > 1) {
								expect(toGraphemes(group).length).toBeLessThanOrEqual(maxLength);
							}
						}
					}
				)
			);
		});
	});
});
