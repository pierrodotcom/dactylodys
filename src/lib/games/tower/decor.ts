/**
 * What the decors of the tower add to the scene (`shared/decor.ts`), in the units of the scene
 * (520 x 240). The building site, the crane and the blocks never change.
 */
import { birdPath, dotPath, flakePath, leafShape, leafVein, ovalShape } from '../shared/decor-art';
import { GROUND_Y } from './blocks';

/* ------------------------------------------------------------------ Sunset */

const SUNSET_SUN_AT = { cx: 190, cy: 150, r: 24 } as const;

/** A big low sun, half behind the far hills. */
export const SUNSET_SUN = {
	disc: dotPath(SUNSET_SUN_AT.cx, SUNSET_SUN_AT.cy, SUNSET_SUN_AT.r),
	halo: dotPath(SUNSET_SUN_AT.cx, SUNSET_SUN_AT.cy, SUNSET_SUN_AT.r + 14),
	light: ovalShape(SUNSET_SUN_AT.cx - 9, SUNSET_SUN_AT.cy - 11, 6, 3.4)
} as const;

/** Birds going home, far away. */
export const SUNSET_BIRDS = [
	birdPath(238, 62, 11),
	birdPath(256, 52, 8.6),
	birdPath(268, 66, 7.4)
].join('');

/** Leaves blown off the trees, in the air and on the ground: centre, length, angle, colour. */
const AUTUMN_LEAVES = [
	{ x: 62, y: 166, length: 7, angle: 30, tone: 'red' },
	{ x: 76, y: 150, length: 6, angle: -40, tone: 'gold' },
	{ x: 120, y: 172, length: 6.4, angle: 60, tone: 'orange' },
	{ x: 140, y: 150, length: 5.4, angle: 120, tone: 'red' },
	{ x: 20, y: 156, length: 5.6, angle: 10, tone: 'gold' },
	{ x: 50, y: 201, length: 7, angle: 4, tone: 'orange' },
	{ x: 108, y: 202, length: 6.4, angle: 170, tone: 'red' },
	{ x: 182, y: 201, length: 6, angle: -10, tone: 'gold' },
	{ x: 254, y: 202, length: 6.6, angle: 160, tone: 'orange' },
	{ x: 470, y: 201, length: 6, angle: 20, tone: 'red' }
] as const;

export const FALLING_LEAVES = AUTUMN_LEAVES.map((leaf) => ({
	tone: leaf.tone,
	shape: leafShape(leaf.x, leaf.y, leaf.length * 1.4, leaf.angle),
	vein: leafVein(leaf.x, leaf.y, leaf.length * 1.4, leaf.angle)
}));

/* ------------------------------------------------------------------ Winter */

/** Snow on top of a crown (`CROWN` of the trees and bushes), its lower edge in soft drips. */
export const CROWN_SNOW =
	'M-14 -12C-15 -22 -4 -27 2 -21C8 -28 21 -23 17 -12C15 -9.6 12.4 -11.6 10.6 -10C8.6 -12.6 5.4 -11 4 -13C1.6 -10.4 -1.6 -12.8 -3.4 -10.6C-5.6 -13 -9 -10.4 -10.4 -12.2C-12 -10.6 -13.4 -11 -14 -12Z';

/** Flakes in the sky: centre and size. The small ones are dots, the big ones have branches. */
const FLAKES = [
	{ x: 30, y: 78, r: 3.4 },
	{ x: 92, y: 28, r: 2.6 },
	{ x: 128, y: 92, r: 3 },
	{ x: 206, y: 24, r: 3.6 },
	{ x: 236, y: 74, r: 2.4 },
	{ x: 302, y: 52, r: 3.2 },
	{ x: 334, y: 100, r: 2.6 },
	{ x: 392, y: 28, r: 3.2 },
	{ x: 486, y: 46, r: 2.8 },
	{ x: 500, y: 104, r: 3.4 },
	{ x: 174, y: 124, r: 2.4 },
	{ x: 14, y: 126, r: 2.8 },
	{ x: 272, y: 126, r: 2.2 },
	{ x: 150, y: 60, r: 2 },
	{ x: 444, y: 82, r: 2.2 }
] as const;

export const SNOWFLAKES = FLAKES.filter((flake) => flake.r >= 3)
	.map((flake) => flakePath(flake.x, flake.y, flake.r * 1.5))
	.join('');
export const SNOW_DOTS = FLAKES.filter((flake) => flake.r < 3)
	.map((flake) => dotPath(flake.x, flake.y, flake.r * 0.6))
	.join('');

/** A snowman on the ground, left of the crane: two balls, a scarf, a carrot and two twigs. */
const SNOWMAN_X = 150;
const BODY = { cy: GROUND_Y - 11, r: 12 } as const;
const HEAD = { cy: GROUND_Y - 30, r: 8.4 } as const;

export const SNOWMAN = {
	body: dotPath(SNOWMAN_X, BODY.cy, BODY.r),
	bodyShade: `M${SNOWMAN_X + BODY.r} ${BODY.cy}A${BODY.r} ${BODY.r} 0 0 1 ${SNOWMAN_X - BODY.r * 0.8} ${BODY.cy + BODY.r * 0.6}C${SNOWMAN_X - 2} ${BODY.cy + 5} ${SNOWMAN_X + 7} ${BODY.cy + 2} ${SNOWMAN_X + BODY.r} ${BODY.cy}Z`,
	head: dotPath(SNOWMAN_X, HEAD.cy, HEAD.r),
	headShade: `M${SNOWMAN_X + HEAD.r} ${HEAD.cy}A${HEAD.r} ${HEAD.r} 0 0 1 ${SNOWMAN_X - HEAD.r * 0.8} ${HEAD.cy + HEAD.r * 0.6}C${SNOWMAN_X - 1.4} ${HEAD.cy + 3.6} ${SNOWMAN_X + 5} ${HEAD.cy + 1.4} ${SNOWMAN_X + HEAD.r} ${HEAD.cy}Z`,
	light:
		ovalShape(SNOWMAN_X - 5, BODY.cy - 6, 3, 1.8) + ovalShape(SNOWMAN_X - 3.4, HEAD.cy - 4, 2, 1.2),
	scarf:
		`M${SNOWMAN_X - 8} ${HEAD.cy + 5.6}Q${SNOWMAN_X} ${HEAD.cy + 9.6} ${SNOWMAN_X + 8} ${HEAD.cy + 5.6}L${SNOWMAN_X + 8.6} ${HEAD.cy + 9}Q${SNOWMAN_X} ${HEAD.cy + 13.4} ${SNOWMAN_X - 8.6} ${HEAD.cy + 9}Z` +
		`M${SNOWMAN_X + 3} ${HEAD.cy + 10}L${SNOWMAN_X + 7.4} ${HEAD.cy + 19}L${SNOWMAN_X + 10.6} ${HEAD.cy + 17}L${SNOWMAN_X + 7} ${HEAD.cy + 9}Z`,
	carrot: `M${SNOWMAN_X + 1} ${HEAD.cy - 1.4}L${SNOWMAN_X + 9.4} ${HEAD.cy + 0.6}L${SNOWMAN_X + 1} ${HEAD.cy + 2}Z`,
	coal:
		dotPath(SNOWMAN_X - 3, HEAD.cy - 3, 1.1) +
		dotPath(SNOWMAN_X + 2.6, HEAD.cy - 3, 1.1) +
		dotPath(SNOWMAN_X, BODY.cy - 5, 1.2) +
		dotPath(SNOWMAN_X, BODY.cy + 1, 1.2),
	twigs: `M${SNOWMAN_X - 10} ${BODY.cy - 4}L${SNOWMAN_X - 21} ${BODY.cy - 12}M${SNOWMAN_X - 17} ${BODY.cy - 9.6}L${SNOWMAN_X - 19} ${BODY.cy - 15}M${SNOWMAN_X + 10} ${BODY.cy - 4}L${SNOWMAN_X + 21} ${BODY.cy - 13}M${SNOWMAN_X + 17.4} ${BODY.cy - 10.4}L${SNOWMAN_X + 21} ${BODY.cy - 8.6}`
} as const;
