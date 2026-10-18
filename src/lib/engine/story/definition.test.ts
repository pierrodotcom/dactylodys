import { describe, expect, it } from 'vitest';
import { parseProgression } from '../progression/definition';
import { parseStory, validateStory } from './definition';
import { PROGRESSION, STORY, STORY_DATA } from './test-support';
import type { StoryDefinition } from './types';

type Mutable = Record<string, unknown>;
type Draft = { -readonly [K in keyof StoryDefinition]: StoryDefinition[K] };

/** A fresh copy of the valid data, changed by `edit`. */
function variant(edit: (data: typeof STORY_DATA) => void): unknown {
	const data = structuredClone(STORY_DATA);
	edit(data);
	return data;
}

describe('parseStory', () => {
	it('accepts a valid story and keeps its content', () => {
		expect(parseStory(structuredClone(STORY_DATA))).toEqual(STORY_DATA);
	});

	it('accepts accented NFC texts', () => {
		const story = parseStory(
			variant((data) => {
				(data.worlds[0] as Mutable)['opening'] = 'Il était une fois…';
			})
		);
		expect(story.worlds[0]?.opening).toBe('Il était une fois…');
	});

	it.each<[string, unknown, string]>([
		['a non-object', 'story', 'story: expected an object'],
		['an array', [], 'story: expected an object'],
		['null', null, 'story: expected an object']
	])('rejects %s', (_name, data, message) => {
		expect(() => parseStory(data)).toThrow(message);
	});

	it.each<[string, (data: typeof STORY_DATA) => void, string]>([
		[
			'an unknown root property',
			(data) => ((data as Mutable)['extra'] = 1),
			'story.extra: unknown property'
		],
		[
			'a wrong schema version',
			(data) => ((data as Mutable)['schemaVersion'] = 2),
			'story.schemaVersion: expected 1'
		],
		['a missing locale', (data) => delete (data as Mutable)['locale'], 'story.locale'],
		[
			'an invalid locale',
			(data) => (data.locale = 'not a locale'),
			'story.locale: expected a BCP 47'
		],
		[
			'a malformed id',
			(data) => (data.id = 'fr.progression.test'),
			'story.id: expected <language>.story.<slug>'
		],
		[
			'an id with another language',
			(data) => (data.id = 'en.story.test'),
			'story.id: expected the language prefix "fr"'
		],
		[
			'a malformed progression id',
			(data) => (data.progressionId = 'test'),
			'story.progressionId: expected <language>.progression.<slug>'
		],
		[
			'a progression id with another language',
			(data) => (data.progressionId = 'en.progression.test'),
			'story.progressionId: expected the language prefix "fr"'
		],
		['no worlds', (data) => (data.worlds = []), 'story.worlds: expected at least one world'],
		[
			'worlds that are not an array',
			(data) => ((data as Mutable)['worlds'] = {}),
			'story.worlds: expected an array'
		],
		[
			'a world that is not an object',
			(data) => ((data.worlds as unknown[])[0] = 'one'),
			'story.worlds[0]: expected an object'
		],
		[
			'an unknown world property',
			(data) => ((data.worlds[0] as Mutable)['extra'] = 1),
			'story.worlds[0].extra: unknown property'
		],
		[
			'a malformed world id',
			(data) => ((data.worlds[1] as Mutable)['worldId'] = 'fr.lesson.two'),
			'story.worlds[1].worldId: expected <language>.world.<slug>'
		],
		[
			'a world id with another language',
			(data) => ((data.worlds[1] as Mutable)['worldId'] = 'en.world.two'),
			'story.worlds[1].worldId: expected the language prefix "fr"'
		],
		[
			'a world cited twice',
			(data) => ((data.worlds[1] as Mutable)['worldId'] = 'fr.world.one'),
			'story.worlds[1].worldId: duplicate world id "fr.world.one"'
		],
		[
			'an empty opening',
			(data) => (data.worlds[0]!.opening = ''),
			'story.worlds[0].opening: expected a non-empty string'
		],
		[
			'a blank ending',
			(data) => (data.worlds[1]!.ending = '   '),
			'story.worlds[1].ending: expected a non-empty string'
		],
		[
			'a missing opening',
			(data) => delete (data.worlds[0] as Mutable)['opening'],
			'story.worlds[0].opening: expected a non-empty string'
		],
		[
			'an opening that is not a string',
			(data) => ((data.worlds[0] as Mutable)['opening'] = 3),
			'story.worlds[0].opening: expected a non-empty string'
		],
		[
			'an opening that is not in NFC',
			(data) => (data.worlds[0]!.opening = 'éte'),
			'story.worlds[0].opening: expected a text in NFC'
		],
		[
			'an opening with a leading space',
			(data) => (data.worlds[0]!.opening = ' Open.'),
			'story.worlds[0].opening: a text must not start or end with a space'
		],
		[
			'an ending with a trailing newline',
			(data) => (data.worlds[0]!.ending = 'End.\n'),
			'story.worlds[0].ending: a text must not start or end with a space'
		],
		[
			'lessons that are not an array',
			(data) => ((data.worlds[0] as Mutable)['lessons'] = 'a'),
			'story.worlds[0].lessons: expected an array'
		],
		[
			'a line that is not an object',
			(data) => ((data.worlds[0]!.lessons as unknown[])[1] = null),
			'story.worlds[0].lessons[1]: expected an object'
		],
		[
			'an unknown line property',
			(data) => ((data.worlds[0]!.lessons[0] as Mutable)['extra'] = 1),
			'story.worlds[0].lessons[0].extra: unknown property'
		],
		[
			'a malformed lesson id',
			(data) => (data.worlds[0]!.lessons[0]!.lessonId = 'fr.world.a'),
			'story.worlds[0].lessons[0].lessonId: expected <language>.lesson.<slug>'
		],
		[
			'a lesson id with another language',
			(data) => (data.worlds[0]!.lessons[0]!.lessonId = 'en.lesson.a'),
			'story.worlds[0].lessons[0].lessonId: expected the language prefix "fr"'
		],
		[
			'a lesson cited twice in a world',
			(data) => (data.worlds[0]!.lessons[1]!.lessonId = 'fr.lesson.a'),
			'story.worlds[0].lessons[1].lessonId: duplicate lesson id "fr.lesson.a"'
		],
		[
			'a lesson cited in two worlds',
			(data) => (data.worlds[1]!.lessons[0]!.lessonId = 'fr.lesson.a'),
			'story.worlds[1].lessons[0].lessonId: duplicate lesson id "fr.lesson.a"'
		],
		[
			'an empty line',
			(data) => (data.worlds[0]!.lessons[0]!.line = ''),
			'story.worlds[0].lessons[0].line: expected a non-empty string'
		],
		[
			'a missing picture for an opening',
			(data) => delete (data.worlds[0] as Mutable)['openingArt'],
			'story.worlds[0].openingArt: expected a non-empty string'
		],
		[
			'a picture name that is not in kebab-case',
			(data) => ((data.worlds[1] as Mutable)['endingArt'] = 'End Two'),
			'story.worlds[1].endingArt: expected a picture name in kebab-case'
		],
		[
			'a line without a picture',
			(data) => delete (data.worlds[0]!.lessons[1] as Mutable)['art'],
			'story.worlds[0].lessons[1].art: expected a non-empty string'
		],
		[
			'a line with a trailing space',
			(data) => (data.worlds[1]!.lessons[0]!.line = 'Line c. '),
			'story.worlds[1].lessons[0].line: a text must not start or end with a space'
		]
	])('rejects %s', (_name, edit, message) => {
		expect(() => parseStory(variant(edit))).toThrow(message);
	});

	it('does not mutate its input', () => {
		const data = structuredClone(STORY_DATA);
		parseStory(data);
		expect(data).toEqual(STORY_DATA);
	});
});

describe('validateStory', () => {
	function storyWith(edit: (story: Draft) => void): StoryDefinition {
		const draft: Draft = parseStory(structuredClone(STORY_DATA));
		edit(draft);
		return draft;
	}

	it('finds nothing to say about a consistent story', () => {
		expect(validateStory(STORY, PROGRESSION)).toEqual([]);
	});

	it('reports another progression id', () => {
		const other = parseProgression({
			...structuredClone(PROGRESSION),
			id: 'fr.progression.other'
		});
		expect(validateStory(STORY, other)).toEqual([
			'story.progressionId: expected "fr.progression.other" but the story follows "fr.progression.test"'
		]);
	});

	it('reports a world that the progression does not know', () => {
		const story = storyWith((s) => {
			s.worlds = [
				...s.worlds,
				{
					worldId: 'fr.world.three',
					opening: 'o',
					openingArt: 'o',
					ending: 'e',
					endingArt: 'e',
					lessons: []
				}
			];
		});
		expect(validateStory(story, PROGRESSION)).toEqual([
			'story.worlds[2].worldId: world "fr.world.three" is not in the progression'
		]);
	});

	it('reports a lesson that the progression does not know', () => {
		const story = storyWith((s) => {
			s.worlds = [
				s.worlds[0] as StoryDefinition['worlds'][number],
				{
					...(s.worlds[1] as StoryDefinition['worlds'][number]),
					lessons: [
						{ lessonId: 'fr.lesson.c', line: 'Line c.', art: 'line-c' },
						{ lessonId: 'fr.lesson.zzz', line: 'Line z.', art: 'line-zzz' }
					]
				}
			];
		});
		expect(validateStory(story, PROGRESSION)).toEqual([
			'story.worlds[1].lessons[1].lessonId: lesson "fr.lesson.zzz" is not in the progression'
		]);
	});

	it('reports a lesson told under another world than its own', () => {
		const story = storyWith((s) => {
			s.worlds = [
				{
					...(s.worlds[0] as StoryDefinition['worlds'][number]),
					lessons: [
						{ lessonId: 'fr.lesson.a', line: 'Line a.', art: 'line-a' },
						{ lessonId: 'fr.lesson.b', line: 'Line b.', art: 'line-b' },
						{ lessonId: 'fr.lesson.c', line: 'Line c.', art: 'line-c' }
					]
				},
				{ ...(s.worlds[1] as StoryDefinition['worlds'][number]), lessons: [] }
			];
		});
		expect(validateStory(story, PROGRESSION)).toEqual([
			'story.worlds[0].lessons[2].lessonId: lesson "fr.lesson.c" belongs to world "fr.world.two", not "fr.world.one"'
		]);
	});

	it('reports a world of the progression that the story does not tell', () => {
		const story = storyWith((s) => {
			s.worlds = [s.worlds[0] as StoryDefinition['worlds'][number]];
		});
		expect(validateStory(story, PROGRESSION)).toEqual([
			'world "fr.world.two" has no opening and no ending in the story',
			'lesson "fr.lesson.c" has no line in the story'
		]);
	});

	it('reports an empty opening or ending built by hand', () => {
		const story = storyWith((s) => {
			s.worlds = [
				{ ...(s.worlds[0] as StoryDefinition['worlds'][number]), opening: ' ' },
				{ ...(s.worlds[1] as StoryDefinition['worlds'][number]), ending: '' }
			];
		});
		expect(validateStory(story, PROGRESSION)).toEqual([
			'story.worlds[0].opening: expected an opening',
			'story.worlds[1].ending: expected an ending'
		]);
	});

	it('reports a lesson of the progression without a line', () => {
		const story = storyWith((s) => {
			s.worlds = [
				{
					...(s.worlds[0] as StoryDefinition['worlds'][number]),
					lessons: [{ lessonId: 'fr.lesson.a', line: 'Line a.', art: 'line-a' }]
				},
				s.worlds[1] as StoryDefinition['worlds'][number]
			];
		});
		expect(validateStory(story, PROGRESSION)).toEqual([
			'lesson "fr.lesson.b" has no line in the story'
		]);
	});

	it('lists every problem at once', () => {
		const story = storyWith((s) => {
			s.progressionId = 'fr.progression.other';
			s.worlds = [];
		});
		expect(validateStory(story, PROGRESSION)).toHaveLength(6);
	});
});
