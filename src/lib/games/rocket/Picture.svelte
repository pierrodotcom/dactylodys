<script lang="ts">
	import AstreShape from './AstreShape.svelte';
	import RocketShape from './RocketShape.svelte';
	import { PICTURE } from './shapes';
</script>

<!-- The rocket takes off past a ringed planet, a puff of smoke behind it. -->
<svg class="picture" viewBox="-60 -60 120 120" focusable="false" aria-hidden="true">
	<g transform="translate(-64 4) scale(0.58)">
		<AstreShape variant={0} lit={true} halo={false} />
	</g>
	{#each PICTURE.sparkles as sparkle (sparkle)}
		<path class="sparkle" d={sparkle} />
	{/each}
	{#each PICTURE.trail as puff (puff)}
		<path class="underlay" d={puff} />
	{/each}
	{#each PICTURE.trail as puff (puff)}
		<path class="smoke" d={puff} />
	{/each}
	<g transform="translate(12 -10) rotate(32) scale(0.9)">
		<RocketShape landed={false} thrust={0} still={true} />
	</g>
</svg>

<style>
	.picture {
		display: block;
		inline-size: 100%;
		block-size: 100%;
		overflow: visible;
	}

	.sparkle {
		fill: var(--dd-color-star-fill);
		stroke: var(--dd-color-rocket-line);
		stroke-width: var(--dd-border-width-thin);
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	.underlay {
		fill: var(--dd-color-rocket-line);
		stroke: var(--dd-color-rocket-line);
		stroke-width: calc(var(--dd-border-width-thick) * 2);
		vector-effect: non-scaling-stroke;
	}

	.smoke {
		fill: var(--dd-color-rocket-smoke);
	}
</style>
