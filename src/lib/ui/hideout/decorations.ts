/*
 * How each object of the catalogue is set down in the hideout (ADR-057, proposal 18). An object
 * is the drawing of the companion's item or of the trophy, put at the scale of the cabin and on
 * what holds it there: a peg, a cord, a coat hanger, a saucer, a book, a cushion, a jar or a small
 * weight for the balloons. Coordinates are those of the drawing it comes from (the companion's
 * 120 × 120 view box, or the trophy's), measured once on the drawings.
 */
import type { Frame, XY } from '$lib/ui/companion/geometry';

/** `hang`: from a hook, a peg or a nail, the drawing below it; `stand`: on a surface, above it. */
export type Mount = 'hang' | 'stand';

/** What holds the object, drawn with it. */
export type Holder =
	/** Nothing: the peg, the hook or the nail of the place goes into it (hats, medals). */
	| 'none'
	/** A cord from the hook to each of `ties`. */
	| 'cord'
	/** A wooden coat hanger, its hook on the hook of the place. */
	| 'hanger'
	| 'saucer'
	| 'book'
	| 'cushion'
	/** A jar the handle goes into. */
	| 'jar'
	/** A little bag of sand the strings are tied to. */
	| 'weight';

export interface DecorationArt {
	readonly source: 'item' | 'trophy';
	readonly mount: Mount;
	/** What the drawing covers, in its own units, once turned (`turn`). */
	readonly frame: Frame;
	/** The point of the drawing put on the hook, or on what holds it, in its own units, once turned. */
	readonly anchor: XY;
	/** The drawing turned around its origin first, in degrees (a hand item stood upright). */
	readonly turn?: number;
	readonly holder: Holder;
	/** For a cord: where it is tied to the drawing, in its own units. */
	readonly ties?: readonly XY[];
	/** How far below the hook the anchor hangs (cord, hanger), in units of the drawing. */
	readonly drop?: number;
	/** Units of the cabin per unit of the drawing, before the object is fitted to its place. */
	readonly scale: number;
}

/** The companion stands in the cabin at about this many units per unit of its own drawing. */
const ITEM_SCALE = 0.86;
const TROPHY_SCALE = 0.4;
/** A hand item is drawn tilted by `HAND_TILT` in `CompanionItem`: turned back, it stands upright. */
const UPRIGHT = 36.87;

/** Height of what an object stands on, in units of its drawing. */
export const HOLDER_HEIGHT: Readonly<Record<Holder, number>> = {
	none: 0,
	cord: 0,
	hanger: 0,
	saucer: 4,
	book: 9,
	cushion: 9,
	jar: 22,
	weight: 7
};

function item(art: Omit<DecorationArt, 'source' | 'scale'>): DecorationArt {
	return { source: 'item', scale: ITEM_SCALE, ...art };
}

const MEDAL: DecorationArt = {
	source: 'trophy',
	mount: 'hang',
	frame: [26, -4, 66, 118],
	anchor: [59, -2],
	holder: 'none',
	scale: TROPHY_SCALE
};
const ROW_KEYS: DecorationArt = {
	source: 'trophy',
	mount: 'stand',
	frame: [3, 25, 114, 90],
	anchor: [60, 115],
	holder: 'none',
	scale: TROPHY_SCALE
};
const SIGN_KEYS: DecorationArt = { ...ROW_KEYS, frame: [8, 25, 103, 92], anchor: [60, 117] };

/** One way of setting down each object of the catalogue, by `artId` (tested). */
export const DECORATION_ARTS: Readonly<Record<string, DecorationArt>> = {
	'egg-necklace': item({
		mount: 'hang',
		frame: [39, 72, 42, 29],
		anchor: [60, 58],
		holder: 'cord',
		ties: [
			[42, 76],
			[78, 76]
		],
		drop: 0
	}),
	springs: item({ mount: 'stand', frame: [32, 103, 56, 24], anchor: [60, 127], holder: 'none' }),
	'nest-backpack': item({
		mount: 'hang',
		frame: [-3, 37, 57, 41],
		anchor: [26, 40],
		holder: 'none'
	}),
	'rain-boots': item({
		mount: 'stand',
		frame: [25, 90, 70, 26],
		anchor: [60, 116],
		holder: 'none'
	}),
	magnifier: item({
		mount: 'stand',
		frame: [-12, -37, 25, 49],
		anchor: [0, 0],
		turn: UPRIGHT,
		holder: 'jar'
	}),
	crown: item({ mount: 'stand', frame: [34, 1, 52, 33], anchor: [60, 33], holder: 'cushion' }),
	'chef-hat': item({ mount: 'hang', frame: [26, -1, 68, 34], anchor: [60, 18], holder: 'none' }),
	'cream-moustache': item({
		mount: 'stand',
		frame: [28, 47, 64, 21],
		anchor: [60, 66],
		holder: 'saucer'
	}),
	'checked-apron': item({
		mount: 'hang',
		// Without its ties, which may stick out of its place: the apron itself is what is seen.
		frame: [27, 56, 66, 53],
		anchor: [60, 58],
		holder: 'none'
	}),
	'ladle-mic': item({
		mount: 'stand',
		frame: [-11, -38, 22, 54],
		anchor: [0, 0],
		turn: UPRIGHT,
		holder: 'jar'
	}),
	'chili-nose': item({
		mount: 'stand',
		frame: [50, 41, 26, 29],
		anchor: [63, 69],
		holder: 'saucer'
	}),
	'giraffe-bow-tie': item({
		mount: 'hang',
		frame: [38, 73, 43, 18],
		anchor: [60, 62],
		holder: 'cord',
		ties: [
			[57, 78],
			[63, 78]
		],
		drop: 0
	}),
	'ball-shoes': item({
		mount: 'stand',
		frame: [28, 102, 64, 17],
		anchor: [60, 119],
		holder: 'none'
	}),
	'yak-beanie': item({ mount: 'hang', frame: [28, -1, 64, 37], anchor: [60, 20], holder: 'none' }),
	'striped-sweater': item({
		mount: 'hang',
		frame: [5, 54, 110, 54],
		anchor: [60, 56],
		holder: 'hanger',
		drop: 12
	}),
	'star-glasses': item({
		mount: 'stand',
		frame: [30, 30, 60, 30],
		anchor: [60, 60],
		holder: 'book'
	}),
	'comet-cape': item({
		mount: 'hang',
		frame: [0, 45, 96, 69],
		anchor: [56, 47],
		holder: 'hanger',
		drop: 12
	}),
	'astronaut-helmet': item({
		mount: 'stand',
		frame: [15, 3, 90, 85],
		anchor: [60, 88],
		holder: 'none'
	}),
	'ring-float': item({
		mount: 'hang',
		frame: [11, 77, 98, 31],
		anchor: [60, 92],
		holder: 'cord',
		ties: [
			[14, 90],
			[60, 79],
			[106, 90]
		],
		drop: 44
	}),
	'bulb-horn': item({
		mount: 'stand',
		frame: [-12, -36, 24, 57],
		anchor: [0, 21],
		turn: UPRIGHT,
		holder: 'none'
	}),
	'train-cap': item({ mount: 'hang', frame: [29, 2, 62, 34], anchor: [60, 20], holder: 'none' }),
	'aviator-goggles': item({
		mount: 'stand',
		frame: [30, 33, 60, 26],
		anchor: [60, 59],
		holder: 'book'
	}),
	'pilot-scarf': item({ mount: 'hang', frame: [30, 66, 86, 43], anchor: [60, 68], holder: 'none' }),
	'roller-skates': item({
		mount: 'stand',
		frame: [26, 91, 68, 31],
		anchor: [60, 122],
		holder: 'none'
	}),
	'picnic-basket': item({
		mount: 'stand',
		frame: [-16, -4, 32, 31],
		anchor: [0, 27],
		holder: 'none'
	}),
	'mail-bag': item({ mount: 'hang', frame: [37, 58, 62, 51], anchor: [40, 60], holder: 'none' }),
	'napkin-bib': item({
		mount: 'hang',
		frame: [44, 67, 39, 32],
		anchor: [62, 56],
		holder: 'cord',
		ties: [
			[47, 69],
			[80, 69]
		],
		drop: 0
	}),
	'artist-beret': item({ mount: 'hang', frame: [29, 1, 69, 30], anchor: [62, 16], holder: 'none' }),
	'reading-glasses': item({
		mount: 'stand',
		frame: [30, 46, 60, 11],
		anchor: [60, 57],
		holder: 'book'
	}),
	'party-balloons': item({
		mount: 'stand',
		frame: [84, -7, 34, 73],
		anchor: [86, 66],
		holder: 'weight'
	}),
	'referee-whistle': item({
		mount: 'hang',
		frame: [40, 72, 40, 25],
		anchor: [60, 60],
		holder: 'cord',
		ties: [
			[42, 75],
			[78, 75]
		],
		drop: 0
	}),
	'alarm-clock': item({
		mount: 'stand',
		frame: [-11, -2, 22, 25],
		anchor: [0, 23],
		holder: 'none'
	}),
	'snail-slippers': item({
		mount: 'stand',
		frame: [27, 97, 66, 19],
		anchor: [60, 116],
		holder: 'none'
	}),
	'medal-dinosaurs': MEDAL,
	'medal-kitchen': MEDAL,
	'medal-zoo': MEDAL,
	'medal-stars': MEDAL,
	'medal-racing': MEDAL,
	'medal-post': MEDAL,
	'keys-home-row': ROW_KEYS,
	'keys-top-row': ROW_KEYS,
	'keys-bottom-row': ROW_KEYS,
	'keys-accents': SIGN_KEYS,
	'keys-punctuation': SIGN_KEYS,
	'keys-digits': SIGN_KEYS
};

/** Where the anchor of the drawing goes, from the point of the place (the hook, the ground). */
export function anchorOffset(art: DecorationArt): XY {
	return art.mount === 'hang' ? [0, art.drop ?? 0] : [0, -HOLDER_HEIGHT[art.holder]];
}

/**
 * A point of the drawing (once turned), in the frame of the object: the point of its place at
 * (0, 0).
 */
export function placePoint(art: DecorationArt, point: XY): XY {
	const [dx, dy] = anchorOffset(art);
	return [point[0] - art.anchor[0] + dx, point[1] - art.anchor[1] + dy];
}

/**
 * What the object covers once set down, in its own units, the point of its place at (0, 0):
 * the drawing and what holds it.
 */
export function extentOf(art: DecorationArt): Frame {
	const [x, y, width, height] = art.frame;
	const corners = [
		placePoint(art, [x, y]),
		placePoint(art, [x + width, y]),
		placePoint(art, [x, y + height]),
		placePoint(art, [x + width, y + height]),
		[0, 0] as XY
	];
	const xs = corners.map((corner) => corner[0]);
	const ys = corners.map((corner) => corner[1]);
	const left = Math.min(...xs);
	const top = Math.min(...ys);
	return [left, top, Math.max(...xs) - left, Math.max(...ys) - top];
}

/** Units of the cabin per unit of the drawing, so that the object fits the room of its place. */
export function fitScale(art: DecorationArt, room: readonly [number, number]): number {
	const [, , width, height] = extentOf(art);
	return Math.min(art.scale, room[0] / width, room[1] / height);
}
