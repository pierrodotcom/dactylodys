/*
 * Where the drawings of the companion go (lot R2). Coordinates are those of the companion, a
 * 120 × 120 view box; a hand item is drawn around its grip, the point (0, 0) held in the hand.
 */
import type { RewardDefinition } from '$lib/engine/rewards/types';
import type { Frame } from './geometry';

/** Slots in drawing order: the back behind the body, then body, neck, feet, face, head, hand. */
export const ITEM_SLOTS = ['back', 'body', 'neck', 'feet', 'face', 'head', 'hand'] as const;
export type ItemSlot = (typeof ITEM_SLOTS)[number];

/**
 * `back`: drawn behind the body (a backpack, a cape, the far side of a ring); `front`: the rest;
 * `sleeve`: drawn on each arm, along it (`ItemArt.sleeves`).
 */
export type ItemLayer = 'back' | 'front' | 'sleeve';

export interface ItemArt {
	readonly slot: ItemSlot;
	/** What the drawing covers, to show it alone (`RewardPicture`). */
	readonly frame: Frame;
	/** Layers shown when the item is drawn alone; by default both. */
	readonly pictureLayers?: readonly ItemLayer[];
	/**
	 * Worn, it also covers the arms (`sleeve` layer), drawn in the frame of each arm: the grip at
	 * (0, 0), the arm along -y from it, whatever the pose.
	 */
	readonly sleeves?: boolean;
}

/** Layers of an item drawn alone: its sleeves are then drawn in its `front` layer. */
export const ITEM_LAYERS: readonly ItemLayer[] = ['back', 'front'];

/** One drawing per `artId` of an item of the catalogue; the slot repeats the catalogue's (tested). */
export const ITEM_ARTS: Readonly<Record<string, ItemArt>> = {
	'egg-necklace': { slot: 'neck', frame: [38, 71, 44, 31] },
	springs: { slot: 'feet', frame: [31, 102, 58, 26] },
	'nest-backpack': { slot: 'back', frame: [-4, 36, 59, 43], pictureLayers: ['back'] },
	'rain-boots': { slot: 'feet', frame: [25, 89, 70, 28] },
	magnifier: { slot: 'hand', frame: [-27, -32, 37, 44] },
	crown: { slot: 'head', frame: [33, 0, 54, 33] },
	'chef-hat': { slot: 'head', frame: [26, -2, 68, 36] },
	'cream-moustache': { slot: 'face', frame: [30, 46, 60, 20] },
	'checked-apron': { slot: 'body', frame: [27, 56, 66, 53] },
	'ladle-mic': { slot: 'hand', frame: [-28, -33, 40, 48] },
	'chili-nose': { slot: 'face', frame: [52, 40, 23, 30] },
	'giraffe-bow-tie': { slot: 'neck', frame: [37, 72, 46, 20] },
	'ball-shoes': { slot: 'feet', frame: [29, 101, 62, 19] },
	'yak-beanie': { slot: 'head', frame: [28, -2, 64, 39] },
	'striped-sweater': { slot: 'body', frame: [11, 54, 98, 53], sleeves: true },
	'star-glasses': { slot: 'face', frame: [29, 29, 62, 32] },
	'comet-cape': { slot: 'back', frame: [0, 44, 98, 71] },
	'astronaut-helmet': { slot: 'head', frame: [14, 2, 92, 87] },
	'ring-float': { slot: 'body', frame: [10, 75, 100, 33] },
	'bulb-horn': { slot: 'hand', frame: [-30, -36, 46, 55] },
	'train-cap': { slot: 'head', frame: [28, 1, 64, 36] },
	'aviator-goggles': { slot: 'face', frame: [29, 32, 62, 28] },
	'pilot-scarf': { slot: 'neck', frame: [34, 65, 82, 46] },
	'roller-skates': { slot: 'feet', frame: [26, 90, 68, 34] }
};

/** The worn items by slot, in drawing order: the first one of a slot wins, unknown drawings are left out. */
export function wornBySlot(artIds: readonly string[]): Partial<Record<ItemSlot, string>> {
	const worn: Partial<Record<ItemSlot, string>> = {};
	for (const artId of artIds) {
		const art = ITEM_ARTS[artId];
		if (art !== undefined && worn[art.slot] === undefined) worn[art.slot] = artId;
	}
	return worn;
}

export type ArmPose = 'down' | 'up' | 'ground';

export interface Ellipse {
	readonly cx: number;
	readonly cy: number;
	readonly rx: number;
	readonly ry: number;
}

export interface Point {
	readonly x: number;
	readonly y: number;
}

/** Both arms of each pose, and where the left hand holds a hand item. */
export const ARM_POSES: Readonly<Record<ArmPose, { arms: readonly Ellipse[]; grip: Point }>> = {
	down: {
		arms: [
			{ cx: 27, cy: 82, rx: 6, ry: 10 },
			{ cx: 93, cy: 82, rx: 6, ry: 10 }
		],
		grip: { x: 27, y: 89 }
	},
	up: {
		arms: [
			{ cx: 24, cy: 54, rx: 6, ry: 10 },
			{ cx: 96, cy: 54, rx: 6, ry: 10 }
		],
		grip: { x: 24, y: 47 }
	},
	/** Stretched above the head: upside down, the hands reach the ground (handstand). */
	ground: {
		arms: [
			{ cx: 26, cy: 26, rx: 6, ry: 18 },
			{ cx: 94, cy: 26, rx: 6, ry: 18 }
		],
		grip: { x: 26, y: 11 }
	}
};

/** The arms of a trick, when they are not those of the mood (`skill` `artId`). */
export const TRICK_ARMS: Readonly<Record<string, ArmPose>> = {
	juggle: 'up',
	handstand: 'ground',
	cartwheel: 'up'
};

/** Every trick the companion can play (`skill` `artId`). */
export const TRICKS = ['roar', 'juggle', 'handstand', 'float', 'cartwheel'] as const;

export type TrophyArt =
	| { readonly kind: 'medal'; readonly world: 'dinosaurs' | 'kitchen' | 'zoo' | 'stars' | 'racing' }
	| {
			readonly kind: 'key';
			readonly sign: 'top-row' | 'home-row' | 'bottom-row' | 'accents' | 'punctuation';
	  };

/** One drawing per `artId` of a trophy: a medal with the symbol of its world, or a key. */
export const TROPHY_ARTS: Readonly<Record<string, TrophyArt>> = {
	'medal-dinosaurs': { kind: 'medal', world: 'dinosaurs' },
	'medal-kitchen': { kind: 'medal', world: 'kitchen' },
	'medal-zoo': { kind: 'medal', world: 'zoo' },
	'medal-stars': { kind: 'medal', world: 'stars' },
	'medal-racing': { kind: 'medal', world: 'racing' },
	'keys-home-row': { kind: 'key', sign: 'home-row' },
	'keys-top-row': { kind: 'key', sign: 'top-row' },
	'keys-bottom-row': { kind: 'key', sign: 'bottom-row' },
	'keys-accents': { kind: 'key', sign: 'accents' },
	'keys-punctuation': { kind: 'key', sign: 'punctuation' }
};

/** How many keys a trophy of a row shows, so that the three rows differ at a glance. */
export const TROPHY_KEY_COUNT = 3;

/**
 * The keys a trophy of keys shows, as written on the keycaps: the first characters of its
 * condition. The letters of a row are in capitals of the language of the reward (its id is
 * `<language>.reward.<slug>`), as on a keyboard; accents and punctuation stay as they are typed.
 * Read from the catalogue, so that no layout is assumed in a drawing.
 */
export function trophyKeys(reward: RewardDefinition): readonly string[] {
	if (reward.condition.kind !== 'chars-mastered') return [];
	const locale = reward.id.split('.')[0];
	const art = TROPHY_ARTS[reward.artId];
	const capitals = art?.kind === 'key' && art.sign.endsWith('-row');
	return reward.condition.chars
		.slice(0, TROPHY_KEY_COUNT)
		.map((char) => (capitals ? char.toLocaleUpperCase(locale) : char));
}
