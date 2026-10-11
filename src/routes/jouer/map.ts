import { lessonIds } from '$lib/engine/progression/definition';
import { isLessonUnlocked } from '$lib/engine/progression/progress';
import type {
	ProgressionDefinition,
	ProgressState,
	StarCount
} from '$lib/engine/progression/types';

/** `done`: passed at least once. `current`: open, to play. `locked`: the lesson before is not passed. */
export type LessonStatus = 'done' | 'current' | 'locked';

/** Absorbs the rounding error of an accuracy computed as a ratio, as the engine does. */
const ACCURACY_EPSILON = 1e-9;

function progressOf(progress: ProgressState, lessonId: string) {
	return Object.hasOwn(progress.lessons, lessonId) ? progress.lessons[lessonId] : undefined;
}

export function lessonStatus(
	progression: ProgressionDefinition,
	progress: ProgressState,
	lessonId: string
): LessonStatus {
	if (!isLessonUnlocked(progression, progress, lessonId)) return 'locked';
	const best = progressOf(progress, lessonId)?.bestAccuracy;
	const passed = best !== undefined && best + ACCURACY_EPSILON >= progression.rules.unlockAccuracy;
	return passed ? 'done' : 'current';
}

export function lessonStars(progress: ProgressState, lessonId: string): StarCount {
	return progressOf(progress, lessonId)?.stars ?? 0;
}

export function nextLessonId(progression: ProgressionDefinition, lessonId: string): string | null {
	const ids = lessonIds(progression);
	const index = ids.indexOf(lessonId);
	return index < 0 ? null : (ids[index + 1] ?? null);
}
