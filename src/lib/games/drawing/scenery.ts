/** Drawing data of the desk around the drawing: the sheet, the pencil and the visitors of the surprise scenes. */

export const SCENE = { width: 520, height: 240 } as const;

/** The sheet of paper, in scene units. The visitors hide behind its left edge. */
export const PAPER = { x: 110, y: 8, width: 300, height: 224, radius: 14 } as const;

/** Where the 200 x 200 box of the drawing sits on the sheet, below the strip of the bubble. */
export const PICTURE_PLACE = 'translate(170 44) scale(0.9)';

/** The centre of the drawing box, where the pencil is until it has been measured. */
export const BOX_CENTER = { x: 100, y: 100 } as const;

export type Paint =
	| 'wood'
	| 'lead'
	| 'body'
	| 'ferrule'
	| 'rubber'
	| 'green'
	| 'plate'
	| 'white'
	| 'ink'
	| 'cheek'
	| 'band'
	| 'cream'
	| 'fin'
	| 'window'
	| 'flame';

export interface Piece {
	readonly d: string;
	readonly paint: Paint;
}

/** The pencil lies on the desk, its tip at the origin and pointing left. */
export const PENCIL_PLACE = 'translate(436 212) rotate(-50)';
export const PENCIL: readonly Piece[] = [
	{ d: 'M0 0L18 -7L18 7Z', paint: 'wood' },
	{ d: 'M0 0L6 -2.6L6 2.6Z', paint: 'lead' },
	{ d: 'M18 -7L76 -7L76 7L18 7Z', paint: 'body' },
	{ d: 'M76 -7L85 -7L85 7L76 7Z', paint: 'ferrule' },
	{ d: 'M85 -7L91 -7C99 -7 99 7 91 7L85 7Z', paint: 'rubber' }
];

/** A baby dino, centred on its head; it looks out from behind the sheet. */
export const DINO_PLACE = 'translate(68 164) scale(1.3)';
export const DINO: readonly Piece[] = [
	{ d: 'M-16 -24L-10 -40L-3 -25Z', paint: 'plate' },
	{ d: 'M0 -26L8 -42L15 -25Z', paint: 'plate' },
	{ d: 'M-34 18C-40 -8 -22 -26 2 -26C26 -26 40 -8 36 18C32 34 -28 34 -34 18Z', paint: 'green' }
];
export const DINO_EYES = [
	{ x: -13, y: -4, radius: 8 },
	{ x: 13, y: -4, radius: 8 }
] as const;
export const DINO_PUPILS = [
	{ x: -9, y: -3, radius: 3.6 },
	{ x: 17, y: -3, radius: 3.6 }
] as const;
export const DINO_MOUTH = 'M-9 13Q3 22 15 13';
export const DINO_CHEEKS = [
	{ x: -24, y: 10, rx: 5, ry: 3.4 },
	{ x: 28, y: 10, rx: 5, ry: 3.4 }
] as const;

/** An eraser with a face, centred on its body; it looks out from behind the sheet. */
export const ERASER_PLACE = 'translate(74 90) scale(1.2)';
export const ERASER: readonly Piece[] = [
	{ d: 'M-38 -17L16 -17C30 -17 30 17 16 17L-38 17Z', paint: 'rubber' },
	{ d: 'M-38 -17L-24 -17L-24 17L-38 17Z', paint: 'band' }
];
export const ERASER_EYES = [
	{ x: -8, y: -4, radius: 6 },
	{ x: 10, y: -4, radius: 6 }
] as const;
export const ERASER_PUPILS = [
	{ x: -5, y: -3, radius: 2.8 },
	{ x: 13, y: -3, radius: 2.8 }
] as const;
export const ERASER_MOUTH = 'M-5 8Q1 13 7 8';

/** A little curl the pencil adds at the end of the line, from the tip. */
export const LOOP_PATH = 'M0 0C10 -4 24 -8 28 -20C32 -34 8 -38 8 -22C8 -8 32 -8 48 -16';

/** A drop of colour, centred on its lower half. */
export const DROP_PATH =
	'M0 -24C9 -12 13.5 -4.5 13.5 3C13.5 12 7.5 18 0 18C-7.5 18 -13.5 12 -13.5 3C-13.5 -4.5 -9 -12 0 -24Z';
export const SPLASH_RADIUS = 22;

/** A star of four points, for the sparks and the touch left by the common entrances. */
export const SPARK_PATH = 'M0 -10L3 -3L10 0L3 3L0 10L-3 3L-10 0L-3 -3Z';
/** Where the sparks twinkle around the tip, in the local box of the drawing. */
export const SPARKS: readonly { readonly x: number; readonly y: number }[] = [
	{ x: -26, y: -18 },
	{ x: 20, y: -30 },
	{ x: 32, y: 6 },
	{ x: -16, y: 26 },
	{ x: 4, y: -8 }
];

/** The mini rocket flies along the line pointing right; its flame is behind it. */
export const ROCKET: readonly Piece[] = [
	{ d: 'M-6 -5L-13 -11L-13 -3Z', paint: 'fin' },
	{ d: 'M-6 5L-13 11L-13 3Z', paint: 'fin' },
	{ d: 'M-11 -3L-21 0L-11 3Z', paint: 'flame' },
	{ d: 'M13 0C7 -8 -6 -8 -11 -4L-11 4C-6 8 7 8 13 0Z', paint: 'cream' }
];
export const ROCKET_WINDOW = { x: 2, y: 0, radius: 2.8 } as const;
export const ROCKET_SCALE = 1.9;
