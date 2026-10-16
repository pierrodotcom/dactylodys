<svelte:options namespace="svg" />

<script lang="ts">
	import { astreVariant } from './flight';
	import { ASTRE_CRATERS, ASTRE_RING, ASTRE_SPOTS, ASTRE_STRIPES, RAYS } from './shapes';

	interface Props {
		/** Which astre it is; the looks follow one another. */
		variant: number;
		/** Reached: in color, with rays. Not yet: grey and dashed. */
		lit: boolean;
		/** The ring is drawn by the scene that spins it like a hoop. */
		ringHidden?: boolean;
	}

	let { variant, lit, ringHidden = false }: Props = $props();

	const look = $derived(astreVariant(variant));
</script>

<g class="astre" data-lit={lit || undefined} data-look={look}>
	{#if lit}
		<g data-reward data-reward-variant="0">
			{#each RAYS as ray (ray)}
				<path class="ray" d={ray} />
			{/each}
		</g>
	{/if}
	<circle class="planet" cx="50" cy="50" r="30" />
	{#if look === 0}
		{#if !ringHidden}
			<ellipse
				class="ring"
				cx={ASTRE_RING.cx}
				cy={ASTRE_RING.cy}
				rx={ASTRE_RING.rx}
				ry={ASTRE_RING.ry}
				transform="rotate({ASTRE_RING.angle} {ASTRE_RING.cx} {ASTRE_RING.cy})"
			/>
		{/if}
	{:else if look === 1}
		{#each ASTRE_CRATERS as crater (crater.x)}
			<circle class="mark" cx={crater.x} cy={crater.y} r={crater.radius} />
		{/each}
	{:else if look === 2}
		{#each ASTRE_STRIPES as stripe (stripe)}
			<path class="stripe" d={stripe} />
		{/each}
	{:else}
		{#each ASTRE_SPOTS as spot (spot.x)}
			<circle class="spot" cx={spot.x} cy={spot.y} r={spot.radius} />
		{/each}
	{/if}
</g>

<style>
	.planet,
	.ring,
	.ray,
	.stripe,
	.mark,
	.spot {
		stroke: var(--dd-color-sky-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.planet {
		fill: var(--dd-color-astre-dim);
		stroke-dasharray: 6 5;
	}

	.ring,
	.stripe,
	.ray {
		fill: transparent;
	}

	.mark,
	.spot {
		fill: var(--dd-color-drawing-ink);
		stroke: transparent;
	}

	.spot {
		fill: var(--dd-color-sky-line);
	}

	.stripe {
		stroke: var(--dd-color-drawing-ink);
	}

	[data-lit] .planet {
		stroke-dasharray: none;
	}

	[data-lit][data-look='0'] .planet {
		fill: var(--dd-color-astre-a);
	}

	[data-lit][data-look='1'] .planet {
		fill: var(--dd-color-astre-b);
	}

	[data-lit][data-look='2'] .planet {
		fill: var(--dd-color-astre-c);
	}

	[data-lit][data-look='3'] .planet {
		fill: var(--dd-color-astre-d);
	}

	.astre:not([data-lit]) .mark,
	.astre:not([data-lit]) .stripe,
	.astre:not([data-lit]) .spot {
		opacity: var(--dd-opacity-disabled);
	}
</style>
