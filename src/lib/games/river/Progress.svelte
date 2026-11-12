<!-- One small object per group, the same as on the river: in colour once it is caught. -->
<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { isOne } from '$lib/ui/plural';
	import { pickCyclic } from '../shared/game-view';
	import ObjectArt from './ObjectArt.svelte';
	import { OBJECT_ARTS } from './shapes';

	interface Props {
		total: number;
		done: number;
		/** Index of the group being typed, `-1` between two groups. */
		current: number;
		/** Rank of the first group of this play: the objects go on from one play to the next. */
		offset: number;
	}

	let { total, done, current, offset }: Props = $props();

	const items = $derived(
		Array.from({ length: total }, (_, index) => ({
			index,
			art: pickCyclic(OBJECT_ARTS, offset + index)
		}))
	);
	const label = $derived(
		isOne(done)
			? m.game_river_progress_one({ done, total })
			: m.game_river_progress_other({ done, total })
	);
</script>

<div class="row" role="img" aria-label={label}>
	{#each items as item (item.index)}
		<span
			class="item"
			data-state={item.index < done ? 'done' : item.index === current ? 'current' : 'next'}
		>
			<svg class="tile" viewBox="-32 -30 64 48" focusable="false" aria-hidden="true">
				{#if item.art}
					<ObjectArt art={item.art} />
				{/if}
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
		inline-size: var(--dd-size-ingredient-mini);
		padding-block-end: var(--dd-space-sm);
	}

	.tile {
		display: block;
		inline-size: 100%;
		block-size: auto;
		overflow: visible;
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
