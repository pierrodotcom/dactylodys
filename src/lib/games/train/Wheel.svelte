<svelte:options namespace="svg" />

<!-- A spoked wheel: the spokes turn, the light on the tyre stays where it is. -->
<script lang="ts">
	import { wheelArt } from './shapes';

	interface Props {
		x: number;
		y: number;
		radius: number;
		/** Number of spokes. */
		spokes: number;
		/** A driving wheel of the locomotive: painted, with its counterweight. */
		driver?: boolean;
		/** Degrees the wheel has turned. */
		angle?: number;
	}

	let { x, y, radius, spokes, driver = false, angle = 0 }: Props = $props();

	const art = $derived(wheelArt(radius, spokes, driver));
	const id = $props.id();
</script>

<g transform="translate({x} {y})" data-driver={driver || undefined}>
	<clipPath {id}><path d={art.tyre} /></clipPath>
	<path class="tyre" d={art.tyre} />
	<path class="well" d={art.well} />
	<g transform="rotate({angle})">
		<path class="centre" d={art.spokes} />
		<path class="centre" fill-rule="evenodd" d={art.rim} />
		{#if art.counterweight !== ''}
			<path class="centre" d={art.counterweight} />
		{/if}
		<path class="centre hub" d={art.hub} />
		<path class="boss" d={art.boss} />
	</g>
	<g clip-path="url(#{id})">
		<path class="shade" fill-rule="evenodd" d={art.shade} />
		<path class="light" d={art.light} />
	</g>
	<path class="edge" d={art.tyre} />
</g>

<style>
	.tyre {
		fill: var(--dd-color-train-steel);
	}

	.well {
		fill: var(--dd-color-train-mouth);
	}

	.centre {
		fill: var(--dd-color-train-steel);
	}

	[data-driver] .centre {
		fill: var(--dd-color-train-paint);
	}

	.hub {
		stroke: var(--dd-color-train-line);
		stroke-width: var(--dd-border-width-thin);
		vector-effect: non-scaling-stroke;
	}

	.boss {
		fill: var(--dd-color-train-brass);
	}

	.shade {
		fill: var(--dd-color-train-shade);
		fill-opacity: var(--dd-opacity-train-shade);
	}

	.light {
		fill: var(--dd-color-train-light);
		fill-opacity: var(--dd-opacity-train-light);
	}

	.edge {
		fill: transparent;
		stroke: var(--dd-color-train-line);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}
</style>
