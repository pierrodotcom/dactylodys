<svelte:options namespace="svg" />

<script lang="ts">
	import { POURED_VARIANT, PREP_STAGES, ingredientVariant, isPouring, liquidPath } from './prep';
	import { INGREDIENTS, POUR_STREAM_PATH } from './shapes';

	interface Props {
		/** Which ingredient it is; they follow one another. */
		variant: number;
		/** Cuts made, or how much is poured; 0 for a whole ingredient. */
		stage: number;
	}

	let { variant, stage }: Props = $props();

	const look = $derived(ingredientVariant(variant));
	const drawing = $derived(INGREDIENTS[look] ?? INGREDIENTS[0]);
	const poured = $derived(look === POURED_VARIANT);
	const liquid = $derived(poured ? liquidPath(stage) : null);
	const cuts = $derived(
		poured || !drawing ? [] : drawing.cuts.slice(0, Math.min(stage, PREP_STAGES))
	);
</script>

{#if drawing}
	<g class="ingredient" data-look={look}>
		{#each drawing.parts as part, index (index)}
			<path class="part" data-tone={part.tone} d={part.d} />
		{/each}
		{#if liquid}
			<path class="liquid" d={liquid} />
		{/if}
		{#each drawing.dots as dot (dot.x)}
			<circle class="dot" cx={dot.x} cy={dot.y} r={dot.radius} />
		{/each}
		{#each cuts as cut (cut)}
			<path class="cut" d={cut} />
		{/each}
		{#if poured && isPouring(stage)}
			<path class="stream" d={POUR_STREAM_PATH} />
		{/if}
	</g>
{/if}

<style>
	.part,
	.liquid,
	.dot,
	.cut,
	.stream {
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.part[data-tone='plain'] {
		fill: var(--dd-color-companion-eye);
	}

	.part[data-tone='leaf'] {
		fill: var(--dd-color-food-d);
	}

	[data-look='0'] .part[data-tone='main'] {
		fill: var(--dd-color-food-a);
	}

	[data-look='1'] .part[data-tone='main'] {
		fill: var(--dd-color-food-b);
	}

	[data-look='2'] .part[data-tone='main'] {
		fill: var(--dd-color-food-c);
	}

	[data-look='3'] .part[data-tone='main'] {
		fill: var(--dd-color-food-f);
	}

	.liquid,
	.stream {
		fill: var(--dd-color-food-e);
	}

	.stream {
		fill: transparent;
		stroke: var(--dd-color-food-e);
		stroke-width: var(--dd-border-width-target);
	}

	.dot {
		fill: var(--dd-color-drawing-ink);
		stroke: transparent;
	}

	.cut {
		fill: transparent;
		stroke: var(--dd-color-drawing-ink);
	}
</style>
