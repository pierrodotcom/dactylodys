<script lang="ts">
	import { isOne } from '$lib/ui/plural';
	import { m } from '$lib/paraglide/messages.js';
	import HatchEgg from './HatchEgg.svelte';

	interface Props {
		total: number;
		hatched: number;
		/** Index of the egg being typed, `-1` between two eggs. */
		current: number;
		/** Cracks of the egg being typed. */
		stage: number;

		/** Added to the index of each item, so that it looks like the big picture of the game. */
		offset?: number;
	}

	let { total, hatched, current, stage, offset = 0 }: Props = $props();

	const eggs = $derived(Array.from({ length: total }, (_, index) => index));
	const label = $derived(
		isOne(hatched)
			? m.game_hatching_progress_one({ hatched, total })
			: m.game_hatching_progress_other({ hatched, total })
	);
</script>

<div class="row" role="img" aria-label={label}>
	{#each eggs as index (index)}
		<span
			class="item"
			data-state={index < hatched ? 'hatched' : index === current ? 'current' : 'next'}
		>
			<HatchEgg
				stage={index === current ? stage : 0}
				hatched={index < hatched}
				variant={offset + index}
			/>
		</span>
	{/each}
</div>

<style>
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dd-space-sm);
	}

	.item {
		display: block;
		position: relative;
		inline-size: var(--dd-size-egg-mini);
		padding-block-end: var(--dd-space-sm);
	}

	/* At this size the outlines of the big egg would cover the faces: thinner, without fine lines. */
	.row .item :global(.line) {
		stroke-width: var(--dd-border-width-thin);
	}

	.row .item :global(.underlay) {
		stroke-width: calc(var(--dd-border-width-thin) * 2);
	}

	.row .item :global(.fine) {
		stroke: transparent;
	}

	.item[data-state='next'] {
		opacity: var(--dd-opacity-disabled);
	}

	.item[data-state='current']::after {
		content: '';
		position: absolute;
		inset-inline: 0;
		inset-block-end: 0;
		block-size: var(--dd-border-width-target);
		border-radius: var(--dd-radius-pill);
		background-color: var(--dd-color-typing-current-frame);
	}
</style>
