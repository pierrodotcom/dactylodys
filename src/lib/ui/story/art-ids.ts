/**
 * The pictures of the story (lot S2, ADR-042), by drawing file: a story text names its picture
 * (`StoryMoment.art`), and each file of `art/` draws the pictures of its list. A picture added to
 * the story = its name in the data, here, and its drawing; a test checks that they match.
 */
export const STORY_ART_GROUPS = {
	dinosaurs: [
		'dino-opening',
		'dino-eggs',
		'dino-diplodocus',
		'dino-nest',
		'dino-pond',
		'dino-raptor',
		'dino-trex',
		'dino-ending'
	],
	kitchen: [
		'kitchen-opening',
		'kitchen-toast',
		'kitchen-cake',
		'kitchen-quiche',
		'kitchen-pan',
		'kitchen-spices',
		'kitchen-ending'
	],
	zoo: ['zoo-opening', 'zoo-giraffe', 'zoo-cow', 'zoo-yak', 'zoo-zebra', 'zoo-ending'],
	space: [
		'space-opening',
		'space-moon',
		'space-comet',
		'space-giants',
		'space-comma',
		'space-ending'
	],
	circuit: [
		'circuit-opening',
		'circuit-horn',
		'circuit-train',
		'circuit-hat',
		'circuit-helmet',
		'circuit-truck',
		'circuit-ending'
	]
} as const satisfies Readonly<Record<string, readonly string[]>>;

export type StoryArtGroup = keyof typeof STORY_ART_GROUPS;

export const STORY_ART_IDS: readonly string[] = Object.values(STORY_ART_GROUPS).flat();

/** The drawing file of a picture, or `undefined` when no file draws it. */
export function storyArtGroup(art: string): StoryArtGroup | undefined {
	return (Object.keys(STORY_ART_GROUPS) as StoryArtGroup[]).find((group) =>
		(STORY_ART_GROUPS[group] as readonly string[]).includes(art)
	);
}

/**
 * Size of every story picture, in drawing units: a landscape page of the travel notebook. The
 * frame (paper, rounded corners, border) is drawn around each picture by `StoryPicture`.
 */
export const STORY_ART_WIDTH = 160;
export const STORY_ART_HEIGHT = 100;
