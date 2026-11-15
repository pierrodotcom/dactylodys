import type { ErrorPolicy } from '../types';
import type {
	ErrorPolicyPreference,
	ProgressionDefinition,
	ProgressState,
	WorldDefinition
} from './types';

/** The world a lesson belongs to. */
function worldOf(
	progression: ProgressionDefinition,
	lessonId: string
): WorldDefinition | undefined {
	return progression.worlds.find((world) => world.lessons.some((lesson) => lesson.id === lessonId));
}

/**
 * How a mistake is handled in a play of this lesson (ADR-075, choice 5): what the adult chose, or,
 * when the adult lets the world decide, what the world of the lesson says; the game waits for the
 * right key in a world that says nothing, and outside the lessons (`lessonId` absent or unknown).
 */
export function errorPolicyFor(
	preference: ErrorPolicyPreference,
	progression: ProgressionDefinition,
	lessonId?: string
): ErrorPolicy {
	if (preference !== 'world') return preference;
	const world = lessonId === undefined ? undefined : worldOf(progression, lessonId);
	return world?.errorPolicy ?? 'retry';
}

/**
 * The child is about to meet Backspace because of the world, and has not finished a play in a
 * lesson of this world yet: the moment to say, once, that here a mistake is erased. Never when the
 * adult chose for every world: nothing changes then from one world to the next.
 */
export function isErasingNew(
	preference: ErrorPolicyPreference,
	progression: ProgressionDefinition,
	progress: ProgressState,
	lessonId: string
): boolean {
	if (preference !== 'world') return false;
	const world = worldOf(progression, lessonId);
	if (world?.errorPolicy !== 'backspace') return false;
	return world.lessons.every(
		(lesson) =>
			!Object.hasOwn(progress.lessons, lesson.id) || progress.lessons[lesson.id]?.attempts === 0
	);
}
