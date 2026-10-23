<svelte:options namespace="svg" />

<!--
	A filled form with its volume: its fill, then, kept inside it, its painted parts, the shade on
	the side away from the light and its lights. Its outline is left out when the form joins
	another one: the caller then draws one outline under both (`underlay`, L-067).
-->
<script lang="ts" module>
	/** What a form is made of: each one is a colour token of the train. */
	export type Paint =
		| 'paint'
		| 'iron'
		| 'steel'
		| 'brass'
		| 'wood'
		| 'glass'
		| 'glow'
		| 'stone'
		| 'leaf'
		| 'grass'
		| 'tree'
		| 'hill-far'
		| 'hill-near'
		| 'wall'
		| 'roof'
		| 'sun'
		| 'cloud'
		| 'steam'
		| 'empty'
		| 'rocket'
		/** The colour of the wagon, set by the wagon. */
		| 'body'
		/** The colour of a piece of the load, set by the load. */
		| 'cargo'
		/** The colour of what is painted on a piece of the load. */
		| 'accent';
</script>

<script lang="ts">
	import type { Form } from './shapes';

	interface Props {
		form: Form;
		paint: Paint;
		/** Draw its own outline; `false` when an outline is drawn under it and its neighbours. */
		edge?: boolean;
		/** Parts painted on the form, kept inside it. */
		spots?: readonly string[];
		spotPaint?: Paint;
	}

	let { form, paint, edge = true, spots = [], spotPaint = 'accent' }: Props = $props();

	const id = $props.id();
</script>

<clipPath {id}><path d={form.d} /></clipPath>
<path class="fill" data-paint={paint} d={form.d} />
<g clip-path="url(#{id})">
	{#each spots as spot (spot)}
		<path class="fill" data-paint={spotPaint} d={spot} />
	{/each}
	{#if form.shade !== ''}
		<path class="shade" fill-rule="evenodd" d={form.shade} />
	{/if}
	{#each form.lights as light (light)}
		<path class="light" d={light} />
	{/each}
</g>
{#if edge}
	<path class="edge" d={form.d} />
{/if}

<style>
	.fill {
		fill: var(--dd-color-train-paint);
	}

	.fill[data-paint='iron'] {
		fill: var(--dd-color-train-iron);
	}

	.fill[data-paint='steel'] {
		fill: var(--dd-color-train-steel);
	}

	.fill[data-paint='brass'] {
		fill: var(--dd-color-train-brass);
	}

	.fill[data-paint='wood'] {
		fill: var(--dd-color-train-wood);
	}

	.fill[data-paint='glass'] {
		fill: var(--dd-color-train-glass);
	}

	.fill[data-paint='glow'] {
		fill: var(--dd-color-train-glow);
	}

	.fill[data-paint='stone'] {
		fill: var(--dd-color-train-stone);
	}

	.fill[data-paint='leaf'] {
		fill: var(--dd-color-train-leaf);
	}

	.fill[data-paint='grass'] {
		fill: var(--dd-color-train-grass);
	}

	.fill[data-paint='tree'] {
		fill: var(--dd-color-train-tree);
	}

	.fill[data-paint='hill-far'] {
		fill: var(--dd-color-train-hill-far);
	}

	.fill[data-paint='hill-near'] {
		fill: var(--dd-color-train-hill-near);
	}

	.fill[data-paint='wall'] {
		fill: var(--dd-color-train-wall);
	}

	.fill[data-paint='roof'] {
		fill: var(--dd-color-train-roof);
	}

	.fill[data-paint='sun'] {
		fill: var(--dd-color-train-sun);
	}

	.fill[data-paint='cloud'] {
		fill: var(--dd-color-train-cloud);
	}

	.fill[data-paint='steam'],
	.fill[data-paint='rocket'] {
		fill: var(--dd-color-train-steam);
	}

	.fill[data-paint='empty'] {
		fill: var(--dd-color-train-empty);
	}

	.fill[data-paint='body'] {
		fill: var(--dd-train-body);
	}

	.fill[data-paint='cargo'] {
		fill: var(--dd-train-cargo);
	}

	.fill[data-paint='accent'] {
		fill: var(--dd-train-accent);
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
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}
</style>
