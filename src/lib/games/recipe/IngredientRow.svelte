<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { isOne } from '$lib/ui/plural';
	import IngredientShape from './IngredientShape.svelte';
	import { PREP_STAGES } from './prep';

	interface Props {
		total: number;
		done: number;
		/** Index of the ingredient being prepared, `-1` between two ingredients. */
		current: number;
	}

	let { total, done, current }: Props = $props();

	const items = $derived(Array.from({ length: total }, (_, index) => index));
	const label = $derived(
		isOne(done)
			? m.game_recipe_progress_one({ done, total })
			: m.game_recipe_progress_other({ done, total })
	);
</script>

<div class="row" role="img" aria-label={label}>
	{#each items as index (index)}
		<span class="item" data-state={index < done ? 'done' : index === current ? 'current' : 'next'}>
			<svg class="tile" viewBox="-44 -48 88 96" focusable="false" aria-hidden="true">
				<IngredientShape variant={index} stage={index < done ? PREP_STAGES : 0} />
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
