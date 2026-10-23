<script lang="ts">
	import { MATERIAL_OF_MARK, blockArt } from './block-art';
	import type { BlockLook, BlockSize } from './blocks';

	interface Props {
		size: BlockSize;
		look: BlockLook;
	}

	let { size, look }: Props = $props();

	const material = $derived(MATERIAL_OF_MARK[look.mark]);
	const art = $derived(blockArt(size, material));
	const under = $derived(art.parts.filter((part) => !part.over));
	const over = $derived(art.parts.filter((part) => part.over));
</script>

<!-- A block with its bottom front centre on the origin: front, top and right side, lit from the top left. -->
<g class="block" data-colour={look.colour} data-material={material}>
	<path class="paint" d={art.outline} />
	<path class="top" d={art.top} />
	<path class="side" d={art.side} />
	<path class="low" d={art.low} />
	{#each under as part, index (index)}
		<path class={part.role} d={part.d} />
	{/each}
	<path class="rim" d={art.rim} />
	<path class="edge" d={art.edges} />
	<path class="outline" d={art.outline} />
	{#each over as part, index (index)}
		<path class={part.role} d={part.d} />
	{/each}
</g>

<style>
	path {
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.paint {
		fill: var(--dd-tower-paint);
	}

	.block {
		--dd-tower-paint: var(--dd-color-tower-block-a);
	}

	[data-colour='b'] {
		--dd-tower-paint: var(--dd-color-tower-block-b);
	}

	[data-colour='c'] {
		--dd-tower-paint: var(--dd-color-tower-block-c);
	}

	[data-colour='d'] {
		--dd-tower-paint: var(--dd-color-tower-block-d);
	}

	[data-colour='e'] {
		--dd-tower-paint: var(--dd-color-tower-block-e);
	}

	[data-colour='f'] {
		--dd-tower-paint: var(--dd-color-tower-block-f);
	}

	/* Wood keeps its own colour, whatever the colour of its group. */
	[data-material='wood'] {
		--dd-tower-paint: var(--dd-color-tower-wood);
	}

	.top,
	.light {
		fill: var(--dd-color-tower-light);
		fill-opacity: var(--dd-opacity-tower-top);
	}

	.side,
	.shade {
		fill: var(--dd-color-tower-shade);
		fill-opacity: var(--dd-opacity-tower-side);
	}

	.low {
		fill: var(--dd-color-tower-shade);
		fill-opacity: var(--dd-opacity-tower-shade);
	}

	.shine {
		fill: var(--dd-color-tower-light);
		fill-opacity: var(--dd-opacity-tower-light);
	}

	.rim {
		fill: transparent;
		stroke: var(--dd-color-tower-light);
		stroke-opacity: var(--dd-opacity-tower-light);
		stroke-width: var(--dd-border-width-thin);
	}

	.edge,
	.fine {
		fill: transparent;
		stroke: var(--dd-color-tower-line);
		stroke-width: var(--dd-border-width-thin);
	}

	.outline,
	.line {
		fill: transparent;
		stroke: var(--dd-color-tower-line);
		stroke-width: var(--dd-border-width-thick);
	}

	.metal {
		fill: var(--dd-color-tower-metal);
		stroke: var(--dd-color-tower-line);
		stroke-width: var(--dd-border-width-thin);
	}

	.frame {
		fill: var(--dd-color-tower-mortar);
		stroke: var(--dd-color-tower-line);
		stroke-width: var(--dd-border-width-thin);
	}

	.sill {
		fill: var(--dd-color-tower-mortar);
	}

	.glass {
		fill: var(--dd-color-tower-glass);
	}

	.joint {
		fill: transparent;
		stroke: var(--dd-color-tower-mortar);
		stroke-width: var(--dd-border-width-thick);
	}

	.hole {
		fill: var(--dd-color-tower-shade);
		fill-opacity: var(--dd-opacity-tower-hole);
	}

	.ink {
		fill: var(--dd-color-tower-line);
	}

	.gem {
		fill: var(--dd-color-tower-light);
	}
</style>
