<!-- One speech bubble per answer: filled once the companion has given it. -->
<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { isOne } from '$lib/ui/plural';

	interface Props {
		total: number;
		done: number;
		/** Index of the group being typed, `-1` between two groups. */
		current: number;
	}

	const BUBBLE = 'M6 3H34Q38 3 38 7V21Q38 25 34 25H17L9 31L11 25H6Q2 25 2 21V7Q2 3 6 3Z';
	const DOTS = [12, 20, 28];

	let { total, done, current }: Props = $props();

	const items = $derived(Array.from({ length: total }, (_, index) => index));
	const label = $derived(
		isOne(done)
			? m.game_dialogue_progress_one({ done, total })
			: m.game_dialogue_progress_other({ done, total })
	);
</script>

<div class="row" role="img" aria-label={label}>
	{#each items as index (index)}
		<span class="item" data-state={index < done ? 'done' : index === current ? 'current' : 'next'}>
			<svg class="tile" viewBox="0 0 40 34" focusable="false" aria-hidden="true">
				<path class="bubble-shape" d={BUBBLE} />
				{#each DOTS as x (x)}
					<circle class="dot" cx={x} cy="14" r="2.4" />
				{/each}
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

	.bubble-shape {
		fill: var(--dd-color-bubble-surface);
		stroke: var(--dd-color-dialogue-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	.dot {
		fill: var(--dd-color-dialogue-answer-dot);
	}

	.item[data-state='done'] .bubble-shape {
		fill: var(--dd-color-dialogue-host-body);
	}

	.item[data-state='done'] .dot {
		fill: var(--dd-color-dialogue-line);
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
