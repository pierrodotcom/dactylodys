<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { isOne } from '$lib/ui/plural';
	import BlockShape from './BlockShape.svelte';
	import { blockLook } from './blocks';

	interface Props {
		total: number;
		done: number;
		/** Index of the group being typed, `-1` between two groups. */
		current: number;
	}

	/** Size of the mini blocks, in the units of their drawing. */
	const TILE = { width: 52, height: 15 } as const;

	let { total, done, current }: Props = $props();

	const items = $derived(Array.from({ length: total }, (_, index) => index));
	const label = $derived(
		isOne(done)
			? m.game_tower_progress_one({ done, total })
			: m.game_tower_progress_other({ done, total })
	);
</script>

<div class="row" role="img" aria-label={label}>
	{#each items as index (index)}
		<span class="item" data-state={index < done ? 'done' : index === current ? 'current' : 'next'}>
			<svg class="tile" viewBox="-30 -25 68 28" focusable="false" aria-hidden="true">
				<BlockShape size={TILE} look={blockLook(index)} />
			</svg>
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
		inline-size: calc(var(--dd-size-ingredient-mini) * 1.5);
		padding-block-end: var(--dd-space-sm);
	}

	.tile {
		display: block;
		inline-size: 100%;
		block-size: auto;
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
