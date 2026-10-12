import { lessonIds } from '$lib/engine/progression/definition';
import { isLessonUnlocked } from '$lib/engine/progression/progress';
import type {
	ProgressionDefinition,
	ProgressState,
	StarCount,
	WorldDefinition
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

export function worldOfLesson(
	progression: ProgressionDefinition,
	lessonId: string
): WorldDefinition | undefined {
	return progression.worlds.find((world) => world.lessons.some((lesson) => lesson.id === lessonId));
}

/** The most advanced lesson the child can play: the last open one, in the order of the progression. */
export function focusLessonId(
	progression: ProgressionDefinition,
	progress: ProgressState
): string | null {
	const open = lessonIds(progression).filter(
		(id) => lessonStatus(progression, progress, id) !== 'locked'
	);
	return open.at(-1) ?? null;
}

export interface MapLesson {
	readonly id: string;
	readonly title: string;
	/** Rank in the whole progression, from 1. */
	readonly number: number;
	readonly status: LessonStatus;
	readonly stars: StarCount;
	/** Which side of the path the lesson sits on; they alternate along the whole path. */
	readonly side: 0 | 1;
}

export interface MapWorld {
	readonly id: string;
	readonly title: string;
	/** The world of the most advanced open lesson. */
	readonly current: boolean;
	readonly lessons: readonly MapLesson[];
}

export interface WorldMapLayout {
	readonly worlds: readonly MapWorld[];
	/** The lesson the page scrolls to. */
	readonly focusId: string | null;
}

/** Every world one after the other, locked lessons included, the current world and lesson marked. */
export function layoutMap(
	progression: ProgressionDefinition,
	progress: ProgressState
): WorldMapLayout {
	const focusId = focusLessonId(progression, progress);
	let number = 0;
	const worlds = progression.worlds.map((world): MapWorld => {
		const lessons = world.lessons.map((lesson): MapLesson => {
			number += 1;
			return {
				id: lesson.id,
				title: lesson.title,
				number,
				status: lessonStatus(progression, progress, lesson.id),
				stars: lessonStars(progress, lesson.id),
				side: number % 2 === 0 ? 1 : 0
			};
		});
		return {
			id: world.id,
			title: world.title,
			current: focusId !== null && world.lessons.some((lesson) => lesson.id === focusId),
			lessons
		};
	});
	return { worlds, focusId };
}
