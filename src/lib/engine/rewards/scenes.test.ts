import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GAMES } from '../../games/registry';
import { lessonIds, parseProgression } from '../progression/definition';
import { emptyProgress } from '../progression/progress';
import {
	COMMON_VARIANTS,
	parseSceneSchedule,
	passedLessonCount,
	sceneForGroup,
	unlockedScenes
} from './scenes';
import { playLesson } from './test-support';

const SHIPPED = parseSceneSchedule(
	JSON.parse(readFileSync('content/common/scenes.json', 'utf8')) as unknown
);
const SCHEDULE = parseSceneSchedule({
	schemaVersion: 1,
	unlockEveryLessons: 2,
	games: { hatching: ['a', 'b', 'c'] }
});

describe('parseSceneSchedule', () => {
	it('gives scenes to every game of the registry, and to no other', () => {
		expect(Object.keys(SHIPPED.games).sort()).toEqual(GAMES.map((game) => game.id).sort());
		for (const scenes of Object.values(SHIPPED.games)) expect(scenes.length).toBeGreaterThan(0);
	});

	it.each([
		['a non-object', 'scenes'],
		['an unknown property', { schemaVersion: 1, unlockEveryLessons: 2, games: {}, extra: 1 }],
		['a wrong version', { schemaVersion: 2, unlockEveryLessons: 2, games: {} }],
		['no lesson between two scenes', { schemaVersion: 1, unlockEveryLessons: 0, games: {} }],
		[
			'a scene that is not a slug',
			{ schemaVersion: 1, unlockEveryLessons: 2, games: { a: ['B c'] } }
		],
		['a scene twice', { schemaVersion: 1, unlockEveryLessons: 2, games: { a: ['b', 'b'] } }]
	])('refuses %s', (_name, data) => {
		expect(() => parseSceneSchedule(data)).toThrow();
	});
});

describe('unlockedScenes', () => {
	it('adds one scene every so many lessons passed, in order, up to all of them', () => {
		const unlocked = [0, 1, 2, 3, 4, 6, 20].map((passed) =>
			unlockedScenes(SCHEDULE, 'hatching', passed)
		);
		expect(unlocked).toEqual([[], [], ['a'], ['a'], ['a', 'b'], ['a', 'b', 'c'], ['a', 'b', 'c']]);
	});

	it('gives nothing for a game without scenes', () => {
		expect(unlockedScenes(SCHEDULE, 'rocket', 20)).toEqual([]);
	});

	it('never takes back a scene when more lessons are passed', () => {
		fc.assert(
			fc.property(fc.nat(40), fc.nat(40), (passed, more) => {
				const before = unlockedScenes(SHIPPED, 'recipe', passed);
				const after = unlockedScenes(SHIPPED, 'recipe', passed + more);
				expect(after.slice(0, before.length)).toEqual(before);
			})
		);
	});
});

describe('sceneForGroup', () => {
	it('shows the common entrances only, in turn, before any scene is unlocked', () => {
		const choices = [0, 1, 2, 3, 4].map((group) => sceneForGroup([], group));
		expect(choices).toEqual([0, 1, 2, 3, 0].map((index) => ({ kind: 'variant', index })));
	});

	it('shows the unlocked scenes first, then the common entrances, and starts again', () => {
		const choices = [0, 1, 2, 3, 4, 5, 6].map((group) => sceneForGroup(['a', 'b'], group));
		expect(choices).toEqual([
			{ kind: 'scene', id: 'a' },
			{ kind: 'scene', id: 'b' },
			{ kind: 'variant', index: 0 },
			{ kind: 'variant', index: 1 },
			{ kind: 'variant', index: 2 },
			{ kind: 'variant', index: 3 },
			{ kind: 'scene', id: 'a' }
		]);
	});

	it('always gives an unlocked scene or a common entrance', () => {
		fc.assert(
			fc.property(
				fc.uniqueArray(fc.string({ minLength: 1 }), { maxLength: 6 }),
				fc.nat(500),
				(unlocked, group) => {
					const choice = sceneForGroup(unlocked, group);
					if (choice.kind === 'scene') {
						expect(unlocked).toContain(choice.id);
					} else {
						expect(choice.index).toBeGreaterThanOrEqual(0);
						expect(choice.index).toBeLessThan(COMMON_VARIANTS);
					}
				}
			)
		);
	});
});

describe('passedLessonCount', () => {
	it('counts the lessons whose accuracy opens the next one', () => {
		const progression = parseProgression(
			JSON.parse(readFileSync('content/fr/progression/azerty-decouverte.json', 'utf8')) as unknown
		);
		const [first = '', second = ''] = lessonIds(progression);
		expect(passedLessonCount(progression, emptyProgress())).toBe(0);
		const progress = playLesson(playLesson(emptyProgress(), first, 100), second, 10);
		expect(passedLessonCount(progression, progress)).toBe(1);
	});
});
