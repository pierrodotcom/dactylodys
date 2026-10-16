<svelte:options namespace="svg" />

<script lang="ts">
	import type { Wheel } from './shapes';

	interface Props {
		/** The round puffs that make the cloud. */
		puffs: readonly Wheel[];
	}

	let { puffs }: Props = $props();
</script>

<!-- Two passes: the outlines first, then the fills over them, so that the cloud has one outline. -->
<g class="cloud">
	{#each puffs as puff, index (index)}
		<circle class="edge" cx={puff.x} cy={puff.y} r={puff.radius} />
	{/each}
	{#each puffs as puff, index (index)}
		<circle class="fill" cx={puff.x} cy={puff.y} r={puff.radius} />
	{/each}
</g>

<style>
	.edge,
	.fill {
		fill: var(--dd-color-surface-raised);
	}

	.edge {
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-target);
		vector-effect: non-scaling-stroke;
	}
</style>
