<svelte:options namespace="svg" />

<script lang="ts">
	import { POT } from './shapes';

	interface Props {
		/**
		 * The back of the pot (its shadow, rim, inside and soup), the surface of the soup in front of
		 * what floats in it, or its front (handles, body and the front of the rim).
		 */
		layer: 'back' | 'surface' | 'front';
	}

	let { layer }: Props = $props();

	const uid = $props.id();

	function ref(name: string): string {
		return `${uid}-${name}`;
	}

	function url(name: string): string {
		return `url(#${ref(name)})`;
	}
</script>

{#if layer === 'back'}
	<path class="ground" d={POT.shadowPath} />
	<path class="metal-light line" fill-rule="evenodd" d={POT.ringPath} />
	<clipPath id={ref('inside')}><path d={POT.insidePath} /></clipPath>
	<path class="inside" d={POT.insidePath} />
	<g clip-path={url('inside')}>
		<path class="metal" fill-rule="evenodd" d={POT.insideLight} />
	</g>
	<path class="open line" d={POT.insidePath} />
	<clipPath id={ref('soup')}><path d={POT.soupPath} /></clipPath>
	<path class="soup" d={POT.soupPath} />
	<g clip-path={url('soup')}>
		<path class="soup-dark" fill-rule="evenodd" d={POT.soupBack} />
		<path class="light" d={POT.soupLights} />
	</g>
	<path class="open fine" d={POT.soupPath} />
{:else if layer === 'surface'}
	<path class="soup" d={POT.soupFront} />
	<path class="ripple" d={POT.ripplePath} />
{:else}
	{#each POT.handlePaths as handle, index (handle)}
		<path class="metal line" d={handle} />
		<path class="light" d={POT.handleLights[index]} />
	{/each}
	<clipPath id={ref('body')}><path d={POT.bodyPath} /></clipPath>
	<path class="metal" d={POT.bodyPath} />
	<g clip-path={url('body')}>
		<path class="shade" fill-rule="evenodd" d={POT.bodyShade} />
		<path class="shade" d={POT.underLip} />
		{#each POT.bodyLights as light (light)}
			<path class="light" d={light} />
		{/each}
	</g>
	<path class="metal-light fine" d={POT.rivets} />
	<path class="open line" d={POT.bodyPath} />
	<path class="metal-light line" d={POT.lipPath} />
	<path class="gleam" d={POT.rimGleams} />
{/if}

<style>
	.line,
	.fine,
	.ripple,
	.gleam {
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.line {
		stroke: var(--dd-color-recipe-line);
		stroke-width: var(--dd-border-width-thick);
	}

	.fine {
		stroke: var(--dd-color-recipe-line);
		stroke-width: var(--dd-border-width-thin);
	}

	.open,
	.ripple,
	.gleam {
		fill: transparent;
	}

	.ground {
		fill: var(--dd-color-recipe-shade);
		fill-opacity: var(--dd-opacity-recipe-shadow);
	}

	.metal {
		fill: var(--dd-color-recipe-pot);
	}

	.metal-light {
		fill: var(--dd-color-recipe-pot-light);
	}

	.inside {
		fill: var(--dd-color-recipe-pot-inside);
	}

	.soup {
		fill: var(--dd-color-recipe-soup);
	}

	.soup-dark {
		fill: var(--dd-color-recipe-soup-dark);
	}

	.shade {
		fill: var(--dd-color-recipe-shade);
		fill-opacity: var(--dd-opacity-recipe-shade);
	}

	.light {
		fill: var(--dd-color-recipe-light);
		fill-opacity: var(--dd-opacity-recipe-light);
	}

	.ripple {
		stroke: var(--dd-color-recipe-soup-light);
		stroke-width: var(--dd-border-width-thick);
	}

	.gleam {
		stroke: var(--dd-color-recipe-light);
		stroke-width: var(--dd-border-width-thick);
		stroke-opacity: var(--dd-opacity-recipe-light);
	}
</style>
