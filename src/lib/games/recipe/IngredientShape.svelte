<svelte:options namespace="svg" />

<script lang="ts">
	import { POURED_VARIANT, PREP_STAGES, ingredientVariant, isPouring, liquidPath } from './prep';
	import { INGREDIENTS, JUG_INSIDE, LIQUID_LIGHT, POUR_STREAM_PATH } from './shapes';

	interface Props {
		/** Which ingredient it is; they follow one another. */
		variant: number;
		/** Cuts made, or how much is poured; 0 for a whole ingredient. */
		stage: number;
		/** Small, in the row: thinner outlines, no fine lines. */
		small?: boolean;
	}

	let { variant, stage, small = false }: Props = $props();

	const uid = $props.id();

	const look = $derived(ingredientVariant(variant));
	const drawing = $derived(INGREDIENTS[look] ?? INGREDIENTS[0]);
	const poured = $derived(look === POURED_VARIANT);
	const liquid = $derived(poured ? liquidPath(stage) : null);
	const lastPart = $derived((drawing?.parts.length ?? 0) - 1);
	const cuts = $derived(
		poured || !drawing ? [] : drawing.cuts.slice(0, Math.min(stage, PREP_STAGES))
	);

	function ref(name: string): string {
		return `${uid}-${name}`;
	}

	function url(name: string): string {
		return `url(#${ref(name)})`;
	}
</script>

{#if drawing}
	<g class="ingredient" data-look={look} data-small={small || undefined}>
		<clipPath id={ref('all')}>
			{#each drawing.parts as part (part.d)}
				<path d={part.d} />
			{/each}
		</clipPath>
		<clipPath id={ref('cut')}>
			{#if drawing.cutZone}
				<path d={drawing.cutZone} />
			{:else}
				{#each drawing.parts as part (part.d)}
					<path d={part.d} />
				{/each}
			{/if}
		</clipPath>
		{#each drawing.parts as part, index (part.d)}
			<clipPath id={ref(`part-${index}`)}><path d={part.d} /></clipPath>
			<path class="fill" data-tone={part.tone} d={part.d} />
			{#if liquid && index === lastPart}
				<clipPath id={ref('inside')}><path d={JUG_INSIDE} /></clipPath>
				<clipPath id={ref('liquid')}><path d={liquid} /></clipPath>
				<g clip-path={url('inside')}>
					<path class="liquid" d={liquid} />
					<g clip-path={url('liquid')}>
						<path class="light" d={LIQUID_LIGHT} />
					</g>
				</g>
			{/if}
			<g clip-path={url(`part-${index}`)}>
				{#if part.shade}
					<path class="shade" fill-rule="evenodd" d={part.shade} />
				{/if}
				{#each part.lights ?? [] as light (light)}
					<path class="light" d={light} />
				{/each}
			</g>
			<path class="open line" d={part.d} />
		{/each}
		<g clip-path={url('all')}>
			{#each drawing.details as detail (detail.d)}
				<path class="detail" data-kind={detail.kind} d={detail.d} />
			{/each}
		</g>
		<g clip-path={url('cut')}>
			{#each cuts as cut (cut)}
				<path class="cut" d={cut} />
			{/each}
		</g>
		{#if poured && isPouring(stage)}
			<path class="stream-line" d={POUR_STREAM_PATH} />
			<path class="stream" d={POUR_STREAM_PATH} />
		{/if}
	</g>
{/if}

<style>
	.line,
	.detail,
	.cut,
	.stream,
	.stream-line {
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.line {
		stroke: var(--dd-color-recipe-line);
		stroke-width: var(--dd-border-width-thick);
	}

	[data-small] .line {
		stroke-width: var(--dd-border-width-thin);
	}

	.open {
		fill: transparent;
	}

	.fill[data-tone='carrot'] {
		fill: var(--dd-color-recipe-carrot);
	}

	.fill[data-tone='leaf'] {
		fill: var(--dd-color-recipe-leaf);
	}

	.fill[data-tone='tomato'] {
		fill: var(--dd-color-recipe-tomato);
	}

	.fill[data-tone='cheese'] {
		fill: var(--dd-color-recipe-cheese);
	}

	.fill[data-tone='cap'] {
		fill: var(--dd-color-recipe-cap);
	}

	.fill[data-tone='stem'] {
		fill: var(--dd-color-recipe-stem);
	}

	.fill[data-tone='gills'] {
		fill: var(--dd-color-recipe-gills);
	}

	.fill[data-tone='glass'] {
		fill: var(--dd-color-recipe-glass);
		fill-opacity: var(--dd-opacity-recipe-glass);
	}

	.shade {
		fill: var(--dd-color-recipe-shade);
		fill-opacity: var(--dd-opacity-recipe-shade);
	}

	.light,
	.detail[data-kind='light'] {
		fill: var(--dd-color-recipe-light);
		fill-opacity: var(--dd-opacity-recipe-light);
	}

	.detail[data-kind='shade'] {
		fill: var(--dd-color-recipe-shade);
		fill-opacity: var(--dd-opacity-recipe-shade);
	}

	.detail[data-kind='crease'],
	.detail[data-kind='edge'] {
		fill: transparent;
		stroke: var(--dd-color-recipe-line);
		stroke-width: var(--dd-border-width-thin);
	}

	.detail[data-kind='crease'] {
		stroke-opacity: var(--dd-opacity-recipe-crease);
	}

	[data-small] .detail[data-kind='crease'] {
		display: none;
	}

	.detail[data-kind='face'],
	.detail[data-kind='hole'] {
		fill: var(--dd-color-recipe-cheese-rind);
	}

	.detail[data-kind='hole'] {
		stroke: var(--dd-color-recipe-line);
		stroke-width: var(--dd-border-width-thin);
	}

	.liquid {
		fill: var(--dd-color-recipe-liquid);
	}

	.cut {
		stroke: var(--dd-color-recipe-line);
		stroke-width: var(--dd-border-width-thin);
	}

	[data-look='0'] .cut {
		fill: var(--dd-color-recipe-carrot-flesh);
	}

	[data-look='1'] .cut {
		fill: var(--dd-color-recipe-tomato-flesh);
	}

	[data-look='2'] .cut {
		fill: var(--dd-color-recipe-cheese-flesh);
	}

	[data-look='3'] .cut {
		fill: var(--dd-color-recipe-flesh);
	}

	.stream,
	.stream-line {
		fill: transparent;
	}

	.stream-line {
		stroke: var(--dd-color-recipe-line);
		stroke-width: calc(var(--dd-border-width-target) + var(--dd-border-width-thick) * 2);
	}

	.stream {
		stroke: var(--dd-color-recipe-liquid);
		stroke-width: var(--dd-border-width-target);
	}
</style>
