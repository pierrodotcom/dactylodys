<script lang="ts">
	/*
	 * One item the companion wears, drawn in its 120 × 120 view box (lot R2). `back`: what goes
	 * behind the body (a backpack, a cape, the far side of a ring); `front`: everything else;
	 * `sleeve`: what covers an arm, drawn in the frame of that arm. A hand item is drawn around
	 * `grip`, the point held in the hand. An unknown `artId` draws nothing. Under an ancestor with
	 * `data-silhouette`, the item is one flat shape without details.
	 *
	 * Every piece is modelled the same way: its colour, a shade and a darker shade along its bottom
	 * right edge, a thin light along its top left edge, then its own shades, lights and reflections.
	 */
	import type { Snippet } from 'svelte';
	import {
		capsulePath,
		crescentPath,
		fluffPath,
		ovalArc,
		ovalPath,
		ovalPoint,
		pointOnCubic,
		roundedStarPath,
		stitchesAlong,
		type XY
	} from './geometry';
	import { ITEM_ARTS, type ItemLayer, type Point } from './items';

	interface Props {
		artId: string;
		layer?: ItemLayer;
		grip?: Point;
		/** Drawn on its own (`RewardPicture`): without the shadows it casts on the companion. */
		alone?: boolean;
	}

	/** How a piece is modelled, in units of the drawing. */
	interface Look {
		/** The shade along the bottom right edge: the piece moved up and left, cut out; 0: none. */
		shade?: number;
		/** A narrower shade on the same edge, over the first one: the darkest tone; 0: none. */
		deep?: number;
		/** The thin light along the top left edge; 0: none. */
		rim?: number;
		shades?: string;
		lights?: string;
		/** The brightest reflections, opaque. */
		gloss?: string;
		/** The outline, when it is not the whole edge of the piece (where two pieces meet). */
		outline?: string;
	}

	let { artId, layer = 'front', grip = { x: 0, y: 0 }, alone = false }: Props = $props();

	const uid = $props.id();

	type Side = 'left' | 'right';
	type Cubic = readonly [XY, XY, XY, XY];

	const SIDES: readonly Side[] = ['left', 'right'];
	const FEET_X = [44, 76] as const;
	const EYES_X = [48, 72] as const;
	const EYE_Y = 46;
	/** A hand item is drawn upright from its grip (0, 0), then tilted towards the top left. */
	const HAND_TILT = 'rotate(-36.87)';
	/** Far around any drawing: with `fill-rule="evenodd"` and a form, everything outside it. */
	const AROUND = 'M-200 -200L320 -200L320 320L-200 320Z';

	/** Towards the light (top left) in the frame a piece is drawn in: a hand item is tilted. */
	const axis = $derived<XY>(ITEM_ARTS[artId]?.slot === 'hand' ? [0.2, 1.4] : [1, 1]);

	function shift(by: number): string {
		return `translate(${round(by * axis[0])} ${round(by * axis[1])})`;
	}

	function round(value: number): number {
		return Math.round(value * 100) / 100;
	}

	function circlePath(cx: number, cy: number, r: number): string {
		return ovalPath(cx, cy, r, r);
	}

	/** A ring to fill with `fill-rule="evenodd"`. */
	function ring(cx: number, cy: number, outer: number, inner: number): string {
		return circlePath(cx, cy, outer) + circlePath(cx, cy, inner);
	}

	/** The same path seen in a mirror at the middle of the view box: written in x y pairs only. */
	function mirrorPath(d: string): string {
		return d.replace(
			/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g,
			(_, x: string, y: string) => `${round(120 - Number(x))} ${y}`
		);
	}

	/** The paths of the left one of a pair (boots, straps) and their mirror image for the right one. */
	function pairOf<T extends Record<string, string>>(left: T): Readonly<Record<Side, T>> {
		const right = Object.fromEntries(
			Object.entries(left).map(([key, d]) => [key, mirrorPath(d)])
		) as T;
		return { left, right };
	}

	/** A quadratic curve written as a cubic one. */
	function cubicOf(p0: XY, control: XY, p1: XY): Cubic {
		const toward = (p: XY): XY => [
			p[0] + (2 / 3) * (control[0] - p[0]),
			p[1] + (2 / 3) * (control[1] - p[1])
		];
		return [p0, toward(p0), toward(p1), p1];
	}

	/** A leaf-shaped light or shade from `a` to `b`, bulging `width` on both sides of `middle`. */
	function lens(a: XY, middle: XY, b: XY, width: number): string {
		const dx = b[0] - a[0];
		const dy = b[1] - a[1];
		const length = Math.hypot(dx, dy) || 1;
		const nx = (-dy / length) * width;
		const ny = (dx / length) * width;
		const p = (x: number, y: number) => `${round(x)} ${round(y)}`;
		return (
			`M${p(...a)}Q${p(middle[0] + nx, middle[1] + ny)} ${p(...b)}` +
			`Q${p(middle[0] - nx, middle[1] - ny)} ${p(...a)}Z`
		);
	}

	/** Little V stitches of a knit, in rows. */
	function knit(
		left: number,
		right: number,
		top: number,
		bottom: number,
		dx: number,
		dy: number
	): string {
		const parts: string[] = [];
		for (let y = top; y <= bottom; y += dy) {
			for (let x = left; x <= right; x += dx) {
				const half = dx * 0.36;
				parts.push(
					`M${round(x - half)} ${round(y - 1.1)}L${round(x)} ${round(y + 0.5)}L${round(x + half)} ${round(y - 1.1)}`
				);
			}
		}
		return parts.join('');
	}

	/**
	 * Ribs of a knitted band around a round shape: one line every `step` degrees, from the curve
	 * `top` to the curve `bottom`, and every other gap shaded.
	 */
	function ribbing(
		halfWidth: number,
		step: number,
		top: (x: number) => number,
		bottom: (x: number) => number
	): { lines: string; shades: string } {
		const xs: number[] = [];
		for (let deg = -90 + step / 2; deg < 90; deg += step) {
			xs.push(round(60 + halfWidth * Math.sin((deg * Math.PI) / 180)));
		}
		const lines = xs.map((x) => `M${x} ${round(top(x))}L${x} ${round(bottom(x))}`).join('');
		const shades = xs
			.slice(0, -1)
			.filter((_, i) => i % 2 === 0)
			.map((x, i) => {
				const next = xs[i * 2 + 1] ?? x;
				const mid = round((x + next) / 2);
				return `M${mid} ${round(top(mid))}L${next} ${round(top(next))}L${next} ${round(bottom(next))}L${mid} ${round(bottom(mid))}Z`;
			})
			.join('');
		return { lines, shades };
	}

	/* ---------- Eggs, on the necklace and in the nest ---------- */

	/** An egg, its top at (0, 0). */
	const EGG =
		'M0 1.6C3 1.6 4.7 6.4 4.7 9.6C4.7 12.6 2.6 14.2 0 14.2C-2.6 14.2 -4.7 12.6 -4.7 9.6C-4.7 6.4 -3 1.6 0 1.6Z';
	const EGG_LIGHT =
		'M-3.2 8.6C-3.2 6.4 -2.2 4.4 -0.8 3.2C-1.4 4.8 -1.8 6.8 -1.8 8.8C-1.8 9.6 -3.2 9.6 -3.2 8.6Z';
	const EGG_GLOSS = ovalPath(-1.4, 5.4, 0.9, 1.4) + ovalPath(-2.6, 10.6, 0.4, 0.5);
	const EGG_SPOTS = [
		[-1.8, 9.4, 0.85],
		[1.6, 6.2, 0.6],
		[1.2, 11.2, 0.55],
		[-0.4, 5, 0.45],
		[2.6, 9.2, 0.5],
		[-2.8, 12, 0.4],
		[0.2, 12.8, 0.4]
	]
		.map(([x = 0, y = 0, r = 0]) => circlePath(x, y, r))
		.join('');
	const EGG_CAP = 'M-2.3 3.4C-2.3 1.9 -1.2 1 0 1C1.2 1 2.3 1.9 2.3 3.4C1.6 4.1 -1.6 4.1 -2.3 3.4Z';

	/* ---------- Necklace ---------- */

	const NECK_CORD = cubicOf([40.4, 72.6], [60, 98.6], [79.6, 72.6]);
	const NECK_CORD_PATH = 'M40.4 72.6Q60 98.6 79.6 72.6';
	const NECK_EGG_COLORS = ['ring', 'leaf', 'cream', 'rubber', 'ice'] as const;
	const NECK_EGGS = [0.16, 0.33, 0.5, 0.67, 0.84].map((t, i) => {
		const [x, y] = pointOnCubic(NECK_CORD, t);
		return {
			x: round(x),
			y: round(y),
			size: [0.86, 0.96, 1.1, 0.96, 0.86][i] ?? 1,
			turn: round((0.5 - t) * 46),
			fill: NECK_EGG_COLORS[i] ?? 'cream'
		};
	});
	const NECK_BEADS = [0.07, 0.245, 0.415, 0.585, 0.755, 0.93].map((t) =>
		pointOnCubic(NECK_CORD, t).map(round)
	);
	const CORD_TWISTS = stitchesAlong(NECK_CORD, 26, 0.32);

	/* ---------- Springs ---------- */

	function springOf(x: number) {
		const strands = [0, 1, 2].map((i) => {
			const y = 117.4 + i * 2.2;
			return {
				back: `M${x + 7.6} ${round(y + 0.4)}Q${x} ${round(y - 1.8)} ${x - 7.6} ${round(y + 1.4)}L${x - 7.6} ${round(y + 2.6)}Q${x} ${round(y - 0.6)} ${x + 7.6} ${round(y + 1.6)}Z`,
				front: `M${x - 7.6} ${round(y - 0.6)}Q${x} ${round(y + 2.6)} ${x + 7.6} ${round(y + 0.4)}L${x + 7.6} ${round(y + 1.8)}Q${x} ${round(y + 4.2)} ${x - 7.6} ${round(y + 0.8)}Z`,
				shine: `M${x - 4.6} ${round(y + 1)}Q${x - 2} ${round(y + 2)} ${x + 0.6} ${round(y + 2.1)}`
			};
		});
		return {
			x,
			strands,
			plate: `M${x - 11} 113.6C${x - 11} 112.2 ${x + 11} 112.2 ${x + 11} 113.6L${x + 11} 115.2C${x + 11} 117 ${x - 11} 117 ${x - 11} 115.2Z`,
			plateLight: `M${x - 9} 113.4C${x - 4} 113 ${x + 4} 113 ${x + 9} 113.4L${x + 9} 114C${x + 4} 113.6 ${x - 4} 113.6 ${x - 9} 114Z`,
			pad: `M${x - 9.8} 124.4C${x - 9.8} 122.8 ${x + 9.8} 122.8 ${x + 9.8} 124.4L${x + 9.8} 125.6C${x + 9.8} 127.4 ${x - 9.8} 127.4 ${x - 9.8} 125.6Z`,
			padLight: `M${x - 7} 123.8C${x - 2} 123.4 ${x + 2} 123.4 ${x + 7} 123.8L${x + 7} 124.4C${x + 2} 124 ${x - 2} 124 ${x - 7} 124.4Z`,
			strap: `M${x - 11.8} 113C${x - 12.2} 110 ${x - 12} 107 ${x - 11.2} 104.6C${x - 4} 102.4 ${x + 4} 102.4 ${x + 11.2} 104.6C${x + 12} 107 ${x + 12.2} 110 ${x + 11.8} 113L${x + 9.4} 113C${x + 9.8} 110.6 ${x + 9.8} 108.8 ${x + 9.2} 107.6C${x + 3} 105.8 ${x - 3} 105.8 ${x - 9.2} 107.6C${x - 9.8} 108.8 ${x - 9.8} 110.6 ${x - 9.4} 113Z`,
			strapLight: `M${x - 8} 104.6C${x - 3} 103.6 ${x + 3} 103.6 ${x + 8} 104.6L${x + 8} 105.4C${x + 3} 104.4 ${x - 3} 104.4 ${x - 8} 105.4Z`,
			rivets: [x - 10.6, x + 10.6]
		};
	}
	const SPRINGS = FEET_X.map(springOf);

	/* ---------- Rain boots ---------- */

	const RAIN_BOOT = pairOf({
		boot: 'M37.2 93.6C37.4 97.4 37.4 101 36.8 103.8C32 104.6 27.4 106.6 26.6 110.2C26.2 111.8 27.2 112.8 28.8 112.8L55.2 112.8C56.4 112.8 57 112 57 110.8C56.8 107.6 54.8 105 54.2 102.2C53.8 99.4 53.8 96.4 54.2 93.6Z',
		bootLight:
			'M28.6 109.6C30 107.6 32.6 106.2 35.6 105.6C33.6 107 31.8 108.4 30.6 110.2C30.2 110.8 28.4 110.6 28.6 109.6Z',
		bootGloss:
			'M39.2 96.4C39.9 96.4 40.3 96.8 40.3 97.4C40.3 99.4 40.1 101.4 39.5 103.2C39.3 103.6 38.5 103.6 38.5 103C38.9 101 38.9 98.8 38.9 97C38.9 96.7 38.9 96.4 39.2 96.4ZM31.4 108.2C31.9 107.6 32.6 107.2 33.3 107C32.9 107.6 32.5 108.2 32.2 108.8C32 109.1 31.2 108.8 31.4 108.2Z',
		bootShade:
			'M49.6 93C51 99.4 51.4 105.6 49.2 113.4L60 113.4L60 93ZM25 108.8C36 107.8 48 108.2 60 109L60 114L25 114Z',
		sole: 'M26.2 111.8C26.2 111.2 26.6 110.8 27.2 110.8L56.6 110.8C57.2 110.8 57.6 111.2 57.6 111.8L57.6 113.8C57.6 115 56.8 115.8 55.6 115.8L28.4 115.8C27 115.8 26.2 114.8 26.2 113.4Z',
		tread:
			'M29.6 115.6L30.6 113.2M33.6 115.6L34.6 113.2M37.6 115.6L38.6 113.2M41.6 115.6L42.6 113.2M45.6 115.6L46.6 113.2M49.6 115.6L50.6 113.2M53.6 115.6L54.6 113.2',
		cuff: 'M35.6 93.4C35.6 91.4 37.6 90.4 40.2 90.4L51.2 90.4C53.8 90.4 55.8 91.4 55.8 93.4C55.8 95.2 54.8 96.2 53 96C48.2 95.4 43.4 95.4 38.4 96C36.6 96.2 35.6 95.2 35.6 93.4Z',
		cuffLight: 'M38 91.6C42.4 91.2 49 91.2 53.4 91.6L53.4 92.6C49 92.2 42.4 92.2 38 92.6Z',
		tab: 'M54.6 91.8C56.8 90.2 59.4 91.6 59 94.2C58.8 95.8 57.2 96.6 55.6 96.2'
	});

	/* ---------- Ball shoes ---------- */

	const BALL_SHOE = pairOf({
		shoe: 'M31 110C30.8 106.6 33.2 104.4 36.6 104.4C39.6 104.4 41.6 106.6 44.8 107.2C47.8 107.8 51 106.6 53 104.8C54.8 103.2 57.4 104.6 57.8 107.6C58 109.4 57.8 111.2 57.6 112.2C57.4 113.2 56.6 113.6 55.6 113.6L33.6 113.6C31.8 113.6 31 112.2 31 110Z',
		shoeShade:
			'M28 111.4C38 112.6 48 112.4 60 110.6L60 116L28 116ZM54 102C56.8 106 57.2 110 56.2 116L60 116L60 102Z',
		shoeGloss:
			'M33.2 108.8C33.9 107.2 35.4 106.3 37.2 106.2C35.9 106.9 34.8 107.9 34.2 109.2C33.9 109.8 33 109.6 33.2 108.8ZM43.2 110.4C47 110.8 50.8 110.4 54.2 109.2C51.6 111.2 47.2 111.9 43.2 111.4C42.6 111.3 42.5 110.4 43.2 110.4ZM55.6 106.6C56.1 107.2 56.3 108 56.3 108.8C55.8 108.4 55.5 107.8 55.3 107.1C55.2 106.7 55.4 106.4 55.6 106.6Z',
		lining:
			'M32.2 106.6C33.2 105.4 34.8 104.8 36.6 104.8C39.6 104.8 41.6 107 44.8 107.6C47.8 108.2 51 107 53 105.2C54.6 103.8 56.6 104.8 57.2 106.8',
		sole: 'M30.6 111.8C31 113.4 32.2 114.4 33.6 114.4L55.8 114.4C56.8 114.4 57.4 113.8 57.6 112.8L57.8 114C57.6 115.4 56.8 116.2 55.6 116.2L33.4 116.2C31.6 116.2 30.6 114.6 30.6 111.8Z',
		heel: 'M51 114.6L56.6 114.6C56.6 116.4 56.2 117.8 55.6 118.8L52.2 118.8C51.6 117.8 51.2 116.4 51 114.6Z',
		heelGloss: 'M52.2 115.2L53 115.2L53.4 118L52.8 118Z',
		strap: 'M38.4 106.6C39.6 102.2 49.6 100.8 53.2 104.4L52 106.2C48.6 103.4 41.8 104 40.4 107.4Z',
		strapGloss:
			'M41 104.6C43.6 103.2 47.4 102.8 50 103.6C47.2 103.6 44 104 41.6 105.2C41.2 105.4 40.6 104.9 41 104.6Z',
		bowLeft: 'M35.2 107.6C33 104.8 29.8 105.4 30.2 107.8C30.6 110 33.4 110 35.2 107.6Z',
		bowRight: 'M35.2 107.6C37.4 104.8 40.6 105.4 40.2 107.8C39.8 110 37 110 35.2 107.6Z',
		bowShade: 'M29 108.6C31.6 110 34 109.6 36.4 107.8L36.4 111L29 111Z'
	});

	/* ---------- Roller skates ---------- */

	const SKATE = pairOf({
		boot: 'M38.4 95.6C38.2 94.2 39.2 93.4 40.6 93.4L51.6 93.4C53 93.4 53.8 94.2 53.8 95.6C53.6 99.2 53.8 102.8 54.6 105.4C56.6 106.4 58 108.2 58 110.4L58 112.4L31 112.4C29.8 112.4 29.4 111.2 29.8 110C30.8 107 33.8 105.2 37.2 104.4C38 101.6 38.6 98.6 38.4 95.6Z',
		bootShade:
			'M50.4 93C51.6 99.6 52.6 106 52 113.4L60 113.4L60 93ZM26 110C36 109.6 48 109.6 60 110L60 113.4L26 113.4Z',
		bootGloss:
			'M40.2 98.2C40.6 98.2 40.8 98.5 40.8 98.9C40.7 100.6 40.4 102.2 39.8 103.8C39.6 104.2 39 104 39.1 103.6C39.6 102 39.8 100.4 39.8 98.7C39.8 98.4 39.9 98.2 40.2 98.2ZM31.8 108.6C32.8 107.4 34.2 106.6 35.8 106.2C34.6 107 33.6 107.8 32.8 108.9C32.5 109.3 31.5 109.1 31.8 108.6Z',
		stripe: 'M46 96.4C46.6 100.8 48.2 104.6 51 107.6L54.6 106.6C51.8 103.6 50.4 100.2 49.8 96.2Z',
		laces:
			'M39.6 98.6L44.8 100.8M44.8 98.6L39.6 100.8M38.8 101.8L44 104M44 101.8L38.8 104M36.4 105L40.8 107.2M40.8 105L36.4 107.2',
		collar:
			'M37.6 94.8C37.6 92.6 39.2 91.4 41.2 91.4L51 91.4C53 91.4 54.6 92.6 54.6 94.8C54.6 96.2 53.6 97 52.2 96.8C48.2 96.2 44.2 96.2 40 96.8C38.6 97 37.6 96.2 37.6 94.8Z',
		collarLight: 'M40 92.4C44 92.2 48.6 92.2 52.4 92.4L52.4 93.2C48.6 93 44 93 40 93.2Z',
		plate:
			'M30.2 112C30.2 111.6 30.6 111.4 31 111.4L58.4 111.4C59 111.4 59.4 112 59.2 112.6L58.8 114.2C58.6 114.8 58 115.2 57.4 115.2L31.6 115.2C30.8 115.2 30.2 114.6 30.2 113.8Z',
		plateLight: 'M31.4 112.2L58 112.2L57.8 112.9L31.4 112.9Z',
		trucks:
			'M34.4 115C35.4 116.4 37.6 116.4 38.6 115L38.2 117.8L34.8 117.8ZM50.2 115C51.2 116.4 53.4 116.4 54.4 115L54 117.8L50.6 117.8Z',
		stop: 'M30.2 110.4C28.2 110.4 26.8 111.8 27 113.6C27.2 115.4 28.8 116.2 30.6 116L33.6 115.4L33.2 110.4Z'
	});
	const SKATE_WHEELS = [36.6, 52.4] as const;

	/* ---------- Nest backpack ---------- */

	const NEST = {
		bowl: 'M2.6 50C2.6 62 12 70.8 24 70.8C36 70.8 45.4 62 45.4 50Z',
		weaveDark:
			'M4.2 55.2C10 61 38 61 43.8 55.2M6.4 60.6C12 66 36 66 41.6 60.6M11.4 66.2C17.6 69.4 30.4 69.4 36.6 66.2M3.6 52.6C9 57.6 22 59.4 33 58',
		weaveLight:
			'M8.2 53.6C14 59.4 18.4 64.4 21.8 70.4M40 54.2C34 59.4 29.8 64.4 27.4 70.4M16.4 53.4C20.4 57.4 26.6 60.4 34.6 62M5 57.8C11.6 62.6 20 64.4 28 63.6M43.2 57C38 61.6 30.6 64.8 22 65.6',
		rimBack: `M2.6 50${ovalArc(24, 50, 21.4, 8.6, 180, 360)}L39.6 49.4${ovalArc(24, 49.4, 15.6, 5.4, 360, 180)}Z`,
		rimFront: `M2.6 50${ovalArc(24, 50, 21.4, 8.6, 180, 0)}L39.6 49.4${ovalArc(24, 49.4, 15.6, 5.4, 0, 180)}Z`,
		rimFrontLine: `M2.6 50${ovalArc(24, 50, 21.4, 8.6, 180, 0)}M39.6 49.4${ovalArc(24, 49.4, 15.6, 5.4, 0, 180)}`,
		rimBackLine: `M2.6 50${ovalArc(24, 50, 21.4, 8.6, 180, 360)}M39.6 49.4${ovalArc(24, 49.4, 15.6, 5.4, 360, 180)}`,
		hollow: ovalPath(24, 49.4, 15.6, 5.4),
		leaf: 'M41.6 50.4C42.6 45.6 46.6 42.6 51.4 42.8C50.8 47.6 47 51 41.6 50.4Z',
		leafVein: 'M42.6 49.6C45 47.4 47.6 45.4 50.4 43.8',
		twigEnds:
			'M3.6 52.6L-2.4 50M44.6 53L51 51.4M8.4 63.4L3.8 66.8M41 62.6L46 65.6M14 68.6L11.6 73.2'
	};
	const NEST_RIM_TICKS = Array.from({ length: 15 }, (_, i) => {
		const a = 180 - 9 - i * 11.4;
		const [x1, y1] = ovalPoint(24, 49.6, 16.6, 5.8, a);
		const [x2, y2] = ovalPoint(24, 50, 20.8, 8.2, a - 7);
		return `M${x1} ${y1}L${x2} ${y2}`;
	}).join('');
	const NEST_RIM_BACK_TICKS = Array.from({ length: 13 }, (_, i) => {
		const a = 180 + 12 + i * 13;
		const [x1, y1] = ovalPoint(24, 49.6, 16.4, 5.6, a);
		const [x2, y2] = ovalPoint(24, 50, 20.8, 8.2, a + 7);
		return `M${x1} ${y1}L${x2} ${y2}`;
	}).join('');

	const BACKPACK_STRAP = pairOf({
		strap: 'M40.2 72.2C41 79 38.8 85.6 33.4 91.8L37.6 94.8C43.2 88 45.8 80.6 45.4 71.8Z',
		strapShade: 'M43.8 70C45 80 42 88 36.6 96L48 96L48 70Z',
		strapLight: 'M41 73.6C41.4 78.8 39.8 84 36.2 88.8L35.6 88.4C38.8 83.8 40.4 78.8 40.2 73.6Z',
		buckle:
			'M38.8 77.4C38.8 76.6 39.4 76 40.2 76L45.8 76C46.6 76 47.2 76.6 47.2 77.4L47.2 80.8C47.2 81.6 46.6 82.2 45.8 82.2L40.2 82.2C39.4 82.2 38.8 81.6 38.8 80.8ZM40.4 77.6L40.4 80.6L45.6 80.6L45.6 77.6Z',
		tongue: 'M43 77.4L43 80.8'
	});
	const BACKPACK_SEAMS = [
		stitchesAlong(
			[
				[41.2, 72.4],
				[41.8, 79],
				[39.4, 85.6],
				[34.6, 91.4]
			],
			9
		),
		stitchesAlong(
			[
				[44.4, 72.2],
				[44.8, 80.4],
				[42.2, 87.6],
				[37, 93.8]
			],
			9
		)
	].join('');
	const CHEST_STRAP = 'M43.6 83.4C54 86.2 66 86.2 76.4 83.4L76.6 86.8C66 89.6 54 89.6 43.4 86.8Z';
	const CHEST_CLIP =
		'M55.4 84.6C57 84.2 63 84.2 64.6 84.6C65.4 85.6 65.4 87.4 64.6 88.4C63 88.8 57 88.8 55.4 88.4C54.6 87.4 54.6 85.6 55.4 84.6Z';

	/* ---------- Comet cape ---------- */

	const CAPE =
		'M36 61C44 63.4 50 66 60 66C70 66 76 63.4 84 61C90.4 66.8 94.6 78 96.2 92C96.8 97.6 96.4 102.4 95 106.6C80 111 50 111.6 34.6 110.6C30.4 112.6 25 114.6 18.6 114.2C21.6 112 22.8 109.8 22.4 107.8C17.4 109.2 11.4 108.8 5 105.8C10 104.4 12.8 101.6 13.2 98.6C9.2 98.6 4.6 96.6 0.6 92.6C7.4 91.8 12 88.2 15.4 82.4C20.4 73.8 27.4 65 36 61Z';
	const CAPE_LINING =
		'M36 61C27.4 65 20.4 73.8 15.4 82.4C12 88.2 7.4 91.8 0.6 92.6C3.8 94 7.6 94 11 92.6C15.8 90.4 19.2 85.6 22.2 79.6C25.8 72.4 30.4 66.6 36.8 63.8Z';
	const CAPE_COLLAR =
		'M33.6 61.6C30.4 56 30.6 49.6 33.8 45.2C41.4 53.2 49.6 57.4 60 57.8C70.4 57.4 78.6 53.2 86.2 45.2C89.4 49.6 89.6 56 86.4 61.6C78.6 65.6 70 67.4 60 67.4C50 67.4 41.4 65.6 33.6 61.6Z';
	const CAPE_COLLAR_INSIDE =
		'M33.8 45.2C41.4 53.2 49.6 57.4 60 57.8C70.4 57.4 78.6 53.2 86.2 45.2C82 54.6 72 60.6 60 61C48 60.6 38 54.6 33.8 45.2Z';
	const CAPE_FOLDS =
		'M32.6 70C27 80 22.4 92 19.6 106M37.4 74.4C34.4 86 31.6 98 29.4 110.4M88.4 70C90.6 80 91.8 92 91.6 104';
	const CAPE_FOLD_SHADES = [
		lens([32.6, 70], [26.6, 88], [19.6, 106], 2.6),
		lens([37.4, 74.4], [33.4, 92], [29.4, 110.4], 2.2),
		lens([88.4, 70], [91.6, 88], [91.6, 104], 1.8)
	].join('');
	const CAPE_FOLD_LIGHTS = [
		lens([28.6, 70.4], [21.6, 84], [14.6, 98], 1.6),
		lens([35, 76], [29.8, 92], [25.8, 106], 1.2)
	].join('');
	const CAPE_STARS = [
		roundedStarPath(10.4, 102.6, 2.4, 0.9, 4, 0.2),
		roundedStarPath(28.6, 104.6, 2, 0.8, 4, 0.2),
		roundedStarPath(31.4, 76.6, 1.8, 0.7, 4, 0.2),
		roundedStarPath(90.4, 84.6, 1.9, 0.7, 4, 0.2),
		roundedStarPath(92.2, 99.4, 1.5, 0.6, 4, 0.2)
	].join('');
	const CAPE_DOTS = [
		[23.4, 77.4],
		[14.6, 92.6],
		[25.6, 99.8],
		[88.2, 94.4],
		[34.2, 96.8]
	]
		.map(([x = 0, y = 0]) => circlePath(x, y, 0.6))
		.join('');
	const COMET_STAR = roundedStarPath(18.8, 96.4, 4.8, 2.2, 5, 0.26);
	const COMET_TRAIL =
		'M21.6 92.6C24.6 87.6 28.2 84.2 32.6 81.8M23.8 95C28 91.2 31.8 89 35.8 87.6M20.4 91.8C22.2 86.8 24.8 83.2 28.2 80.2';
	const CAPE_CORD = pairOf({ cord: 'M38.2 66.4C42.4 72.4 47.6 77.4 54.4 80.6' });
	const CAPE_CLASP = roundedStarPath(60, 81.4, 6, 2.9, 5, 0.26);

	/* ---------- Apron ---------- */

	/** The flat gingham at (u, v), bent round the belly and into the folds of the skirt. */
	function apronAt(u: number, v: number): XY {
		const skirt = Math.max(0, v - 87);
		const spread = 1 + skirt * 0.03;
		const fold = Math.sin(u * 0.42) * skirt * 0.08;
		return [round(60 + u * spread + fold), round(v + 2.6 * (1 - (u / 26) ** 2))];
	}

	function apronBand(from: XY, to: XY, width: XY, steps: number): string {
		const left: XY[] = [];
		const right: XY[] = [];
		for (let i = 0; i <= steps; i++) {
			const u = from[0] + ((to[0] - from[0]) * i) / steps;
			const v = from[1] + ((to[1] - from[1]) * i) / steps;
			left.push(apronAt(u, v));
			right.push(apronAt(u + width[0], v + width[1]));
		}
		const points = [...left, ...right.reverse()];
		return `M${points.map(([x, y]) => `${x} ${y}`).join('L')}Z`;
	}

	const GINGHAM_SIZE = 2.6;
	const GINGHAM = (() => {
		const bands: string[] = [];
		for (let u = -33.8; u < 32; u += 2 * GINGHAM_SIZE) {
			bands.push(apronBand([u, 64], [u, 112], [GINGHAM_SIZE, 0], 16));
		}
		for (let v = 64.6; v < 112; v += 2 * GINGHAM_SIZE) {
			bands.push(apronBand([-36, v], [36, v], [0, GINGHAM_SIZE], 18));
		}
		return bands.join('');
	})();
	const APRON_HEM = (() => {
		const count = 7;
		const points: XY[] = Array.from({ length: count + 1 }, (_, i) => {
			const x = 85 - (i * 50) / count;
			return [round(x), round(102.4 + 2.6 * (1 - ((x - 60) / 25) ** 2))];
		});
		return points
			.slice(1)
			.map((point, i) => {
				const before = points[i] ?? point;
				return `Q${round((before[0] + point[0]) / 2)} ${round((before[1] + point[1]) / 2 + 4.6)} ${point[0]} ${point[1]}`;
			})
			.join('');
	})();
	const APRON = `M47.4 70.2C51 69.4 69 69.4 72.6 70.2C72.8 75.2 73.4 80 74.6 85C80.4 87.4 85.4 92.6 86.6 99C86.8 100.6 86.2 101.8 85 102.4${APRON_HEM}C33.8 101.8 33.2 100.6 33.4 99C34.6 92.6 39.6 87.4 45.4 85C46.6 80 47.2 75.2 47.4 70.2Z`;
	const APRON_FOLD_SHADES = [-11.2, 3.7, 18.6]
		.map((u) => lens(apronAt(u, 89), apronAt(u - 1, 98), apronAt(u, 108), 2.2))
		.join('');
	const APRON_FOLD_LIGHTS = [-18.6, -3.8, 11.2]
		.map((u) => lens(apronAt(u, 90), apronAt(u - 0.6, 98), apronAt(u, 106), 1.2))
		.join('');
	const APRON_BIB_SHADE = 'M68.6 68C71 76 72.4 82 74 88L80 88L80 68Z';
	const WAISTBAND =
		'M29.6 83.4C46 89.4 74 89.4 90.4 83.4C91.8 84.4 92 86.8 90.8 87.8C74 93.8 46 93.8 29.2 87.8C28 86.8 28.2 84.4 29.6 83.4Z';
	const APRON_NECK = 'M49.2 70.8C48 62.4 52 56.8 60 56.8C68 56.8 72 62.4 70.8 70.8';
	const WAISTBAND_LIGHT = 'M30.4 84.4C46 90 74 90 89.6 84.4L89.6 85.2C74 90.8 46 90.8 30.4 85.2Z';
	const POCKET =
		'M39.4 93C43.2 92.2 49.4 92.2 53.2 93C53.4 96 53 99 52 101.2C48.6 102.2 44.2 102.2 40.8 101.2C39.8 99 39.4 96 39.4 93Z';
	const POCKET_SEAMS = stitchesAlong(
		[
			[41, 95],
			[41.2, 101.4],
			[51.6, 101.4],
			[51.8, 95]
		],
		10
	);
	const SPOON_HANDLE = capsulePath(45.6, 96, 43.4, 85.4, 0.95);
	const SPOON_BOWL =
		'M43 85.6C41.2 85.6 40 83.6 40.2 81.4C40.4 79.4 41.6 78 43 78.2C44.6 78.4 45.6 80 45.4 82.2C45.2 84.2 44.4 85.6 43 85.6Z';
	const APRON_BOW = {
		tailA: 'M77.6 90.6C76.6 93.8 75 96.6 73.4 98.4L76.4 99.6C77.8 97.4 78.8 94.2 79.2 91Z',
		tailB: 'M79.2 90.6C80.2 93.4 81.4 96 83 97.8L85.6 96.2C83.8 94.4 81.8 92.6 80.4 90.2Z',
		loopA: 'M78.4 90C75 86.2 70.4 86.6 70.4 89.6C70.4 92.6 75 93.2 78.4 90Z',
		loopB: 'M78.4 90C81.8 86.2 86.4 86.6 86.4 89.6C86.4 92.6 81.8 93.2 78.4 90Z',
		knot: ovalPath(78.4, 90, 2, 2.2)
	};

	/* ---------- Sweater ---------- */

	const SWEATER =
		'M40 57.4C50 55 70 55 80 57.4C86.4 60.6 90.8 66 92.6 73.6C95.6 84 97 92.4 94 99.4C92.2 102.6 89 103.6 85.4 103.8C72 105 48 105 34.6 103.8C31 103.6 27.8 102.6 26 99.4C23 92.4 24.4 84 27.4 73.6C29.2 66 33.6 60.6 40 57.4Z';
	const SWEATER_STRIPES = [64.6, 73.8, 83, 92.2]
		.map((y, i) => {
			const w = i % 2 === 0 ? 1 : -1;
			return `M16 ${round(y + w)}C34 ${round(y - 2 * w)} 44 ${round(y + 4)} 60 ${round(y + 4 + w)}C76 ${round(y + 4 - w)} 86 ${round(y - w)} 104 ${round(y + w)}L104 ${round(y + 5.2 - w)}C86 ${round(y + 3.4 + w)} 76 ${round(y + 9.2)} 60 ${round(y + 9.4 - w)}C44 ${round(y + 9.6)} 34 ${round(y + 3.6 + w)} 16 ${round(y + 5.4)}Z`;
		})
		.join('');
	const SWEATER_KNIT = knit(22, 98, 59, 101, 3.2, 3);
	const SWEATER_SHADES =
		'M78 54C92 70 93 88 85 104L104 104L104 54ZM16 96Q60 104 104 96L104 108L16 108Z';
	const SWEATER_LIGHTS =
		'M29.6 75.6C31 69.6 34 64.8 38.4 61.6C35.4 65.6 33.4 70.4 32.2 76C31.8 77.6 29.2 77.2 29.6 75.6ZM44.2 66C48.6 63.6 54 62.6 59 62.6C54.4 63.8 50 65.4 46.2 67.8C45 68.6 43.2 66.6 44.2 66Z';
	const SWEATER_HEM =
		'M26.2 97.4C40 101.4 80 101.4 93.8 97.4C94.8 99.6 94.6 101.8 93.4 103.6C80 107.4 40 107.4 26.6 103.6C25.4 101.8 25.2 99.6 26.2 97.4Z';
	const SWEATER_HEM_RIBS = ribbing(
		34,
		6,
		(x) => 97 + 4 * (1 - ((x - 60) / 34) ** 2),
		(x) => 104 + 3.8 * (1 - ((x - 60) / 34) ** 2)
	);
	const SWEATER_COLLAR = pairOf({
		collar: 'M33.2 66.4C37.4 61.6 43.8 58.6 50.6 58L51.4 61.6C45.2 62.2 39.8 64.8 36.2 69Z'
	});
	/** The neck of the sweater drawn alone: its ribbed collar and the inside of its back. */
	const SWEATER_NECK =
		'M40 57.4C50 55 70 55 80 57.4C76.6 62.8 68.6 65.8 60 65.8C51.4 65.8 43.4 62.8 40 57.4ZM44.6 58.4C48.6 61.6 54 63 60 63C66 63 71.4 61.6 75.4 58.4C70 57.2 50 57.2 44.6 58.4Z';
	const SWEATER_NECK_INSIDE =
		'M44.6 58.4C48.6 61.6 54 63 60 63C66 63 71.4 61.6 75.4 58.4C70 57.2 50 57.2 44.6 58.4Z';
	const SWEATER_NECK_LINE =
		'M40 57.4C50 55 70 55 80 57.4C76.6 62.8 68.6 65.8 60 65.8C51.4 65.8 43.4 62.8 40 57.4ZM44.6 58.4C48.6 61.6 54 63 60 63C66 63 71.4 61.6 75.4 58.4';
	const SWEATER_NECK_RIBS = [-15, -11, -7, -3, 1, 5, 9, 13]
		.map((dx) => {
			const x = 60 + dx + 1;
			return `M${round(x * 0.92 + 4.8)} ${round(62.4 - Math.abs(dx) * 0.16)}L${round(x)} ${round(65 - Math.abs(dx) * 0.16)}`;
		})
		.join('');
	/** The sleeves of the sweater drawn alone, spread out so that it reads as a sweater. */
	const SWEATER_SLEEVE = pairOf({
		sleeve:
			'M39 61.8C42.6 64.6 43.4 69.6 41 73.4C36.6 79.8 30.4 85.4 24.2 89.2C21.4 90.2 17 87.6 15.6 84.6C19.6 78 25.2 71 31.4 65.2C33.8 63 36.6 61 39 61.8Z',
		cuff: 'M15 83.4C17.4 87.2 21.4 90 25.4 90.6L22.8 94.2C18.6 93.4 14.6 90.6 12 86.8Z',
		stripes:
			'M4 69.6Q28 71.4 52 69.6L52 73.8Q28 75.6 4 73.8ZM4 78.6Q28 80.4 52 78.6L52 82.8Q28 84.6 4 82.8Z'
	});
	/** Stripes of a sleeve in the frame of its arm: the grip at (0, 0), the arm along -y. */
	const SLEEVE_STRIPES = [0, 1, 2, 3, 4, 5]
		.map((i) => {
			const y = -19 - 8.6 * i;
			return `M-16 ${y}Q0 ${round(y + 1.8)} 16 ${y}L16 ${round(y + 4.4)}Q0 ${round(y + 6.2)} -16 ${round(y + 4.4)}Z`;
		})
		.join('');
	const SLEEVE_BASE = 'M-16 -80L16 -80L16 -2L-16 -2Z';
	const SLEEVE_CUFF = 'M-16 -10.6Q0 -8.8 16 -10.6L16 -2L-16 -2Z';
	const SLEEVE_CUFF_RIBS = Array.from({ length: 9 }, (_, i) => {
		const x = round(-6.4 + i * 1.6);
		return `M${x} -9.4L${x} -3.4`;
	}).join('');
	const SLEEVE_KNIT = knit(-12, 12, -76, -12, 3.2, 3);
	const SLEEVE_KNIT_LEFT = knit(14, 42, 62, 92, 3.2, 3);
	const SLEEVE_KNIT_RIGHT = knit(78, 106, 62, 92, 3.2, 3);

	/* ---------- Beanie ---------- */

	const BEANIE = 'M31.4 27C29.8 14.4 42.4 4.6 60 4.6C77.6 4.6 90.2 14.4 88.6 27Z';
	const BEANIE_KNIT = (() => {
		const parts: string[] = [];
		for (let y = 8; y <= 26; y += 2.8) {
			const half = 28.6 * Math.sqrt(Math.max(0, 1 - ((y - 27) / 22.4) ** 2));
			for (let deg = -72; deg <= 72; deg += 9) {
				const s = Math.sin((deg * Math.PI) / 180);
				const h = 1.5 * Math.cos((deg * Math.PI) / 180) * (half / 28.6) + 0.2;
				if (h < 0.5) continue;
				const x = 60 + half * s;
				parts.push(
					`M${round(x - h)} ${round(y - 1)}L${round(x)} ${round(y + 0.6)}L${round(x + h)} ${round(y - 1)}`
				);
			}
		}
		return parts.join('');
	})();
	const BEANIE_BAND = 'M28 13.2Q60 17.6 92 13.2L92 19Q60 23.4 28 19Z';
	const BEANIE_DIAMONDS = [-60, -40, -20, 0, 20, 40, 60]
		.map((deg) => {
			const s = Math.sin((deg * Math.PI) / 180);
			const x = 60 + 26 * s;
			const y = 16.1 + 2.2 * (1 - s * s);
			const w = 2.6 * Math.cos((deg * Math.PI) / 180) + 0.4;
			return `M${round(x)} ${round(y - 2.2)}L${round(x + w)} ${round(y)}L${round(x)} ${round(y + 2.2)}L${round(x - w)} ${round(y)}Z`;
		})
		.join('');
	const BEANIE_DOTS = [-50, -30, -10, 10, 30, 50]
		.flatMap((deg) => {
			const s = Math.sin((deg * Math.PI) / 180);
			return [
				circlePath(round(60 + 25 * s), round(11 + 2 * (1 - s * s)), 0.7),
				circlePath(round(60 + 28 * s), round(21.6 + 2.2 * (1 - s * s)), 0.7)
			];
		})
		.join('');
	const BEANIE_CUFF =
		'M30.4 22.2C46 26.4 74 26.4 89.6 22.2C91 25.4 91.2 28.6 90.4 31.8C74 36.6 46 36.6 29.6 31.8C28.8 28.6 29 25.4 30.4 22.2Z';
	const BEANIE_RIBS = ribbing(
		30.6,
		6,
		(x) => 22.2 + 3.15 * (1 - ((x - 60) / 29.6) ** 2),
		(x) => 31.8 + 3.6 * (1 - ((x - 60) / 30.4) ** 2)
	);
	const BEANIE_CUFF_LIGHT =
		'M31.2 23.4C46 27.6 74 27.6 88.8 23.4L88.9 24.6C74 28.8 46 28.8 31.1 24.6Z';
	const BEANIE_LIGHTS =
		'M36.4 17.6C38.6 12.4 44 8.4 50.4 6.8C45.6 9.6 41.6 13.6 39.6 18.4C39 19.8 35.8 19.2 36.4 17.6Z';
	const BEANIE_CAST =
		'M34.4 33.4C46 37.6 74 37.6 85.6 33.4C80.6 38 70.6 39.4 60 39.4C49.4 39.4 39.4 38 34.4 33.4Z';
	const POMPOM = fluffPath(60, 5.6, 6.2, 15, 0.75);
	const POMPOM_FIBRES =
		'M56.6 3.6L58 5M61.8 2.6L62.4 4.2M64 6.6L65.6 7M58.4 8.2L57.4 9.8M55 6.4L53.6 6.8M60.4 6L60.8 7.6M62.6 9.2L63.4 10.4';

	/* ---------- Astronaut helmet ---------- */

	const BUBBLE = ovalPath(60, 41.4, 37.4, 38.2);
	const BUBBLE_EDGE = BUBBLE + ovalPath(60, 41.4, 35, 35.8);
	const BUBBLE_GLOSS =
		'M28.8 44C28.8 27 39.8 13.2 55.6 8.8C44.2 15.4 35.4 28.2 33.6 44.2C33.4 46 28.8 46.2 28.8 44Z' +
		ovalPath(84.4, 30.6, 1.4, 1.4) +
		ovalPath(80.6, 64.2, 0.9, 0.9);
	const BUBBLE_LIGHTS =
		'M70 11C76.4 12.6 82.2 16.4 86 21.6C85.4 23.4 83.4 24 82 22.8C78.6 19 74.6 16.4 69.6 14.8C68.2 14.2 68.4 10.6 70 11ZM36.6 58.6C38.6 64 42.4 68.4 47.4 71.4C45.2 71.8 43 71.2 41.4 70C38.8 67.6 37 63.6 36.6 58.6Z';
	const HELMET_COLLAR =
		'M24.4 70.2C33.6 79.4 86.4 79.4 95.6 70.2C97.8 72.6 98.6 75.8 97.6 78.8C87 89.8 33 89.8 22.4 78.8C21.4 75.8 22.2 72.6 24.4 70.2Z';
	const HELMET_COLLAR_LINES =
		'M26.6 72.6C36 80.4 84 80.4 93.4 72.6M23.4 76.6C34 86 86 86 96.6 76.6';
	const HELMET_COLLAR_LIGHT =
		'M26 71.6C36 79.6 84 79.6 94 71.6L94.4 72.4C84 80.8 36 80.8 25.6 72.4Z';
	const HELMET_RIVETS = [0.1, 0.23, 0.36, 0.5, 0.64, 0.77, 0.9].map((t) =>
		pointOnCubic(
			[
				[23, 79.4],
				[33.6, 89],
				[86.4, 89],
				[97, 79.4]
			],
			t
		).map(round)
	);
	const HELMET_POD = pairOf({
		pod: 'M15.4 37.6C15.4 35.2 17.2 33.6 19.6 33.6L23.4 33.6C24.6 33.6 25.6 34.6 25.6 35.8L25.6 53C25.6 54.2 24.6 55.2 23.4 55.2L19.6 55.2C17.2 55.2 15.4 53.6 15.4 51.2Z',
		grooves: 'M15.6 40.4C18.6 40.8 22.4 40.8 25.4 40.4M15.6 48.4C18.6 48.8 22.4 48.8 25.4 48.4',
		podLight:
			'M17 38C17 36.4 18 35.4 19.6 35.4L20.2 35.4L20.2 52.8L19.6 52.8C18 52.8 17 51.8 17 50.6Z'
	});
	const ANTENNA = capsulePath(100.2, 34, 102.2, 15.2, 0.75);

	/* ---------- Train cap ---------- */

	const CAP_CROWN =
		'M35.4 21.6C29.8 20.6 27.4 16.6 29.6 12.6C33 5.8 45 2.4 60 2.4C75 2.4 87 5.8 90.4 12.6C92.6 16.6 90.2 20.6 84.6 21.6C74 23.8 46 23.8 35.4 21.6Z';
	const CAP_STRIPES = Array.from({ length: 19 }, (_, i) => {
		const deg = -81 + i * 9;
		const s = Math.sin((deg * Math.PI) / 180);
		const endX = 60 + 29.6 * s;
		const endY = 21.8 + 1.6 * (1 - s * s);
		return `M${round(60 + 1.4 * s)} 4.6Q${round(60 + 35 * s)} ${round(7.4 + 3.6 * Math.abs(s))} ${round(endX)} ${round(endY)}`;
	}).join('');
	const CAP_GATHERS = [-0.85, -0.5, -0.17, 0.17, 0.5, 0.85]
		.map((s) => {
			const x = 60 + 27 * s;
			return lens([round(x - 0.4), 16.4], [round(x + 0.6), 19.6], [round(x), 23], 1);
		})
		.join('');
	const CAP_LIGHTS =
		'M33.6 13.6C37 9.2 44 6.2 52 5.2C45.6 7.2 39.6 10.2 36.6 14.2C35.8 15.2 33 14.8 33.6 13.6Z';
	const CAP_BAND =
		'M35.2 20C46 23.2 74 23.2 84.8 20C85.8 22.6 86.2 25.4 85.8 28C75 31.4 45 31.4 34.2 28C33.8 25.4 34.2 22.6 35.2 20Z';
	const CAP_BRAID = cubicOf([35.6, 26.2], [60, 33.6], [84.4, 26.2]);
	const CAP_BRAID_PATH = 'M35.6 26.2Q60 33.6 84.4 26.2';
	const CAP_BRAID_TWISTS = stitchesAlong(CAP_BRAID, 22, 0.4);
	const VISOR =
		'M33.4 26.8C45 29.8 75 29.8 86.6 26.8C86 31.8 77.4 36.2 60 36.2C42.6 36.2 34 31.8 33.4 26.8Z';
	const VISOR_LIGHTS = 'M38.6 30.6C46 33.2 58 34 68 33.4C58 35.2 45.8 34.8 38.6 30.6Z';
	const VISOR_GLOSS = 'M42.4 31.4C45.4 32.4 49 33 52.4 33.2C49 33.6 45.4 33.2 42.4 31.4Z';
	const VISOR_SEAMS = stitchesAlong(
		[
			[36, 29.2],
			[42, 34],
			[78, 34],
			[84, 29.2]
		],
		20
	);
	const CAP_BADGE =
		'M60 20.4C63 20.4 65.2 22.4 65.2 25C65.2 27.6 63 29.6 60 29.6C57 29.6 54.8 27.6 54.8 25C54.8 22.4 57 20.4 60 20.4Z';
	const CAP_WHEEL =
		ring(60, 25, 3.1, 2.3) +
		[0, 45, 90, 135]
			.map((deg) => {
				const [x1, y1] = ovalPoint(60, 25, 2.4, 2.4, deg);
				const [x2, y2] = ovalPoint(60, 25, 2.4, 2.4, deg + 180);
				return capsulePath(x1, y1, x2, y2, 0.28);
			})
			.join('') +
		circlePath(60, 25, 0.9);
	const CAP_CAST =
		'M38.4 33.4C46 37 74 37 81.6 33.4C78 38.8 70 40.2 60 40.2C50 40.2 42 38.8 38.4 33.4Z';

	/* ---------- Chef's hat ---------- */

	const TOQUE_BAND =
		'M35.4 19.6C46 22.8 74 22.8 84.6 19.6C85.4 22.8 85.8 26.2 85.8 29.6C75 33.4 45 33.4 34.2 29.6C34.2 26.2 34.6 22.8 35.4 19.6Z';
	const TOQUE_PLEATS = (() => {
		const bottom = (x: number) => 29.6 + 2.85 * (1 - ((x - 60) / 25.8) ** 2);
		const xs = Array.from({ length: 15 }, (_, i) =>
			round(60 + 25.4 * Math.sin(((-84 + i * 12) * Math.PI) / 180))
		);
		const lines = xs.map((x) => `M${x} 20L${x} ${round(bottom(x))}`).join('');
		const shades = xs
			.slice(0, -1)
			.map((x, i) => {
				const next = xs[i + 1] ?? x;
				const mid = round((x + next) / 2);
				return `M${mid} 20L${next} 20L${next} ${round(bottom(next))}L${mid} ${round(bottom(mid))}Z`;
			})
			.join('');
		return { lines, shades };
	})();
	const TOQUE_PUFF =
		'M36.4 22.6C29.4 23 25.6 18.4 27.4 13.6C28.8 10 33.2 7.8 38 8.8C38.8 4.2 43.6 1.6 48.4 2.4C49.6 2.6 50.8 3 51.8 3.6C54 0.6 57 -0.6 60 -0.6C63 -0.6 66 0.6 68.2 3.6C69.2 3 70.4 2.6 71.6 2.4C76.4 1.6 81.2 4.2 82 8.8C86.8 7.8 91.2 10 92.6 13.6C94.4 18.4 90.6 23 83.6 22.6C76 24.4 44 24.4 36.4 22.6Z';
	const TOQUE_CREASES =
		'M38 8.8C39.6 12.4 40 16.4 39.4 20.6M51.8 3.6C52.8 8 53 13 52.4 19.6M68.2 3.6C67.2 8 67 13 67.6 19.6M82 8.8C80.4 12.4 80 16.4 80.6 20.6';
	const TOQUE_SHADES =
		'M38 8.8C39.6 12.4 40 16.4 39.4 20.6C37 17 36.4 12.6 38 8.8ZM51.8 3.6C52.8 8 53 13 52.4 19.6C50.2 14.6 49.8 8.8 51.8 3.6ZM68.2 3.6C67.2 8 67 13 67.6 19.6C65.2 14.6 65.4 8.8 68.2 3.6ZM82 8.8C80.4 12.4 80 16.4 80.6 20.6C78 17 78.4 12.6 82 8.8ZM26 19.4C40 23.4 80 23.4 94 19.4L94 26L26 26Z';
	const TOQUE_LIGHTS =
		'M29.4 15.4C30 12.4 32.6 10.6 35.4 10.4C33.4 11.6 31.8 13.4 31 15.8C30.6 16.8 29.2 16.6 29.4 15.4ZM41.4 7.2C42.6 5 45 3.8 47.4 3.8C45.6 4.8 44 6.2 43 8C42.6 8.8 41.2 8.4 41.4 7.2ZM54.6 3.6C56 2 58 1.2 60.4 1.2C58.6 2 57 3.2 56 4.6C55.6 5.2 54.4 4.6 54.6 3.6ZM72 4.8C73.4 3.6 75.6 3.2 77.6 3.6C76 4.2 74.6 5.2 73.6 6.4C73 7 71.6 6 72 4.8ZM84.6 11.4C86.4 10.8 88.4 11.2 89.8 12.4C88.2 12.2 86.6 12.4 85.4 13C84.8 13.2 84 11.8 84.6 11.4Z';
	const TOQUE_BAND_SHADE = 'M30 21C46 26 74 26 90 21L90 25.6C74 29.2 46 29.2 30 25.6Z';
	const TOQUE_CAST = 'M36 30.8C46 34.4 74 34.4 84 30.8C79 35.6 70 37 60 37C50 37 41 35.6 36 30.8Z';

	/* ---------- Crown ---------- */

	const CROWN_VELVET = 'M41.6 23C40.4 13.6 48.6 8.4 60 8.4C71.4 8.4 79.6 13.6 78.4 23Z';
	const CROWN_VELVET_FOLDS =
		'M50.4 10.2C48.8 14 48.6 18.4 49.8 22.8M60 8.6C59.4 13.2 59.6 18.4 60.4 23.4M69.6 10.2C71.2 14 71.4 18.4 70.2 22.8';
	const CROWN_VELVET_LIGHT =
		'M45.4 15.6C47 12.4 50.6 10.4 54.6 9.8C51.4 11.6 48.8 13.8 47.2 16.6C46.6 17.6 45 17 45.4 15.6Z';
	const CROWN =
		'M40.4 29.6C47.4 32.6 72.6 32.6 79.6 29.6C80.6 27.4 81.2 25 81.4 22.6C82.2 18.4 83.2 13.6 83.6 9.6C80.4 12.6 77 15.4 74.2 18.2C71.8 16.6 70.8 14 70.6 11.2C68.6 13.4 66.8 15.4 65.2 17.4C62.4 14 61 9.2 60 4.6C59 9.2 57.6 14 54.8 17.4C53.2 15.4 51.4 13.4 49.4 11.2C49.2 14 48.2 16.6 45.8 18.2C43 15.4 39.6 12.6 36.4 9.6C36.8 13.6 37.8 18.4 38.6 22.6C38.8 25 39.4 27.4 40.4 29.6Z';
	const CROWN_FACETS =
		'M36.4 9.6C39.6 12.6 43 15.4 45.8 18.2L41.8 21ZM49.4 11.2C51.4 13.4 53.2 15.4 54.8 17.4L50 19.2ZM60 4.6C61 9.2 62.4 14 65.2 17.4L60 19ZM70.6 11.2C70.8 14 71.8 16.6 74.2 18.2L70 19.2ZM83.6 9.6C83.2 13.6 82.2 18.4 81.4 22.6L78.4 21ZM38 28.4C46 31.6 74 31.6 82 28.4L82 34L38 34Z';
	const CROWN_BAND_LINES =
		'M38.6 22.6C46 25.8 74 25.8 81.4 22.6M40 27.6C47.4 30.4 72.6 30.4 80 27.6';
	const CROWN_BAND_LIGHT = 'M39 23.4C46 26.6 74 26.6 81 23.4L81 24.4C74 27.6 46 27.6 39 24.4Z';
	const CROWN_GLOSS =
		'M42.6 25.2C44.8 26.2 47.2 26.8 49.6 27.2L49.2 28C46.6 27.6 44.2 27 42 26ZM37.4 12.4C38.6 13.6 39.8 14.8 40.8 16L40.4 16.6C39.4 15.4 38.4 14 37.4 12.4Z';
	const CROWN_PEARLS = [
		[36.4, 9.6],
		[49.4, 11.2],
		[70.6, 11.2],
		[83.6, 9.6]
	] as const;
	const CROWN_STUDS = [
		[43.6, 26.2],
		[54, 28.2],
		[66, 28.2],
		[76.4, 26.2]
	]
		.map(([x = 0, y = 0]) => circlePath(x, y, 0.75))
		.join('');
	const CROWN_CAST =
		'M41 30.4C48 34.4 72 34.4 79 30.4C75.6 35.4 68.6 36.8 60 36.8C51.4 36.8 44.4 35.4 41 30.4Z';

	/* ---------- Star glasses ---------- */

	const STAR_LENS_R = 7.9;
	const STAR_FRAMES = EYES_X.map((x, i) => ({
		x,
		turn: i === 0 ? -12 : 12,
		frame: roundedStarPath(x, EYE_Y, 14.6, 10.4, 5, 0.3) + circlePath(x, EYE_Y, STAR_LENS_R),
		bevel: circlePath(x, EYE_Y, STAR_LENS_R + 1.2),
		lensGloss:
			crescentPath(x, EYE_Y, 5.6, 195, 255, 0.9) + ovalPath(x + 3.2, EYE_Y + 3.2, 0.9, 0.9),
		lensLight: `M${x - 7} ${EYE_Y + 3}L${x + 3} ${EYE_Y - 7}L${x + 5.4} ${EYE_Y - 5}L${x - 4.6} ${EYE_Y + 5}Z`
	}));
	const STAR_TEMPLES = pairOf({ temple: 'M34.4 43.4C32.8 42.6 31.6 42.2 30.4 42' });

	/* ---------- Aviator goggles ---------- */

	const GOGGLE_STRAP = pairOf({
		strap:
			'M37 40.4C34.4 40.2 32.2 40.8 30.6 41.8C29.8 44.8 29.8 48.2 30.6 51C32.4 51.6 34.8 51.6 37 51Z',
		seams: 'M36 41.6C34.4 41.6 33 41.8 31.8 42.4M36 49.8C34.4 49.8 33 49.8 31.8 49.6'
	});
	const GOGGLE_BRIDGE =
		'M56.8 43.4C58.6 42.2 61.4 42.2 63.2 43.4L63.2 48.8C61.4 50 58.6 50 56.8 48.8Z';
	const GOGGLE_SCREWS = EYES_X.flatMap((x) =>
		[45, 135, 225, 315].map((deg) => ovalPoint(x, EYE_Y, 9.5, 9.5, deg))
	);
	const GOGGLE_KNURL = EYES_X.map((x) =>
		Array.from({ length: 28 }, (_, i) => {
			const [x1, y1] = ovalPoint(x, EYE_Y, 11.2, 11.2, i * (360 / 28));
			const [x2, y2] = ovalPoint(x, EYE_Y, 12.1, 12.1, i * (360 / 28));
			return `M${x1} ${y1}L${x2} ${y2}`;
		}).join('')
	).join('');

	/* ---------- Cream moustache ---------- */

	const MOUSTACHE =
		'M60 57.8C58 56.2 55.6 55.6 53.4 56.4C51.6 54.6 48.4 54.4 46.6 55.8C44.6 54.2 41.4 54.4 39.8 56.2C37.6 55.6 36 54 36.4 51.6C36.6 50.2 37.8 49.2 39 49.6C36.2 47.6 32.6 50 32.8 53.8C33 57.6 36.4 60.8 40.4 61.2C43 62.6 46.4 63 48.6 62C51 63.6 54.6 63.4 56.6 61.8C58 62.6 59.2 62.4 60 61.8C60.8 62.4 62 62.6 63.4 61.8C65.4 63.4 69 63.6 71.4 62C73.6 63 77 62.6 79.6 61.2C83.6 60.8 87 57.6 87.2 53.8C87.4 50 83.8 47.6 81 49.6C82.2 49.2 83.4 50.2 83.6 51.6C84 54 82.4 55.6 80.2 56.2C78.6 54.4 75.4 54.2 73.4 55.8C71.6 54.4 68.4 54.6 66.6 56.4C64.4 55.6 62 56.2 60 57.8Z';
	const MOUSTACHE_LEFT_RIDGES =
		'M56.6 61.8C54.2 60.6 53.2 58.4 53.4 56.4M48.6 62C46.6 60.4 46 58 46.6 55.8M40.4 61.2C39.2 59.6 39 57.8 39.8 56.2M39 49.6C36.2 49.8 34.8 52.6 36 55.2C37.2 57.6 40 58.2 41.6 56.8M51.6 60.6C49.6 60.4 48.8 58.6 49.8 57.4C50.8 56.4 52.4 57 52.4 58.2M44.6 60.2C42.6 60 41.8 58.2 42.8 57C43.8 56 45.4 56.6 45.4 57.8';
	const MOUSTACHE_RIDGES = MOUSTACHE_LEFT_RIDGES + mirrorPath(MOUSTACHE_LEFT_RIDGES);
	const MOUSTACHE_LEFT_LIGHTS =
		'M48.4 56.4C49.6 55.6 51.4 55.4 52.8 55.9C51.2 56.2 49.8 56.8 48.8 57.6C48.4 57.8 48 57 48.4 56.4ZM41.6 56C42.8 55.2 44.4 55 45.8 55.4C44.4 55.8 43 56.4 42 57.2C41.6 57.4 41.2 56.6 41.6 56ZM34.2 53.6C34.2 51.4 35.6 49.8 37.4 49.4C36.2 50.4 35.4 51.8 35.4 53.6C35.4 54.2 34.2 54.4 34.2 53.6ZM55.4 57.2C56.4 56.8 57.6 56.8 58.6 57.4C57.6 57.4 56.6 57.6 55.8 58C55.4 58.2 55 57.4 55.4 57.2Z';
	const MOUSTACHE_LIGHTS = [
		MOUSTACHE_LEFT_LIGHTS,
		'M68.4 56.4C69.6 55.6 71.4 55.4 72.8 55.9C71.2 56.2 69.8 56.8 68.8 57.6C68.4 57.8 68 57 68.4 56.4ZM75.2 56C76.4 55.2 78 55 79.4 55.4C78 55.8 76.6 56.4 75.6 57.2C75.2 57.4 74.8 56.6 75.2 56ZM82.2 50.4C83.4 50.4 84.6 51 85.2 52C84.2 51.8 83.2 51.8 82.4 52.2C81.8 52.4 81.6 50.6 82.2 50.4ZM62 57.2C63 56.8 64.2 56.8 65.2 57.4C64.2 57.4 63.2 57.6 62.4 58C62 58.2 61.6 57.4 62 57.2Z'
	].join('');
	const MOUSTACHE_SHADES =
		'M30 58.8C45 63.4 75 63.4 90 58.8L90 66L30 66ZM58.6 58C59.2 59.6 60.8 59.6 61.4 58L61.4 62.6L58.6 62.6Z';
	const SPRINKLES = [
		[43.6, 59.2, -30, 'red'],
		[52.4, 59.4, 25, 'blue'],
		[37.4, 57.4, 70, 'leaf'],
		[67.6, 59.4, -18, 'leaf'],
		[76.8, 59, 35, 'gold'],
		[83.6, 56.8, -60, 'red'],
		[60.4, 60.2, 90, 'jewel'],
		[48, 56.6, 80, 'gold'],
		[72.6, 56.4, -80, 'blue']
	] as const;

	/* ---------- Chili nose ---------- */

	const CHILI =
		'M53.8 53.8C53.2 49.6 56.8 47.8 60.4 48C65.2 48.2 68.4 51.2 68.4 55.6C68.4 59.8 69.8 63.6 73.2 66.6C74.2 67.6 73.4 69 72 68.6C64.2 66.6 58 62.4 55.4 58.2C54.6 56.8 54 55.4 53.8 53.8Z';
	const CHILI_LIGHTS =
		'M62.4 58.8C63.4 61.6 65.4 64 68 65.6C67.4 66.2 66.6 66 66 65.6C64 64.2 62.6 62 62 59.4C61.8 58.6 62.2 58.2 62.4 58.8Z';
	const CHILI_GLOSS =
		'M56.6 54.4C56.4 52.4 57.6 50.8 59.6 50.4C58.4 51.6 57.8 53 57.8 54.8C57.8 55.6 56.6 55.4 56.6 54.4Z' +
		ovalPath(60.6, 57.2, 0.6, 0.8);
	const CHILI_SHADES =
		'M64.6 49C68.6 53 67.2 58.4 68.6 62.4L76 62.4L76 49ZM50 58C58 62.4 64 64.6 74 66.2L74 70L50 70Z';
	const CHILI_CREASES = 'M61 57.6C62.4 59.4 64 60.8 65.8 61.8M57.6 56.4C58.2 57.4 59 58.2 60 58.8';
	const CHILI_CALYX =
		'M54.2 53.4C54.8 51 56.6 49.6 58.4 49.4C58.6 48.2 59.8 47.4 61.2 47.6C62.6 47.4 63.8 48.2 64.2 49.4C66.2 49.8 67.6 51.2 67.8 53.2C66.4 52.4 65 52.6 64 53.4C63 52.4 61.6 52.2 60.6 53.2C59.4 52.4 58 52.6 57 53.6C56.2 52.8 55.2 52.8 54.2 53.4Z';
	const CHILI_STEM =
		'M60 48.4C59.6 45.2 60.8 42.2 63.6 41.2C65.2 40.6 66.4 42.4 65 43.2C63 44.4 62.2 46.2 62.4 48.4Z';
	const CHILI_CAST = 'M56 58.8C58.6 62.6 64 66.2 70.6 68.6C64 69.4 57.6 66 55 61Z';

	/* ---------- Giraffe bow tie ---------- */

	const BOW_BAND =
		'M40.2 71.8C46 78.4 52.6 80.6 60 80.6C67.4 80.6 74 78.4 79.8 71.8C80.6 72.4 81 73.4 80.6 74.4C74.6 81.8 67.6 84.2 60 84.2C52.4 84.2 45.4 81.8 39.4 74.4C39 73.4 39.4 72.4 40.2 71.8Z';
	const BOW_WING = pairOf({
		wing: 'M56.8 79.6C52.4 75.4 46.8 72.4 42.6 73.6C39 74.6 38.2 79.4 38.6 82.4C39 85.8 39.8 89.8 42.8 90.6C46.8 91.4 52.4 87.8 56.8 85Z',
		patches:
			'M40 75.4L44.8 73.8L47.4 77.4L44.6 80.2L39.8 79.4ZM49 76L53.6 77.8L53.4 81L48.8 80.8L47.8 78ZM39.6 82.2L44.2 81.6L45.6 85.6L42 87.4L39.4 86ZM46.8 82.4L51.2 82.2L52.4 85.4L49.2 87.6L46.6 85.8ZM54.2 81.4L56.8 81.6L56.6 84.2L54 84.6ZM42.8 88.8L46.4 88.4L47.2 90.8L43.6 91.4ZM49.6 88.8L52.6 87.8L53.2 89.6L50.2 90.6Z',
		folds: 'M56.4 81.4C51.6 80.2 46.8 79.2 42.2 79.6M56.4 83.4C52 84.6 47.6 86.4 43.4 88.2',
		foldShades:
			'M56.4 81.4C51.6 80.2 46.8 79.2 42.2 79.6C46.8 80.8 51.4 81.8 56.4 82.6ZM56.4 83.4C52 84.6 47.6 86.4 43.4 88.2C48 87.2 52.4 85.8 56.4 84.6Z',
		wingLight:
			'M41 78.2C41.4 76.4 42.6 75.2 44.2 75C43.2 76 42.6 77.2 42.4 78.8C42.2 79.4 40.8 79.2 41 78.2Z'
	});
	const BOW_KNOT =
		'M55.4 78.4C58 77.2 62 77.2 64.6 78.4C65.6 80.8 65.6 83.4 64.6 85.8C62 87 58 87 55.4 85.8C54.4 83.4 54.4 80.8 55.4 78.4Z';
	const BOW_KNOT_WRINKLES =
		'M57.4 78.6C58.4 80.8 58.4 83.4 57.4 85.6M62.6 78.6C61.6 80.8 61.6 83.4 62.6 85.6';
	const BOW_KNOT_PATCH = 'M58.4 79.8L61.4 79.4L62 82.4L59 83.2Z';
	const BOW_BAND_PATCHES =
		'M44 76.4L47 77.6L46.2 79.8L43.4 78.8ZM71.6 78.2L74.2 76.8L75.2 78.8L72.6 80Z';

	/* ---------- Pilot scarf ---------- */

	const SCARF_WRAP =
		'M37.6 70C44 78.4 51.6 81.8 60 81.8C68.4 81.8 76 78.4 82.4 70C84.4 72 85.2 74.6 84.6 77.2C78.4 86.2 69.6 90.4 60 90.4C50.4 90.4 41.6 86.2 35.4 77.2C34.8 74.6 35.6 72 37.6 70Z';
	const SCARF_FOLDS =
		'M42 75.6C44.6 79.6 45.6 83.6 45 86.8M51.6 79.8C54 83 54.8 86.6 54.4 89.6M63.6 80.6C66 83.8 66.6 87 66 90M74 77.6C76.2 80.6 76.8 83.6 76.2 86.6';
	const SCARF_SHADES = [
		lens([42, 75.6], [45.6, 81.4], [45, 86.8], 1.6),
		lens([51.6, 79.8], [55, 84.6], [54.4, 89.6], 1.6),
		lens([63.6, 80.6], [67, 85.2], [66, 90], 1.6),
		lens([74, 77.6], [77.2, 82], [76.2, 86.6], 1.4),
		'M30 80C42 92 78 92 90 80L90 94L30 94Z'
	].join('');
	const SCARF_LIGHTS = [
		lens([38.6, 73], [41.8, 77.4], [42.6, 82.4], 1),
		lens([47, 79.6], [49.6, 83.2], [49.8, 87.4], 1),
		lens([58, 81.8], [60.6, 85.4], [60.4, 89.6], 1),
		lens([69.4, 80.2], [72, 83.4], [71.6, 87.6], 1)
	].join('');
	const SCARF_KNOT =
		'M40.8 83.2C42.4 80.6 47.6 80.2 50.4 82.2C52.6 83.8 52.4 88 50 89.8C47.4 91.6 42.4 91.2 40.8 88.8C39.8 87.2 39.8 84.8 40.8 83.2Z';
	const SCARF_HANGING =
		'M41.4 88.4C40.2 93.8 38.4 98.8 35.8 103.4C39 105.2 42.6 106.2 46.2 106.4C46.8 101 48 95.8 49.8 90.6Z';
	const SCARF_HANGING_STRIPES =
		'M37.2 99.4C40.4 101 43.8 101.8 47.2 102L47 103.6C43.4 103.4 39.8 102.6 36.4 100.8ZM38.6 96.4C41.4 97.8 44.6 98.6 47.8 98.8L47.6 99.8C44.4 99.6 41.2 98.8 38.2 97.4Z';
	const SCARF_HANGING_FRINGE =
		'M36.6 104.2L35.4 107.4M39 105.2L38.2 108.6M41.6 105.8L41.2 109.2M44.2 106.2L44.2 109.6';
	const SCARF_FLYING =
		'M80.6 74.2C86.6 71.6 92 74.2 97.6 72C102.4 70.2 105.6 66.8 110 66.4C110.8 69 111.6 71.8 112.6 74.6C108.6 75.4 105.2 78.6 99.8 80.6C93.6 82.8 88.2 80.8 82.8 82.8Z';
	const SCARF_FLYING_FOLDS =
		'M88.4 73.4C89.2 76 89.2 78.6 88.4 81.4M99 71.4C100.2 74.4 100.4 77.6 99.8 80.6';
	const SCARF_FLYING_SHADES = [
		lens([88.4, 73.4], [90.6, 77.4], [88.4, 81.4], 1.4),
		lens([99, 71.4], [101.6, 76], [99.8, 80.6], 1.4),
		'M78 79.6C88 79 96 82 104 76.6C108 74 110 74.4 114 74.4L114 86L78 86Z'
	].join('');
	const SCARF_FLYING_STRIPES =
		'M104.4 69.6C105.4 72.2 106 74.8 106.2 77.6L108.2 76.6C108 73.8 107.4 71 106.4 68.4Z';
	const SCARF_FLYING_LIGHT = 'M84 75C88 73.4 92 75 96.6 73.6C92 76 88 75 84.4 76.2Z';
	const SCARF_FLYING_FRINGE =
		'M110.6 67.4L113.8 66.4M111.2 69.6L114.6 69M111.8 71.8L115.2 71.6M112.4 74L115.6 74.2';

	/* ---------- Magnifier ---------- */

	const MAGNIFIER_HANDLE =
		'M-2.6 -8.4C-2.9 -3 -3.1 2.4 -2.9 7.6C-2.8 10.4 -1.6 12 0 12C1.6 12 2.8 10.4 2.9 7.6C3.1 2.4 2.9 -3 2.6 -8.4Z';
	const MAGNIFIER_GRAIN =
		'M-1.4 -6C-1.6 -1 -1.6 4 -1.2 9M1 -7C1.2 -2 1.4 3 1.2 8.6M-0.2 -2.6C-0.2 0 0 2.4 0.2 4.6';
	const MAGNIFIER_CAP =
		'M-2.9 8.4C-1 9.2 1 9.2 2.9 8.4C2.9 10.8 1.6 12.4 0 12.4C-1.6 12.4 -2.9 10.8 -2.9 8.4Z';
	const MAGNIFIER_FERRULE =
		'M-3.3 -12.6C-1.2 -13.2 1.2 -13.2 3.3 -12.6L3.1 -7.8C1 -7.2 -1 -7.2 -3.1 -7.8Z';
	const MAGNIFIER_RIDGES = 'M-3.2 -11C-1 -11.6 1 -11.6 3.2 -11M-3.2 -9.4C-1 -10 1 -10 3.2 -9.4';
	const LENS_Y = -24.6;
	const MAGNIFIER_RIM = ring(0, LENS_Y, 11.8, 8.8);
	const MAGNIFIER_LENS_GLOSS =
		crescentPath(0, LENS_Y, 6.2, 190, 262, 1.1) + ovalPath(3.6, LENS_Y + 3.8, 1, 1);
	const MAGNIFIER_LENS_LIGHT = `M-8 ${LENS_Y + 4}L4 ${LENS_Y - 8}L7 ${LENS_Y - 5.6}L-5 ${LENS_Y + 6.4}Z`;

	/* ---------- Ladle microphone ---------- */

	const LADLE_HANDLE =
		'M-1.7 -16C-1.9 -4 -1.9 6 -1.7 13.6C-1.6 16.4 1.6 16.4 1.7 13.6C1.9 6 1.9 -4 1.7 -16Z' +
		circlePath(0, 13.4, 0.8);
	const LADLE_GRIP = 'M-2.9 -5.2C-1 -6 1 -6 2.9 -5.2L3.1 8.6C1 9.4 -1 9.4 -3.1 8.6Z';
	const LADLE_GRIP_RIDGES =
		'M-2.9 -2C-1 -2.6 1 -2.6 2.9 -2M-3 1.4C-1 0.8 1 0.8 3 1.4M-3 4.8C-1 4.2 1 4.2 3 4.8';
	const LADLE_CUP = 'M-10.6 -25.8C-10.6 -19.4 -5.8 -14.8 0 -14.8C5.8 -14.8 10.6 -19.4 10.6 -25.8Z';
	const LADLE_CUP_GLOSS =
		'M-8 -23.2C-7.4 -20.4 -5.4 -18.2 -2.8 -17.2C-4.2 -18.8 -5.2 -21 -5.6 -23.2Z';
	const MIC_DOME = 'M-10 -27.4C-10 -33.8 -5.6 -38 0 -38C5.6 -38 10 -33.8 10 -27.4Z';
	const MIC_MESH =
		'M-6 -27.4C-6.4 -32 -4 -35.8 0 -38M6 -27.4C6.4 -32 4 -35.8 0 -38M-2.2 -27.4C-2.4 -32 -1.4 -35.6 0 -38M2.2 -27.4C2.4 -32 1.4 -35.6 0 -38M-9.6 -30.2C-4 -31.4 4 -31.4 9.6 -30.2M-8.2 -33.6C-3 -34.6 3 -34.6 8.2 -33.6M-5 -36.4C-2 -37 2 -37 5 -36.4';
	const MIC_GLOSS = 'M-7 -30.4C-6.6 -33.4 -4.6 -35.6 -2 -36.4C-3.6 -34.6 -4.6 -32.6 -5 -30.4Z';
	const MIC_BAND =
		'M-11.2 -28.4C-11.2 -29.6 11.2 -29.6 11.2 -28.4L11.2 -25.6C11.2 -24.4 -11.2 -24.4 -11.2 -25.6Z';
	const MIC_BAND_LIGHT =
		'M-9.6 -28.4C-3 -28.8 3 -28.8 9.6 -28.4L9.6 -27.6C3 -28 -3 -28 -9.6 -27.6Z';

	/* ---------- Bulb horn ---------- */

	const HORN_BULB =
		'M0 4.2C4.8 4.2 8.2 8.2 8.2 12.8C8.2 17.6 4.8 20.8 0 20.8C-4.8 20.8 -8.2 17.6 -8.2 12.8C-8.2 8.2 -4.8 4.2 0 4.2Z';
	const HORN_BULB_GLOSS =
		'M-5.6 10.8C-5.2 8.6 -3.6 7 -1.6 6.6C-2.8 7.8 -3.6 9.4 -3.8 11.2C-4 12 -5.8 11.8 -5.6 10.8Z' +
		ovalPath(3.6, 16.4, 0.8, 0.6);
	const HORN_COLLAR = 'M-3.4 3C-1.2 2.4 1.2 2.4 3.4 3L3.6 6.6C1.2 7.4 -1.2 7.4 -3.6 6.6Z';
	const HORN_COLLAR_RIDGES = 'M-3.4 4.2C-1.2 3.6 1.2 3.6 3.4 4.2M-3.5 5.4C-1.2 4.8 1.2 4.8 3.5 5.4';
	const HORN_TUBE = 'M-1.7 3.6L-1.7 -14.4C-1.7 -15 1.7 -15 1.7 -14.4L1.7 3.6Z';
	const HORN_BELL =
		'M-1.7 -14C-2.2 -20 -6.4 -27.4 -11.4 -31.6C-12 -32.2 -11.6 -33.2 -10.8 -33.2L10.8 -33.2C11.6 -33.2 12 -32.2 11.4 -31.6C6.4 -27.4 2.2 -20 1.7 -14Z';
	const HORN_BELL_LIGHT =
		'M-3 -20C-4.4 -24.4 -7 -28.4 -9.8 -31.2L-8 -31.2C-5.4 -28.4 -3.4 -24.6 -2.2 -20Z';
	const HORN_LIP = ovalPath(0, -33, 11.6, 3.4);
	const HORN_THROAT = ovalPath(0, -33, 9, 2.2);
	const HORN_BANDS = 'M-2.2 -12C-0.8 -12.6 0.8 -12.6 2.2 -12L2.2 -9.6C0.8 -9 -0.8 -9 -2.2 -9.6Z';
</script>

<!--
	A piece of an item, modelled from its own outline: its colour; its details; a shade and a
	darker shade along its bottom right edge; its own shades and lights; a light along its top left
	edge; its reflections; then its outline.
-->
{#snippet piece(id: string, d: string, fill: string, look: Look = {}, detail?: Snippet)}
	{@const shade = look.shade ?? 1.4}
	{@const deep = look.deep ?? shade * 0.42}
	{@const rim = look.rim ?? 0.6}
	<clipPath id="{uid}-{id}"><path {d} clip-rule="evenodd" /></clipPath>
	<path class={fill} {d} fill-rule="evenodd" />
	<g clip-path="url(#{uid}-{id})">
		{@render detail?.()}
		{#if look.shades}<path class="shade" d={look.shades} fill-rule="evenodd" />{/if}
		{#if shade > 0}
			<path class="shade" d={AROUND + d} fill-rule="evenodd" transform={shift(-shade)} />
		{/if}
		{#if deep > 0}
			<path class="shade" d={AROUND + d} fill-rule="evenodd" transform={shift(-deep)} />
		{/if}
		{#if look.lights}<path class="light" d={look.lights} fill-rule="evenodd" />{/if}
		{#if rim > 0}
			<path class="light" d={AROUND + d} fill-rule="evenodd" transform={shift(rim)} />
		{/if}
		{#if look.gloss}<path class="gloss" d={look.gloss} />{/if}
	</g>
	<path class="line open" d={look.outline ?? d} />
{/snippet}

<!-- A cord or a strap drawn as a thick line: its outline, then its colour. -->
{#snippet cord(d: string, fill: string)}
	<path class="open cord-outline" {d} />
	<path class="open cord {fill}" {d} />
{/snippet}

<!-- A round bead, a pearl, a ball: shaded as a sphere, with one bright reflection. -->
{#snippet ball(id: string, cx: number, cy: number, r: number, fill: string)}
	{@render piece(id, circlePath(cx, cy, r), fill, {
		shade: r * 0.42,
		deep: r * 0.18,
		rim: 0,
		gloss: ovalPath(round(cx - r * 0.36), round(cy - r * 0.38), round(r * 0.3), round(r * 0.22))
	})}
{/snippet}

<!-- A cut stone: its lower right facet darker, its table lighter, one sparkle. -->
{#snippet gem(id: string, cx: number, cy: number, rx: number, ry: number, fill: string)}
	{@render piece(id, ovalPath(cx, cy, rx, ry), fill, {
		shade: round(rx * 0.3),
		deep: 0,
		rim: 0,
		shades: `M${cx} ${round(cy - ry * 0.1)}L${round(cx + rx * 1.1)} ${round(cy - ry * 0.7)}L${round(cx + rx * 1.1)} ${round(cy + ry * 1.1)}L${round(cx - rx * 0.8)} ${round(cy + ry * 1.1)}Z`,
		lights: ovalPath(
			round(cx - rx * 0.12),
			round(cy - ry * 0.16),
			round(rx * 0.5),
			round(ry * 0.44)
		),
		gloss: ovalPath(
			round(cx - rx * 0.42),
			round(cy - ry * 0.42),
			round(rx * 0.22),
			round(ry * 0.18)
		)
	})}
{/snippet}

<!-- A gem in a gold setting. -->
{#snippet setGem(id: string, cx: number, cy: number, rx: number, ry: number, fill: string)}
	{@render piece(`${id}-setting`, ovalPath(cx, cy, rx + 1, ry + 0.9), 'gold', {
		shade: 0.6,
		deep: 0,
		rim: 0.4
	})}
	{@render gem(id, cx, cy, rx, ry, fill)}
{/snippet}

{#snippet egg(
	id: string,
	x: number,
	y: number,
	size: number,
	turn: number,
	fill: string,
	hung: boolean
)}
	<g transform="translate({x} {y}) rotate({turn}) scale({size})">
		{#if hung && !alone}<path class="cast" d={EGG} transform="translate(1.4 1.8)" />{/if}
		{#if hung}<path class="gold line" fill-rule="evenodd" d={ring(0, 0, 1.6, 0.7)} />{/if}
		{#snippet spots()}<path class="spot" d={EGG_SPOTS} />{/snippet}
		{@render piece(
			id,
			EGG,
			fill,
			{ shade: 1.8, deep: 0.8, lights: EGG_LIGHT, gloss: EGG_GLOSS },
			spots
		)}
		{#if hung}
			{@render piece(`${id}-cap`, EGG_CAP, 'gold', { shade: 0.7, deep: 0, rim: 0.3 })}
		{/if}
	</g>
{/snippet}

{#snippet rainBoot(side: Side)}
	{@const b = RAIN_BOOT[side]}
	{@render cord(b.tab, 'cord-rubber')}
	{@render piece(`${side}-boot`, b.boot, 'rubber', {
		shade: 1.8,
		shades: b.bootShade,
		lights: b.bootLight,
		gloss: b.bootGloss
	})}
	{#snippet tread()}<path class="open fine light-line" d={b.tread} />{/snippet}
	{@render piece(`${side}-sole`, b.sole, 'ink', { shade: 0, rim: 0.5 }, tread)}
	{@render piece(`${side}-cuff`, b.cuff, 'rubber', { shade: 1, lights: b.cuffLight })}
{/snippet}

{#snippet ballShoe(side: Side)}
	{@const b = BALL_SHOE[side]}
	{@render piece(`${side}-heel`, b.heel, 'ink', { shade: 0, rim: 0.4, gloss: b.heelGloss })}
	{@render piece(`${side}-sole`, b.sole, 'ink', { shade: 0, rim: 0.4 })}
	{#snippet lining()}<path class="open lace" d={b.lining} />{/snippet}
	{@render piece(
		`${side}-shoe`,
		b.shoe,
		'red',
		{ shade: 1.6, shades: b.shoeShade, gloss: b.shoeGloss },
		lining
	)}
	{@render piece(`${side}-strap`, b.strap, 'red', { shade: 0.8, gloss: b.strapGloss })}
	{@render piece(`${side}-buckle`, ring(side === 'left' ? 51.8 : 68.2, 105.2, 1.6, 0.7), 'gold', {
		shade: 0.5,
		deep: 0,
		rim: 0.3
	})}
	{@render piece(`${side}-bow-a`, b.bowLeft, 'cream', { shade: 0.8, shades: b.bowShade })}
	{@render piece(`${side}-bow-b`, b.bowRight, 'cream', { shade: 0.8, shades: b.bowShade })}
	{@render ball(`${side}-pearl`, side === 'left' ? 35.2 : 84.8, 107.6, 1.3, 'cream')}
{/snippet}

{#snippet skate(side: Side)}
	{@const b = SKATE[side]}
	{@render piece(`${side}-trucks`, b.trucks, 'metal', { shade: 0.6, deep: 0, rim: 0.3 })}
	{#each SKATE_WHEELS as wheel (wheel)}
		{@const x = side === 'left' ? wheel : 120 - wheel}
		{@render piece(`${side}-wheel-${wheel}`, circlePath(x, 118.4, 4), 'jewel', {
			shade: 1.4,
			deep: 0.6,
			lights: crescentPath(x, 118.4, 2.8, 190, 260, 0.6)
		})}
		{@render ball(`${side}-hub-${wheel}`, x, 118.4, 1.6, 'metal')}
	{/each}
	{@render piece(`${side}-plate`, b.plate, 'metal', { shade: 0.8, lights: b.plateLight })}
	{@render piece(`${side}-stop`, b.stop, 'red', { shade: 1 })}
	{#snippet bootDetail()}<path class="cream" d={b.stripe} />{/snippet}
	{@render piece(
		`${side}-boot`,
		b.boot,
		'blue',
		{ shade: 1.6, shades: b.bootShade, gloss: b.bootGloss },
		bootDetail
	)}
	<path class="open lace-outline" d={b.laces} />
	<path class="open lace" d={b.laces} />
	{@render piece(`${side}-collar`, b.collar, 'cream', { shade: 1, lights: b.collarLight })}
{/snippet}

{#snippet backpackStrap(side: Side)}
	{@const b = BACKPACK_STRAP[side]}
	{#snippet seams()}
		<path class="open seam" d={side === 'left' ? BACKPACK_SEAMS : mirrorPath(BACKPACK_SEAMS)} />
	{/snippet}
	{@render piece(
		`${side}-strap`,
		b.strap,
		'leather',
		{ shade: 1, shades: b.strapShade, lights: b.strapLight },
		seams
	)}
	{@render piece(`${side}-buckle`, b.buckle, 'gold', { shade: 0.6, deep: 0, rim: 0.4 })}
	<path class="open line thin" d={b.tongue} />
{/snippet}

<g class="item" data-art={artId} data-layer={layer}>
	{#if layer === 'sleeve'}
		{#if artId === 'striped-sweater'}
			<path class="cream" d={SLEEVE_BASE} />
			<path class="ink" d={SLEEVE_STRIPES} />
			<path class="open fine" d={SLEEVE_KNIT} />
			<path class="ink" d={SLEEVE_CUFF} />
			<path class="open fine light-line" d={SLEEVE_CUFF_RIBS} />
			<path class="open line thin" d="M-16 -10.6Q0 -8.8 16 -10.6" />
		{/if}
	{:else if layer === 'back'}
		{#if artId === 'nest-backpack'}
			<g transform="rotate(-12 24 56)">
				{@render cord(NEST.twigEnds, 'cord-twig')}
				{#snippet bowlWeave()}
					<path class="open weave" d={NEST.weaveDark} />
					<path class="open fine light-line" d={NEST.weaveLight} />
					<path class="open weave-light" d={NEST.weaveLight} transform="translate(0.6 -0.8)" />
				{/snippet}
				{@render piece(
					'nest-bowl',
					NEST.bowl,
					'twig',
					{ shade: 2.6, deep: 1.1, shades: 'M0 46L50 46L50 54Q24 60 0 54Z' },
					bowlWeave
				)}
				{#snippet backTicks()}<path class="open weave" d={NEST_RIM_BACK_TICKS} />{/snippet}
				{@render piece(
					'nest-rim-back',
					NEST.rimBack,
					'twig',
					{ shade: 0.8, outline: NEST.rimBackLine },
					backTicks
				)}
				{@render piece('nest-hollow', NEST.hollow, 'leather', {
					shade: 0,
					deep: 0,
					rim: 0,
					shades: `${NEST.hollow}${NEST.hollow}`
				})}
				{@render egg('nest-egg-a', 16.6, 39.2, 1.1, -16, 'leaf', false)}
				{@render egg('nest-egg-b', 30, 38.2, 1.2, 12, 'cream', false)}
				{@render egg('nest-egg-c', 23.6, 42.6, 0.92, -2, 'ring', false)}
				{#snippet frontTicks()}
					<path class="open weave" d={NEST_RIM_TICKS} />
					<path class="open fine light-line" d={NEST_RIM_TICKS} transform="translate(0.8 0)" />
				{/snippet}
				{@render piece(
					'nest-rim-front',
					NEST.rimFront,
					'twig',
					{
						shade: 1.4,
						lights: `M4.4 50.6${ovalArc(24, 50.6, 19.6, 7.4, 180, 120)}L13 55.6${ovalArc(24, 50, 17.6, 6.6, 120, 180)}Z`,
						outline: NEST.rimFrontLine
					},
					frontTicks
				)}
				{#snippet vein()}<path class="open fine" d={NEST.leafVein} />{/snippet}
				{@render piece('nest-leaf', NEST.leaf, 'leaf', { shade: 1 }, vein)}
			</g>
		{:else if artId === 'comet-cape'}
			{#snippet capeDetail()}
				<path class="open cord-gold-line" d={COMET_TRAIL} />
				<path class="gold" d={CAPE_STARS} />
				<path class="gold" d={CAPE_DOTS} />
				<path class="open fine" d={CAPE_FOLDS} />
			{/snippet}
			{@render piece(
				'cape',
				CAPE,
				'cape',
				{ shade: 3, deep: 1.2, shades: CAPE_FOLD_SHADES, lights: CAPE_FOLD_LIGHTS, rim: 0.9 },
				capeDetail
			)}
			{@render piece('cape-comet', COMET_STAR, 'gold', { shade: 1, deep: 0, rim: 0.4 })}
			{@render piece('cape-collar', CAPE_COLLAR, 'ring', {
				shade: 1.4,
				shades: CAPE_COLLAR_INSIDE,
				lights: 'M33.4 47.6C34.6 52.6 37.2 56.8 40.8 59.8C37 58.6 34.2 55.4 33.2 51.6Z'
			})}
			{@render piece('cape-lining', CAPE_LINING, 'ring', {
				shade: 1.4,
				lights: 'M35 63C27 67 21 73 16.6 80C21.4 72.2 27.6 66.6 35.6 63.8Z'
			})}
		{:else if artId === 'ring-float'}
			{@const back = `M11 92${ovalArc(60, 92, 49, 15.4, 180, 360)}L94.6 92${ovalArc(60, 92, 34.6, 7.4, 360, 180)}Z`}
			{#snippet backBands()}
				<path
					class="gold"
					d={`M18 92${ovalArc(60, 92, 42, 11.8, 180, 360)}L100 92${ovalArc(60, 92, 40, 10.8, 360, 180)}Z`}
				/>
				<path
					class="cape"
					d={`M13.8 92${ovalArc(60, 92, 46.2, 13.8, 180, 360)}L105 92${ovalArc(60, 92, 45, 13.2, 360, 180)}Z`}
				/>
			{/snippet}
			{@render piece(
				'ring-back',
				back,
				'ring',
				{
					shade: 1.4,
					shades: `M25.4 92${ovalArc(60, 92, 34.6, 7.4, 180, 360)}L96.4 92${ovalArc(60, 92.6, 36.4, 9.4, 360, 180)}Z`,
					outline: `M11 92${ovalArc(60, 92, 49, 15.4, 180, 360)}M94.6 92${ovalArc(60, 92, 34.6, 7.4, 360, 180)}`
				},
				backBands
			)}
		{/if}
	{:else if artId === 'nest-backpack'}
		{#each SIDES as side (side)}
			{@render backpackStrap(side)}
		{/each}
		{@render piece('chest-strap', CHEST_STRAP, 'leather', { shade: 0.8 })}
		{@render piece('chest-clip', CHEST_CLIP, 'gold', {
			shade: 0.8,
			deep: 0,
			gloss: 'M56.6 85.6C58 85.2 60 85.2 61.4 85.4L61.2 86C59.8 85.8 58 85.8 56.8 86.2Z'
		})}
		<path class="open line thin" d="M60 84.6L60 88.6" />
	{:else if artId === 'comet-cape'}
		{#each SIDES as side (side)}
			{@render cord(CAPE_CORD[side].cord, 'cord-gold')}
		{/each}
		{@render piece('clasp', CAPE_CLASP, 'gold', {
			shade: 1.2,
			deep: 0.5,
			gloss: 'M57.2 78.6C57.8 77.6 58.6 77 59.6 76.8C59 77.6 58.6 78.4 58.4 79.2Z'
		})}
		{@render gem('clasp-gem', 60, 81.6, 1.8, 1.8, 'jewel')}
	{:else if artId === 'ring-float'}
		{#snippet frontBands()}
			<path
				class="gold"
				d={`M18 92${ovalArc(60, 92, 42, 11.8, 180, 0)}L100 92${ovalArc(60, 92, 40, 10.8, 0, 180)}Z`}
			/>
			<path
				class="cape"
				d={`M13.8 92${ovalArc(60, 92, 46.2, 13.8, 180, 0)}L105 92${ovalArc(60, 92, 45, 13.2, 0, 180)}Z`}
			/>
			<path class="gold" d={roundedStarPath(33.4, 101.6, 2.8, 1.2, 5, 0.25)} />
			<path class="gold" d={roundedStarPath(88.6, 101, 2.2, 0.9, 5, 0.25)} />
		{/snippet}
		{@render piece(
			'ring-front',
			`M11 92${ovalArc(60, 92, 49, 15.4, 180, 0)}L94.6 92${ovalArc(60, 92, 34.6, 7.4, 0, 180)}Z`,
			'ring',
			{
				shade: 2,
				deep: 0.9,
				shades: `M11 92${ovalArc(60, 92, 49, 15.4, 180, 0)}L109 92${ovalArc(60, 93.4, 48, 12.8, 0, 180)}Z`,
				gloss:
					`M26 97.6${ovalArc(60, 92, 38.6, 9.8, 145, 118)}L41.6 99.6${ovalArc(60, 92, 37, 8.8, 118, 145)}Z` +
					`M64 102.2${ovalArc(60, 92, 40, 10.6, 84, 62)}L76.4 100.8${ovalArc(60, 92, 38.4, 9.6, 62, 84)}Z`,
				outline: `M11 92${ovalArc(60, 92, 49, 15.4, 180, 0)}M94.6 92${ovalArc(60, 92, 34.6, 7.4, 0, 180)}`
			},
			frontBands
		)}
		{@render piece(
			'ring-valve',
			'M76.8 103.4C76.8 102.2 80.4 102.2 80.4 103.4L80.4 105.6C80.4 106.8 76.8 106.8 76.8 105.6Z',
			'cream',
			{ shade: 0.6, deep: 0, rim: 0.3 }
		)}
		{@render piece('ring-valve-cap', ovalPath(78.6, 103.2, 2, 0.8), 'cream', {
			shade: 0.3,
			deep: 0,
			rim: 0
		})}
	{:else if artId === 'checked-apron'}
		{#if !alone}<path class="cast" d={APRON} transform="translate(1.4 1.2)" />{/if}
		{@render cord(APRON_NECK, 'cord-red')}
		{#snippet gingham()}
			<path class="check" d={GINGHAM} />
		{/snippet}
		{@render piece(
			'apron',
			APRON,
			'cream',
			{
				shade: 1.8,
				shades: APRON_FOLD_SHADES + APRON_BIB_SHADE,
				lights: APRON_FOLD_LIGHTS
			},
			gingham
		)}
		{@render piece('spoon-handle', SPOON_HANDLE, 'twig', { shade: 0.6, deep: 0, rim: 0.3 })}
		{@render piece('spoon-bowl', SPOON_BOWL, 'twig', {
			shade: 1,
			gloss: 'M41.6 80.6C41.8 79.6 42.4 79 43.2 79C42.8 79.6 42.6 80.2 42.4 81Z'
		})}
		{#snippet pocketSeams()}<path class="open seam" d={POCKET_SEAMS} />{/snippet}
		{@render piece(
			'pocket',
			POCKET,
			'red',
			{
				shade: 1.2,
				lights: 'M41 93.6C44.8 93 48.8 93 52.4 93.6L52.4 94.6C48.8 94 44.8 94 41 94.6Z'
			},
			pocketSeams
		)}
		{@render piece('waistband', WAISTBAND, 'red', { shade: 1.2, lights: WAISTBAND_LIGHT })}
		{@render piece('bow-tail-a', APRON_BOW.tailA, 'red', { shade: 0.8 })}
		{@render piece('bow-tail-b', APRON_BOW.tailB, 'red', { shade: 0.8 })}
		{@render piece('bow-loop-a', APRON_BOW.loopA, 'red', {
			shade: 1,
			lights: 'M72.4 88.8C72.8 87.8 74 87.4 75.2 87.8C74.2 88 73.4 88.4 73 89.2Z'
		})}
		{@render piece('bow-loop-b', APRON_BOW.loopB, 'red', {
			shade: 1,
			lights: 'M80.8 87.8C82 87.4 83.2 87.8 83.8 88.6C82.8 88.4 81.8 88.4 81 88.8Z'
		})}
		{@render piece('bow-knot', APRON_BOW.knot, 'red', { shade: 0.6, deep: 0 })}
	{:else if artId === 'striped-sweater'}
		{#if !alone}<path class="cast" d={SWEATER} transform="translate(1.2 1.6)" />{/if}
		{#snippet stripes()}
			<path class="ink" d={SWEATER_STRIPES} />
			<path class="open fine" d={SWEATER_KNIT} />
		{/snippet}
		{@render piece(
			'sweater',
			SWEATER,
			'cream',
			{ shade: 2.4, deep: 1, shades: SWEATER_SHADES, lights: SWEATER_LIGHTS, rim: 0.8 },
			stripes
		)}
		{#snippet hemRibs()}
			<path class="shade" d={SWEATER_HEM_RIBS.shades} />
			<path class="open fine light-line" d={SWEATER_HEM_RIBS.lines} />
		{/snippet}
		{@render piece('hem', SWEATER_HEM, 'ink', { shade: 0, rim: 0.5 }, hemRibs)}
		{#if alone}
			{#each SIDES as side (side)}
				{@const s = SWEATER_SLEEVE[side]}
				{#snippet sleeveStripes()}
					<path
						class="ink"
						d={s.stripes}
						transform={side === 'left' ? 'rotate(42 28 76)' : 'rotate(-42 92 76)'}
					/>
					<path class="open fine" d={side === 'left' ? SLEEVE_KNIT_LEFT : SLEEVE_KNIT_RIGHT} />
				{/snippet}
				{@render piece(`${side}-sleeve`, s.sleeve, 'cream', { shade: 1.6 }, sleeveStripes)}
				{@render piece(`${side}-sleeve-cuff`, s.cuff, 'ink', { shade: 0, rim: 0.5 })}
			{/each}
		{/if}
		{#if alone}
			{@render piece('neck-inside', SWEATER_NECK_INSIDE, 'cream', {
				shade: 0,
				deep: 0,
				rim: 0,
				shades: SWEATER_NECK_INSIDE + SWEATER_NECK_INSIDE
			})}
			{#snippet neckRibs()}<path class="open fine light-line" d={SWEATER_NECK_RIBS} />{/snippet}
			{@render piece(
				'neck',
				SWEATER_NECK,
				'ink',
				{ shade: 0, rim: 0.5, outline: SWEATER_NECK_LINE },
				neckRibs
			)}
		{/if}
		{#each alone ? [] : SIDES as side (side)}
			{#snippet collarRibs()}
				<path
					class="open fine light-line"
					d={side === 'left'
						? 'M36 64.4L38.6 67.4M39 62.4L41.4 65.6M42.4 60.6L44.4 64M46 59.4L47.6 62.8M49.4 58.6L50.4 62'
						: 'M84 64.4L81.4 67.4M81 62.4L78.6 65.6M77.6 60.6L75.6 64M74 59.4L72.4 62.8M70.6 58.6L69.6 62'}
				/>
			{/snippet}
			{@render piece(
				`${side}-collar`,
				SWEATER_COLLAR[side].collar,
				'ink',
				{ shade: 0, rim: 0.5 },
				collarRibs
			)}
		{/each}
	{:else if artId === 'egg-necklace'}
		{#if !alone}
			<path class="open cast-line" d={NECK_CORD_PATH} transform="translate(0.8 1.4)" />
		{/if}
		{@render cord(NECK_CORD_PATH, 'cord-twig')}
		<path class="open fine" d={CORD_TWISTS} />
		{#each NECK_BEADS as [x = 0, y = 0], i (i)}
			{@render ball(`bead-${i}`, x, y, 1.8, 'leather')}
		{/each}
		{#each NECK_EGGS as e, i (i)}
			{@render egg(`neck-egg-${i}`, e.x, e.y, e.size, e.turn, e.fill, true)}
		{/each}
	{:else if artId === 'giraffe-bow-tie'}
		{#if !alone}
			<path
				class="cast"
				d="M44 86C50 90.6 56 92.4 60 92.4C64 92.4 70 90.6 76 86C70 94 50 94 44 86Z"
			/>
		{/if}
		{#if !alone}
			{#snippet bandPatches()}<path class="patch" d={BOW_BAND_PATCHES} />{/snippet}
			{@render piece('collar-band', BOW_BAND, 'cream', { shade: 0.8 }, bandPatches)}
		{/if}
		{#each SIDES as side (side)}
			{@const w = BOW_WING[side]}
			{#snippet patches()}
				<path class="patch" d={w.patches} />
				<path class="open fine" d={w.folds} />
			{/snippet}
			{@render piece(
				`${side}-wing`,
				w.wing,
				'cream',
				{ shade: 1.6, shades: w.foldShades, lights: w.wingLight },
				patches
			)}
		{/each}
		{#snippet knotPatch()}
			<path class="patch" d={BOW_KNOT_PATCH} />
			<path class="open fine" d={BOW_KNOT_WRINKLES} />
		{/snippet}
		{@render piece('knot', BOW_KNOT, 'cream', { shade: 1 }, knotPatch)}
	{:else if artId === 'pilot-scarf'}
		{#if !alone}
			<path class="cast" d={SCARF_WRAP} transform="translate(1 1.6)" />
		{/if}
		{#snippet hangingDetail()}<path class="red" d={SCARF_HANGING_STRIPES} />{/snippet}
		{@render cord(SCARF_HANGING_FRINGE, 'cord-cream')}
		{@render piece(
			'scarf-hanging',
			SCARF_HANGING,
			'cream',
			{
				shade: 1.4,
				lights: lens([42.4, 90], [41, 96], [38.4, 102], 0.8)
			},
			hangingDetail
		)}
		{#snippet wrapFolds()}<path class="open fine" d={SCARF_FOLDS} />{/snippet}
		{@render piece(
			'scarf-wrap',
			SCARF_WRAP,
			'cream',
			{ shade: 1.6, shades: SCARF_SHADES, lights: SCARF_LIGHTS },
			wrapFolds
		)}
		{@render cord(SCARF_FLYING_FRINGE, 'cord-cream')}
		{#snippet flyingDetail()}
			<path class="red" d={SCARF_FLYING_STRIPES} />
			<path class="open fine" d={SCARF_FLYING_FOLDS} />
		{/snippet}
		{@render piece(
			'scarf-flying',
			SCARF_FLYING,
			'cream',
			{ shade: 1.4, shades: SCARF_FLYING_SHADES, gloss: SCARF_FLYING_LIGHT },
			flyingDetail
		)}
		{@render piece('scarf-knot', SCARF_KNOT, 'cream', {
			shade: 1.6,
			lights: 'M42.6 82.8C44 81.4 46.2 81 48.2 81.4C46.4 81.8 44.8 82.6 43.8 83.8Z'
		})}
		<path class="open fine" d="M45.4 81C44.6 83.8 45 86.6 46.6 89.4" />
	{:else if artId === 'springs'}
		{#each SPRINGS as spring (spring.x)}
			{@const x = spring.x}
			{@render piece(`pad-${x}`, spring.pad, 'red', {
				shade: 0.8,
				deep: 0,
				lights: spring.padLight
			})}
			{#each spring.strands as strand, i (i)}
				{@render piece(`back-${x}-${i}`, strand.back, 'metal', {
					shade: 0,
					deep: 0,
					rim: 0,
					shades: strand.back + strand.back
				})}
			{/each}
			{#each spring.strands as strand, i (i)}
				{@render piece(`front-${x}-${i}`, strand.front, 'metal', { shade: 0.5, deep: 0, rim: 0.3 })}
				<path class="open shine" d={strand.shine} />
			{/each}
			{@render piece(`plate-${x}`, spring.plate, 'metal', {
				shade: 0.8,
				lights: spring.plateLight
			})}
			{@render piece(`strap-${x}`, spring.strap, 'red', {
				shade: 0.9,
				lights: spring.strapLight
			})}
			{#each spring.rivets as rx (rx)}
				{@render ball(`rivet-${x}-${rx}`, rx, 110.6, 0.9, 'metal')}
			{/each}
		{/each}
	{:else if artId === 'rain-boots'}
		{#each SIDES as side (side)}
			{@render rainBoot(side)}
		{/each}
	{:else if artId === 'ball-shoes'}
		{#each SIDES as side (side)}
			{@render ballShoe(side)}
		{/each}
	{:else if artId === 'roller-skates'}
		{#each SIDES as side (side)}
			{@render skate(side)}
		{/each}
	{:else if artId === 'cream-moustache'}
		<g transform="translate(60 57) scale(1.06 1.24) translate(-60 -57)">
			{#if !alone}<path class="cast" d={MOUSTACHE} transform="translate(0.8 1.4)" />{/if}
			{#snippet ridges()}<path class="open fine" d={MOUSTACHE_RIDGES} />{/snippet}
			{@render piece(
				'moustache',
				MOUSTACHE,
				'cream',
				{ shade: 1.6, deep: 0.7, shades: MOUSTACHE_SHADES, lights: MOUSTACHE_LIGHTS, rim: 0.5 },
				ridges
			)}
			{#each SPRINKLES as [x, y, turn, fill], i (i)}
				<path
					class="{fill} sprinkle"
					d={capsulePath(
						round(x - 1.1 * Math.cos((turn * Math.PI) / 180)),
						round(y - 1.1 * Math.sin((turn * Math.PI) / 180)),
						round(x + 1.1 * Math.cos((turn * Math.PI) / 180)),
						round(y + 1.1 * Math.sin((turn * Math.PI) / 180)),
						0.55
					)}
				/>
			{/each}
		</g>
	{:else if artId === 'chili-nose'}
		{#if !alone}<path class="cast" d={CHILI_CAST} />{/if}
		{@render piece('stem', CHILI_STEM, 'leaf', { shade: 0.8 })}
		{#snippet chiliCreases()}<path class="open fine" d={CHILI_CREASES} />{/snippet}
		{@render piece(
			'chili',
			CHILI,
			'red',
			{
				shade: 1.6,
				deep: 0.7,
				shades: CHILI_SHADES,
				lights: CHILI_LIGHTS,
				gloss: CHILI_GLOSS
			},
			chiliCreases
		)}
		{@render piece('calyx', CHILI_CALYX, 'leaf', {
			shade: 0.8,
			lights: 'M57.6 51C58.6 50.2 60 49.8 61.4 49.8C60.2 50.4 59.2 51 58.4 51.6Z'
		})}
	{:else if artId === 'star-glasses'}
		{#each SIDES as side (side)}
			{@render cord(STAR_TEMPLES[side].temple, 'cord-gold')}
		{/each}
		{#each STAR_FRAMES as frame (frame.x)}
			<g transform="rotate({frame.turn} {frame.x} {EYE_Y})">
				{@render piece(`lens-${frame.x}`, circlePath(frame.x, EYE_Y, STAR_LENS_R + 0.4), 'glass', {
					shade: 0,
					deep: 0,
					rim: 0,
					lights: frame.lensLight,
					gloss: frame.lensGloss
				})}
				{#snippet bevel()}<path class="open fine light-line" d={frame.bevel} />{/snippet}
				{@render piece(
					`star-${frame.x}`,
					frame.frame,
					'gold',
					{ shade: 1.3, deep: 0.5, rim: 0.6 },
					bevel
				)}
				{@render gem(`tip-${frame.x}`, frame.x, EYE_Y - 11.6, 1.6, 1.6, 'jewel')}
			</g>
		{/each}
		{@render setGem('bridge', 60, 39.8, 1.9, 1.7, 'blue')}
	{:else if artId === 'aviator-goggles'}
		{#each SIDES as side (side)}
			{@const g = GOGGLE_STRAP[side]}
			{#snippet strapSeams()}<path class="open seam" d={g.seams} />{/snippet}
			{@render piece(`${side}-strap`, g.strap, 'leather', { shade: 0.8 }, strapSeams)}
		{/each}
		{@render piece('goggle-bridge', GOGGLE_BRIDGE, 'leather', {
			shade: 0.9,
			lights: 'M57.8 44.2C59.2 43.4 60.8 43.4 62.2 44.2L62.2 45C60.8 44.2 59.2 44.2 57.8 45Z'
		})}
		{#each EYES_X as x (x)}
			{#snippet knurl()}<path class="open fine" d={GOGGLE_KNURL} />{/snippet}
			{@render piece(`cushion-${x}`, ring(x, EYE_Y, 13.2, 10), 'leather', { shade: 1.2 }, knurl)}
			{@render piece(`lens-${x}`, circlePath(x, EYE_Y, 8.8), 'tint', {
				shade: 0,
				deep: 0,
				rim: 0,
				lights: `M${x - 8} ${EYE_Y + 3}L${x + 3} ${EYE_Y - 8}L${x + 6} ${EYE_Y - 5.4}L${x - 5} ${EYE_Y + 5.6}Z`,
				gloss: crescentPath(x, EYE_Y, 6.2, 192, 258, 1) + ovalPath(x + 3.8, EYE_Y + 3.6, 1, 1)
			})}
			{@render piece(`rim-${x}`, ring(x, EYE_Y, 11, 8.6), 'gold', {
				shade: 1,
				deep: 0.4,
				rim: 0.5
			})}
		{/each}
		{#each GOGGLE_SCREWS as [x, y], i (i)}
			{@render ball(`screw-${i}`, x, y, 0.95, 'metal')}
		{/each}
	{:else if artId === 'crown'}
		{#if !alone}<path class="cast" d={CROWN_CAST} />{/if}
		{#snippet velvetFolds()}<path class="open fine" d={CROWN_VELVET_FOLDS} />{/snippet}
		{@render piece(
			'velvet',
			CROWN_VELVET,
			'red',
			{ shade: 2.2, lights: CROWN_VELVET_LIGHT },
			velvetFolds
		)}
		{#snippet band()}
			<path class="light" d={CROWN_BAND_LIGHT} />
			<path class="open fine" d={CROWN_BAND_LINES} />
			<path class="cream" d={CROWN_STUDS} />
		{/snippet}
		{@render piece(
			'crown',
			CROWN,
			'gold',
			{ shade: 1.8, shades: CROWN_FACETS, gloss: CROWN_GLOSS },
			band
		)}
		{#each CROWN_PEARLS as [x, y], i (i)}
			{@render ball(`pearl-${i}`, x, y, 2.3, 'cream')}
		{/each}
		{@render setGem('crown-top', 60, 4.6, 2.2, 2.8, 'leaf')}
		{@render setGem('crown-ruby', 60, 27.6, 3.4, 2.5, 'red')}
		{@render setGem('crown-left', 48.4, 26.8, 1.9, 1.7, 'blue')}
		{@render setGem('crown-right', 71.6, 26.8, 1.9, 1.7, 'blue')}
	{:else if artId === 'chef-hat'}
		{#if !alone}<path class="cast" d={TOQUE_CAST} />{/if}
		{#snippet pleats()}
			<path class="shade" d={TOQUE_PLEATS.shades} />
			<path class="open fine" d={TOQUE_PLEATS.lines} />
		{/snippet}
		{@render piece(
			'toque-band',
			TOQUE_BAND,
			'cream',
			{ shade: 1.4, shades: TOQUE_BAND_SHADE },
			pleats
		)}
		{#snippet creases()}<path class="open fine" d={TOQUE_CREASES} />{/snippet}
		{@render piece(
			'toque-puff',
			TOQUE_PUFF,
			'cream',
			{ shade: 2.4, deep: 1, shades: TOQUE_SHADES, lights: TOQUE_LIGHTS, rim: 0 },
			creases
		)}
	{:else if artId === 'yak-beanie'}
		{#if !alone}<path class="cast" d={BEANIE_CAST} />{/if}
		{#snippet knitDetail()}
			<path class="open fine" d={BEANIE_KNIT} />
			<path class="wool-light" d={BEANIE_BAND} />
			<path class="wool" d={BEANIE_DIAMONDS} />
			<path class="wool-light" d={BEANIE_DOTS} />
		{/snippet}
		{@render piece(
			'beanie',
			BEANIE,
			'wool',
			{ shade: 2.4, deep: 1, lights: BEANIE_LIGHTS, rim: 0.8 },
			knitDetail
		)}
		{#snippet cuffRibs()}
			<path class="shade" d={BEANIE_RIBS.shades} />
			<path class="open fine" d={BEANIE_RIBS.lines} />
		{/snippet}
		{@render piece(
			'cuff',
			BEANIE_CUFF,
			'wool-light',
			{ shade: 1.6, lights: BEANIE_CUFF_LIGHT },
			cuffRibs
		)}
		{#snippet fibres()}<path class="open fine" d={POMPOM_FIBRES} />{/snippet}
		{@render piece('pompom', POMPOM, 'wool-light', { shade: 1.8, deep: 0.8 }, fibres)}
	{:else if artId === 'astronaut-helmet'}
		{#snippet glassEdge()}<path class="glass" d={BUBBLE_EDGE} fill-rule="evenodd" />{/snippet}
		{@render piece(
			'bubble',
			BUBBLE,
			'glass',
			{ shade: 3.2, deep: 1.2, rim: 1, lights: BUBBLE_LIGHTS, gloss: BUBBLE_GLOSS },
			glassEdge
		)}
		{#each SIDES as side (side)}
			{@const pod = HELMET_POD[side]}
			{#snippet grooves()}<path class="open fine" d={pod.grooves} />{/snippet}
			{@render piece(
				`${side}-pod`,
				pod.pod,
				'metal',
				{ shade: 1.2, lights: pod.podLight },
				grooves
			)}
			{@render gem(
				`${side}-light`,
				side === 'left' ? 20.4 : 99.6,
				44.4,
				1.6,
				1.6,
				side === 'left' ? 'leaf' : 'red'
			)}
		{/each}
		{@render piece('antenna', ANTENNA, 'metal', { shade: 0.4, deep: 0, rim: 0.2 })}
		{@render ball('antenna-tip', 102.4, 13.2, 2.6, 'red')}
		{#snippet collarLines()}
			<path class="light" d={HELMET_COLLAR_LIGHT} />
			<path class="open fine" d={HELMET_COLLAR_LINES} />
		{/snippet}
		{@render piece('collar', HELMET_COLLAR, 'metal', { shade: 1.8, deep: 0.8 }, collarLines)}
		{#each HELMET_RIVETS as [x = 0, y = 0], i (i)}
			{@render ball(`rivet-${i}`, x, y, 1.15, 'metal')}
		{/each}
	{:else if artId === 'train-cap'}
		{#if !alone}<path class="cast" d={CAP_CAST} />{/if}
		{@render piece('cap-band', CAP_BAND, 'ink', { shade: 0, rim: 0.5 })}
		{#snippet capStripes()}
			<path class="open stripe-thin" d={CAP_STRIPES} />
		{/snippet}
		{@render piece(
			'cap-crown',
			CAP_CROWN,
			'blue',
			{ shade: 2.2, deep: 0.9, shades: CAP_GATHERS, lights: CAP_LIGHTS, rim: 0.7 },
			capStripes
		)}
		{@render ball('cap-button', 60, 4.4, 1.8, 'blue')}
		{@render cord(CAP_BRAID_PATH, 'cord-gold')}
		<path class="open fine" d={CAP_BRAID_TWISTS} />
		{#snippet visorSeams()}<path class="open seam" d={VISOR_SEAMS} />{/snippet}
		{@render piece(
			'visor',
			VISOR,
			'ink',
			{ shade: 0, rim: 0.6, lights: VISOR_LIGHTS, gloss: VISOR_GLOSS },
			visorSeams
		)}
		{@render piece('cap-badge', CAP_BADGE, 'gold', { shade: 1, deep: 0.4, rim: 0.4 })}
		<path class="ink" fill-rule="evenodd" d={CAP_WHEEL} />
	{:else if artId === 'magnifier'}
		<g transform="translate({grip.x} {grip.y}) {HAND_TILT}">
			{#snippet grain()}<path class="open fine" d={MAGNIFIER_GRAIN} />{/snippet}
			{@render piece('handle', MAGNIFIER_HANDLE, 'leather', { shade: 1.2 }, grain)}
			{@render piece('handle-cap', MAGNIFIER_CAP, 'gold', { shade: 0.7, deep: 0.3, rim: 0.4 })}
			{#snippet ridges()}<path class="open fine" d={MAGNIFIER_RIDGES} />{/snippet}
			{@render piece(
				'ferrule',
				MAGNIFIER_FERRULE,
				'gold',
				{ shade: 0.8, deep: 0.3, rim: 0.4 },
				ridges
			)}
			<path
				class="gold line"
				fill-rule="evenodd"
				d={MAGNIFIER_RIM}
				transform="translate(0.9 1.2)"
			/>
			{@render piece(`lens`, circlePath(0, LENS_Y, 9.2), 'glass', {
				shade: 0,
				deep: 0,
				rim: 0,
				lights: MAGNIFIER_LENS_LIGHT,
				gloss: MAGNIFIER_LENS_GLOSS
			})}
			{#snippet rimBevel()}
				<path class="open fine light-line" d={circlePath(0, LENS_Y, 10.3)} />
			{/snippet}
			{@render piece('rim', MAGNIFIER_RIM, 'gold', { shade: 1.2, deep: 0.5, rim: 0.6 }, rimBevel)}
		</g>
	{:else if artId === 'ladle-mic'}
		<g transform="translate({grip.x} {grip.y}) {HAND_TILT}">
			{@render piece('ladle-handle', LADLE_HANDLE, 'metal', {
				shade: 0.8,
				deep: 0.3,
				gloss: 'M-0.9 -14C-1 -6 -1 2 -0.9 10L-0.5 10C-0.6 2 -0.6 -6 -0.5 -14Z'
			})}
			{#snippet gripRidges()}<path class="open fine" d={LADLE_GRIP_RIDGES} />{/snippet}
			{@render piece('ladle-grip', LADLE_GRIP, 'red', { shade: 1 }, gripRidges)}
			{@render piece('ladle-cup', LADLE_CUP, 'metal', {
				shade: 1.8,
				deep: 0.8,
				gloss: LADLE_CUP_GLOSS
			})}
			{#snippet mesh()}<path class="open mesh" d={MIC_MESH} />{/snippet}
			{@render piece('mic-dome', MIC_DOME, 'ink', { shade: 0, rim: 0.6, lights: MIC_GLOSS }, mesh)}
			{@render piece('mic-band', MIC_BAND, 'gold', {
				shade: 0.8,
				deep: 0.3,
				lights: MIC_BAND_LIGHT
			})}
		</g>
	{:else if artId === 'bulb-horn'}
		<g transform="translate({grip.x} {grip.y}) {HAND_TILT}">
			{@render piece('horn-tube', HORN_TUBE, 'gold', {
				shade: 0.8,
				deep: 0.3,
				gloss: 'M-0.9 -12L-0.9 1.6L-0.4 1.6L-0.4 -12Z'
			})}
			{@render piece('horn-bands', HORN_BANDS, 'gold', { shade: 0.5, deep: 0, rim: 0.3 })}
			{@render piece('horn-bell', HORN_BELL, 'gold', {
				shade: 1.6,
				deep: 0.6,
				lights: HORN_BELL_LIGHT
			})}
			{@render piece('horn-lip', HORN_LIP, 'gold', { shade: 0.8, deep: 0, rim: 0.5 })}
			{@render piece('horn-throat', HORN_THROAT, 'gold', {
				shade: 0,
				deep: 0,
				rim: 0,
				shades: `${HORN_THROAT}${HORN_THROAT}${ovalPath(0, -32.6, 6, 1.4)}`
			})}
			{#snippet collarRidges()}<path class="open fine" d={HORN_COLLAR_RIDGES} />{/snippet}
			{@render piece(
				'horn-collar',
				HORN_COLLAR,
				'gold',
				{ shade: 0.6, deep: 0.2, rim: 0.3 },
				collarRidges
			)}
			{@render piece('horn-bulb', HORN_BULB, 'red', {
				shade: 2,
				deep: 0.9,
				gloss: HORN_BULB_GLOSS
			})}
		</g>
	{/if}
</g>

<style>
	.line {
		stroke: var(--dd-color-companion-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.thin {
		stroke-width: var(--dd-border-width-thin);
	}

	.open {
		fill: transparent;
	}

	.shade,
	.cast {
		fill: var(--dd-color-companion-shade);
		fill-opacity: var(--dd-opacity-companion-shade);
	}

	.light {
		fill: var(--dd-color-companion-light);
		fill-opacity: var(--dd-opacity-companion-light);
	}

	.gloss {
		fill: var(--dd-color-companion-light);
	}

	.fine,
	.seam,
	.shine,
	.stripe-thin,
	.weave,
	.weave-light,
	.mesh,
	.lace,
	.lace-outline,
	.cord,
	.cord-outline,
	.cast-line,
	.cord-gold-line,
	.patch {
		stroke-linecap: round;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	.fine {
		stroke: var(--dd-color-companion-shade);
		stroke-opacity: var(--dd-opacity-companion-light);
		stroke-width: var(--dd-border-width-thin);
	}

	.light-line {
		stroke: var(--dd-color-companion-light);
	}

	.seam {
		stroke: var(--dd-color-wear-cream);
		stroke-width: var(--dd-border-width-thin);
	}

	.shine {
		stroke: var(--dd-color-companion-light);
		stroke-width: var(--dd-border-width-thin);
	}

	.stripe-thin {
		stroke: var(--dd-color-wear-cream);
		stroke-width: var(--dd-border-width-thin);
	}

	.weave {
		stroke: var(--dd-color-wear-leather);
		stroke-width: var(--dd-border-width-thick);
	}

	.weave-light {
		stroke: var(--dd-color-wear-gold);
		stroke-width: var(--dd-border-width-thin);
	}

	.mesh {
		stroke: var(--dd-color-wear-metal);
		stroke-width: var(--dd-border-width-thin);
	}

	.lace {
		stroke: var(--dd-color-wear-cream);
		stroke-width: var(--dd-border-width-thick);
	}

	.lace-outline {
		stroke: var(--dd-color-companion-line);
		stroke-width: var(--dd-border-width-target);
	}

	.cord-outline {
		stroke: var(--dd-color-companion-line);
		stroke-width: var(--dd-border-width-drawing-bold);
	}

	.cord {
		stroke-width: var(--dd-border-width-thick);
	}

	.cast-line {
		stroke: var(--dd-color-companion-shade);
		stroke-opacity: var(--dd-opacity-companion-shade);
		stroke-width: var(--dd-border-width-drawing-bold);
	}

	.cord-twig {
		stroke: var(--dd-color-wear-twig);
	}

	.cord-gold {
		stroke: var(--dd-color-wear-gold);
	}

	.cord-rubber {
		stroke: var(--dd-color-wear-rubber);
	}

	.cord-red {
		stroke: var(--dd-color-wear-red);
	}

	.cord-cream {
		stroke: var(--dd-color-wear-cream);
	}

	.cord-gold-line {
		stroke: var(--dd-color-wear-gold);
		stroke-width: var(--dd-border-width-thick);
	}

	.patch {
		fill: var(--dd-color-wear-wool);
		stroke: var(--dd-color-wear-wool);
		stroke-width: var(--dd-border-width-thick);
	}

	.check {
		fill: var(--dd-color-wear-red);
		fill-opacity: var(--dd-opacity-companion-light);
	}

	.gold {
		fill: var(--dd-color-wear-gold);
	}

	.jewel {
		fill: var(--dd-color-wear-jewel);
	}

	.cream {
		fill: var(--dd-color-wear-cream);
	}

	.red {
		fill: var(--dd-color-wear-red);
	}

	.blue {
		fill: var(--dd-color-wear-blue);
	}

	.wool {
		fill: var(--dd-color-wear-wool);
	}

	.wool-light {
		fill: var(--dd-color-wear-wool-light);
	}

	.leather {
		fill: var(--dd-color-wear-leather);
	}

	.twig {
		fill: var(--dd-color-wear-twig);
	}

	.metal {
		fill: var(--dd-color-wear-metal);
	}

	.glass {
		fill: var(--dd-color-wear-glass);
		fill-opacity: var(--dd-opacity-glass);
	}

	.tint {
		fill: var(--dd-color-wear-rubber);
		fill-opacity: var(--dd-opacity-glass);
	}

	.ice {
		fill: var(--dd-color-wear-glass);
	}

	.rubber {
		fill: var(--dd-color-wear-rubber);
	}

	.spot {
		fill: var(--dd-color-wear-spot);
	}

	.cape {
		fill: var(--dd-color-wear-cape);
	}

	.ring {
		fill: var(--dd-color-wear-ring);
	}

	.leaf {
		fill: var(--dd-color-wear-leaf);
	}

	.ink {
		fill: var(--dd-color-wear-ink);
	}

	.sprinkle {
		stroke: var(--dd-color-companion-line);
		stroke-width: var(--dd-border-width-thin);
		vector-effect: non-scaling-stroke;
	}

	:global([data-silhouette]) .item :not(.open) {
		fill: var(--dd-color-silhouette);
		fill-opacity: 1;
	}

	:global([data-silhouette]) .item * {
		stroke: var(--dd-color-silhouette);
	}
</style>
