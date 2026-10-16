/** Drawings of the tower scene that are not blocks. All are in the units of the scene. */

/** Baby dinosaur, facing right, its feet on the origin. */
export const DINO = {
	scale: 1.35,
	tailPath: 'M -9 -13 Q -22 -13 -29 -3 Q -17 -5 -8 -5 Z',
	body: { cx: 0, cy: -12, rx: 13, ry: 9 },
	belly: { cx: 3, cy: -9, rx: 8, ry: 5 },
	legs: [
		{ x: -8, y: -6, width: 6, height: 6, rx: 2 },
		{ x: 3, y: -6, width: 6, height: 6, rx: 2 }
	],
	plates: [
		'M -9 -19 L -6 -26 L -3 -20 Z',
		'M -3 -20 L 0 -27 L 3 -20 Z',
		'M 3 -20 L 6 -26 L 9 -19 Z'
	],
	head: { cx: 12, cy: -23, r: 8 },
	eye: { cx: 14.5, cy: -25, r: 1.8 },
	cheek: { cx: 11, cy: -20, r: 2 },
	smilePath: 'M 14 -19 Q 17 -18 19 -20'
} as const;

/** Small rocket flying sideways, nose to the left, with the ropes that hold the block below it. */
export const ROCKET = {
	bodyPath: 'M -24 0 Q -12 -9 10 -8 L 14 -8 L 14 8 L 10 8 Q -12 9 -24 0 Z',
	finPaths: ['M 6 -8 L 16 -15 L 16 -8 Z', 'M 6 8 L 16 15 L 16 8 Z'],
	window: { cx: -6, cy: -1, r: 3.5 },
	flameOuterPath: 'M 14 -5 L 28 0 L 14 5 Z',
	flameInnerPath: 'M 14 -2.5 L 22 0 L 14 2.5 Z',
	/** Where the ropes leave the belly, relative to the rocket. */
	scale: 1.4,
	belly: 9,
	ropeSpread: 11,
	ropeLength: 8
} as const;

export const CLOUD = {
	path: 'M 420 56 Q 404 56 408 44 Q 412 34 424 38 Q 428 24 444 28 Q 456 18 468 30 Q 484 28 484 44 Q 494 56 478 56 Z'
} as const;

/** Little tufts of grass on the ground, x only. */
export const TUFTS = [50, 118, 196, 478] as const;

/** Lines that fly off the block when it snaps into place: side (-1 left, 1 right), share of its height, direction. */
export const SPARKS = [
	{ side: -1, rise: 0.85, dx: -10, dy: -6 },
	{ side: -1, rise: 0.15, dx: -11, dy: 5 },
	{ side: 1, rise: 0.85, dx: 10, dy: -6 },
	{ side: 1, rise: 0.15, dx: 11, dy: 5 }
] as const;

/** Lines left behind by a block that slides in: share of its height above its bottom. */
export const SPEED_LINES = [0.25, 0.5, 0.75] as const;
