/** Drawing data of the astres, the rocket and the inhabitants. Each shape has its own local box. */

/** Short strokes around a lit astre (box 100 x 100, planet of radius 30 at its center). */
export const RAYS = [
	'M88 50L97 50',
	'M76.9 76.9L83.2 83.2',
	'M50 88L50 97',
	'M23.1 76.9L16.8 83.2',
	'M12 50L3 50',
	'M23.1 23.1L16.8 16.8',
	'M50 12L50 3',
	'M76.9 23.1L83.2 16.8'
] as const;

export const ASTRE_RING = { cx: 50, cy: 50, rx: 46, ry: 11, angle: -20 } as const;

export const ASTRE_CRATERS = [
	{ x: 40, y: 42, radius: 6 },
	{ x: 60, y: 56, radius: 8 },
	{ x: 46, y: 64, radius: 4 }
] as const;

export const ASTRE_STRIPES = ['M22 42Q50 52 78 42', 'M21 58Q50 68 79 58'] as const;

export const ASTRE_SPOTS = [
	{ x: 38, y: 40, radius: 5 },
	{ x: 62, y: 46, radius: 4 },
	{ x: 50, y: 64, radius: 6 }
] as const;

/** The rocket, nose up, centered on (0, 0). */
export const ROCKET_BODY_PATH = 'M0 -36C16 -22 15 12 13 30L-13 30C-15 12 -16 -22 0 -36Z';
export const ROCKET_FIN_PATHS = ['M-13 8L-27 32L-13 26Z', 'M13 8L27 32L13 26Z'] as const;
export const ROCKET_BAND_PATH = 'M-14 16L14 16';
export const ROCKET_WINDOW = { cx: 0, cy: -8, radius: 8 } as const;
export const ROCKET_FLAME_OUTER_PATH = 'M-9 30Q0 62 9 30Z';
export const ROCKET_FLAME_INNER_PATH = 'M-4.5 30Q0 48 4.5 30Z';
export const ROCKET_LEG_PATHS = [
	'M-12 22L-22 38',
	'M12 22L22 38',
	'M-27 38L-17 38',
	'M17 38L27 38'
] as const;

/** A little cloud of smoke, three puffs. */
export const COUGH_PUFFS = [
	{ x: 0, y: 0, radius: 11 },
	{ x: -13, y: -8, radius: 8 },
	{ x: -9, y: 9, radius: 7 }
] as const;

/** The inhabitant of an astre, in a 60 x 60 box. */
export const INHABITANT_BODY_PATH = 'M10 52C10 28 20 16 30 16C40 16 50 28 50 52Z';
export const INHABITANT_ANTENNA_PATHS = ['M23 18L18 6', 'M37 18L42 6'] as const;
export const INHABITANT_TIPS = [
	{ x: 18, y: 6 },
	{ x: 42, y: 6 }
] as const;
export const INHABITANT_EYES = [
	{ x: 23, y: 34 },
	{ x: 37, y: 34 }
] as const;
export const INHABITANT_MOUTH_PATH = 'M24 44Q30 50 36 44';

/** Fixed stars of the sky: the same everywhere, every time. */
export const STARS = [
	{ x: 24, y: 28, radius: 1.5 },
	{ x: 58, y: 70, radius: 1 },
	{ x: 96, y: 22, radius: 2 },
	{ x: 128, y: 186, radius: 1.5 },
	{ x: 150, y: 56, radius: 1 },
	{ x: 188, y: 18, radius: 1.5 },
	{ x: 210, y: 200, radius: 2 },
	{ x: 236, y: 84, radius: 1 },
	{ x: 262, y: 34, radius: 1.5 },
	{ x: 290, y: 190, radius: 1 },
	{ x: 318, y: 62, radius: 2 },
	{ x: 344, y: 20, radius: 1 },
	{ x: 372, y: 204, radius: 1.5 },
	{ x: 396, y: 38, radius: 1 },
	{ x: 420, y: 196, radius: 2 },
	{ x: 486, y: 24, radius: 1.5 },
	{ x: 500, y: 90, radius: 1 },
	{ x: 36, y: 196, radius: 1 },
	{ x: 104, y: 120, radius: 1 },
	{ x: 478, y: 176, radius: 1.5 },
	// Beyond the scene, for a picture wider than the scene: the sky goes on to the sides.
	{ x: -18, y: 150, radius: 1 },
	{ x: -40, y: 46, radius: 1.5 },
	{ x: -66, y: 112, radius: 1 },
	{ x: -92, y: 196, radius: 1.5 },
	{ x: -118, y: 30, radius: 2 },
	{ x: -140, y: 80, radius: 1 },
	{ x: -170, y: 164, radius: 1.5 },
	{ x: -196, y: 14, radius: 1 },
	{ x: -222, y: 122, radius: 2 },
	{ x: -248, y: 58, radius: 1 },
	{ x: -276, y: 200, radius: 1 },
	{ x: -302, y: 92, radius: 1.5 },
	{ x: -330, y: 26, radius: 1 },
	{ x: -356, y: 150, radius: 2 },
	{ x: -384, y: 66, radius: 1 },
	{ x: -412, y: 188, radius: 1.5 },
	{ x: -436, y: 108, radius: 1 },
	{ x: 538, y: 140, radius: 1.5 },
	{ x: 556, y: 40, radius: 1 },
	{ x: 584, y: 196, radius: 1 },
	{ x: 606, y: 76, radius: 2 },
	{ x: 632, y: 18, radius: 1 },
	{ x: 658, y: 128, radius: 1.5 },
	{ x: 684, y: 182, radius: 1 },
	{ x: 712, y: 50, radius: 1.5 },
	{ x: 738, y: 104, radius: 1 },
	{ x: 764, y: 206, radius: 2 },
	{ x: 790, y: 28, radius: 1 },
	{ x: 818, y: 88, radius: 1.5 },
	{ x: 846, y: 160, radius: 1 },
	{ x: 872, y: 42, radius: 2 },
	{ x: 900, y: 120, radius: 1 },
	{ x: 928, y: 198, radius: 1.5 },
	{ x: 954, y: 62, radius: 1 }
] as const;

/** A five-pointed star centered on (0, 0), outer radius 10. */
export const STAR_PATH =
	'M0 -10L2.9 -4L9.5 -3.1L4.8 1.5L5.9 8.1L0 5L-5.9 8.1L-4.8 1.5L-9.5 -3.1L-2.9 -4Z';

/** The ring of an astre cut in two, centered on (0, 0): the far half goes behind the planet. */
export const HOOP_BACK_PATH = `M${-ASTRE_RING.rx} 0A${ASTRE_RING.rx} ${ASTRE_RING.ry} 0 0 1 ${ASTRE_RING.rx} 0`;
export const HOOP_FRONT_PATH = `M${ASTRE_RING.rx} 0A${ASTRE_RING.rx} ${ASTRE_RING.ry} 0 0 1 ${-ASTRE_RING.rx} 0`;

/** A puff of smoke shaped like a heart, centered on (0, 0), and two little puffs leading to it. */
export const HEART_PATH =
	'M0 12C-10 6 -17 0 -17 -7C-17 -13 -12 -16 -8 -16C-4 -16 -1 -13 0 -10C1 -13 4 -16 8 -16C12 -16 17 -13 17 -7C17 0 10 6 0 12Z';
export const HEART_PUFFS = [
	{ x: 22, y: 8, radius: 4 },
	{ x: 30, y: 13, radius: 2.5 }
] as const;

/** A comet with a sleepy face, head on (0, 0), tail towards the top right. */
export const COMET_TAIL_PATH = 'M2 -7Q32 -16 66 -20Q46 -9 70 -6Q44 0 62 9Q32 7 2 7Z';
export const COMET_HEAD_RADIUS = 8;
export const COMET_EYE_PATHS = ['M-4 -1Q-2.5 0.5 -1 -1', 'M1 -1Q2.5 0.5 4 -1'] as const;
export const COMET_MOUTH_PATH = 'M-2 2.5Q0 4 2 2.5';

/** A cow in a space helmet, facing right, centered on (0, 0). */
export const COW = {
	tailPath: 'M-22 -4Q-32 -3 -31 -14',
	tuft: { x: -31, y: -15, radius: 3 },
	legPaths: ['M-15 10L-18 20', 'M-6 11L-6 21', 'M7 11L7 21', 'M15 10L18 20'],
	hooves: [
		{ x: -18, y: 21 },
		{ x: -6, y: 22 },
		{ x: 7, y: 22 },
		{ x: 18, y: 21 }
	],
	bodyPath: 'M-22 -6Q-22 -16 -10 -16L12 -16Q22 -16 22 -4L22 3Q22 12 12 12L-12 12Q-22 12 -22 2Z',
	spotPaths: [
		'M-15 -13Q-8 -15 -6 -9Q-8 -2 -14 -4Q-19 -8 -15 -13Z',
		'M3 0Q10 -3 13 3Q11 10 4 9Q-1 5 3 0Z'
	],
	earPath: 'M21 -17L14 -21L19 -12Z',
	hornPaths: ['M24 -21L22 -26', 'M32 -21L34 -26'],
	head: { cx: 28, cy: -14, rx: 9, ry: 8 },
	snout: { cx: 33, cy: -9, rx: 6, ry: 4.5 },
	nostrils: [
		{ x: 31, y: -9 },
		{ x: 35, y: -9 }
	],
	eye: { x: 27, y: -17 },
	helmet: { cx: 28, cy: -13, radius: 16 },
	glintPath: 'M18 -21Q21 -26 27 -27',
	collarPath: 'M16 -4Q28 6 40 -4'
} as const;

/** The star of the sky that puts on sunglasses (one of `STARS`); its face is in the units of `STAR_PATH`. */
export const COOL_STAR = { x: 262, y: 34, scale: 2.7 } as const;
export const COOL_STAR_EYE_PATHS = [
	'M-3.8 -0.8Q-2.6 -2.2 -1.4 -0.8',
	'M1.4 -0.8Q2.6 -2.2 3.8 -0.8'
] as const;
export const COOL_STAR_MOUTH_PATH = 'M-2 2.6Q0 4.4 2 2.6';
export const SUNGLASSES_LENS_PATHS = [
	'M-5.8 -2.8L-0.8 -2.8L-1.2 0.6Q-3.2 2.4 -5.2 0.6Z',
	'M0.8 -2.8L5.8 -2.8L5.2 0.6Q3.2 2.4 1.2 0.6Z'
] as const;
export const SUNGLASSES_BRIDGE_PATH = 'M-0.8 -2.2L0.8 -2.2';
export const SUNGLASSES_GLINT_PATH = 'M-4.6 -1.8L-3.4 -1.8';

/** A baby dino in a 40 x 40 box, feet on the bottom edge: it climbs aboard the rocket. */
export const DINO = {
	scale: 1,
	feet: { x: 20, y: 38 },
	tailPath: 'M30 30Q39 30 40 37Q33 37 29 34Z',
	body: { cx: 20, cy: 29, rx: 11, ry: 9 },
	footEllipses: [
		{ cx: 14, cy: 37.5, rx: 4.2, ry: 2.3 },
		{ cx: 26, cy: 37.5, rx: 4.2, ry: 2.3 }
	],
	restingArmPath: 'M29 27C32 27 34.5 29 35 32C33 33 30 32 28 30Z',
	wavingArmPath: 'M11 27C6 26 3 21 3 16C3 13 7 13 7 16C7 20 9 22 12 23Z',
	platePaths: ['M13 8L15 1.5L19 6.5Z', 'M18 5L21 -1L24 5Z', 'M23 6.5L26 1.5L28 8Z'],
	head: { cx: 20, cy: 14, radius: 9.5 },
	eyes: [
		{ x: 15.5, y: 13 },
		{ x: 24.5, y: 13 }
	],
	cheeks: [
		{ x: 11.5, y: 18 },
		{ x: 28.5, y: 18 }
	],
	mouthPath: 'M17 18Q20 21.5 23 18'
} as const;

/**
 * Where the baby dino sits, in the drawing of the rocket: on its roof in flight, on its right fin once
 * landed (the roof is out of the sky).
 */
export const DINO_SEATS = { flying: { x: -15, y: -2 }, landed: { x: 17, y: 14 } } as const;

/** The hat of a cook, in the 60 x 60 box of an inhabitant: it covers the antennas. */
export const TOQUE = {
	puffs: [
		{ cx: 20, cy: 9, radius: 6.5 },
		{ cx: 30, cy: 4, radius: 8 },
		{ cx: 40, cy: 9, radius: 6.5 }
	],
	bandPath: 'M20 21L40 21L39 11L21 11Z'
} as const;

/** A small hot dish, centered on the middle of its plate; the steam is three puffs above it. */
export const DISH = {
	spot: { x: 428, y: 101 },
	plate: { cx: 0, cy: 0, rx: 15, ry: 5 },
	foodPath: 'M-10.5 -0.7Q-10.5 -12.6 0 -12.6Q10.5 -12.6 10.5 -0.7Z',
	garnish: { cx: 0, cy: -12.6, radius: 2.6 },
	steamPuffs: [
		{ x: -4, y: -21, radius: 3.4 },
		{ x: 4, y: -28, radius: 2.9 },
		{ x: -1, y: -35, radius: 2.4 }
	]
} as const;

/** A little car facing right, centered on the middle of its body; it starts left of the scene, out of sight on most screens. */
export const CAR = {
	scale: 1.4,
	start: { x: -200, y: 186 },
	bodyPath: 'M-18 7L-18 0Q-18 -3 -14 -3L-9 -3L-5 -9L6 -9L11 -3L16 -3Q20 -3 20 1L20 7Z',
	windowPaths: ['M-4.5 -3.5L-1.5 -7.2L2 -7.2L2 -3.5Z', 'M4 -3.5L4 -7.2L6 -7.2L9 -3.5Z'],
	headlight: { cx: 18.5, cy: 0.5, radius: 1.8 },
	wheels: [
		{ cx: -10, cy: 7 },
		{ cx: 11, cy: 7 }
	],
	wheelRadius: 4.5,
	hubRadius: 1.4,
	spokePath: 'M-3 0L3 0',
	trailPaths: ['M-23 -1L-38 -1', 'M-23 3.5L-46 3.5', 'M-23 8L-35 8']
} as const;
