/**
 * The two states of a story picture (ADR-057, proposal 19): what the sentence starts from
 * (`before`), then what changed (`after`), drawn from the same drawing.
 */
export type StoryPhase = 'before' | 'after';

export type StoryPictureSize = 'large' | 'small';

/**
 * The states drawn, the first under the others. On the screen of the story, the picture shows
 * `before`, then fades to `after`. A page of the notebook among others, or calm motion: `after`
 * alone, still. The fade does not follow the light effects: it tells the story.
 */
export function storyPhases(size: StoryPictureSize, still: boolean): readonly StoryPhase[] {
	return size === 'large' && !still ? ['before', 'after'] : ['after'];
}

/** The subset of `Element` that `isMotionReduced` reads, so it can be tested without a DOM. */
export interface MotionRoot {
	getAttribute(name: string): string | null;
}

/**
 * Whether motion is reduced, as the style sheet decides it (`app.css`): `data-motion` on the root
 * wins, and when it is absent, the system setting.
 */
export function isMotionReduced(root: MotionRoot, systemPrefersReduced: boolean): boolean {
	const motion = root.getAttribute('data-motion');
	return motion === 'reduced' || (motion !== 'full' && systemPrefersReduced);
}
