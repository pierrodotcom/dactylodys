/*
 * Contract of the story (J4, ADR-022). Types only: the functions below are written by the
 * "story" work package, in this folder, against these types.
 *
 *   parseStory(data: unknown): StoryDefinition
 *   storyMoment(story, progression, before: ProgressState | null, after: ProgressState,
 *               lessonId: string): readonly StoryMoment[]
 *
 * The story moves on because the child types, and for no other reason. Which text to show is
 * therefore deduced from the progress before and after a play (`before` is `null` when there is
 * no earlier state to compare with): no "already seen" flag is stored, so a profile older than
 * the story, or one that lost nothing but its settings, tells the same story.
 *
 * Texts are shown between two exercises, never while typing.
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
