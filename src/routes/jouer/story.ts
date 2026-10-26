import type { ProgressionDefinition } from '$lib/engine/progression/types';
import { parseStory, type StoryDefinition, type StoryMoment } from '$lib/engine/story';
import storyData from '../../../content/fr/story/azerty-decouverte.json';

/** The story of the shipped progression (ADR-042): data, never sentences in the code. */
export const STORY: StoryDefinition = parseStory(storyData);

/** The story written for this progression, or `undefined` when there is none. */
export function storyFor(progression: ProgressionDefinition): StoryDefinition | undefined {
	return STORY.progressionId === progression.id ? STORY : undefined;
}

/** Every moment of the story in the order a child meets them, world after world. */
export function wholeStory(story: StoryDefinition): readonly StoryMoment[] {
	return story.worlds.flatMap((world): StoryMoment[] => [
		{
			kind: 'opening',
			text: world.opening,
			art: world.openingArt,
			worldId: world.worldId,
			lessonId: null
		},
		...world.lessons.map((told): StoryMoment => ({
			kind: 'line',
			text: told.line,
			art: told.art,
			worldId: world.worldId,
			lessonId: told.lessonId
		})),
		{
			kind: 'ending',
			text: world.ending,
			art: world.endingArt,
			worldId: world.worldId,
			lessonId: null
		}
	]);
}

/** The moments not told yet during this visit, by picture: each picture is one moment. */
export function notYetTold(
	moments: readonly StoryMoment[],
	told: ReadonlySet<string>
): readonly StoryMoment[] {
	return moments.filter((moment) => !told.has(moment.art));
}
