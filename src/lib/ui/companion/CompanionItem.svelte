<script lang="ts">
	/*
	 * One item the companion wears, drawn in its 120 × 120 view box (lot R2). `back`: what goes
	 * behind the body (a backpack, a cape, the far side of a ring); `front`: everything else. A hand
	 * item is drawn around `grip`, the point held in the hand. An unknown `artId` draws nothing.
	 * Under an ancestor with `data-silhouette`, the item is one flat shape without details.
	 */
	import { checkerPath, ellipseBand, starPath } from './geometry';
	import type { ItemLayer, Point } from './items';

	interface Props {
		artId: string;
		layer?: ItemLayer;
		grip?: Point;
	}

	let { artId, layer = 'front', grip = { x: 0, y: 0 } }: Props = $props();

	const FEET_X = [44, 76] as const;
	/** Seen from the front: the right foot is the left one mirrored around the middle of the view box. */
	const MIRROR = 'matrix(-1 0 0 1 120 0)';
	const EGGS = [
		{ x: 47.2, y: 77.7 },
		{ x: 53.6, y: 81.7 },
		{ x: 60, y: 83 },
		{ x: 66.4, y: 81.7 },
		{ x: 72.8, y: 77.7 }
	] as const;
	const GIRAFFE_SPOTS = [
		{ x: 50, y: 78, r: 2.2 },
		{ x: 51, y: 85, r: 1.6 },
		{ x: 47, y: 81.5, r: 1.2 },
		{ x: 70, y: 78, r: 2.2 },
		{ x: 69, y: 85, r: 1.6 },
		{ x: 73, y: 81.5, r: 1.2 }
	] as const;
	/** The body of the companion, which the sweater follows. */
	const BODY = { cx: 60, cy: 76, rx: 35, ry: 31 } as const;
	const SWEATER_BOTTOM = 98;
	/** Down the sides of the body from the shoulders (y = 62), with a neckline under the chin. */
	const SWEATER = 'M28.8 62A35 31 0 0 0 35.3 98L84.7 98A35 31 0 0 0 91.2 62L76 60Q60 72 44 60Z';
	const SWEATER_STRIPES = [
		[66, 71],
		[76, 81],
		[86, 91]
	] as const;
	const WAISTBAND_BOTTOM = 103;
	const EYES_X = [48, 72] as const;
	const EYE_Y = 46;

	function circlePath(cx: number, cy: number, r: number, sweep = 0): string {
		return `M${cx - r} ${cy}a${r} ${r} 0 1 ${sweep} ${2 * r} 0a${r} ${r} 0 1 ${sweep} ${-2 * r} 0Z`;
	}

	/** A ring to fill with `fill-rule="evenodd"`. */
	function ring(cx: number, cy: number, outer: number, inner: number): string {
		return circlePath(cx, cy, outer) + circlePath(cx, cy, inner, 1);
	}

	const waistband = ellipseBand(
		BODY.cx,
		BODY.cy,
		BODY.rx,
		BODY.ry,
		SWEATER_BOTTOM,
		WAISTBAND_BOTTOM
	);
	const stripes = SWEATER_STRIPES.map(([top, bottom]) =>
		ellipseBand(BODY.cx, BODY.cy, BODY.rx, BODY.ry, top, bottom)
	);
	const apronChecks = checkerPath(44, 84, 7, 4, 4.5);
	const starFrames = EYES_X.map((x) => starPath(x, EYE_Y, 13, 7) + circlePath(x, EYE_Y, 8, 1));
	const goggleRims = EYES_X.map((x) => ring(x, EYE_Y, 11, 8));
	const pompom = starPath(60, 8, 7.5, 5.5, 12);
	const capeStars = [
		starPath(14, 92, 6, 2.8),
		starPath(9, 106, 3.2, 1.5),
		starPath(22, 108, 3.2, 1.5)
	];
	const clasps = [starPath(35, 69, 5, 2.4), starPath(85, 69, 5, 2.4)];
</script>

{#snippet eggShape(x: number, y: number)}
	<ellipse class="cream line" cx={x} cy={y} rx="3.4" ry="4.2" />
	<circle class="spot" cx={x - 1} cy={y - 1.2} r="1" />
{/snippet}

{#snippet rainBoot()}
	<path class="rubber line" d="M36 93L55 93L56 114L28 114Q26 105 36 103Z" />
	<path class="ink" d="M28 111L56 111L56 114L28 114Z" />
	<path class="rubber line" d="M34 92L57 92L57 97L34 97Z" />
{/snippet}

{#snippet rollerSkate()}
	<path class="blue line" d="M35 98L52 98L52 105Q58 106 58 112L32 112L33 104Z" />
	<path class="open line" d="M38 101.5H49M38 105H49" />
	<path class="metal line" d="M31 112L59 112L59 114.5L31 114.5Z" />
	<circle class="ink" cx="37" cy="116.5" r="3.5" />
	<circle class="ink" cx="52" cy="116.5" r="3.5" />
	<circle class="metal" cx="37" cy="116.5" r="1.3" />
	<circle class="metal" cx="52" cy="116.5" r="1.3" />
{/snippet}

<g class="item" data-art={artId} data-layer={layer}>
	{#if layer === 'back'}
		{#if artId === 'nest-backpack'}
			<ellipse class="cream line" cx="17" cy="47" rx="5.5" ry="7" />
			<circle class="spot" cx="15" cy="45" r="1.4" />
			<ellipse class="cream line" cx="29" cy="45" rx="5.5" ry="7" />
			<circle class="spot" cx="31" cy="43" r="1.4" />
			<path class="twig line" d="M5 52Q24 46 43 52Q42 68 24 70Q6 68 5 52Z" />
			<path class="open line" d="M8 56L20 53M11 62L27 57M20 67L37 60M30 54L40 55" />
		{:else if artId === 'comet-cape'}
			<path class="cape line" d="M38 62Q14 70 2 98L14 96L6 112L24 104L28 114L42 102L84 64Z" />
			<path class="open trail" d="M24 76L12 86M30 90L22 100" />
			{#each capeStars as star (star)}
				<path class="gold line" d={star} />
			{/each}
		{:else if artId === 'ring-float'}
			<path class="ring line" d="M14 90A46 12 0 0 1 106 90L98 90A38 7 0 0 0 22 90Z" />
			<path class="open band" d="M18 90A42 9.5 0 0 1 102 90" />
		{/if}
	{:else if artId === 'nest-backpack'}
		<path class="leather line" d="M34 70L40 70L42 96L36 96Z" />
		<path class="leather line" d="M80 70L86 70L84 96L78 96Z" />
		<path class="gold line" d="M36 86L42 86L42 90L36 90Z" />
		<path class="gold line" d="M78 86L84 86L84 90L78 90Z" />
	{:else if artId === 'comet-cape'}
		{#each clasps as clasp (clasp)}
			<path class="gold line" d={clasp} />
		{/each}
	{:else if artId === 'ring-float'}
		<path class="ring line" d="M14 90A46 12 0 0 0 106 90L98 90A38 7 0 0 1 22 90Z" />
		<path class="open band" d="M18 90A42 9.5 0 0 0 102 90" />
	{:else if artId === 'checked-apron'}
		<path class="cream line" d="M45 72L75 72L76 84Q85 88 86 100Q60 110 34 100Q35 88 44 84Z" />
		<path class="red" d={apronChecks} />
		<path class="open line" d="M45 72L75 72L76 84Q85 88 86 100Q60 110 34 100Q35 88 44 84Z" />
		<path class="open line" d="M44 84L76 84" />
	{:else if artId === 'striped-sweater'}
		<path class="cream line" d="M32 64Q19 68 20 82L31 84Z" />
		<path class="cream line" d="M88 64Q101 68 100 82L89 84Z" />
		<path class="ink" d="M20.5 76L31 77.5L31 80.5L20.2 79Z" />
		<path class="ink" d="M99.5 76L89 77.5L89 80.5L99.8 79Z" />
		<path class="cream line" d={SWEATER} />
		{#each stripes as stripe (stripe)}
			<path class="ink" d={stripe} />
		{/each}
		<path class="open line" d={SWEATER} />
		<path class="cream line" d={waistband} />
	{:else if artId === 'egg-necklace'}
		<path class="open line" d="M40 70Q60 96 80 70" />
		{#each EGGS as egg (egg.x)}
			{@render eggShape(egg.x, egg.y)}
		{/each}
	{:else if artId === 'giraffe-bow-tie'}
		<path class="gold line" d="M60 81L45 73Q42 81 45 89Z" />
		<path class="gold line" d="M60 81L75 73Q78 81 75 89Z" />
		{#each GIRAFFE_SPOTS as spot (spot.x)}
			<circle class="spot" cx={spot.x} cy={spot.y} r={spot.r} />
		{/each}
		<ellipse class="gold line" cx="60" cy="81" rx="4" ry="5" />
		<circle class="spot" cx="60" cy="80" r="1.3" />
	{:else if artId === 'pilot-scarf'}
		<path class="cream line" d="M50 84L44 104L54 104L58 86Z" />
		<path class="open line" d="M46 104L45 108M49 104L49 108M52 104L53 108" />
		<path class="cream line" d="M36 72Q60 88 84 72L85 80Q60 97 35 80Z" />
		<path class="red" d="M36.4 75.5Q60 91.5 84.4 75.5L84.7 77.5Q60 94 35.7 77.5Z" />
	{:else if artId === 'springs'}
		{#each FEET_X as x (x)}
			{@const coil = `M${x - 8} 108L${x + 8} 110.5L${x - 8} 113L${x + 8} 115.5L${x - 8} 117`}
			<path class="open coil-outline" d={coil} />
			<path class="open coil" d={coil} />
			<path class="metal line" d="M{x - 10} 117h20v2.5h-20Z" />
		{/each}
	{:else if artId === 'rain-boots'}
		{@render rainBoot()}
		<g transform={MIRROR}>{@render rainBoot()}</g>
	{:else if artId === 'ball-shoes'}
		{#each FEET_X as x (x)}
			<g transform="translate({x - FEET_X[0]} 0)">
				<path class="red line" d="M31 109Q44 99 57 109L57 113Q44 117 31 113Z" />
				<path class="open shine" d="M35 108Q40 104 45 104" />
				<path class="cream line" d="M44 104L39 100L39 108ZM44 104L49 100L49 108Z" />
				<circle class="cream line" cx="44" cy="104" r="1.8" />
			</g>
		{/each}
	{:else if artId === 'roller-skates'}
		{@render rollerSkate()}
		<g transform={MIRROR}>{@render rollerSkate()}</g>
	{:else if artId === 'cream-moustache'}
		<path class="cream line" d="M55 57Q57 48 60 47Q63 48 65 57Z" />
		<path
			class="cream line"
			d="M60 58C55 53 47 53 43 57C39 55 34 58 36 62C40 65 47 64 51 62C55 64 58 63 60 61C62 63 65 64 69 62C73 64 80 65 84 62C86 58 81 55 77 57C73 53 65 53 60 58Z"
		/>
	{:else if artId === 'chili-nose'}
		<path class="leaf line" d="M59 51Q58 46 61 43L62.5 44Q60.5 47 61.5 51Z" />
		<path class="red line" d="M55 54Q60 50 65 54Q71 59 69 67Q65 62 60 61Q54 59 55 54Z" />
		<path class="open shine" d="M63 56Q66 58 66.5 61" />
		<path class="leaf line" d="M54.5 54Q60 49 65.5 54Q60 56 54.5 54Z" />
	{:else if artId === 'star-glasses'}
		<path class="open line" d="M35.5 43L30.5 40M84.5 43L89.5 40" />
		{#each EYES_X as x (x)}
			<circle class="glass" cx={x} cy={EYE_Y} r="8" />
		{/each}
		{#each starFrames as frame (frame)}
			<path class="gold line" fill-rule="evenodd" d={frame} />
		{/each}
		<path class="open line" d="M58 44Q60 42 62 44" />
	{:else if artId === 'aviator-goggles'}
		<path class="leather line" d="M31 41Q60 37 89 41L89 51Q60 47 31 51Z" />
		{#each EYES_X as x (x)}
			<circle class="glass" cx={x} cy={EYE_Y} r="8" />
		{/each}
		{#each goggleRims as rim (rim)}
			<path class="metal line" fill-rule="evenodd" d={rim} />
		{/each}
		<path class="metal line" d="M58 44L62 44L62 48L58 48Z" />
		<path class="open shine" d="M43 42Q45 40 48 40M67 42Q69 40 72 40" />
	{:else if artId === 'crown'}
		<path class="gold line" d="M42 27L38 8L50 17L60 3L70 17L82 8L78 27Q60 21 42 27Z" />
		<circle class="gold line" cx="38" cy="7" r="2.5" />
		<circle class="gold line" cx="60" cy="3" r="2.5" />
		<circle class="gold line" cx="82" cy="7" r="2.5" />
		<path class="open line" d="M41 22Q60 16 79 22" />
		<circle class="jewel line" cx="60" cy="19" r="3" />
		<circle class="jewel line" cx="48" cy="21" r="2" />
		<circle class="jewel line" cx="72" cy="21" r="2" />
	{:else if artId === 'chef-hat'}
		<path class="cream line" d="M40 22C27 20 28 4 43 7C46 0 74 0 77 7C92 4 93 20 80 22Z" />
		<path class="cream line" d="M38 33Q60 25 82 33L80 21Q60 15 40 21Z" />
		<path class="open line" d="M50 19L49 29M60 18L60 27M70 19L71 29" />
	{:else if artId === 'yak-beanie'}
		<path class="wool line" d="M31 33Q31 8 60 8Q89 8 89 33Z" />
		<path
			class="open line"
			d="M42 18l3 4l3-4M56 14l3 4l3-4M70 18l3 4l3-4M48 25l3 4l3-4M64 25l3 4l3-4"
		/>
		<path class="wool-light line" d="M28 39Q60 29 92 39L91 30Q60 21 29 30Z" />
		<path class="open line" d="M37 28V36M47 26V33M60 25V32M73 26V33M83 28V36" />
		<path class="wool-light line" d={pompom} />
	{:else if artId === 'astronaut-helmet'}
		<rect class="metal line" x="16" y="39" width="7" height="14" rx="2" />
		<rect class="metal line" x="97" y="39" width="7" height="14" rx="2" />
		<circle class="glass" cx="60" cy="46" r="35" />
		<path class="metal line" fill-rule="evenodd" d={ring(60, 46, 38, 35)} />
		<path class="open shine bold" d="M35 30Q42 19 55 15" />
	{:else if artId === 'train-cap'}
		<path class="blue line" d="M33 30L31 15Q60 4 89 15L87 30Z" />
		<path class="open stripe" d="M41 13V30M50 11V30M60 10V30M70 11V30M79 13V30" />
		<path class="open line" d="M33 30L31 15Q60 4 89 15L87 30Z" />
		<path class="ink" d="M33 25L87 25L87 30L33 30Z" />
		<circle class="gold line" cx="60" cy="26" r="4.5" />
		<path class="ink line" d="M31 30Q60 41 89 30Q60 35 31 30Z" />
	{:else if artId === 'magnifier' || artId === 'ladle-mic' || artId === 'bulb-horn'}
		<g transform="translate({grip.x} {grip.y})">
			{#if artId === 'magnifier'}
				<path class="leather line" d="M2 -1L-9 -15L-12 -12L-1 2Z" />
				<circle class="glass" cx="-15" cy="-20" r="6.5" />
				<path class="metal line" fill-rule="evenodd" d={ring(-15, -20, 9, 6.5)} />
				<path class="open shine" d="M-19 -22Q-18 -25 -15 -25.5" />
			{:else if artId === 'ladle-mic'}
				<path class="metal line" d="M2 0L-9 -16L-12 -14L-1 2Z" />
				<circle class="metal line" cx="-14" cy="-21" r="7.5" />
				<path
					class="open line"
					d="M-20 -21H-8M-14 -27V-15M-18.5 -25.5L-9.5 -16.5M-18.5 -16.5L-9.5 -25.5"
				/>
				<ellipse class="ink" cx="-1" cy="-21" rx="2.4" ry="1.7" />
				<path class="open line" d="M1.2 -21.5V-29L5 -28" />
			{:else}
				<path class="gold line" d="M-1.8 -4.9L-10.8 -16.9L-13.2 -15.1L-4.2 -3.1Z" />
				<path class="gold line" d="M-13.2 -15.1L-23 -21Q-21 -27 -14 -29L-10.8 -16.9Z" />
				<ellipse
					class="ink"
					cx="-18.5"
					cy="-25"
					rx="5.5"
					ry="1.6"
					transform="rotate(-41.6 -18.5 -25)"
				/>
				<circle class="red line" cx="0" cy="0" r="6.5" />
				<path class="open shine" d="M-3.5 -3Q-1.5 -5 1.5 -4.5" />
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

	.open {
		fill: transparent;
	}

	.shine,
	.trail,
	.stripe,
	.band,
	.coil,
	.coil-outline {
		stroke-linecap: round;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	.shine,
	.trail {
		stroke: var(--dd-color-wear-cream);
		stroke-width: var(--dd-border-width-thick);
	}

	.bold {
		stroke-width: var(--dd-border-width-drawing-bold);
	}

	.stripe {
		stroke: var(--dd-color-wear-cream);
		stroke-width: var(--dd-border-width-drawing-bold);
	}

	.band {
		stroke: var(--dd-color-wear-gold);
		stroke-width: var(--dd-border-width-drawing-bold);
	}

	.coil-outline {
		stroke: var(--dd-color-companion-line);
		stroke-width: var(--dd-border-width-drawing-bold);
	}

	.coil {
		stroke: var(--dd-color-wear-metal);
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
