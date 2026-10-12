<svelte:options namespace="svg" />

<script lang="ts">
	import { astreVariant } from './flight';
	import {
		INHABITANT_ANTENNA_PATHS,
		INHABITANT_BODY_PATH,
		INHABITANT_EYES,
		INHABITANT_MOUTH_PATH,
		INHABITANT_TIPS
	} from './shapes';

	interface Props {
		/** Which astre it lives on: it wears the color of its astre. */
		variant: number;
	}

	let { variant }: Props = $props();

	const look = $derived(astreVariant(variant));
</script>

<g class="inhabitant" data-look={look}>
	{#each INHABITANT_ANTENNA_PATHS as antenna (antenna)}
		<path class="antenna" d={antenna} />
	{/each}
	{#each INHABITANT_TIPS as tip (tip.x)}
		<circle class="tip" cx={tip.x} cy={tip.y} r="3" />
	{/each}
	<path class="body" d={INHABITANT_BODY_PATH} />
	{#each INHABITANT_EYES as eye (eye.x)}
		<circle class="white" cx={eye.x} cy={eye.y} r="5" />
		<circle class="ink" cx={eye.x + 1} cy={eye.y + 1} r="2.5" />
	{/each}
	<path class="mouth" d={INHABITANT_MOUTH_PATH} />
</g>

<style>
	.antenna,
	.tip,
	.body,
	.white {
		stroke: var(--dd-color-sky-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.antenna,
	.mouth {
		fill: transparent;
	}

	.mouth {
		stroke: var(--dd-color-drawing-ink);
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.tip {
		fill: var(--dd-color-sky-line);
	}

	.white {
		fill: var(--dd-color-companion-eye);
	}

	.ink {
		fill: var(--dd-color-drawing-ink);
	}

	[data-look='0'] .body {
		fill: var(--dd-color-astre-a);
	}

	[data-look='1'] .body {
		fill: var(--dd-color-astre-b);
	}

	[data-look='2'] .body {
		fill: var(--dd-color-astre-c);
	}

	[data-look='3'] .body {
		fill: var(--dd-color-astre-d);
	}
</style>
