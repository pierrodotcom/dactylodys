/*
 * Contract of the story (J4, ADR-022). Types only; the functions live next to this file:
 *
 *   parseStory(data: unknown): StoryDefinition                                  (definition.ts)
 *   validateStory(story, progression): string[]                                 (definition.ts)
 *   storyBeforeLesson(story, progression, progress, lessonId): StoryMoment[]    (moments.ts)
 *   storyAfterLesson(story, progression, before, after, lessonId): StoryMoment[] (moments.ts)
 *
 * The story moves on because the child types, and for no other reason. Which text to show is
 * therefore deduced from the progress before and after a play: no "already seen" flag is stored,
 * so a profile older than the story, or one that lost nothing but its settings, tells the same
 * story.
 *
 * Texts are shown between two exercises, never while typing: the opening of a world before its
 * first lesson is played, the line of a lesson (then the ending of its world, when it was the
 * last one) after the lesson is passed.
 */

export interface StoryLessonLine {
	readonly lessonId: string;
	/** One sentence told when the lesson is passed. */
	readonly line: string;
}

export interface StoryWorld {
	readonly worldId: string;
	/** Told when the child enters the world. */
	readonly opening: string;
	/** Told once every lesson of the world is passed. */
	readonly ending: string;
	readonly lessons: readonly StoryLessonLine[];
}

export interface StoryDefinition {
	readonly schemaVersion: 1;
	/** `<language>.story.<slug>`. */
	readonly id: string;
	readonly locale: string;
	/** The progression whose worlds and lessons the story follows. */
	readonly progressionId: string;
	readonly worlds: readonly StoryWorld[];
}

export interface StoryMoment {
	readonly kind: 'opening' | 'line' | 'ending';
	readonly text: string;
}
