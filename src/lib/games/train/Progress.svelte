<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { isOne } from '$lib/ui/plural';
	import LocoShape from './LocoShape.svelte';
	import { WAGON, wagonLook } from './shapes';
	import WagonShape from './WagonShape.svelte';

	interface Props {
		total: number;
		done: number;
		/** Index of the group being typed, `-1` between two groups. */
		current: number;
	}

	/** Box of a mini wagon: the wagon, its load and the hitch. */
	const WAGON_BOX = {
		x: -4,
		y: -(WAGON.height + 3),
		width: WAGON.pitch + 6,
		height: WAGON.height + 6
	} as const;

	let { total, done, current }: Props = $props();

	const steps = $derived(Array.from({ length: total }, (_, index) => index));
	const label = $derived(
		isOne(done)
			? m.game_train_progress_one({ done, total })
			: m.game_train_progress_other({ done, total })
	);
</script>

<div class="row" role="img" aria-label={label}>
	<svg class="loco" viewBox="-6 -76 118 80" focusable="false" aria-hidden="true">
		<LocoShape puff={false} />
	</svg>
	{#each steps as index (index)}
		{@const look = wagonLook(index)}
		<span class="item" data-state={index < done ? 'done' : index === current ? 'current' : 'next'}>
			<svg
				class="tile"
				viewBox="{WAGON_BOX.x} {WAGON_BOX.y} {WAGON_BOX.width} {WAGON_BOX.height}"
				focusable="false"
				aria-hidden="true"
			>
				<WagonShape tone={look.tone} cargo={look.cargo} empty={index >= done} />
			</svg>
		</span>
	{/each}
</div>

<style>
	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--dd-space-xs);
	}

	.loco {
		display: block;
		inline-size: var(--dd-size-star-large);
		block-size: auto;
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
