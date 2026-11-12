/**
 * The river and its banks, in the units of the scene (520 x 280): a far bank with trees, the water
 * from left to right, the near bank where the companion stands and the crate of the objects caught.
 * Three decors (`shared/decor.ts`): a sunny day, a sunset on the water, a night with fireflies.
 */
import { birdPath, crescentShape, dotPath, ovalShape, twinkleShape } from '../shared/decor-art';
import { COLLECTION } from './river';

export const FAR_BANK =
	'M0 96C70 74 150 88 220 84C300 80 380 70 450 82C490 88 510 84 520 82L520 124L0 124Z';
export const FAR_BANK_EDGE = 'M0 96C70 74 150 88 220 84C300 80 380 70 450 82C490 88 510 84 520 82';

const WATER_TOP = 'M0 114C120 106 260 118 400 110C460 107 500 112 520 110';
const WATER_BOTTOM = 'C480 200 420 209 330 204C220 198 100 208 0 202';
export const WATER = `${WATER_TOP}L520 204${WATER_BOTTOM}Z`;
export const WATER_EDGE = WATER_TOP;

export const NEAR_BANK = 'M0 202C100 208 220 198 330 204C420 209 480 200 520 204L520 280L0 280Z';
export const NEAR_BANK_EDGE = 'M0 202C100 208 220 198 330 204C420 209 480 200 520 204';

/** Little still lines on the water: the river flows, nothing on it moves by itself. */
export const RIPPLES =
	'M36 134h22M128 186h16M330 128h20M452 176h24M84 160h12M392 192h14M196 124h14';

/** Round trees on the far bank. */
export const TREES = [
	{ x: 34, y: 80, r: 15 },
	{ x: 62, y: 74, r: 12 },
	{ x: 418, y: 70, r: 14 },
	{ x: 474, y: 74, r: 16 }
].map((tree) => ({
	crown: dotPath(tree.x, tree.y, tree.r),
	trunk: `M${tree.x - 2} ${tree.y + tree.r - 2}h4v${tree.r * 0.6}h-4Z`
}));

/** Reeds on the near bank, left of the companion, with a few bulrushes. */
export const REEDS = [
	'M22 226Q20 206 28 188',
	'M34 228Q34 206 30 192',
	'M46 226Q50 210 58 198',
	'M120 222Q118 206 124 194',
	'M132 224Q134 210 140 200'
].join('');
export const BULRUSHES = [
	ovalShape(28, 186, 3.4, 8),
	ovalShape(30, 190, 3.2, 7.4),
	ovalShape(124, 192, 3.2, 7.6)
];

/** The crate on the bank, with a shelf: the objects caught are put on its two shelves. */
const CRATE_TOP = COLLECTION.y - 8;
const CRATE_BOTTOM = COLLECTION.y + COLLECTION.rowHeight * COLLECTION.rows + 6;
const CRATE_LEFT = COLLECTION.x - 8;
const CRATE_RIGHT = COLLECTION.x + COLLECTION.width + 8;
export const CRATE = `M${CRATE_LEFT} ${CRATE_TOP}H${CRATE_RIGHT}V${CRATE_BOTTOM}H${CRATE_LEFT}Z`;
export const CRATE_SHELVES = Array.from(
	{ length: COLLECTION.rows },
	(_, row) => `M${CRATE_LEFT} ${COLLECTION.y + COLLECTION.rowHeight * (row + 1)}H${CRATE_RIGHT}`
).join('');
export const CRATE_POSTS = `M${CRATE_LEFT + 4} ${CRATE_TOP}V${CRATE_BOTTOM}M${CRATE_RIGHT - 4} ${CRATE_TOP}V${CRATE_BOTTOM}`;

/* ------------------------------------------------------------------ Day */

const SUN = { cx: 470, cy: 40, r: 17 } as const;
export const DAY_SUN = {
	disc: dotPath(SUN.cx, SUN.cy, SUN.r),
	rays: Array.from({ length: 8 }, (_, index) => {
		const angle = (index * Math.PI) / 4;
		const from = SUN.r + 6;
		const to = SUN.r + 12;
		return `M${(SUN.cx + Math.cos(angle) * from).toFixed(1)} ${(SUN.cy + Math.sin(angle) * from).toFixed(1)}L${(SUN.cx + Math.cos(angle) * to).toFixed(1)} ${(SUN.cy + Math.sin(angle) * to).toFixed(1)}`;
	}).join('')
} as const;

/** A cloud around (0, 0), about 60 wide. */
export const CLOUD =
	'M-26 8C-36 8 -36 -6 -24 -6C-25 -17 -9 -20 -4 -11C0 -22 18 -21 18 -8C28 -10 33 8 21 8Z';
export const CLOUDS = [
	{ x: 120, y: 40, scale: 0.9 },
	{ x: 330, y: 30, scale: 0.7 }
] as const;

/* ------------------------------------------------------------------ Sunset */

const LOW_SUN = { cx: 380, cy: 82, r: 26 } as const;
export const SUNSET_SUN = {
	disc: dotPath(LOW_SUN.cx, LOW_SUN.cy, LOW_SUN.r),
	halo: dotPath(LOW_SUN.cx, LOW_SUN.cy, LOW_SUN.r + 18)
} as const;
/** The sun drawn on the water, in broken lines under it. */
export const SUNSET_GLITTER = 'M352 128h56M362 146h36M368 168h24M374 188h12';
export const SUNSET_BIRDS = [
	birdPath(90, 40, 16),
	birdPath(116, 30, 12),
	birdPath(220, 46, 14)
].join('');

/* ------------------------------------------------------------------ Night */

const MOON = { cx: 96, cy: 44, r: 17 } as const;
export const NIGHT_MOON = crescentShape(MOON.cx, MOON.cy, MOON.r);
export const MOON_GLITTER = 'M78 132h36M86 152h20M90 174h12';
export const NIGHT_STARS = [
	twinkleShape(40, 30, 4),
	twinkleShape(170, 22, 3.4),
	twinkleShape(236, 50, 4.4),
	twinkleShape(300, 20, 3),
	twinkleShape(380, 44, 4),
	twinkleShape(462, 26, 3.6),
	twinkleShape(500, 60, 2.8)
].join('');

/** Fireflies over the reeds, each with its glow. */
export const FIREFLIES = [
	{ x: 50, y: 178 },
	{ x: 96, y: 190 },
	{ x: 148, y: 176 },
	{ x: 20, y: 160 }
].map((fly) => ({ dot: dotPath(fly.x, fly.y, 2.2), glow: dotPath(fly.x, fly.y, 8) }));
