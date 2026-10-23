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

	/** Colours of the finished marks, in turn. */
	const INKS = 6;

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
			class="step"
			viewBox="0 0 36 36"
			focusable="false"
			aria-hidden="true"
			data-state={index < done ? 'done' : index === current ? 'current' : 'next'}
			data-ink={index % INKS}
		>
			<rect class="card" x="2" y="2" width="32" height="32" rx="5" />
			<path class="mark" d={SQUIGGLES[index % SQUIGGLES.length]} />
		</svg>
	{/each}
</div>

<style>
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dd-space-sm);
	}

	.step {
		inline-size: var(--dd-size-drawing-step);
		block-size: var(--dd-size-drawing-step);
	}

	.card {
		fill: transparent;
		stroke: var(--dd-color-border-strong);
		stroke-width: var(--dd-border-width-thick);
		stroke-dasharray: 4 4;
	}

	.mark {
		fill: transparent;
		stroke: transparent;
		stroke-width: var(--dd-border-width-target);
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.step[data-state='current'] .card {
		fill: var(--dd-color-drawing-paper);
		stroke: var(--dd-color-accent-base);
		stroke-width: var(--dd-border-width-target);
		stroke-dasharray: none;
	}

	.step[data-state='current'] .mark {
		stroke: var(--dd-color-accent-base);
		stroke-dasharray: 3 5;
	}

	.step[data-state='done'] .card {
		fill: var(--dd-color-drawing-paper);
		stroke: var(--dd-color-drawing-pencil);
		stroke-dasharray: none;
	}

	.step[data-state='done'] .mark {
		stroke: var(--dd-color-drawing-pencil);
	}

	.step[data-state='done'][data-ink='0'] .mark {
		stroke: var(--dd-color-drawing-fur-dark);
	}

	.step[data-state='done'][data-ink='1'] .mark {
		stroke: var(--dd-color-drawing-petal-dark);
	}

	.step[data-state='done'][data-ink='2'] .mark {
		stroke: var(--dd-color-drawing-stripe);
	}

	.step[data-state='done'][data-ink='3'] .mark {
		stroke: var(--dd-color-drawing-hull);
	}

	.step[data-state='done'][data-ink='4'] .mark {
		stroke: var(--dd-color-drawing-wood);
	}

	.step[data-state='done'][data-ink='5'] .mark {
		stroke: var(--dd-color-drawing-leaf-dark);
	}
</style>
