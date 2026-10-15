import { isLessonPassed } from '../progression/progress';
import type { ProgressionDefinition, ProgressState } from '../progression/types';

/**
 * The surprise scenes of the games (ADR-032): each game has its own, in a fixed order, and a new
 * one joins every `unlockEveryLessons` lessons passed. Like every reward, they follow mastery
 * only, and they are computed from the progress, never stored.
 */
export interface SceneSchedule {
	readonly schemaVersion: 1;
	readonly unlockEveryLessons: number;
	/** Scene identifiers of each game, in the order they are unlocked. */
	readonly games: Readonly<Record<string, readonly string[]>>;
}

/** What a game shows when a group is typed: one of its scenes, or one of the common entrances (0 to 3). */
export type SceneChoice =
	| { readonly kind: 'scene'; readonly id: string }
	| { readonly kind: 'variant'; readonly index: number };

/** The common entrances every game has, from the start: `data-reward-variant` 0 to 3. */
export const COMMON_VARIANTS = 4;

const SCENE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function fail(path: string, message: string): never {
	throw new Error(`${path}: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseSceneSchedule(data: unknown): SceneSchedule {
	if (!isRecord(data)) fail('scenes', 'expected an object');
	for (const name of Object.keys(data)) {
		if (!['schemaVersion', 'unlockEveryLessons', 'games'].includes(name)) {
			fail(`scenes.${name}`, 'unknown property');
		}
	}
	if (data['schemaVersion'] !== 1) fail('scenes.schemaVersion', 'expected 1');
	const every = data['unlockEveryLessons'];
	if (typeof every !== 'number' || !Number.isSafeInteger(every) || every < 1) {
		fail('scenes.unlockEveryLessons', 'expected an integer of at least 1');
	}
	const games = data['games'];
	if (!isRecord(games)) fail('scenes.games', 'expected an object');
	const parsed: Record<string, readonly string[]> = {};
	for (const [gameId, scenes] of Object.entries(games)) {
		const path = `scenes.games.${gameId}`;
		if (!Array.isArray(scenes)) fail(path, 'expected an array');
		scenes.forEach((scene: unknown, index) => {
			if (typeof scene !== 'string' || !SCENE_ID_PATTERN.test(scene)) {
				fail(`${path}[${index}]`, 'expected a slug');
			}
			if (scenes.indexOf(scene) !== index) fail(`${path}[${index}]`, `duplicate scene "${scene}"`);
		});
		parsed[gameId] = scenes as string[];
	}
	return { schemaVersion: 1, unlockEveryLessons: every, games: parsed };
}

/** How many lessons of the progression the child has passed. */
export function passedLessonCount(
	progression: ProgressionDefinition,
	progress: ProgressState
): number {
	return progression.worlds
		.flatMap((world) => world.lessons)
		.filter((lesson) => isLessonPassed(progression.rules, progress, lesson.id)).length;
}

/** The scenes of a game the child has unlocked, in their order; none for an unknown game. */
export function unlockedScenes(
	schedule: SceneSchedule,
	gameId: string,
	passedLessons: number
): readonly string[] {
	const scenes = Object.hasOwn(schedule.games, gameId) ? (schedule.games[gameId] ?? []) : [];
	const count = Math.floor(Math.max(0, passedLessons) / schedule.unlockEveryLessons);
	return scenes.slice(0, count);
}

/**
 * What the group `groupIndex` shows: the unlocked scenes first, then the common entrances, and
 * round again, so that the newest surprises come early in every exercise. Nothing at random.
 */
export function sceneForGroup(unlocked: readonly string[], groupIndex: number): SceneChoice {
	const cycle = unlocked.length + COMMON_VARIANTS;
	const place = ((groupIndex % cycle) + cycle) % cycle;
	const id = unlocked[place];
	return id !== undefined
		? { kind: 'scene', id }
		: { kind: 'variant', index: place - unlocked.length };
}
