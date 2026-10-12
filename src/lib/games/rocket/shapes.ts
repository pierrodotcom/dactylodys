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
	{ x: 478, y: 176, radius: 1.5 }
] as const;
