/**
 * The place where Floup and the companion talk, in the units of the backdrop (400 x 240), drawn
 * behind them: a garden by day, the same garden on a summer evening under lanterns, then in winter
 * (`shared/decor.ts`). The ground is at the bottom, where the two of them stand.
 */
import { dotPath, flakePath, ovalShape, twinkleShape } from '../shared/decor-art';

/** The part of the drawing shown: its top, where nothing is drawn, would be hidden by the bubbles. */
export const BACKDROP = { top: 40, width: 400, height: 200 } as const;

export const HILLS = 'M0 168C60 138 122 148 182 160C242 172 302 138 400 150L400 240L0 240Z';
export const GROUND = 'M0 198C80 190 160 204 240 196C300 190 360 200 400 194L400 240L0 240Z';
export const GROUND_EDGE = 'M0 198C80 190 160 204 240 196C300 190 360 200 400 194';

/** Little strokes of grass along the edge of the ground. */
export const TUFTS = [24, 96, 168, 262, 336]
	.map((x) => `M${x} 200l-3 -7M${x + 4} 200l0 -9M${x + 8} 200l3 -7`)
	.join('');

/* ------------------------------------------------------------------ Garden */

const SUN = { cx: 360, cy: 86, r: 17 } as const;

export const GARDEN_SUN = {
	disc: dotPath(SUN.cx, SUN.cy, SUN.r),
	light: ovalShape(SUN.cx - 6, SUN.cy - 6, 5, 3),
	rays: Array.from({ length: 8 }, (_, index) => {
		const angle = (index * Math.PI) / 4;
		const from = SUN.r + 6;
		const to = SUN.r + 13;
		return `M${(SUN.cx + Math.cos(angle) * from).toFixed(1)} ${(SUN.cy + Math.sin(angle) * from).toFixed(1)}L${(SUN.cx + Math.cos(angle) * to).toFixed(1)} ${(SUN.cy + Math.sin(angle) * to).toFixed(1)}`;
	}).join('')
} as const;

/** A cloud around (0, 0), about 60 wide. */
export const CLOUD =
	'M-26 8C-36 8 -36 -6 -24 -6C-25 -17 -9 -20 -4 -11C0 -22 18 -21 18 -8C28 -10 33 8 21 8Z';
export const CLOUDS = [
	{ x: 300, y: 112, scale: 0.8 },
	{ x: 40, y: 104, scale: 0.7 }
] as const;

function daisy(cx: number, cy: number, r: number): { petals: string; heart: string } {
	return {
		petals: [0, 72, 144, 216, 288]
			.map((degrees) => {
				const angle = ((degrees - 90) * Math.PI) / 180;
				return dotPath(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, r * 0.75);
			})
			.join(''),
		heart: dotPath(cx, cy, r * 0.62)
	};
}

/** Daisies in the grass, some white, some pink. */
export const DAISIES = [
	{ ...daisy(30, 216, 3.4), tone: 'white' },
	{ ...daisy(118, 228, 3), tone: 'pink' },
	{ ...daisy(206, 214, 3.6), tone: 'white' },
	{ ...daisy(298, 226, 3.2), tone: 'pink' },
	{ ...daisy(378, 212, 3.4), tone: 'white' },
	{ ...daisy(58, 176, 2.2), tone: 'pink' },
	{ ...daisy(312, 166, 2.2), tone: 'white' }
] as const;

/* ------------------------------------------------------------------ Evening */

const LOW_SUN = { cx: 302, cy: 156, r: 26 } as const;

export const EVENING_SUN = {
	disc: dotPath(LOW_SUN.cx, LOW_SUN.cy, LOW_SUN.r),
	halo: dotPath(LOW_SUN.cx, LOW_SUN.cy, LOW_SUN.r + 16)
} as const;

export const LANTERN_STRING = 'M0 112Q100 140 200 120Q300 140 400 112';

/** Where each lantern hangs from the string, and its colour. */
const HOOKS = [
	{ x: 50, y: 123, tone: 'a' },
	{ x: 100, y: 128, tone: 'b' },
	{ x: 150, y: 127, tone: 'c' },
	{ x: 250, y: 127, tone: 'a' },
	{ x: 300, y: 128, tone: 'b' },
	{ x: 350, y: 123, tone: 'c' }
] as const;

export const LANTERNS = HOOKS.map((hook) => ({
	tone: hook.tone,
	cap: `M${hook.x - 3} ${hook.y}h6v3h-6Z`,
	body: ovalShape(hook.x, hook.y + 10, 6.4, 7.6),
	rib: `M${hook.x} ${hook.y + 2.6}V${hook.y + 17.4}`,
	glow: dotPath(hook.x, hook.y + 10, 14)
}));

export const EVENING_STARS = [
	twinkleShape(24, 112, 4),
	twinkleShape(126, 116, 3),
	twinkleShape(214, 120, 4.4),
	twinkleShape(388, 112, 3.4),
	twinkleShape(176, 134, 2.6)
].join('');

/* ------------------------------------------------------------------ Winter */

const FLAKES = [
	{ x: 34, y: 84, r: 4.6 },
	{ x: 96, y: 136, r: 3.6 },
	{ x: 150, y: 74, r: 4 },
	{ x: 206, y: 128, r: 4.8 },
	{ x: 262, y: 84, r: 3.4 },
	{ x: 320, y: 140, r: 4.4 },
	{ x: 372, y: 90, r: 3.8 }
] as const;

export const SNOWFLAKES = FLAKES.map((flake) => flakePath(flake.x, flake.y, flake.r)).join('');
export const SNOW_DOTS = [
	dotPath(64, 92, 1.6),
	dotPath(122, 80, 1.4),
	dotPath(178, 146, 1.6),
	dotPath(240, 142, 1.4),
	dotPath(292, 100, 1.6),
	dotPath(350, 156, 1.4)
].join('');

/** A small fir standing at (x, y), `k` times its usual size, with snow on its top branches. */
function fir(x: number, y: number, k: number): { tree: string; trunk: string; snow: string } {
	const p = (dx: number, dy: number) => `${(x + dx * k).toFixed(1)} ${(y + dy * k).toFixed(1)}`;
	return {
		tree: `M${p(0, -30)}L${p(13, 0)}L${p(-13, 0)}Z`,
		trunk: `M${p(-2.6, 0)}L${p(2.6, 0)}L${p(2.6, 5)}L${p(-2.6, 5)}Z`,
		snow: `M${p(0, -30)}L${p(6, -16)}Q${p(0, -19)} ${p(-6, -16)}Z`
	};
}

export const FIRS = [fir(150, 172, 1), fir(176, 166, 0.8), fir(396, 152, 1.1)];
