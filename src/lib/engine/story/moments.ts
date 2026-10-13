import { isLessonPassed } from '../progression/progress';
import type { ProgressionDefinition, ProgressState } from '../progression/types';
import type { StoryDefinition, StoryMoment, StoryWorld } from './types';

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
	return [{ kind: 'opening', text: place.told.opening }];
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
		moments.push({ kind: 'line', text: told.line });
	}
	const passedAll = (progress: ProgressState) =>
		place.lessonIds.every((id) => isLessonPassed(rules, progress, id));
	if (passedAll(after) && !passedAll(before)) {
		moments.push({ kind: 'ending', text: place.told.ending });
	}
	return moments;
}
