<svelte:options namespace="svg" />

<!--
	A prop of the desk (a pencil, a visitor): one outline around all its forms, drawn under them
	twice as thick, then each form with its shade kept inside it, then its lines.
-->
<script lang="ts">
	import type { Figure } from './scenery';

	interface Props {
		figure: Figure;
	}

	let { figure }: Props = $props();

	const uid = $props.id();
</script>

<g class="figure">
	{#each figure.parts as part, index (index)}
		{#if !part.outlined}
			<path class="underlay" d={part.d} />
		{/if}
	{/each}
	{#each figure.parts as part, index (index)}
		<path class="fill" data-paint={part.paint} d={part.d} />
		{#if part.shade}
			<clipPath id="{uid}-{index}"><path d={part.d} /></clipPath>
			<g clip-path="url(#{uid}-{index})">
				<path class="shade" fill-rule="evenodd" d={part.shade} />
			</g>
		{/if}
		{#if part.outlined}
			<path class="outline" d={part.d} />
		{/if}
	{/each}
	{#if figure.lines}
		<path class="outline open" d={figure.lines} />
	{/if}
	{#if figure.fine}
		<path class="outline open" data-fine d={figure.fine} />
	{/if}
</g>

<style>
	.underlay,
	.outline {
		stroke: var(--dd-color-drawing-pencil);
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.underlay {
		fill: var(--dd-color-drawing-pencil);
		stroke-width: var(--dd-border-width-drawing-bold);
	}

	.outline {
		fill: transparent;
		stroke-width: calc(var(--dd-border-width-drawing-bold) * 0.5);
	}

	.outline[data-fine] {
		stroke-width: calc(var(--dd-border-width-drawing-bold) * 0.3);
	}

	.fill {
		stroke: none;
	}

	.shade {
		fill: var(--dd-color-drawing-shade);
		fill-opacity: var(--dd-opacity-drawing-shade);
	}

	.fill[data-paint='pencil-body'] {
		fill: var(--dd-color-drawing-pencil-body);
	}

	.fill[data-paint='pencil-wood'] {
		fill: var(--dd-color-drawing-pencil-wood);
	}

	.fill[data-paint='ink'] {
		fill: var(--dd-color-drawing-ink);
	}

	.fill[data-paint='metal'] {
		fill: var(--dd-color-drawing-metal);
	}

	.fill[data-paint='rubber'] {
		fill: var(--dd-color-drawing-rubber);
	}

	.fill[data-paint='gold'] {
		fill: var(--dd-color-drawing-gold);
	}

	.fill[data-paint='stripe'] {
		fill: var(--dd-color-drawing-stripe);
	}

	.fill[data-paint='glass'] {
		fill: var(--dd-color-drawing-glass);
	}

	.fill[data-paint='white'] {
		fill: var(--dd-color-drawing-white);
	}

	.fill[data-paint='hull'] {
		fill: var(--dd-color-drawing-hull);
	}

	.fill[data-paint='leaf'] {
		fill: var(--dd-color-drawing-leaf);
	}

	.fill[data-paint='dino'] {
		fill: var(--dd-color-companion-green-body);
	}

	.fill[data-paint='dino-belly'] {
		fill: var(--dd-color-companion-green-belly);
	}

	.fill[data-paint='dino-plate'] {
		fill: var(--dd-color-companion-green-plate);
	}

	.fill[data-paint='dino-cheek'] {
		fill: var(--dd-color-companion-green-cheek);
	}

	.fill[data-paint='eye'] {
		fill: var(--dd-color-companion-eye);
	}

	.fill[data-paint='tongue'] {
		fill: var(--dd-color-companion-tongue);
	}

	.fill[data-paint='rocket'] {
		fill: var(--dd-color-rocket-body);
	}

	.fill[data-paint='rocket-fin'] {
		fill: var(--dd-color-rocket-fin);
	}

	.fill[data-paint='rocket-window'] {
		fill: var(--dd-color-rocket-window);
	}

	.fill[data-paint='flame'] {
		fill: var(--dd-color-rocket-flame-outer);
	}

	.fill[data-paint='flame-core'] {
		fill: var(--dd-color-rocket-flame-inner);
	}
</style>
