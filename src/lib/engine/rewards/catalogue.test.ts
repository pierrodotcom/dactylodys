import { describe, expect, it } from 'vitest';
import { parseProgression } from '../progression/definition';
import { parseRewardCatalogue, validateRewardCatalogue } from './catalogue';
import { catalogueData, LESSON_A, PROGRESSION, RULES, rewardData, WORLD_ONE } from './test-support';

const PASSED = { kind: 'lesson-passed', lessonId: LESSON_A };

function parseWith(rewards: unknown[], extra: Record<string, unknown> = {}) {
	return parseRewardCatalogue(catalogueData(rewards, extra));
}

describe('parseRewardCatalogue', () => {
	it('reads every kind of condition', () => {
		const catalogue = parseWith([
			rewardData('one', PASSED),
			rewardData('two', { kind: 'lesson-stars', lessonId: LESSON_A, stars: 2 }),
			rewardData('three', { kind: 'world-passed', worldId: WORLD_ONE }),
			rewardData('four', { kind: 'world-stars', worldId: WORLD_ONE, stars: 3 }),
			rewardData(
				'five',
				{ kind: 'chars-mastered', chars: ['f', 'é'], minAttempts: 20, maxErrorRate: 0.1 },
				{ kind: 'item', slot: 'head' }
			)
		]);
		expect(catalogue.rewards.map((reward) => reward.condition.kind)).toEqual([
			'lesson-passed',
			'lesson-stars',
			'world-passed',
			'world-stars',
			'chars-mastered'
		]);
		expect(catalogue.rewards[4]).toMatchObject({ kind: 'item', slot: 'head' });
		expect(catalogue.colors.map((color) => color.id)).toEqual(['green', 'blue']);
		expect(catalogue.progressionId).toBe(PROGRESSION.id);
	});

	it('accepts a catalogue without colours or rewards', () => {
		const catalogue = parseRewardCatalogue(catalogueData([], { colors: [] }));
		expect(catalogue.rewards).toEqual([]);
		expect(catalogue.colors).toEqual([]);
	});

	it('normalises a character to NFC', () => {
		const catalogue = parseWith([
			rewardData('one', {
				kind: 'chars-mastered',
				chars: ['é'],
				minAttempts: 1,
				maxErrorRate: 0
			})
		]);
		expect(catalogue.rewards[0]?.condition).toMatchObject({ chars: ['é'] });
	});

	it.each<[string, unknown, string]>([
		['a non-object', 'nope', 'catalogue: expected an object'],
		['a wrong schema version', catalogueData([], { schemaVersion: 2 }), 'catalogue.schemaVersion'],
		['an unknown root key', catalogueData([], { extra: 1 }), 'catalogue.extra: unknown property'],
		['a bad locale', catalogueData([], { locale: 'not a locale' }), 'catalogue.locale'],
		['a bad catalogue id', catalogueData([], { id: 'fr.reward.x' }), 'catalogue.id'],
		['a foreign language id', catalogueData([], { id: 'en.rewards.x' }), 'catalogue.id'],
		[
			'a bad progression id',
			catalogueData([], { progressionId: 'fr.lesson.x' }),
			'catalogue.progressionId'
		],
		['colours that are not a list', catalogueData([], { colors: {} }), 'catalogue.colors'],
		[
			'a duplicate colour',
			catalogueData([], {
				colors: [
					{ id: 'a', title: 'A' },
					{ id: 'a', title: 'B' }
				]
			}),
			'catalogue.colors[1].id: duplicate'
		],
		[
			'an unknown colour key',
			catalogueData([], { colors: [{ id: 'a', title: 'A', hex: '#fff' }] }),
			'catalogue.colors[0].hex'
		],
		['a colour without title', catalogueData([], { colors: [{ id: 'a' }] }), 'colors[0].title']
	])('refuses %s', (_name, data, message) => {
		expect(() => parseRewardCatalogue(data)).toThrow(message);
	});

	it.each<[string, Record<string, unknown>, string]>([
		['a bad id', { id: 'fr.lesson.x' }, 'catalogue.rewards[0].id'],
		['a foreign language id', { id: 'en.reward.x' }, 'catalogue.rewards[0].id'],
		['an unknown kind', { kind: 'badge' }, 'catalogue.rewards[0].kind'],
		['an empty title', { title: ' ' }, 'catalogue.rewards[0].title'],
		['a missing description', { description: undefined }, 'catalogue.rewards[0].description'],
		['a bad art id', { artId: 'Not A Slug' }, 'catalogue.rewards[0].artId'],
		['an item without slot', { kind: 'item' }, 'catalogue.rewards[0].slot: expected a slot'],
		['a slot on a trophy', { slot: 'head' }, 'catalogue.rewards[0].slot: only an item'],
		[
			'a slot on a skill',
			{ kind: 'skill', slot: 'head' },
			'catalogue.rewards[0].slot: only an item'
		],
		['a bad slot', { kind: 'item', slot: 'Head!' }, 'catalogue.rewards[0].slot'],
		['an unknown key', { rarity: 'rare' }, 'catalogue.rewards[0].rarity: unknown property']
	])('refuses a reward with %s', (_name, overrides, message) => {
		const reward = { ...rewardData('one', PASSED), ...overrides };
		expect(() => parseWith([reward])).toThrow(message);
	});

	it('refuses two rewards with the same id', () => {
		expect(() => parseWith([rewardData('one', PASSED), rewardData('one', PASSED)])).toThrow(
			'catalogue.rewards[1].id: duplicate reward id'
		);
	});

	it.each<[string, unknown, string]>([
		['a missing condition', undefined, 'catalogue.rewards[0].condition'],
		['an unknown kind', { kind: 'play-count', count: 10 }, 'condition.kind'],
		['a speed condition', { kind: 'speed', wpm: 10 }, 'condition.kind'],
		['a lesson id of another type', { kind: 'lesson-passed', lessonId: 'fr.world.x' }, 'lessonId'],
		[
			'a lesson id of another language',
			{ kind: 'lesson-passed', lessonId: 'en.lesson.a' },
			'lessonId'
		],
		['an extra key on lesson-passed', { ...PASSED, stars: 1 }, 'condition.stars: unknown property'],
		['zero stars', { kind: 'lesson-stars', lessonId: LESSON_A, stars: 0 }, 'condition.stars'],
		['four stars', { kind: 'lesson-stars', lessonId: LESSON_A, stars: 4 }, 'condition.stars'],
		['no stars', { kind: 'world-stars', worldId: WORLD_ONE }, 'condition.stars'],
		['a world id of another type', { kind: 'world-passed', worldId: LESSON_A }, 'worldId'],
		[
			'an extra key on world-stars',
			{ kind: 'world-stars', worldId: WORLD_ONE, stars: 1, extra: true },
			'condition.extra: unknown property'
		]
	])('refuses a condition with %s', (_name, condition, message) => {
		expect(() => parseWith([rewardData('one', condition)])).toThrow(message);
	});

	describe('chars-mastered', () => {
		const mastered = { kind: 'chars-mastered', chars: ['f'], minAttempts: 10, maxErrorRate: 0.1 };

		it.each<[string, Record<string, unknown>, string]>([
			['no characters', { chars: [] }, 'condition.chars: expected at least one'],
			['characters that are not a list', { chars: 'f' }, 'condition.chars'],
			['an empty character', { chars: [''] }, 'condition.chars[0]'],
			['two characters in one entry', { chars: ['fj'] }, 'exactly one character'],
			['a control character', { chars: ['\n'] }, 'printable'],
			['a duplicate character', { chars: ['f', 'f'] }, 'condition.chars[1]: duplicate'],
			['zero attempts', { minAttempts: 0 }, 'condition.minAttempts'],
			['a fractional minimum', { minAttempts: 2.5 }, 'condition.minAttempts: expected an integer'],
			['a missing minimum', { minAttempts: undefined }, 'condition.minAttempts'],
			['a negative error rate', { maxErrorRate: -0.1 }, 'condition.maxErrorRate'],
			['an error rate above 1', { maxErrorRate: 1.5 }, 'condition.maxErrorRate'],
			['an error rate in percent as a string', { maxErrorRate: '10%' }, 'condition.maxErrorRate'],
			['an unknown key', { window: 30 }, 'condition.window: unknown property']
		])('refuses %s', (_name, overrides, message) => {
			expect(() => parseWith([rewardData('one', { ...mastered, ...overrides })])).toThrow(message);
		});

		it('accepts the bounds of the error rate', () => {
			expect(() =>
				parseWith([
					rewardData('one', { ...mastered, maxErrorRate: 0 }),
					rewardData('two', { ...mastered, maxErrorRate: 1, minAttempts: 1 })
				])
			).not.toThrow();
		});
	});

	it('does not mutate its input and returns plain data', () => {
		const data = catalogueData([rewardData('one', PASSED)]);
		const copy = structuredClone(data);
		const catalogue = parseRewardCatalogue(data);
		expect(data).toEqual(copy);
		expect(JSON.parse(JSON.stringify(catalogue))).toEqual(catalogue);
	});
});

describe('validateRewardCatalogue', () => {
	function problemsOf(condition: unknown, extra: Record<string, unknown> = {}) {
		return validateRewardCatalogue(parseWith([rewardData('one', condition)], extra), PROGRESSION);
	}

	it('finds nothing to say about a coherent catalogue', () => {
		expect(
			validateRewardCatalogue(
				parseWith([
					rewardData('one', PASSED),
					rewardData('two', { kind: 'world-stars', worldId: WORLD_ONE, stars: 2 }),
					rewardData('three', {
						kind: 'chars-mastered',
						chars: ['f', 'S'],
						minAttempts: RULES.recentCharWindow,
						maxErrorRate: 0.1
					})
				]),
				PROGRESSION
			)
		).toEqual([]);
	});

	it('reports a lesson the progression does not have', () => {
		const problems = problemsOf({ kind: 'lesson-stars', lessonId: 'fr.lesson.ghost', stars: 1 });
		expect(problems).toHaveLength(1);
		expect(problems[0]).toContain('fr.reward.one');
		expect(problems[0]).toContain('unknown lesson "fr.lesson.ghost"');
	});

	it('reports a world the progression does not have', () => {
		expect(problemsOf({ kind: 'world-passed', worldId: 'fr.world.ghost' })[0]).toContain(
			'unknown world "fr.world.ghost"'
		);
	});

	it('reports another progression', () => {
		const problems = problemsOf(PASSED, { progressionId: 'fr.progression.other' });
		expect(problems).toHaveLength(1);
		expect(problems[0]).toContain('fr.progression.other');
	});

	it('reports a character the progression never teaches', () => {
		const problems = problemsOf({
			kind: 'chars-mastered',
			chars: ['f', 'z'],
			minAttempts: 5,
			maxErrorRate: 0.2
		});
		expect(problems).toHaveLength(1);
		expect(problems[0]).toContain('character "z"');
	});

	it('counts a capital as taught once the progression unlocks capitals', () => {
		expect(
			problemsOf({ kind: 'chars-mastered', chars: ['F'], minAttempts: 5, maxErrorRate: 0.2 })
		).toEqual([]);
	});

	it('does not count a capital when the progression never unlocks capitals', () => {
		const lessons = PROGRESSION.worlds.flatMap((world) => world.lessons);
		const withoutCapitals = parseProgression({
			...PROGRESSION,
			worlds: [
				{
					...PROGRESSION.worlds[0],
					lessons: lessons.map((lesson) => ({ ...lesson, unlocks: [] }))
				}
			]
		});
		const catalogue = parseWith([
			rewardData('one', { kind: 'chars-mastered', chars: ['F'], minAttempts: 5, maxErrorRate: 0.2 })
		]);
		expect(validateRewardCatalogue(catalogue, withoutCapitals)[0]).toContain('character "F"');
	});

	it('reports a minimum of attempts the recent results can never reach', () => {
		const problems = problemsOf({
			kind: 'chars-mastered',
			chars: ['f'],
			minAttempts: RULES.recentCharWindow + 1,
			maxErrorRate: 0.1
		});
		expect(problems).toHaveLength(1);
		expect(problems[0]).toContain('recentCharWindow');
	});

	it('lists every problem, each with the reward it belongs to', () => {
		const catalogue = parseWith([
			rewardData('one', { kind: 'lesson-passed', lessonId: 'fr.lesson.ghost' }),
			rewardData('two', PASSED),
			rewardData('three', { kind: 'world-passed', worldId: 'fr.world.ghost' })
		]);
		const problems = validateRewardCatalogue(catalogue, PROGRESSION);
		expect(problems).toHaveLength(2);
		expect(problems[0]).toContain('rewards[0]');
		expect(problems[1]).toContain('rewards[2]');
	});
});
