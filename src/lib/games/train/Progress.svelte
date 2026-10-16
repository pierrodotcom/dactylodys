<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { isOne } from '$lib/ui/plural';

	interface Props {
		total: number;
		done: number;
		/** Index of the group being typed, `-1` between two groups. */
		current: number;
	}

	let { total, done, current }: Props = $props();

	const steps = $derived(Array.from({ length: total }, (_, index) => index));
	const label = $derived(
		isOne(done)
			? m.game_train_progress_one({ done, total })
			: m.game_train_progress_other({ done, total })
	);
</script>

<!-- Placeholder: the work package of the game replaces the dots by its own picture. -->
<div class="row" role="img" aria-label={label}>
	{#each steps as index (index)}
		<span class="dot" data-state={index < done ? 'done' : index === current ? 'current' : 'next'}
		></span>
	{/each}
</div>

<style>
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dd-space-sm);
	}

	.dot {
		inline-size: var(--dd-size-egg-mini);
		block-size: var(--dd-size-egg-mini);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-pill);
	}

	.dot[data-state='done'] {
		background-color: var(--dd-color-star-fill);
	}

	.dot[data-state='current'] {
		border-color: var(--dd-color-accent-base);
	}
</style>
