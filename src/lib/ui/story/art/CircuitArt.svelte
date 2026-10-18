<svelte:options namespace="svg" />

<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import StoryDino from '../StoryDino.svelte';

	interface Props {
		/** One of `STORY_ART_GROUPS.circuit`. */
		art: string;
	}

	let { art }: Props = $props();
	const uid = $props.id();

	type Crew = 'none' | 'wheel' | 'horn' | 'helmet';
	type Badge = 'learner' | 'ring' | 'diamond';
	type Pose = 'belly' | 'up' | 'tear' | 'point';
	type Hair = 'cap' | 'curly' | 'bun' | 'spiky' | 'long';

	const round = (value: number) => Math.round(value * 100) / 100;

	function normal(ax: number, ay: number, bx: number, by: number): [number, number] {
		const length = Math.hypot(bx - ax, by - ay) || 1;
		return [-(by - ay) / length, (bx - ax) / length];
	}

	/**
	 * A bent limb (arm, leg, sleeve, rod) from (x0, y0) to (x1, y1) around the bend (cx, cy); w0 and
	 * w1 are half-widths. Both ends are rounded, so the limb joins its body without a seam.
	 */
	function limb(
		x0: number,
		y0: number,
		cx: number,
		cy: number,
		x1: number,
		y1: number,
		w0: number,
		w1: number
	): string {
		const [ax, ay] = normal(x0, y0, cx, cy);
		const [bx, by] = normal(cx, cy, x1, y1);
		const sum = Math.hypot(ax + bx, ay + by) || 1;
		const mx = (ax + bx) / sum;
		const my = (ay + by) / sum;
		const wc = (w0 + w1) / 2 / Math.max(0.5, mx * ax + my * ay);
		const p = (x: number, y: number) => `${round(x)} ${round(y)}`;
		return (
			`M${p(x0 + ax * w0, y0 + ay * w0)}Q${p(cx + mx * wc, cy + my * wc)} ${p(x1 + bx * w1, y1 + by * w1)}` +
			`A${w1} ${w1} 0 0 0 ${p(x1 - bx * w1, y1 - by * w1)}` +
			`Q${p(cx - mx * wc, cy - my * wc)} ${p(x0 - ax * w0, y0 - ay * w0)}` +
			`A${w0} ${w0} 0 0 0 ${p(x0 + ax * w0, y0 + ay * w0)}Z`
		);
	}

	/** Five spokes of a rim, for a wheel of radius 10 around (0, 0). */
	const SPOKES = Array.from({ length: 5 }, (_, k) => {
		const angle = (k * 2 * Math.PI) / 5 - Math.PI / 2;
		const p = (r: number, da: number) =>
			`${round(r * Math.cos(angle + da))} ${round(r * Math.sin(angle + da))}`;
		return `M${p(1.6, -0.55)}L${p(5.7, -0.2)}L${p(5.7, 0.2)}L${p(1.6, 0.55)}Z`;
	}).join('');

	/** The twelve marks of the station clock, every 30 degrees; the four main ones are longer. */
	const CLOCK_MARKS = Array.from({ length: 12 }, (_, i) => {
		const angle = (i * Math.PI) / 6;
		const inner = i % 3 === 0 ? 6.4 : 7.6;
		return {
			id: i,
			d: `M${round(inner * Math.sin(angle))} ${round(-inner * Math.cos(angle))}L${round(8.6 * Math.sin(angle))} ${round(-8.6 * Math.cos(angle))}`
		};
	});

	const KERB = Array.from({ length: 18 }, (_, i) => ({
		id: i,
		x: i * 10 - 6,
		tone: i % 2 === 0 ? 'red' : 'white'
	}));

	/** A four-pointed sparkle around (0, 0). */
	const SPARKLE = 'M0 -4Q0.6 -0.6 4 0Q0.6 0.6 0 4Q-0.6 0.6 -4 0Q-0.6 -0.6 0 -4Z';

	const CLOUD =
		'M-15 0C-19.5 0 -20 -6.5 -14 -7C-14 -12.5 -6.5 -14.5 -4 -9.5C-2 -16.5 9 -16.5 10 -8C15.5 -9 19 -2.5 14.5 0Z';
	const CLOUD_SHADE = 'M-21 -3.4C-8 -0.6 8 -0.6 21 -4.2V3H-21Z';
	const CANOPY =
		'M-7 -7C-11 -7.5 -10.5 -14 -6 -14.5C-6.5 -20 2 -21.5 3.5 -16.5C8.5 -17 10.5 -10 6.5 -7Z';
	const CANOPY_SHADE = 'M-12 -9C-4 -6 4 -7 12 -12V0H-12Z';

	/** The race car, side view, nose to the right, wheels standing on y = 0. */
	const CAR_BODY =
		'M3 -9L2 -18Q2 -24 8 -25.5C14 -27 18 -32.5 27 -32.5C35 -32.5 40 -28.5 46 -28.5L80 -28.5C86 -28.5 90 -31.5 100 -31.5C110 -31.5 116 -25 123 -20.5C128 -17 129.5 -13 128.5 -9L127 -6L112 -6A13 13 0 1 0 88 -6L38 -6A13 13 0 1 0 14 -6L5 -6Z';
	const CAR_STRIPE = 'M-2 -22.5C40 -24.8 90 -25.2 132 -22L132 -19C90 -22.2 40 -21.8 -2 -19.6Z';
	const CAR_SHADE = 'M-2 -12.5C40 -10 90 -10 132 -12.5L132 0L-2 0Z';
	const CAR_LIGHT =
		'M10 -26C16 -29.6 24 -31.6 31 -31.2C24 -29.8 17 -28 10 -25Z M88 -29.4C96 -31 106 -31 114 -27.4C106 -29 97 -29.2 88 -28.2Z';

	/** The giant brass horn's bell, along +x from its throat at (0, 0). */
	const BELL = 'M0 -2C8 -2.2 13 -5 18.5 -13.5L18.5 13.5C13 5 8 2.2 0 2Z';

	/** Three arcs of sound in front of the bell, in its own frame. */
	const SOUND_WAVES = [14, 19, 24]
		.map((r) => {
			const a = (40 * Math.PI) / 180;
			return `M${round(10 + r * Math.cos(a))} ${round(-r * Math.sin(a))}A${r} ${r} 0 0 1 ${round(10 + r * Math.cos(a))} ${round(r * Math.sin(a))}`;
		})
		.join('');

	/** Pennants hanging from the line `M20 10Q80 26 162 8`, each one fixed by its top edge. */
	const BUNTING = Array.from({ length: 9 }, (_, i) => {
		const at = (t: number) => ({
			x: (1 - t) ** 2 * 20 + 2 * (1 - t) * t * 80 + t ** 2 * 162,
			y: (1 - t) ** 2 * 10 + 2 * (1 - t) * t * 26 + t ** 2 * 8
		});
		const a = at(0.08 + i * 0.1);
		const b = at(0.13 + i * 0.1);
		const tipX = (a.x + b.x) / 2;
		const tipY = (a.y + b.y) / 2 + 8;
		return {
			id: i,
			tone: ['tone-a', 'tone-c', 'tone-i', 'tone-e', 'tone-m', 'tone-f'][i % 6],
			d: `M${round(a.x)} ${round(a.y)}L${round(b.x)} ${round(b.y)}Q${round(b.x - 1)} ${round(tipY - 3)} ${round(tipX)} ${round(tipY)}Q${round(a.x + 1)} ${round(tipY - 3)} ${round(a.x)} ${round(a.y)}Z`
		};
	});

	/** The bending part of the two rails, cubics from the station to the far hills. */
	const FAR_RAIL = [38, 81, 22, 81, 20, 52, -2, 50.6] as const;
	const NEAR_RAIL = [38, 87, 18, 87, 18, 52.4, -2, 52] as const;
	const railPath = (r: readonly number[]) => `M162 ${r[1]}H${r[0]}C${r.slice(2).join(' ')}`;

	function railPoint(t: number, r: readonly number[]) {
		const u = 1 - t;
		const w = [u ** 3, 3 * u * u * t, 3 * u * t * t, t ** 3];
		return {
			x: w.reduce((sum, k, i) => sum + k * (r[i * 2] ?? 0), 0),
			y: w.reduce((sum, k, i) => sum + k * (r[i * 2 + 1] ?? 0), 0)
		};
	}

	/** Sleepers of the bending track, between its two rails. */
	const TIES = [0.1, 0.24, 0.38, 0.52, 0.66, 0.8].map((t, id) => {
		const far = railPoint(t, FAR_RAIL);
		const near = railPoint(t, NEAR_RAIL);
		const dx = (near.x - far.x) * 0.25;
		const dy = (near.y - far.y) * 0.25;
		return {
			id,
			d: `M${round(far.x - dx)} ${round(far.y - dy)}L${round(near.x + dx)} ${round(near.y + dy)}`
		};
	});

	/** Puffs of smoke from the chimney, oldest first. */
	const SMOKE = [
		{ x: 96, y: 39.6, r: 4.4 },
		{ x: 103, y: 36.4, r: 5.6 },
		{ x: 111, y: 39.4, r: 5 },
		{ x: 118, y: 35.4, r: 6 },
		{ x: 126, y: 38.6, r: 5.2 },
		{ x: 132.4, y: 36.6, r: 4.6 },
		{ x: 138, y: 40.6, r: 3.8 },
		{ x: 142.6, y: 44, r: 3 },
		{ x: 145, y: 47.6, r: 2.2 }
	];

	const FAN_TORSO = 'M-7.4 1C-8 -5 -7.6 -10.6 -5.2 -13.2Q0 -15.8 5.2 -13.2C7.6 -10.6 8 -5 7.4 1Z';
	const FAN_TORSO_SHADE = 'M2.6 -14.4C6.4 -12.4 7.8 -6 7.4 1L4 1C4.8 -5 4.6 -10.4 2.6 -14.4Z';

	const PODIUM = [
		{ x: 20, top: 70, w: 38, tone: 'metal' },
		{ x: 102, top: 76, w: 38, tone: 'spot' },
		{ x: 58, top: 58, w: 44, tone: 'star' }
	];

	const CONFETTI = [
		{ x: 10, y: 14, r: 20, tone: 'tone-a' },
		{ x: 30, y: 30, r: -30, tone: 'tone-i' },
		{ x: 50, y: 8, r: 45, tone: 'tone-e' },
		{ x: 70, y: 22, r: -60, tone: 'tone-j' },
		{ x: 112, y: 8, r: -15, tone: 'tone-m' },
		{ x: 132, y: 30, r: 30, tone: 'tone-l' },
		{ x: 150, y: 12, r: -40, tone: 'tone-f' },
		{ x: 96, y: 26, r: 10, tone: 'tone-o' },
		{ x: 6, y: 44, r: 60, tone: 'tone-c' },
		{ x: 154, y: 46, r: -20, tone: 'tone-e' }
	] as const;
</script>

<!-- A filled shape with its own shade and light, clipped to it, under its outline. -->
{#snippet form(id: string, d: string, tone: string, shade: string, light: string, edge: string)}
	<clipPath id="{uid}-{id}"><path {d} /></clipPath>
	<path class={tone} {d} />
	<g clip-path="url(#{uid}-{id})">
		{#if shade}<path class="shade" d={shade} />{/if}
		{#if light}<path class="light" d={light} />{/if}
	</g>
	<path class="line open {edge}" {d} />
{/snippet}

{#snippet sky(bottom: number, high: string, low: string)}
	<linearGradient id="{uid}-sky" x1="0" y1="0" x2="0" y2="1">
		<stop class={high} offset="0" />
		<stop class={low} offset="1" />
	</linearGradient>
	<rect x="-2" y="-2" width="164" height={bottom + 2} fill="url(#{uid}-sky)" />
{/snippet}

{#snippet cloud(id: string, x: number, y: number, s: number)}
	<g transform="translate({x} {y}) scale({s})">
		{@render form(id, CLOUD, 'white', CLOUD_SHADE, '', '')}
	</g>
{/snippet}

{#snippet tree(id: string, x: number, y: number, s: number)}
	<g transform="translate({x} {y}) scale({s})">
		<path class="line wood" d="M-1.4 0.5L-0.8 -9L0.8 -9L1.4 0.5Z" />
		{@render form(id, CANOPY, 'leaf', CANOPY_SHADE, '', '')}
	</g>
{/snippet}

{#snippet kerb(y: number, h: number)}
	{#each KERB as block (block.id)}
		<path class="line thin {block.tone}" d="M{block.x} {y}h10l-3 {h}h-10z" />
	{/each}
{/snippet}

<!-- Asphalt from `top` down, with a kerb along its far edge. -->
{#snippet track(top: number)}
	<rect class="metal" x="-2" y={top} width="164" height={102 - top} />
	<path class="shade" d="M-2 {top + 12}C50 {top + 9} 110 {top + 9} 162 {top + 12}V102H-2Z" />
	<path class="light-line" d="M-2 {top + 7}H162" />
	{@render kerb(top - 3.5, 3.5)}
{/snippet}

{#snippet wheel(cx: number, cy: number, r: number, rim: string)}
	<g transform="translate({cx} {cy}) scale({r / 10})">
		<circle class="line dark" r="10" />
		<path class="light-line" d="M-7.6 -3.8A8.5 8.5 0 0 1 -3 -7.9" />
		<circle class="line thin {rim}" r="6.5" />
		<circle class="dark" r="5" />
		<path class="line thin {rim}" d={SPOKES} />
		<path class="shade" d="M-6.5 0A6.5 6.5 0 0 0 6.5 0A6.5 3.4 0 0 1 -6.5 0Z" />
		<circle class="line thin metal" r="1.9" />
		<circle class="dark" r="0.7" />
	</g>
{/snippet}

<!-- A racing helmet, side view, visor to the right, centred on (0, 0). -->
{#snippet sideHelmet(id: string, tone: string)}
	{@render form(
		id,
		'M-9.5 4C-11 -6 -4.5 -10.5 1 -10.5C7.5 -10.5 11 -6 10.4 1C10.2 3.6 8.6 5 6 5L-7.5 5C-8.8 5 -9.4 4.6 -9.5 4Z',
		tone,
		'M-12 1C-4 3 4 3 12 0V6H-12Z',
		'M-6 -7C-3 -9.4 2 -9.6 5 -8C1 -8 -3 -7 -6 -5Z',
		''
	)}
	<path class="line thin red" d="M-3.4 -10.2C-1.4 -6 -1.4 0 -2.8 5L0.4 5C1.8 0 1.8 -6 0 -10.5Z" />
	<path class="line thin dark" d="M2 -4.4C5 -5.6 8.8 -5 10.4 -2.4L10.4 1.4C7 2 4 1.6 2 0.4Z" />
	<path class="light" d="M4 -3.6C6 -4.2 8 -3.8 9 -2.6L5 -2Z" />
{/snippet}

<!-- The race car; `crew` is what sits in the cockpit. -->
{#snippet raceCar(key: string, tone: string, badge: Badge, crew: Crew)}
	<ellipse class="shade" cx="64" cy="0.4" rx="68" ry="3.2" />
	<path class="dark" d="M14 -6A13 13 0 1 1 38 -6Z M88 -6A13 13 0 1 1 112 -6Z" />
	<path class="line thin dark" d="M0 -7.5L11 -7.5L9.6 -3.6L1.6 -3.6Z" />
	<path class="line thin dark" d="M108 -6.6L131 -6.6Q132.6 -5.6 131 -4.2L110 -4.2Z" />
	<path
		class="line thin metal"
		d="M-4 -12.6Q-5.6 -12.6 -5.6 -10.6Q-5.6 -8.6 -4 -8.6L8 -8.6L8 -12.6Z"
	/>
	<ellipse class="dark" cx="-4.6" cy="-10.6" rx="0.9" ry="1.5" />
	<!-- Rear wing on its swan-neck strut. -->
	<path class="line thin dark" d={limb(16, -25, 15, -33, 11.4, -40.6, 1.5, 1.1)} />
	<path
		class="line {tone}"
		d="M-4 -41.2C4 -45 14 -45.6 24 -43.2C25 -42.2 25 -40.8 24 -40.2C14 -40.6 4 -40 -4 -38.4C-5 -39.4 -5 -40.4 -4 -41.2Z"
	/>
	<path class="light" d="M0 -41.6C6 -43.6 14 -44 21 -42.8C14 -42.6 6 -42 0 -40.6Z" />
	<path
		class="line thin {tone}"
		d="M-4.4 -46.8Q-2.6 -47.8 -0.8 -46.8L-0.4 -37.6Q-2.2 -36.6 -4 -37.4Z"
	/>
	<path class="shade" d="M-2.4 -47.4Q-1.6 -47.4 -0.8 -46.8L-0.4 -37.6Q-1.2 -37 -2 -36.9Z" />
	<!-- Mirror on its stalk. -->
	<path class="line thin metal" d={limb(91, -26, 91.4, -31, 92.4, -35.6, 1, 0.9)} />
	<path
		class="line thin {tone}"
		d="M88.4 -36.6Q90 -39.8 96.8 -38.6L97.2 -34.4Q92 -33 88.4 -36.6Z"
	/>
	<path class="glass" d="M88.6 -36.4Q89.6 -37.8 91 -38.2L91 -35.2Q89.6 -35.4 88.6 -36.4Z" />
	{#if crew === 'helmet'}
		<g transform="translate(62 -33)">{@render sideHelmet(`${key}-helmet`, 'white')}</g>
	{:else if crew === 'wheel' || crew === 'horn'}
		<StoryDino x={34} y={-72.5} size={56} flip />
	{/if}
	{#if crew === 'wheel'}
		<path class="line dark" d={limb(68, -22, 65, -27, 62, -31, 1.2, 1.2)} />
		<path
			class="line thin dark"
			fill-rule="evenodd"
			d="M45.6 -31A16.4 5 0 1 0 78.4 -31A16.4 5 0 1 0 45.6 -31ZM47.6 -31A14.4 3.2 0 1 0 76.4 -31A14.4 3.2 0 1 0 47.6 -31Z"
		/>
		<path class="line thin dark" d={limb(48, -31, 55, -31.6, 62, -31.2, 0.8, 0.8)} />
		<ellipse class="line thin tone-l" cx="62" cy="-31" rx="2.6" ry="1.6" />
	{/if}
	{#if crew === 'horn'}
		<path class="line thin metal" d={limb(107, -27, 107, -37, 106, -45, 0.9, 0.9)} />
	{/if}
	<!-- Body. -->
	<clipPath id="{uid}-{key}-body"><path d={CAR_BODY} /></clipPath>
	<path class={tone} d={CAR_BODY} />
	<g clip-path="url(#{uid}-{key}-body)">
		<path class="white" d={CAR_STRIPE} />
		<path class="shade" d={CAR_SHADE} />
		<path class="light" d={CAR_LIGHT} />
		<path class="line thin open" d="M50 -28.5L49 -6M84 -28.5L85 -6" />
	</g>
	<path class="line open bold" d={CAR_BODY} />
	{#if badge !== 'learner'}
		<path
			class="line dark"
			d="M41 -20C47 -21.2 53 -20.6 57.4 -15.6L43 -13.6C40.6 -15 40 -18 41 -20Z"
		/>
		<path class="light-line" d="M43 -19.4C47 -20 51 -19.6 54 -17.4" />
	{/if}
	<circle class="line thin metal" cx="38" cy="-27" r="1.6" />
	{#if badge === 'learner'}
		<circle class="line red" cx="67" cy="-17" r="10.5" />
		<text class="learner" x="67" y="-17" text-anchor="middle" dominant-baseline="central"
			>{m.story_art_learner()}</text
		>
	{:else if badge === 'ring'}
		<circle class="line white" cx="67" cy="-17" r="7" />
	{:else}
		<path class="line white" d="M67 -25L75 -17L67 -9L59 -17Z" />
	{/if}
	<path
		class="line thin star"
		d="M113 -25C118 -26.6 122 -24.6 125 -20.4C120 -19.8 116 -21 113 -25Z"
	/>
	<circle class="light" cx="117.4" cy="-23.6" r="1" />
	<path class="line thin red" d="M2.2 -21.6L5.6 -22.2L5.6 -18L2.4 -17.6Z" />
	{@render wheel(26, -11, 11, 'metal')}
	{@render wheel(100, -11, 11, 'metal')}
	<path
		class="glass line thin"
		d="M81 -28.5C80 -34 78 -38.4 74.4 -41.4L77.6 -42.2C83 -39 87 -34 89.4 -29.4Z"
	/>
	<path
		class="light"
		d="M78.6 -39.4C81.4 -37 83.4 -34 84.6 -30.4L83 -30.2C82 -33.4 80.4 -36.4 78.6 -39.4Z"
	/>
	{#if crew === 'horn'}
		<!-- The giant horn: its bulb in the dino's hand, its tube along the hood, its bell over the nose. -->
		<path class="line star" d={limb(82, -31, 95, -31, 100, -39, 1.7, 1.7)} />
		<path class="line star" d={limb(100, -39, 104, -46, 113, -47.5, 1.7, 1.7)} />
		<g transform="translate(112 -47.5) rotate(-26) scale(1.35)">
			<path class="line star" d={BELL} />
			<path class="light" d="M2 -1.4C8 -1.8 12 -4 16 -10.4L17 -9C13 -3 8 -0.4 2 -0.2Z" />
			<ellipse class="line star" cx="18.5" cy="0" rx="3.6" ry="13.5" />
			<ellipse class="dark" cx="19" cy="0" rx="2.2" ry="10.6" />
			<path class="line open" d={SOUND_WAVES} />
		</g>
		<path class="line red" d="M84 -34.4C84.6 -31.8 84.6 -30.2 84 -27.6L82 -28.6L82 -33.4Z" />
		<ellipse class="line red" cx="79.4" cy="-31" rx="4.4" ry="4.8" />
		<path class="light" d="M76.6 -33C77.4 -34.6 79 -35.2 80.4 -35C79 -34 78 -33 77.6 -31.8Z" />
	{/if}
{/snippet}

<!-- A spectator in the stand, seen down to the waist at (0, 0), laughing. -->
{#snippet fan(
	x: number,
	y: number,
	s: number,
	tilt: number,
	shirt: string,
	skin: string,
	hair: Hair,
	pose: Pose
)}
	<g transform="translate({x} {y}) rotate({tilt}) scale({s})">
		<path class="line {shirt}" d={FAN_TORSO} />
		<path class="shade" d={FAN_TORSO_SHADE} />
		<path class="line thin open" d="M-2.2 -14.6Q0 -12.6 2.2 -14.6" />
		{#if hair === 'bun'}
			<circle class="line dark" cx="0" cy="-29.4" r="3" />
		{:else if hair === 'cap'}
			<path
				class="line tone-j"
				d="M4.6 -25.4C8.6 -26.6 12 -26 13.2 -24.2C10.6 -23.2 7.6 -23.4 5.6 -23.8Z"
			/>
		{/if}
		<circle class="line {skin}" cx="-6.4" cy="-20.6" r="1.8" />
		<circle class="line {skin}" cx="6.4" cy="-20.6" r="1.8" />
		<circle class="line {skin}" cx="0" cy="-21" r="6.5" />
		{#if hair === 'cap'}
			<path
				class="line tone-j"
				d="M-6.7 -23C-6.7 -28.8 -3.2 -29.8 0 -29.8C3.2 -29.8 6.7 -28.8 6.7 -23Q0 -24.8 -6.7 -23Z"
			/>
		{:else if hair === 'curly'}
			<path
				class="line wood"
				d="M-6.9 -21C-8.8 -22.6 -7.8 -26 -5.6 -26C-5.8 -29 -2.2 -29.8 -0.6 -28.2C0.8 -30 4.8 -29.4 5 -26.6C7.8 -26.4 8.4 -23 6.8 -21C5 -23.6 2 -24.4 0 -24.2C-2.4 -24.4 -5.2 -23.4 -6.9 -21Z"
			/>
		{:else if hair === 'bun'}
			<path
				class="line dark"
				d="M-6.5 -21C-6.7 -26.4 -3.4 -27.8 0 -27.8C3.4 -27.8 6.7 -26.4 6.5 -21C4.4 -23.4 2 -24 0 -24C-2 -24 -4.4 -23.4 -6.5 -21Z"
			/>
		{:else if hair === 'spiky'}
			<path
				class="line fur-light"
				d="M-6.5 -22.4C-7 -25 -6.2 -27 -4.8 -27.6Q-4.6 -30 -3.6 -30.6Q-2.6 -28.6 -1.6 -28.4Q-0.6 -31 0.4 -31.2Q1.2 -28.6 2.2 -28.4Q3.2 -30.4 4.4 -30.4Q4.6 -28 5 -27.4C6.4 -26.8 7.2 -25 6.5 -22.4Q0 -25.4 -6.5 -22.4Z"
			/>
		{:else}
			<path
				class="line tone-p"
				d="M-7 -15.6C-9 -22 -7.8 -29 0 -29C7.8 -29 9 -22 7 -15.6C5.8 -17.6 5.6 -21 5 -23.6C2 -22.6 -2 -22.6 -5 -23.6C-5.6 -21 -5.8 -17.6 -7 -15.6Z"
			/>
		{/if}
		<path
			class="line thin open"
			d="M-4.2 -21.6Q-2.8 -23.6 -1.4 -21.6M1.4 -21.6Q2.8 -23.6 4.2 -21.6"
		/>
		<path class="line thin ink" d="M-3.4 -19.2Q0 -12.6 3.4 -19.2Q0 -18.2 -3.4 -19.2Z" />
		<path class="tone-a" d="M-1.8 -16.4Q0 -14.6 1.8 -16.4Q0 -17.6 -1.8 -16.4Z" />
		<path class="line thin water" d="M-7.4 -22.6Q-9.6 -20.6 -8.6 -19.2Q-7.2 -18.6 -7.4 -22.6Z" />
		<path class="line thin water" d="M7.4 -22.6Q9.6 -20.6 8.6 -19.2Q7.2 -18.6 7.4 -22.6Z" />
		{#if pose === 'up'}
			<path class="line {shirt}" d={limb(5.8, -11.6, 11.4, -14, 11.6, -22.4, 2.2, 1.8)} />
			<circle class="line {skin}" cx="11.6" cy="-23.6" r="2.3" />
		{:else if pose === 'point'}
			<path class="line {shirt}" d={limb(5.8, -11.6, 11, -9, 16, -6.4, 2.2, 1.8)} />
			<path class="line thin {skin}" d={limb(17, -6, 18.8, -5.4, 20.6, -4.8, 0.8, 0.7)} />
			<circle class="line {skin}" cx="16.8" cy="-6.2" r="2.2" />
		{:else}
			<path class="line {shirt}" d={limb(5.8, -11.6, 10.2, -6, 3.6, -3.4, 2.2, 1.8)} />
			<circle class="line {skin}" cx="3.2" cy="-3.4" r="2.2" />
		{/if}
		{#if pose === 'tear'}
			<path class="line {shirt}" d={limb(-5.8, -11.6, -11.8, -13, -7, -19, 2.2, 1.8)} />
			<circle class="line {skin}" cx="-6.4" cy="-19.8" r="2.2" />
		{:else}
			<path class="line {shirt}" d={limb(-5.8, -11.6, -10.2, -6, -3.6, -3.4, 2.2, 1.8)} />
			<circle class="line {skin}" cx="-3.2" cy="-3.4" r="2.2" />
		{/if}
	</g>
{/snippet}

<!-- Train vehicles, side view, moving right, rails at y = 0. -->
{#snippet locomotive()}
	<path
		class="line dark"
		d="M32.5 -28L33 -35.5Q30.6 -36.5 30.6 -39H39.4Q39.4 -36.5 37 -35.5L37.5 -28Z"
	/>
	<path
		class="line thin tone-p"
		d="M30.2 -40.4H39.8Q40.4 -40.4 40.4 -39.6V-38.6H29.6V-39.6Q29.6 -40.4 30.2 -40.4Z"
	/>
	<path
		class="line tone-l"
		d="M22.6 -28C22.6 -32.6 24.4 -34.2 26.4 -34.2C28.4 -34.2 30.2 -32.6 30.2 -28Z"
	/>
	<path
		class="line tone-l"
		d="M17.8 -28C17.8 -30.6 18.8 -31.6 19.8 -31.6C20.8 -31.6 21.8 -30.6 21.8 -28Z"
	/>
	<path class="line thin dark" d="M39.4 -31.6H43.4Q44 -31.6 44 -31V-28H39.4Z" />
	<circle class="line thin star" cx="44" cy="-29.8" r="1.4" />
	{@render form(
		'loco-boiler',
		'M17 -28.6H35.4Q37 -28.6 37 -27V-13Q37 -11.4 35.4 -11.4H17Z',
		'tone-k',
		'M10 -16H40V0H10Z',
		'M17 -26.6H36V-24.4H17Z',
		''
	)}
	<path class="line thin tone-l" d="M23.4 -28.6h1.8v17.2h-1.8zM30.4 -28.6h1.8v17.2h-1.8z" />
	<path class="line dark" d="M36 -29Q42.8 -29 43.2 -20Q42.8 -11 36 -11Z" />
	<path class="light" d="M38 -26.4Q40.6 -25 41 -21.6L39.6 -21.6Q39.2 -24.4 38 -26.4Z" />
	{@render form(
		'loco-cab',
		'M0 -12V-30Q0 -32.6 2.6 -32.6H15.4Q17.6 -32.6 17.6 -30.4V-12Z',
		'tone-j',
		'M-2 -18H20V0H-2Z',
		'M1.4 -31.2H16.4V-29.8H1.4Z',
		''
	)}
	<path
		class="line thin dark"
		d="M3 -28.6H12.6Q13.6 -28.6 13.6 -27.6V-21H3Q2.4 -21 2.4 -21.6V-28Q2.4 -28.6 3 -28.6Z"
	/>
	<!-- The driver leans back to look for the missing wagon. -->
	<circle class="line thin sand" cx="6" cy="-24.2" r="2.8" />
	<path class="line thin tone-i" d="M3.2 -25.6Q3.4 -28.4 6.2 -28.4Q8.8 -28.4 8.8 -25.6Z" />
	<path class="line thin tone-i" d="M3.4 -25.8L1.4 -25.6Q1.4 -24.8 3.4 -24.8Z" />
	<circle class="ink" cx="4.8" cy="-23.8" r="0.5" />
	<path class="line thin water" d="M8.8 -25.4Q9.8 -23.8 9.2 -23.2Q8.4 -23.2 8.8 -25.4Z" />
	<path class="light" d="M10.4 -28L13 -28L11 -21.4L8.4 -21.4Z" />
	<path
		class="line dark"
		d="M-2.6 -32C4 -36.6 13 -36.6 20 -32.6Q20.6 -31 19 -31C13 -34 4 -34 -2 -30.6Q-3.4 -31 -2.6 -32Z"
	/>
	<path class="line dark" d="M-1 -12.6Q-1 -10 1 -10L43 -10Q44.4 -10 44.4 -11.4L44.4 -12.6Z" />
	<path class="line thin tone-j" d="M41 -8L47.6 -8L49.6 -1Q49.8 0 48.6 0H40Z" />
	<path class="line thin open" d="M42.8 -8L42.6 0M44.8 -8L45.2 0M46.6 -8L47.6 0" />
	<path
		class="line thin red"
		d="M42.6 -13.4H45.6Q46.2 -13.4 46.2 -12.8V-8.6Q46.2 -8 45.6 -8H42.6Z"
	/>
	<path class="line thin metal" d="M46 -12H47.6Q48.4 -12 48.4 -11.2V-9.6Q48.4 -8.8 47.6 -8.8H46Z" />
	{@render wheel(40, -3, 3, 'tone-j')}
	<path
		class="line thin metal"
		d="M33.6 -11H39.6Q40.6 -11 40.6 -10V-6Q40.6 -5 39.6 -5H33.6Q32.6 -5 32.6 -6V-10Q32.6 -11 33.6 -11Z"
	/>
	{@render wheel(9, -5, 5, 'tone-j')}
	{@render wheel(19.5, -5, 5, 'tone-j')}
	{@render wheel(30, -5, 5, 'tone-j')}
	<path class="line thin metal" d={limb(11, -6.6, 21, -6.6, 31.6, -6.6, 0.9, 0.9)} />
	<path class="line thin metal" d={limb(37.6, -8, 30, -7.4, 21.4, -6.6, 1, 0.8)} />
	<circle class="dark" cx="11" cy="-6.6" r="0.6" />
	<circle class="dark" cx="21.4" cy="-6.6" r="0.6" />
	<circle class="dark" cx="31.6" cy="-6.6" r="0.6" />
	<path class="line thin white" d="M44 -3C47 -6 51 -5 51 -2.6C53.4 -3 54 0 52 0.4L44 0.4Z" />
{/snippet}

{#snippet tender()}
	{@render form(
		'tender',
		'M0.6 -11V-24Q0.6 -25.6 2.2 -25.6H17.8Q19.4 -25.6 19.4 -24V-11Z',
		'tone-k',
		'M-2 -16H22V0H-2Z',
		'M1.6 -24.6H18.4V-23.2H1.6Z',
		''
	)}
	<path class="line thin open gold-line" d="M3.4 -22.4H16.6V-14H3.4Z" />
	<path
		class="line dark"
		d="M0.6 -25.6C2 -29 5 -29.6 6.6 -28C8 -31 12 -31 13.6 -28.6C15 -30 18 -29 19.4 -25.6Z"
	/>
	<circle class="light" cx="7" cy="-27.6" r="0.7" />
	<circle class="light" cx="13" cy="-28.4" r="0.7" />
	<path class="line dark" d="M-0.6 -12Q-0.6 -9 1.4 -9H18.6Q20.6 -9 20.6 -12Z" />
	{@render wheel(5, -3.4, 3.4, 'tone-j')}
	{@render wheel(15, -3.4, 3.4, 'tone-j')}
{/snippet}

{#snippet coach()}
	{@render form(
		'coach',
		'M0 -10V-24.6Q0 -26 1.4 -26H24.6Q26 -26 26 -24.6V-10Z',
		'tone-c',
		'M-2 -14H28V0H-2Z',
		'M1 -25H25V-23.6H1Z',
		''
	)}
	<path class="line thin tone-j" d="M0 -14.6H26V-12.6H0Z" />
	{#each [3, 10.4, 17.8] as wx (wx)}
		<path
			class="line thin water-deep"
			d="M{wx +
				0.8} -22.6h3.8q0.8 0 0.8 0.8v4.6q0 0.8 -0.8 0.8h-3.8q-0.8 0 -0.8 -0.8v-4.6q0 -0.8 0.8 -0.8z"
		/>
		<path class="light" d="M{wx + 1.4} -22h1.6l-1.6 4z" />
	{/each}
	<circle class="line thin spot" cx="13" cy="-19" r="1.8" />
	<path class="line thin open" d="M12.2 -18.2Q13 -17.6 13.8 -18.2" />
	<path
		class="line dark"
		d="M-1 -25.6Q13 -31.6 27 -25.6Q27.4 -24.6 26.4 -24.6Q13 -29.6 -0.4 -24.6Q-1.4 -24.6 -1 -25.6Z"
	/>
	<path class="line dark" d="M0.6 -10.6Q0.6 -8 2.6 -8H23.4Q25.4 -8 25.4 -10.6Z" />
	{@render wheel(3.8, -2.8, 2.8, 'metal')}
	{@render wheel(9.8, -2.8, 2.8, 'metal')}
	{@render wheel(16.2, -2.8, 2.8, 'metal')}
	{@render wheel(22.2, -2.8, 2.8, 'metal')}
{/snippet}

{#snippet boxcar()}
	{@render form(
		'train-boxcar',
		'M0 -10V-24.6Q0 -25.4 0.8 -25.4H21.2Q22 -25.4 22 -24.6V-10Z',
		'wood',
		'M-2 -14H24V0H-2Z',
		'',
		''
	)}
	<path class="line thin open" d="M3.6 -25V-10.4M18.4 -25V-10.4" />
	<path class="line thin tone-p" d="M7 -23.4H15V-11H7Z" />
	<path class="line thin open" d="M7 -23.4L15 -11M15 -23.4L7 -11" />
	<path class="line metal" d="M-0.8 -25.2Q11 -28.6 22.8 -25.2V-24.2H-0.8Z" />
	<path class="line dark" d="M0.6 -10.6Q0.6 -8 2.6 -8H19.4Q21.4 -8 21.4 -10.6Z" />
	{@render wheel(5, -3, 3, 'metal')}
	{@render wheel(17, -3, 3, 'metal')}
{/snippet}

{#snippet tanker()}
	<path class="line tone-l" d="M9 -24C9 -27 10 -27.8 11 -27.8C12 -27.8 13 -27 13 -24Z" />
	{@render form(
		'tanker',
		'M2.4 -11.6C-0.6 -11.6 -0.6 -24.4 2.4 -24.4H19.6C22.6 -24.4 22.6 -11.6 19.6 -11.6Z',
		'tone-m',
		'M-2 -16C6 -15 16 -15 24 -16V0H-2Z',
		'M2 -22.6C8 -23.4 14 -23.4 20 -22.6V-21.4C14 -22 8 -22 2 -21.4Z',
		''
	)}
	<path class="line thin open" d="M6 -24.2V-11.8M16 -24.2V-11.8" />
	<path class="line dark" d="M-0.6 -12Q-0.6 -9 1.4 -9H20.6Q22.6 -9 22.6 -12Z" />
	{@render wheel(5, -3, 3, 'metal')}
	{@render wheel(17, -3, 3, 'metal')}
{/snippet}

{#if art === 'circuit-opening'}
	<g data-story-art="circuit-opening">
		{@render sky(70, 'stop-water', 'stop-sky')}
		{@render cloud('cloud-a', 30, 16, 0.9)}
		{@render cloud('cloud-b', 100, 10, 0.6)}
		{@render form(
			'hills',
			'M-2 58C20 48 44 50 66 55C90 47 122 44 162 52V70H-2Z',
			'leaf',
			'M-2 62C40 58 120 56 162 60V72H-2Z',
			'',
			''
		)}
		{@render tree('tree-a', 104, 54, 0.8)}
		{@render tree('tree-b', 118, 52, 1)}
		<!-- A far grandstand, full of tiny fans. -->
		<path class="line thin metal" d="M4 36V58M56 32V58" />
		<path class="line thin rock" d="M2 58L4 42L58 38L60 58Z" />
		{#each [0, 1, 2] as row (row)}
			{#each Array.from({ length: 13 }, (_, i) => i) as i (i)}
				<circle
					class="line thin {['tone-a', 'tone-c', 'tone-i', 'tone-e', 'tone-m', 'tone-f'][
						(i + row * 2) % 6
					]}"
					cx={7 + i * 4 + row * 0.6}
					cy={45.4 - i * 0.3 + row * 4.4}
					r="1.5"
				/>
			{/each}
		{/each}
		<path class="line thin open" d="M3.4 49.6L59 45.6M3 54L59.6 50" />
		<path class="line white" d="M0 37L60 30.6L62 33.4L1 39.8Z" />
		<!-- The start lights: all red, nobody moves. -->
		<path class="line thin metal" d={limb(150, 66, 150.6, 40, 150, 12, 1.6, 1.4)} />
		<path class="line thin metal" d={limb(150, 13, 132, 13, 112, 13, 1.2, 1.2)} />
		{#each [116, 126, 136] as lx (lx)}
			<path
				class="line thin dark"
				d="M{lx - 3.6} 13Q{lx - 3.6} 11.6 {lx - 2.2} 11.6H{lx + 2.2}Q{lx + 3.6} 11.6 {lx +
					3.6} 13V24.4Q{lx + 3.6} 26 {lx + 2.2} 26H{lx - 2.2}Q{lx - 3.6} 26 {lx - 3.6} 24.4Z"
			/>
			<circle class="line thin red" cx={lx} cy="16" r="2.2" />
			<circle class="line thin red" cx={lx} cy="21.6" r="2.2" />
			<circle class="light" cx={lx - 0.7} cy="15.3" r="0.7" />
			<circle class="light" cx={lx - 0.7} cy="20.9" r="0.7" />
		{/each}
		<path class="line wood" d="M-2 60H162V66H-2Z" />
		{#each [0, 1, 2, 3, 4, 5, 6, 7] as i (i)}
			<path
				class="line thin {i % 2 === 0 ? 'tone-c' : 'tone-b'}"
				d="M{i * 21 - 2} 60.6h20v4.8h-20z"
			/>
			<path
				class="line thin open white-line"
				d="M{i * 21 + 5} 61.6l3 1.4l-3 1.4M{i * 21 + 10} 61.6l3 1.4l-3 1.4"
			/>
		{/each}
		{@render track(72)}
		<!-- The start line, chequered, slanting away like the track. -->
		<clipPath id="{uid}-start">
			<path d="M140 72H150L158 102H146Z" />
		</clipPath>
		<path class="white" d="M140 72H150L158 102H146Z" />
		<g clip-path="url(#{uid}-start)">
			{#each [0, 1, 2, 3, 4, 5, 6] as row (row)}
				{#each [0, 1, 2] as col (col)}
					{#if (row + col) % 2 === 0}
						<path class="dark" d="M{140 + col * 4 + row * 1.2} {72 + row * 4.4}h4l1.2 4.4h-4z" />
					{/if}
				{/each}
			{/each}
		</g>
		<path class="line thin open" d="M140 72H150L158 102H146Z" />
		<!-- A small cough from the exhaust: the engine has stalled. -->
		<path
			class="line thin white"
			d="M9 84.4Q6 86 3.6 84.6Q1 85.6 -0.4 83.4Q-2 80.6 0.6 79.4Q1.6 76.6 4.6 77.6Q7.6 76.4 9 79.4Q11 81 10.4 82.6Z"
		/>
		<path
			class="line thin white"
			d="M-1 74.6Q-3.6 74.6 -3.2 72.4Q-3 70.2 -0.6 70.6Q1 69 2.6 70.6Q4.6 71.6 3.4 73.6Q2 75.2 -1 74.6Z"
		/>
		<g transform="translate(16 93)">{@render raceCar('opening', 'tone-i', 'learner', 'wheel')}</g>
	</g>
{:else if art === 'circuit-horn'}
	<g data-story-art="circuit-horn">
		{@render sky(60, 'stop-water', 'stop-sky')}
		<!-- The stand: back wall, roof, two rows of fans. -->
		<path class="rock" d="M-2 4H162V52H-2Z" />
		<path class="shade" d="M-2 4H162V20C110 14 50 14 -2 20Z" />
		<path class="line thin metal" d="M30 4V52M130 4V52" />
		<path class="line wood" d="M-2 31H162V35H-2Z" />
		{@render fan(14, 34, 0.78, -8, 'tone-e', 'sand', 'curly', 'belly')}
		{@render fan(42, 34, 0.78, 14, 'tone-m', 'fur', 'spiky', 'up')}
		{@render fan(70, 34, 0.78, -6, 'tone-c', 'p', 'cap', 'tear')}
		{@render fan(128, 34, 0.78, -14, 'tone-a', 'sand', 'long', 'up')}
		{@render fan(152, 34, 0.78, 8, 'tone-n', 'fur', 'curly', 'tear')}
		<path class="line wood" d="M-2 33.4H162V36H-2Z" />
		<!-- This one fell off the bench, backwards. -->
		<path class="line tone-i" d={limb(98, 48, 96, 40, 90, 34, 2.4, 2)} />
		<path class="line tone-i" d={limb(103, 48, 106, 40, 110, 34.6, 2.4, 2)} />
		<path
			class="line dark"
			d="M86.4 33.6Q86 30.4 89 30.6L92 31.4Q93.4 32.4 92 34.2L89 35.6Q86.8 35.8 86.4 33.6Z"
		/>
		<path
			class="line dark"
			d="M108.4 34.2Q107.6 32 110 31.2L113 30.6Q115.6 30.8 114.6 33.4L112 35.4Q109.6 36 108.4 34.2Z"
		/>
		<!-- Their popcorn, still in the air. -->
		<g transform="rotate(-24 104 22)">
			<path class="line white" d="M99.6 18H108.4L107 27.4H101Z" />
			<path class="line thin open" d="M102.4 18.4L102.8 27M105.6 18.4L105.2 27" />
			<path class="red" d="M101 18.4h1.4l0.4 8.6h-1.6zM104 18.4h1.4l-0.2 8.6h-1.4z" />
			<path class="line thin open" d="M99.6 18H108.4L107 27.4H101Z" />
		</g>
		{#each [{ x: 103, y: 13 }, { x: 108, y: 14.6 }, { x: 99, y: 11 }, { x: 112, y: 10 }, { x: 105, y: 8.6 }] as corn (corn.x)}
			<path
				class="line thin fur-light"
				d="M{corn.x -
					1.4} {corn.y}a1.2 1.2 0 0 1 1.4 -1.2a1.2 1.2 0 0 1 1.4 1.2a1.2 1.2 0 0 1 -1.4 1.2a1.2 1.2 0 0 1 -1.4 -1.2z"
			/>
		{/each}
		{@render fan(20, 50, 0.95, 16, 'tone-j', 'spot', 'bun', 'point')}
		{@render fan(50, 50, 0.95, -12, 'tone-b', 'sand', 'cap', 'belly')}
		{@render fan(76, 50, 0.95, 18, 'tone-l', 'fur', 'long', 'tear')}
		{@render fan(132, 50, 0.95, -16, 'tone-f', 'p', 'spiky', 'belly')}
		<path class="line white" d="M-2 46H162V54H-2Z" />
		{#each [0, 1, 2, 3, 4, 5, 6, 7] as i (i)}
			<path
				class="line thin {i % 2 === 0 ? 'tone-i' : 'tone-c'}"
				d="M{i * 21 - 1} 47.4h18v5.2h-18z"
			/>
		{/each}
		<path class="line thin metal" d="M-2 45H162V47H-2Z" />
		<!-- Roof with its striped valance. -->
		<path class="line white" d="M-2 -2H162V5.4C110 7 50 7 -2 5.4Z" />
		{#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as i (i)}
			<path
				class="line thin {i % 2 === 0 ? 'red' : 'white'}"
				d="M{i * 17 - 4} 5.6H{i * 17 + 13}V8.4Q{i * 17 + 4.5} 13 {i * 17 - 4} 8.4Z"
			/>
		{/each}
		<rect class="grass" x="-2" y="54" width="164" height="10" />
		<path class="shade" d="M-2 54H162V56.6H-2Z" />
		{@render track(66)}
		<g transform="translate(144 95) scale(-0.74 0.74)"
			>{@render raceCar('horn', 'tone-k', 'ring', 'horn')}</g
		>
		<g transform="translate(9 44) scale(0.7)"><path class="line thin star" d={SPARKLE} /></g>
	</g>
{:else if art === 'circuit-train'}
	<g data-story-art="circuit-train">
		{@render sky(50, 'stop-water', 'stop-sky')}
		{@render cloud('cloud-a', 26, 16, 0.6)}
		{@render form(
			'hills',
			'M-2 46C20 38 40 40 60 44C84 36 120 34 162 42V54H-2Z',
			'leaf',
			'M-2 48C40 45 120 44 162 46V56H-2Z',
			'',
			''
		)}
		{@render tree('tree-a', 46, 47, 0.7)}
		{@render tree('tree-b', 150, 45, 0.8)}
		<rect class="grass" x="-2" y="47.6" width="164" height="54" />
		<path class="shade" d="M-2 92C60 95 110 95 162 92V102H-2Z" />
		<!-- The track: straight at the station, then bending away to the far hills. -->
		<path class="line rock" d="M162 79H38C24 79 22 49.8 -2 49.4V53.6C16 53.6 14 90 38 90H162Z" />
		{#each Array.from({ length: 16 }, (_, i) => i) as i (i)}
			<path class="line thin wood" d="M{40 + i * 8} 80.4h3.6l0.8 8.2h-5.2z" />
		{/each}
		{#each TIES as tie (tie.id)}
			<path class="line bold open" d={tie.d} />
			<path class="line open wood-line" d={tie.d} />
		{/each}
		{#each [FAR_RAIL, NEAR_RAIL] as rail (rail[1])}
			<path class="line bold open" d={railPath(rail)} />
			<path class="line open metal-line" d={railPath(rail)} />
		{/each}
		<!-- The last wagon, far behind, running to catch up. -->
		<g transform="translate(14.4 57.6) rotate(-6) scale(0.8)">
			<path class="line thin open" d="M-6 -4L-9 -6M-6 0L-10 0M5.6 -5L8 -8" />
			<circle class="line thin dark" cx="-2" cy="3.6" r="1.4" />
			<circle class="line thin dark" cx="2" cy="3.6" r="1.4" />
			<path
				class="line thin tone-f"
				d="M-3.4 -3.8H3.4Q4 -3.8 4 -3.2V2.8H-4V-3.2Q-4 -3.8 -3.4 -3.8Z"
			/>
			<path class="line thin dark" d="M-4.4 -3.6Q0 -6 4.4 -3.6Z" />
			<path class="line thin open" d="M-1.6 -2.4V2M1.6 -2.4V2" />
			<path class="line thin water" d="M5 -2Q6.4 -0.4 5.8 0.4Q4.8 0.4 5 -2Z" />
		</g>
		<path
			class="line thin white"
			d="M19.4 62.6Q17 63 16.8 61.6Q16.8 60 18.4 60.2Q19.6 59.4 20.4 60.6Q21.2 62 19.4 62.6Z"
		/>
		<!-- The station clock, an hour late. -->
		<path class="line metal" d={limb(62, 76, 62, 50, 62, 28, 1.3, 1.3)} />
		<path class="line thin dark" d="M58.6 30.6Q62 27 65.4 30.6Z" />
		<circle class="line dark" cx="62" cy="17" r="12" />
		<circle class="line thin white" cx="62" cy="17" r="10" />
		<g transform="translate(62 17)">
			{#each CLOCK_MARKS as mark (mark.id)}
				<path class="line thin open" d={mark.d} />
			{/each}
			<path class="line open bold" d="M0 0L4.4 2.6" />
			<path class="line open" d="M0 0L0 -7.4" />
			<circle class="red line thin" r="1.2" />
		</g>
		<path class="light" d="M54.6 11.4A9 9 0 0 1 60 8.2L60.4 9.6A7.6 7.6 0 0 0 56 12.4Z" />
		<!-- The smoke trails back over the train. -->
		{#each SMOKE as puff (puff.x)}
			<circle class="line white" cx={puff.x} cy={puff.y} r={puff.r} />
			<path
				class="shade"
				d="M{puff.x - puff.r * 0.8} {puff.y + puff.r * 0.3}A{puff.r} {puff.r} 0 0 0 {puff.x +
					puff.r * 0.8} {puff.y + puff.r * 0.3}A{puff.r} {puff.r * 0.5} 0 0 1 {puff.x -
					puff.r * 0.8} {puff.y + puff.r * 0.3}Z"
			/>
		{/each}
		<!-- The train, already at the station; behind its last car, a broken coupling. -->
		<g transform="translate(34 84.6) scale(0.82)">
			<path class="line thin dark" d={limb(-1, -9.6, -3.6, -7.6, -4, -4.6, 0.7, 0.6)} />
			{#each [20, 45, 74, 98] as hitch (hitch)}
				<path
					class="line thin dark"
					d={limb(hitch, -9.6, hitch + 3, -9.6, hitch + 6, -9.6, 0.7, 0.7)}
				/>
			{/each}
			{@render tanker()}
			<g transform="translate(25 0)">{@render boxcar()}</g>
			<g transform="translate(50 0)">{@render coach()}</g>
			<g transform="translate(79 0)">{@render tender()}</g>
			<g transform="translate(101 0)">{@render locomotive()}</g>
		</g>
	</g>
{:else if art === 'circuit-hat'}
	<g data-story-art="circuit-hat">
		{@render sky(60, 'stop-water', 'stop-sky')}
		{@render cloud('cloud-a', 128, 12, 0.7)}
		<!-- The pit garages. -->
		<path class="line page" d="M-2 22H118V64H-2Z" />
		<path class="line white" d="M-4 18H120V24H-4Z" />
		<path class="shade" d="M-2 24H118V28H-2Z" />
		{#each [6, 44, 82] as gx (gx)}
			<path class="line thin metal" d="M{gx} 30H{gx + 30}V64H{gx}Z" />
			{#each [0, 1, 2, 3, 4, 5, 6, 7] as i (i)}
				<path class="line thin open" d="M{gx} {33.6 + i * 4}H{gx + 30}" />
			{/each}
		{/each}
		<path class="dark" d="M82 50H112V64H82Z" />
		<path class="line thin open" d="M82 50H112" />
		<path class="line thin dark" d="M88 64Q88 58 93 58Q98 58 98 64Z" />
		<path class="line thin dark" d="M98 64Q98 58 103 58Q108 58 108 64Z" />
		<path class="line thin dark" d="M88 58Q88 52 93 52Q98 52 98 58Z" />
		{@render tree('tree-a', 136, 62, 1.3)}
		{@render tree('tree-b', 152, 62, 1)}
		<rect class="metal" x="-2" y="64" width="164" height="38" />
		<path class="shade" d="M-2 76C50 73 110 73 162 76V102H-2Z" />
		<path class="line thin white" d="M-2 68H162V69.6H-2Z" />
		<g transform="translate(66 91) scale(0.68)"
			>{@render raceCar('hat', 'tone-j', 'diamond', 'helmet')}</g
		>
		<!-- The pilot, arms crossed, nose up: no hat, no race. -->
		<g transform="translate(34 95) scale(0.9)">
			<ellipse class="shade" cx="0" cy="0" rx="17" ry="2.6" />
			<path class="line tone-j" d={limb(-5, -30, -6.4, -16, -7, -5, 4.2, 3.4)} />
			<path class="line tone-j" d={limb(5, -30, 6.6, -16, 7.4, -5, 4.2, 3.4)} />
			<path class="line thin open" d="M-7 -20Q-4.6 -18.6 -3 -20M5 -14Q7.6 -12.8 9.4 -14.4" />
			<path
				class="line dark"
				d="M-15 -0.4Q-15.4 -4.6 -11.4 -5.6L-5 -6.4Q-2.6 -6 -2.8 -3L-3 -0.4Z"
			/>
			<path class="line dark" d="M15 -0.4Q15.4 -4.6 11.4 -5.6L5 -6.4Q2.6 -6 2.8 -3L3 -0.4Z" />
			{@render form(
				'pilot-torso',
				'M-11 -50C-12.4 -44 -11.4 -36 -9.4 -28Q0 -25.6 9.4 -28C11.4 -36 12.4 -44 11 -50Q0 -54 -11 -50Z',
				'tone-j',
				'M3 -54C9 -44 9 -34 6 -24H14V-54Z',
				'',
				''
			)}
			<path class="line thin white" d="M-9.4 -28Q0 -25.6 9.4 -28L9.6 -30.6Q0 -28 -9.6 -30.6Z" />
			<path class="line thin open" d="M0 -51.6V-30" />
			<path
				class="line thin white"
				d="M-4.6 -53Q0 -49.4 4.6 -53Q2.6 -55.4 0 -55.4Q-2.6 -55.4 -4.6 -53Z"
			/>
			<!-- Crossed arms: right upper arm, right forearm, left upper arm, left forearm on top. -->
			<path class="line tone-j" d={limb(10, -48, 14.4, -43, 12.4, -36.6, 3.8, 3.4)} />
			<path class="line dark" d="M-11.4 -40.6Q-14 -42 -13 -44.4Q-11 -46.4 -9 -44.4Z" />
			<path class="line tone-j" d={limb(11.6, -36.4, 2, -34.6, -8.6, -40.4, 3.4, 3)} />
			<path class="line tone-j" d={limb(-10, -48, -14.4, -43, -12.4, -36.6, 3.8, 3.4)} />
			<path class="line tone-j" d={limb(-12, -36.4, -2, -35.6, 8.4, -41, 3.4, 3)} />
			<path
				class="line dark"
				d="M7.6 -44.4Q11.4 -45.8 12.4 -42.2Q12.6 -38.6 9 -38.2Q6.2 -38.6 6.4 -41.4Z"
			/>
			<path class="line thin open" d="M-4 -37.6Q0 -36.4 3 -38" />
			<path
				class="line thin open"
				d="M-14 -40Q-12.6 -39 -11.6 -40.4M13.4 -40.6Q12.6 -39.4 11.4 -40"
			/>
			<!-- Head, tilted up. -->
			<g transform="rotate(-10 0 -56)">
				<path class="line fur" d={limb(0, -52, 0, -54.6, 0, -57, 2.6, 2.6)} />
				<circle class="line fur" cx="-8.6" cy="-63.6" r="2" />
				<circle class="line fur" cx="8.6" cy="-63.6" r="2" />
				<circle class="line fur" cx="0" cy="-64" r="8.8" />
				<path
					class="line dark"
					d="M-8.8 -62C-9.6 -66 -9 -69 -7 -70.4L7 -70.4C9 -69 9.6 -66 8.8 -62C8 -64.6 7 -66.4 5 -67Q0 -66 -5 -67C-7 -66.4 -8 -64.6 -8.8 -62Z"
				/>
				<path class="line thin open" d="M-6 -65.2Q-4 -63.8 -2 -65.2M2 -65.2Q4 -63.8 6 -65.2" />
				<path
					class="line thin open"
					d="M-6.4 -68Q-4.4 -69.6 -2.4 -68.4M2.4 -68.4Q4.4 -69.6 6.4 -68"
				/>
				<path class="line thin spot" d="M-2.2 -59.6Q0 -64.4 2.2 -59.6Q0 -58.6 -2.2 -59.6Z" />
				<circle class="ink" cx="-0.9" cy="-59.8" r="0.4" />
				<circle class="ink" cx="0.9" cy="-59.8" r="0.4" />
				<path class="line thin open" d="M-2.6 -57Q-1 -56 0.4 -57Q1.8 -57.8 3 -56.8" />
				<!-- The hat and its feather. -->
				<path
					class="line tone-m"
					d="M-18.6 -68C-14 -73.4 13 -74.4 19.6 -69.4C20.6 -68 19 -66.6 16 -66.6C6 -67 -6 -67 -16 -66C-18.6 -65.8 -19.8 -66.6 -18.6 -68Z"
				/>
				<path
					class="line tone-f"
					d="M7.6 -73C14 -80 12 -92 -2 -96C-10 -98 -18 -94 -20 -88C-16 -91 -10 -91 -6 -89C-12 -88 -15 -84 -15 -80C-10 -84 -4 -85 0 -83C-5 -81 -7 -77 -6 -73C-1 -78 4 -77 4 -74Z"
				/>
				<path class="line thin open" d="M6 -74C8 -82 4 -90 -6 -92" />
				<path class="line thin open" d="M2 -84Q-2 -86 -5 -85M4 -79Q0 -80.6 -3 -79" />
				{@render form(
					'hat-crown',
					'M-10.4 -69.6C-11 -78 -6 -81.6 0 -81.6C6 -81.6 11 -78 10.4 -69.6Q0 -71.4 -10.4 -69.6Z',
					'tone-m',
					'M4 -82C8 -78 8 -74 7 -70H12V-82Z',
					'M-7 -77C-5.4 -79.4 -2.4 -80.4 0 -80.4C-3 -79 -5 -77 -6 -74.6Z',
					''
				)}
				<path
					class="line thin tone-l"
					d="M-10.6 -73Q0 -75 10.6 -73L10.4 -69.6Q0 -71.4 -10.4 -69.6Z"
				/>
				<circle class="line thin tone-l" cx="7.6" cy="-71.6" r="1.6" />
			</g>
		</g>
	</g>
{:else if art === 'circuit-helmet'}
	<g data-story-art="circuit-helmet">
		{@render sky(60, 'stop-water', 'stop-sky')}
		{@render cloud('cloud-a', 22, 14, 0.8)}
		{@render cloud('cloud-b', 128, 22, 0.6)}
		{@render form(
			'hills',
			'M-2 50C24 42 50 44 74 48C100 41 130 40 162 46V64H-2Z',
			'leaf',
			'M-2 54C40 51 120 50 162 53V64H-2Z',
			'',
			''
		)}
		<!-- A wall of old tyres, painted red and white. -->
		{#each Array.from({ length: 12 }, (_, i) => i) as i (i)}
			<ellipse
				class="line {i % 2 === 0 ? 'red' : 'white'}"
				cx={i * 14 + 2}
				cy="58"
				rx="7.4"
				ry="3.6"
			/>
			<ellipse
				class="line {i % 2 === 0 ? 'white' : 'red'}"
				cx={i * 14 + 2}
				cy="53.6"
				rx="7.4"
				ry="3.6"
			/>
			<ellipse class="dark" cx={i * 14 + 2} cy="52.8" rx="3.4" ry="1.4" />
		{/each}
		<rect class="grass" x="-2" y="60" width="164" height="8" />
		{@render track(72)}
		<g transform="translate(4 84) scale(0.56)"
			>{@render raceCar('helmet', 'tone-c', 'ring', 'none')}</g
		>
		<!-- A stack of tyres, right where the copilot is going. -->
		<g transform="translate(142 96)">
			<ellipse class="shade" cx="0" cy="0" rx="15" ry="2.6" />
			{#each [0, 1, 2] as i (i)}
				<path
					class="line {i % 2 === 0 ? 'red' : 'white'}"
					d="M-12 {-i * 8}Q-14.4 {-i * 8 - 4} -12 {-i * 8 - 8}Q0 {-i * 8 - 11} 12 {-i * 8 -
						8}Q14.4 {-i * 8 - 4} 12 {-i * 8}Q0 {-i * 8 + 3} -12 {-i * 8}Z"
				/>
				<path
					class="shade"
					d="M6 {-i * 8 - 8.6}Q13.6 {-i * 8 - 4} 9 {-i * 8 + 0.8}Q12.8 {-i * 8 - 4} 6 {-i * 8 -
						8.6}Z"
				/>
			{/each}
			<ellipse class="line white" cx="0" cy="-24" rx="12" ry="3.4" />
			<ellipse class="line thin dark" cx="0" cy="-24" rx="6" ry="1.6" />
		</g>
		<!-- The copilot: pace notes upside down, helmet down to the chin. -->
		<g transform="translate(96 96)">
			<ellipse class="shade" cx="0" cy="0" rx="16" ry="2.6" />
			<path class="line tone-b" d={limb(-2, -28, -7, -15, -11, -5, 4, 3.2)} />
			<path
				class="line dark"
				d="M-17.6 -0.4Q-17.6 -4.8 -13.6 -5.4L-9 -6Q-6.6 -5.8 -6.8 -3L-7 -0.4Z"
			/>
			<path class="line tone-b" d={limb(2, -28, 10, -18, 9, -5, 4, 3.2)} />
			<path
				class="line dark"
				d="M5 -0.4Q5 -5 8 -6L12 -6.2Q16.4 -5.6 16.6 -2.4Q16.8 -0.4 14.6 -0.4Z"
			/>
			<path class="line thin open" d="M5 -18Q7.6 -16 10.6 -17.6" />
			<path class="line tone-b" d={limb(-2, -44, 8, -44.6, 16, -46.4, 3.2, 2.8)} />
			<path
				class="line dark"
				d="M15.6 -49.4Q19.6 -50.6 20.4 -47.4Q20.6 -44.2 17.2 -43.6Q14.6 -44 14.8 -46.6Z"
			/>
			{@render form(
				'copilot-torso',
				'M-7.6 -48C-10 -41 -9 -33 -6.6 -26Q0 -24 6 -26.4C8 -33 8.6 -41 6.6 -48Q0 -51.4 -7.6 -48Z',
				'tone-b',
				'M-12 -40C-6 -38 -3 -32 -2 -24H-12Z',
				'',
				''
			)}
			<path class="line thin white" d="M-6.6 -26Q0 -24 6 -26.4L6.4 -29Q0 -27 -7 -28.6Z" />
			<path class="line thin open" d="M3.6 -49.6L4.8 -27M-2.6 -40Q-0.6 -38.6 1.6 -40" />
			<!-- Pace notes, upside down. -->
			<g transform="rotate(12 22 -38)">
				<path class="line white" d="M16 -46H28V-31H16Z" />
				<path class="line thin open" d="M18.4 -34.6H25.6M18.4 -37.6H25.6M18.4 -40.6H23" />
				<path class="line thin tone-a" d="M16 -46H28V-43.6H16Z" />
			</g>
			<path class="line tone-b" d={limb(1, -44, 9, -39, 18, -38.4, 3.2, 2.8)} />
			<path
				class="line dark"
				d="M17.6 -41.6Q21.6 -42.8 22.4 -39.2Q22.6 -35.8 19 -35.4Q16.4 -36 16.6 -38.6Z"
			/>
			<!-- Head, and the helmet that swallowed it. -->
			<path class="line sand" d={limb(1, -48, 1.6, -50, 2, -52, 2.6, 2.6)} />
			<path class="line sand" d="M-6 -52Q-5 -45.6 3 -45.4Q10 -45.6 11 -52Z" />
			<path
				class="line thin ink"
				d="M1 -49.4Q3 -48 5 -49.6Q6.6 -50.6 7.6 -49.4Q6 -47.4 3.4 -47.6Q1.6 -47.8 1 -49.4Z"
			/>
			<path class="line thin water" d="M11.4 -52.4Q13 -50.4 12.4 -49.4Q11.2 -49.2 11.4 -52.4Z" />
			<path
				class="line thin dark"
				d="M-8 -52.6Q-11 -46 -8.6 -42.4Q-6.4 -43 -6.6 -45.4Q-7.6 -48 -6 -52Z"
			/>
			<g transform="rotate(-7 2 -66)">
				{@render form(
					'big-helmet',
					'M-16.4 -53C-19.6 -68 -11 -84 3.4 -84C18 -84 23.6 -71 21.6 -57C21 -53.4 19 -51.6 15.6 -51.4L-12 -50.4Q-15.4 -50.4 -16.4 -53Z',
					'white',
					'M-24 -60C-10 -52 10 -52 26 -62V-46H-24Z',
					'M-11 -72C-8 -78 -2 -81.6 4 -81.6C-1.6 -79.4 -6.4 -75.4 -9 -70Z',
					'bold'
				)}
				<path
					class="line thin tone-j"
					d="M-1.4 -83.8C-6.6 -76 -8.4 -63 -6 -50.8L-1.8 -50.9C-3.6 -63 -2.4 -75 2.6 -84Z"
				/>
				<path
					class="line thin tone-i"
					d="M3.4 -84C-0.6 -76 -1.6 -63 0.2 -51L3 -51.1C1.6 -63 2.6 -75 6.4 -83.8Z"
				/>
				<path
					class="line dark"
					d="M9.4 -72.6C14.6 -74 20 -71 22.6 -66L22.4 -60C17.6 -60.6 12.6 -62.6 9 -66.4Q7.8 -69.6 9.4 -72.6Z"
				/>
				<path
					class="light"
					d="M12 -70.4C15.4 -71.4 18.6 -69.6 20.6 -66.6L19.4 -66C17.4 -68.4 14.6 -69.8 12 -70.4Z"
				/>
				<circle class="line thin metal" cx="-11.6" cy="-58" r="1.4" />
			</g>
			<path
				class="line open"
				d="M-22 -76Q-25 -70 -22 -64M24 -86Q28 -82 27.6 -76M-16 -88Q-12 -92 -6 -92"
			/>
		</g>
	</g>
{:else if art === 'circuit-truck'}
	<g data-story-art="circuit-truck">
		{@render sky(60, 'stop-night', 'stop-dusk')}
		{#each [{ x: 6, y: 30, s: 0.6 }, { x: 24, y: 40, s: 0.45 }, { x: 150, y: 8, s: 0.7 }, { x: 140, y: 30, s: 0.5 }, { x: 34, y: 4, s: 0.45 }] as star (star.x)}
			<g transform="translate({star.x} {star.y}) scale({star.s})">
				<path class="line thin star" d={SPARKLE} />
			</g>
		{/each}
		<path class="line thin star" d="M16 4A8 8 0 1 0 16 20A10 10 0 0 1 16 4Z" />
		<!-- The circuit by night, far away. -->
		<path class="night line thin" d="M-2 56V48L14 44L34 46L34 56Z" />
		<path class="night line thin" d="M126 56V46L146 42L162 44V56Z" />
		{#each [6, 12, 18, 24, 136, 142, 148, 154] as wx (wx)}
			<circle class="spark" cx={wx} cy={wx < 100 ? 50 : 49} r="0.9" />
		{/each}
		<rect class="leaf" x="-2" y="56" width="164" height="46" />
		<path class="shade" d="M-2 56H162V102H-2Z" />
		<path class="shade" d="M-2 56H162V102H-2Z" />
		<path class="line thin metal" d="M72 56L88 56L170 102L-10 102Z" />
		<path class="shade" d="M72 56L88 56L170 102L-10 102Z" />
		<path class="white" d="M79.4 58L80.6 58L81 61L79 61Z" />
		<!-- The light of both headlights on the road. -->
		<path class="light" d="M32 90L14 102H66L54 90Z" />
		<path class="light" d="M100 90L94 102H142L122 90Z" />
		<ellipse class="shade" cx="77" cy="91" rx="50" ry="3" />
		<!-- Trailer behind the cab. -->
		{@render form(
			'trailer-side',
			'M120 6L162 14V62L122 56Z',
			'metal',
			'M120 30L162 34V64H120Z',
			'',
			''
		)}
		<path class="line thin tone-l" d="M121 40L162 44V50L121.4 46Z" />
		<path class="line thin open" d="M134 9V58.4M148 11.6V60.2" />
		<path class="line metal" d="M38 8Q38 6 40 6H118Q120 6 120 8V22H38Z" />
		<!-- Exhaust stacks and mirrors, fixed to the cab. -->
		<path class="line metal" d={limb(31, 62, 30.6, 30, 31, 8, 1.8, 1.8)} />
		<path class="line thin dark" d="M29 8.6Q29 5.6 31 5.6Q33 5.6 33 8.6Z" />
		<path class="line metal" d={limb(37, 26, 30, 22, 25, 25, 1, 1)} />
		<path class="line metal" d={limb(119, 26, 126, 22, 131, 25, 1, 1)} />
		{@render form(
			'cab',
			'M36 22Q36 14 44 14H110Q118 14 118 22L119 66H35Z',
			'tone-j',
			'M30 58C60 61 96 61 124 58V70H30Z',
			'M39 30C39 20 41 17 47 16.6L60 16.6C50 18 44 22 43 30Z',
			'bold'
		)}
		{@render form(
			'cab-side',
			'M118 22L125 26L126 64L119 66Z',
			'tone-j',
			'M110 20H130V70H110Z',
			'',
			''
		)}
		<path class="line thin water-deep" d="M119.4 25L124 27.6V40.6L119.8 40.2Z" />
		<path class="line thin dark" d="M120.4 52L123.8 52.6V54.4L120.4 54Z" />
		<path class="line thin metal" d="M119.6 62.4L125.4 61.6V63.6L119.6 64.6Z" />
		<path
			class="line thin dark"
			d="M20.6 25Q20.6 22.4 23.6 22.4H26.6Q29.4 22.4 29.4 25V40Q29.4 43 26.4 43H23.6Q20.6 43 20.6 40Z"
		/>
		<path class="glass" d="M22.4 25H27.6V40.6H22.4Z" />
		<path
			class="line thin dark"
			d="M126.6 25Q126.6 22.4 129.6 22.4H132.4Q135.4 22.4 135.4 25V40Q135.4 43 132.4 43H129.6Q126.6 43 126.6 40Z"
		/>
		<path class="glass" d="M128.4 25H133.6V40.6H128.4Z" />
		<path class="light" d="M23 37L27 28V31L23 39.6Z" />
		<path class="light" d="M129 37L133 28V31L129 39.6Z" />
		<!-- Sun visor, roof lights and air horns. -->
		<path class="line dark" d="M38 17Q38 12.4 44 12.4H110Q116 12.4 116 17V19.4H38Z" />
		{#each [56, 66, 77, 88, 98] as lx (lx)}
			<path
				class="line thin spark"
				d="M{lx - 2.4} 12.6Q{lx - 2.4} 10.4 {lx} 10.4Q{lx + 2.4} 10.4 {lx + 2.4} 12.6Z"
			/>
		{/each}
		<circle class="line thin metal" cx="44" cy="11" r="2.4" />
		<circle class="dark" cx="44" cy="11" r="1" />
		<circle class="line thin metal" cx="110" cy="11" r="2.4" />
		<circle class="dark" cx="110" cy="11" r="1" />
		<!-- Windscreen, with a little tree hanging from the mirror. -->
		<path
			class="line water-deep"
			d="M42 21.6Q42 20 44 20H110Q112 20 112 21.6L113.4 40Q113.4 41.6 111.6 41.6H42.4Q40.6 41.6 40.6 40Z"
		/>
		<path class="light" d="M50 20H60L48 41.6H40.6Z M64 20H68L56 41.6H52Z" />
		<path class="line thin open" d="M86 20V27" />
		<path class="line thin leaf" d="M86 27L89 32H87.4L90 36H82L84.6 32H83Z" />
		<path class="line thin dark" d={limb(56, 41, 66, 39.6, 74, 40.6, 0.7, 0.6)} />
		<path class="line thin dark" d={limb(86, 41, 96, 39.6, 104, 40.6, 0.7, 0.6)} />
		<!-- Brows: one up, one down for the wink. -->
		<path
			class="line thin dark"
			d="M38.6 44Q47 38.6 55.4 43Q55.6 44.4 54.4 44.4Q47 41.4 39.6 45.4Q38.4 45.4 38.6 44Z"
		/>
		<path
			class="line thin dark"
			d="M99 45.4Q107 43.6 115.4 45.2Q115.6 46.6 114.4 46.6Q107 45.2 100 46.8Q98.8 46.6 99 45.4Z"
		/>
		<!-- Grille, a grin. -->
		<path class="line metal" d="M59 45Q59 44 60.4 44H93.6Q95 44 95 45.4L94.4 59Q77 64.6 59.6 59Z" />
		<path class="line thin open" d="M60.4 48.4H93.8M60.6 52.4H94M60.8 56.2Q77 60.6 94.2 56.2" />
		<path class="line thin star" d="M77 44.6L80 47L77 49.4L74 47Z" />
		<!-- Headlights: the left one shines, the right one winks. -->
		<rect class="line metal" x="38.6" y="46.4" width="16.8" height="13.2" rx="5" />
		<rect class="line thin star" x="40.6" y="48.2" width="12.8" height="9.6" rx="3.6" />
		<circle class="light" cx="44" cy="51" r="2" />
		<rect class="line metal" x="98.6" y="46.4" width="16.8" height="13.2" rx="5" />
		<rect class="line thin star" x="100.6" y="48.2" width="12.8" height="9.6" rx="3.6" />
		<path
			class="line thin tone-j"
			d="M100.2 48.6Q100.2 47.8 102 47.8H112Q113.8 47.8 113.8 48.6V54Q107 59.4 100.2 54Z"
		/>
		<path class="line bold open" d="M100.2 54Q107 59.4 113.8 54" />
		<path class="line thin open" d="M114.6 51.6L118.4 50M114.8 54.6L118.6 55.4" />
		<!-- Bumper, number plate, wheels. -->
		{#each [36, 102] as tx (tx)}
			<path
				class="line dark"
				d="M{tx} 74H{tx + 16}V86Q{tx + 16} 91 {tx + 11} 91H{tx + 5}Q{tx} 91 {tx} 86Z"
			/>
			<path
				class="line thin open metal-line"
				d="M{tx + 3} 79l2.5 1.6l2.5 -1.6l2.5 1.6l2.5 -1.6M{tx +
					3} 84l2.5 1.6l2.5 -1.6l2.5 1.6l2.5 -1.6"
			/>
			<path class="light-line" d="M{tx + 2} 78V86" />
		{/each}
		{@render form(
			'bumper',
			'M28 66Q28 63.6 31 63.6H123Q126 63.6 126 66L125.4 74.4Q125.4 77 122.6 77H31.4Q28.6 77 28.6 74.4Z',
			'metal',
			'M24 72C60 74 96 74 130 72V80H24Z',
			'M31 65.2H123V66.6H31Z',
			''
		)}
		<path
			class="line thin white"
			d="M68 66.4H86Q87 66.4 87 67.4V71.6Q87 72.6 86 72.6H68Q67 72.6 67 71.6V67.4Q67 66.4 68 66.4Z"
		/>
		<circle class="line thin spark" cx="37" cy="70.4" r="2.2" />
		<circle class="line thin spark" cx="117" cy="70.4" r="2.2" />
	</g>
{:else if art === 'circuit-ending'}
	<g data-story-art="circuit-ending">
		{@render sky(90, 'stop-water', 'stop-sky')}
		<!-- Bunting from the flag pole. -->
		<path class="line thin open" d="M20 10Q80 26 162 8" />
		{#each BUNTING as pennant (pennant.id)}
			<path class="line thin {pennant.tone}" d={pennant.d} />
		{/each}
		{#each CONFETTI as bit (bit.x)}
			<path
				class="line thin {bit.tone}"
				d="M{bit.x - 3} {bit.y}q1.5 -2 3 0t3 0"
				transform="rotate({bit.r} {bit.x} {bit.y})"
			/>
		{/each}
		<!-- A chequered flag, waving. -->
		<path class="line thin metal" d={limb(20, 92, 20, 50, 20, 8, 1.2, 1.2)} />
		<circle class="line thin tone-l" cx="20" cy="7" r="1.8" />
		<clipPath id="{uid}-flag">
			<path d="M21 10C28 6 34 14 44 10V30C34 34 28 26 21 30Z" />
		</clipPath>
		<path class="white" d="M21 10C28 6 34 14 44 10V30C34 34 28 26 21 30Z" />
		<g clip-path="url(#{uid}-flag)">
			{#each [0, 1, 2, 3, 4] as col (col)}
				{#each [0, 1, 2, 3, 4, 5] as row (row)}
					{#if (row + col) % 2 === 0}
						<rect
							class="dark"
							x={21 + col * 4.6}
							y={6 + row * 4.6 + Math.sin(col) * 1.4}
							width="4.6"
							height="4.6"
						/>
					{/if}
				{/each}
			{/each}
			<path class="shade" d="M30 0C34 12 34 24 30 40H44V0Z" />
		</g>
		<path class="line open" d="M21 10C28 6 34 14 44 10V30C34 34 28 26 21 30Z" />
		<rect class="grass" x="-2" y="90" width="164" height="12" />
		<path class="shade" d="M-2 90H162V92.4H-2Z" />
		<!-- The podium. -->
		<ellipse class="shade" cx="80" cy="94" rx="66" ry="3" />
		{#each PODIUM as step (step.x)}
			<path class="line {step.tone}" d="M{step.x} {step.top}H{step.x + step.w}V94H{step.x}Z" />
			<path class="line thin {step.tone}" d="M{step.x} {step.top}l3 -4h{step.w}l-3 4z" />
			<path class="light" d="M{step.x} {step.top}l3 -4h{step.w}l-3 4z" />
			<path
				class="shade"
				d="M{step.x + step.w - 6} {step.top}H{step.x + step.w}V94H{step.x + step.w - 6}Z"
			/>
			<path class="line open" d="M{step.x} {step.top}H{step.x + step.w}V94H{step.x}Z" />
		{/each}
		<path
			class="line thin leaf"
			d="M74 84Q68 78 70.6 70Q75.6 76 74 84ZM86 84Q92 78 89.4 70Q84.4 76 86 84Z"
		/>
		<path
			class="line thin white"
			d="M80 68L82 72.4L86.6 72.8L83 75.8L84.2 80.4L80 78L75.8 80.4L77 75.8L73.4 72.8L78 72.4Z"
		/>
		<!-- The trophy, on the second step. -->
		<path class="line thin star" d={limb(31, 54, 25.4, 55, 30, 61, 0.8, 0.8)} />
		<path class="line thin star" d={limb(45, 54, 50.6, 55, 46, 61, 0.8, 0.8)} />
		<path class="line star" d="M29 52H47Q47 63 38 64Q29 63 29 52Z" />
		<path class="light" d="M31.4 54H34Q34 60 37 62Q31.6 61 31.4 54Z" />
		<path class="line thin star" d="M36.4 63.6H39.6L40.4 67.4H35.6Z" />
		<path class="line star" d="M32.6 67H43.4Q44.4 67 44.4 68V69.4H31.6V68Q31.6 67 32.6 67Z" />
		<!-- The notebook: closed, and full to bursting. -->
		<g transform="rotate(-4 80 48)">
			<path class="line leaf" d="M64.6 40Q61.6 32 66.6 27Q69.4 33.6 67 40Z" />
			<path class="line thin open" d="M66 39Q65.6 33 66.6 28" />
			<path class="line white" d="M70 40L72 27L83 28.6L81.4 41Z" />
			<path class="water" d="M73.2 37.6L74.4 29.6L81.4 30.6L80.4 38.4Z" />
			<path class="grass" d="M73.2 37.6L73.6 35.4Q77 33.6 80.8 35.6L80.4 38.4Z" />
			<circle class="star" cx="78.6" cy="31.8" r="1.2" />
			<path class="line thin open" d="M73.2 37.6L74.4 29.6L81.4 30.6L80.4 38.4Z" />
			<path class="line tone-c" d="M86 41L95.4 30.6L99.6 34.2L90 43.4Z" />
			<path class="line thin open" d="M88.4 38.6L96.6 31.6" />
			<path class="line tone-o" d="M101 45L111 41.6L112.4 46.6L102 49Z" />
			<path class="line thin open" d="M104 45.4L109.4 43.6" />
			{@render form(
				'notebook-side',
				'M98 45.4L103.4 38.8L103.4 51L98 57.4Z',
				'page',
				'M96 38H106V58H96Z',
				'',
				''
			)}
			<path
				class="line thin open"
				d="M98 48L103.4 41.4M98 50.6L103.4 44M98 53.2L103.4 46.6M98 55.6L103.4 49"
			/>
			<path class="line page" d="M60 45.4Q79 41 98 45.4V57.4H60Z" />
			<path
				class="line thin open"
				d="M60 47.8Q79 43.6 98 47.8M60 50.2Q79 46.4 98 50.2M60 52.6Q79 49.2 98 52.6M60 55Q79 52 98 55"
			/>
			<path class="line tone-a" d="M65.6 45L65.6 62.4L67.8 60.4L70 62.4L70 44.4Z" />
			<path class="line tone-j" d="M80.4 43.4H83.4V57.6H80.4Z" />
			<path class="line tone-h" d="M59.4 56.8H98.6L103.8 50.6V52.4L98.6 58.8H59.4Z" />
			{@render form(
				'notebook-cover',
				'M59.4 45.6Q79 41 98.6 45.6L104 38.6Q84 34.2 64.8 38.2Z',
				'tone-h',
				'M90 30H110V50H90Z',
				'M66 39.4Q76 37 86 37.2L84 38.6Q75 38.6 67 40.6Z',
				'bold'
			)}
			<path class="line tone-h" d="M59.4 45.6Q79 41 98.6 45.6V47.4Q79 42.8 59.4 47.4Z" />
			<path class="shade" d="M59.4 45.6Q79 41 98.6 45.6V47.4Q79 42.8 59.4 47.4Z" />
			<path class="line tone-j" d="M80.4 43.4L83.4 43.6L88.8 36.6L85.8 36.4Z" />
			<path class="line tone-j" d="M80.4 43.4H83.4V45.6Q81.8 45.4 80.4 45.6Z" />
			<g transform="translate(73 41.6) scale(0.6)"><path class="line thin tone-l" d={SPARKLE} /></g>
		</g>
		<StoryDino x={104} y={39} size={36} />
		<!-- The pencil, held out for the next page. -->
		<g transform="translate(113.6 65.6) rotate(-150)">
			<path class="line tone-l" d="M-6 -1.6H10V1.6H-6Z" />
			<path
				class="line thin tone-f"
				d="M-9 -1.6H-6V1.6H-9Q-10 1.6 -10 0.6V-0.6Q-10 -1.6 -9 -1.6Z"
			/>
			<path class="line thin metal" d="M-6.6 -1.8H-5V1.8H-6.6Z" />
			<path class="line thin sand" d="M10 -1.6L15 0L10 1.6Z" />
			<path class="ink" d="M13.4 -0.5L15 0L13.4 0.5Z" />
		</g>
	</g>
{/if}

<style>
	.line {
		stroke: var(--dd-color-story-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.thin {
		stroke-width: var(--dd-border-width-thin);
	}

	.bold {
		stroke-width: var(--dd-border-width-drawing-bold);
	}

	.open {
		fill: none;
	}

	.shade {
		fill: var(--dd-color-story-shade);
		fill-opacity: var(--dd-opacity-story-shade);
	}

	.light {
		fill: var(--dd-color-story-light);
		fill-opacity: var(--dd-opacity-story-light);
	}

	.light-line {
		fill: none;
		stroke: var(--dd-color-story-light);
		stroke-opacity: var(--dd-opacity-story-light);
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.white-line {
		stroke: var(--dd-color-story-white);
	}

	.star-line {
		stroke: var(--dd-color-story-star);
	}

	.gold-line {
		stroke: var(--dd-color-story-l);
	}

	.metal-line {
		stroke: var(--dd-color-story-metal);
	}

	.wood-line {
		stroke: var(--dd-color-story-wood);
	}

	.glass {
		fill: var(--dd-color-story-water);
		fill-opacity: var(--dd-opacity-glass);
	}

	.stop-water {
		stop-color: var(--dd-color-story-water);
	}

	.stop-sky {
		stop-color: var(--dd-color-story-sky);
	}

	.stop-night {
		stop-color: var(--dd-color-story-night);
	}

	.stop-dusk {
		stop-color: var(--dd-color-story-m);
	}

	.night {
		fill: var(--dd-color-story-night);
	}

	.grass {
		fill: var(--dd-color-story-grass);
	}

	.leaf {
		fill: var(--dd-color-story-leaf);
	}

	.sand {
		fill: var(--dd-color-story-sand);
	}

	.rock {
		fill: var(--dd-color-story-rock);
	}

	.wood {
		fill: var(--dd-color-story-wood);
	}

	.fur {
		fill: var(--dd-color-story-fur);
	}

	.fur-light {
		fill: var(--dd-color-story-fur-light);
	}

	.spot {
		fill: var(--dd-color-story-spot);
	}

	.metal {
		fill: var(--dd-color-story-metal);
	}

	.white {
		fill: var(--dd-color-story-white);
	}

	.dark {
		fill: var(--dd-color-story-dark);
	}

	.ink {
		fill: var(--dd-color-story-ink);
	}

	.star {
		fill: var(--dd-color-story-star);
	}

	.spark {
		fill: var(--dd-color-story-spark);
	}

	.page {
		fill: var(--dd-color-story-page);
	}

	.water {
		fill: var(--dd-color-story-water);
	}

	.water-deep {
		fill: var(--dd-color-story-water-deep);
	}

	.red {
		fill: var(--dd-color-wear-red);
	}

	.tone-a {
		fill: var(--dd-color-story-a);
	}

	.tone-b {
		fill: var(--dd-color-story-b);
	}

	.tone-c {
		fill: var(--dd-color-story-c);
	}

	.tone-e {
		fill: var(--dd-color-story-e);
	}

	.tone-f {
		fill: var(--dd-color-story-f);
	}

	.tone-h {
		fill: var(--dd-color-story-h);
	}

	.tone-i {
		fill: var(--dd-color-story-i);
	}

	.tone-j {
		fill: var(--dd-color-story-j);
	}

	.tone-k {
		fill: var(--dd-color-story-k);
	}

	.tone-l {
		fill: var(--dd-color-story-l);
	}

	.tone-m {
		fill: var(--dd-color-story-m);
	}

	.tone-n {
		fill: var(--dd-color-story-n);
	}

	.tone-o {
		fill: var(--dd-color-story-o);
	}

	.tone-p {
		fill: var(--dd-color-story-p);
	}

	.p {
		fill: var(--dd-color-story-p);
	}

	.learner {
		fill: var(--dd-color-story-white);
		font-family: var(--dd-font-family-base);
		font-size: var(--dd-font-size-sm);
		font-weight: var(--dd-font-weight-bold);
	}
</style>
