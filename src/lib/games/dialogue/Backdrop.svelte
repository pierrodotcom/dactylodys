<!-- The garden where Floup and the companion talk; a fixed picture, its bottom on the ground. -->
<script lang="ts">
	import type { DecorOf } from '../shared/decor';
	import {
		BACKDROP,
		CLOUD,
		CLOUDS,
		DAISIES,
		EVENING_STARS,
		EVENING_SUN,
		FIRS,
		GARDEN_SUN,
		GROUND,
		GROUND_EDGE,
		HILLS,
		LANTERNS,
		LANTERN_STRING,
		SNOWFLAKES,
		SNOW_DOTS,
		TUFTS
	} from './decor';

	interface Props {
		decor: DecorOf<'dialogue'>;
	}

	let { decor }: Props = $props();

	const uid = $props.id();
</script>

<svg
	class="backdrop"
	viewBox="0 {BACKDROP.top} {BACKDROP.width} {BACKDROP.height}"
	preserveAspectRatio="xMidYMax slice"
	focusable="false"
	aria-hidden="true"
	data-look={decor}
>
	<rect class="sky" x="0" y={BACKDROP.top} width={BACKDROP.width} height={BACKDROP.height} />
	{#if decor !== 'garden'}
		<linearGradient id="{uid}-sky" x1="0" y1="0" x2="0" y2="1">
			<stop class="sky-high" offset="0" />
			<stop class="sky-low" offset="0.8" />
		</linearGradient>
		<rect
			x="0"
			y={BACKDROP.top}
			width={BACKDROP.width}
			height={BACKDROP.height}
			fill="url(#{uid}-sky)"
		/>
	{/if}

	{#if decor === 'garden'}
		<path class="ray" d={GARDEN_SUN.rays} />
		<path class="sun" d={GARDEN_SUN.disc} />
		<path class="shine" d={GARDEN_SUN.light} />
		<path class="line" d={GARDEN_SUN.disc} />
		{#each CLOUDS as cloud (cloud.x)}
			<g transform="translate({cloud.x} {cloud.y}) scale({cloud.scale})">
				<path class="cloud" d={CLOUD} />
				<path class="line" d={CLOUD} />
			</g>
		{/each}
	{:else if decor === 'evening'}
		<path class="star" d={EVENING_STARS} />
		<path class="halo" d={EVENING_SUN.halo} data-effect />
		<path class="low-sun" d={EVENING_SUN.disc} />
		<path class="line" d={EVENING_SUN.disc} />
	{:else}
		<path class="flake" d={SNOWFLAKES} />
		<path class="snow-dot" d={SNOW_DOTS} />
	{/if}

	<path class="hill" d={HILLS} />
	<path class="line" d={HILLS} />
	{#if decor === 'winter'}
		{#each FIRS as fir (fir.tree)}
			<path class="trunk" d={fir.trunk} />
			<path class="fir" d={fir.tree} />
			<path class="snow" d={fir.snow} />
			<path class="line" d={fir.tree} />
		{/each}
	{/if}
	<path class="ground" d={GROUND} />
	<path class="line" d={GROUND_EDGE} />
	{#if decor !== 'winter'}
		<path class="tuft" d={TUFTS} />
	{/if}
	{#if decor === 'garden'}
		{#each DAISIES as flower (flower.heart)}
			<path class="petal" data-tone={flower.tone} d={flower.petals} />
			<path class="flower-heart" d={flower.heart} />
		{/each}
	{/if}

	{#if decor === 'evening'}
		<path class="string" d={LANTERN_STRING} />
		{#each LANTERNS as lantern (lantern.body)}
			<path class="glow" d={lantern.glow} data-effect />
			<path class="cap" d={lantern.cap} />
			<path class="lantern" data-tone={lantern.tone} d={lantern.body} />
			<path class="fine" d={lantern.rib} />
			<path class="line" d={lantern.body} />
		{/each}
	{/if}
</svg>

<style>
	.backdrop {
		position: absolute;
		inset: 0;
		inline-size: 100%;
		block-size: 100%;
	}

	path {
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	/* Each decor gives the sky, the hills and the ground their own colours (ADR-057). */
	.backdrop[data-look='evening'] {
		--dd-decor-sky-high: var(--dd-color-decor-sunset-sky-high);
		--dd-decor-sky-low: var(--dd-color-decor-sunset-sky-low);
		--dd-color-dialogue-hill: var(--dd-color-dialogue-evening-hill);
		--dd-color-dialogue-ground: var(--dd-color-dialogue-evening-ground);
	}

	.backdrop[data-look='winter'] {
		--dd-decor-sky-high: var(--dd-color-decor-winter-sky-high);
		--dd-decor-sky-low: var(--dd-color-decor-winter-sky-low);
		--dd-color-dialogue-hill: var(--dd-color-decor-winter-snow-far);
		--dd-color-dialogue-ground: var(--dd-color-decor-winter-snow);
	}

	.sky {
		fill: var(--dd-color-dialogue-sky);
	}

	.sky-high {
		stop-color: var(--dd-decor-sky-high);
	}

	.sky-low {
		stop-color: var(--dd-decor-sky-low);
	}

	.sun,
	.ray {
		fill: var(--dd-color-dialogue-sun);
	}

	.ray {
		stroke: var(--dd-color-dialogue-sun);
		stroke-width: var(--dd-border-width-target);
	}

	.cloud {
		fill: var(--dd-color-dialogue-cloud);
	}

	.hill {
		fill: var(--dd-color-dialogue-hill);
	}

	.ground {
		fill: var(--dd-color-dialogue-ground);
	}

	.petal {
		fill: var(--dd-color-dialogue-flower-petal);
	}

	.petal[data-tone='pink'] {
		fill: var(--dd-color-dialogue-flower-pink);
	}

	.flower-heart {
		fill: var(--dd-color-dialogue-flower-heart);
	}

	.star {
		fill: var(--dd-color-dialogue-star);
	}

	.halo {
		fill: var(--dd-color-decor-sunset-halo);
		fill-opacity: var(--dd-opacity-decor-halo);
	}

	.low-sun {
		fill: var(--dd-color-decor-sunset-sun);
	}

	.glow {
		fill: var(--dd-color-decor-evening-glow);
		fill-opacity: var(--dd-opacity-decor-glow);
	}

	.cap {
		fill: var(--dd-color-dialogue-line);
	}

	.lantern {
		fill: var(--dd-color-dialogue-lantern-a);
	}

	.lantern[data-tone='b'] {
		fill: var(--dd-color-dialogue-lantern-b);
	}

	.lantern[data-tone='c'] {
		fill: var(--dd-color-dialogue-lantern-c);
	}

	.flake {
		fill: transparent;
		stroke: var(--dd-color-decor-winter-flake);
		stroke-width: var(--dd-border-width-thick);
	}

	.snow-dot,
	.snow {
		fill: var(--dd-color-decor-winter-flake);
	}

	.fir {
		fill: var(--dd-color-decor-winter-evergreen);
	}

	.trunk {
		fill: var(--dd-color-decor-nest-twig);
	}

	.shine {
		fill: var(--dd-color-dialogue-light);
		fill-opacity: var(--dd-opacity-dialogue-light);
	}

	.line,
	.fine,
	.tuft,
	.string {
		fill: transparent;
		stroke: var(--dd-color-dialogue-line);
		stroke-width: var(--dd-border-width-thick);
	}

	.fine {
		stroke-width: var(--dd-border-width-thin);
	}

	.string {
		stroke: var(--dd-color-dialogue-lantern-string);
		stroke-width: var(--dd-border-width-thin);
	}
</style>
