/*
 * Where the drawings of the companion go (lot R2). Coordinates are those of the companion, a
 * 120 × 120 view box; a hand item is drawn around its grip, the point (0, 0) held in the hand.
 */
import type { Frame } from './geometry';

/** Slots in drawing order: the back behind the body, then body, neck, feet, face, head, hand. */
export const ITEM_SLOTS = ['back', 'body', 'neck', 'feet', 'face', 'head', 'hand'] as const;
export type ItemSlot = (typeof ITEM_SLOTS)[number];

/** `back`: drawn behind the body (a backpack, a cape, the far side of a ring); `front`: the rest. */
export type ItemLayer = 'back' | 'front';

export interface ItemArt {
	readonly slot: ItemSlot;
	/** What the drawing covers, to show it alone (`RewardPicture`). */
	readonly frame: Frame;
	/** Layers shown when the item is drawn alone; by default both. */
	readonly pictureLayers?: readonly ItemLayer[];
}

export const ITEM_LAYERS: readonly ItemLayer[] = ['back', 'front'];

/** One drawing per `artId` of an item of the catalogue; the slot repeats the catalogue's (tested). */
export const ITEM_ARTS: Readonly<Record<string, ItemArt>> = {
	'egg-necklace': { slot: 'neck', frame: [38, 68, 44, 20] },
	springs: { slot: 'feet', frame: [32, 100, 56, 20] },
	'nest-backpack': { slot: 'back', frame: [4, 37, 40, 34], pictureLayers: ['back'] },
	'rain-boots': { slot: 'feet', frame: [26, 92, 68, 24] },
	magnifier: { slot: 'hand', frame: [-24, -30, 28, 33] },
	crown: { slot: 'head', frame: [34, 1, 52, 28] },
	'chef-hat': { slot: 'head', frame: [26, 0, 68, 34] },
	'cream-moustache': { slot: 'face', frame: [34, 45, 52, 19] },
	'checked-apron': { slot: 'body', frame: [33, 72, 54, 34] },
	'ladle-mic': { slot: 'hand', frame: [-22, -30, 25, 33] },
	'chili-nose': { slot: 'face', frame: [52, 41, 20, 28] },
	'giraffe-bow-tie': { slot: 'neck', frame: [44, 71, 32, 20] },
	'ball-shoes': { slot: 'feet', frame: [30, 98, 60, 18] },
	'yak-beanie': { slot: 'head', frame: [27, 0, 66, 40] },
	'striped-sweater': { slot: 'body', frame: [19, 58, 82, 46] },
	'star-glasses': { slot: 'face', frame: [30, 33, 60, 26] },
	'comet-cape': { slot: 'back', frame: [0, 60, 90, 54] },
	'astronaut-helmet': { slot: 'head', frame: [16, 7, 88, 79] },
	'ring-float': { slot: 'body', frame: [12, 76, 96, 28] },
	'bulb-horn': { slot: 'hand', frame: [-25, -30, 33, 38] },
	'train-cap': { slot: 'head', frame: [28, 6, 64, 34] },
	'aviator-goggles': { slot: 'face', frame: [30, 33, 60, 26] },
	'pilot-scarf': { slot: 'neck', frame: [34, 70, 52, 36] },
	'roller-skates': { slot: 'feet', frame: [28, 98, 64, 22] }
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
