<script lang="ts" module>
	export type GhostPose = 'run' | 'wait' | 'clap' | 'wave' | 'bow' | 'dance';
</script>

<script lang="ts">
	import { companionAppearance } from '$lib/ui/companion/appearance';
	import { capsulePath, ovalPath } from '$lib/ui/companion/geometry';

	interface Props {
		pose: GhostPose;
	}

	type XY = readonly [number, number];
	/** A cubic curve: both handles, then where it ends. */
	type Curve = readonly [number, number, number, number, number, number];

	interface Shape {
		/** The sheet as it hangs in this pose. */
		sheet: string;
		/** How far the head (and the top of the sheet) sinks: it is lower when sitting. */
		sink: number;
		/** Where each foot is moved from its place under the companion. */
		feet: readonly [XY, XY];
		tail: XY;
		/** Where the pupils look, from the middle of the eye. */
		look: XY;
		/** `smile`: the cheeks push the lower lids up. */
		eyes: 'open' | 'smile';
	}

	let { pose }: Props = $props();

	const uid = $props.id();
	const appearance = companionAppearance();
	const color = $derived(appearance().colorId);

	const MIDDLE = 60;
	/** Larger than the view box: a shade is this frame with the form cut out, moved up and left. */
	const FRAME = 'M-60 -60L180 -60L180 180L-60 180Z';

	function round(value: number): number {
		const rounded = Math.round(value * 100) / 100;
		return Object.is(rounded, -0) ? 0 : rounded;
	}

	function at(x: number, y: number): string {
		return `${round(x)} ${round(y)}`;
	}

	/** The same path seen in a mirror at the middle: every path here is written in x y pairs. */
	function mirror(d: string): string {
		return d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) =>
			at(2 * MIDDLE - Number(x), Number(y))
		);
	}

	function shift(d: string, dx: number, dy: number): string {
		return d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) =>
			at(Number(x) + dx, Number(y) + dy)
		);
	}

	/*
	 * The top of the sheet, from the left shoulder to the top of the middle plate: it rounds over the
	 * tips of the plates and sags a little between them, as cloth stretched over them does.
	 */
	const DOME_START: XY = [27, 50];
	const DOME_LEFT: readonly Curve[] = [
		[27.3, 45, 25.4, 36, 25.6, 32.5],
		[25.8, 30, 27.6, 28.6, 29.2, 27.4],
		[31.4, 25.8, 34.6, 22, 36.8, 17.4],
		[38, 15.4, 39.6, 13.6, 41.6, 13.2],
		[45.6, 12.6, 51, 9.6, 54.8, 6.6],
		[56.6, 5.2, 58.4, 4.6, MIDDLE, 4.6]
	];

	/** The dome from the left shoulder over the head to the right one, without its first move. */
	function domeCurves(): string {
		const left = DOME_LEFT.map((c) => `C${at(c[0], c[1])} ${at(c[2], c[3])} ${at(c[4], c[5])}`);
		const ends: XY[] = [DOME_START, ...DOME_LEFT.map((c): XY => [c[4], c[5]])];
		const right = DOME_LEFT.map((_, i) => {
			const c = DOME_LEFT[DOME_LEFT.length - 1 - i] as Curve;
			const end = ends[DOME_LEFT.length - 1 - i] as XY;
			return `C${at(2 * MIDDLE - c[2], c[3])} ${at(2 * MIDDLE - c[0], c[1])} ${at(2 * MIDDLE - end[0], end[1])}`;
		});
		return left.join('') + right.join('');
	}

	const DOME = domeCurves();

	/**
	 * A hem from `from` to `to` (the current point is `from`): `lobes` waves hanging `amp` below and
	 * above a line that sags by `sag` in its middle, each wave leaving and reaching it level.
	 */
	function hem(from: XY, to: XY, lobes: number, amp: number, sag: number): string {
		const n = lobes * 2;
		const points = Array.from({ length: n + 1 }, (_, i): XY => {
			const t = i / n;
			const wave = i === 0 || i === n ? 0 : i % 2 === 1 ? amp : -amp;
			return [
				from[0] + (to[0] - from[0]) * t,
				from[1] + (to[1] - from[1]) * t + sag * 4 * t * (1 - t) + wave
			];
		});
		const hx = ((to[0] - from[0]) / n) * 0.45;
		const hy = ((to[1] - from[1]) / n) * 0.45;
		return points
			.slice(1)
			.map((p, i) => {
				const q = points[i] as XY;
				return `C${at(q[0] + hx, q[1] + hy)} ${at(p[0] - hx, p[1] - hy)} ${at(p[0], p[1])}`;
			})
			.join('');
	}

	const START = `M${at(...DOME_START)}`;

	/** Standing or floating: it falls straight from the shoulders and flares a little. */
	const SHEET_STAND =
		START +
		DOME +
		'C93.8 64 97.6 82 100.5 97' +
		hem([100.5, 97], [19.5, 97], 5, 2, 3.5) +
		'C22.4 82 26.2 64 27 50Z';

	/** Its right hand lifts the corner of the sheet: the hem rises from the middle to the hand. */
	const SHEET_WAVE =
		START +
		DOME +
		'C93.6 58 95 67 96.6 75' +
		hem([96.6, 75], [60, 101.8], 2, 1.4, 3) +
		hem([60, 101.8], [19.5, 97], 2, 2, 1.6) +
		'C22.4 82 26.2 64 27 50Z';
	/** The lifted corner, like a sleeve of cloth up to the hand, which turns about its root. */
	const WAVE_ARM =
		'M86.6 52C93 50.4 99.6 46.4 103.4 41.4C105.2 38.4 109.4 36.8 111.6 39.4C113.6 41.8 112.6 45.4 110 46.8C107.6 56 103.4 67.6 97.4 77.4L88.4 72Z';
	const WAVE_ARM_LINES =
		'M106.2 46.6C107.4 45.6 107.8 44.2 107.6 42.8M104.4 48.4C101 58 97.6 64 94 69.4';

	/** A curtsy: both hands hold the corners out and the hem hangs between them. */
	const SHEET_BOW =
		START +
		DOME +
		'C95.6 62 103.4 75.6 108 82.6C110 84.4 112.8 87.6 111.4 90.6C110.2 92.8 107.2 93.2 105.4 91.8' +
		hem([105.4, 91.8], [14.6, 91.8], 6, 1.8, 11) +
		'C12.8 93.2 9.8 92.8 8.6 90.6C7.2 87.6 10 84.4 12 82.6C16.6 75.6 24.4 62 27 50Z';
	const BOW_HANDS =
		'M107.2 85.6C108.6 86.6 109.4 88 109.2 89.4M12.8 85.6C11.4 86.6 10.6 88 10.8 89.4';

	/** Sitting: lower, and the sheet spreads on the ground around it. */
	const SIT = 6;
	const SHEET_SIT =
		shift(START + DOME, 0, SIT) +
		'C94.6 72 101 94 108 105.6' +
		hem([108, 105.6], [12, 105.6], 6, 1.4, 2.6) +
		'C19 94 25.4 72 27 56Z';

	const STANDING = {
		sheet: SHEET_STAND,
		sink: 0,
		feet: [
			[0, 0],
			[0, 0]
		],
		tail: [0, 0]
	} as const;

	const SHAPES: Readonly<Record<GhostPose, Shape>> = {
		run: { ...STANDING, look: [1.8, 0.4], eyes: 'open' },
		wait: {
			sheet: SHEET_SIT,
			sink: SIT,
			feet: [
				[-9, 6],
				[9, 6]
			],
			tail: [4, 6],
			look: [-2, 0.6],
			eyes: 'open'
		},
		clap: { ...STANDING, look: [0, -1.4], eyes: 'smile' },
		wave: { ...STANDING, sheet: SHEET_WAVE, look: [-1.2, -0.4], eyes: 'smile' },
		bow: { ...STANDING, sheet: SHEET_BOW, look: [0, 0.8], eyes: 'smile' },
		dance: { ...STANDING, look: [-1, -1.4], eyes: 'open' }
	};

	/** Folds of the sheet: down from the shoulders and from under the head to the hem. */
	const FOLDS_STAND =
		'M32.4 76C33.6 84 34.6 91.6 35.6 97.4M50.6 84.6C51.4 89.6 51.8 94 51.9 98.2M69.4 84.6C68.6 89.6 68.2 94 68.1 98.2M87.6 76C86.4 84 85.4 91.6 84.4 97.4';
	const FOLD_SHADES_STAND =
		'M33.6 80C35.4 86.4 36.6 92.4 37.4 98C36.2 98.4 35.4 98 35 97C34.2 91.4 33.4 85.4 32.6 79.4ZM70 86C69.6 90.4 69.8 94.6 70.4 98.2C69.6 98.8 68.6 98.6 68.2 98C67.8 94 68 89.8 69 85.4ZM88.4 78C87.8 85.4 87.4 92 87.4 97C86.4 97.6 85.4 97.4 85 96.6C85.4 90.6 86.2 84 87.4 77.4Z';
	const FOLDS_SIT =
		'M30 84C26.6 92 22.6 99 18.6 104.6M44 88C42.4 95 40.8 100.6 39.6 105M76 88C77.6 95 79.2 100.6 80.4 105M90 84C93.4 92 97.4 99 101.4 104.6';
	const FOLDS_BOW =
		'M30.4 70C25.6 76.6 20 82.4 13.6 86.4M89.6 70C94.4 76.6 100 82.4 106.4 86.4M44 84C42.6 89.6 41.6 95 41.2 99.6M76 84C77.4 89.6 78.4 95 78.8 99.6';
	const FOLDS_WAVE =
		'M32.4 76C33.6 84 34.6 91.6 35.6 97.4M50.6 84.6C51.4 89.6 51.8 94 51.9 98.2M74 76C79 71 84 66.6 90 62';

	/** The cloth over the head: the round of the snout, the shade it casts like a smile, the chin. */
	const SNOUT = 'M45.5 60C48.6 55 54 52.6 60 52.6C66 52.6 71.4 55 74.5 60';
	const SMILE_SHADE = 'M46 63.4C52 69.4 68 69.4 74 63.4C69.6 72.2 50.4 72.2 46 63.4Z';
	const CHIN = 'M35.4 70.6C42 79.4 78 79.4 84.6 70.6';
	const CHIN_SHADE = 'M37 72C44 80.4 76 80.4 83 72C78.6 85.4 41.4 85.4 37 72Z';
	/** Little creases where the cloth is pulled over the tips of the plates. */
	const CREASES =
		'M60 8.6C60.8 11.6 60.8 14.6 60 17.4M41.6 16.8C43 18.6 43.8 20.6 44 22.8M78.4 16.8C77 18.6 76.2 20.6 76 22.8M29.6 31.4C31.4 32.2 32.8 33.6 33.6 35.4M90.4 31.4C88.6 32.2 87.2 33.6 86.4 35.4';

	const EYES: readonly XY[] = [
		[48, 46],
		[72, 46]
	];
	const HOLE: XY = [8.2, 9.6];
	/** Around the middle of the eye: the cheek pushed up by a smile. */
	const SMILE_LID = 'M-9 11H9V5.2Q0 -0.6 -9 5.2Z';
	const SMILE_LID_LINE = 'M-9 5.2Q0 -0.6 9 5.2';

	/** From the companion (ADR-044): its feet and the end of its tail come out under the sheet. */
	const FOOT =
		'M32.6 106.5C32 101.5 37 100 44 100C51 100 56 101.5 55.4 106.5C55.8 110.4 54.4 113 51.6 113.2C50.2 113.4 48.6 113 47.8 112.2C46.6 113.6 42.2 113.8 40.6 112.4C39.6 113.2 38 113.4 36.8 113.2C33.8 112.8 32.2 110.2 32.6 106.5Z';
	const TOES = 'M47.8 112.2C47.9 111 47.7 110 47.2 109M40.6 112.4C40.4 111.2 40.6 110.2 41 109.2';
	const CLAWS = [
		[36.6, 112.4],
		[44.2, 112.8],
		[51.6, 112.4]
	]
		.map(
			([x = 0, y = 0]) =>
				`M${at(x - 1.6, y)}C${at(x - 1.6, y - 1.4)} ${at(x - 0.8, y - 2)} ${at(x, y - 2)}C${at(x + 0.8, y - 2)} ${at(x + 1.6, y - 1.4)} ${at(x + 1.6, y)}C${at(x + 0.6, y + 0.6)} ${at(x - 0.6, y + 0.6)} ${at(x - 1.6, y)}Z`
		)
		.join('');
	const TAIL =
		'M84 100C95 103 105 99.5 109.5 90C112.6 83.4 112.6 75 109.6 68.6C108.8 67 106.8 67.4 106.8 69.2C107 76.4 104.6 83 99 86.4C94.6 89 89.4 89.4 85 88Z';
	const TAIL_LINE =
		'M84 100C95 103 105 99.5 109.5 90C112.6 83.4 112.6 75 109.6 68.6C108.8 67 106.8 67.4 106.8 69.2C107 76.4 104.6 83 99 86.4C94.6 89 89.4 89.4 85 88';
	const TAIL_PLATES = [
		{ x: 97.4, y: 87.2, angle: -28, h: 8, w: 3.8 },
		{ x: 104.4, y: 80, angle: -58, h: 6.2, w: 3 },
		{ x: 107.2, y: 72.6, angle: -76, h: 4.4, w: 2.2 }
	] as const;
	/** Seen under the lifted corner. */
	const BODY =
		'M60 54C76 54 86.5 62 90.5 74C94.5 86 96.5 97 91.5 104C86.5 110 74 110.5 60 110.5C46 110.5 33.5 110 28.5 104C23.5 97 25.5 86 29.5 74C33.5 62 44 54 60 54Z';
	const BELLY =
		'M60 69C70.5 69 78 77.5 79 88C80 98.5 72.5 106 60 106C47.5 106 40 98.5 41 88C42 77.5 49.5 69 60 69Z';
	const BELLY_BANDS = 'M36 87.5Q60 94.5 84 87.5M36 95Q60 101.5 84 95M36 102Q60 107.5 84 102';
	const THIGH = mirror(
		'M48 87C40.5 84.5 31.5 86 28 93C25 99.5 27.5 105 33 107L52.5 107C54 101 52.5 92 48 87Z'
	);
	const THIGH_LINE = mirror('M41.4 85.6C34.6 86 30 89 28 93C25 99.5 27.5 105 33 107');
	const THIGH_CREASE = mirror('M52.8 103.6C53 99.6 52 95.6 50 92.6');

	function platePath(h: number, w: number): string {
		return `M${-w} 1C${-w} ${round(-h * 0.5)} ${round(-w * 0.62)} ${round(-h * 0.94)} 0 ${-h}C${round(w * 0.62)} ${round(-h * 0.94)} ${w} ${round(-h * 0.5)} ${w} 1Z`;
	}

	/**
	 * Clapping, its arms lift the cloth like two sleeves, from the shoulders to the hands that meet
	 * in front of it; the outline leaves out the shoulder, where the sleeve comes out of the sheet.
	 */
	const CLAP_ARM_EDGE =
		'M27.6 62C30 72 38 82 46.6 85.4C49 88.6 55.6 89.6 58.4 86.4C60.6 83.6 59.6 79 56 77.6C50 75.6 42 72 36.6 66';
	const CLAP_ARM = `${CLAP_ARM_EDGE}L31 60Z`;
	const CLAP_FINGERS = 'M52.4 79.4C54.4 80.2 55.6 81.8 55.8 83.8';
	const CLAP_ARMS = [
		{ edge: CLAP_ARM_EDGE, fill: CLAP_ARM, fingers: CLAP_FINGERS },
		{ edge: mirror(CLAP_ARM_EDGE), fill: mirror(CLAP_ARM), fingers: mirror(CLAP_FINGERS) }
	];
	/** Sitting, its right arm brings the cookie up to its snout, under the cloth. */
	const COOKIE_ARM = {
		edge: shift(mirror(CLAP_ARM_EDGE), 0, SIT),
		fill: shift(mirror(CLAP_ARM), 0, SIT),
		fingers: shift(mirror(CLAP_FINGERS), 0, SIT)
	};
	/** The clap: short strokes around the hands, as they meet. */
	const CLAP_MARKS =
		capsulePath(60, 75, 60, 69.4, 1.1) +
		capsulePath(53.2, 75.8, 50.2, 71.4, 1.1) +
		capsulePath(66.8, 75.8, 69.8, 71.4, 1.1);

	/** A cookie with two bites out of it, held through the cloth up to the snout. */
	const COOKIE_AT: XY = [61, 80];
	const COOKIE_R = 9;
	function cookiePath(): string {
		const [cx, cy] = COOKIE_AT;
		const p = (deg: number) => {
			const a = (deg * Math.PI) / 180;
			return at(cx + COOKIE_R * Math.cos(a), cy + COOKIE_R * Math.sin(a));
		};
		return `M${p(-80)}A${COOKIE_R} ${COOKIE_R} 0 1 1 ${p(-150)}A3.2 3.2 0 0 0 ${p(-115)}A3.2 3.2 0 0 0 ${p(-80)}Z`;
	}
	const COOKIE = cookiePath();
	const CHIPS = [
		[2.6, -2.6, 1.7, 1.3],
		[-4.6, 2.4, 1.5, 1.2],
		[3.4, 4.6, 1.6, 1.2],
		[-1, 7.2, 1.1, 0.9],
		[6.6, 0.4, 1, 0.8]
	]
		.map(([dx = 0, dy = 0, rx = 0, ry = 0]) =>
			ovalPath(COOKIE_AT[0] + dx, COOKIE_AT[1] + dy, rx, ry)
		)
		.join('');
	const CRUMBS_FALLING = ovalPath(51.6, 86.4, 1, 0.9) + ovalPath(55, 89.6, 0.8, 0.7);
	const CRUMBS_LAP =
		ovalPath(50, 96.4, 0.9, 0.7) + ovalPath(56, 99.2, 0.7, 0.6) + ovalPath(71.4, 98, 0.8, 0.7);

	/** It floats: wind behind it, on its left as it runs to the right. */
	const WIND =
		capsulePath(4.6, 62, 15.4, 62, 0.9) +
		capsulePath(1.4, 74, 13.2, 74, 0.9) +
		capsulePath(5.4, 86, 14.4, 86, 0.9);
	/** It dances: two notes in the air. */
	function notePath(x: number, y: number, size: number): string {
		const head = ovalPath(x, y, 3 * size, 2.3 * size);
		const stem = capsulePath(x + 2.5 * size, y, x + 2.5 * size, y - 11 * size, 0.7 * size);
		const flag = `M${at(x + 1.8 * size, y - 11 * size)}C${at(x + 5.4 * size, y - 10 * size)} ${at(x + 8.4 * size, y - 8.4 * size)} ${at(x + 7.6 * size, y - 4.4 * size)}C${at(x + 6.8 * size, y - 7 * size)} ${at(x + 4.6 * size, y - 7.8 * size)} ${at(x + 2.4 * size, y - 8.2 * size)}Z`;
		return head + stem + flag;
	}
	const NOTES = notePath(7.4, 76, 1.1) + notePath(107, 24, 1.1);

	const SHADOW = ovalPath(60, 116.4, 27, 3.4);

	const shape = $derived(SHAPES[pose]);
	const feet = $derived([shift(FOOT, ...shape.feet[0]), shift(mirror(FOOT), ...shape.feet[1])]);
	const toes = $derived([shift(TOES, ...shape.feet[0]), shift(mirror(TOES), ...shape.feet[1])]);
	const claws = $derived([shift(CLAWS, ...shape.feet[0]), shift(mirror(CLAWS), ...shape.feet[1])]);

	function ref(name: string): string {
		return `${uid}-${name}`;
	}

	function paint(name: string): string {
		return `url(#${ref(name)})`;
	}
</script>

<!-- A form with its own shade: the form moved up and left, cut out of a frame, kept inside it. -->
{#snippet form(name: string, d: string, fill: string, shade: number, outline: string = d)}
	<clipPath id={ref(name)}><path {d} /></clipPath>
	<path class={fill} {d} />
	<g clip-path={paint(name)}>
		<path
			class="shade"
			fill-rule="evenodd"
			d={FRAME + d}
			transform="translate({-shade} {-shade})"
		/>
	</g>
	<path class="open line" d={outline} />
{/snippet}

<!-- An arm under the cloth: a sleeve of the sheet, its outline open where it leaves the sheet. -->
{#snippet sleeve(arm: { edge: string; fill: string; fingers: string }, name: string)}
	<clipPath id={ref(name)}><path d={arm.fill} /></clipPath>
	<path class="sheet" d={arm.fill} />
	<g clip-path={paint(name)}>
		<path class="shade" fill-rule="evenodd" d={FRAME + arm.fill} transform="translate(-2 -2)" />
	</g>
	<path class="open sheet-line" d={arm.edge} />
	<path class="open sheet-fine" d={arm.fingers} />
{/snippet}

<!--
	Drawn in the square of the companion (120 units), over its head and body: the companion under a
	sheet. Its feet, the end of its tail and its eyes, through two holes, are its own.
-->
<g class="ghost-figure" data-ghost-pose={pose} data-color={color ?? undefined}>
	<path class="ground-shadow moving" d={SHADOW} />
	{#if pose === 'run'}
		<path class="mark" d={WIND} />
	{:else if pose === 'dance'}
		<path class="mark" d={NOTES} />
	{/if}
	<g class="figure moving">
		<g transform="translate({shape.tail[0]} {shape.tail[1]})">
			{#each TAIL_PLATES as p, i (i)}
				<g transform="translate({p.x} {p.y}) rotate({p.angle})">
					{@render form(`tail-plate-${i}`, platePath(p.h, p.w), 'plate', p.w * 0.35)}
				</g>
			{/each}
			{@render form('tail', TAIL, 'body', 2.4, TAIL_LINE)}
		</g>
		{#if pose === 'wave'}
			{@render form('body', BODY, 'body', 5)}
			{@render form('belly', BELLY, 'belly', 2)}
			<g clip-path={paint('belly')}><path class="open fine" d={BELLY_BANDS} /></g>
			{@render form('thigh', THIGH, 'body', 2.4, THIGH_LINE)}
			<path class="open line" d={THIGH_CREASE} />
		{/if}
		{#each feet as foot, i (i)}
			<g class="foot moving" data-foot={i}>
				{@render form(`foot-${i}`, foot, 'body', 1.8)}
				<path class="open fine" d={toes[i]} />
				<path class="claw fine" d={claws[i]} />
			</g>
		{/each}

		<g class="drape moving">
			<!-- One outline around sheet and lifted corner: drawn under both, twice as thick. -->
			<path class="underlay" d={shape.sheet} />
			{#if pose === 'wave'}
				<path class="underlay wave-arm moving" d={WAVE_ARM} />
			{/if}
			<clipPath id={ref('sheet')}><path d={shape.sheet} /></clipPath>
			<path class="sheet" d={shape.sheet} />
			{#if pose === 'wave'}
				<g class="wave-arm moving">
					<path class="sheet" d={WAVE_ARM} />
					<path class="open sheet-fine" d={WAVE_ARM_LINES} />
				</g>
			{/if}
			<g clip-path={paint('sheet')}>
				{#if pose === 'wait'}
					<path class="open sheet-fine" d={FOLDS_SIT} />
				{:else if pose === 'bow'}
					<path class="open sheet-fine" d={FOLDS_BOW} />
					<path class="open sheet-fine" d={BOW_HANDS} />
				{:else if pose === 'wave'}
					<path class="open sheet-fine" d={FOLDS_WAVE} />
				{:else}
					<path class="sheet-shade" d={FOLD_SHADES_STAND} />
					<path class="open sheet-fine" d={FOLDS_STAND} />
				{/if}
				<g transform="translate(0 {shape.sink})">
					<path class="sheet-shade" d={CHIN_SHADE} />
					<path class="open sheet-fine" d={CHIN} />
					<path class="sheet-shade" d={SMILE_SHADE} />
					<path class="open sheet-fine" d={SNOUT} />
					<path class="open sheet-fine" d={CREASES} />
				</g>
				<path
					class="shade"
					fill-rule="evenodd"
					d={FRAME + shape.sheet}
					transform="translate(-4.4 -4.4)"
				/>
			</g>

			<g transform="translate(0 {shape.sink})">
				{#each EYES as [x, y], i (i)}
					{@const [lx, ly] = shape.look}
					<clipPath id={ref(`hole-${i}`)}><path d={ovalPath(x, y, ...HOLE)} /></clipPath>
					<path class="hole" d={ovalPath(x, y, ...HOLE)} />
					<g clip-path={paint(`hole-${i}`)}>
						<path class="white" d={ovalPath(x + lx * 0.3, y + 1.2, 6.4, 7.6)} />
						<path class="iris" d={ovalPath(x + lx, y + 1.2 + ly, 4.2, 4.9)} />
						<path class="ink" d={ovalPath(x + lx, y + 1.4 + ly, 2.4, 2.9)} />
						<circle class="white" cx={x + lx + 1.4} cy={y - 0.8 + ly} r="1.4" />
						{#if shape.eyes === 'smile'}
							<g transform="translate({x} {y})">
								<path class="body" d={SMILE_LID} />
								<path class="open line" d={SMILE_LID_LINE} />
							</g>
						{/if}
						<path
							class="hole-shade"
							d="M{x - 9} {y - 10}H{x + 9}V{y - 4}Q{x} {y - 8} {x - 9} {y - 4}Z"
						/>
					</g>
				{/each}
			</g>

			{#if pose === 'clap'}
				{#each CLAP_ARMS as arm, i (i)}
					<g class="hand moving" data-hand={i}>{@render sleeve(arm, `arm-${i}`)}</g>
				{/each}
			{:else if pose === 'wait'}
				<path class="crumb" d={CRUMBS_LAP} />
				<g class="cookie moving">
					{@render sleeve(COOKIE_ARM, 'cookie-arm')}
					{@render form('cookie', COOKIE, 'cookie-dough', 1.6)}
					<path class="crumb" d={CHIPS} />
				</g>
				<path class="crumb crumbs moving" d={CRUMBS_FALLING} />
			{/if}
		</g>
		{#if pose === 'clap'}
			<path class="ink claps moving" d={CLAP_MARKS} />
		{/if}
	</g>
</g>

<style>
	.ghost-figure {
		--dd-ghost-body: var(--dd-color-companion-body);
		--dd-ghost-belly: var(--dd-color-companion-belly);
		--dd-ghost-plate: var(--dd-color-companion-plate);
	}

	.ghost-figure[data-color='sky'] {
		--dd-ghost-body: var(--dd-color-companion-sky-body);
		--dd-ghost-belly: var(--dd-color-companion-sky-belly);
		--dd-ghost-plate: var(--dd-color-companion-sky-plate);
	}

	.ghost-figure[data-color='violet'] {
		--dd-ghost-body: var(--dd-color-companion-violet-body);
		--dd-ghost-belly: var(--dd-color-companion-violet-belly);
		--dd-ghost-plate: var(--dd-color-companion-violet-plate);
	}

	.ghost-figure[data-color='orange'] {
		--dd-ghost-body: var(--dd-color-companion-orange-body);
		--dd-ghost-belly: var(--dd-color-companion-orange-belly);
		--dd-ghost-plate: var(--dd-color-companion-orange-plate);
	}

	.ghost-figure[data-color='pink'] {
		--dd-ghost-body: var(--dd-color-companion-pink-body);
		--dd-ghost-belly: var(--dd-color-companion-pink-belly);
		--dd-ghost-plate: var(--dd-color-companion-pink-plate);
	}

	.ghost-figure[data-color='yellow'] {
		--dd-ghost-body: var(--dd-color-companion-yellow-body);
		--dd-ghost-belly: var(--dd-color-companion-yellow-belly);
		--dd-ghost-plate: var(--dd-color-companion-yellow-plate);
	}

	.ghost-figure[data-color='turquoise'] {
		--dd-ghost-body: var(--dd-color-companion-turquoise-body);
		--dd-ghost-belly: var(--dd-color-companion-turquoise-belly);
		--dd-ghost-plate: var(--dd-color-companion-turquoise-plate);
	}

	.ghost-figure[data-color='tomato'] {
		--dd-ghost-body: var(--dd-color-companion-tomato-body);
		--dd-ghost-belly: var(--dd-color-companion-tomato-belly);
		--dd-ghost-plate: var(--dd-color-companion-tomato-plate);
	}

	.underlay {
		fill: var(--dd-color-race-ghost-line);
		stroke: var(--dd-color-race-ghost-line);
		stroke-width: calc(var(--dd-border-width-thick) * 2);
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	.line {
		stroke: var(--dd-color-companion-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.bold {
		stroke-width: var(--dd-border-width-drawing-bold);
	}

	.fine {
		stroke: var(--dd-color-companion-line);
		stroke-width: var(--dd-border-width-thin);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.sheet-line,
	.sheet-fine {
		stroke: var(--dd-color-race-ghost-line);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.sheet-line {
		stroke-width: var(--dd-border-width-thick);
	}

	.sheet-fine {
		stroke-width: var(--dd-border-width-thin);
	}

	.open {
		fill: transparent;
	}

	.sheet {
		fill: var(--dd-color-race-ghost);
	}

	.sheet-shade {
		fill: var(--dd-color-race-ghost-shade);
	}

	.shade {
		fill: var(--dd-color-race-ghost-line);
		fill-opacity: var(--dd-opacity-companion-shade);
	}

	.hole {
		fill: var(--dd-color-race-ghost-line);
	}

	.hole-shade {
		fill: var(--dd-color-race-ghost-line);
		fill-opacity: var(--dd-opacity-race-ghost-hole);
	}

	.body {
		fill: var(--dd-ghost-body);
	}

	.belly {
		fill: var(--dd-ghost-belly);
	}

	.plate,
	.iris {
		fill: var(--dd-ghost-plate);
	}

	.white {
		fill: var(--dd-color-companion-eye);
	}

	.ink {
		fill: var(--dd-color-companion-line);
	}

	.mark {
		fill: var(--dd-color-race-mark);
	}

	.claw {
		fill: var(--dd-color-companion-eye);
	}

	.cookie-dough {
		fill: var(--dd-color-race-cookie);
	}

	.crumb {
		fill: var(--dd-color-race-cookie-chip);
	}

	.ground-shadow {
		fill: var(--dd-color-companion-shadow);
	}

	/* Every moving part loops and keeps its last frame; that frame tells the pose on its own. */
	.moving {
		transform-box: view-box;
		animation-timing-function: var(--dd-easing-standard);
		animation-iteration-count: infinite;
		animation-fill-mode: both;
	}

	.figure,
	.foot {
		transform-origin: 60px 113px;
	}

	.ground-shadow {
		transform-origin: 60px 116px;
	}

	.drape {
		transform-origin: 60px 8px;
	}

	.wave-arm {
		transform-origin: 92px 62px;
	}

	.cookie {
		transform-origin: 89px 70px;
	}

	.hand[data-hand='0'] {
		transform-origin: 31px 64px;
	}

	.hand[data-hand='1'] {
		transform-origin: 89px 64px;
	}

	[data-ghost-pose='run'] .figure {
		animation-name: ghost-float;
		animation-duration: var(--dd-duration-race-float);
	}

	[data-ghost-pose='run'] .ground-shadow {
		animation-name: ghost-float-shadow;
		animation-duration: var(--dd-duration-race-float);
	}

	[data-ghost-pose='run'] .drape {
		animation-name: ghost-trail;
		animation-duration: var(--dd-duration-race-float);
	}

	[data-ghost-pose='run'] .foot {
		animation-duration: var(--dd-duration-race-step);
	}

	[data-ghost-pose='run'] .foot[data-foot='0'],
	[data-ghost-pose='dance'] .foot[data-foot='0'] {
		animation-name: ghost-step-up;
	}

	[data-ghost-pose='run'] .foot[data-foot='1'],
	[data-ghost-pose='dance'] .foot[data-foot='1'] {
		animation-name: ghost-step-down;
	}

	[data-ghost-pose='wait'] .cookie {
		animation-name: ghost-nibble;
	}

	[data-ghost-pose='wait'] .crumbs {
		animation-name: ghost-crumbs;
		animation-timing-function: var(--dd-easing-exit);
	}

	[data-ghost-pose='wait'] .moving {
		animation-duration: var(--dd-duration-race-nibble);
		animation-iteration-count: 3;
	}

	[data-ghost-pose='clap'] .moving,
	[data-ghost-pose='wave'] .moving,
	[data-ghost-pose='dance'] .moving {
		animation-duration: var(--dd-duration-race-greet);
		animation-iteration-count: 4;
	}

	[data-ghost-pose='clap'] .hand[data-hand='0'] {
		animation-name: ghost-clap-left;
	}

	[data-ghost-pose='clap'] .hand[data-hand='1'] {
		animation-name: ghost-clap-right;
	}

	[data-ghost-pose='clap'] .claps {
		animation-name: ghost-clap-marks;
	}

	[data-ghost-pose='wave'] .wave-arm {
		animation-name: ghost-wave;
	}

	[data-ghost-pose='bow'] .moving {
		animation-duration: var(--dd-duration-race-bow);
		animation-iteration-count: 2;
	}

	[data-ghost-pose='bow'] .figure {
		animation-name: ghost-bow;
	}

	[data-ghost-pose='dance'] .figure {
		animation-name: ghost-dance;
	}

	@keyframes ghost-float {
		0%,
		100% {
			translate: 0 calc(var(--dd-space-xs) * -1);
		}

		50% {
			translate: 0 calc(var(--dd-space-xs) * -0.25);
		}
	}

	@keyframes ghost-float-shadow {
		0%,
		100% {
			scale: 0.8 0.8;
		}

		50% {
			scale: 0.94 0.94;
		}
	}

	@keyframes ghost-trail {
		0%,
		100% {
			transform: skewX(-6deg);
		}

		50% {
			transform: skewX(-2deg);
		}
	}

	@keyframes ghost-step-up {
		0%,
		100% {
			translate: 0 calc(var(--dd-space-xs) * -1);
		}

		50% {
			translate: 0 0;
		}
	}

	@keyframes ghost-step-down {
		0%,
		100% {
			translate: 0 0;
		}

		50% {
			translate: 0 calc(var(--dd-space-xs) * -1);
		}
	}

	/* The arm turns about the shoulder: up, the cookie is at the snout; down, it rests on the lap. */
	@keyframes ghost-nibble {
		0%,
		20%,
		100% {
			rotate: 10deg;
		}

		10% {
			rotate: 13deg;
		}

		45%,
		75% {
			rotate: -8deg;
		}
	}

	@keyframes ghost-crumbs {
		0%,
		12% {
			translate: 0 0;
			opacity: 0;
		}

		16% {
			opacity: 100%;
		}

		40%,
		100% {
			translate: 0 var(--dd-space-md);
			opacity: 0;
		}
	}

	@keyframes ghost-clap-left {
		0%,
		100% {
			rotate: 0deg;
		}

		50% {
			rotate: 16deg;
		}
	}

	@keyframes ghost-clap-right {
		0%,
		100% {
			rotate: 0deg;
		}

		50% {
			rotate: -16deg;
		}
	}

	@keyframes ghost-clap-marks {
		0%,
		12%,
		88%,
		100% {
			opacity: 100%;
		}

		25%,
		75% {
			opacity: 0;
		}
	}

	@keyframes ghost-wave {
		0%,
		100% {
			rotate: 0deg;
		}

		50% {
			rotate: 16deg;
		}
	}

	@keyframes ghost-bow {
		0%,
		100% {
			scale: 1.04 0.88;
		}

		35%,
		65% {
			scale: 1 1;
		}
	}

	@keyframes ghost-dance {
		0%,
		100% {
			rotate: -8deg;
			translate: calc(var(--dd-space-xs) * -0.5) 0;
		}

		50% {
			rotate: 8deg;
			translate: calc(var(--dd-space-xs) * 0.5) 0;
		}
	}

	/* Under `data-still` (or reduced motion, app.css), every part shows its last frame at once. */
	:global([data-still]) .ghost-figure .moving {
		animation-duration: var(--dd-duration-instant);
		animation-delay: var(--dd-duration-instant);
		animation-iteration-count: 1;
	}
</style>
