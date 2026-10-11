import { describe, expect, it } from 'vitest';
import { findLesson, learnedChars, lessonIds, parseProgression } from './definition';
import { clone, loadShippedProgressions } from './test-support';

type Raw = {
	[key: string]: unknown;
	rules: Record<string, unknown>;
	worlds: { [key: string]: unknown; lessons: Record<string, unknown>[] }[];
};

const BASE: Raw = {
	schemaVersion: 1,
	id: 'fr.progression.test',
	locale: 'fr-FR',
	layoutIds: ['fr-fr-azerty-pc'],
	rules: { unlockAccuracy: 80, starThresholds: [80, 90, 97], newCharWeight: 0.6 },
	worlds: [
		{
			id: 'fr.world.one',
			title: 'One',
			themeId: 'dinos',
			lessons: [
				{
					id: 'fr.lesson.a',
					title: 'A',
					intro: 'Intro A.',
					newChars: ['f', 'j'],
					words: [],
					groupCount: 5,
					groupLength: [2, 4]
				},
				{
					id: 'fr.lesson.b',
					title: 'B',
					intro: 'Intro B.',
					newChars: ['e', ' '],
					words: ['fe'],
					groupCount: 5,
					groupLength: [3, 5]
				}
			]
		},
		{
			id: 'fr.world.two',
			title: 'Two',
			themeId: 'dinos',
			lessons: [
				{
					id: 'fr.lesson.c',
					title: 'C',
					intro: 'Intro C.',
					newChars: ['d'],
					words: [],
					groupCount: 5,
					groupLength: [2, 4]
				}
			]
		}
	]
};

function variant(change: (raw: Raw) => void): unknown {
	const raw = clone(BASE);
	change(raw);
	return raw;
}

function lessonOf(raw: Raw, world: number, lesson: number): Record<string, unknown> {
	return raw.worlds[world]?.lessons[lesson] as Record<string, unknown>;
}

describe('parseProgression', () => {
	it('accepts a valid progression and returns its content', () => {
		expect(parseProgression(clone(BASE))).toEqual(BASE);
	});

	it('does not keep a reference to the input', () => {
		const raw = clone(BASE);
		const parsed = parseProgression(raw);
		lessonOf(raw, 0, 0)['newChars'] = [];
		expect(parsed.worlds[0]?.lessons[0]?.newChars).toEqual(['f', 'j']);
	});

	it('normalizes new characters and words to NFC', () => {
		const parsed = parseProgression(
			variant((raw) => {
				lessonOf(raw, 0, 1)['newChars'] = ['é', ' '];
				lessonOf(raw, 0, 1)['words'] = ['fé'];
			})
		);
		expect(parsed.worlds[0]?.lessons[1]?.newChars).toEqual(['é', ' ']);
		expect(parsed.worlds[0]?.lessons[1]?.words).toEqual(['fé']);
	});

	it('accepts words made of characters introduced by the same lesson', () => {
		expect(() => parseProgression(clone(BASE))).not.toThrow();
	});

	it('accepts a lesson without new characters once something is known', () => {
		expect(() =>
			parseProgression(
				variant((raw) => {
					lessonOf(raw, 1, 0)['newChars'] = [];
				})
			)
		).not.toThrow();
	});

	const invalid: [string, (raw: Raw) => void, RegExp][] = [
		['unknown schema version', (raw) => (raw['schemaVersion'] = 2), /progression\.schemaVersion/],
		['unknown root property', (raw) => (raw['extra'] = 1), /progression\.extra: unknown property/],
		['malformed progression id', (raw) => (raw['id'] = 'fr-progression-test'), /progression\.id/],
		['progression id of another type', (raw) => (raw['id'] = 'fr.world.test'), /progression\.id/],
		[
			'progression id of another language',
			(raw) => (raw['id'] = 'en.progression.test'),
			/progression\.id.*"fr"/
		],
		['invalid locale', (raw) => (raw['locale'] = 'not a locale'), /progression\.locale/],
		['empty layout list', (raw) => (raw['layoutIds'] = []), /progression\.layoutIds/],
		[
			'malformed layout id',
			(raw) => (raw['layoutIds'] = ['AZERTY']),
			/progression\.layoutIds\[0\]/
		],
		[
			'duplicate layout id',
			(raw) => (raw['layoutIds'] = ['fr-fr-azerty-pc', 'fr-fr-azerty-pc']),
			/progression\.layoutIds\[1\]/
		],
		[
			'unlock accuracy above 100',
			(raw) => (raw.rules['unlockAccuracy'] = 101),
			/progression\.rules\.unlockAccuracy/
		],
		[
			'negative unlock accuracy',
			(raw) => (raw.rules['unlockAccuracy'] = -1),
			/progression\.rules\.unlockAccuracy/
		],
		[
			'unlock accuracy that is not a number',
			(raw) => (raw.rules['unlockAccuracy'] = '80'),
			/progression\.rules\.unlockAccuracy/
		],
		[
			'two star thresholds',
			(raw) => (raw.rules['starThresholds'] = [80, 90]),
			/progression\.rules\.starThresholds/
		],
		[
			'descending star thresholds',
			(raw) => (raw.rules['starThresholds'] = [90, 80, 97]),
			/progression\.rules\.starThresholds\[1\].*ascending/
		],
		[
			'equal star thresholds',
			(raw) => (raw.rules['starThresholds'] = [80, 90, 90]),
			/progression\.rules\.starThresholds\[2\]/
		],
		[
			'star threshold above 100',
			(raw) => (raw.rules['starThresholds'] = [80, 90, 101]),
			/progression\.rules\.starThresholds\[2\]/
		],
		[
			'negative star threshold',
			(raw) => (raw.rules['starThresholds'] = [-1, 90, 97]),
			/progression\.rules\.starThresholds\[0\]/
		],
		[
			'new character weight above 1',
			(raw) => (raw.rules['newCharWeight'] = 1.5),
			/progression\.rules\.newCharWeight/
		],
		[
			'negative new character weight',
			(raw) => (raw.rules['newCharWeight'] = -0.1),
			/progression\.rules\.newCharWeight/
		],
		[
			'unknown rule',
			(raw) => (raw.rules['maxSpeed'] = 30),
			/progression\.rules\.maxSpeed: unknown property/
		],
		['no world', (raw) => (raw.worlds = []), /progression\.worlds/],
		['world without lesson', (raw) => (raw.worlds[0]!.lessons = []), /worlds\[0\]\.lessons/],
		['duplicate world id', (raw) => (raw.worlds[1]!['id'] = 'fr.world.one'), /worlds\[1\]\.id/],
		[
			'unknown world property',
			(raw) => (raw.worlds[0]!['color'] = 'red'),
			/worlds\[0\]\.color: unknown property/
		],
		[
			'duplicate lesson id across worlds',
			(raw) => (lessonOf(raw, 1, 0)['id'] = 'fr.lesson.a'),
			/worlds\[1\]\.lessons\[0\]\.id.*duplicate/
		],
		[
			'malformed lesson id',
			(raw) => (lessonOf(raw, 0, 0)['id'] = 'fr.lesson.Bad_Id'),
			/worlds\[0\]\.lessons\[0\]\.id/
		],
		[
			'unknown lesson property',
			(raw) => (lessonOf(raw, 0, 0)['speed'] = 1),
			/lessons\[0\]\.speed: unknown property/
		],
		['empty lesson title', (raw) => (lessonOf(raw, 0, 0)['title'] = ''), /lessons\[0\]\.title/],
		[
			'new character made of two characters',
			(raw) => (lessonOf(raw, 0, 0)['newChars'] = ['fj', 'd']),
			/lessons\[0\]\.newChars\[0\].*exactly one/
		],
		[
			'empty new character',
			(raw) => (lessonOf(raw, 0, 0)['newChars'] = ['', 'd']),
			/lessons\[0\]\.newChars\[0\]/
		],
		[
			'line break as new character',
			(raw) => (lessonOf(raw, 0, 0)['newChars'] = ['\n', 'd']),
			/lessons\[0\]\.newChars\[0\]/
		],
		[
			'new character that is not a string',
			(raw) => (lessonOf(raw, 0, 0)['newChars'] = [1, 'd']),
			/lessons\[0\]\.newChars\[0\]/
		],
		[
			'new character repeated inside a lesson',
			(raw) => (lessonOf(raw, 0, 0)['newChars'] = ['f', 'f']),
			/lessons\[0\]\.newChars\[1\].*already introduced/
		],
		[
			'new character introduced twice in the progression',
			(raw) => (lessonOf(raw, 1, 0)['newChars'] = ['j']),
			/worlds\[1\]\.lessons\[0\]\.newChars\[0\].*already introduced/
		],
		[
			'new character equal to an earlier one after normalization',
			(raw) => (lessonOf(raw, 0, 1)['newChars'] = ['é', 'é']),
			/lessons\[1\]\.newChars\[1\].*already introduced/
		],
		[
			'word using a character that is not learned yet',
			(raw) => (lessonOf(raw, 0, 0)['words'] = ['fe']),
			/lessons\[0\]\.words\[0\].*"e".*not learned/
		],
		[
			'word using a character of a later lesson',
			(raw) => (lessonOf(raw, 0, 1)['words'] = ['fe', 'fd']),
			/lessons\[1\]\.words\[1\].*"d"/
		],
		[
			'word starting with a space',
			(raw) => (lessonOf(raw, 0, 1)['words'] = [' fe']),
			/lessons\[1\]\.words\[0\].*space/
		],
		[
			'word ending with a space',
			(raw) => (lessonOf(raw, 0, 1)['words'] = ['fe ']),
			/lessons\[1\]\.words\[0\].*space/
		],
		[
			'word with two spaces in a row',
			(raw) => (lessonOf(raw, 0, 1)['words'] = ['f  e']),
			/lessons\[1\]\.words\[0\].*two spaces/
		],
		[
			'word with three identical characters in a row',
			(raw) => (lessonOf(raw, 0, 1)['words'] = ['feee']),
			/lessons\[1\]\.words\[0\].*three times/
		],
		[
			'duplicate word',
			(raw) => (lessonOf(raw, 0, 1)['words'] = ['fe', 'fe']),
			/lessons\[1\]\.words\[1\].*duplicate/
		],
		['empty word', (raw) => (lessonOf(raw, 0, 1)['words'] = ['']), /lessons\[1\]\.words\[0\]/],
		['words that are not a list', (raw) => (lessonOf(raw, 0, 0)['words'] = 'fj'), /\.words/],
		['zero group', (raw) => (lessonOf(raw, 0, 0)['groupCount'] = 0), /lessons\[0\]\.groupCount/],
		[
			'fractional group count',
			(raw) => (lessonOf(raw, 0, 0)['groupCount'] = 2.5),
			/lessons\[0\]\.groupCount/
		],
		[
			'minimum length of zero',
			(raw) => (lessonOf(raw, 0, 0)['groupLength'] = [0, 3]),
			/lessons\[0\]\.groupLength\[0\]/
		],
		[
			'maximum length below the minimum',
			(raw) => (lessonOf(raw, 0, 0)['groupLength'] = [4, 3]),
			/lessons\[0\]\.groupLength\[1\]/
		],
		[
			'group length with a single bound',
			(raw) => (lessonOf(raw, 0, 0)['groupLength'] = [3]),
			/lessons\[0\]\.groupLength/
		],
		[
			'space introduced with groups shorter than 3',
			(raw) => (lessonOf(raw, 0, 1)['groupLength'] = [2, 4]),
			/lessons\[1\]\.groupLength.*space/
		],
		[
			'more new characters than groups',
			(raw) => (lessonOf(raw, 0, 0)['groupCount'] = 1),
			/lessons\[0\]\.groupCount/
		],
		[
			'a single known character with groups longer than 2',
			(raw) => {
				lessonOf(raw, 0, 0)['newChars'] = ['f'];
				lessonOf(raw, 0, 1)['newChars'] = [' '];
				lessonOf(raw, 0, 1)['words'] = [];
				lessonOf(raw, 1, 0)['newChars'] = [];
				lessonOf(raw, 0, 0)['groupLength'] = [2, 3];
			},
			/lessons\[0\]\.groupLength/
		],
		[
			'no typable character at all',
			(raw) => {
				lessonOf(raw, 0, 0)['newChars'] = [];
				lessonOf(raw, 0, 0)['words'] = [];
			},
			/lessons\[0\]\.newChars.*no typable/
		]
	];

	it.each(invalid)('rejects %s', (_name, change, message) => {
		expect(() => parseProgression(variant(change))).toThrow(message);
	});

	it.each([null, undefined, 42, 'text', [], [BASE]])('rejects %j as a progression', (value) => {
		expect(() => parseProgression(value)).toThrow(/progression: expected an object/);
	});
});

describe('shipped progressions', () => {
	it('are found and parsed', () => {
		expect(loadShippedProgressions().length).toBeGreaterThan(0);
	});

	it.each(loadShippedProgressions().map((shipped) => [shipped.file, shipped] as const))(
		'%s survives a parse of its own raw data unchanged',
		(_file, shipped) => {
			expect(shipped.progression).toEqual(shipped.raw);
		}
	);
});

describe('lesson accessors', () => {
	const progression = parseProgression(clone(BASE));

	it('lists lesson ids in the order of the worlds', () => {
		expect(lessonIds(progression)).toEqual(['fr.lesson.a', 'fr.lesson.b', 'fr.lesson.c']);
	});

	it('finds a lesson in any world', () => {
		expect(findLesson(progression, 'fr.lesson.c')?.newChars).toEqual(['d']);
		expect(findLesson(progression, 'fr.lesson.a')?.title).toBe('A');
	});

	it('returns undefined for an unknown lesson', () => {
		expect(findLesson(progression, 'fr.lesson.zzz')).toBeUndefined();
	});

	it('accumulates the learned characters up to the lesson included', () => {
		expect(learnedChars(progression, 'fr.lesson.a')).toEqual(['f', 'j']);
		expect(learnedChars(progression, 'fr.lesson.b')).toEqual(['f', 'j', 'e', ' ']);
		expect(learnedChars(progression, 'fr.lesson.c')).toEqual(['f', 'j', 'e', ' ', 'd']);
	});

	it('refuses to compute the characters of an unknown lesson', () => {
		expect(() => learnedChars(progression, 'fr.lesson.zzz')).toThrow(RangeError);
	});
});
