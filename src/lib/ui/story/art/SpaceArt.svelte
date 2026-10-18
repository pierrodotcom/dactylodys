<script lang="ts">
	import type { Snippet } from 'svelte';
	import { checkerPath, starPath } from '$lib/ui/companion/geometry';
	import StoryDino from '../StoryDino.svelte';

	const uid = $props.id();

	interface Props {
		/** One of `STORY_ART_GROUPS.space`. */
		art: string;
	}

	type Mouth = 'o' | 'smile' | 'hmm';
	type Pose = 'sip' | 'hold' | 'nap';

	const DECIMALS = 100;

	function round(value: number): number {
		return Math.round(value * DECIMALS) / DECIMALS;
	}

	/** A circle as a path: with `fill-rule: evenodd`, a second circle cuts a hole in the first. */
	function circlePath(cx: number, cy: number, r: number): string {
		const [x, y, d, rr] = [round(cx - r), round(cy), round(2 * r), round(r)];
		return `M${x} ${y}a${rr} ${rr} 0 1 0 ${d} 0a${rr} ${rr} 0 1 0 ${-d} 0Z`;
	}

	/** Night side of a sphere lit from the top left, to draw clipped by the sphere. */
	function nightSide(cx: number, cy: number, r: number): string {
		return circlePath(cx, cy, r * 1.6) + circlePath(cx - r * 0.3, cy - r * 0.32, r * 1.04);
	}

	/** A thin four-pointed twinkle. */
	function twinklePath(cx: number, cy: number, r: number): string {
		const [t, b, l, rt] = [cy - r, cy + r, cx - r, cx + r].map(round);
		const k = round(r * 0.12);
		return (
			`M${cx} ${t}Q${round(cx + k)} ${round(cy - k)} ${rt} ${cy}Q${round(cx + k)} ${round(cy + k)} ${cx} ${b}` +
			`Q${round(cx - k)} ${round(cy + k)} ${l} ${cy}Q${round(cx - k)} ${round(cy - k)} ${cx} ${t}Z`
		);
	}

	/** A crescent: the disk (cx, cy, r) minus the disk moved by (dx, dy) with radius r2. */
	function crescentPath(cx: number, cy: number, r: number, dx: number, dy: number, r2: number) {
		const d = Math.hypot(dx, dy);
		const a = (r * r - r2 * r2 + d * d) / (2 * d);
		const h = Math.sqrt(r * r - a * a);
		const [ux, uy] = [dx / d, dy / d];
		const [px, py] = [cx + a * ux, cy + a * uy];
		const first = `${round(px - h * uy)} ${round(py + h * ux)}`;
		const second = `${round(px + h * uy)} ${round(py - h * ux)}`;
		return `M${first}A${r} ${r} 0 1 1 ${second}A${r2} ${r2} 0 0 0 ${first}Z`;
	}

	/** Half of a flat ring around (cx, cy): `back` above the center, `front` below it. */
	function ringHalf(
		cx: number,
		cy: number,
		rx: number,
		ry: number,
		inner: number,
		half: 'back' | 'front'
	) {
		const [outer, inside] = [half === 'back' ? 1 : 0, half === 'back' ? 0 : 1];
		const [irx, iry] = [round(rx * inner), round(ry * inner)];
		return (
			`M${cx - rx} ${cy}A${rx} ${ry} 0 0 ${outer} ${cx + rx} ${cy}` +
			`L${round(cx + rx * inner)} ${cy}A${irx} ${iry} 0 0 ${inside} ${round(cx - rx * inner)} ${cy}Z`
		);
	}

	/** Where a pupil sits to look from (x, y) toward (tx, ty), in a face turned by `angle`. */
	function gaze(x: number, y: number, angle: number, tx: number, ty: number, reach: number) {
		const a = Math.atan2(ty - y, tx - x) - (angle * Math.PI) / 180;
		return { x: round(reach * Math.cos(a)), y: round(reach * Math.sin(a)) };
	}

	/** Night sky: [x, y, radius]. */
	const STARS = [
		[6, 8, 0.6],
		[15, 30, 0.4],
		[26, 12, 0.8],
		[31, 50, 0.5],
		[39, 4, 0.5],
		[45, 26, 0.6],
		[52, 41, 0.4],
		[57, 9, 0.6],
		[67, 29, 0.4],
		[72, 5, 0.8],
		[88, 10, 0.5],
		[95, 24, 0.4],
		[102, 5, 0.7],
		[109, 18, 0.5],
		[118, 8, 0.4],
		[124, 47, 0.5],
		[131, 14, 0.8],
		[139, 30, 0.5],
		[146, 5, 0.6],
		[153, 22, 0.4],
		[156, 41, 0.7],
		[148, 57, 0.5],
		[9, 58, 0.6],
		[20, 75, 0.4],
		[7, 88, 0.5],
		[151, 74, 0.5],
		[154, 92, 0.4],
		[37, 67, 0.4],
		[113, 62, 0.4],
		[62, 57, 0.4]
	] as const;
	const TWINKLES = [
		twinklePath(12, 42, 2.6),
		twinklePath(137, 40, 2.2),
		twinklePath(62, 17, 1.8),
		twinklePath(150, 84, 2.2)
	] as const;

	const PORTHOLE = { x: 80, y: 31, ring: 11.5, glass: 9 } as const;
	const RIVETS = Array.from({ length: 10 }, (_, i) => {
		const angle = (Math.PI * 2 * i) / 10;
		const r = (PORTHOLE.ring + PORTHOLE.glass) / 2;
		return {
			x: round(PORTHOLE.x + r * Math.cos(angle)),
			y: round(PORTHOLE.y + r * Math.sin(angle))
		};
	});
	const BAND_RIVETS = [
		{ x: 66, y: 57.5 },
		{ x: 71.5, y: 58.3 },
		{ x: 88.5, y: 58.3 },
		{ x: 94, y: 57.5 }
	] as const;

	/** The companion in its space suit (space-moon): its square, and the turn of its float. */
	const ASTRONAUT = { x: 4, y: 20, size: 66, tilt: -10 } as const;
	const SUIT_SCALE = ASTRONAUT.size / 120;

	/** Coffee leaving the cup, from its brim to the helmet: each drop trails behind its way. */
	const COFFEE_FROM = { x: 97, y: 33 } as const;
	const COFFEE_DROPS = [
		{ x: 88.5, y: 25, r: 3.3 },
		{ x: 78, y: 18.5, r: 2.6 },
		{ x: 67.5, y: 18, r: 2 },
		{ x: 59, y: 22.5, r: 1.6 },
		{ x: 54, y: 27.5, r: 1.2 }
	].map((drop, i, drops) => {
		const from = drops[i - 1] ?? COFFEE_FROM;
		const length = Math.hypot(from.x - drop.x, from.y - drop.y);
		const [ux, uy] = [(from.x - drop.x) / length, (from.y - drop.y) / length];
		const [near, far, side] = [
			drop.r + 1.2,
			drop.r + 1.2 + Math.min(3, length * 0.35),
			drop.r * 0.55
		];
		const mark = (offset: number) =>
			`M${round(drop.x + ux * near - uy * offset)} ${round(drop.y + uy * near + ux * offset)}` +
			`L${round(drop.x + ux * far - uy * offset)} ${round(drop.y + uy * far + ux * offset)}`;
		return { ...drop, trail: mark(side) + mark(-side) };
	});

	const MOON_CRATERS = [
		{ x: 96, y: 72, rx: 6, ry: 3.4 },
		{ x: 114, y: 64, rx: 4, ry: 2.2 },
		{ x: 136, y: 70, rx: 7.5, ry: 4 },
		{ x: 106, y: 86, rx: 9, ry: 5 },
		{ x: 128, y: 88, rx: 4.5, ry: 2.6 },
		{ x: 150, y: 80, rx: 5, ry: 3 },
		{ x: 84, y: 92, rx: 4, ry: 2.4 }
	] as const;

	/** The comet's icy head, around its center. */
	const NUCLEUS =
		'M-11.5 -1C-12 -8.5 -6 -12.4 1.5 -12C9.2 -11.6 13 -6 12.6 1C12.2 8.4 6.6 12.6 -0.6 12.2C-7.8 11.8 -11 6.4 -11.5 -1Z';

	/** Specks of dust in the forgotten tail: [x, y, radius]. */
	const TAIL_DUST = [
		[52, 66, 0.6],
		[40, 71, 0.5],
		[30, 64, 0.45],
		[22, 80, 0.6],
		[46, 61.5, 0.4],
		[12, 73, 0.5],
		[8, 88, 0.45]
	] as const;

	/** The comet's path, from where it lost its tail to where it is now. */
	const COMET_TRACK = Array.from({ length: 7 }, (_, i) => ({
		x: round(82 + i * 4.6),
		y: round(57 - i * 3.1),
		r: round(0.45 + i * 0.07)
	}));

	/** Inhabitants of the comma planet, sitting on the top of its head (center 84, 58, radius 24). */
	const COMMA = { x: 80, y: 58, r: 27 } as const;
	const COMMA_PATH =
		'M80 31A27 27 0 0 1 107 58C107 80 94 94 60 100C74 92 78 89 78.4 85A27 27 0 0 1 80 31Z';
	const RESTING = [
		{ angle: -43, tone: 'e', pose: 'sip' },
		{ angle: 0, tone: 'f', pose: 'hold' },
		{ angle: 43, tone: 'o', pose: 'nap' }
	].map((being) => ({
		...being,
		x: round(COMMA.x + COMMA.r * Math.sin((being.angle * Math.PI) / 180)),
		y: round(COMMA.y - COMMA.r * Math.cos((being.angle * Math.PI) / 180)),
		pose: being.pose as Pose
	}));

	const NOTEBOOK_RINGS = [24, 32, 40, 48, 56, 64, 72, 80] as const;

	let { art }: Props = $props();

	const id = (name: string) => `${uid}-${name}`;
</script>

<!-- Shared pieces -->

{#snippet sky(nebulaX: number, nebulaY: number)}
	<defs>
		<linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" class="stop-night" />
			<stop offset="0.6" class="stop-night" />
			<stop offset="1" class="stop-dusk" />
		</linearGradient>
		<radialGradient id={id('nebula')}>
			<stop offset="0" class="stop-nebula" />
			<stop offset="1" class="stop-nebula clear" />
		</radialGradient>
	</defs>
	<rect fill="url(#{id('sky')})" width="160" height="100" />
	<ellipse
		fill="url(#{id('nebula')})"
		cx={nebulaX}
		cy={nebulaY}
		rx="46"
		ry="24"
		transform="rotate(-20 {nebulaX} {nebulaY})"
	/>
	{#each STARS as [x, y, r] (`${x}-${y}`)}
		<circle class="star" cx={x} cy={y} {r} />
	{/each}
	{#each TWINKLES as twinkle (twinkle)}
		<path class="star" d={twinkle} />
	{/each}
{/snippet}

<!-- A sphere lit from the top left: its colour, what is painted on it, its night side, a gleam. -->
{#snippet sphere(
	name: string,
	cx: number,
	cy: number,
	r: number,
	tone: string,
	surface: Snippet,
	gleam = true
)}
	<clipPath id={id(name)}>
		<circle {cx} {cy} {r} />
	</clipPath>
	<circle class={tone} {cx} {cy} {r} />
	<g clip-path="url(#{id(name)})">
		{@render surface()}
		<path class="shade" d={nightSide(cx, cy, r)} />
		<path class="light" d={crescentPath(cx, cy, r * 0.93, r * 0.07, r * 0.07, r * 0.93)} />
		{#if gleam}
			<ellipse
				class="light"
				cx={round(cx - r * 0.42)}
				cy={round(cy - r * 0.46)}
				rx={round(r * 0.26)}
				ry={round(r * 0.13)}
				transform="rotate(-40 {round(cx - r * 0.42)} {round(cy - r * 0.46)})"
			/>
		{/if}
	</g>
	<circle class="ln none" class:bold={r >= 20} {cx} {cy} {r} />
{/snippet}

{#snippet nothing()}{/snippet}

<!-- A face drawn around (0, 0), about 26 units wide before `size`, that looks at (tx, ty). -->
{#snippet face(
	x: number,
	y: number,
	angle: number,
	size: number,
	mouth: Mouth,
	tx: number,
	ty: number
)}
	{@const look = gaze(x, y, angle, tx, ty, 1.7)}
	<g transform="translate({x} {y}) rotate({angle}) scale({size})">
		<ellipse class="cheek" cx="-11.5" cy="4.5" rx="3.4" ry="2" />
		<ellipse class="cheek" cx="11.5" cy="4.5" rx="3.4" ry="2" />
		<path class="ln bold none" d="M-11.5 -11.5Q-7 -15.5 -2.5 -12" />
		<path class="ln bold none" d="M2.5 -10.5Q7 -12.5 11.5 -10" />
		<ellipse class="ln white" cx="-6.5" cy="-3" rx="4.6" ry="5.4" />
		<ellipse class="ln white" cx="6.5" cy="-3" rx="4.6" ry="5.4" />
		<circle class="ink" cx={-6.5 + look.x} cy={-3 + look.y} r="2.7" />
		<circle class="ink" cx={6.5 + look.x} cy={-3 + look.y} r="2.7" />
		<circle class="white" cx={-7.5 + look.x} cy={-4.1 + look.y} r="0.9" />
		<circle class="white" cx={5.5 + look.x} cy={-4.1 + look.y} r="0.9" />
		{#if mouth === 'o'}
			<ellipse class="ln ink" cx="0" cy="7.5" rx="2.2" ry="2.7" />
		{:else if mouth === 'smile'}
			<path class="ln ink" d="M-4 5.5Q0 11 4 5.5Q0 7.2 -4 5.5Z" />
		{:else}
			<path class="ln none" d="M-3.5 7.5Q0 5.8 3.5 8" />
		{/if}
	</g>
{/snippet}

<!-- The rocket of the trip, upright, nose at (80, 6), with the companion at its porthole. -->
{#snippet rocket(name: string)}
	<defs>
		<radialGradient id={id(`${name}-glow`)}>
			<stop offset="0" class="stop-glow" />
			<stop offset="1" class="stop-glow clear" />
		</radialGradient>
		<linearGradient id={id(`${name}-flame`)} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" class="stop-flame-hot" />
			<stop offset="0.45" class="stop-flame" />
			<stop offset="1" class="stop-flame-tip" />
		</linearGradient>
		<linearGradient id={id(`${name}-core`)} x1="0" y1="0" x2="0" y2="1">
			<stop offset="0.3" class="stop-white" />
			<stop offset="1" class="stop-flame-hot" />
		</linearGradient>
		<clipPath id={id(`${name}-hull`)}>
			<path
				d="M80 6C91 12 97.5 28 97 48C96.8 56 95.3 62 93 67L67 67C64.7 62 63.2 56 63 48C62.5 28 69 12 80 6Z"
			/>
		</clipPath>
		<clipPath id={id(`${name}-glass`)}>
			<circle cx={PORTHOLE.x} cy={PORTHOLE.y} r={PORTHOLE.glass} />
		</clipPath>
	</defs>
	<circle fill="url(#{id(`${name}-glow`)})" cx="80" cy="86" r="28" />
	<path
		class="ln"
		fill="url(#{id(`${name}-flame`)})"
		d="M67 73C64 82 70 90 74 95C76.5 98.5 78.5 101 80 105C81.5 101 83.5 98.5 86 95C90 90 96 82 93 73Q80 77 67 73Z"
	/>
	<path
		fill="url(#{id(`${name}-core`)})"
		d="M71.5 73.5C70.5 80 74 85.5 76.5 89.5C78 92 79.2 94.5 80 97C80.8 94.5 82 92 83.5 89.5C86 85.5 89.5 80 88.5 73.5Q80 76.5 71.5 73.5Z"
	/>
	<!-- Fins and nozzle start under the hull. -->
	<path
		class="ln j"
		d="M66.5 42C57 47 50 57 49.5 71.5C49.4 74.6 51.6 75.8 53.7 74.3C57.5 71.4 62.5 68 68.5 65.5Z"
	/>
	<path
		class="ln j"
		d="M93.5 42C103 47 110 57 110.5 71.5C110.6 74.6 108.4 75.8 106.3 74.3C102.5 71.4 97.5 68 91.5 65.5Z"
	/>
	<path class="gleam" d="M63.5 47C57.5 51.5 53.6 58.5 52.6 68" />
	<path
		class="shade"
		d="M95 50C102 55 107 62 108 72C107 75 105.5 74.5 104 73C101 70 97 67.5 93 66Z"
	/>
	<path
		class="ln metal"
		d="M70 63L90 63C90.5 67.5 92 71 94.5 74Q80 77.5 65.5 74C68 71 69.5 67.5 70 63Z"
	/>
	<path
		class="shade"
		d="M84 63L90 63C90.5 67.5 92 71 94.5 74Q89 75.2 86 75.4C86.5 71 86 67 84 63Z"
	/>
	<path class="ln thin none" d="M68.5 69Q80 71.5 91.5 69" />
	<path
		class="ln bold white"
		d="M80 6C91 12 97.5 28 97 48C96.8 56 95.3 62 93 67L67 67C64.7 62 63.2 56 63 48C62.5 28 69 12 80 6Z"
	/>
	<g clip-path="url(#{id(`${name}-hull`)})">
		<path class="j" d="M60 0H100V19.5Q80 24.5 60 19.5Z" />
		<path class="j" d="M60 53.5Q80 58.5 100 53.5V59Q80 64 60 59Z" />
		<path
			class="ln none"
			d="M60 19.5Q80 24.5 100 19.5M60 53.5Q80 58.5 100 53.5M60 59Q80 64 100 59"
		/>
		<path class="ln thin none" d="M63 45Q80 49 97 45" />
		{#each BAND_RIVETS as rivet (rivet.x)}
			<circle class="white" cx={rivet.x} cy={rivet.y} r="0.8" />
		{/each}
		<path class="shade" d="M86.5 4C96.5 16 98.5 46 93 70H104V0Z" />
		<path class="light" d="M71.5 13C67.4 25 66.6 44 68.6 61C70.2 47 70.9 29 74.2 14.5Z" />
	</g>
	<path
		class="ln bold none"
		d="M80 6C91 12 97.5 28 97 48C96.8 56 95.3 62 93 67L67 67C64.7 62 63.2 56 63 48C62.5 28 69 12 80 6Z"
	/>
	<path
		class="ln j"
		d="M80 50C77.6 56 76.8 64 77.3 74.5C77.4 76 78.5 76.6 80 76.6C81.5 76.6 82.6 76 82.7 74.5C83.2 64 82.4 56 80 50Z"
	/>
	<path class="shade" d="M80 50C82.4 56 83.2 64 82.7 74.5C82.6 76 81.5 76.6 80 76.6Z" />
	<circle class="ln metal" cx={PORTHOLE.x} cy={PORTHOLE.y} r={PORTHOLE.ring} />
	{#each RIVETS as rivet (`${rivet.x}-${rivet.y}`)}
		<circle class="ink" cx={rivet.x} cy={rivet.y} r="0.55" />
	{/each}
	<circle class="window" cx={PORTHOLE.x} cy={PORTHOLE.y} r={PORTHOLE.glass} />
	<g clip-path="url(#{id(`${name}-glass`)})">
		<StoryDino x={62} y={12.6} size={36} />
		<g transform="translate(80.5 38.4) rotate(-8)">
			<path class="ln thin page" d="M-5 -3.8H5.2Q6 -3.8 6 -3V3.6Q6 4.4 5.2 4.4H-5Z" />
			<path
				class="ln a"
				d="M-5.8 -4.4H4.2Q5 -4.4 5 -3.6V3.2Q5 4 4.2 4H-5.8Q-6.6 4 -6.6 3.2V-3.6Q-6.6 -4.4 -5.8 -4.4Z"
			/>
			<path class="ln thin none" d="M2.6 -4.4V4" />
			<path class="star" d={starPath(-1.6, -0.3, 2, 0.9)} />
		</g>
		<path class="shade" d={nightSide(PORTHOLE.x, PORTHOLE.y, PORTHOLE.glass)} />
		<path class="glint" d="M73.6 28A7 7 0 0 1 78 24.2" />
	</g>
	<circle class="ln none" cx={PORTHOLE.x} cy={PORTHOLE.y} r={PORTHOLE.glass} />
	<circle class="ln bold none" cx={PORTHOLE.x} cy={PORTHOLE.y} r={PORTHOLE.ring} />
{/snippet}

<!-- The companion's space suit, in the 120-unit square of its drawing: behind it, then over it. -->
{#snippet suitBack()}
	<path class="ln white" d="M18 46Q18 39 25 39H95Q102 39 102 46V88Q102 95 95 95H25Q18 95 18 88Z" />
	<path class="shade" d="M18 70Q60 76 102 70V88Q102 95 95 95H25Q18 95 18 88Z" />
	<path class="ln none" d="M26 40C24 30 21 22 16 15" />
	<circle class="ln j" cx="15.5" cy="14" r="3.6" />
	<circle class="light" cx="14.4" cy="12.8" r="1.2" />
{/snippet}

{#snippet suitFront()}
	<clipPath id={id('suit-body')}>
		<ellipse cx="60" cy="76" rx="35" ry="31" />
	</clipPath>
	<g clip-path="url(#{id('suit-body')})">
		<path class="ln i" d="M20 91Q60 101 100 91V98Q60 108 20 98Z" />
	</g>
	<path
		class="ln metal"
		d="M54 95.5H66Q67.8 95.5 67.8 97.3V101.2Q67.8 103 66 103H54Q52.2 103 52.2 101.2V97.3Q52.2 95.5 54 95.5Z"
	/>
	<path class="ln thin none" d="M56 99.2H64" />
	<!-- Boots over the feet, gloves over the hands. -->
	<path class="ln white" d="M31 106.5C30.5 98.5 57.5 98.5 57 106.5C56.5 113.5 31.5 114 31 106.5Z" />
	<path class="ln white" d="M63 106.5C62.5 98.5 89.5 98.5 89 106.5C88.5 113.5 63.5 114 63 106.5Z" />
	<path class="ln i" d="M32.5 101.5Q44 97 55.5 101.5L56.5 104Q44 99.8 31.6 104Z" />
	<path class="ln i" d="M64.5 101.5Q76 97 87.5 101.5L88.5 104Q76 99.8 63.6 104Z" />
	<path class="ln thin none" d="M33 109.5Q44 113 55 109.5M65 109.5Q76 113 87 109.5" />
	<path class="ln white" d="M20.2 84C19.6 90.5 22.6 95 27 95C31.4 95 34.4 90.5 33.8 84Z" />
	<path class="ln white" d="M86.2 84C85.6 90.5 88.6 95 93 95C97.4 95 100.4 90.5 99.8 84Z" />
	<path class="ln i" d="M20 82.5Q27 85.5 34 82.5L33.8 86Q27 89 20.2 86Z" />
	<path class="ln i" d="M86 82.5Q93 85.5 100 82.5L99.8 86Q93 89 86.2 86Z" />
	<!-- The air hose goes from the pack to the collar. -->
	<path class="hose-edge" d="M22 52C15 62 19 74 31 79" />
	<path class="hose" d="M22 52C15 62 19 74 31 79" />
	<!-- Helmet: clear in the middle, tinted on its rim, sitting in its metal collar. -->
	<circle fill="url(#{id('helmet')})" cx="60" cy="41" r="38" />
	<path class="glint wide" d="M32 30A31 31 0 0 1 50 12" />
	<circle class="light" cx="55.5" cy="10.5" r="1.8" />
	<path class="light" d="M80 13Q90 18 93 28Q90 27 87.5 24Q84 19 80 13Z" />
	<circle class="ln bold none" cx="60" cy="41" r="38" />
	<path class="ln metal" d="M27 75C27 83 93 83 93 75L93 80C93 90 27 90 27 80Z" />
	<path class="shade" d="M76 81.5C86 80.5 93 78 93 75V80C93 84 88 87 76 88.5Z" />
	<circle class="ink" cx="35" cy="81.6" r="0.9" />
	<circle class="ink" cx="85" cy="81.6" r="0.9" />
{/snippet}

<!-- An inhabitant of the comma planet, sitting at (0, 0) on the ground, its head up. -->
{#snippet inhabitant(x: number, y: number, angle: number, tone: string, pose: Pose)}
	<g transform="translate({x} {y}) rotate({angle}) scale(1.08)">
		<!-- Legs hang over the edge; their tops hide under the body. -->
		<path
			class="ln {tone}"
			d="M-4.6 -2C-5 1.5 -5.4 3.8 -6.6 5.4C-7.5 6.6 -6.4 7.8 -4.8 7.3C-3 6.8 -2.1 4.5 -1.6 -1.5Z"
		/>
		<path
			class="ln {tone}"
			d="M4.6 -2C5 1.5 5.4 3.8 6.6 5.4C7.5 6.6 6.4 7.8 4.8 7.3C3 6.8 2.1 4.5 1.6 -1.5Z"
		/>
		<path class="ln none" d="M-1.8 -14C-2.6 -17.5 -4.6 -19.6 -7 -20.4" />
		<path class="ln none" d="M1.8 -14C2.6 -17.5 4.6 -19.6 7 -20.4" />
		<circle class="ln thin star" cx="-7.4" cy="-20.6" r="1.6" />
		<circle class="ln thin star" cx="7.4" cy="-20.6" r="1.6" />
		<path
			class="ln {tone}"
			d="M-7.4 1C-8 -8 -4.8 -15 0 -15C4.8 -15 8 -8 7.4 1C4 2.8 -4 2.8 -7.4 1Z"
		/>
		<path class="shade" d="M3.5 -13.5C7 -10 8 -5 7.4 1C5 2.2 2 2.6 0 2.6C4 -2 5 -8 3.5 -13.5Z" />
		<ellipse
			class="light"
			cx="-3.4"
			cy="-10.5"
			rx="1.6"
			ry="2.6"
			transform="rotate(25 -3.4 -10.5)"
		/>
		{#if pose === 'nap'}
			<path class="ln none" d="M-4.8 -7.8Q-3.2 -6.4 -1.6 -7.8M1.6 -7.8Q3.2 -6.4 4.8 -7.8" />
			<path class="ln none" d="M-1.6 -3.6Q0 -2.6 1.6 -3.6" />
			<circle class="ln thin bubble" cx="3.8" cy="-4.4" r="2.2" />
			<circle class="white" cx="3.2" cy="-5" r="0.6" />
			<!-- Hands folded on the belly. -->
			<path
				class="ln {tone}"
				d="M-6.6 -5C-6 -2 -3.4 -0.6 -0.8 -1.2C0.4 -1.6 0.2 -3 -1 -3.2C-3 -3.4 -4.6 -4.2 -5.6 -6Z"
			/>
			<path
				class="ln {tone}"
				d="M6.6 -5C6 -2 3.4 -0.6 0.8 -1.2C-0.4 -1.6 -0.2 -3 1 -3.2C3 -3.4 4.6 -4.2 5.6 -6Z"
			/>
		{:else}
			<path class="ln thin {tone}" d="M-5.4 -9.6Q-3.2 -11.4 -1.2 -9.6" />
			<path class="ln thin {tone}" d="M1.2 -9.6Q3.2 -11.4 5.4 -9.6" />
			{#if pose === 'sip'}
				<path class="ln none" d="M-5 -8.4Q-3.2 -7 -1.4 -8.4M1.4 -8.4Q3.2 -7 5 -8.4" />
			{:else}
				<circle class="ln thin white" cx="-3.2" cy="-7.6" r="1.8" />
				<circle class="ln thin white" cx="3.2" cy="-7.6" r="1.8" />
				<path class="ln thin {tone}" d="M-5 -7.8A1.8 1.8 0 0 1 -1.4 -7.8Z" />
				<path class="ln thin {tone}" d="M1.4 -7.8A1.8 1.8 0 0 1 5 -7.8Z" />
				<circle class="ink" cx="-3" cy="-6.9" r="0.8" />
				<circle class="ink" cx="3.4" cy="-6.9" r="0.8" />
			{/if}
			<!-- A cup held in both hands, near the mouth when it sips. -->
			<g transform={pose === 'sip' ? 'translate(1.6 -3.2) rotate(-14)' : 'translate(0 2)'}>
				<path class="ln none" d="M2.6 -3.6Q4.8 -3.6 4.6 -2Q4.4 -0.4 2.4 -0.8" />
				<path
					class="ln white"
					d="M-2.8 -4.6L-2.3 -0.4Q-2.2 0.6 -1.2 0.6H1.2Q2.2 0.6 2.3 -0.4L2.8 -4.6Z"
				/>
				<ellipse class="ln thin coffee" cx="0" cy="-4.6" rx="2.8" ry="0.8" />
				<path class="steam fine" d="M0.6 -6Q-0.4 -7.2 0.6 -8.4" />
			</g>
			<path
				class="ln {tone}"
				d="M-6.8 -6.5C-7.6 -3.4 -6 -1.2 -3.2 -1.4C-2 -1.5 -1.8 -3 -2.8 -3.4C-4 -3.8 -4.8 -5 -5.2 -7.2Z"
			/>
			<path
				class="ln {tone}"
				d="M6.8 -6.5C7.6 -3.4 6 -1.2 3.2 -1.4C2 -1.5 1.8 -3 2.8 -3.4C4 -3.8 4.8 -5 5.2 -7.2Z"
			/>
		{/if}
	</g>
{/snippet}

<!-- The six pictures -->

{#if art === 'space-opening'}
	<g data-story-art="space-opening">
		{@render sky(36, 30)}
		<path class="ln star" d={crescentPath(22, 22, 7, 3.4, -2.6, 6.2)} />
		<g transform="rotate(-16 138 24)">
			<path class="ln thin none" d={ringHalf(138, 24, 10, 2.6, 0.7, 'back')} />
			<circle class="ln h" cx="138" cy="24" r="5.5" />
			<path class="ln thin h" d={ringHalf(138, 24, 10, 2.6, 0.7, 'front')} />
		</g>
		<path class="ln n" d="M0 90Q80 82 160 90V100H0Z" />
		<!-- Speed lines along the hull. -->
		<path
			class="streak"
			d="M55 22Q53.5 32 54.5 42M59 10Q57.5 18 58 26M105 22Q106.5 32 105.5 42M101 10Q102.5 18 102 26"
		/>
		{@render rocket('launch')}
		<clipPath id={id('smoke-left')}>
			<path
				d="M-2 101C-4 94 3 88 10 90C11 83 20 80 26 85C29 78 40 77 44 84C48 80 56 81 58 87C63 86 68 90 67 95C70 97 70 101 68 103H-2Z"
			/>
		</clipPath>
		<clipPath id={id('smoke-right')}>
			<path
				d="M162 101C164 94 157 88 150 90C149 83 140 80 134 85C131 78 120 77 116 84C112 80 104 81 102 87C97 86 92 90 93 95C90 97 90 101 92 103H162Z"
			/>
		</clipPath>
		<path
			class="smoke"
			d="M-2 101C-4 94 3 88 10 90C11 83 20 80 26 85C29 78 40 77 44 84C48 80 56 81 58 87C63 86 68 90 67 95C70 97 70 101 68 103H-2Z"
		/>
		<path
			class="smoke"
			d="M162 101C164 94 157 88 150 90C149 83 140 80 134 85C131 78 120 77 116 84C112 80 104 81 102 87C97 86 92 90 93 95C90 97 90 101 92 103H162Z"
		/>
		<g clip-path="url(#{id('smoke-left')})">
			<path class="shade" d="M0 95Q16 90 30 94Q46 89 70 96V104H0Z" />
		</g>
		<g clip-path="url(#{id('smoke-right')})">
			<path class="shade" d="M160 95Q144 90 130 94Q114 89 90 96V104H160Z" />
		</g>
		<path
			class="ln none"
			d="M-2 101C-4 94 3 88 10 90C11 83 20 80 26 85C29 78 40 77 44 84C48 80 56 81 58 87C63 86 68 90 67 95C70 97 70 101 68 103"
		/>
		<path
			class="ln none"
			d="M162 101C164 94 157 88 150 90C149 83 140 80 134 85C131 78 120 77 116 84C112 80 104 81 102 87C97 86 92 90 93 95C90 97 90 101 92 103"
		/>
		<!-- Curls inside the smoke. -->
		<path
			class="ln thin none"
			d="M14 93Q15 89 19 90.5M33 87Q35 83.5 39 85.5M50 91Q52 88 55.5 89.5M60 96Q62 93.5 64 95"
		/>
		<path
			class="ln thin none"
			d="M146 93Q145 89 141 90.5M127 87Q125 83.5 121 85.5M110 91Q108 88 104.5 89.5M100 96Q98 93.5 96 95"
		/>
	</g>
{:else if art === 'space-moon'}
	<g data-story-art="space-moon">
		<defs>
			<radialGradient id={id('helmet')}>
				<stop offset="0.6" class="stop-glass clear" />
				<stop offset="1" class="stop-glass" />
			</radialGradient>
		</defs>
		{@render sky(110, 26)}
		{#snippet earthSurface()}
			<path class="leaf" d="M143 10Q147 9 148 12Q146 16 143 15Q141 13 143 10Z" />
			<path class="leaf" d="M148 17Q151 16 152 19Q150 21 148 20Z" />
		{/snippet}
		{@render sphere('earth', 147, 15, 6.5, 'water-deep', earthSurface)}
		{#snippet moonSurface()}
			<path class="mare" d="M88 70Q98 62 112 66Q120 72 110 78Q98 80 88 70Z" />
			<path class="mare" d="M126 62Q140 58 150 64Q152 72 140 74Q128 72 126 62Z" />
			{#each MOON_CRATERS as crater (crater.x)}
				<ellipse class="ln thin rock" cx={crater.x} cy={crater.y} rx={crater.rx} ry={crater.ry} />
				<path
					class="shade"
					d="M{crater.x - crater.rx} {crater.y}A{crater.rx} {crater.ry} 0 0 1 {crater.x +
						crater.rx} {crater.y}A{crater.rx} {crater.ry * 0.55} 0 0 0 {crater.x -
						crater.rx} {crater.y}Z"
				/>
			{/each}
		{/snippet}
		{@render sphere('moon', 124, 110, 52, 'rock', moonSurface, false)}
		<!-- The companion floats in its suit, turned a little. -->
		<g
			transform="rotate({ASTRONAUT.tilt} {ASTRONAUT.x + ASTRONAUT.size / 2} {ASTRONAUT.y +
				ASTRONAUT.size / 2})"
		>
			<g transform="translate({ASTRONAUT.x} {ASTRONAUT.y}) scale({SUIT_SCALE})">
				{@render suitBack()}
			</g>
			<StoryDino x={ASTRONAUT.x} y={ASTRONAUT.y} size={ASTRONAUT.size} mood="idle" />
			<g transform="translate({ASTRONAUT.x} {ASTRONAUT.y}) scale({SUIT_SCALE})">
				{@render suitFront()}
			</g>
		</g>
		<!-- Coffee escaping the cup in round drops, each with its trail. -->
		{#each COFFEE_DROPS as drop (drop.x)}
			<path class="trail" d={drop.trail} />
			<circle class="ln coffee" cx={drop.x} cy={drop.y} r={drop.r} />
			<path
				class="shade"
				d={crescentPath(drop.x, drop.y, drop.r, -drop.r * 0.4, -drop.r * 0.4, drop.r)}
			/>
			<circle
				class="light"
				cx={round(drop.x - drop.r * 0.35)}
				cy={round(drop.y - drop.r * 0.4)}
				r={round(drop.r * 0.3)}
			/>
		{/each}
		<g transform="rotate(22 102 46)">
			<path
				class="ln i"
				d="M111.4 40.4C117.6 40 119.4 44 118.8 47.2C118.2 50.8 115 53.2 110.6 53L110.8 49.8C113.6 49.9 115.3 48.4 115.6 46.6C115.9 44.8 114.8 43.2 111.2 43.5Z"
			/>
			<path class="ln i" d="M92 38L93.6 55Q94 58.5 97.5 58.5H107.5Q111 58.5 111.4 55L113 38Z" />
			<clipPath id={id('cup')}>
				<path d="M92 38L93.6 55Q94 58.5 97.5 58.5H107.5Q111 58.5 111.4 55L113 38Z" />
			</clipPath>
			<g clip-path="url(#{id('cup')})">
				<path class="shade" d="M106 36Q109 48 106 60H116V36Z" />
				<path class="light" d="M95.6 41Q96 48 97.4 54.5Q96.4 48 96.8 41Z" />
				<path class="ln thin none" d="M92 44Q102.5 46 113 44" />
			</g>
			<ellipse class="ln white" cx="102.5" cy="38" rx="10.5" ry="2.8" />
			<ellipse class="coffee" cx="102.5" cy="38.3" rx="8.6" ry="2" />
			<!-- The last of the coffee is just leaving: a blob still holding on. -->
			<path
				class="ln coffee"
				d="M97.6 38.6Q99 35.4 102.4 35.2Q105.8 35.4 107.4 38.4Q102.4 39.6 97.6 38.6Z"
			/>
			<circle class="ln coffee" cx="102.6" cy="31.2" r="2.5" />
			<path class="shade" d={crescentPath(102.6, 31.2, 2.5, -1, -1, 2.5)} />
			<circle class="light" cx="101.8" cy="30.3" r="0.7" />
			<path class="trail" d="M97.4 33.4Q96.6 31.6 97 29.8M107.8 33.4Q108.6 31.6 108.2 29.8" />
		</g>
	</g>
{:else if art === 'space-comet'}
	<g data-story-art="space-comet">
		<defs>
			<radialGradient id={id('halo')}>
				<stop offset="0" class="stop-halo" />
				<stop offset="0.5" class="stop-halo soft" />
				<stop offset="1" class="stop-halo clear" />
			</radialGradient>
			<linearGradient id={id('dust')} gradientUnits="userSpaceOnUse" x1="76" y1="60" x2="0" y2="96">
				<stop offset="0" class="stop-white" />
				<stop offset="0.35" class="stop-tail" />
				<stop offset="1" class="stop-tail clear" />
			</linearGradient>
			<linearGradient id={id('ion')} gradientUnits="userSpaceOnUse" x1="74" y1="60" x2="0" y2="52">
				<stop offset="0" class="stop-ion" />
				<stop offset="1" class="stop-ion clear" />
			</linearGradient>
		</defs>
		{@render sky(40, 30)}
		<!-- A ringed planet far behind. -->
		<g transform="rotate(-14 140 84)">
			<path class="ln thin d" d={ringHalf(140, 84, 20, 4.6, 0.72, 'back')} />
			{@render sphere('planet', 140, 84, 11, 'astre-d', nothing)}
			<path class="ln thin d" d={ringHalf(140, 84, 20, 4.6, 0.72, 'front')} />
		</g>
		<!-- The tail, left behind: soft veils that fade away, and a sorry little face. -->
		<circle fill="url(#{id('halo')})" cx="74" cy="62" r="12" />
		<path fill="url(#{id('ion')})" d="M76 60C58 53 34 47 -4 45V54C30 56 56 61 76 63Z" />
		<path
			fill="url(#{id('dust')})"
			d="M77 59C60 56 40 57 22 62C14 64.4 6 66 -4 67V100C24 92 52 74 77 65Q80 62 77 59Z"
		/>
		<path fill="url(#{id('dust')})" d="M76 60.5C60 61 40 68 18 82C34 75 56 66 76 63.5Z" />
		<path
			class="streak fine"
			d="M70 60.5C52 59.5 32 62 8 70M66 65C48 71 32 80 14 94M72 62.5C56 64 38 70 20 80"
		/>
		<path class="tail-edge" d="M77 59Q80 62 77 65" />
		{#each TAIL_DUST as [x, y, r] (`${x}-${y}`)}
			<circle class="star track" cx={x} cy={y} {r} />
		{/each}
		<g transform="translate(65 62.6) rotate(-14) scale(1.3)">
			<ellipse class="ln thin white" cx="-2.6" cy="0" rx="1.9" ry="2.3" />
			<ellipse class="ln thin white" cx="2.4" cy="0" rx="1.9" ry="2.3" />
			<circle class="ink" cx="-1.8" cy="-0.7" r="1.05" />
			<circle class="ink" cx="3.2" cy="-0.7" r="1.05" />
			<path class="ln thin none" d="M-4.6 -3Q-3 -3.2 -1.2 -4.2M1.2 -4.2Q3 -3.2 4.6 -3" />
			<path class="ln thin none" d="M-1.4 4.2Q0 3 1.4 4.2" />
			<path
				class="ln thin water"
				d="M-4.2 2.2Q-3.4 3.6 -3.4 4.4A0.8 0.8 0 0 1 -5 4.4Q-5 3.6 -4.2 2.2Z"
			/>
		</g>
		<!-- The way the comet went. -->
		{#each COMET_TRACK as dot (dot.x)}
			<circle class="star track" cx={dot.x} cy={dot.y} r={dot.r} />
		{/each}
		<circle fill="url(#{id('halo')})" cx="122" cy="30" r="26" />
		<path class="streak" d="M106 40Q100 43 94 44.5M109 45Q104 49 98 51.5M104 34.5Q99 36 93 36" />
		<g transform="translate(122 30) rotate(-24)">
			<clipPath id={id('nucleus')}>
				<path d={NUCLEUS} />
			</clipPath>
			<path class="ice" d={NUCLEUS} />
			<g clip-path="url(#{id('nucleus')})">
				<ellipse class="ln thin water" cx="-4" cy="-8.6" rx="1.8" ry="1.1" />
				<ellipse class="ln thin water" cx="1.5" cy="9" rx="1.6" ry="1" />
				<ellipse class="ln thin water" cx="-8" cy="4.5" rx="1.1" ry="0.8" />
				<path class="shade" d={nightSide(0, 0, 12)} />
				<path class="light" d={crescentPath(0, 0, 11.4, 0.9, 0.9, 11.4)} />
			</g>
			<path class="ln bold none" d={NUCLEUS} />
		</g>
		{@render face(123, 30.5, -14, 0.5, 'smile', 160, 6)}
	</g>
{:else if art === 'space-giants'}
	<g data-story-art="space-giants">
		{@render sky(80, 56)}
		{#snippet stripes()}
			<g transform="rotate(22 4 66)">
				<path class="g" d="M-50 30Q4 38 58 30V35Q4 43 -50 35Z" />
				<path class="sand" d="M-50 46Q4 54 58 46V53Q4 61 -50 53Z" />
				<path class="g" d="M-50 64Q4 72 58 64V68Q4 76 -50 68Z" />
				<path class="wood" d="M-50 80Q4 88 58 80V86Q4 94 -50 86Z" />
				<path class="ln thin none" d="M-50 46Q4 54 58 46M-50 53Q4 61 58 53M-50 80Q4 88 58 80" />
				<ellipse class="ln thin j" cx="26" cy="89" rx="7" ry="3.8" />
				<ellipse class="light" cx="25" cy="88" rx="3.4" ry="1.4" />
			</g>
		{/snippet}
		{@render sphere('left', 4, 66, 46, 'astre-b', stripes)}
		{#snippet iceBands()}
			<path class="water" d="M40 4Q84 12 128 4V8Q84 16 40 8Z" />
			<path class="water" d="M40 -10Q84 -2 128 -10V-7Q84 1 40 -7Z" />
		{/snippet}
		{@render sphere('top', 84, -12, 34, 'astre-a', iceBands, false)}
		<g transform="rotate(-22 156 58)">
			<path class="ln sand" d={ringHalf(156, 58, 60, 12, 0.74, 'back')} />
			{@render sphere('right', 156, 58, 36, 'astre-c', nothing)}
			<path class="ln sand" d={ringHalf(156, 58, 60, 12, 0.74, 'front')} />
			<path class="ln thin none" d="M101.6 58A54.4 10.9 0 0 0 210.4 58" />
		</g>
		<circle class="ln thin metal" cx="58" cy="22" r="3" />
		<circle class="ln thin rock" cx="112" cy="90" r="2.2" />
		<!-- The little rocket they all look at. -->
		<g transform="translate(82 74) rotate(6) scale(0.5) translate(-80 -40)">
			{@render rocket('small')}
		</g>
		{@render face(28, 56, 22, 1.05, 'o', 82, 70)}
		{@render face(84, 12, -6, 0.85, 'hmm', 82, 70)}
		{@render face(139, 47, -18, 1, 'smile', 82, 70)}
	</g>
{:else if art === 'space-comma'}
	<g data-story-art="space-comma">
		{@render sky(40, 70)}
		{#snippet pointSurface()}
			<ellipse class="ln thin b" cx="134" cy="77" rx="2" ry="1.2" />
		{/snippet}
		{@render sphere('point', 136, 80, 7, 'astre-b', pointSurface)}
		{@render sphere('far', 26, 74, 4, 'astre-a', nothing)}
		<clipPath id={id('comma')}>
			<path d={COMMA_PATH} />
		</clipPath>
		<path class="astre-d" d={COMMA_PATH} />
		<g clip-path="url(#{id('comma')})">
			<ellipse class="ln thin h" cx="68" cy="62" rx="4.4" ry="2.8" />
			<ellipse class="ln thin h" cx="94" cy="52" rx="2.8" ry="1.8" />
			<ellipse class="ln thin h" cx="89" cy="84" rx="3.2" ry="2" />
			<path class="shade" d={nightSide(COMMA.x, COMMA.y, COMMA.r)} />
			<path class="shade" d="M107 56C106.5 80 94 94 60 100C82 90 99 78 105 56Z" />
			<ellipse class="light" cx="68" cy="44" rx="8" ry="3.8" transform="rotate(-40 68 44)" />
		</g>
		<path class="ln bold none" d={COMMA_PATH} />
		{#each RESTING as being (being.angle)}
			{@render inhabitant(being.x, being.y, being.angle, being.tone, being.pose)}
		{/each}
	</g>
{:else if art === 'space-ending'}
	<g data-story-art="space-ending">
		<defs>
			<linearGradient id={id('gutter-left')} x1="1" y1="0" x2="0" y2="0">
				<stop offset="0" class="stop-gutter" />
				<stop offset="1" class="stop-gutter clear" />
			</linearGradient>
			<linearGradient id={id('gutter-right')} x1="0" y1="0" x2="1" y2="0">
				<stop offset="0" class="stop-gutter" />
				<stop offset="1" class="stop-gutter clear" />
			</linearGradient>
		</defs>
		{@render sky(120, 20)}
		<path class="ln bold a" d="M9 17Q9 12 14 12H146Q151 12 151 17V91Q151 96 146 96H14Q9 96 9 91Z" />
		<path class="ln thin page-edge" d="M13 19Q46 14 80 20V93Q46 88 13 92Z" />
		<path class="ln thin page-edge" d="M147 19Q114 14 80 20V93Q114 88 147 92Z" />
		<path class="ln page" d="M14 17Q47 12 80 18V91Q47 86 14 90Z" />
		<path class="ln page" d="M146 17Q113 12 80 18V91Q113 86 146 90Z" />
		<path fill="url(#{id('gutter-left')})" d="M70 16.6Q75 17.2 80 18V91Q75 90 70 89.6Z" />
		<path fill="url(#{id('gutter-right')})" d="M90 16.6Q85 17.2 80 18V91Q85 90 90 89.6Z" />
		<!-- Left page: scribbled notes, a doodled rocket and the flag of the next stop. -->
		<path class="ln thin none" d="M21 27Q25 25 29 27T37 27T45 27T53 26.5M57 27Q61 25 65 27T71 27" />
		<path class="ln thin none" d="M21 35Q25 33 29 35T37 35M41 35Q45 33 49 35T57 35T65 34.5" />
		<path class="ln thin none" d="M21 43Q25 41 29 43T37 43T45 43" />
		<path
			class="ln thin none"
			d="M58 50C59.5 43 62.5 37.5 66 35C69.5 37.5 72.5 43 74 50L71.5 53H60.5Z"
		/>
		<circle class="ln thin none" cx="66" cy="44.5" r="2.2" />
		<path class="ln thin none" d="M62.5 55.5Q66 62 69.5 55.5" />
		<path class="ln thin none" d="M58.5 47L55 54L59.5 52.5M73.5 47L77 54L72.5 52.5" />
		<path class="star ln thin" d={starPath(68, 78, 4.6, 2)} />
		<g transform="translate(-18 2)">
			<clipPath id={id('flag')}>
				<path d="M42 59Q48 56 54 59T66 59V69Q60 66 54 69T42 69Z" />
			</clipPath>
			<path class="ln metal" d="M41 58.6Q41 57.2 42.2 57.2Q43.4 57.2 43.4 58.6V84Q42.2 85 41 84Z" />
			<path class="white" d="M42 59Q48 56 54 59T66 59V69Q60 66 54 69T42 69Z" />
			<g clip-path="url(#{id('flag')})">
				<path class="ink" d={checkerPath(42, 56, 6, 4, 4)} />
				<path class="shade" d="M54 54Q60 60 54 72H70V54Z" />
			</g>
			<path class="ln none" d="M42 59Q48 56 54 59T66 59V69Q60 66 54 69T42 69Z" />
			<circle class="ln thin c" cx="42.2" cy="56.4" r="1.6" />
		</g>
		<!-- Right page: the photo of the Earth, taped down. -->
		<g transform="translate(113 50) rotate(5)">
			<path class="shade" d="M-20 -24H24V30H-20Z" />
			<path class="ln white" d="M-22 -26H22V28H-22Z" />
			<path class="ln night" d="M-18 -22H18V14H-18Z" />
			<circle class="star" cx="-13" cy="-17" r="0.7" />
			<circle class="star" cx="13.5" cy="9" r="0.6" />
			<circle class="star" cx="12" cy="-18" r="0.5" />
			<circle class="star" cx="-14" cy="8" r="0.5" />
			<circle class="atmosphere" cx="-1" cy="-3" r="14.6" />
			{#snippet earthSurface()}
				<path
					class="ln thin leaf"
					d="M-9 -12Q-5 -15 -1 -13Q2 -11 0 -8Q-3 -6 -2 -3Q0 1 -2 5Q-4 8 -6 5Q-7 1 -9 -1Q-12 -3 -11 -7Q-11 -10 -9 -12Z"
				/>
				<path class="ln thin leaf" d="M4 -10Q8 -11 10 -8Q11 -5 8 -4Q5 -4 4 -7Z" />
				<path class="ln thin sand" d="M3 0Q6 -1 7 2Q7 5 4 6Q2 4 3 0Z" />
				<path class="cloud" d="M-14 -5Q-8 -8 -2 -6Q4 -4 9 -6" />
				<path class="cloud" d="M-10 4Q-4 2 1 4" />
				<path class="cloud" d="M2 -14Q6 -15.5 10 -13.5" />
			{/snippet}
			{@render sphere('photo-earth', -1, -3, 12.5, 'water-deep', earthSurface)}
			{@render sphere('photo-moon', 12, -15, 2.6, 'rock', nothing)}
			<path class="ln thin none" d="M-14 20Q-10 18.5 -6 20T2 20T10 19.5" />
			<path
				class="ln tape"
				d="M-27 -27L-15 -33L-12.5 -28L-14 -27.6L-13 -25.6L-24 -20L-25 -22L-26 -21.2Z"
			/>
			<path class="ln tape" d="M27 -27L15 -33L12.5 -28L14 -27.6L13 -25.6L24 -20L25 -22L26 -21.2Z" />
		</g>
		{#each NOTEBOOK_RINGS as ring (ring)}
			<path class="ring-edge" d="M76 {ring}C76 {ring - 3.5} 84 {ring - 3.5} 84 {ring}" />
			<path class="ring" d="M76 {ring}C76 {ring - 3.5} 84 {ring - 3.5} 84 {ring}" />
		{/each}
	</g>
{/if}

<style>
	.ln {
		stroke: var(--dd-color-story-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.bold {
		stroke-width: var(--dd-border-width-drawing-bold);
	}

	.thin {
		stroke-width: var(--dd-border-width-thin);
	}

	.none {
		fill: none;
	}

	/* Modelling: night side and gleam, laid over a shape. */
	.shade {
		fill: var(--dd-color-story-shade);
		fill-opacity: var(--dd-opacity-story-shade);
		fill-rule: evenodd;
	}

	.light {
		fill: var(--dd-color-story-light);
		fill-opacity: var(--dd-opacity-story-light);
	}

	.glint,
	.gleam,
	.streak,
	.trail,
	.tail-edge,
	.steam,
	.cloud {
		fill: none;
		stroke: var(--dd-color-story-light);
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.glint,
	.gleam,
	.streak,
	.trail,
	.cloud {
		stroke-opacity: var(--dd-opacity-story-light);
	}

	.fine {
		stroke-width: var(--dd-border-width-thin);
	}

	.glint.wide {
		stroke-width: var(--dd-border-width-focus);
	}

	.hose-edge,
	.ring-edge {
		fill: none;
		stroke: var(--dd-color-story-line);
		stroke-width: var(--dd-border-width-target);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.hose,
	.ring {
		fill: none;
		stroke: var(--dd-color-story-metal);
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.star {
		fill: var(--dd-color-story-star);
	}

	.track {
		fill-opacity: var(--dd-opacity-story-light);
	}

	.ink {
		fill: var(--dd-color-story-ink);
	}

	.white {
		fill: var(--dd-color-story-white);
	}

	.cheek {
		fill: var(--dd-color-story-f);
		fill-opacity: var(--dd-opacity-story-light);
	}

	.bubble {
		fill: var(--dd-color-story-sky);
		fill-opacity: var(--dd-opacity-glass);
	}

	.night {
		fill: var(--dd-color-story-night);
	}

	.metal {
		fill: var(--dd-color-story-metal);
	}

	.window {
		fill: var(--dd-color-rocket-window);
	}

	.smoke {
		fill: var(--dd-color-rocket-smoke);
	}

	.ice {
		fill: var(--dd-color-story-sky);
	}

	.coffee {
		fill: var(--dd-color-story-wood);
	}

	.rock {
		fill: var(--dd-color-story-rock);
	}

	.mare {
		fill: var(--dd-color-story-soil);
		fill-opacity: var(--dd-opacity-glass);
	}

	.sand {
		fill: var(--dd-color-story-sand);
	}

	.wood {
		fill: var(--dd-color-story-wood);
	}

	.water {
		fill: var(--dd-color-story-water);
	}

	.water-deep {
		fill: var(--dd-color-story-water-deep);
	}

	.atmosphere {
		fill: var(--dd-color-story-water);
		fill-opacity: var(--dd-opacity-glass);
	}

	.leaf {
		fill: var(--dd-color-story-leaf);
	}

	.page {
		fill: var(--dd-color-story-page);
	}

	.page-edge {
		fill: var(--dd-color-story-page-edge);
	}

	.tape {
		fill: var(--dd-color-story-c);
		fill-opacity: var(--dd-opacity-glass);
	}

	.a {
		fill: var(--dd-color-story-a);
	}

	.b {
		fill: var(--dd-color-story-spot);
	}

	.c {
		fill: var(--dd-color-story-c);
	}

	.d {
		fill: var(--dd-color-story-d);
	}

	.e {
		fill: var(--dd-color-story-e);
	}

	.f {
		fill: var(--dd-color-story-f);
	}

	.g {
		fill: var(--dd-color-story-g);
	}

	.h {
		fill: var(--dd-color-story-h);
	}

	.i {
		fill: var(--dd-color-story-i);
	}

	.j {
		fill: var(--dd-color-story-j);
	}

	.n {
		fill: var(--dd-color-story-n);
	}

	.o {
		fill: var(--dd-color-story-o);
	}

	.astre-a {
		fill: var(--dd-color-astre-a);
	}

	.astre-b {
		fill: var(--dd-color-astre-b);
	}

	.astre-c {
		fill: var(--dd-color-astre-c);
	}

	.astre-d {
		fill: var(--dd-color-astre-d);
	}

	/* Gradient stops. */
	.stop-night {
		stop-color: var(--dd-color-story-night);
	}

	.stop-dusk {
		stop-color: var(--dd-color-astre-dim);
	}

	.stop-nebula {
		stop-color: var(--dd-color-story-m);
		stop-opacity: var(--dd-opacity-story-shade);
	}

	.stop-glow {
		stop-color: var(--dd-color-story-spark);
		stop-opacity: var(--dd-opacity-story-light);
	}

	.stop-white {
		stop-color: var(--dd-color-story-white);
	}

	.stop-flame-hot {
		stop-color: var(--dd-color-rocket-flame-inner);
	}

	.stop-flame {
		stop-color: var(--dd-color-rocket-flame-outer);
	}

	.stop-flame-tip {
		stop-color: var(--dd-color-story-a);
	}

	.stop-glass {
		stop-color: var(--dd-color-story-sky);
		stop-opacity: var(--dd-opacity-glass);
	}

	.stop-halo {
		stop-color: var(--dd-color-story-star);
		stop-opacity: var(--dd-opacity-story-light);
	}

	.stop-halo.soft {
		stop-opacity: var(--dd-opacity-story-shade);
	}

	.stop-tail {
		stop-color: var(--dd-color-story-star);
		stop-opacity: var(--dd-opacity-story-light);
	}

	.stop-ion {
		stop-color: var(--dd-color-story-water);
		stop-opacity: var(--dd-opacity-story-light);
	}

	.stop-gutter {
		stop-color: var(--dd-color-story-shade);
		stop-opacity: var(--dd-opacity-story-shade);
	}

	.clear {
		stop-opacity: 0;
	}
</style>
