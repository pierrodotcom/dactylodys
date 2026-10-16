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

/**
 * The ladle the ingredient slides down (scene units), on the right: the top left corner is kept
 * for the speech bubble. Its handle leans on the rim, its bowl in the soup.
 */
export const LADLE = {
	handlePath: 'M456 54L304 134L308 142L460 62Q464 56 456 54Z',
	bowlPath: 'M268 140A23 12 0 0 0 314 140Z'
} as const;

/** The spoon that throws the ingredient, on the counter left of the pot (scene units). */
export const CATAPULT = {
	pivotPath: 'M56 206L66 189L76 206Z',
	bowlPath: 'M12 184A19 9 0 0 0 50 184Z',
	handlePath: 'M48 185L106 182Q111 182 110 187L50 190Z'
} as const;

/** The napkin parachute, above the ingredient (units of the ingredient in the pot). */
export const NAPKIN = {
	canopyPath:
		'M-44 -62Q-44 -98 0 -98Q44 -98 44 -62Q33 -70 22 -62Q11 -70 0 -62Q-11 -70 -22 -62' +
		'Q-33 -70 -44 -62Z',
	foldPaths: ['M-22 -66Q-25 -86 -12 -95', 'M22 -66Q25 -86 12 -95'],
	cordPaths: ['M-44 -62L-18 -34', 'M44 -62L18 -34', 'M0 -62L0 -40']
} as const;

/** The balloon the ingredient hangs from (units of the ingredient in the pot). */
export const BALLOON = {
	bodyPath: 'M0 -58C-31 -62 -31 -104 0 -104C31 -104 31 -62 0 -58Z',
	knotPath: 'M-4 -53L0 -58L4 -53Z',
	shinePath: 'M-14 -86Q-13 -95 -5 -98',
	stringPath: 'M0 -53Q-4 -47 0 -40'
} as const;

/** The pot lid with eyes, hinged on its right end (scene units). */
export const LID = {
	domePath: 'M134 158Q134 126 260 124Q386 126 386 158Z',
	knobPath: 'M248 125Q248 112 260 112Q272 112 272 125Z',
	eyes: [
		{ x: 222, y: 141, radius: 8 },
		{ x: 298, y: 141, radius: 8 }
	],
	pupils: [
		{ x: 224, y: 143, radius: 3.5 },
		{ x: 300, y: 143, radius: 3.5 }
	]
} as const;

/** The little arm the floating ingredient waves with (units of the ingredient in the pot). */
export const WAVING_ARM = {
	armPath: 'M22 -3L47 -21L52 -15L27 3Z',
	hand: { x: 52, y: -22, radius: 9 }
} as const;

/** The steam drawings above the pot (scene units), picked in turn: a heart, a star, a little dino. */
export const STEAM_SHAPES: readonly (readonly string[])[] = [
	[
		'M260 102C226 82 228 52 247 52C255 52 259 58 260 63C261 58 265 52 273 52C292 52 294 82 260 102Z',
		'M260 132Q252 120 260 108'
	],
	[
		'M260 46L267.6 65.5L288.5 66.7L272.4 80L277.6 100.3L260 89L242.4 100.3L247.6 80L231.5 66.7' +
			'L252.4 65.5Z',
		'M260 132Q252 120 260 106'
	],
	[
		'M222 94Q240 66 266 74L276 58Q280 48 292 50Q302 52 300 60Q298 67 284 67L283 80Q287 92 280 98' +
			'L280 104L273 104L272 97Q262 99 254 97L254 104L247 104L246 95Q234 97 222 94Z',
		'M288 57L289 58',
		'M250 132Q242 120 250 108'
	]
];

/** The humps of the wave that runs across the soup, left to right (scene units), with their foam. */
export const OLA_HUMPS: readonly { readonly hump: string; readonly foam: string }[] = [
	172, 208, 244, 280, 316
].map((left) => ({
	hump: `M${left} 160Q${left + 16} 100 ${left + 32} 160`,
	foam: `M${left + 9} 141Q${left + 16} 128 ${left + 23} 141`
}));

/**
 * The baby dino of the visit (centered on 0 0, feet at y = 34, facing right), standing at `rest`
 * (scene units) when the visit ends. The near arm holds the ingredient, then waves.
 */
export const DINO = {
	rest: { x: 52, y: 178, scale: 1 },
	tailPath: 'M-24 14L-44 24L-40 8L-25 0Z',
	platePaths: ['M-22 -14L-30 -26L-14 -24Z', 'M-12 -24L-14 -38L-2 -28Z', 'M0 -28L4 -41L12 -28Z'],
	feetPaths: [
		'M-18 26H-2V30Q-2 34 -6 34H-14Q-18 34 -18 30Z',
		'M6 26H20V30Q20 34 16 34H10Q6 34 6 30Z'
	],
	bodyPath:
		'M-26 6C-26 -16 -10 -28 8 -28C26 -28 30 -12 30 -2C30 18 16 28 -2 28C-18 28 -26 20 -26 6Z',
	eye: { x: 16, y: -12, radius: 5 },
	pupil: { x: 18, y: -11, radius: 2.5 },
	smilePath: 'M12 4Q19 11 27 4',
	armPath: 'M16 10L38 6L38 14L16 20Z',
	hand: { x: 40, y: 10, radius: 6 }
} as const;

/**
 * The little rocket of the delivery (nose right, centered on 0 0), at `rest` when it lets go: it
 * flies level, a claw holds the ingredient 66 in front of it, the pot is under the ingredient.
 */
export const DELIVERY_ROCKET = {
	rest: { x: 194, y: 102, scale: 1 },
	bodyPath: 'M-30 -11H8C24 -11 34 -5 38 0C34 5 24 11 8 11H-30Z',
	finPaths: ['M-30 -11L-42 -23L-14 -11Z', 'M-30 11L-42 23L-14 11Z'],
	window: { x: 8, y: 0, radius: 6 },
	flameOuterPath: 'M-30 -7Q-60 0 -30 7Z',
	flameInnerPath: 'M-30 -4Q-47 0 -30 4Z',
	clawPaths: ['M30 -9H44Q47 -9 47 -18H53Q53 -3 44 -3H30Z', 'M30 9H44Q47 9 47 18H53Q53 3 44 3H30Z']
} as const;

/**
 * The giraffe that leans in from the right edge (scene units). Its neck points along -x from the
 * shoulder (0 0); `transform` places and tilts it so the mouth ends over the pot. The neck grows
 * from the edge and the head slides with it. The ingredient it holds is drawn in the neck frame
 * (`heldTransform` cancels the tilt).
 */
export const GIRAFFE = {
	transform: 'translate(548 62) rotate(-8.53)',
	neckPath: 'M0 -16L-222 -10L-222 10L0 16Z',
	spots: [
		{ x: -40, y: -3, radius: 5 },
		{ x: -90, y: 4, radius: 5 },
		{ x: -140, y: -4, radius: 4.5 },
		{ x: -190, y: 3, radius: 4 }
	],
	headTransform: 'translate(-222 0) rotate(-12)',
	headPath: 'M6 -11C-4 -19 -30 -19 -46 -9C-56 -4 -56 6 -46 10C-30 18 -4 16 6 11Z',
	earPath: 'M2 -10L14 -20L10 -5Z',
	hornPaths: ['M-6 -16L-8 -27', 'M-15 -16L-18 -26'],
	hornTips: [
		{ x: -8, y: -28, radius: 3.5 },
		{ x: -18, y: -27, radius: 3.5 }
	],
	cheek: { x: -8, y: 1, radius: 4 },
	eye: { x: -30, y: -5, radius: 2.5 },
	smilePath: 'M-44 6Q-36 10 -28 6',
	heldTransform: 'translate(-291.6 18.9) rotate(8.53) scale(0.8)'
} as const;
