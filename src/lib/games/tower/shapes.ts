/**
 * Drawings of the tower scene that are not blocks, in the units of the scene (520 x 240), lit
 * from the top left. Small drawings (flag, rocket, magnet, puffs, trees, cone) are given around
 * their own origin and placed by the scene.
 */
import { capsule, inset, latticeHoles, oval, roundedPolygon, type XY } from './block-art';
import { GROUND_Y, SCENE } from './blocks';

function round(value: number): number {
	const rounded = Math.round(value * 100) / 100;
	return Object.is(rounded, -0) ? 0 : rounded;
}

function rect(x: number, y: number, width: number, height: number, radius = 0): string {
	return roundedPolygon(
		[
			[x, y],
			[x + width, y],
			[x + width, y + height],
			[x, y + height]
		],
		[radius, radius, radius, radius]
	);
}

/** A four-branch twinkle centred on (x, y). */
export function twinkle(x: number, y: number, size: number): string {
	const p = (dx: number, dy: number) => `${round(x + dx)} ${round(y + dy)}`;
	return `M${p(0, -size)}Q${p(0, 0)} ${p(size, 0)}Q${p(0, 0)} ${p(0, size)}Q${p(0, 0)} ${p(-size, 0)}Q${p(0, 0)} ${p(0, -size)}Z`;
}

/* ------------------------------------------------------------------ Sky */

export const SUN = { cx: 54, cy: 42, r: 13 } as const;

export const SUN_DISC = oval(SUN.cx, SUN.cy, SUN.r, SUN.r);
export const SUN_SHADE = `M${SUN.cx + SUN.r} ${SUN.cy}A${SUN.r} ${SUN.r} 0 0 1 ${SUN.cx - SUN.r * 0.7} ${round(SUN.cy + SUN.r * 0.71)}C${SUN.cx - 2} ${SUN.cy + 6} ${SUN.cx + 7} ${SUN.cy + 1} ${SUN.cx + SUN.r} ${SUN.cy}Z`;
export const SUN_LIGHT = oval(SUN.cx - 4.6, SUN.cy - 4.6, 3.4, 2.2);

/** Short rays all around the sun: they show by day only. */
export const SUN_RAYS = Array.from({ length: 8 }, (_, index) => {
	const angle = (Math.PI * 2 * index) / 8 + Math.PI / 8;
	const at = (r: number): XY => [SUN.cx + r * Math.cos(angle), SUN.cy + r * Math.sin(angle)];
	return capsule(at(SUN.r + 4.5), at(SUN.r + 9), 3);
}).join('');

/** Stars that show at night only (dark theme). */
export const NIGHT_STARS = [
	twinkle(26, 20, 3),
	twinkle(118, 14, 2.4),
	twinkle(196, 46, 2.8),
	twinkle(286, 16, 2.4),
	twinkle(420, 58, 2.6),
	twinkle(232, 82, 2)
].join('');

/** A cloud around its own origin, flat underneath. */
export const CLOUD =
	'M-26 0C-33 0 -34 -9 -27 -11C-27 -18 -18 -21 -12 -17C-9 -25 4 -27 9 -19C13 -23 22 -21 23 -14C30 -14 33 -4 27 0Z';
export const CLOUD_SHADE =
	'M-29 -3C-25 -1 -20 -2.6 -16 -5C-10 -1 0 -1 6 -5C11 -1.6 20 -1 28 -5C31 -2 30 0 27 0L-26 0C-28 0 -29 -1.4 -29 -3Z';
export const CLOUD_LIGHT =
	'M-24 -11.6C-23 -15 -19 -17 -15 -15.4C-18 -15 -21 -13.6 -24 -11.6ZM-6 -20C-3 -23 2 -24 5.6 -21.6C2 -21.4 -2 -21 -6 -20Z';

export const CLOUDS = [
	{ x: 158, y: 44, scale: 1 },
	{ x: 264, y: 28, scale: 0.72 }
] as const;

/* ------------------------------------------------------------------ Hills, trees, ground */

const HILL_FAR_TOP =
	'M0 158C40 140 92 136 140 148C176 157 208 158 240 148C292 131 352 126 404 138C448 148 488 150 520 144';
const HILL_NEAR_TOP =
	'M0 180C36 170 84 168 124 176C160 183 196 186 232 180C270 174 300 172 340 178C390 186 440 176 480 176C500 176 512 178 520 180';

export const HILL_FAR = `${HILL_FAR_TOP}L520 ${GROUND_Y}L0 ${GROUND_Y}Z`;
export const HILL_NEAR = `${HILL_NEAR_TOP}L520 ${GROUND_Y}L0 ${GROUND_Y}Z`;
/** Lit crests of the hills. */
export const HILL_RIMS = HILL_FAR_TOP + HILL_NEAR_TOP;

/** A round leafy crown around its own origin, its trunk under it. */
export const CROWN =
	'M-14 4C-22 2 -23 -10 -14 -12C-15 -22 -4 -27 2 -21C8 -28 21 -23 17 -12C25 -9 23 3 14 4C6 6 -6 6 -14 4Z';
export const CROWN_SHADE =
	'M17 -12C25 -9 23 3 14 4C6 6 -6 6 -14 4C-18 3 -20 0.6 -20.6 -2C-14 1 -4 1.6 4 -1C11 -3.4 15 -7 17 -12Z';
export const CROWN_LIGHT =
	'M-16 -9.4C-15.4 -13.6 -12 -15.4 -8.6 -14.6C-11.6 -13.4 -13.8 -11.6 -16 -9.4ZM-1.4 -19.6C1.2 -22.6 5.4 -23.4 8.4 -21.6C5 -21.4 2 -20.8 -1.4 -19.6Z';
export const TRUNK = 'M-2.6 3L-3.4 18L3.4 18L2.6 3Z';
export const TRUNK_SHADE = 'M0.6 4L1 18L3.4 18L2.6 3Z';

export const TREES = [
	{ x: 36, y: 186, scale: 1 },
	{ x: 92, y: 192, scale: 0.72 }
] as const;

/** A bush is a crown without a trunk. */
export const BUSHES = [
	{ x: 214, y: 202, scale: 0.5 },
	{ x: 436, y: 200, scale: 0.42 }
] as const;

/** The top of the ground, where everything stands, and its edge toward the child. */
export const GROUND_BACK = GROUND_Y - 4;
export const GROUND_EDGE = GROUND_Y + 8;

/** Grass on the ground, its front edge in small scallops. */
export const GRASS = (() => {
	const step = 13;
	const scallops = Array.from({ length: SCENE.width / step }, (_, index) => {
		const x = SCENE.width - index * step;
		return `Q${x - step / 2} ${GROUND_EDGE + 5} ${x - step} ${GROUND_EDGE}`;
	}).join('');
	return `M0 ${GROUND_BACK}L${SCENE.width} ${GROUND_BACK}L${SCENE.width} ${GROUND_EDGE}${scallops}Z`;
})();

export const SOIL = rect(0, GROUND_EDGE - 2, SCENE.width, SCENE.height - GROUND_EDGE + 4);

/** Layers in the soil, drawn as fine lines. */
export const STRATA = `M0 ${GROUND_EDGE + 12}C60 ${GROUND_EDGE + 10} 120 ${GROUND_EDGE + 15} 200 ${GROUND_EDGE + 12}C280 ${GROUND_EDGE + 9} 360 ${GROUND_EDGE + 14} 440 ${GROUND_EDGE + 11}C480 ${GROUND_EDGE + 10} 500 ${GROUND_EDGE + 12} 520 ${GROUND_EDGE + 12}`;

export const PEBBLES = [
	oval(40, GROUND_EDGE + 8, 4, 2.4),
	oval(122, GROUND_EDGE + 19, 3, 2),
	oval(206, GROUND_EDGE + 6, 5, 2.6),
	oval(302, GROUND_EDGE + 20, 3.4, 2),
	oval(392, GROUND_EDGE + 9, 4.4, 2.4),
	oval(474, GROUND_EDGE + 20, 3, 1.8)
].join('');

/** Tufts of grass standing on the ground: x only. */
export const TUFTS = [22, 150, 248, 296, 444, 508] as const;

export function tuftPath(x: number): string {
	const y = GROUND_Y + 2;
	return `M${x - 5} ${y}Q${x - 5} ${y - 6} ${x - 8} ${y - 9}M${x} ${y}Q${x} ${y - 7} ${x - 1} ${y - 11}M${x + 5} ${y}Q${x + 5} ${y - 6} ${x + 8} ${y - 8}`;
}

/** A traffic cone standing on its origin. */
export const CONE = {
	x: 270,
	y: GROUND_Y + 3,
	base: rect(-10, -3, 20, 3.4, 1.2),
	body: 'M-6.4 -3L-1.8 -19C-1.2 -20.8 1.2 -20.8 1.8 -19L6.4 -3Z',
	band: 'M-4.4 -10L4.4 -10L5.4 -6.4L-5.4 -6.4Z',
	shade: 'M0.8 -20.2C1.2 -20 1.6 -19.6 1.8 -19L6.4 -3L2.6 -3Z',
	light: capsule([-3.2, -6], [-1.2, -14], 1.4)
} as const;

/* ------------------------------------------------------------------ Crane */

/** The tower crane on the right of the scene: its mast stands right of the speech bubble. */
export const CRANE = {
	mastLeft: 474,
	mastRight: 490,
	top: 12,
	jibBottom: 20,
	jibLeft: 290,
	tail: 517,
	apex: 1,
	foot: GROUND_Y - 6,
	/** Where the trolley runs, under the jib, and the hook when it carries nothing. */
	trolley: 20,
	rest: 30
} as const;

const CHORD = 2.6;

/** The same path drawn across: x and y swapped, to stand a lattice up. */
function standUp(d: string): string {
	return d.replace(
		/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g,
		(_, x: string, y: string) => `${y} ${x}`
	);
}

function mastHoles(): string {
	const holes = latticeHoles(
		CRANE.jibBottom + 1,
		CRANE.foot - 1,
		CRANE.mastLeft + CHORD,
		CRANE.mastRight - CHORD,
		20,
		0.64
	);
	return standUp(holes.join(''));
}

export const MAST_OUTLINE = rect(
	CRANE.mastLeft,
	CRANE.top,
	CRANE.mastRight - CRANE.mastLeft,
	CRANE.foot - CRANE.top,
	0.6
);
export const MAST_HOLES = mastHoles();
export const MAST = MAST_OUTLINE + MAST_HOLES;
export const MAST_SHADE = rect(
	CRANE.mastRight - CHORD,
	CRANE.jibBottom,
	CHORD,
	CRANE.foot - CRANE.jibBottom
);
export const MAST_LIGHT = rect(
	CRANE.mastLeft + 0.8,
	CRANE.jibBottom + 2,
	1,
	CRANE.foot - CRANE.jibBottom - 4,
	0.5
);

const JIB_HEIGHT = CRANE.jibBottom - CRANE.top;
export const JIB_OUTLINE = rect(
	CRANE.jibLeft,
	CRANE.top,
	CRANE.mastLeft - CRANE.jibLeft,
	JIB_HEIGHT,
	1
);
const JIB_HOLES = latticeHoles(
	CRANE.jibLeft + 3,
	CRANE.mastLeft - 1,
	CRANE.top + 2,
	CRANE.jibBottom - 2,
	26,
	0.62
).join('');
export const JIB = JIB_OUTLINE + JIB_HOLES;
export const JIB_ALL_HOLES = JIB_HOLES;
export const JIB_SHADE = rect(
	CRANE.jibLeft + 1,
	CRANE.jibBottom - 2,
	CRANE.mastLeft - CRANE.jibLeft - 1,
	2
);

export const TAIL_OUTLINE = rect(
	CRANE.mastRight,
	CRANE.top + 1,
	CRANE.tail - CRANE.mastRight,
	JIB_HEIGHT - 2,
	1
);
const TAIL_HOLES = latticeHoles(
	CRANE.mastRight + 1,
	CRANE.tail - 2,
	CRANE.top + 3,
	CRANE.jibBottom - 3,
	4,
	0.62
).join('');
export const TAIL = TAIL_OUTLINE + TAIL_HOLES;
export const TAIL_ALL_HOLES = TAIL_HOLES;

export const COUNTERWEIGHT = rect(500, CRANE.jibBottom - 1, 16, 14, 1.2);
export const COUNTERWEIGHT_SEAMS = `M500 ${CRANE.jibBottom + 4}L516 ${CRANE.jibBottom + 4}M500 ${CRANE.jibBottom + 8.5}L516 ${CRANE.jibBottom + 8.5}`;
export const COUNTERWEIGHT_SHADE = rect(511, CRANE.jibBottom, 5, 12);

export const APEX_OUTLINE = `M${CRANE.mastLeft} ${CRANE.top}L${CRANE.mastLeft + 7} ${CRANE.apex + 0.6}Q${(CRANE.mastLeft + CRANE.mastRight) / 2} ${CRANE.apex - 0.6} ${CRANE.mastRight - 7} ${CRANE.apex + 0.6}L${CRANE.mastRight} ${CRANE.top}Z`;
const APEX_HOLE = inset(
	[
		[CRANE.mastLeft + 3.4, CRANE.top - 0.6],
		[CRANE.mastRight - 3.4, CRANE.top - 0.6],
		[(CRANE.mastLeft + CRANE.mastRight) / 2, CRANE.apex + 3]
	],
	0.7
);
export const APEX = APEX_OUTLINE + APEX_HOLE;
export const APEX_ALL_HOLES = APEX_HOLE;

/** Ties from the top of the crane to both ends of its arm. */
export const PENDANTS = `M${(CRANE.mastLeft + CRANE.mastRight) / 2} ${CRANE.apex + 1}L${CRANE.jibLeft + 4} ${CRANE.top}M${(CRANE.mastLeft + CRANE.mastRight) / 2} ${CRANE.apex + 1}L${CRANE.tail - 2} ${CRANE.top + 1}`;

export const CAB = rect(455, CRANE.jibBottom + 1, 19, 16, 2);
export const CAB_WINDOW = rect(457.6, CRANE.jibBottom + 3.4, 9, 8, 1.2);
export const CAB_GLINT = capsule([459.6, CRANE.jibBottom + 9.4], [462.6, CRANE.jibBottom + 5], 1.4);
export const CAB_SHADE = rect(469, CRANE.jibBottom + 1.4, 4.6, 15.2, 1.4);

export const FOOTING = rect(463, CRANE.foot - 2, 38, 10, 1.4);
export const FOOTING_TOP = rect(463.6, CRANE.foot - 1.4, 36.8, 3, 1);
export const FOOTING_SHADE = rect(463.6, CRANE.foot + 5, 36.8, 2.6, 1);

/** The trolley that runs under the arm, centred on x. */
export function trolleyPath(x: number): string {
	return rect(x - 6, CRANE.trolley - 0.4, 12, 4.4, 1);
}

/** The pulley block of the hook, its top at y. */
export const HOOK_BLOCK = { width: 8, height: 6 } as const;
/** From the top of the pulley block to the bottom of the hook. */
export const HOOK_REACH = 10.6;
/** Length of the slings, from the hook down to the top of the block. */
export const SLING = 8;

export function hookBlockPath(x: number, y: number): string {
	return rect(x - HOOK_BLOCK.width / 2, y, HOOK_BLOCK.width, HOOK_BLOCK.height, 1.6);
}

export function hookPath(x: number, y: number): string {
	const top = y + HOOK_BLOCK.height;
	return `M${x} ${top}L${x} ${top + 1.8}C${x} ${round(top + 5.4)} ${x - 4.4} ${round(top + 5.4)} ${x - 4} ${round(top + 2.4)}`;
}

export function cablePath(x: number, from: number, to: number): string {
	return `M${x - 1.4} ${from}L${x - 1.4} ${to}M${x + 1.4} ${from}L${x + 1.4} ${to}`;
}

/* ------------------------------------------------------------------ Flag */

/** The flag planted on the top block, its foot on the origin. */
export const FLAG = {
	pole: capsule([0, 0], [0, -38], 3.6),
	poleShade: capsule([0.9, -1], [0.9, -37], 1.2),
	knob: oval(0, -39.6, 3, 3),
	knobLight: oval(-0.9, -40.3, 0.9, 0.7),
	cloth:
		'M1.2 -37C8 -40.4 14 -34 21 -37C24 -38.2 27 -38.6 29.4 -38L29.4 -24C26.4 -24.6 23.4 -24.2 20.4 -23C13.4 -20 8 -26.4 1.2 -23Z',
	fold: 'M9.6 -38.4C12.6 -36.6 15.4 -35.6 18 -35.8L18 -21.8C15.4 -21.6 12.6 -22.6 9.6 -24.4Z',
	light: 'M2.6 -35.4C7.6 -37.6 11.4 -35.8 15 -34.6C11 -34 6.6 -35.2 2.6 -33.2Z',
	star: 'M21.8 -34.6L22.9 -31.9L25.8 -31.7L23.6 -29.9L24.3 -27L21.8 -28.6L19.3 -27L20 -29.9L17.8 -31.7L20.7 -31.9Z'
} as const;

/* ------------------------------------------------------------------ Visitors */

/** A small rocket flying sideways, nose to the left, centred on its origin. */
export const ROCKET = {
	scale: 1.2,
	body: 'M-22 0C-18 -7 -8 -9.5 4 -9.5L14 -9.5C16 -9.5 17 -8 17 -6L17 6C17 8 16 9.5 14 9.5L4 9.5C-8 9.5 -18 7 -22 0Z',
	nose: 'M-22 0C-19 -5.6 -15.4 -8 -11 -8.9L-11 8.9C-15.4 8 -19 5.6 -22 0Z',
	shade: 'M-21 2.4C-16 7 -8 8 4 8L17 8L17 6C17 8 16 9.5 14 9.5L4 9.5C-8 9.5 -18 7 -21 2.4Z',
	light: capsule([-12, -6.2], [10, -7.4], 2.2),
	band: 'M5 -9.5L5 9.5',
	fins: [
		'M6 -9.5L11 -16C12.4 -17.6 15.6 -17.4 15.6 -15L15 -9.5Z',
		'M6 9.5L11 16C12.4 17.6 15.6 17.4 15.6 15L15 9.5Z'
	],
	ring: oval(-2.6, -1, 5, 5),
	window: oval(-2.6, -1, 3.4, 3.4),
	glint: oval(-3.8, -2.4, 1.2, 0.9),
	flameOuter: 'M17 -5.4C23 -6.4 30 -3.4 34 0C30 3.4 23 6.4 17 5.4Z',
	flameInner: 'M17 -2.8C21 -3.2 25 -1.6 28 0C25 1.6 21 3.2 17 2.8Z',
	/** Under the belly, where the ropes are tied, before scaling. */
	belly: 9.5,
	ropeSpread: 8
} as const;

/** A horseshoe magnet hanging poles down, its bottom on the origin. */
export const MAGNET = {
	height: 13,
	body: 'M-9 0L-9 -6C-9 -14.4 9 -14.4 9 -6L9 0L4.4 0L4.4 -6C4.4 -9 -4.4 -9 -4.4 -6L-4.4 0Z',
	shade: 'M4.4 -6C4.4 -9 1 -10 -1 -9.8C3 -12.4 9 -11 9 -6L9 0L6.6 0L6.6 -6C6.6 -7 5.8 -8 4.4 -8Z',
	light: capsule([-7.2, -3], [-6.6, -8.4], 1.3),
	poles: rect(-9, -3, 4.6, 3, 0.4) + rect(4.4, -3, 4.6, 3, 0.4),
	shackle: oval(0, -12.4, 1.8, 1.6)
} as const;

/** A puff of dust, flat underneath, centred on its origin. */
export const PUFF = {
	body: 'M-6 0C-9.4 0 -9.6 -4.4 -6.6 -5.2C-6.6 -8.8 -2 -9.8 0 -7.2C2 -9.8 6.6 -8.8 6.6 -5.2C9.6 -4.4 9.4 0 6 0Z',
	shade:
		'M-8.6 -1.8C-5 -0.4 -1 -1 0.6 -2.6C3 -1 6 -0.8 8.6 -2.4C8.8 -1 7.8 0 6 0L-6 0C-7.4 0 -8.4 -0.6 -8.6 -1.8Z'
} as const;

/** Lines that fly off the block when it snaps into place: side (-1 left, 1 right), share of its height, direction. */
export const SPARKS = [
	{ side: -1, rise: 0.85, dx: -10, dy: -6 },
	{ side: -1, rise: 0.15, dx: -11, dy: 5 },
	{ side: 1, rise: 0.85, dx: 10, dy: -6 },
	{ side: 1, rise: 0.15, dx: 11, dy: 5 }
] as const;

/** Lines left behind by a block that slides in: share of its height above its bottom, length. */
export const SPEED_LINES = [
	{ rise: 0.25, length: 16 },
	{ rise: 0.55, length: 24 },
	{ rise: 0.85, length: 12 }
] as const;

/** The companion that comes to stamp the block down: side of its square. */
export const STOMPER = { size: 60, feet: 113.8 / 120 } as const;
