/**
 * What the decors of the kitchen add (`shared/decor.ts`), in the units of the scene (520 x 240):
 * the light of the wall, what the window shows and a prop or two. The pot, the shelf, the counter
 * and the ingredients never change.
 */
import { birdPath, dotPath, flakePath, ovalShape, starShape } from '../shared/decor-art';

/* ------------------------------------------------------------------ Evening */

/** A sun going down in the window, pink clouds and the hills of the evening. */
export const EVENING_WINDOW = {
	sun: dotPath(465, 39, 6.6),
	sunLight: ovalShape(463, 36.6, 2.2, 1.4),
	clouds: [
		'M482 36C482 33.6 484.4 32.2 486.6 32.8C487.6 30.6 490.4 29.8 492.4 31C494 29.6 497 30 498 32C500 32.2 501 34 500.4 35.6C500.4 37 499.2 37.6 497.6 37.6L483.6 37.6C482.6 37.6 482 37 482 36Z',
		'M455 64.6C455 62.8 456.8 61.8 458.4 62.2C459.2 60.6 461.4 60 463 61C464.2 60 466.4 60.2 467 61.8C468.4 62 469 63.2 468.6 64.4C468.6 65.4 467.8 66 466.6 66L456.6 66C455.6 66 455 65.6 455 64.6Z'
	],
	hills: 'M452 74Q462 68 474 71Q486 74 494 69Q500 66 504 68L504 86L452 86Z',
	birds: birdPath(486, 48, 6) + birdPath(495, 44, 4.6)
} as const;

/** A lamp hanging from the ceiling, lit for the evening. */
export const LAMP = {
	cord: 'M92 -2L92 27',
	shade: 'M72 47C72 35 80 27.6 92 27.6C104 27.6 112 35 112 47Z',
	shadeShade: 'M112 47C112 37 107 30.4 99 28.4C104.6 33 106.6 39.4 106.6 47Z',
	shadeLight: 'M78 41C78.8 36.4 82 32.6 86.4 31.2C83.6 34 81.6 37.4 80.8 41.6Z',
	rim: 'M70 46Q70 44.4 71.6 44.4L112.4 44.4Q114 44.4 114 46Q114 48.6 112.4 48.6L71.6 48.6Q70 48.6 70 46Z',
	bulb: 'M86 48.6C86 53 88.6 55.6 92 55.6C95.4 55.6 98 53 98 48.6Z',
	glow: dotPath(92, 54, 46)
} as const;

/* ------------------------------------------------------------------ Winter */

/** Snow falling past the window, settled at the bottom of the panes, frost in the corners. */
export const WINTER_WINDOW = {
	flakes: [
		flakePath(462, 32, 3.4),
		flakePath(494, 30, 3),
		flakePath(470, 46, 2.6),
		flakePath(489, 64, 3.2),
		flakePath(460, 68, 2.6)
	].join(''),
	dots: [
		dotPath(483, 42, 1.2),
		dotPath(499, 46, 1),
		dotPath(456, 50, 1.1),
		dotPath(497, 72, 1.2)
	].join(''),
	drift:
		'M453 86L453 79.6Q458 76.4 463 78.6Q468 75.6 474 78.4Q480 75.2 486 78Q492 75.4 497 77.6Q500.6 76.6 503 78.4L503 86Z',
	frost:
		'M453 23L466 23Q462 25.4 460.6 29Q457.4 30.4 455.6 34Q454 34.6 453 36ZM503 23L503 33Q501 30.6 498 30Q496.6 26 492 25Q493 23.6 494.6 23Z'
} as const;

/** Paper stars hung on a string across the top of the wall: (x, y) where each one hangs. */
const GARLAND_FROM = { x: 128, y: 4 } as const;
const GARLAND_TO = { x: 392, y: 4 } as const;
const GARLAND_SAG = 16;
const GARLAND_STARS = [0.1, 0.3, 0.5, 0.7, 0.9] as const;

function garlandPoint(share: number): { x: number; y: number } {
	const x = GARLAND_FROM.x + (GARLAND_TO.x - GARLAND_FROM.x) * share;
	const y = GARLAND_FROM.y + GARLAND_SAG * 4 * share * (1 - share);
	return { x, y };
}

export const GARLAND = {
	string: `M${GARLAND_FROM.x} ${GARLAND_FROM.y}Q${(GARLAND_FROM.x + GARLAND_TO.x) / 2} ${GARLAND_FROM.y + GARLAND_SAG * 2} ${GARLAND_TO.x} ${GARLAND_TO.y}`,
	flakes: GARLAND_STARS.map((share, index) => {
		const at = garlandPoint(share);
		const drop = index % 2 === 0 ? 9 : 5;
		const r = index % 2 === 0 ? 7.4 : 6.2;
		const cy = at.y + drop + r;
		return {
			thread: `M${at.x} ${Math.round(at.y * 100) / 100}L${at.x} ${Math.round((cy - r + 1) * 100) / 100}`,
			star: starShape(at.x, cy, r, 6),
			hole: dotPath(at.x, cy, r * 0.2)
		};
	})
} as const;

/** A mug of hot chocolate steaming on the counter, right of the pot. */
export const MUG = {
	body: 'M440 192Q440 190 442 190L462 190Q464 190 463.8 192L462.4 208Q462.2 211 459 211L445 211Q441.8 211 441.6 208Z',
	bodyShade:
		'M463.8 192L462.4 208Q462.2 211 459 211L452 211Q457.4 209 458.4 200L459.4 190L462 190Q464 190 463.8 192Z',
	bodyLight: 'M444.4 194L446.4 194L446.6 205L445 205Z',
	handle: 'M463.4 195Q471.4 194.4 471.4 200.4Q471.4 206.4 462.6 206',
	cocoa: ovalShape(452, 191.4, 10.4, 2),
	heart:
		'M452 205.4C447.6 202.4 446.6 199.6 448.4 198.2C449.8 197.2 451.4 197.8 452 199.2C452.6 197.8 454.2 197.2 455.6 198.2C457.4 199.6 456.4 202.4 452 205.4Z',
	steam:
		'M447 185C444 181 450 178 447 173M454 186C451 181 457 177.6 454 171M461 184.6C458.6 181 463 178.6 460.6 174.6'
} as const;
