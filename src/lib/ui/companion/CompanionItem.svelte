<script lang="ts">
	/*
	 * One item the companion wears, drawn in its 120 × 120 view box (lot R2). `back`: what goes
	 * behind the body (a backpack, a cape, the far side of a ring); `front`: everything else. A hand
	 * item is drawn around `grip`, the point held in the hand. An unknown `artId` draws nothing.
	 * Under an ancestor with `data-silhouette`, the item is one flat shape without details.
	 */
	import type { Snippet } from 'svelte';
	import { fluffPath, roundedStarPath, stitchesAlong, pointOnCubic, type XY } from './geometry';
	import type { ItemLayer, Point } from './items';

	interface Props {
		artId: string;
		layer?: ItemLayer;
		grip?: Point;
	}

	let { artId, layer = 'front', grip = { x: 0, y: 0 } }: Props = $props();

	const uid = $props.id();

	type Cubic = readonly [XY, XY, XY, XY];

	const FEET_X = [44, 76] as const;
	/** Seen from the front: the right side is the left one mirrored around the middle of the view box. */
	const MIRROR = 'matrix(-1 0 0 1 120 0)';
	const EYES_X = [48, 72] as const;
	const EYE_Y = 46;
	/** A hand item is drawn upright from its grip (0, 0), then tilted towards the top left. */
	const HAND_TILT = 'rotate(-36.87)';
	/** Far around any drawing: with `fill-rule="evenodd"` and a circle, everything outside it. */
	const AROUND = 'M-200 -200H320V320H-200Z';

	function round(value: number): number {
		return Math.round(value * 100) / 100;
	}

	function circlePath(cx: number, cy: number, r: number, sweep = 0): string {
		return `M${round(cx - r)} ${round(cy)}a${r} ${r} 0 1 ${sweep} ${round(2 * r)} 0a${r} ${r} 0 1 ${sweep} ${round(-2 * r)} 0Z`;
	}

	/** A ring to fill with `fill-rule="evenodd"`. */
	function ring(cx: number, cy: number, outer: number, inner: number): string {
		return circlePath(cx, cy, outer) + circlePath(cx, cy, inner, 1);
	}

	/** Everything outside a circle, to shade or light the edge of a round shape it is clipped to. */
	function outside(cx: number, cy: number, r: number): string {
		return AROUND + circlePath(cx, cy, r, 1);
	}

	/** A quadratic curve written as a cubic one. */
	function cubicOf(p0: XY, control: XY, p1: XY): Cubic {
		const toward = (p: XY): XY => [
			p[0] + (2 / 3) * (control[0] - p[0]),
			p[1] + (2 / 3) * (control[1] - p[1])
		];
		return [p0, toward(p0), toward(p1), p1];
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
				const half = dx * 0.38;
				parts.push(
					`M${round(x - half)} ${round(y - 1.2)}L${round(x)} ${round(y + 0.5)}L${round(x + half)} ${round(y - 1.2)}`
				);
			}
		}
		return parts.join('');
	}

	/** Ribs of a knitted band, fanning slightly away from the middle. */
	function ribs(left: number, right: number, dx: number, top: number, bottom: number): string {
		const parts: string[] = [];
		for (let x = left; x <= right; x += dx) {
			parts.push(
				`M${round(x)} ${top}Q${round(x + (x - 60) * 0.05)} ${round((top + bottom) / 2)} ${round(x + (x - 60) * 0.02)} ${bottom}`
			);
		}
		return parts.join('');
	}

	/* Necklace: a cord under the chin, the eggs hanging from it. */
	const NECK_CORD = cubicOf([37.4, 66], [60, 92.6], [82.6, 66]);
	const NECK_CORD_PATH = `M37.4 66Q60 92.6 82.6 66`;
	const NECK_EGGS = [0.17, 0.335, 0.5, 0.665, 0.83].map((t, i) => {
		const [x, y] = pointOnCubic(NECK_CORD, t);
		return {
			x: round(x),
			y: round(y),
			size: [0.86, 0.94, 1.06, 0.94, 0.86][i] ?? 1,
			turn: round((0.5 - t) * 50)
		};
	});
	const NECK_BEADS = [0.075, 0.925].map((t) => pointOnCubic(NECK_CORD, t).map(round));
	const CORD_TWISTS = stitchesAlong(NECK_CORD, 24, 0.3);

	/** An egg, its top at (0, 0). */
	const EGG =
		'M0 1.6C2.6 1.6 3.9 5.6 3.9 8.2C3.9 10.8 2.2 12.2 0 12.2C-2.2 12.2 -3.9 10.8 -3.9 8.2C-3.9 5.6 -2.6 1.6 0 1.6Z';
	const EGG_SHADE = 'M5 0L5 14L-5 14L-5 11C-1 11.6 2.4 9 2.2 4.8C2.1 3.2 1.6 2 0.8 0Z';
	const EGG_LIGHT =
		'M-2.6 6.4C-2.4 4.6 -1.6 3.2 -0.4 2.6C-0.8 3.8 -1.2 5.2 -1.4 6.6C-1.6 7.2 -2.6 7.2 -2.6 6.4Z';
	const EGG_SPOTS = [
		circlePath(-1.6, 8.8, 0.75),
		circlePath(1.5, 6, 0.55),
		circlePath(0.8, 10.3, 0.5),
		circlePath(-0.6, 5, 0.4),
		circlePath(2.1, 8.8, 0.45)
	].join('');
	const EGG_CAP =
		'M-1.9 2.9C-1.9 1.6 -1 0.9 0 0.9C1 0.9 1.9 1.6 1.9 2.9C1.2 3.3 -1.2 3.3 -1.9 2.9Z';

	/* Springs under each foot. */
	function coil(x: number) {
		const front: string[] = [];
		const back: string[] = [];
		for (let i = 0; i < 3; i++) {
			const y = round(112.2 + i * 2);
			front.push(`M${x - 7} ${y}Q${x} ${round(y + 2.8)} ${x + 7} ${round(y + 1)}`);
			back.push(`M${x + 7} ${round(y - 1)}Q${x} ${round(y - 3.2)} ${x - 7} ${y}`);
		}
		return { front: front.join(''), back: back.join('') };
	}
	const COILS = FEET_X.map((x) => ({ x, ...coil(x) }));

	/* Backpack straps, the left one; the right one is mirrored. */
	const STRAP = 'M29.4 61.6C27.6 74 29.4 88 33.4 98.6L37 97.4C33.6 88 33.2 74 35.2 60.4Z';
	const STRAP_SEAMS =
		stitchesAlong(
			[
				[30.2, 63],
				[28.8, 74],
				[30.4, 87],
				[33.8, 96.8]
			],
			9
		) +
		stitchesAlong(
			[
				[34.2, 62],
				[32.4, 74],
				[32.8, 87],
				[35.8, 96.4]
			],
			9
		);
	/** Twigs woven round the nest, mostly along its curve, a few crossing. */
	const NEST_WEAVE = [
		'M5.6 52.4C10 56.2 18 58.4 24.4 58.4C31 58.2 38 56 43 52',
		'M6 58C14 61.6 30 62.4 42 57.6',
		'M8.6 63.4C16 66.6 30 67 40 62.6',
		'M13 68C20 70 28 70 36 67.6',
		'M10 55.6C16 60 22 62.6 28 63.4',
		'M40 56C34 60.6 26 64 18 66',
		'M20 59C26 62 31 66 33 69.6'
	].join('');

	/* Apron. */
	const APRON =
		'M47.4 69L72.6 69C72.8 74 73.4 79 74.4 84.4C80 87 84.6 92 85.6 98.6C85.8 99.8 85.4 101 84.6 101.6Q80.8 105.4 76.4 103.5Q72.4 107 68.2 104.6Q64.2 107.8 60 105Q55.8 107.8 51.8 104.6Q47.6 107 43.6 103.5Q39.2 105.4 35.4 101.6C34.6 101 34.2 99.8 34.4 98.6C35.4 92 40 87 45.6 84.4C46.6 79 47.2 74 47.4 69Z';
	const GINGHAM = (() => {
		const size = 2.2;
		const stripes: string[] = [];
		const crossings: string[] = [];
		const xs: number[] = [];
		const ys: number[] = [];
		for (let x = 32; x < 90; x += 2 * size) xs.push(round(x));
		for (let y = 67; y < 110; y += 2 * size) ys.push(round(y));
		for (const x of xs) stripes.push(`M${x} 66h${size}V110h-${size}Z`);
		for (const y of ys) stripes.push(`M30 ${y}H90v${size}H30Z`);
		for (const x of xs) for (const y of ys) crossings.push(`M${x} ${y}h${size}v${size}h-${size}Z`);
		return { stripes: stripes.join(''), crossings: crossings.join('') };
	})();
	const POCKET =
		'M40.8 90.2C44.4 89.6 50.2 89.6 53.8 90.2C54 93.4 53.6 96.4 52.6 98.6C49.4 99.6 45.4 99.6 42.2 98.6C41.2 96.4 40.8 93.4 40.8 90.2Z';
	const POCKET_SEAMS = stitchesAlong(
		[
			[42.4, 92.4],
			[42.4, 99],
			[52.2, 99],
			[52.2, 92.4]
		],
		9
	);

	/* Sweater. */
	const SWEATER =
		'M30.2 60.4C25.6 66 22.6 74.6 23.2 84C23.6 89.4 26.6 93.4 31.4 96C40 98.6 80 98.6 88.6 96C93.4 93.4 96.4 89.4 96.8 84C97.4 74.6 94.4 66 89.8 60.4C80.6 57.6 72 62.6 60 64.4C48 62.6 39.4 57.6 30.2 60.4Z';
	const SWEATER_STRIPES = [67, 77, 87]
		.map((t) => `M18 ${t}Q60 ${t + 5.6} 102 ${t}L102 ${t + 4.6}Q60 ${t + 10.2} 18 ${t + 4.6}Z`)
		.join('');
	const SWEATER_KNIT = knit(22, 98, 60, 98, 3.2, 3);
	const SLEEVE =
		'M30.6 60.6C25 61.4 19.6 65.6 16.8 72L15.6 75.4C19 77.4 22.8 78.6 27 79L31.4 78.6C29.4 72.6 29.2 66.4 30.6 60.6Z';
	const SLEEVE_CUFF =
		'M15.6 75.4C19 77.4 22.8 78.6 27 79L27 82C22.4 81.6 18.2 80.2 14.4 78.2C14.6 77.2 15 76.2 15.6 75.4Z';
	const SWEATER_HEM = 'M32.4 94.6C41 97.6 79 97.6 87.6 94.6L86.4 100.2C78 103 42 103 33.6 100.2Z';
	const SWEATER_COLLAR =
		'M30.2 60.4C39.4 57.6 48 62.6 60 64.4C72 62.6 80.6 57.6 89.8 60.4L88.6 63.6C80 61.2 72 66.2 60 68C48 66.2 40 61.2 31.4 63.6Z';

	/* Beanie. */
	const BEANIE = 'M30.6 32C29.6 17.6 42.6 6.6 60 6.6C77.4 6.6 90.4 17.6 89.4 32Z';
	const BEANIE_KNIT = knit(30, 90, 10, 31, 3.6, 3.4);
	const BEANIE_DIAMONDS = Array.from({ length: 11 }, (_, i) => {
		const x = 30 + i * 6;
		return `M${x} 19.4L${x + 2.6} 22L${x} 24.6L${x - 2.6} 22Z`;
	}).join('');
	const BEANIE_CUFF =
		'M28.4 30.4C48 25 72 25 91.6 30.4C92.6 33.4 92.6 36.6 91.8 39.6C72 34.4 48 34.4 28.2 39.6C27.4 36.6 27.4 33.4 28.4 30.4Z';
	const CUFF_RIBS = ribs(29, 91, 3, 24, 41);
	const POMPOM = fluffPath(60, 7.4, 5.6, 13, 0.7);
	const POMPOM_FIBRES =
		'M57 5.4L58.2 6.6M61.6 4.6L62.2 6M63.4 8.4L64.8 8.8M58.6 9.6L57.6 11M55.6 8L54.4 8.4M60.4 7.6L60.8 9';

	/* Glasses and goggles. */
	const STAR_FRAMES = EYES_X.map((x) => ({
		x,
		d: roundedStarPath(x, EYE_Y, 14, 8.6, 5, 0.22) + circlePath(x, EYE_Y, 6.9, 1)
	}));
	const GOGGLE_STRAP =
		'M32.2 40C30.8 43.8 30.6 48 31.4 51.8C42 50 78 50 88.6 51.8C89.4 48 89.2 43.8 87.8 40C78 38.2 42 38.2 32.2 40Z';
	const GOGGLE_STRAP_SEAMS =
		stitchesAlong(
			[
				[33, 41.4],
				[44, 39.8],
				[76, 39.8],
				[87, 41.4]
			],
			22
		) +
		stitchesAlong(
			[
				[32.4, 50.4],
				[44, 48.8],
				[76, 48.8],
				[87.6, 50.4]
			],
			22
		);
	const GOGGLE_RIVETS = EYES_X.flatMap((x) =>
		[45, 135, 225, 315].map((deg) => {
			const angle = (deg * Math.PI) / 180;
			return circlePath(x + 9.2 * Math.cos(angle), EYE_Y + 9.2 * Math.sin(angle), 0.8);
		})
	).join('');

	/* Cape. */
	const CAPE =
		'M86 63.6C70 59 50 59 37.6 61.6C24.6 64.8 12 76.4 4.4 94.4C3.8 96 5 97 6.6 96.4C9.4 95.4 12 96.4 12.2 99C12.4 102.4 9.2 106.6 6.2 109.6C5 110.8 5.8 112.4 7.4 112C13 110.6 18.6 108.4 22.6 105.6C24 109.6 27.4 112.6 32 113C33.6 113.2 34.4 112 33.6 110.6C32.4 108 33.4 104.2 37.6 102Z';
	const CAPE_LINING = 'M37.6 61.6C24.6 64.8 12 76.4 4.4 94.4C12 84 22 74.4 35.6 68.6Z';
	const CAPE_COMET = roundedStarPath(16.4, 89.4, 4.6, 2.1, 5, 0.25);
	const CAPE_SPARKLES = [
		roundedStarPath(9.4, 104.4, 2.6, 0.9, 4, 0.2),
		roundedStarPath(27.6, 104.6, 2.2, 0.8, 4, 0.2),
		roundedStarPath(30.4, 88, 1.9, 0.7, 4, 0.2)
	].join('');
	const CAPE_TAB =
		'M28.4 61.8C31.2 59.4 35.6 59 39.2 60.6C38.6 64.6 37.8 68 36.6 71.4C33.6 70.4 31 68.6 29.2 66.2C28.6 64.8 28.2 63.2 28.4 61.8Z';
	const CLASP = roundedStarPath(35, 67.6, 5.6, 2.7, 5, 0.25);

	/* Helmet. */
	const HELMET_COLLAR =
		'M28.6 70.4C38 79.4 82 79.4 91.4 70.4C93.6 72.6 94.4 75.4 93.6 78.2C84 88.6 36 88.6 26.4 78.2C25.6 75.4 26.4 72.6 28.6 70.4Z';
	const HELMET_RIVETS = [
		[34, 77.6],
		[44, 80.6],
		[54, 81.6],
		[66, 81.6],
		[76, 80.6],
		[86, 77.6]
	] as const;
	const EAR_MODULE =
		'M17.6 41.6C17.6 39.6 19 38.4 21 38.4L24.4 38.4C25.6 38.4 26.6 39.4 26.6 40.6L26.6 52.4C26.6 53.6 25.6 54.6 24.4 54.6L21 54.6C19 54.6 17.6 53.4 17.6 51.4Z';

	/* Planet ring. */
	const RING_TUBE = {
		back: 'M13 90A47 14 0 0 1 107 90L96 90A36 6.6 0 0 0 24 90Z',
		front: 'M13 90A47 14 0 0 0 107 90L96 90A36 6.6 0 0 1 24 90Z'
	};
	const RING_BAND = {
		back: 'M15.4 90A44.6 12.4 0 0 1 104.6 90L102 90A42 11 0 0 0 18 90Z',
		front: 'M15.4 90A44.6 12.4 0 0 0 104.6 90L102 90A42 11 0 0 1 18 90Z'
	};
	const RING_SEAMS = {
		back: [210, 240, 270, 300, 330],
		front: [30, 60, 90, 120, 150]
	};
	function ringSeams(degrees: readonly number[]): string {
		return degrees
			.map((deg) => {
				const a = (deg * Math.PI) / 180;
				const c = Math.cos(a);
				const s = Math.sin(a);
				return `M${round(60 + 46 * c)} ${round(90 + 13.6 * s)}L${round(60 + 37 * c)} ${round(90 + 7.2 * s)}`;
			})
			.join('');
	}
	const RING_SHADE = `${AROUND}M15 88.6A45 11.8 0 1 1 105 88.6A45 11.8 0 1 1 15 88.6Z`;

	/* Cap. */
	const CAP_CROWN =
		'M33.4 30C30.4 23.4 30.6 16 36.4 12.2C44.4 7 75.6 7 83.6 12.2C89.4 16 89.6 23.4 86.6 30C72 27.6 48 27.6 33.4 30Z';
	const CAP_STRIPES = Array.from({ length: 13 }, (_, i) => {
		const x = 32 + i * 4.67;
		return `M${round(x)} 6Q${round(60 + (x - 60) * 1.12)} 18 ${round(60 + (x - 60) * 0.98)} 31`;
	}).join('');
	const VISOR =
		'M31.6 29.8C44 26.8 76 26.8 88.4 29.8C86.4 34.6 76 37.6 60 37.6C44 37.6 33.6 34.6 31.6 29.8Z';
	const VISOR_SEAMS = stitchesAlong(
		[
			[34, 31.2],
			[42, 35.4],
			[78, 35.4],
			[86, 31.2]
		],
		18
	);
	const WHEEL_SPOKES = [0, 60, 120]
		.map((deg) => {
			const a = (deg * Math.PI) / 180;
			const dx = round(2.6 * Math.cos(a));
			const dy = round(2.6 * Math.sin(a));
			return `M${round(60 - dx)} ${round(24.6 - dy)}L${round(60 + dx)} ${round(24.6 + dy)}`;
		})
		.join('');

	/* Ladle: crossing lines of the mesh of its microphone head. */
	const MIC_MESH = Array.from({ length: 9 }, (_, i) => {
		const o = -9 + i * 2.2;
		return `M${round(o - 8)} -34L${round(o + 8)} -18M${round(o + 8)} -34L${round(o - 8)} -18`;
	}).join('');
</script>

<!-- A flat shape with its own shadow, light and details clipped inside it, under its outline. -->
{#snippet piece(id: string, d: string, fill: string, shade = '', light = '', detail?: Snippet)}
	<clipPath id="{uid}-{id}"><path {d} clip-rule="evenodd" /></clipPath>
	<path class={fill} {d} fill-rule="evenodd" />
	<g clip-path="url(#{uid}-{id})">
		{@render detail?.()}
		{#if shade}<path class="shade" d={shade} fill-rule="evenodd" />{/if}
		{#if light}<path class="light" d={light} fill-rule="evenodd" />{/if}
	</g>
	<path class="line open" {d} />
{/snippet}

<!-- A cord or a strap drawn as a thick line: its outline, then its colour. -->
{#snippet cord(d: string, fill: string)}
	<path class="open cord-outline" {d} />
	<path class="open cord {fill}" {d} />
{/snippet}

{#snippet egg(id: string, x: number, y: number, size: number, turn: number, hung: boolean)}
	<g transform="translate({x} {y}) rotate({turn}) scale({size})">
		{#if hung}
			<path class="gold line" fill-rule="evenodd" d={ring(0, 0, 1.5, 0.6)} />
		{/if}
		{#snippet spots()}<path class="spot" d={EGG_SPOTS} />{/snippet}
		{@render piece(id, EGG, 'cream', EGG_SHADE, EGG_LIGHT, spots)}
		{#if hung}
			<path class="gold line" d={EGG_CAP} />
		{/if}
	</g>
{/snippet}

{#snippet rainBoot(side: string)}
	{@render cord('M53.4 92.6C55.6 91.4 57.4 92.8 57 95C56.8 96.4 55.6 97 54.4 96.8', 'cord-rubber')}
	{@render piece(
		`${side}-boot`,
		'M36.6 95.4C36.2 99 36.4 102 36 104.4C32 105.2 28.4 107 27.4 110.2C27 111.4 27.6 112.4 28.8 112.4L55.6 112.4C56.6 112.4 57 111.6 57 110.6C56.8 107.6 54.4 105.6 53.8 103C53.4 100.6 53.4 98 53.6 95.4Z',
		'rubber',
		'M48.4 94C50 100 50.4 106 47.6 113L60 113L60 94ZM26 109.4C34 108.6 46 109 58 109.6L58 113L26 113Z',
		'M39.2 98C39 100 39 102 38.8 103.6C38.3 103.9 37.8 103.7 37.8 103.2C38 101.2 38 99.4 38.2 97.8C38.4 97.3 39 97.4 39.2 98ZM29.6 108.8C31.2 107 33.4 106 35.6 105.6C34 106.6 32.6 107.8 31.2 109.2C30.8 109.6 29.8 109.4 29.6 108.8Z'
	)}
	{#snippet tread()}
		<path
			class="open fine light-line"
			d="M30.6 114.6L31.6 112M34.6 114.6L35.6 112M38.6 114.6L39.6 112M42.6 114.6L43.6 112M46.6 114.6L47.6 112M50.6 114.6L51.6 112M54.6 114.6L55.6 112"
		/>
	{/snippet}
	{@render piece(
		`${side}-sole`,
		'M27.6 111.4L56.8 111.4L56.8 113.6C56.8 114.6 56.2 115 55.4 115L29 115C27.8 115 27.2 114 27.4 112.6Z',
		'ink',
		'',
		'',
		tread
	)}
	{@render piece(
		`${side}-cuff`,
		'M35.6 93.6C35.6 92.2 37 91.6 38.6 91.6L51.6 91.6C53.2 91.6 54.6 92.2 54.6 93.6L54.6 96.2C54.6 97.2 53.6 97.6 52.4 97.4C47.6 96.8 42 96.8 37.6 97.4C36.4 97.6 35.6 97.2 35.6 96.2Z',
		'rubber',
		'M30 95.6C40 94.6 50 94.6 60 95.6L60 99L30 99ZM49 90L60 90L60 99L50 99Z',
		'M37.6 92.6C42 92.2 48 92.2 52.6 92.6L52.6 93.6C48 93.2 42 93.2 37.6 93.6Z'
	)}
{/snippet}

{#snippet skate(side: string)}
	{#each [37, 52] as x (x)}
		{@render piece(
			`${side}-wheel-${x}`,
			circlePath(x, 116.4, 3.8),
			'jewel',
			outside(x - 0.9, 115.5, 3.8),
			'',
			undefined
		)}
		<circle class="metal line" cx={x} cy="116.4" r="1.5" />
	{/each}
	{@render piece(
		`${side}-plate`,
		'M30.4 112L58 112C58.6 112 59 112.6 58.8 113.2L58.4 114.2C58.2 114.8 57.6 115.2 57 115.2L31.6 115.2C30.8 115.2 30.2 114.6 30.2 113.8Z',
		'metal',
		'M28 114L60 114L60 116L28 116Z',
		'M31 112.6L57.6 112.6L57.6 113.2L31 113.2Z'
	)}
	{@render piece(
		`${side}-stop`,
		'M29.6 110.6C28 110.6 27 111.8 27.2 113.2C27.4 114.6 28.6 115.4 30 115.2L33 114.8L32.6 110.6Z',
		'red',
		'M26 113.4C28 114.4 31 114.4 34 113.6L34 116L26 116Z'
	)}
	{#snippet bootDetail()}
		<path
			class="cream"
			d="M45.8 97.6C46.4 101.6 47.8 105 50.4 107.6L52.8 107C50.6 104.6 49.4 101.2 48.8 97.4Z"
		/>
	{/snippet}
	{@render piece(
		`${side}-boot`,
		'M38.2 96.6C38 95.4 39 94.6 40.4 94.6L51.4 94.6C52.8 94.6 53.6 95.4 53.6 96.6C53.4 100 53.6 103.4 54.4 106C56.4 107 57.8 108.8 57.8 110.6L57.8 112.2L31 112.2C29.8 112.2 29.4 111 29.8 109.8C30.8 106.8 33.8 105.2 37 104.4C37.8 101.8 38.4 99.2 38.2 96.6Z',
		'blue',
		'M50.6 94C51.6 100 52.6 106 52 113L60 113L60 94ZM26 110C36 109.6 48 109.6 60 110L60 113L26 113Z',
		'M39.8 98.4C39.8 100.4 39.4 102.4 38.6 104.2L37.8 104.4C38.6 102.4 39 100.4 39 98.4ZM31.6 108.6C32.8 107.2 34.4 106.4 36.2 106C35 106.8 33.8 107.8 32.8 109Z',
		bootDetail
	)}
	<path
		class="open lace"
		d="M39.4 99L44.6 101.2M44.6 99L39.4 101.2M38.6 102.2L43.8 104.4M43.8 102.2L38.6 104.4M36.2 105.4L40.6 107.6M40.6 105.4L36.2 107.6"
	/>
	{@render piece(
		`${side}-collar`,
		'M37.8 95.6C37.8 93.6 39.4 92.4 41.4 92.4L50.6 92.4C52.6 92.4 54.2 93.6 54.2 95.6C54.2 97 53.2 97.8 51.8 97.6C47.8 97 44.2 97 40.2 97.6C38.8 97.8 37.8 97 37.8 95.6Z',
		'cream',
		'M36 96C42 95.4 50 95.4 56 96L56 98L36 98Z'
	)}
{/snippet}

{#snippet ballShoe(side: string)}
	{@render piece(
		`${side}-heel`,
		'M51.4 113.2L56.2 113.2C56.2 114.8 55.8 116 55.2 116.8L52.6 116.8C52 116 51.6 114.8 51.4 113.2Z',
		'ink',
		'',
		'M52.4 113.8L53.2 113.8L53.6 116.2L53 116.2Z'
	)}
	{@render piece(
		`${side}-sole`,
		'M30.8 111.6C31.2 113.2 32.4 114.2 33.8 114.2L55.8 114.2C56.8 114.2 57.4 113.6 57.6 112.6L57.6 113.6C57.4 115 56.6 115.6 55.4 115.6L33.8 115.6C32 115.6 30.8 114.2 30.8 111.6Z',
		'ink'
	)}
	{#snippet lining()}
		<path
			class="open lace"
			d="M33.4 106.4C35 105.4 37.6 105.4 39.4 106.6C41 107.6 42.6 108.6 44.6 109C47.8 109.6 50.8 108.2 52.8 106.4C54 105.4 55.6 105.4 56.6 106.6"
		/>
	{/snippet}
	{@render piece(
		`${side}-shoe`,
		'M30.8 110.6C30.6 107.4 33 105 36.6 104.8C39.6 104.6 41.4 106.8 44.6 107.4C47.6 108 50.8 106.8 52.8 105C54.6 103.4 57.2 104.8 57.6 107.8C57.9 109.6 57.8 111.4 57.6 112.4C57.4 113.4 56.6 113.8 55.6 113.8L33.6 113.8C31.8 113.8 30.9 112.6 30.8 110.6Z',
		'red',
		'M28 111.2C38 112.4 48 112.2 60 110.4L60 116L28 116ZM53.6 102C56.4 106 57 110 56 116L60 116L60 102Z',
		'M32.8 109C33.6 107.2 35.2 106.2 37.2 106.2C35.8 106.8 34.6 107.8 33.8 109.4C33.4 109.8 32.8 109.6 32.8 109ZM42.4 110.6C46.4 111 50.8 110.6 54.6 109.4C51.8 111.2 47.2 112 42.8 111.6C42.2 111.4 42 110.8 42.4 110.6Z',
		lining
	)}
	{@render piece(
		`${side}-strap`,
		'M39.4 106.4C40.6 102.6 49.2 101.6 52.6 104.8L51.8 106.2C48.8 103.6 42.2 104.2 41 107.2Z',
		'red',
		'M38 106C43 104.6 48 104.6 54 106L54 108L38 108Z',
		'M41 104.6C43.6 103.2 47.4 102.8 50 103.6C47.2 103.6 44 104 41.6 105.2Z'
	)}
	<circle class="gold line" cx="51.6" cy="105.4" r="1.2" />
	<g transform="translate(35.2 105.8) scale(0.8) translate(-35 -107.6)">
		{@render piece(
			`${side}-bow-a`,
			'M35 107.6C33 105 30.4 105.6 30.8 107.8C31.2 109.6 33.6 109.6 35 107.6Z',
			'cream',
			'M30 108.4C32 109.4 34 109 36 107.8L36 110L30 110Z'
		)}
		{@render piece(
			`${side}-bow-b`,
			'M35 107.6C37 105 39.6 105.6 39.2 107.8C38.8 109.6 36.4 109.6 35 107.6Z',
			'cream',
			'M34 107.8C36 109 38 109.4 40 108.4L40 110L34 110Z'
		)}
		<ellipse class="cream line" cx="35" cy="107.6" rx="1" ry="1.2" />
	</g>
{/snippet}

{#snippet strap(side: string)}
	{#snippet seams()}<path class="open seam" d={STRAP_SEAMS} />{/snippet}
	{@render piece(
		`${side}-strap`,
		STRAP,
		'leather',
		'M33 58C31 74 32 88 36 100L40 100L40 58Z',
		'M30.2 64C29.2 72 29.6 80 31 88L31.6 88C30.6 80 30.4 72 31.2 64Z',
		seams
	)}
	<path
		class="gold line"
		fill-rule="evenodd"
		d="M27.4 66.6C27.4 65.6 28 65 29 65L34.6 65C35.6 65 36.2 65.6 36.2 66.6L36.2 70.6C36.2 71.6 35.6 72.2 34.6 72.2L29 72.2C28 72.2 27.4 71.6 27.4 70.6ZM29 66.6L29 70.6L34.6 70.6L34.6 66.6Z"
	/>
	<path class="open line thin" d="M31.8 66.4L31.8 70.8" />
{/snippet}

{#snippet sleeve(side: string)}
	{#snippet sleeveStripe()}
		<path class="ink" d="M14 67Q24 69 34 66L34 70.4Q24 73.4 14 71.4Z" />
		<path class="open fine" d={knit(14, 32, 61, 80, 3.2, 3)} />
	{/snippet}
	{@render piece(
		`${side}-sleeve`,
		SLEEVE,
		'cream',
		'M26 58C31 66 31 74 30 82L34 82L34 58ZM12 75C18 78 24 79 32 78.6L32 82L12 82Z',
		'M19.6 69.6C21 66.4 23.4 63.8 26.4 62.4C24 64.6 22.2 67 20.8 70Z',
		sleeveStripe
	)}
	{#snippet cuffRibs()}<path class="open fine" d={ribs(14, 28, 1.8, 74, 83)} />{/snippet}
	{@render piece(
		`${side}-cuff`,
		SLEEVE_CUFF,
		'cream',
		'M12 79.4C18 81.4 22 82 28 82.4L28 84L12 84Z',
		'',
		cuffRibs
	)}
{/snippet}

{#snippet scarfTail(id: string, d: string, stripe: string, light: string)}
	{#snippet tailStripe()}<path class="red" d={stripe} />{/snippet}
	{@render piece(id, d, 'cream', 'M40 92C44 96 52 99 60 100L60 108L40 108Z', light, tailStripe)}
{/snippet}

<g class="item" data-art={artId} data-layer={layer}>
	{#if layer === 'back'}
		{#if artId === 'nest-backpack'}
			{@render cord('M40.6 52.6L46.6 49.6', 'cord-twig')}
			{@render cord('M8 61L1.8 59.4', 'cord-twig')}
			{@render cord('M29 69L32.4 73.6', 'cord-twig')}
			{#snippet hollowStraws()}
				<path
					class="open weave"
					d="M9 49.6C14 47.6 20 47 26 47.2M24 46.6C30 46.4 36 47.6 39.6 49.4"
				/>
				<path class="shade" d="M0 40L50 40L50 60L0 60Z" />
			{/snippet}
			{@render piece(
				'nest-hollow',
				'M5.4 50.4C5.4 46.6 14 44 24 44C34 44 42.6 46.6 42.6 50.4C42.6 54 34 56.4 24 56.4C14 56.4 5.4 54 5.4 50.4Z',
				'twig',
				'M0 40L50 40L50 60L0 60Z',
				'',
				hollowStraws
			)}
			{@render egg('nest-egg-a', 17.4, 38.4, 1.05, -12, false)}
			{@render egg('nest-egg-b', 29, 37.4, 1.15, 10, false)}
			{#snippet weave()}<path class="open weave" d={NEST_WEAVE} /><path
					class="open fine"
					d={NEST_WEAVE}
					transform="translate(0 1.2)"
				/>{/snippet}
			{@render piece(
				'nest-bowl',
				'M4.2 49.6C8 54.6 16 56.8 24 56.8C32 56.8 40 54.6 43.8 49.6Q46.2 52.6 44.4 55.6Q45.8 59.4 42.6 61.8Q42.4 66 37.8 67.2Q35 70.8 30 70.4Q26 72.6 21.6 70.8Q16.6 71.8 13.8 68.4Q8.8 67.8 8 63.6Q4 61.4 5 57.4Q2 54.2 4.2 49.6Z',
				'twig',
				'M32 52C40 58 38 66 30 74L50 74L50 52ZM0 64C10 72 30 74 50 64L50 76L0 76Z',
				'M5.6 51.6C10 55.4 18 57.6 24 57.8C18 58.6 10 57 6.4 53.6Z',
				weave
			)}
			{@render piece(
				'nest-leaf',
				'M41.8 49.4C43.6 45.6 47.4 44 50.4 44.4C49.6 47.6 46.4 50.4 41.8 49.4Z',
				'leaf',
				'M40 49C44 48.6 48 46.6 51 44L51 52L40 52Z'
			)}
		{:else if artId === 'comet-cape'}
			{#snippet capeDetail()}
				<path
					class="open cord-gold-line"
					d="M19.4 86.4C22.4 82.4 25.6 79.6 29.6 77.6M21 88.8C25 85.8 28 84 32 82.8M17.8 85C19.6 81 22 78 25.2 75.6"
				/>
				<path class="gold" d={CAPE_COMET} />
				<path class="open line thin" d={CAPE_COMET} />
				<path class="gold" d={CAPE_SPARKLES} />
				<path
					class="shade"
					d="M33.6 70C26 80 18.4 90 12.2 99C16 93 20 88 25 81C28 77 31 73 33.6 70ZM36 74C32 85 28 96 22.6 105.6C26 99 29 90 32 82Z"
				/>
				<path class="open fine" d="M33.6 70C26 80 18.4 90 12.2 99M36 74C32 85 28 96 22.6 105.6" />
			{/snippet}
			{@render piece(
				'cape',
				CAPE,
				'cape',
				'M0 104C12 108 24 108 40 100L40 116L0 116Z',
				'M20 70C14 76 10 82 7.6 88C10.4 84 14.4 78.6 19.4 74Z',
				capeDetail
			)}
			{@render piece(
				'cape-lining',
				CAPE_LINING,
				'ring',
				'M20 75C14 80 9 87 4 96L10 96C14 88 20 80 28 74Z',
				'M33 64C24 67 16 73 10 81C18 72 26 67 35 65Z'
			)}
		{:else if artId === 'ring-float'}
			{#snippet backBand()}
				<path class="gold" d={RING_BAND.back} />
				<path class="open fine" d={ringSeams(RING_SEAMS.back)} />
			{/snippet}
			{@render piece(
				'ring-back',
				RING_TUBE.back,
				'ring',
				`${RING_SHADE}M20 88A40 8 0 0 1 100 88L100 92L20 92Z`,
				'M24 84A38 8.6 0 0 1 96 84A40 10.4 0 0 0 24 84Z',
				backBand
			)}
		{/if}
	{:else if artId === 'nest-backpack'}
		{@render strap('left')}
		<g transform={MIRROR}>{@render strap('right')}</g>
	{:else if artId === 'comet-cape'}
		{#each ['left', 'right'] as side (side)}
			<g transform={side === 'right' ? MIRROR : undefined}>
				{@render piece(
					`${side}-tab`,
					CAPE_TAB,
					'cape',
					'M26 66C30 70 34 72 40 72L40 74L26 74Z',
					'M29.6 62C32 60.4 35 60 37.6 60.8C35 61 32.4 61.6 30.4 63Z'
				)}
				{@render piece(
					`${side}-clasp`,
					CLASP,
					'gold',
					outside(34, 66.4, 5.4),
					'M31.4 64.4C32.2 63.4 33.2 62.8 34.4 62.6C33.6 63.4 33 64.2 32.6 65.2Z'
				)}
				<circle class="jewel line" cx="35" cy="67.8" r="1.5" />
			</g>
		{/each}
	{:else if artId === 'ring-float'}
		{#snippet frontBand()}
			<path class="gold" d={RING_BAND.front} />
			<path class="open fine" d={ringSeams(RING_SEAMS.front)} />
		{/snippet}
		{@render piece(
			'ring-front',
			RING_TUBE.front,
			'ring',
			RING_SHADE,
			'M22.6 92.4A38.6 8.6 0 0 0 97.4 92.4L96 92.4A37.4 7.6 0 0 1 24 92.4Z',
			frontBand
		)}
		{@render piece(
			'ring-valve',
			'M72.6 99.6C72.6 98.4 76.2 98.4 76.2 99.6L76.2 101C76.2 102.2 72.6 102.2 72.6 101Z',
			'cream',
			'M74.8 97L78 97L78 103L74.8 103Z'
		)}
		<ellipse class="cream line" cx="74.4" cy="99.6" rx="1.8" ry="0.7" />
	{:else if artId === 'checked-apron'}
		{#snippet gingham()}
			<path class="jewel" d={GINGHAM.stripes} />
			<path class="red" d={GINGHAM.crossings} />
		{/snippet}
		{@render piece(
			'apron',
			APRON,
			'cream',
			'M70 66C76 80 82 92 80 110L92 110L92 66ZM30 92C48 97 72 97 90 92L90 95.4C72 100.4 48 100.4 30 95.4Z',
			'M48.6 71C48.4 75 48 79 47.2 83L48.6 83C49.2 79 49.6 75 49.8 71Z',
			gingham
		)}
		{@render piece(
			'spoon',
			'M45.4 91C44.8 88 44.2 85.4 43.4 83.2C43 81.8 44.8 81 45.4 82.4C46.2 84.8 47 87.6 47.6 90.8Z',
			'twig',
			'M45.4 81L48 81L48 92L46.6 92C46 88 45.6 84 45.4 81Z'
		)}
		{#snippet pocketSeams()}<path class="open seam" d={POCKET_SEAMS} />{/snippet}
		{@render piece(
			'pocket',
			POCKET,
			'red',
			'M50 88C52 92 52 96 50 100L56 100L56 88ZM40 97.4C44 98.6 50 98.6 56 97.4L56 101L40 101Z',
			'M41.6 90.4C45 90 49 90 52.6 90.4L52.6 91.4C49 91 45 91 41.6 91.4Z',
			pocketSeams
		)}
		{@render piece(
			'waistband',
			'M28.6 84.6C48 89.8 72 89.8 91.4 84.6L91.6 88.4C72 93.6 48 93.6 28.4 88.4Z',
			'red',
			'M26 88C48 92.4 72 92.4 94 88L94 94L26 94Z',
			'M30 85.4C48 90 72 90 90 85.4L90 86.2C72 90.8 48 90.8 30 86.2Z'
		)}
		{@render piece(
			'bow-tail-a',
			'M77.4 90.4C76.4 93.4 75 96 73.6 97.6L76 98.4C77.2 96.4 78.2 93.4 78.6 90.6Z',
			'red',
			'M76 90L80 90L80 99L76.6 99Z'
		)}
		{@render piece(
			'bow-tail-b',
			'M78.6 90.4C79.6 93 80.6 95.6 82 97.2L84.2 96C82.6 94.2 80.8 92.6 79.2 90.2Z',
			'red',
			'M80.6 90L86 90L86 99L82 99Z'
		)}
		{@render piece(
			'bow-loop-a',
			'M78 89.8C75 86.4 71 86.6 71 89.4C71 92.2 75 92.8 78 89.8Z',
			'red',
			'M70 90C73 91.6 76 91 79 89L79 94L70 94Z',
			'M72.2 88.8C72.6 87.8 73.8 87.4 75 87.8C74 88 73.2 88.4 72.8 89.2Z'
		)}
		{@render piece(
			'bow-loop-b',
			'M78 89.8C81 86.4 85 86.6 85 89.4C85 92.2 81 92.8 78 89.8Z',
			'red',
			'M77 89C80 91 83 91.6 86 90L86 94L77 94Z',
			'M80.6 87.8C81.8 87.4 83 87.8 83.6 88.6C82.6 88.4 81.6 88.4 80.8 88.8Z'
		)}
		<ellipse class="red line" cx="78" cy="89.8" rx="1.8" ry="2" />
	{:else if artId === 'striped-sweater'}
		{@render sleeve('left')}
		<g transform={MIRROR}>{@render sleeve('right')}</g>
		{#snippet stripes()}
			<path class="ink" d={SWEATER_STRIPES} />
			<path class="open fine" d={SWEATER_KNIT} />
		{/snippet}
		{@render piece(
			'sweater',
			SWEATER,
			'cream',
			'M80 56C92 70 92 88 84 102L102 102L102 56ZM18 92Q60 100 102 92L102 104L18 104Z',
			'M30.6 64C28 68 26.6 72.4 26.2 77L27.6 77C28.2 72.6 29.4 68.6 31.6 64.8Z',
			stripes
		)}
		{#snippet hemRibs()}<path class="open fine" d={ribs(33, 87, 2.4, 93, 103)} />{/snippet}
		{@render piece(
			'hem',
			SWEATER_HEM,
			'cream',
			'M30 99C42 102 78 102 90 99L90 104L30 104ZM80 92L92 92L92 104L80 104Z',
			'',
			hemRibs
		)}
		{#snippet collarRibs()}<path class="open fine" d={ribs(31, 89, 2.4, 56, 70)} />{/snippet}
		{@render piece(
			'collar',
			SWEATER_COLLAR,
			'cream',
			'M30 63C42 64 52 68 60 69L60 70L30 70Z',
			'',
			collarRibs
		)}
	{:else if artId === 'egg-necklace'}
		{@render cord(NECK_CORD_PATH, 'cord-twig')}
		<path class="open fine" d={CORD_TWISTS} />
		{#each NECK_BEADS as [x, y], i (i)}
			{@render piece(
				`bead-${i}`,
				circlePath(x ?? 0, y ?? 0, 1.9),
				'leather',
				outside((x ?? 0) - 0.6, (y ?? 0) - 0.6, 1.9),
				''
			)}
		{/each}
		{#each NECK_EGGS as e, i (i)}
			{@render egg(`neck-egg-${i}`, e.x, e.y, e.size, e.turn, true)}
		{/each}
	{:else if artId === 'giraffe-bow-tie'}
		{@render piece(
			'collar-band',
			'M38.2 67.4C44.4 75.4 52.2 78.8 60 78.8C67.8 78.8 75.6 75.4 81.8 67.4L83.8 64.6C77 75.8 68.4 82 60 82C51.6 82 43 75.8 36.2 64.6Z',
			'gold',
			'M30 66C44 82 76 82 90 66L90 86L30 86Z'
		)}
		{#each ['left', 'right'] as side (side)}
			<g transform={side === 'right' ? MIRROR : undefined}>
				{#snippet patches()}
					<path
						class="spot"
						d="M43.6 75.6C45.6 74.6 48.2 75.4 48.6 77.4C48.8 79.2 47.2 80.4 45.4 80.2C43.8 80 42.6 77.2 43.6 75.6ZM50.6 78.6C52.4 78 54.2 79 54 80.8C53.8 82.4 52 83 50.6 82.2C49.4 81.4 49.4 79.2 50.6 78.6ZM43.2 83C45 82.2 47.4 83 47.4 85C47.4 86.8 45.6 87.8 43.8 87.2C42.2 86.6 42 83.8 43.2 83ZM49.6 85C50.8 84.4 52.4 85 52.2 86.4C52 87.4 50.6 87.8 49.6 87.2C49 86.6 49 85.4 49.6 85Z"
					/>
					<path
						class="open fine"
						d="M56.4 80.4C52 79.6 48 78.4 45.4 76.4M56.4 82.6C52.4 84 48.6 85.8 46 87.6"
					/>
				{/snippet}
				{@render piece(
					`${side}-wing`,
					'M57 79.6C52.6 75.6 47.6 72.6 44.4 73.6C41.6 74.6 41.2 79.4 41.6 82C42 85.2 42.6 88.6 45 89.2C48.2 90 53.2 86.6 57 83.2Z',
					'gold',
					'M52 70C55 76 55 86 52 92L60 92L60 70ZM38 85C46 90 52 88 58 86L58 94L38 94Z',
					'M42.6 77C43.2 75.4 44.6 74.6 46.2 74.8C45 75.6 44.2 76.6 43.8 78.2Z',
					patches
				)}
			</g>
		{/each}
		{#snippet knotPatch()}
			<path
				class="spot"
				d="M57.6 79.2C59 78.6 60.6 79.2 60.6 80.6C60.6 81.8 59.2 82.4 58 82C57 81.6 56.8 79.8 57.6 79.2Z"
			/>
		{/snippet}
		{@render piece(
			'knot',
			'M56 78.2C58.4 77.2 61.6 77.2 64 78.2C64.8 80.4 64.8 82.4 64 84.6C61.6 85.6 58.4 85.6 56 84.6C55.2 82.4 55.2 80.4 56 78.2Z',
			'gold',
			'M62 76C64 80 64 84 62 87L66 87L66 76Z',
			'M57 79.4C58 78.6 59.6 78.4 61 78.6C59.6 79 58.4 79.6 57.6 80.6Z',
			knotPatch
		)}
	{:else if artId === 'pilot-scarf'}
		{@render scarfTail(
			'tail-b',
			'M48.6 86.4C51.4 90.6 54.6 94 58.6 96.6L54.2 101.6C50.6 98.4 47.6 94 45.8 88.6Z',
			'M52.6 97.4L57.6 92.8L58.8 93.8L53.8 98.6Z',
			'M48.8 88.4C50.4 91 52.4 93.2 54.8 95.2L54.2 95.8C51.8 93.8 49.8 91.4 48.4 88.8Z'
		)}
		<path class="open fine" d="M57.8 97.6L60.4 99.6M56.6 99L59 101.2M55.4 100.4L57.6 102.6" />
		{@render scarfTail(
			'tail-a',
			'M42.4 85.6C41.6 91 40.2 96 38.4 100.6L46.6 103.2C47.4 98 48.6 92.6 50.2 86.6Z',
			'M38.8 96.6L47.8 99.2L47.4 100.6L38.4 98Z',
			'M43.6 87C43 91.4 41.8 95.6 40.4 99.4L39.6 99.2C41 95.4 42.2 91.2 42.8 87Z'
		)}
		<path
			class="open fine"
			d="M39.2 101L38.4 104.2M41.2 101.6L40.6 104.8M43.2 102.2L42.8 105.4M45.2 102.8L45 106"
		/>
		{#snippet wrapFolds()}
			<path
				class="open fine"
				d="M38 68.6C44 77 52 81.6 60 82.4M68 81.8C74 80.2 80 76 84 70M52 86.4C55 87 58 87.2 61 87.2M66 86.4C72 84.6 78 80 82.4 74.4"
			/>
		{/snippet}
		{@render piece(
			'wrap',
			'M35.4 64.4C42 76 51 79.4 60 79.4C69 79.4 78 76 84.6 64.4C85.8 66.4 86.2 68.4 86 70.4C79.6 85.4 70.4 90.6 60 90.6C49.6 90.6 40.4 85.4 34 70.4C33.6 68.4 34.2 66.2 35.4 64.4Z',
			'cream',
			'M30 72C42 88 78 88 90 72L90 92L30 92Z',
			'M37.4 67C43 76 51 80 60 80.6C69 80 77 76 82.6 67C78 77.6 69 81.8 60 82C51 81.8 42 77.6 37.4 67Z',
			wrapFolds
		)}
		{@render piece(
			'scarf-knot',
			'M41.6 81.2C42.8 78.6 47.8 78.2 50.6 80C52.6 81.4 52.4 85.4 50.2 87C47.8 88.6 43 88.4 41.6 86.2C40.8 84.6 40.8 82.8 41.6 81.2Z',
			'cream',
			'M48 78C52 82 52 86 48 90L56 90L56 78ZM40 86C44 88 48 88 52 86L52 90L40 90Z',
			'M42.6 81.8C43.8 80.4 46 80 48 80.4C46.2 80.8 44.6 81.6 43.6 82.8Z'
		)}
		<path class="open fine" d="M45.4 79.6C44.6 82.4 45 85.2 46.6 88" />
	{:else if artId === 'springs'}
		{#each COILS as spring (spring.x)}
			{@const x = spring.x}
			{@render piece(
				`base-${x}`,
				`M${x - 9.4} 118.4C${x - 9.4} 116.8 ${x + 9.4} 116.8 ${x + 9.4} 118.4L${x + 9.4} 119.2C${x + 9.4} 120.8 ${x - 9.4} 120.8 ${x - 9.4} 119.2Z`,
				'red',
				`M${x - 10} 118.9C${x - 4} 120 ${x + 4} 120 ${x + 10} 118.9L${x + 10} 122L${x - 10} 122Z`,
				`M${x - 6} 117.6C${x - 2} 117.2 ${x + 2} 117.2 ${x + 6} 117.6L${x + 6} 118C${x + 2} 117.6 ${x - 2} 117.6 ${x - 6} 118Z`
			)}
			{@render cord(spring.back, 'cord-metal')}
			<path class="open coil-dim" d={spring.back} />
			{@render cord(spring.front, 'cord-metal')}
			<path class="open shine-thin" d={spring.front} transform="translate(0 -0.5)" />
			{@render piece(
				`plate-${x}`,
				`M${x - 9.4} 110.6C${x - 9.4} 108.8 ${x + 9.4} 108.8 ${x + 9.4} 110.6L${x + 9.4} 111.8C${x + 9.4} 113.6 ${x - 9.4} 113.6 ${x - 9.4} 111.8Z`,
				'metal',
				`M${x - 10} 111.4C${x - 4} 112.6 ${x + 4} 112.6 ${x + 10} 111.4L${x + 10} 115L${x - 10} 115Z`,
				`M${x - 6} 109.6C${x - 2} 109.2 ${x + 2} 109.2 ${x + 6} 109.6L${x + 6} 110C${x + 2} 109.6 ${x - 2} 109.6 ${x - 6} 110Z`
			)}
			<circle class="ink" cx={x - 6} cy="111.2" r="0.6" />
			<circle class="ink" cx={x + 6} cy="111.2" r="0.6" />
		{/each}
	{:else if artId === 'rain-boots'}
		{@render rainBoot('left')}
		<g transform={MIRROR}>{@render rainBoot('right')}</g>
	{:else if artId === 'ball-shoes'}
		{@render ballShoe('left')}
		<g transform={MIRROR}>{@render ballShoe('right')}</g>
	{:else if artId === 'roller-skates'}
		{@render skate('left')}
		<g transform={MIRROR}>{@render skate('right')}</g>
	{:else if artId === 'cream-moustache'}
		{#snippet dollopRidges()}
			<path
				class="open fine"
				d="M54.8 54C58 55 62 54.8 65.2 53.6M57.2 50.6C59.2 51.4 61.4 51.2 62.8 50.4"
			/>
		{/snippet}
		{@render piece(
			'dollop',
			'M53.4 57.4C52.4 53.4 55.4 51.8 57.2 51C56.6 48.8 58.4 46.6 60.6 45.4C61.4 47.4 63.8 48.6 63 50.8C65.2 51.6 67.8 53.6 66.6 57.4Z',
			'cream',
			'M62 46C66 50 68 54 66 58L70 58L70 46Z',
			'M56 53.6C56.2 52.6 57 52 58 51.8C57.4 52.4 57 53 56.8 53.8Z',
			dollopRidges
		)}
		{#snippet moustacheRidges()}
			<path
				class="open fine"
				d="M38.6 57C42 58.8 45.6 58.8 48.2 57.4M48.2 57.4C51.8 58.6 56 58.2 60 57M81.4 57C78 58.8 74.4 58.8 71.8 57.4M71.8 57.4C68.2 58.6 64 58.2 60 57M35.4 55.4C33.8 54.6 33.4 53 34 51.6M84.6 55.4C86.2 54.6 86.6 53 86 51.6"
			/>
		{/snippet}
		<!-- Puffed up from the middle of the muzzle: a generous swirl of cream. -->
		<g transform="translate(60 56) scale(1.06 1.3) translate(-60 -56)">
			{@render piece(
				'moustache',
				'M60 55C56.5 52 51.5 52 48 54.6C45 52.2 40.4 52.6 38.8 55.6C36.2 55.6 34.4 53.6 35 51C31.4 52 31 57.6 35.4 59.8C39.4 61.8 44.8 61.4 48.4 59.8C52.4 61.8 57.4 61.2 60 59C62.6 61.2 67.6 61.8 71.6 59.8C75.2 61.4 80.6 61.8 84.6 59.8C89 57.6 88.6 52 85 51C85.6 53.6 83.8 55.6 81.2 55.6C79.6 52.6 75 52.2 72 54.6C68.5 52 63.5 52 60 55Z',
				'cream',
				'M30 58.6C45 63 75 63 90 58.6L90 64L30 64Z',
				'M41.4 54.6C42.8 53.6 44.8 53.4 46.4 54.2C44.8 54.2 43.4 54.6 42.2 55.4ZM78.6 54.6C77.2 53.6 75.2 53.4 73.6 54.2C75.2 54.2 76.6 54.6 77.8 55.4ZM51.2 54C53.6 53.2 56.4 53.4 58 54.4C56 54.2 54 54.4 52.4 55Z',
				moustacheRidges
			)}
			<ellipse
				class="red"
				cx="43.6"
				cy="56.8"
				rx="1.5"
				ry="0.55"
				transform="rotate(-30 43.6 56.8)"
			/>
			<ellipse
				class="blue"
				cx="52.4"
				cy="55.8"
				rx="1.5"
				ry="0.55"
				transform="rotate(25 52.4 55.8)"
			/>
			<ellipse class="leaf" cx="67.6" cy="56" rx="1.5" ry="0.55" transform="rotate(-15 67.6 56)" />
			<ellipse class="gold" cx="77" cy="57" rx="1.5" ry="0.55" transform="rotate(35 77 57)" />
			<ellipse
				class="jewel"
				cx="36.6"
				cy="58.4"
				rx="1.5"
				ry="0.55"
				transform="rotate(60 36.6 58.4)"
			/>
			<ellipse class="red" cx="83" cy="58.2" rx="1.5" ry="0.55" transform="rotate(-50 83 58.2)" />
		</g>
		<ellipse
			class="jewel"
			cx="60.4"
			cy="49.6"
			rx="1.4"
			ry="0.5"
			transform="rotate(-40 60.4 49.6)"
		/>
	{:else if artId === 'chili-nose'}
		{@render piece(
			'stem',
			'M60.4 49.6C60 46.6 61 43.8 63.6 42.8C64.6 42.4 65.4 43.6 64.4 44.2C62.6 45.2 62 47 62.2 49.4Z',
			'leaf',
			'M62 44C62.6 46 62.6 48 62.4 50L66 50L66 44Z'
		)}
		{#snippet chiliCrease()}<path
				class="open fine"
				d="M61 57.6C62.4 59.4 64 60.8 65.8 61.8"
			/>{/snippet}
		{@render piece(
			'chili',
			'M54.4 53.6C54 50.2 57.4 48.6 60.6 48.8C64.8 49 67.6 51.6 67.6 55.4C67.6 59.4 69 63.4 72.2 66.2C73 67 72.4 68.2 71.2 67.8C64 66 58.4 62.2 55.8 58.2C55 56.8 54.6 55.2 54.4 53.6Z',
			'red',
			'M50 58C58 62 64 64.4 74 66L74 70L50 70ZM64.4 49C68.6 53 67 58 68.4 62L76 62L76 49Z',
			'M57.2 55.6C57 53.6 58 52.4 59.6 52C58.6 53 58.2 54.4 58.4 56ZM63.8 58.4C64.6 61.2 66.2 63.6 68.4 65.4C66 64.6 64.2 62.6 63.2 59.4Z',
			chiliCrease
		)}
		{@render piece(
			'calyx',
			'M54.6 53.4C55.4 51.4 56.8 50.4 58.4 50C58.8 49 60 48.4 61.2 48.6C62.4 48.4 63.8 49 64.4 50.2C66 50.6 67.2 51.8 67.4 53.4C66 52.6 64.8 52.6 63.8 53.4C62.8 52.6 61.6 52.4 60.6 53.2C59.4 52.4 58.2 52.6 57.2 53.6C56.4 53 55.4 53 54.6 53.4Z',
			'leaf',
			'M52 52.4C56 51.6 62 51.4 68 52.4L68 54L52 54Z',
			'M57.6 51C58.6 50.2 60 49.8 61.4 49.8C60.2 50.4 59.2 51 58.4 51.6Z'
		)}
	{:else if artId === 'star-glasses'}
		{@render cord('M36 43.4C34.4 42.2 33 41.2 31.6 40.4', 'cord-gold')}
		{@render cord('M84 43.4C85.6 42.2 87 41.2 88.4 40.4', 'cord-gold')}
		{#each STAR_FRAMES as frame (frame.x)}
			{@const x = frame.x}
			<circle class="glass" cx={x} cy={EYE_Y} r="7.2" />
			<path
				class="open shine"
				d="M{x - 3.8} {EYE_Y + 1.4}L{x + 1} {EYE_Y - 4}M{x + 0.8} {EYE_Y + 3.4}L{x + 3.6} {EYE_Y +
					0.2}"
			/>
			{@render piece(
				`star-${x}`,
				frame.d,
				'gold',
				outside(x - 1.6, EYE_Y - 1.8, 13.2),
				outside(x + 1.2, EYE_Y + 1.4, 13.4)
			)}
			<circle class="jewel line" cx={x} cy={EYE_Y - 10.6} r="1.4" />
		{/each}
		{@render cord('M58.4 44.8C59.4 43.6 60.6 43.6 61.6 44.8', 'cord-gold')}
	{:else if artId === 'aviator-goggles'}
		{#snippet strapSeams()}<path class="open seam" d={GOGGLE_STRAP_SEAMS} />{/snippet}
		{@render piece(
			'goggle-strap',
			GOGGLE_STRAP,
			'leather',
			'M28 47C44 45.6 76 45.6 92 47L92 54L28 54Z',
			'M33 41.4C44 39.8 76 39.8 87 41.4L87 42.2C76 40.6 44 40.6 33 42.2Z',
			strapSeams
		)}
		{@render piece(
			'goggle-bridge',
			'M57.6 44C59.2 43.2 60.8 43.2 62.4 44L62.4 48.2C60.8 49 59.2 49 57.6 48.2Z',
			'metal',
			'M56 46.6L64 46.6L64 50L56 50Z'
		)}
		{#each EYES_X as x (x)}
			{@render piece(
				`cushion-${x}`,
				ring(x, EYE_Y, 11.6, 9.6),
				'leather',
				outside(x - 1.4, EYE_Y - 1.4, 11.2)
			)}
			<circle class="glass" cx={x} cy={EYE_Y} r="8.2" />
			<path
				class="open shine"
				d="M{x - 4.4} {EYE_Y - 1}C{x - 4} {EYE_Y - 3.4} {x - 2.4} {EYE_Y - 4.8} {x - 0.4} {EYE_Y -
					5}M{x + 3} {EYE_Y + 3.4}L{x + 4.4} {EYE_Y + 2}"
			/>
			{@render piece(
				`rim-${x}`,
				ring(x, EYE_Y, 10.2, 8.2),
				'metal',
				outside(x - 1, EYE_Y - 1, 10),
				outside(x + 0.9, EYE_Y + 0.9, 10.2)
			)}
		{/each}
		<path class="metal line thin" d={GOGGLE_RIVETS} />
	{:else if artId === 'crown'}
		{@render piece(
			'velvet',
			'M42.4 22C42 12 50 8.6 60 8.6C70 8.6 78 12 77.6 22Z',
			'red',
			'M64 6C72 10 76 16 76 24L80 24L80 6Z',
			'M47 14C49.6 11.6 53.6 10.4 57.6 10.2C54 11.2 50.6 12.8 48.4 15Z'
		)}
		{@render piece(
			'crown',
			'M41 27C40.4 21 39.6 15 38.8 9.6C42.6 13.4 45.4 16.4 47.6 19.4C48.8 16 50 13 51.4 10.4C53.4 14 55 17.2 56 19.8C57.2 14.6 58.6 9.6 60 5C61.4 9.6 62.8 14.6 64 19.8C65 17.2 66.6 14 68.6 10.4C70 13 71.2 16 72.4 19.4C74.6 16.4 77.4 13.4 81.2 9.6C80.4 15 79.6 21 79 27C66 24.4 54 24.4 41 27Z',
			'gold',
			'M62 4C68 12 70 20 69 30L86 30L86 4Z',
			'M40.6 12.6C41.8 15.4 42.6 18.2 43 21.4L41.8 21.8C41.4 18.6 41 15.6 40.6 12.6ZM59.4 9.2C58.8 12.6 58.2 16 57.8 19.4L57 19.6C57.4 16 58.2 12.6 59.4 9.2ZM51.2 13.4C50.6 15.6 50 17.6 49.6 20L48.8 20.2C49.4 17.8 50.2 15.6 51.2 13.4Z'
		)}
		{#each [[38.8, 9.6, 2.2], [51.4, 10.4, 1.9], [68.6, 10.4, 1.9], [81.2, 9.6, 2.2]] as [x, y, r] (x)}
			{@render piece(
				`pearl-${x}`,
				circlePath(x ?? 0, y ?? 0, r ?? 0),
				'cream',
				outside((x ?? 0) - 0.7, (y ?? 0) - 0.7, r ?? 0),
				outside((x ?? 0) + 0.8, (y ?? 0) + 0.8, r ?? 0)
			)}
		{/each}
		{@render piece(
			'crown-top-gem',
			circlePath(60, 5, 2.6),
			'jewel',
			outside(59.2, 4.2, 2.6),
			outside(61, 6, 2.6)
		)}
		{#snippet bandEngraving()}
			<path
				class="open fine"
				d="M43 25.2C48 26.6 52 27.4 55.6 27.6M64.4 27.6C68 27.4 72 26.6 77 25.2"
			/>
		{/snippet}
		{@render piece(
			'crown-band',
			'M40.6 20.6C53 23.2 67 23.2 79.4 20.6L79.2 26.6C67 29.6 53 29.6 40.8 26.6Z',
			'gold',
			'M38 25.4C52 28.4 68 28.4 82 25.4L82 32L38 32ZM70 18L82 18L82 32L72 32Z',
			'M41 21.4C53 24 67 24 79 21.4L79 22.4C67 25 53 25 41 22.4Z',
			bandEngraving
		)}
		{@render piece(
			'gem-center',
			'M60 23.4C62 23.4 63 24.6 63 26C63 27.4 62 28.6 60 28.6C58 28.6 57 27.4 57 26C57 24.6 58 23.4 60 23.4Z',
			'jewel',
			outside(59.4, 25.4, 2.8),
			'M58.2 25.4C58.4 24.6 59 24.2 59.8 24.2C59.4 24.6 59 25 58.8 25.6Z'
		)}
		{@render piece(
			'gem-left',
			circlePath(48.6, 25.4, 1.6),
			'blue',
			outside(48.1, 24.9, 1.6),
			outside(49.2, 26, 1.6)
		)}
		{@render piece(
			'gem-right',
			circlePath(71.4, 25.4, 1.6),
			'blue',
			outside(70.9, 24.9, 1.6),
			outside(72, 26, 1.6)
		)}
	{:else if artId === 'chef-hat'}
		{#snippet pleats()}
			<path
				class="open fine"
				d="M44 15L43 34M49.4 15L48.8 34M54.8 15L54.6 34M60 15L60 34M65.2 15L65.4 34M70.6 15L71.2 34M76 15L77 34"
			/>
		{/snippet}
		{@render piece(
			'toque-band',
			'M39.6 19.6C52 17 68 17 80.4 19.6L81.6 30.6C68 33.6 52 33.6 38.4 30.6Z',
			'cream',
			'M30 15C50 21 70 21 90 15L90 23C70 25 50 25 30 23ZM72 14C75 20 76 28 74 36L90 36L90 14Z',
			'M40.8 24C41 26 41 28 40.6 30L41.6 30.2C42 28.2 42 26 41.8 24Z',
			pleats
		)}
		{#snippet creases()}
			<path
				class="open fine"
				d="M47.2 4C46 8 46.6 12 48.6 15M61.6 2.6C60.6 6.6 61 10.6 62.6 13.6M74.4 4.6C74.6 8 73.8 11 72 13.6M33 9.6C35 11.6 37.8 12.4 40.6 12.2M86.4 12.4C84 14 81.4 14.4 79 14"
			/>
		{/snippet}
		{@render piece(
			'toque-puff',
			'M40.4 21.6C30.4 22.4 27 13.4 33 9.6C34 3.6 42 1 47.2 4C50.4 0.6 58 -0.2 61.6 2.6C65.4 0.2 72.4 1 74.4 4.6C80.6 2.6 87.6 6.6 86.4 12.4C92 15.8 89.2 23 79.6 21.6C67 19.8 53 19.8 40.4 21.6Z',
			'cream',
			'M28 16C45 21 75 21 92 14L92 24L28 24ZM80 2C88 8 88 16 84 22L94 22L94 2Z',
			'M35.6 8.6C36.8 5 40.6 3.4 44 4C40.8 4.8 38.4 6.6 37.2 9.4ZM50.6 3.4C53.4 1.8 57 1.6 59.6 2.4C56.6 2.6 54 3.4 52 4.8Z',
			creases
		)}
	{:else if artId === 'yak-beanie'}
		{#snippet beanieKnit()}
			<path class="wool-light" d={BEANIE_DIAMONDS} />
			<path class="open fine" d={BEANIE_KNIT} />
		{/snippet}
		{@render piece(
			'beanie',
			BEANIE,
			'wool',
			'M70 4C82 12 86 22 84 34L92 34L92 4ZM28 28C48 24 72 24 92 28L92 34L28 34Z',
			'M38.6 16C42 11.6 47.6 9 53.4 8.4C48 10 43.6 12.6 40.6 16.8Z',
			beanieKnit
		)}
		{#snippet cuffRibs()}<path class="open fine" d={CUFF_RIBS} />{/snippet}
		{@render piece(
			'beanie-cuff',
			BEANIE_CUFF,
			'wool-light',
			'M26 36C48 31.4 72 31.4 94 36L94 42L26 42ZM80 24L94 24L94 42L84 42Z',
			'M29 31.2C48 26 72 26 91 31.2L91 32.2C72 27 48 27 29 32.2Z',
			cuffRibs
		)}
		{#snippet fibres()}<path class="open fine" d={POMPOM_FIBRES} />{/snippet}
		{@render piece(
			'pompom',
			POMPOM,
			'wool-light',
			outside(58.8, 6.2, 6.2),
			outside(61.4, 8.8, 6.6),
			fibres
		)}
	{:else if artId === 'astronaut-helmet'}
		<circle class="glass" cx="60" cy="45" r="35" />
		<clipPath id="{uid}-bubble"><circle cx="60" cy="45" r="35" /></clipPath>
		<g clip-path="url(#{uid}-bubble)">
			<path class="shade" fill-rule="evenodd" d={outside(56, 41, 35)} />
			<path
				class="light"
				d="M31 40C31 25 42 14.6 56 12.8C46 17.4 38.4 26 36.6 40.6C36.4 42.4 31.2 42.4 31 40Z"
			/>
			<path class="light" d="M76.6 20.6C78.6 20.4 81 21.6 82 23.4C81 24 78 22.8 76.6 20.6Z" />
		</g>
		<path class="open shine-thin" d="M70 13.4C80 16 88 24 91.4 34" />
		<path class="line open" d={circlePath(60, 45, 35)} />
		{@render cord('M99.4 39L99.4 24.6', 'cord-metal')}
		{@render piece(
			'antenna-ball',
			circlePath(99.4, 22.4, 2.4),
			'jewel',
			outside(98.6, 21.6, 2.4),
			outside(100.2, 23.2, 2.4)
		)}
		{#each ['left', 'right'] as side (side)}
			<g transform={side === 'right' ? MIRROR : undefined}>
				{@render piece(
					`${side}-ear`,
					EAR_MODULE,
					'metal',
					'M23.6 36L30 36L30 56L23.6 56ZM16 51.4L30 51.4L30 56L16 56Z',
					'M19 42C19 40.6 19.8 39.8 21 39.8L22 39.8C21 40.4 20.4 41.2 20.2 42.4L20.2 50L19 50Z'
				)}
				<path class="open fine" d="M19.6 44.4L24.6 44.4M19.6 46.6L24.6 46.6M19.6 48.8L24.6 48.8" />
			</g>
		{/each}
		{#snippet collarRivets()}
			{#each HELMET_RIVETS as [x, y] (x)}
				<circle class="metal" cx={x} cy={y} r="1.2" />
				<circle class="light" cx={x - 0.4} cy={y - 0.4} r="0.5" />
			{/each}
		{/snippet}
		{@render piece(
			'helmet-collar',
			HELMET_COLLAR,
			'metal',
			'M24 80C36 90 84 90 96 80L96 92L24 92ZM84 68L96 68L96 92L86 92Z',
			'M29.4 71.6C39 80.6 81 80.6 90.6 71.6L91 72.6C81 82 39 82 29 72.6Z',
			collarRivets
		)}
		<path
			class="open line thin"
			d={HELMET_RIVETS.map(([x, y]) => circlePath(x, y, 1.2)).join('')}
		/>
	{:else if artId === 'train-cap'}
		{#snippet capStripes()}
			<path class="open stripe-thin" d={CAP_STRIPES} />
			<path class="open fine" d="M36.4 12.2C46 14.6 74 14.6 83.6 12.2" />
		{/snippet}
		{@render piece(
			'cap-crown',
			CAP_CROWN,
			'blue',
			'M74 6C84 12 88 20 86 32L92 32L92 6ZM30 24C48 21.4 72 21.4 90 24L90 32L30 32Z',
			'M33.6 22C33.2 18.6 34.2 15.4 37 13.4C40 11.6 44 10.6 48 10.2C43 11.6 39 13.4 37 15.6C35.4 17.6 34.8 19.8 34.8 22Z',
			capStripes
		)}
		{@render piece(
			'cap-button',
			circlePath(60, 9.6, 1.8),
			'blue',
			outside(59.4, 9, 1.8),
			outside(60.6, 10.2, 1.8)
		)}
		{@render piece(
			'cap-band',
			'M32.6 24.6C48 21.4 72 21.4 87.4 24.6L87 30.4C72 27.6 48 27.6 33 30.4Z',
			'ink',
			'',
			'M34 25.2C48 22.4 72 22.4 86 25.2L86 25.8C72 23 48 23 34 25.8Z'
		)}
		{@render cord('M34.4 27.4C48 24.6 72 24.6 85.6 27.4', 'cord-gold')}
		<circle class="gold line" cx="34.4" cy="27.4" r="1.6" />
		<circle class="gold line" cx="85.6" cy="27.4" r="1.6" />
		{#each ['left', 'right'] as side (side)}
			<g transform={side === 'right' ? MIRROR : undefined}>
				{@render piece(
					`${side}-wing`,
					'M56.6 24C53.6 21.8 49.6 21.2 46.4 22C48.4 22.8 49.4 23.4 50.2 24.2C48.8 24.4 47.6 24.8 46.8 25.4C49.8 26.4 53.6 26.2 56.6 25.6Z',
					'gold',
					'M44 24.8C48 25.6 52 25.6 58 25L58 28L44 28Z'
				)}
				<path class="open fine" d="M55 24.2C53 23.4 51 23 49 23" />
			</g>
		{/each}
		{@render piece(
			'wheel',
			circlePath(60, 24.6, 3.6),
			'gold',
			outside(59.2, 23.8, 3.6),
			outside(60.8, 25.4, 3.6)
		)}
		<path class="open line thin" d={WHEEL_SPOKES} />
		<circle class="ink" cx="60" cy="24.6" r="1" />
		{#snippet visorSeams()}<path class="open fine light-line" d={VISOR_SEAMS} />{/snippet}
		{@render piece(
			'visor',
			VISOR,
			'ink',
			'',
			'M38 31.6C44 33.6 52 34.4 60 34.6C52 35.6 44 35 38.6 33.2Z',
			visorSeams
		)}
	{:else if artId === 'magnifier' || artId === 'ladle-mic' || artId === 'bulb-horn'}
		<g transform="translate({grip.x} {grip.y}) {HAND_TILT}">
			{#if artId === 'magnifier'}
				{#snippet grooves()}<path
						class="open fine"
						d="M-2.4 1.6Q0 2.3 2.4 1.6M-2.4 3Q0 3.7 2.4 3"
					/>{/snippet}
				{@render piece(
					'handle',
					'M-2.3 4.2C-2.6 0 -2.3 -5 -1.9 -10.4L1.9 -10.4C2.3 -5 2.6 0 2.3 4.2C2.2 5.6 -2.2 5.6 -2.3 4.2Z',
					'leather',
					'M0.6 -12C1 -4 1.2 2 0.8 6L4 6L4 -12Z',
					'M-1.5 -9C-1.7 -4 -1.8 0 -1.6 3.6C-1.3 3.8 -1 3.7 -1 3.4C-1.1 0 -1 -4 -0.9 -9Z',
					grooves
				)}
				{#snippet ferruleRidge()}<path
						class="open fine"
						d="M-2.4 -12.6Q0 -12 2.4 -12.6"
					/>{/snippet}
				{@render piece(
					'ferrule',
					'M-2.1 -10C-0.9 -9.4 0.9 -9.4 2.1 -10L2.6 -15.4C1 -16 -1 -16 -2.6 -15.4Z',
					'gold',
					'M0.8 -17L4 -17L4 -9L0.6 -9Z',
					'M-1.8 -10.6L-2.2 -14.8L-1.4 -15L-1 -10.6Z',
					ferruleRidge
				)}
				<circle class="glass" cx="0" cy="-25" r="6.8" />
				<path class="shade" d="M-6.8 -24C-5 -19 5 -19 6.8 -24C6 -18.6 -6 -18.6 -6.8 -24Z" />
				<path
					class="open shine"
					d="M-4.2 -26.2C-3.8 -28.8 -1.8 -30.4 0.6 -30.6M3.6 -22.4C3.2 -21.4 2.4 -20.6 1.6 -20.2"
				/>
				{@render piece(
					'lens-rim',
					ring(0, -25, 9, 6.8),
					'metal',
					'M-10 -25C-6 -19.4 6 -19.4 10 -25L10 -14L-10 -14Z',
					'M-7.4 -28C-5.6 -32.4 -1.6 -34 2 -33.6C-1.6 -33 -4.6 -31 -6 -27.6Z'
				)}
			{:else if artId === 'ladle-mic'}
				{#snippet handleHole()}<path
						class="fine open"
						d="M-0.7 4.6a0.7 0.7 0 1 0 1.4 0a0.7 0.7 0 1 0 -1.4 0Z"
					/>{/snippet}
				{@render piece(
					'ladle-handle',
					'M-1.5 5.4C-1.7 0 -1.4 -8 -1.1 -15.4L1.1 -15.4C1.4 -8 1.7 0 1.5 5.4C1.4 7 -1.4 7 -1.5 5.4Z' +
						circlePath(0, 4.4, 0.7, 1),
					'metal',
					'M0.4 -16C0.6 -8 0.8 0 0.6 8L3 8L3 -16Z',
					'M-0.9 -14C-1.1 -8 -1.2 -2 -1 2L-0.5 2C-0.6 -2 -0.5 -8 -0.4 -14Z',
					handleHole
				)}
				{#snippet tapeWraps()}<path
						class="open fine"
						d="M-2 -1.6L2 -0.4M-2 -3.6L2 -2.4M-2 -5.6L2 -4.4M-2 -7.6L2 -6.4"
					/>{/snippet}
				{@render piece(
					'tape',
					'M-2 -0.4C-1.9 -3 -1.8 -5.6 -1.7 -8.2L1.7 -8.2C1.8 -5.6 1.9 -3 2 -0.4Z',
					'red',
					'M0.6 -9L3 -9L3 0L0.8 0Z',
					'M-1.4 -1C-1.4 -3 -1.3 -5 -1.2 -7.4L-0.7 -7.4C-0.8 -5 -0.9 -3 -0.9 -1Z',
					tapeWraps
				)}
				{#snippet mesh()}<path class="open mesh" d={MIC_MESH} />{/snippet}
				{@render piece(
					'mic-head',
					circlePath(0, -26, 7),
					'ink',
					'',
					'M-5 -27.6C-4.4 -30.6 -2 -32.4 0.6 -32.6C-1.6 -31.4 -3.4 -29.6 -4 -27.4Z',
					mesh
				)}
				{@render piece(
					'ladle-bowl',
					'M-8.6 -24.4C-8.4 -18 -4.6 -14.6 0 -14.6C4.6 -14.6 8.4 -18 8.6 -24.4C5 -21.8 -5 -21.8 -8.6 -24.4Z',
					'metal',
					'M2 -24C6 -20 6 -16 3 -13L10 -13L10 -24ZM-10 -17C-4 -14 4 -14 10 -17L10 -13L-10 -13Z',
					'M-7.4 -22.8C-4 -21 4 -21 7.4 -22.8L7.2 -21.8C4 -20 -4 -20 -7.2 -21.8Z'
				)}
			{:else}
				{#snippet bellRim()}<path
						class="open fine"
						d="M-6.4 -28.6C-3 -29.6 3 -29.6 6.4 -28.6"
					/>{/snippet}
				{@render piece(
					'bell',
					'M-2 -21C-3.4 -25.4 -6 -28.6 -7.4 -30.6C-4.6 -32.6 4.6 -32.6 7.4 -30.6C6 -28.6 3.4 -25.4 2 -21Z',
					'gold',
					'M1 -34C3 -28 2 -24 0.8 -20L10 -20L10 -34Z',
					'M-5.4 -29.8C-4 -28 -2.6 -25.6 -1.6 -22.6L-1 -22.6C-1.8 -25.8 -3 -28.4 -4.4 -30.4Z',
					bellRim
				)}
				{@render piece(
					'bell-mouth',
					'M-7.4 -31.2C-7.4 -32.4 -4 -33.4 0 -33.4C4 -33.4 7.4 -32.4 7.4 -31.2C7.4 -30 4 -29 0 -29C-4 -29 -7.4 -30 -7.4 -31.2Z',
					'gold'
				)}
				<path
					class="ink"
					d="M-5.8 -31.2C-5.8 -32 -3.2 -32.6 0 -32.6C3.2 -32.6 5.8 -32 5.8 -31.2C5.8 -30.4 3.2 -29.8 0 -29.8C-3.2 -29.8 -5.8 -30.4 -5.8 -31.2Z"
				/>
				{@render piece(
					'horn-tube',
					'M-1.3 -9.4C-1.4 -14 -1.6 -18 -2 -21.4L2 -21.4C1.6 -18 1.4 -14 1.3 -9.4Z',
					'gold',
					'M0.5 -22L3 -22L3 -9L0.5 -9Z',
					'M-1.1 -11C-1.2 -14 -1.3 -17 -1.5 -20L-0.9 -20C-0.8 -17 -0.7 -14 -0.6 -11Z'
				)}
				{#snippet collarRidge()}<path class="open fine" d="M-2.6 -7.4Q0 -6.8 2.6 -7.4" />{/snippet}
				{@render piece(
					'horn-collar',
					'M-2.8 -5.4C-1 -4.8 1 -4.8 2.8 -5.4L2.4 -9.6C0.8 -10.2 -0.8 -10.2 -2.4 -9.6Z',
					'gold',
					'M1 -11L4 -11L4 -4L1 -4Z',
					'',
					collarRidge
				)}
				{#snippet wrinkles()}
					<path
						class="open fine"
						d="M-2.6 -5.2C-2 -4.2 -1 -3.6 0 -3.6M2.6 -5.2C2 -4.2 1 -3.6 0 -3.6"
					/>
				{/snippet}
				{@render piece(
					'bulb',
					'M0 -6.2C4.4 -6.4 7.4 -3.4 7.4 0.8C7.4 5 4.2 7.6 0 7.6C-4.2 7.6 -7.4 5 -7.4 0.8C-7.4 -3.4 -4.4 -6.4 0 -6.2Z',
					'red',
					outside(-1.4, -0.4, 7.2),
					'M-4.6 -1.6C-4.4 -3.6 -2.6 -4.8 -0.8 -4.8C-2 -4 -3.2 -2.8 -3.6 -1.2C-3.8 -0.6 -4.6 -0.8 -4.6 -1.6Z',
					wrinkles
				)}
			{/if}
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

	.shade {
		fill: var(--dd-color-companion-shade);
		fill-opacity: var(--dd-opacity-companion-shade);
	}

	.light {
		fill: var(--dd-color-companion-light);
		fill-opacity: var(--dd-opacity-companion-light);
	}

	.fine,
	.seam,
	.shine,
	.shine-thin,
	.stripe-thin,
	.weave,
	.mesh,
	.lace,
	.cord,
	.cord-outline,
	.coil-dim,
	.cord-gold-line {
		stroke-linecap: round;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	/* Stitches, knit, folds: a fine shadowed line. */
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
		stroke-width: var(--dd-border-width-thick);
	}

	.shine-thin {
		stroke: var(--dd-color-companion-light);
		stroke-opacity: var(--dd-opacity-companion-light);
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

	.mesh {
		stroke: var(--dd-color-wear-metal);
		stroke-width: var(--dd-border-width-thin);
	}

	.lace {
		stroke: var(--dd-color-wear-cream);
		stroke-width: var(--dd-border-width-thick);
	}

	.cord-outline {
		stroke: var(--dd-color-companion-line);
		stroke-width: var(--dd-border-width-drawing-bold);
	}

	.cord {
		stroke-width: var(--dd-border-width-thick);
	}

	.cord-twig {
		stroke: var(--dd-color-wear-twig);
	}

	.cord-metal {
		stroke: var(--dd-color-wear-metal);
	}

	.cord-gold {
		stroke: var(--dd-color-wear-gold);
	}

	.cord-rubber {
		stroke: var(--dd-color-wear-rubber);
	}

	.cord-gold-line {
		stroke: var(--dd-color-wear-gold);
		stroke-width: var(--dd-border-width-thick);
	}

	.coil-dim {
		stroke: var(--dd-color-companion-shade);
		stroke-opacity: var(--dd-opacity-companion-light);
		stroke-width: var(--dd-border-width-thick);
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
		opacity: var(--dd-opacity-glass);
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

	:global([data-silhouette]) .item :not(.open) {
		fill: var(--dd-color-silhouette);
	}

	:global([data-silhouette]) .item * {
		stroke: var(--dd-color-silhouette);
	}

	:global([data-silhouette]) .item .glass {
		opacity: 100%;
	}
</style>
