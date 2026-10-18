import { isLessonPassed } from '../progression/progress';
import type { ProgressionDefinition, ProgressState } from '../progression/types';
import type { StoryDefinition, StoryLessonLine, StoryMoment, StoryWorld } from './types';

interface Place {
	/** Every lesson of the world, from the progression. */
	readonly lessonIds: readonly string[];
	readonly told: StoryWorld;
}

/** The world of a lesson in the progression and in the story, or `undefined` when either lacks it. */
function placeOf(
	story: StoryDefinition,
	progression: ProgressionDefinition,
	lessonId: string
): Place | undefined {
	const world = progression.worlds.find((candidate) =>
		candidate.lessons.some((lesson) => lesson.id === lessonId)
	);
	if (world === undefined) return undefined;
	const told = story.worlds.find((candidate) => candidate.worldId === world.id);
	if (told === undefined) return undefined;
	return { lessonIds: world.lessons.map((lesson) => lesson.id), told };
}

function openingOf(world: StoryWorld): StoryMoment {
	return {
		kind: 'opening',
		text: world.opening,
		art: world.openingArt,
		worldId: world.worldId,
		lessonId: null
	};
}

function lineOf(world: StoryWorld, told: StoryLessonLine): StoryMoment {
	return {
		kind: 'line',
		text: told.line,
		art: told.art,
		worldId: world.worldId,
		lessonId: told.lessonId
	};
}

function endingOf(world: StoryWorld): StoryMoment {
	return {
		kind: 'ending',
		text: world.ending,
		art: world.endingArt,
		worldId: world.worldId,
		lessonId: null
	};
}

function hasPlayed(progress: ProgressState, lessonId: string): boolean {
	return Object.hasOwn(progress.lessons, lessonId);
}

/** The opening of the world of the lesson, while no lesson of this world has been played. */
export function storyBeforeLesson(
	story: StoryDefinition,
	progression: ProgressionDefinition,
	progress: ProgressState,
	lessonId: string
): readonly StoryMoment[] {
	const place = placeOf(story, progression, lessonId);
	if (place === undefined) return [];
	if (place.lessonIds.some((id) => hasPlayed(progress, id))) return [];
	return [openingOf(place.told)];
}

/**
 * The line of the lesson when it has just been passed for the first time, then the ending of its
 * world when this play passed the last lesson left. A lesson that the story does not tell, or an
 * unknown lesson, tells nothing.
 */
export function storyAfterLesson(
	story: StoryDefinition,
	progression: ProgressionDefinition,
	before: ProgressState,
	after: ProgressState,
	lessonId: string
): readonly StoryMoment[] {
	const place = placeOf(story, progression, lessonId);
	if (place === undefined) return [];
	const told = place.told.lessons.find((candidate) => candidate.lessonId === lessonId);
	if (told === undefined) return [];

	const { rules } = progression;
	const moments: StoryMoment[] = [];
	if (!isLessonPassed(rules, before, lessonId) && isLessonPassed(rules, after, lessonId)) {
		moments.push(lineOf(place.told, told));
	}
	const passedAll = (progress: ProgressState) =>
		place.lessonIds.every((id) => isLessonPassed(rules, progress, id));
	if (passedAll(after) && !passedAll(before)) {
		moments.push(endingOf(place.told));
	}
	return moments;
}

/**
 * Every moment the child has already won, in the order of the progression: the opening of each
 * world one of whose lessons was played, the line of each passed lesson, the ending of each world
 * whose lessons are all passed. Deduced from the progress alone, so a child who passed lessons
 * before the story existed finds them told.
 */
export function storySoFar(
	story: StoryDefinition,
	progression: ProgressionDefinition,
	progress: ProgressState
): readonly StoryMoment[] {
	const { rules } = progression;
	const moments: StoryMoment[] = [];
	for (const world of progression.worlds) {
		const told = story.worlds.find((candidate) => candidate.worldId === world.id);
		if (told === undefined) continue;
		const lessonIds = world.lessons.map((lesson) => lesson.id);
		if (!lessonIds.some((id) => hasPlayed(progress, id))) continue;
		moments.push(openingOf(told));
		for (const id of lessonIds) {
			const line = told.lessons.find((candidate) => candidate.lessonId === id);
			if (line !== undefined && isLessonPassed(rules, progress, id)) {
				moments.push(lineOf(told, line));
			}
		}
		if (lessonIds.every((id) => isLessonPassed(rules, progress, id))) moments.push(endingOf(told));
	}
	return moments;
}
