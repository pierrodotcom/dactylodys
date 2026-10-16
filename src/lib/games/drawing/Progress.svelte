<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { isOne } from '$lib/ui/plural';
	import { SQUIGGLES } from './shapes';

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
			? m.game_drawing_progress_one({ done, total })
			: m.game_drawing_progress_other({ done, total })
	);
</script>

<div class="row" role="img" aria-label={label}>
	{#each steps as index (index)}
		<svg
			class="squiggle"
			viewBox="0 0 36 36"
			focusable="false"
			aria-hidden="true"
			data-state={index < done ? 'done' : index === current ? 'current' : 'next'}
		>
			<path d={SQUIGGLES[index % SQUIGGLES.length]} />
		</svg>
	{/each}
</div>

<style>
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dd-space-sm);
	}

	.squiggle {
		inline-size: var(--dd-size-egg-mini);
		block-size: var(--dd-size-egg-mini);
		fill: transparent;
		stroke: var(--dd-color-border-strong);
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.squiggle[data-state='current'] {
		stroke: var(--dd-color-accent-base);
		stroke-width: var(--dd-border-width-target);
	}

	.squiggle[data-state='done'] {
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-target);
	}
</style>
