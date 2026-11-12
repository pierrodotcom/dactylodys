<svelte:options namespace="svg" />

<!-- One object of the river, around (0, 0): each part filled, then outlined, then its fine lines. -->
<script lang="ts">
	import type { ObjectArt } from './shapes';

	interface Props {
		art: ObjectArt;
	}

	let { art }: Props = $props();
</script>

<g class="object-art" data-art={art.id}>
	{#each art.parts as part, index (index)}
		<path class="part" data-paint={part.paint} data-holed={part.holed || undefined} d={part.d} />
		{#if part.outlined !== false}
			<path class="line" d={part.d} />
		{/if}
	{/each}
	{#if art.strokes}
		<path class="line" d={art.strokes} />
	{/if}
	{#if art.fine}
		<path class="fine" d={art.fine} />
	{/if}
</g>

<style>
	path {
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.line,
	.fine {
		fill: transparent;
		stroke: var(--dd-color-river-line);
		stroke-width: var(--dd-border-width-thick);
	}

	.fine {
		stroke-width: var(--dd-border-width-thin);
	}

	[data-holed] {
		fill-rule: evenodd;
	}

	[data-paint='leaf'] {
		fill: var(--dd-color-river-leaf);
	}

	[data-paint='paper'] {
		fill: var(--dd-color-river-paper);
	}

	[data-paint='paper-fold'] {
		fill: var(--dd-color-river-paper-fold);
	}

	[data-paint='duck'] {
		fill: var(--dd-color-river-duck);
	}

	[data-paint='beak'] {
		fill: var(--dd-color-river-beak);
	}

	[data-paint='glass'] {
		fill: var(--dd-color-river-glass);
	}

	[data-paint='cork'] {
		fill: var(--dd-color-river-cork);
	}

	[data-paint='apple'] {
		fill: var(--dd-color-river-apple);
	}

	[data-paint='cup'] {
		fill: var(--dd-color-river-cup);
	}

	[data-paint='tea'] {
		fill: var(--dd-color-river-tea);
	}

	[data-paint='cup-dot'] {
		fill: var(--dd-color-river-cup-dot);
	}

	[data-paint='ball-a'] {
		fill: var(--dd-color-river-ball-a);
	}

	[data-paint='ball-b'] {
		fill: var(--dd-color-river-ball-b);
	}

	[data-paint='ball-base'] {
		fill: var(--dd-color-river-ball-base);
	}

	[data-paint='star'] {
		fill: var(--dd-color-river-star);
	}

	[data-paint='ring'] {
		fill: var(--dd-color-river-ring);
	}

	[data-paint='ring-band'] {
		fill: var(--dd-color-river-ring-band);
	}

	[data-paint='hat'] {
		fill: var(--dd-color-river-hat);
	}

	[data-paint='hat-band'] {
		fill: var(--dd-color-river-hat-band);
	}

	[data-paint='lily-pad'] {
		fill: var(--dd-color-river-lily-pad);
	}

	[data-paint='lily-petal'] {
		fill: var(--dd-color-river-lily-petal);
	}

	[data-paint='lily-heart'] {
		fill: var(--dd-color-river-lily-heart);
	}

	[data-paint='rocket'] {
		fill: var(--dd-color-river-rocket);
	}

	[data-paint='rocket-fin'] {
		fill: var(--dd-color-river-rocket-fin);
	}

	[data-paint='rocket-window'] {
		fill: var(--dd-color-river-rocket-window);
	}

	[data-paint='line'] {
		fill: var(--dd-color-river-line);
	}

	[data-paint='light'] {
		fill: var(--dd-color-river-light);
		fill-opacity: var(--dd-opacity-river-light);
	}
</style>
