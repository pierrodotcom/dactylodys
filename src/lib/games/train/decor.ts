/**
 * What the decors of the train add to the landscape (`shared/decor.ts`), in scene units
 * (520 x 240). The rails, the train and its wagons never change.
 */
import { birdPath, dotPath, flakePath, leafShape, leafVein, ovalShape } from '../shared/decor-art';
import { TREE_SPOTS } from './shapes';

function round(value: number): number {
	return Math.round(value * 100) / 100;
}

function pt(x: number, y: number): string {
	return `${round(x)} ${round(y)}`;
}

/* ------------------------------------------------------------------ Autumn */

const LOW_SUN = { cx: 424, cy: 116, r: 17 } as const;

/** A big low sun going down behind the far hills. */
export const LOW_SUN_ART = {
	disc: dotPath(LOW_SUN.cx, LOW_SUN.cy, LOW_SUN.r),
	halo: dotPath(LOW_SUN.cx, LOW_SUN.cy, LOW_SUN.r + 11),
	light: ovalShape(LOW_SUN.cx - 6, LOW_SUN.cy - 7.6, 4.4, 2.6)
} as const;

export const AUTUMN_BIRDS = [
	birdPath(236, 44, 10),
	birdPath(252, 36, 8),
	birdPath(262, 50, 7)
].join('');

const LEAVES = [
	{ x: 168, y: 112, length: 8, angle: 30, tone: 'red' },
	{ x: 182, y: 128, length: 7, angle: -40, tone: 'gold' },
	{ x: 332, y: 94, length: 7.4, angle: 70, tone: 'orange' },
	{ x: 344, y: 116, length: 6.6, angle: 140, tone: 'red' },
	{ x: 490, y: 118, length: 7, angle: 20, tone: 'gold' },
	{ x: 30, y: 232, length: 8.6, angle: 8, tone: 'orange' },
	{ x: 120, y: 234, length: 8, angle: 168, tone: 'red' },
	{ x: 214, y: 231, length: 8.4, angle: -14, tone: 'gold' },
	{ x: 300, y: 235, length: 8, angle: 150, tone: 'orange' },
	{ x: 386, y: 232, length: 8.6, angle: 24, tone: 'red' },
	{ x: 470, y: 235, length: 8, angle: 190, tone: 'gold' }
] as const;

export const AUTUMN_LEAVES = LEAVES.map((leaf) => ({
	tone: leaf.tone,
	shape: leafShape(leaf.x, leaf.y, leaf.length, leaf.angle),
	vein: leafVein(leaf.x, leaf.y, leaf.length, leaf.angle)
}));

/* ------------------------------------------------------------------ Winter */

/** Snow on top of a round tree of the far hills (`tree` in `shapes.ts`), its lower edge in drips. */
function crownSnow(x: number, y: number, size: number): string {
	const k = size / 40;
	const p = (dx: number, dy: number) => pt(x + dx * k, y + dy * k);
	return (
		`M${p(-12.4, -25)}C${p(-13.4, -32.4)} ${p(-9.2, -40.6)} ${p(0, -40.6)}` +
		`C${p(9.2, -40.6)} ${p(13.4, -32.4)} ${p(12.4, -25)}` +
		`Q${p(10, -28.4)} ${p(7, -26.4)}Q${p(4, -30.4)} ${p(0.6, -27.6)}` +
		`Q${p(-3, -30.6)} ${p(-6.4, -26.6)}Q${p(-9.6, -28.6)} ${p(-12.4, -25)}Z`
	);
}

export const TREE_SNOW = TREE_SPOTS.map((spot) => crownSnow(spot.x, spot.y, spot.size));

/** Snow on the roof of the station, thicker on the slopes, its lower edge in drips. */
export const ROOF_SNOW =
	'M5.4 166.8L37.6 143Q39 142 40.4 143L72.6 166.8Q71.4 169.6 68.2 167.4Q65.4 170 62 165.4' +
	'L40.2 150.2Q39 149.4 37.8 150.2L16 165.4Q12.8 169.4 9.8 167Q7.2 169.4 5.4 166.8Z';

/** Snow along the edge of the platform. */
export const PLATFORM_SNOW =
	'M-1 194.4Q-1 191.4 2 191.6L78 191.6Q81 191.4 81 194.4Q78 196.4 74 194.8Q70 197 66 195' +
	'Q60 196.8 54 195Q44 197 36 195Q26 196.8 18 195Q10 196.8 4 195Q1 196.4 -1 194.4Z';

const FLAKES = [
	{ x: 26, y: 40, r: 3.4 },
	{ x: 74, y: 92, r: 2.4 },
	{ x: 112, y: 24, r: 3 },
	{ x: 214, y: 30, r: 3.4 },
	{ x: 240, y: 92, r: 2.4 },
	{ x: 278, y: 56, r: 3.2 },
	{ x: 372, y: 24, r: 3 },
	{ x: 404, y: 76, r: 2.4 },
	{ x: 440, y: 18, r: 2.2 },
	{ x: 506, y: 84, r: 3.2 },
	{ x: 170, y: 64, r: 2.2 },
	{ x: 330, y: 60, r: 2 },
	{ x: 52, y: 130, r: 2.2 }
] as const;

export const SNOWFLAKES = FLAKES.filter((flake) => flake.r >= 3)
	.map((flake) => flakePath(flake.x, flake.y, flake.r * 1.5))
	.join('');
export const SNOW_DOTS = FLAKES.filter((flake) => flake.r < 3)
	.map((flake) => dotPath(flake.x, flake.y, flake.r * 0.6))
	.join('');
