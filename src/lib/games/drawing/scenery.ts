/**
 * Drawing data of the desk around the drawing: the sheet, the pencils and the visitors of the
 * surprise scenes. Lit from the top left, like the drawings; every path is absolute.
 */
import { roundedStarPath } from '$lib/ui/companion/geometry';
import { ellipsePath as oval, shiftPath } from './geometry';

export const SCENE = { width: 520, height: 240 } as const;

/** The sheet of paper, in scene units. The visitors hide behind its left edge. */
export const PAPER = { x: 110, y: 8, width: 300, height: 224, radius: 6 } as const;

/** Where the 200 x 200 box of the drawing sits on the sheet, below the strip of the bubble. */
export const PICTURE_PLACE = 'translate(170 44) scale(0.9)';

/** The centre of the drawing box, where the pencil is until it has been measured. */
export const BOX_CENTER = { x: 100, y: 100 } as const;

export type Paint =
	| 'pencil-body'
	| 'pencil-wood'
	| 'ink'
	| 'metal'
	| 'rubber'
	| 'gold'
	| 'stripe'
	| 'glass'
	| 'white'
	| 'hull'
	| 'leaf'
	| 'dino'
	| 'dino-belly'
	| 'dino-plate'
	| 'dino-cheek'
	| 'eye'
	| 'tongue'
	| 'rocket'
	| 'rocket-fin'
	| 'rocket-window'
	| 'flame'
	| 'flame-core';

/** A coloured form of a prop: its fill, and the shade kept inside it (an even-odd path). */
export interface Part {
	readonly d: string;
	readonly paint: Paint;
	readonly shade?: string;
	/** Its own outline, drawn over the forms before it (an eye, a window); otherwise it shares the outer contour. */
	readonly outlined?: boolean;
}

/** A prop: forms that share one outer contour, then the lines drawn over them. */
export interface Figure {
	readonly parts: readonly Part[];
	readonly lines?: string;
	readonly fine?: string;
}

/** The side of a form away from the light: the form and a copy moved toward the light. */
function shade(d: string, depth: number): string {
	return d + shiftPath(d, -depth, -depth * 0.85);
}

function part(d: string, paint: Paint, depth = 0, outlined = false): Part {
	return { d, paint, shade: depth > 0 ? shade(d, depth) : undefined, outlined };
}

/* -------------------------------------------------------------- The desk */

/** Seams between the planks of the desk, and a few knots of the wood. */
export const DESK_SEAMS = 'M0 62L520 62M0 136L520 136M0 210L520 210';
export const DESK_GRAIN =
	'M14 30C40 26 70 34 96 30M424 96C450 92 476 100 506 96M20 176C46 172 66 180 92 176M430 22C452 18 470 24 492 20M436 168C456 164 478 170 500 166M8 104C30 100 58 108 84 104';

/** Strips of tape that hold the sheet, by its top corners. */
export const TAPES = [
	{ d: 'M-20 -6L20 -6L20 6L-20 6Z', place: 'translate(118 14) rotate(-38)' },
	{ d: 'M-20 -6L20 -6L20 6L-20 6Z', place: 'translate(402 14) rotate(38)' }
] as const;

/* ------------------------------------------------------------ The pencil */

/** The magic pencil lies on the desk, its tip at the origin and pointing left. */
export const PENCIL_PLACE = 'translate(434 214) rotate(-50)';

const PENCIL_BODY = 'M20 -8L78 -8L78 8L20 8C17.4 6 17.4 2 20 0C17.4 -2 17.4 -6 20 -8Z';

/** A pencil lying, its tip at the origin: the magic one has a star on its side. */
function lyingPencil(paint: Paint, magic: boolean): Figure {
	return {
		parts: [
			part('M0 0L22 -8L22 8Z', 'pencil-wood', 2),
			part('M0 0L6.8 -2.5C7.8 -1 7.8 1 6.8 2.5Z', magic ? 'ink' : paint),
			{
				d: PENCIL_BODY,
				paint,
				shade: 'M10 3L80 3L80 10L10 10ZM10 -8L80 -8L80 -4.6L10 -4.6Z'
			},
			...(magic ? [part(roundedStarPath(50, 0, 4.6, 2.1, 5, 0.2), 'gold')] : []),
			part('M78 -8.6L89 -8.6L89 8.6L78 8.6Z', 'metal', 2),
			part('M89 -8C89 -8 92 -8 94 -8C99 -8 101 -4 101 0C101 4 99 8 94 8L89 8Z', 'rubber', 3)
		],
		lines: 'M18 0L78 0',
		fine: 'M81.6 -8.6L81.6 8.6M85.4 -8.6L85.4 8.6'
	};
}

export const PENCIL = lyingPencil('pencil-body', true);

/** A coloured pencil left on the desk, at the bottom left. */
export const LOOSE_PENCIL = lyingPencil('hull', false);
export const LOOSE_PENCIL_PLACE = 'translate(16 226) rotate(-8) scale(0.62)';

/** Coloured pencils standing in a pot, at the top right, out of the way of the bubble. */
function standingPencil(x: number, top: number, paint: Paint): Part[] {
	const w = 3.6;
	return [
		part(
			`M${x - w} 56L${x - w} ${top + 9}L${x} ${top}L${x + w} ${top + 9}L${x + w} 56Z`,
			'pencil-wood',
			1.6
		),
		part(
			`M${x - w} 56L${x - w} ${top + 9}C${x - 2.4} ${top + 11} ${x - 1} ${top + 11} ${x} ${top + 9}C${x + 1} ${top + 11} ${x + 2.4} ${top + 11} ${x + w} ${top + 9}L${x + w} 56Z`,
			paint,
			2
		),
		part(`M${x} ${top}L${x - 1.5} ${top + 3}L${x + 1.5} ${top + 3}Z`, paint)
	];
}

const POT_BODY =
	'M462 56L498 56L495 98C494.8 100.6 492.8 102 490.4 102L469.6 102C467.2 102 465.2 100.6 465 98Z';

export const PENCIL_POT: Figure = {
	parts: [
		...standingPencil(472, 24, 'hull'),
		...standingPencil(481, 16, 'gold'),
		...standingPencil(490, 28, 'leaf'),
		part(POT_BODY, 'glass', 6),
		{
			d: 'M460 53C460 50.8 461.8 49 464 49L496 49C498.2 49 500 50.8 500 53L500 56C500 58.2 498.2 60 496 60L464 60C461.8 60 460 58.2 460 56Z',
			paint: 'glass',
			shade: 'M456 57L504 57L504 64L456 64Z'
		}
	],
	fine: 'M465 80L495 80'
};

/* -------------------------------------------------------------- The dino */

/** A baby dino, its head at the origin; it looks out from behind the left edge of the sheet. */
export const DINO_PLACE = 'translate(80 152)';

const DINO_HEAD =
	'M-32 -6C-34 -26 -18 -40 2 -40C22 -40 36 -26 34 -6C37 6 35 18 26 24C16 31 -14 31 -24 24C-33 18 -35 6 -32 -6Z';
const DINO_NECK = 'M-22 16C-28 40 -30 64 -30 100L30 100C30 64 28 40 22 16Z';
const DINO_ARM = 'M-22 52C-34 48 -42 36 -45 22C-46 17.5 -40.5 15.5 -39 20C-35.5 31 -30 38 -20 41Z';
const DINO_HAND =
	'M-50 14C-55 8 -54 -1 -48 -3C-47 -9 -40 -10 -39 -4C-35 -6 -31 -1 -34 3C-31 6 -33 12 -37 13C-40 18 -46 18 -50 14Z';

function dinoEye(x: number): Part[] {
	return [
		part(oval(x, -12, 8.5, 9.5), 'eye', 0, true),
		part(oval(x + 2, -11, 5.4, 6.4), 'dino-plate'),
		part(oval(x + 3, -11, 2.8, 3.4), 'ink'),
		part(oval(x + 4.6, -14, 1.6, 1.6), 'white')
	];
}

export const DINO: Figure = {
	parts: [
		part('M-22 -30C-28 -42 -22 -52 -14 -50C-8 -48 -6 -42 -6 -36Z', 'dino-plate', 3),
		part('M-6 -38C-8 -52 0 -60 8 -56C14 -53 14 -46 12 -38Z', 'dino-plate', 3),
		part('M12 -36C14 -48 22 -54 28 -48C32 -44 30 -36 24 -28Z', 'dino-plate', 3),
		part(DINO_NECK, 'dino', 7),
		part('M-14 30C-16 50 -16 70 -16 100L18 100C18 70 18 50 16 30Z', 'dino-belly', 3),
		part(DINO_ARM, 'dino', 3),
		part(DINO_HAND, 'dino', 3),
		{
			d: DINO_HEAD,
			paint: 'dino',
			shade: shade(DINO_HEAD, 7) + 'M-26 22C-12 30 16 30 30 22L30 34L-26 34Z'
		},
		part(
			'M-22 10C-20 2 -8 -2 2 -2C14 -2 26 2 28 10C29 20 20 28 2 28C-16 28 -24 20 -22 10Z',
			'dino-belly',
			3
		),
		part(oval(-22, 9, 5, 3.2), 'dino-cheek'),
		part(oval(26, 9, 5, 3.2), 'dino-cheek'),
		...dinoEye(-11),
		...dinoEye(14),
		part(oval(-2, 5, 1.5, 1.1), 'ink'),
		part(oval(8, 5, 1.5, 1.1), 'ink'),
		part('M-10 14C-4 23 10 23 16 14C10 17 -4 17 -10 14Z', 'ink', 0, true),
		part('M-1 18.6C1 16.8 5 16.8 7 18.6C5 20.2 1 20.2 -1 18.6Z', 'tongue')
	],
	lines: 'M-22 10C-20 2 -8 -2 2 -2C14 -2 26 2 28 10',
	fine: 'M-15 46C-5 49 7 49 17 46M-16 62C-5 65 7 65 18 62M-16 78C-5 81 7 81 18 78M-19 -26C-15 -29 -9 -29 -5 -26M7 -26C11 -29 17 -29 21 -26M-46 0L-43 4M-38 -2L-38 3'
};

/* ------------------------------------------------------------ The eraser */

/** An eraser with a face, centred on its body; it looks out from behind the sheet. */
export const ERASER_PLACE = 'translate(80 116)';

const ERASER_BODY =
	'M-40 -15C-40 -18.3 -37.3 -21 -34 -21L26 -21C33 -21 38 -16 38 -9L38 9C38 16 33 21 26 21L-34 21C-37.3 21 -40 18.3 -40 15Z';

export const ERASER: Figure = {
	parts: [
		part(ERASER_BODY, 'rubber', 6),
		{
			d: 'M-42 -22L-8 -22L-8 22L-42 22Z',
			paint: 'stripe',
			shade: 'M-46 12L-4 12L-4 26L-46 26ZM-12 -26L-4 -26L-4 26L-12 26Z'
		},
		part('M-33 -22L-24 -22L-24 22L-33 22Z', 'white'),
		part(oval(9, -5, 6.4, 7), 'eye', 0, true),
		part(oval(25, -5, 6.4, 7), 'eye', 0, true),
		part(oval(11, -4, 3, 3.6), 'ink'),
		part(oval(27, -4, 3, 3.6), 'ink'),
		part(oval(12.2, -6, 1.1, 1.1), 'white'),
		part(oval(28.2, -6, 1.1, 1.1), 'white'),
		part(oval(4, 8, 4, 2.6), 'dino-cheek'),
		part(oval(31, 8, 3.6, 2.6), 'dino-cheek'),
		part('M12 8C14 14 22 14 24 8C20 10 16 10 12 8Z', 'ink', 0, true)
	],
	lines: 'M-8 -22L-8 22'
};

/** The crumbs the eraser leaves on the desk. */
export const CRUMBS = oval(40, 146, 2.6, 2) + oval(52, 150, 2, 1.6) + oval(30, 152, 1.8, 1.4);

/* ----------------------------------------------------- The magic marks */

/** A little curl the pencil adds at the end of the line, from the tip. */
export const LOOP_PATH = 'M0 0C10 -4 24 -8 28 -20C32 -34 8 -38 8 -22C8 -8 32 -8 48 -16';

/** A drop of colour, centred on its lower half, and its shine. */
export const DROP_PATH =
	'M0 -24C9 -12 13.5 -4.5 13.5 3C13.5 12 7.5 18 0 18C-7.5 18 -13.5 12 -13.5 3C-13.5 -4.5 -9 -12 0 -24Z';
export const DROP_SHINE = 'M-8 2C-8 -4 -5 -9 -2 -13C-3 -7 -4 -2 -4 3C-4 5.5 -8 5.5 -8 2Z';
/** Droplets thrown around when the drop lands. */
export const SPLASH: readonly { readonly x: number; readonly y: number; readonly r: number }[] = [
	{ x: -22, y: -6, r: 4 },
	{ x: -14, y: -20, r: 3 },
	{ x: 16, y: -18, r: 3.4 },
	{ x: 24, y: -2, r: 4 },
	{ x: -2, y: -26, r: 2.4 }
];

/** A star of four points with a bright heart, for the sparks and the touch left by the entrances. */
export const SPARK_PATH = roundedStarPath(0, 0, 11, 3.6, 4, 0.12);
export const SPARK_HEART = oval(-1.2, -1.2, 2.2, 2.2);
/** Where the sparks twinkle around the tip, in the local box of the drawing. */
export const SPARKS: readonly { readonly x: number; readonly y: number }[] = [
	{ x: -26, y: -18 },
	{ x: 20, y: -30 },
	{ x: 32, y: 6 },
	{ x: -16, y: 26 },
	{ x: 4, y: -8 }
];

/* ------------------------------------------------------------ The rocket */

const ROCKET_BODY = 'M15 0C10 -7 0 -8 -10 -6L-12 -6L-12 6L-10 6C0 8 10 7 15 0Z';

/** The mini rocket flies along the line pointing right; its flame is behind it. */
export const ROCKET: Figure = {
	parts: [
		part('M-12 -3L-23 0L-12 3Z', 'flame'),
		part('M-12 -1.6L-18 0L-12 1.6Z', 'flame-core'),
		part('M-5 -6L-11 -12C-12 -13 -14 -12.5 -14 -11L-14 -4Z', 'rocket-fin', 1.5),
		part('M-5 6L-11 12C-12 13 -14 12.5 -14 11L-14 4Z', 'rocket-fin', 1.5),
		{
			d: ROCKET_BODY,
			paint: 'rocket',
			shade: 'M-16 2.4C0 5 10 4 18 1L18 10L-16 10Z'
		},
		part('M15 0C13 -3 11 -5 8 -6.2L8 6.2C11 5 13 3 15 0Z', 'rocket-fin'),
		part(oval(2, 0, 3, 3), 'rocket-window', 0, true),
		part(oval(1.2, -1, 1, 1), 'white')
	],
	fine: 'M-12 -6L-12 6'
};
export const ROCKET_SCALE = 1.9;
