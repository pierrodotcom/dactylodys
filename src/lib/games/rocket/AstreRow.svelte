<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { isOne } from '$lib/ui/plural';
	import AstreShape from './AstreShape.svelte';

	interface Props {
		total: number;
		reached: number;
		/** Index of the astre being flown to, `-1` between two astres. */
		current: number;
	}

	let { total, reached, current }: Props = $props();

	const astres = $derived(Array.from({ length: total }, (_, index) => index));
	const label = $derived(
		isOne(reached)
			? m.game_rocket_progress_one({ reached, total })
			: m.game_rocket_progress_other({ reached, total })
	);
</script>

<div class="row" role="img" aria-label={label}>
	{#each astres as index (index)}
		<span
			class="item"
			data-state={index < reached ? 'reached' : index === current ? 'current' : 'next'}
		>
			<svg class="tile" viewBox="0 0 100 100" focusable="false" aria-hidden="true">
				<AstreShape variant={index} lit={index < reached} />
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
		inline-size: var(--dd-size-astre-mini);
		padding-block-end: var(--dd-space-sm);
	}

	.tile {
		display: block;
		inline-size: 100%;
		block-size: auto;
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-sky-base);
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
