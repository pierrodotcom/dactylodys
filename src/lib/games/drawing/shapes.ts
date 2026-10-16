/**
 * Drawing data of the magic drawings, in a local box of 200 x 200. A picture is a list of strokes
 * drawn in turn (the longer a stroke, the longer it takes), then colored all at once at the end.
 */

/** A colour of the drawings: each one is a design token, see `DrawingArt.svelte`. */
export type Tone =
	'orange' | 'pink' | 'yellow' | 'green' | 'teal' | 'lilac' | 'clay' | 'cream' | 'slate' | 'ink';

/** Where a colour is painted among the others: behind them, with them, or on top. */
export type Layer = 'back' | 'middle' | 'front';

export interface Stroke {
	readonly d: string;
	/** About the length of the line: the share of the drawing time this stroke takes. */
	readonly weight: number;
	/** Colour given to the inside once the drawing is finished; none: the line stays alone. */
	readonly tone?: Tone;
	/** Order of painting only: the lines are always drawn in the order of the list. */
	readonly layer?: Layer;
	readonly transform?: string;
}

/** A coloured touch that only appears with the colours (cheeks, glints). */
export interface Touch {
	readonly d: string;
	readonly tone: Tone;
}

export interface DrawingPicture {
	readonly id: string;
	readonly strokes: readonly Stroke[];
	readonly touches: readonly Touch[];
}

/** A point of the drawing, in the local box of the picture. */
export interface DrawingPoint {
	readonly x: number;
	readonly y: number;
}

/** An ellipse as a closed path, to keep the data short. */
export function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
	return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`;
}

/** Length of an ellipse (Ramanujan), rounded: the weight of the strokes drawn with `ellipsePath`. */
export function ellipseLength(rx: number, ry: number): number {
	const h = ((rx - ry) / (rx + ry)) ** 2;
	return Math.round(Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h))));
}

function dot(cx: number, cy: number, radius: number, tone: Tone, layer?: Layer): Stroke {
	return {
		d: ellipsePath(cx, cy, radius, radius),
		weight: ellipseLength(radius, radius),
		tone,
		layer
	};
}

const PETAL = 'M100 72C83 52 85 24 100 20C115 24 117 52 100 72Z';
const PETAL_COUNT = 6;
const PETAL_STEP = 360 / PETAL_COUNT;
const SPARKLE = 'M0 -18L5 -5L18 0L5 5L0 18L-5 5L-18 0L-5 -5Z';

const CAT: DrawingPicture = {
	id: 'cat',
	strokes: [
		{
			d: 'M54 84L58 40L84 58C94 55 106 55 116 58L142 40L146 84C150 112 130 132 100 132C70 132 50 112 54 84Z',
			weight: 390,
			tone: 'orange'
		},
		{ d: 'M63 56L76 63L65 76Z', weight: 42, tone: 'pink' },
		{ d: 'M137 56L124 63L135 76Z', weight: 42, tone: 'pink' },
		{ d: 'M100 62L100 74M89 64L90 74M111 64L110 74', weight: 36 },
		{ d: ellipsePath(84, 92, 6, 8), weight: ellipseLength(6, 8), tone: 'ink' },
		{ d: ellipsePath(116, 92, 6, 8), weight: ellipseLength(6, 8), tone: 'ink' },
		{ d: 'M94 104L106 104L100 111Z', weight: 30, tone: 'pink' },
		{ d: 'M100 111C100 120 90 121 86 116M100 111C100 120 110 121 114 116', weight: 40 },
		{ d: 'M68 106L38 100M68 114L38 120', weight: 62 },
		{ d: 'M132 106L162 100M132 114L162 120', weight: 62 },
		{
			d: 'M64 126C46 150 50 184 72 190L128 190C150 184 154 150 136 126',
			weight: 190,
			tone: 'orange',
			layer: 'back'
		},
		{ d: 'M88 190C86 166 114 166 112 190', weight: 70, tone: 'cream', layer: 'back' },
		{ d: 'M138 184C172 188 190 156 170 128', weight: 90 }
	],
	touches: [
		{ d: ellipsePath(70, 112, 7, 4.5), tone: 'pink' },
		{ d: ellipsePath(130, 112, 7, 4.5), tone: 'pink' }
	]
};

const FISH: DrawingPicture = {
	id: 'fish',
	strokes: [
		{
			d: 'M24 100C52 56 128 56 156 100C128 144 52 144 24 100Z',
			weight: 290,
			tone: 'orange'
		},
		{ d: ellipsePath(62, 92, 6, 6), weight: ellipseLength(6, 6), tone: 'ink' },
		{ d: 'M30 106C36 110 42 110 46 106', weight: 18 },
		{ d: 'M92 80C80 94 80 106 92 120', weight: 45 },
		{ d: 'M108 86q8 6 0 12M122 92q8 6 0 12M108 104q8 6 0 12', weight: 55 },
		dot(30, 62, 7, 'teal'),
		dot(46, 42, 5, 'teal'),
		dot(30, 24, 4, 'teal'),
		{ d: 'M84 68C92 44 118 42 128 70', weight: 80, tone: 'pink', layer: 'back' },
		{ d: 'M146 100L186 66C178 90 178 110 186 134Z', weight: 150, tone: 'pink', layer: 'back' }
	],
	touches: [{ d: ellipsePath(70, 106, 7, 4.5), tone: 'pink' }]
};

const HOUSE: DrawingPicture = {
	id: 'house',
	strokes: [
		{ d: 'M52 102L52 178L148 178L148 102', weight: 270, tone: 'yellow' },
		{ d: 'M36 106L100 50L164 106Z', weight: 300, tone: 'pink' },
		{ d: 'M88 178L88 140C88 128 112 128 112 140L112 178Z', weight: 130, tone: 'clay' },
		dot(106, 158, 2.5, 'yellow'),
		{ d: 'M58 120L80 120L80 142L58 142Z', weight: 88, tone: 'teal' },
		{ d: 'M69 120L69 142M58 131L80 131', weight: 44 },
		{ d: 'M120 120L142 120L142 142L120 142Z', weight: 88, tone: 'teal' },
		{ d: 'M131 120L131 142M120 131L142 131', weight: 44 },
		{ d: 'M122 69L122 50L142 50L142 87Z', weight: 95, tone: 'clay' },
		dot(166, 32, 13, 'yellow'),
		{ d: 'M166 10L166 4M166 54L166 60M144 32L138 32M188 32L194 32', weight: 24 },
		{ d: 'M16 178L184 178', weight: 168 }
	],
	touches: []
};

const FLOWER: DrawingPicture = {
	id: 'flower',
	strokes: [
		dot(100, 72, 18, 'yellow', 'front'),
		...Array.from({ length: PETAL_COUNT }, (_, index): Stroke => ({
			d: PETAL,
			weight: 100,
			tone: index % 2 === 0 ? 'pink' : 'lilac',
			transform: `rotate(${index * PETAL_STEP} 100 72)`
		})),
		dot(93, 68, 2.4, 'ink', 'front'),
		dot(107, 68, 2.4, 'ink', 'front'),
		{ d: 'M92 77Q100 85 108 77', weight: 18 },
		{ d: 'M100 148C100 142 99 136 100 124', weight: 26 },
		{ d: 'M99 142C80 146 68 134 64 122C82 120 95 128 99 142Z', weight: 85, tone: 'green' },
		{ d: 'M101 134C120 138 132 126 136 114C118 112 105 120 101 134Z', weight: 85, tone: 'green' },
		{ d: 'M70 160L130 160L122 196L78 196Z', weight: 150, tone: 'clay' },
		{ d: 'M64 148L136 148L136 162L64 162Z', weight: 168, tone: 'clay' }
	],
	touches: [
		{ d: ellipsePath(85, 77, 3.5, 2.5), tone: 'pink' },
		{ d: ellipsePath(115, 77, 3.5, 2.5), tone: 'pink' }
	]
};

const BOAT: DrawingPicture = {
	id: 'boat',
	strokes: [
		{ d: 'M34 122L166 122L146 154L54 154Z', weight: 300, tone: 'clay' },
		{ d: 'M100 120L100 34', weight: 86 },
		{ d: 'M104 40L104 112L148 112Z', weight: 205, tone: 'cream' },
		{ d: 'M96 54L96 112L62 112Z', weight: 165, tone: 'yellow' },
		{ d: 'M100 34L100 16L122 25Z', weight: 70, tone: 'pink' },
		{
			d: 'M75 138a5 5 0 1 0 10 0a5 5 0 1 0 -10 0ZM95 138a5 5 0 1 0 10 0a5 5 0 1 0 -10 0ZM115 138a5 5 0 1 0 10 0a5 5 0 1 0 -10 0Z',
			weight: 94,
			tone: 'teal'
		},
		dot(40, 48, 14, 'yellow'),
		{
			d: 'M10 172C22 162 34 162 46 172C58 182 70 182 82 172C94 162 106 162 118 172C130 182 142 182 154 172C166 162 178 162 190 172L190 192L10 192Z',
			weight: 400,
			tone: 'teal'
		}
	],
	touches: []
};

const STAR: DrawingPicture = {
	id: 'star',
	strokes: [
		{
			d: 'M100 26L119 76L172 79L131 113L144 164L100 135L56 164L69 113L28 79L81 76Z',
			weight: 530,
			tone: 'yellow'
		},
		dot(88, 98, 3.5, 'ink'),
		dot(112, 98, 3.5, 'ink'),
		{ d: 'M90 111Q100 121 110 111', weight: 22 },
		{ d: SPARKLE, weight: 100, tone: 'cream', transform: 'translate(164 40)' },
		{ d: SPARKLE, weight: 100, tone: 'pink', transform: 'translate(172 150)' },
		{ d: SPARKLE, weight: 100, tone: 'lilac', transform: 'translate(34 144)' }
	],
	touches: [
		{ d: ellipsePath(80, 108, 6, 4), tone: 'pink' },
		{ d: ellipsePath(120, 108, 6, 4), tone: 'pink' }
	]
};

export const DRAWINGS: readonly [DrawingPicture, ...DrawingPicture[]] = [
	CAT,
	FISH,
	HOUSE,
	FLOWER,
	BOAT,
	STAR
];

/** The little pencil marks of the progress row, in a box of 36 x 36, picked in turn. */
export const SQUIGGLES: readonly [string, ...string[]] = [
	'M5 27C9 8 16 8 18 20C20 30 27 28 31 9',
	'M5 12C12 4 14 18 20 18C26 18 26 8 31 14',
	'M6 29L12 8L18 28L24 8L30 28',
	'M5 20C9 12 13 12 17 20C21 28 25 28 31 18'
];

const LAYER_RANK: Readonly<Record<Layer, number>> = { back: 0, middle: 1, front: 2 };

/** The coloured strokes in the order they are painted: the back ones first, the front ones last. */
export function paintOrder(picture: DrawingPicture): readonly Stroke[] {
	return picture.strokes
		.filter((stroke) => stroke.tone !== undefined)
		.map((stroke, index) => ({ stroke, index }))
		.sort(
			(a, b) =>
				LAYER_RANK[a.stroke.layer ?? 'middle'] - LAYER_RANK[b.stroke.layer ?? 'middle'] ||
				a.index - b.index
		)
		.map(({ stroke }) => stroke);
}
