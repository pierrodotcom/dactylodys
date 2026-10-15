/** Drawing data of the ingredients (local box of about 80 x 80, centered on (0, 0)) and of the kitchen. */

export type Tone = 'main' | 'leaf' | 'plain';

export interface Part {
	readonly d: string;
	readonly tone: Tone;
}

export interface Dot {
	readonly x: number;
	readonly y: number;
	readonly radius: number;
}

export interface IngredientDrawing {
	readonly parts: readonly Part[];
	/** One stroke per cut: the more good keys, the more are drawn. */
	readonly cuts: readonly string[];
	readonly dots: readonly Dot[];
}

export const INGREDIENTS: readonly IngredientDrawing[] = [
	{
		parts: [
			{ d: 'M-14 -26L14 -26L5 34L-5 34Z', tone: 'main' },
			{ d: 'M-6 -26Q-14 -40 -4 -42Q0 -34 0 -26Z', tone: 'leaf' },
			{ d: 'M2 -26Q0 -40 10 -42Q12 -34 6 -26Z', tone: 'leaf' }
		],
		cuts: ['M-12.2 -14L12.2 -14', 'M-10.4 -2L10.4 -2', 'M-8.6 10L8.6 10', 'M-6.8 22L6.8 22'],
		dots: []
	},
	{
		parts: [
			{ d: 'M-28 0A28 28 0 1 0 28 0A28 28 0 1 0 -28 0Z', tone: 'main' },
			{ d: 'M-10 -26L0 -34L10 -26L4 -22L0 -28L-4 -22Z', tone: 'leaf' }
		],
		cuts: ['M-18 -21L-18 21', 'M-6 -27L-6 27', 'M6 -27L6 27', 'M18 -21L18 21'],
		dots: []
	},
	{
		parts: [{ d: 'M-34 18L34 -14L34 18Z', tone: 'main' }],
		cuts: ['M-20 18L-20 11', 'M-6 18L-6 5', 'M8 18L8 -2', 'M22 18L22 -8'],
		dots: [
			{ x: 10, y: 10, radius: 3 },
			{ x: 24, y: 6, radius: 2.5 },
			{ x: -8, y: 14, radius: 2 }
		]
	},
	{
		parts: [
			{ d: 'M-10 0L-10 24Q0 30 10 24L10 0Z', tone: 'plain' },
			{ d: 'M-32 0A32 30 0 0 1 32 0Z', tone: 'main' }
		],
		cuts: ['M-22 0L-22 -21', 'M-8 0L-8 -29', 'M8 0L8 -29', 'M22 0L22 -21'],
		dots: [
			{ x: -12, y: -14, radius: 4 },
			{ x: 6, y: -20, radius: 3 },
			{ x: 16, y: -8, radius: 3 }
		]
	},
	{
		parts: [
			{ d: 'M22 -24L34 -30L24 -18Z', tone: 'plain' },
			{ d: 'M-22 -24L22 -24L26 30Q26 34 22 34L-22 34Q-26 34 -26 30Z', tone: 'plain' }
		],
		cuts: [],
		dots: []
	}
];

/** The stream that falls from the spout of the jug. */
export const POUR_STREAM_PATH = 'M32 -24Q44 20 36 66';

export const SCENE = { width: 520, height: 240 } as const;

export const KITCHEN = {
	boardPath: 'M170 112H350V124H170Z',
	counterPath: 'M0 206H520V240H0Z',
	boardIngredient: { x: 260, y: 72, scale: 1 },
	potIngredient: { x: 260, y: 170, scale: 0.8 }
} as const;

export const POT = {
	rim: { cx: 260, cy: 160, rx: 120, ry: 26 },
	soup: { cx: 260, cy: 160, rx: 108, ry: 20 },
	bodyPath: 'M140 160A120 26 0 0 0 380 160C380 240 140 240 140 160Z',
	handlePaths: ['M140 172C112 172 112 200 140 200', 'M380 172C408 172 408 200 380 200'],
	bubbles: [
		{ x: 226, y: 150, radius: 7 },
		{ x: 292, y: 146, radius: 5 },
		{ x: 262, y: 138, radius: 4 }
	],
	steamPaths: [
		'M220 120Q210 100 222 84Q234 68 224 52',
		'M260 118Q250 98 262 82Q274 66 264 50',
		'M300 120Q290 100 302 84Q314 68 304 52'
	]
} as const;

/**
 * Surprise scenes (ADR-032). The diving board stands to the left of the pot, in the units of the
 * ingredient once it is in the pot (centered on 0 0): the ingredient walks on it before diving.
 */
export const DIVING_BOARD = {
	plank: { x: -235, y: -64, width: 110, height: 10 },
	leg: { x: -235, y: -54, width: 10, height: 92 }
} as const;

/** Drops thrown up by an ingredient that dives into the soup: directions in degrees, from the soup. */
export const SPLASH = {
	center: { x: 260, y: 156 },
	radius: 6,
	angles: [-160, -120, -60, -20]
} as const;

/** The big bubble the pot burps once it has swallowed an ingredient. */
export const BURP_BUBBLE = { cx: 260, cy: 138, r: 26 } as const;
