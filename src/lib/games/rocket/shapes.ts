/**
 * Drawing data of the rocket game: the rocket, the astres and their inhabitants, the sky, and the
 * props of the surprise scenes. Each shape has its own local box; the scene is lit from the top
 * left. Paths are written with absolute M, L, C, Q and Z commands in "x y" pairs, so that
 * `mapPath` can move or mirror them.
 */
import {
	capsulePath,
	crescentPath,
	fluffPath,
	ovalPath,
	roundedStarPath,
	type XY
} from '$lib/ui/companion/geometry';
import { mapPath, shadeOf } from '../hatching/shapes';
import { FLIGHT, INHABITANT } from './flight';

function round(value: number): number {
	const rounded = Math.round(value * 100) / 100;
	return Object.is(rounded, -0) ? 0 : rounded;
}

/** The same path mirrored around the vertical line `x = middle`. */
function mirrorAt(d: string, middle: number): string {
	return mapPath(d, (x, y) => [2 * middle - x, y]);
}

/** A form, the shade on its side away from the light, and its lights. */
export interface Modelled {
	readonly d: string;
	readonly shade: string;
	readonly lights: readonly string[];
}

function modelled(d: string, toward: number, lights: readonly string[] = [], down = toward) {
	return { d, shade: shadeOf(d, toward, down), lights } satisfies Modelled;
}

/* ------------------------------------------------------------------ The rocket */

/** The rocket, nose up, centered on (0, 0). In flight it is turned nose right: its left is the sky above. */
/** Size of the rocket in the sky, against its own drawing. */
export const ROCKET_SCALE = 1.2;

/** The round feet of the landing legs, in the drawing of the rocket. */
const FOOT_BALLS = [
	{ x: -14.6, y: 35.6, radius: 2.1 },
	{ x: 15.8, y: 49.8, radius: 2.1 }
] as const;

const ROCKET_BODY_PATH =
	'M0 -38C9.5 -32.5 15.5 -19 15.5 -3C15.5 10 14.2 22 11.5 31L-11.5 31C-14.2 22 -15.5 10 -15.5 -3C-15.5 -19 -9.5 -32.5 0 -38Z';

export const ROCKET = {
	body: modelled(
		ROCKET_BODY_PATH,
		3.6,
		[
			'M-11.6 -14C-10.2 -22 -7.2 -28.2 -3.4 -32.2C-5.8 -26.2 -7.8 -19.4 -8.6 -12.2C-8.9 -9.6 -12 -10.6 -11.6 -14Z',
			ovalPath(-10.4, -4.6, 1.1, 2.6)
		],
		0
	),
	/** Red nose and red skirt, kept inside the body; their seams follow its roundness. */
	cap: 'M-20 -50L20 -50L20 -21Q0 -14.4 -20 -21Z',
	capSeam: 'M-20 -21Q0 -14.4 20 -21',
	skirt: 'M-20 21.6Q0 28 20 21.6L20 40L-20 40Z',
	skirtSeam: 'M-20 21.6Q0 28 20 21.6',
	rivets: [
		ovalPath(-7.6, 15.6, 0.75, 0.75),
		ovalPath(0, 16.8, 0.75, 0.75),
		ovalPath(7.6, 15.6, 0.75, 0.75)
	],
	window: {
		ring: modelled(ovalPath(0, -5, 7.6, 7.6), 1.6),
		glass: modelled(ovalPath(0, -5, 5.2, 5.2), 2.2),
		glints: [ovalPath(-1.9, -7, 1.7, 1.3), ovalPath(2, -2.6, 0.7, 0.7)],
		bolts: [
			ovalPath(-4.6, -9.6, 0.6, 0.6),
			ovalPath(4.6, -9.6, 0.6, 0.6),
			ovalPath(-4.6, -0.4, 0.6, 0.6),
			ovalPath(4.6, -0.4, 0.6, 0.6)
		]
	},
	/** The center of the window: the gift ends there. */
	windowCenter: { x: 0, y: -5 },
	fins: [
		modelled(
			'M-13.4 4C-19.4 7.4 -23.8 15.6 -24.2 28.6C-24.3 32.2 -22 33.6 -19.8 32C-17.4 30.2 -14.8 29.4 -11 29.4Z',
			1.8,
			[
				'M-22 26C-21.6 18.4 -19.2 12.6 -16 9.2C-18.4 13.4 -19.8 19.2 -20.2 26C-20.3 27.6 -22.1 27.6 -22 26Z'
			]
		),
		modelled(
			'M13.4 4C19.4 7.4 23.8 15.6 24.2 28.6C24.3 32.2 22 33.6 19.8 32C17.4 30.2 14.8 29.4 11 29.4Z',
			1.8
		)
	],
	nozzle: modelled(
		'M-8.6 30L8.6 30L10.4 35.4C10.6 36.3 10 36.8 9.2 36.8L-9.2 36.8C-10 36.8 -10.6 36.3 -10.4 35.4Z',
		2,
		[],
		0
	),
	nozzleRim: 'M-9.6 33.2L9.6 33.2',
	/** Three tongues of fire, then lighter and lighter cores, from the nozzle. */
	flame: [
		'M-8.4 35.6C-10.6 41.6 -9 46.6 -6.4 51.2C-5.2 49.6 -4.4 48.2 -4 46.6C-3 52.6 -1.6 58.6 0 65.6C1.6 58.6 3 52.6 4 46.6C4.4 48.2 5.2 49.6 6.4 51.2C9 46.6 10.6 41.6 8.4 35.6Z',
		'M-6.2 35.6C-7.4 40.6 -6 45.6 -3.6 49.6C-2.6 48.6 -2 47.2 -1.8 46C-1.2 50.6 -0.6 54.6 0 58.6C0.6 54.6 1.2 50.6 1.8 46C2 47.2 2.6 48.6 3.6 49.6C6 45.6 7.4 40.6 6.2 35.6Z',
		'M-4 35.6C-4.6 39.6 -3.4 44.2 0 50.6C3.4 44.2 4.6 39.6 4 35.6Z',
		'M-2 35.6C-2.2 38.6 -1.4 41.2 0 44C1.4 41.2 2.2 38.6 2 35.6Z'
	],
	/**
	 * Landing legs. Once landed the rocket stands on the right of the round top of its astre: the
	 * right leg slides out further down the slope, each round foot on the ground.
	 */
	legs: [
		capsulePath(-10.4, 21.6, -14.8, 34.2, 1.5),
		capsulePath(10.4, 21.6, 13.4, 35.6, 1.6),
		capsulePath(13.4, 35, 15.6, 48, 1.05)
	],
	legCollar: ovalPath(13.4, 35.4, 2.1, 1.3),
	footBalls: FOOT_BALLS,
	feet: FOOT_BALLS.map(({ x, y, radius }) => modelled(ovalPath(x, y, radius, radius), 0.9))
} as const;

/* ------------------------------------------------------------------ The astres */

/** An astre in a 100 x 100 box: a planet of radius 30 at its center. */
const C = 50;
/** Radius of the planet of an astre, in its box. */
export const PLANET_RADIUS = 30;
const R = PLANET_RADIUS;

const PLANET_PATH = ovalPath(C, C, R, R);

export const PLANET = {
	d: PLANET_PATH,
	shade: shadeOf(PLANET_PATH, 8, 7),
	/** A long gleam along the lit edge, a small one beside it. */
	lights: [crescentPath(C, C, 24.6, 196, 252, 2.4), ovalPath(31.4, 31.6, 1.4, 1.1)],
	/** Light bounced back on the dark edge. */
	rim: crescentPath(C, C, 27.4, 20, 70, 0.9)
} as const;

/** The halo of an astre reached, and four sparkles around it. */
export const GLOW = {
	d: ovalPath(C, C, 41, 41),
	sparkles: [
		roundedStarPath(12, 14, 5.4, 1.4, 4, 0.3),
		roundedStarPath(89, 18, 4.2, 1.1, 4, 0.3),
		roundedStarPath(90, 84, 5, 1.3, 4, 0.3),
		roundedStarPath(11, 86, 3.8, 1, 4, 0.3)
	]
} as const;

/** The ring of the first look, tilted, cut in a far half (behind the planet) and a near half. */
export const ASTRE_RING = { cx: C, cy: C, rx: 46, ry: 11, angle: -20 } as const;

const RING_INNER = { rx: 35, ry: 6.6 } as const;

export const RING = {
	band: ovalPath(C, C, ASTRE_RING.rx, ASTRE_RING.ry) + ovalPath(C, C, RING_INNER.rx, RING_INNER.ry),
	groove: ovalPath(C, C, 40.6, 8.8),
	/** Kept to the far half or to the near half of the ring, in its own tilted frame. */
	far: `M-10 ${C}L110 ${C}L110 0L-10 0Z`,
	near: `M-10 ${C}L110 ${C}L110 100L-10 100Z`,
	/** The shadow of the planet on the far half of the ring. */
	shadow: ovalPath(C + 8, C - 2, 27, 7.6),
	transform: `rotate(${ASTRE_RING.angle} ${C} ${C})`
} as const;

/** Bands of a gas planet: each follows the roundness of the planet. */
export const BANDS = {
	ringed: [
		'M18 36C30 42 70 42 82 36L84 44C70 50 30 50 16 44Z',
		'M16.6 58C30 63 70 63 83.4 58L81 66C68 70.6 32 70.6 19 66Z'
	],
	striped: [
		'M20 30C32 36 68 36 80 30L82.6 37C68 43.6 32 43.6 17.4 37Z',
		'M16 48C30 54 70 54 84 48L84 55C70 61 30 61 16 55Z',
		'M19 66C32 71 68 71 81 66L77 73.6C64 77.6 36 77.6 23 73.6Z'
	],
	/** The great storm of the striped planet, and its eye. */
	storm: ovalPath(61, 60, 8.4, 4.6),
	stormEye: ovalPath(60, 59.4, 3.8, 1.9)
} as const;

/** Craters of the rocky look: a hollow with a lit lip on the side away from the light. */
export const CRATERS = [
	{ cx: 39, cy: 40, rx: 7.4, ry: 6.4 },
	{ cx: 61.6, cy: 57, rx: 9.2, ry: 8 },
	{ cx: 42, cy: 66, rx: 4.6, ry: 3.8 },
	{ cx: 63, cy: 33, rx: 3.4, ry: 2.8 },
	{ cx: 27.4, cy: 55, rx: 2.8, ry: 2.4 }
].map(({ cx, cy, rx, ry }) => ({
	hollow: ovalPath(cx, cy, rx, ry),
	inner: shadeOf(ovalPath(cx, cy, rx, ry), -rx * 0.36, -ry * 0.36),
	lip: crescentPath(cx, cy, Math.min(rx, ry) * 0.94, 10, 100, Math.min(rx, ry) * 0.16)
}));

/** Patches of the icy look, and its frozen cap. */
export const PATCHES = [
	'M30 44C33 38 41 37 45 41C49 45 46 51 40 51C35 52 28 50 30 44Z',
	'M55 58C58 52 67 52 71 56C75 61 70 67 63 67C57 67 53 63 55 58Z',
	'M36 66C38 63 43 63 44.6 66C46 69 43 72 39.6 71.6C36.6 71.2 35 69 36 66Z',
	'M64 39C65.6 36.6 69 36.6 70.2 39C71.2 41.4 69 43.4 66.6 43.2C64.4 43 63 41.4 64 39Z'
] as const;

export const ICE_CAP =
	'M31 27C38 22.6 62 22.6 69 27C66 31.6 58 33.6 50 33.6C42 33.6 34 31.6 31 27Z';

/** The home planet: oceans, two lands and a few clouds. */
export const HOME = {
	lands: [
		'M24 38C27 31 36 27 42 30C46 32 44 37 48 40C52 43 50 50 44 51C39 52 38 57 33 58C27 59 22 52 22 46C22 43 23 40 24 38Z',
		'M58 60C62 55 70 55 74 58C78 61 77 68 72 72C68 75 64 78 59 77C55 76 56 71 54 68C52 65 55 62 58 60Z',
		'M62 26C65 24 70 25 71 28C72 31 68 33 65 32C62 31 60 28 62 26Z'
	],
	clouds: [
		'M30 66C32 63.4 37 63 40 64.6C43 63.4 47 64.4 47.4 67C44 68.6 34 68.8 30 66Z',
		'M54 40C56 37.8 60 37.6 62.6 38.8C65 37.8 69 38.6 69.4 40.8C66 42 58 42.2 54 40Z'
	]
} as const;

/* ---------------------------------------------------------------- The inhabitant */

/** The inhabitant of an astre in a 60 x 60 box, its feet on the near face of its astre. */
const MID = 41;

const INHABITANT_BODY =
	'M41 12C51.5 12 57.5 20 57.5 30C57.5 37 56.5 43 54.5 47.5C52.5 51.8 47.5 53 41 53C34.5 53 29.5 51.8 27.5 47.5C25.5 43 24.5 37 24.5 30C24.5 20 30.5 12 41 12Z';

function eyeAt(cx: number, cy: number) {
	const lx = cx - 0.5;
	const ly = cy + 0.2;
	return {
		white: ovalPath(cx, cy, 4.3, 4.9),
		iris: ovalPath(lx, ly, 3, 3.4),
		pupil: ovalPath(lx, ly + 0.2, 1.8, 2.1),
		glints: [ovalPath(lx + 1.1, ly - 1.4, 1.05, 1.05), ovalPath(lx - 1, ly + 1.4, 0.5, 0.5)],
		lid: `M${round(cx - 5.4)} ${round(cy - 6)}L${round(cx + 5.4)} ${round(cy - 6)}L${round(cx + 5.4)} ${round(cy - 2.8)}Q${round(cx)} ${round(cy - 4.6)} ${round(cx - 5.4)} ${round(cy - 2.8)}Z`
	};
}

function antenna(from: XY, to: XY) {
	return {
		stalk: capsulePath(from[0], from[1], to[0], to[1], 1.15),
		bobble: modelled(ovalPath(to[0], to[1], 2.7, 2.7), 1),
		glint: ovalPath(to[0] - 0.9, to[1] - 0.9, 0.8, 0.7)
	};
}

const REST_ARM =
	'M27.4 33.4C23.6 35 21 38.8 20.6 43C20.4 45.6 23 46.6 24.6 44.6C25.8 42.2 27 40.4 29 39.2Z';
const RAISED_ARM =
	'M27.6 34C23.4 31.6 21.2 27 21.4 22.4C21.5 20 24.4 19.6 25 21.8C25.4 25.2 27 27.8 29.6 29.4Z';

function armPair(left: string) {
	return [modelled(left, 1.2), modelled(mirrorAt(left, MID), 1.2)] as const;
}

export const INHABITANT_SHAPE = {
	body: modelled(INHABITANT_BODY, 3.2, [
		crescentPath(MID, 31, 14.4, 198, 246, 1.5),
		ovalPath(29.6, 33.4, 0.9, 1.5)
	]),
	belly: modelled(ovalPath(MID, 44, 9.6, 7), 1.4),
	/** Little marks on the top of its head, kept inside it. */
	marks: [ovalPath(49.6, 19, 2, 1.5), ovalPath(53.6, 24, 1.3, 1), ovalPath(32.6, 18.4, 1.4, 1.1)],
	eyes: [eyeAt(35.6, 28.6), eyeAt(46.4, 28.6)],
	brows: ['M32.4 21.8Q35.4 20.4 38.2 21.6', 'M43.8 21.6Q46.6 20.4 49.6 21.8'],
	cheeks: [ovalPath(31.2, 35.2, 2.6, 1.6), ovalPath(50.8, 35.2, 2.6, 1.6)],
	mouth:
		'M37.2 34.8C39.6 35.9 42.4 35.9 44.8 34.8C44.5 38.2 43 39.8 41 39.8C39 39.8 37.5 38.2 37.2 34.8Z',
	tongue: 'M38.9 39.8C38.9 38 39.9 37.2 41 37.2C42.1 37.2 43.1 38 43.1 39.8Z',
	/** Two antennas, or one in the middle: the looks of the astres take turns. */
	antennas: [
		[antenna([35.6, 14.6], [30.6, 4.6]), antenna([46.4, 14.6], [51.4, 4.6])],
		[antenna([MID, 13.6], [43, 2.6])]
	],
	arms: { rest: armPair(REST_ARM), cheer: armPair(RAISED_ARM) },
	feet: [modelled(ovalPath(35.2, 53.4, 5, 2.6), 1), modelled(ovalPath(46.8, 53.4, 5, 2.6), 1)],
	/** Its shadow on the face of the astre, kept on the astre. */
	ground: ovalPath(MID + 1, 55.6, 12.4, 2.6)
} as const;

/** The astre reached, in the box of the inhabitant: its shadow stays on it. */
export const INHABITANT_ASTRE = ovalPath(
	(FLIGHT.destinationX - INHABITANT.x) / INHABITANT.scale,
	(FLIGHT.astreY - INHABITANT.y) / INHABITANT.scale,
	(R * FLIGHT.astreScale) / INHABITANT.scale,
	(R * FLIGHT.astreScale) / INHABITANT.scale
);

/** The hat of a cook, in the box of the inhabitant: it covers the antennas. */
export const TOQUE = {
	puff: modelled(fluffPath(MID, 3, 8.6, 7, 1), 2.2),
	band: modelled('M31.6 16C36 17.6 46 17.6 50.4 16L50.8 9.4C46 10.8 36 10.8 31.2 9.4Z', 1.4),
	folds: 'M37 3.4C36.6 6.4 37 8.6 37.6 10.2M45 3.4C45.4 6.4 45 8.6 44.4 10.2'
} as const;

/* ------------------------------------------------------------------ The sky */

/** Fixed stars of the sky: the same everywhere, every time. */
export const STARS = [
	{ x: 24, y: 28, radius: 1.5 },
	{ x: 58, y: 70, radius: 1 },
	{ x: 128, y: 186, radius: 1.5 },
	{ x: 150, y: 56, radius: 1 },
	{ x: 188, y: 18, radius: 1.5 },
	{ x: 236, y: 84, radius: 1 },
	{ x: 262, y: 34, radius: 1.5 },
	{ x: 290, y: 190, radius: 1 },
	{ x: 344, y: 20, radius: 1 },
	{ x: 372, y: 204, radius: 1.5 },
	{ x: 396, y: 38, radius: 1 },
	{ x: 420, y: 196, radius: 2 },
	{ x: 500, y: 90, radius: 1 },
	{ x: 36, y: 196, radius: 1 },
	{ x: 104, y: 120, radius: 1 },
	{ x: 478, y: 176, radius: 1.5 },
	{ x: 228, y: 150, radius: 1 },
	{ x: 168, y: 98, radius: 1.5 },
	{ x: 312, y: 104, radius: 1 },
	// Beyond the scene, for a picture wider than the scene: the sky goes on to the sides.
	{ x: -18, y: 150, radius: 1 },
	{ x: -40, y: 46, radius: 1.5 },
	{ x: -66, y: 112, radius: 1 },
	{ x: -92, y: 196, radius: 1.5 },
	{ x: -140, y: 80, radius: 1 },
	{ x: -170, y: 164, radius: 1.5 },
	{ x: -196, y: 14, radius: 1 },
	{ x: -248, y: 58, radius: 1 },
	{ x: -276, y: 200, radius: 1 },
	{ x: -302, y: 92, radius: 1.5 },
	{ x: -330, y: 26, radius: 1 },
	{ x: -384, y: 66, radius: 1 },
	{ x: -412, y: 188, radius: 1.5 },
	{ x: -436, y: 108, radius: 1 },
	{ x: 538, y: 140, radius: 1.5 },
	{ x: 556, y: 40, radius: 1 },
	{ x: 584, y: 196, radius: 1 },
	{ x: 632, y: 18, radius: 1 },
	{ x: 658, y: 128, radius: 1.5 },
	{ x: 684, y: 182, radius: 1 },
	{ x: 712, y: 50, radius: 1.5 },
	{ x: 738, y: 104, radius: 1 },
	{ x: 790, y: 28, radius: 1 },
	{ x: 818, y: 88, radius: 1.5 },
	{ x: 846, y: 160, radius: 1 },
	{ x: 900, y: 120, radius: 1 },
	{ x: 928, y: 198, radius: 1.5 },
	{ x: 954, y: 62, radius: 1 }
] as const;

/** Bigger stars that sparkle with four points, still. */
export const TWINKLES = [
	{ x: 96, y: 22, radius: 4.6 },
	{ x: 318, y: 62, radius: 3.6 },
	{ x: 210, y: 200, radius: 4 },
	{ x: 486, y: 24, radius: 3.8 },
	{ x: 30, y: 128, radius: 3 },
	{ x: -118, y: 30, radius: 4.4 },
	{ x: -222, y: 122, radius: 3.6 },
	{ x: -356, y: 150, radius: 4 },
	{ x: 606, y: 76, radius: 4.2 },
	{ x: 764, y: 206, radius: 3.6 },
	{ x: 872, y: 42, radius: 4.4 }
].map(({ x, y, radius }) => roundedStarPath(x, y, radius, radius * 0.26, 4, 0.3));

/** Soft clouds of light far away, and the dotted way from one astre to the next. */
export const NEBULAS = [
	{ cx: 160, cy: 206, rx: 210, ry: 54, tone: 'a' },
	{ cx: 400, cy: 14, rx: 190, ry: 44, tone: 'b' },
	{ cx: -210, cy: 60, rx: 200, ry: 52, tone: 'b' },
	{ cx: 720, cy: 180, rx: 210, ry: 50, tone: 'a' }
] as const;

export const ROUTE = `M${FLIGHT.departureX + 48} ${FLIGHT.astreY}L${FLIGHT.destinationX - 48} ${FLIGHT.astreY}`;

/* ------------------------------------------------------------- Scene props */

/** A little cloud of smoke, three puffs. */
export const COUGH_PUFFS = [
	{ x: 0, y: 0, radius: 11 },
	{ x: -13, y: -8, radius: 8 },
	{ x: -9, y: 9, radius: 7 }
] as const;

export const PUFF_LIGHTS = [
	crescentPath(0, 0, 7.4, 200, 250, 1.4),
	crescentPath(-13, -8, 5, 200, 250, 1.1)
] as const;

/** A puff of smoke shaped like a heart, centered on (0, 0), and two little puffs leading to it. */
const HEART_PATH =
	'M0 12C-10 6 -17 0 -17 -7C-17 -13 -12 -16 -8 -16C-4 -16 -1 -13 0 -10C1 -13 4 -16 8 -16C12 -16 17 -13 17 -7C17 0 10 6 0 12Z';

export const HEART = modelled(HEART_PATH, 2.6, [
	crescentPath(-8, -7.4, 6, 200, 262, 1.3),
	ovalPath(9.6, -10.4, 1.4, 1)
]);

export const HEART_PUFFS = [
	{ x: 22, y: 8, radius: 4 },
	{ x: 30, y: 13, radius: 2.5 }
] as const;

/** A sleepy comet, head on (0, 0), its tail towards the top right. */
export const COMET = {
	tail: [
		'M0 -8C14 -14 40 -22 70 -24C54 -15 52 -8 72 -2C52 0 48 6 64 14C40 10 16 8 0 8Z',
		'M0 -5.6C14 -10 34 -15 56 -16C43 -9.6 42 -5 58 -1.4C42 0 39 4 50 9C34 7 14 6 0 5.6Z',
		'M0 -3.4C12 -6 26 -8 40 -8.6C31 -4.6 31 -2 42 -0.6C30 0.4 28 2.6 34 5C24 4 12 3.6 0 3.4Z'
	],
	sparkles: [roundedStarPath(44, -15, 2.6, 0.7, 4, 0.3), roundedStarPath(58, 6, 2, 0.55, 4, 0.3)],
	head: modelled(ovalPath(0, 0, 8, 8), 2, [crescentPath(0, 0, 6, 196, 250, 1.1)]),
	eyes: ['M-4.6 -1.2Q-3.1 0.3 -1.6 -1.2', 'M1.6 -1.2Q3.1 0.3 4.6 -1.2'],
	cheeks: [ovalPath(-4.8, 1.8, 1.3, 0.8), ovalPath(4.8, 1.8, 1.3, 0.8)],
	mouth: 'M-1.6 2.6Q0 3.8 1.6 2.6'
} as const;

/** A cow in a space helmet, facing right, centered on (0, 0), floating with its legs spread. */
const COW_BODY =
	'M-21 -6C-21 -15 -14 -18.6 -3 -18.6C8 -18.6 17 -17.4 19.6 -9C21.6 -1.6 19.6 7.4 12 10.2C3 13 -8 13 -14.4 10.6C-20.4 8.4 -21.4 1.6 -21 -6Z';

function cowLeg(from: XY, to: XY) {
	const leg = capsulePath(from[0], from[1], to[0], to[1], 2.4);
	const dx = to[0] - from[0];
	const dy = to[1] - from[1];
	const length = Math.hypot(dx, dy) || 1;
	const hx = to[0] + (dx / length) * 0.6;
	const hy = to[1] + (dy / length) * 0.6;
	return {
		leg: modelled(leg, 0.9),
		hoof: capsulePath(hx - (dx / length) * 1.6, hy - (dy / length) * 1.6, hx, hy, 2.6)
	};
}

export const COW = {
	tail: 'M-20 -6C-25 -6 -28.6 -9 -28.4 -14.4',
	tuft: modelled(fluffPath(-28.4, -16, 2.2, 5, 0.6), 0.8),
	/** Hind legs behind the body, front legs too: the body is drawn over their roots. */
	legs: [
		cowLeg([-14, 6], [-19.6, 17]),
		cowLeg([-6, 9], [-7.6, 20]),
		cowLeg([6, 9], [8.6, 20]),
		cowLeg([13, 5], [19.4, 15.4])
	],
	udder: modelled('M-4.6 9.6C-4.6 14 -2.4 16 0 16C2.4 16 4.6 14 4.6 9.6Z', 1),
	teats: 'M-2.2 15.4L-2.4 17.6M0 16L0 18.2M2.2 15.4L2.4 17.6',
	body: modelled(COW_BODY, 3, [crescentPath(-4, -2, 14, 205, 250, 1.4)]),
	spots: [
		'M-17 -14C-12 -16.6 -6 -15 -6 -10C-6 -4.6 -11 -3 -15 -5C-18.6 -7 -20 -12 -17 -14Z',
		'M3 -2C7 -5 13 -3.6 14 1C15 5.6 10 8.4 6 7.6C2 6.8 0 1 3 -2Z',
		'M8 -18.6C11 -16 15 -16 17 -18L17 -20L8 -20Z',
		'M-20 4C-17 3 -14 5 -14.6 8.6C-15 11 -18.6 11.4 -20.6 9Z'
	],
	collar: modelled(capsulePath(14.4, -5.6, 30.4, -1.8, 2.3), 1),
	ear: modelled('M20.4 -16.4C16.6 -19.6 12 -19.6 11 -17.6C12.4 -15 16.6 -13.6 20.6 -13.4Z', 0.8),
	earInside: 'M18.6 -15.6C16.2 -17.4 13.6 -17.6 12.8 -17C13.8 -15.6 16.4 -14.6 18.8 -14.4Z',
	horns: [
		modelled('M22 -20.6C20.4 -24.8 21.4 -28.6 24.8 -30.2C24 -27 24.4 -24 26.2 -21.4Z', 0.8),
		modelled('M32.4 -20.6C34 -24.8 33 -28.6 29.6 -30.2C30.4 -27 30 -24 28.2 -21.4Z', 0.8)
	],
	head: modelled(
		'M28 -23C34 -23 37.4 -19 37.4 -14.4C37.4 -10 34.6 -7 28 -7C21.4 -7 18.6 -10 18.6 -14.4C18.6 -19 22 -23 28 -23Z',
		2
	),
	snout: modelled(ovalPath(31.6, -9.8, 6.4, 4.6), 1.2),
	nostrils: [ovalPath(29.4, -9.8, 0.9, 1.2), ovalPath(33.8, -9.8, 0.9, 1.2)],
	/** Eyes closed and content: it likes floating. */
	eyes: ['M22.4 -16.2Q24 -14.6 25.6 -16.2', 'M30 -16.4Q31.6 -14.8 33.2 -16.4'],
	cheek: ovalPath(22.6, -12.6, 1.6, 1),
	helmet: ovalPath(28, -14.4, 15.4, 15.4),
	helmetLights: [crescentPath(28, -14.4, 12.6, 200, 252, 1.8), ovalPath(17.6, -10, 1, 1.6)]
} as const;

/** The star of the sky that puts on sunglasses (one of the twinkles), in its own units. */
export const COOL_STAR = { x: 262, y: 34, scale: 2.7 } as const;

export const COOL = {
	star: modelled(roundedStarPath(0, 0, 10, 5.2, 5, 0.26), 1.6, [
		crescentPath(0, -1, 4.6, 205, 255, 0.8)
	]),
	eyes: ['M-3.8 -0.8Q-2.6 -2.2 -1.4 -0.8', 'M1.4 -0.8Q2.6 -2.2 3.8 -0.8'],
	mouth: 'M-2.2 2.4Q0 4.4 2.2 2.4',
	lenses: [
		'M-6 -3L-0.8 -3L-1.1 0.4Q-1.6 2.2 -3.6 2.2Q-5.6 2.2 -5.9 0.4Z',
		'M0.8 -3L6 -3L5.9 0.4Q5.6 2.2 3.6 2.2Q1.6 2.2 1.1 0.4Z'
	],
	bridge: 'M-0.8 -2.4Q0 -3 0.8 -2.4',
	glints: ['M-4.8 -1.9L-3.4 -1.9', 'M2 -1.9L3.4 -1.9']
} as const;

/** A wrapped present centered on (0, 0). */
export const GIFT = {
	box: modelled('M-5 -2.4L5 -2.4L5 5.2Q5 6 4.2 6L-4.2 6Q-5 6 -5 5.2Z', 1.4),
	lid: modelled(
		'M-6 -5.4L6 -5.4Q6.6 -5.4 6.6 -4.8L6.6 -2.2Q6.6 -1.6 6 -1.6L-6 -1.6Q-6.6 -1.6 -6.6 -2.2L-6.6 -4.8Q-6.6 -5.4 -6 -5.4Z',
		1
	),
	ribbon: ['M-1.1 -2.4L1.1 -2.4L1.1 6L-1.1 6Z', 'M-1.1 -5.4L1.1 -5.4L1.1 -1.6L-1.1 -1.6Z'],
	bow: [
		'M0 -5.4C-1.4 -9.4 -5.8 -10.2 -5.6 -7.6C-5.4 -5.8 -2.6 -5.4 0 -5.4Z',
		'M0 -5.4C1.4 -9.4 5.8 -10.2 5.6 -7.6C5.4 -5.8 2.6 -5.4 0 -5.4Z'
	],
	knot: ovalPath(0, -5.6, 1.4, 1.1),
	lights: [ovalPath(-3.4, -4.4, 1.6, 0.5), ovalPath(-3.4, 0.6, 0.6, 1.8)]
} as const;

/** A sparkle of the fireworks, on the center of the astre reached; the scene sends it out. */
export const SPARK = roundedStarPath(FLIGHT.destinationX, FLIGHT.astreY, 6.4, 1.8, 4, 0.3);

/** A little flying car facing right, centered on the middle of its body. */
export const CAR = {
	scale: 1.4,
	start: { x: -200, y: 186 },
	body: modelled(
		'M-19 4.6C-19.6 1 -18.4 -2.4 -14.6 -3.2L-9.4 -3.8C-7.4 -7.4 -4 -9.6 0.6 -9.6C5.4 -9.6 8.6 -7.4 10.8 -3.8L15.6 -3.2C19 -2.6 20.6 0.4 20.2 4C19.9 6.4 18.4 7.6 16 7.6L-16 7.6C-17.8 7.6 -18.8 6.4 -19 4.6Z',
		1.6,
		['M-15.4 -1.2C-11 -2.4 4 -2.6 15.2 -1.6C10 -1 -6 -0.8 -15.4 -0.2Z'],
		2.2
	),
	window: 'M-6.6 -3.9C-5.2 -6.6 -2.8 -8 0.4 -8C3.4 -8 5.8 -6.6 7.6 -3.9Z',
	windowShine: 'M-3.8 -4.6L-1.4 -7.2L0.2 -7.2L-2.2 -4.6Z',
	pillar: 'M0.8 -8L0.8 -3.9',
	trim: 'M-16.6 2.4C-6 3.4 6 3.4 18.4 2.4',
	headlight: ovalPath(18.4, 0.6, 1.4, 1.8),
	tailLight: ovalPath(-18.2, 1.2, 1, 1.6),
	wheels: [
		{ cx: -10, cy: 7.4 },
		{ cx: 10.6, cy: 7.4 }
	],
	wheelRadius: 4.4,
	hubRadius: 1.9,
	spokePath: 'M-2.8 0L2.8 0M0 -2.8L0 2.8',
	trails: ['M-24 -1L-38 -1', 'M-24 3.5L-46 3.5', 'M-24 8L-35 8']
} as const;

/** A small hot dish, centered on the middle of its plate; the steam rises above it. */
export const DISH = {
	spot: { x: 438, y: 110 },
	plate: modelled(ovalPath(0, 0, 15, 4.6), 0, [], -1.6),
	well: ovalPath(0, -0.8, 10.6, 2.6),
	cake: modelled('M-10 -1C-10 -9 -5.5 -13 0 -13C5.5 -13 10 -9 10 -1Z', 2.2, [
		crescentPath(-1, -1, 9, 205, 245, 1.2)
	]),
	icing: modelled(
		'M-9.4 -6.4C-8 -11.6 -4.4 -13 0 -13C4.4 -13 8 -11.6 9.4 -6.4C8.2 -5.2 7 -6.6 6 -5.4C5 -4.2 3.6 -6 2.4 -5.2C1 -4.2 -0.4 -6.2 -1.8 -5.2C-3.2 -4 -4.4 -6.4 -5.8 -5.2C-7 -4.2 -8.2 -6 -9.4 -6.4Z',
		1
	),
	cherry: modelled(ovalPath(0, -14.6, 2.6, 2.4), 0.8),
	cherryGlint: ovalPath(-0.9, -15.4, 0.8, 0.6),
	stem: 'M0.4 -16.8C0.8 -18.8 2 -20 3.6 -20.6',
	wisps: ['M-4.6 -21C-6.6 -24 -2.6 -26 -4.6 -30', 'M3 -23C1 -26 5 -28 3 -32']
} as const;

/** The ring of an astre cut in two, centered on (0, 0): the far half goes behind the planet. */
export const HOOP_BACK_PATH = `M${-ASTRE_RING.rx} 0A${ASTRE_RING.rx} ${ASTRE_RING.ry} 0 0 1 ${ASTRE_RING.rx} 0`;
export const HOOP_FRONT_PATH = `M${ASTRE_RING.rx} 0A${ASTRE_RING.rx} ${ASTRE_RING.ry} 0 0 1 ${-ASTRE_RING.rx} 0`;

/**
 * Where the baby dino sits, in the drawing of the rocket: on its roof in flight, on its right fin once
 * landed (the roof is out of the sky).
 */
export const DINO_SEATS = { flying: { x: -15.4, y: -2 }, landed: { x: 18.6, y: 15 } } as const;

/** The baby dino of the egg game, shrunk; its seat is the middle of its bottom. */
export const DINO = { scale: 0.33, seat: { x: 60, y: 127 } } as const;

/** Exported for the picture of the game. */
export const PICTURE = {
	sparkles: [
		roundedStarPath(-38, -40, 6.4, 1.7, 4, 0.3),
		roundedStarPath(42, -46, 4.4, 1.2, 4, 0.3),
		roundedStarPath(48, 18, 3.6, 1, 4, 0.3)
	],
	trail: [ovalPath(-28, 40, 7, 7), ovalPath(-38, 46, 5, 5), ovalPath(-45, 52, 3.4, 3.4)]
} as const;
