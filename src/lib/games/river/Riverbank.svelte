<svelte:options namespace="svg" />

<!-- The sky, the banks and the water of the river: a fixed picture that changes with the decor. -->
<script lang="ts">
	import type { DecorOf } from '../shared/decor';
	import {
		BULRUSHES,
		CLOUD,
		CLOUDS,
		CRATE,
		CRATE_POSTS,
		CRATE_SHELVES,
		DAY_SUN,
		FAR_BANK,
		FAR_BANK_EDGE,
		FIREFLIES,
		MOON_GLITTER,
		NEAR_BANK,
		NEAR_BANK_EDGE,
		NIGHT_MOON,
		NIGHT_STARS,
		REEDS,
		RIPPLES,
		SUNSET_BIRDS,
		SUNSET_GLITTER,
		SUNSET_SUN,
		TREES,
		WATER,
		WATER_EDGE
	} from './decor';
	import { SCENE } from './river';

	interface Props {
		decor: DecorOf<'river'>;
	}

	let { decor }: Props = $props();

	const uid = $props.id();
</script>

<g class="riverbank" data-look={decor}>
	<rect class="sky" x="0" y="0" width={SCENE.width} height={SCENE.height} />
	{#if decor === 'sunset'}
		<linearGradient id="{uid}-sky" x1="0" y1="0" x2="0" y2="1">
			<stop class="sky-high" offset="0" />
			<stop class="sky-low" offset="0.45" />
		</linearGradient>
		<rect x="0" y="0" width={SCENE.width} height={SCENE.height} fill="url(#{uid}-sky)" />
	{/if}

	{#if decor === 'day'}
		<path class="ray" d={DAY_SUN.rays} />
		<path class="sun" d={DAY_SUN.disc} />
		<path class="line" d={DAY_SUN.disc} />
		{#each CLOUDS as cloud (cloud.x)}
			<g transform="translate({cloud.x} {cloud.y}) scale({cloud.scale})">
				<path class="cloud" d={CLOUD} />
				<path class="line" d={CLOUD} />
			</g>
		{/each}
	{:else if decor === 'sunset'}
		<path class="halo" d={SUNSET_SUN.halo} data-effect />
		<path class="low-sun" d={SUNSET_SUN.disc} />
		<path class="line" d={SUNSET_SUN.disc} />
		<path class="fine" d={SUNSET_BIRDS} />
	{:else}
		<path class="star" d={NIGHT_STARS} />
		<path class="moon" d={NIGHT_MOON} />
		<path class="line" d={NIGHT_MOON} />
	{/if}

	<path class="far-bank" d={FAR_BANK} />
	{#each TREES as tree (tree.crown)}
		<path class="trunk" d={tree.trunk} />
		<path class="tree" d={tree.crown} />
		<path class="line" d={tree.crown} />
	{/each}
	<path class="line" d={FAR_BANK_EDGE} />

	<path class="water" d={WATER} />
	<path class="line" d={WATER_EDGE} />
	<path class="ripple" d={RIPPLES} />
	{#if decor === 'sunset'}
		<path class="glitter" d={SUNSET_GLITTER} />
	{:else if decor === 'night'}
		<path class="glitter" d={MOON_GLITTER} />
	{/if}

	<path class="near-bank" d={NEAR_BANK} />
	<path class="line" d={NEAR_BANK_EDGE} />
	<path class="reed" d={REEDS} />
	{#each BULRUSHES as bulrush (bulrush)}
		<path class="bulrush" d={bulrush} />
		<path class="fine" d={bulrush} />
	{/each}
	{#if decor === 'night'}
		{#each FIREFLIES as fly (fly.dot)}
			<path class="firefly-glow" d={fly.glow} data-effect />
			<path class="firefly" d={fly.dot} />
		{/each}
	{/if}

	<path class="crate" d={CRATE} />
	<path class="plank" d={CRATE_POSTS} />
	<path class="plank" d={CRATE_SHELVES} />
	<path class="line" d={CRATE} />
</g>

<style>
	path {
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	/* Each decor gives the sky, the banks and the water their own colours (ADR-057). */
	.riverbank {
		--dd-river-sky: var(--dd-color-river-sky);
		--dd-river-water: var(--dd-color-river-water);
		--dd-river-far-bank: var(--dd-color-river-far-bank);
		--dd-river-near-bank: var(--dd-color-river-near-bank);
		--dd-river-reed: var(--dd-color-river-reed);
	}

	.riverbank[data-look='sunset'] {
		--dd-river-sky: var(--dd-color-decor-sunset-sky-low);
		--dd-river-water: var(--dd-color-river-sunset-water);
		--dd-river-far-bank: var(--dd-color-river-sunset-far-bank);
		--dd-river-near-bank: var(--dd-color-river-sunset-near-bank);
	}

	.riverbank[data-look='night'] {
		--dd-river-sky: var(--dd-color-decor-night-sky);
		--dd-river-water: var(--dd-color-river-night-water);
		--dd-river-far-bank: var(--dd-color-river-night-far-bank);
		--dd-river-near-bank: var(--dd-color-river-night-near-bank);
		--dd-river-reed: var(--dd-color-river-night-reed);
	}

	.sky {
		fill: var(--dd-river-sky);
	}

	.sky-high {
		stop-color: var(--dd-color-decor-sunset-sky-high);
	}

	.sky-low {
		stop-color: var(--dd-color-decor-sunset-sky-low);
	}

	.sun,
	.ray {
		fill: var(--dd-color-river-sun);
	}

	.ray {
		stroke: var(--dd-color-river-sun);
		stroke-width: var(--dd-border-width-target);
	}

	.cloud {
		fill: var(--dd-color-river-cloud);
	}

	.halo {
		fill: var(--dd-color-decor-sunset-halo);
		fill-opacity: var(--dd-opacity-decor-halo);
	}

	.low-sun {
		fill: var(--dd-color-decor-sunset-sun);
	}

	.star {
		fill: var(--dd-color-river-night-star);
	}

	.moon {
		fill: var(--dd-color-decor-night-moon);
	}

	.far-bank {
		fill: var(--dd-river-far-bank);
	}

	.tree {
		fill: var(--dd-color-river-tree);
	}

	.trunk,
	.bulrush {
		fill: var(--dd-color-river-cattail);
	}

	.water {
		fill: var(--dd-river-water);
	}

	.near-bank {
		fill: var(--dd-river-near-bank);
	}

	.ripple,
	.glitter {
		fill: transparent;
		stroke: var(--dd-color-river-ripple);
		stroke-width: var(--dd-border-width-thick);
		stroke-opacity: var(--dd-opacity-river-ripple);
	}

	.glitter {
		stroke: var(--dd-color-river-reflection);
		stroke-width: var(--dd-border-width-target);
	}

	.reed {
		fill: transparent;
		stroke: var(--dd-river-reed);
		stroke-width: var(--dd-border-width-target);
	}

	.firefly {
		fill: var(--dd-color-river-firefly);
	}

	.firefly-glow {
		fill: var(--dd-color-river-firefly);
		fill-opacity: var(--dd-opacity-decor-glow);
	}

	.crate {
		fill: var(--dd-color-river-crate);
	}

	.plank {
		fill: transparent;
		stroke: var(--dd-color-river-crate-plank);
		stroke-width: var(--dd-border-width-target);
	}

	.line,
	.fine {
		fill: transparent;
		stroke: var(--dd-color-river-line);
		stroke-width: var(--dd-border-width-thick);
	}

	.fine {
		stroke-width: var(--dd-border-width-thin);
	}
</style>
