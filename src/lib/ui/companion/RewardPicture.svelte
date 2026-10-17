<script lang="ts">
	/*
	 * The drawing of one reward on its own, for lists and announcements (lot R2): an item alone,
	 * centred and enlarged; the companion in the pose of a trick; a trophy. Not owned yet: a
	 * silhouette, one flat shape without details, with what to master said by the caller.
	 */
	import type { RewardKind } from '$lib/engine/rewards/types';
	import Companion from '$lib/ui/components/Companion.svelte';
	import CompanionItem from './CompanionItem.svelte';
	import { squareViewBox } from './geometry';
	import { ITEM_ARTS, ITEM_LAYERS } from './items';
	import TrophyArt from './TrophyArt.svelte';

	interface Props {
		artId: string;
		kind: RewardKind;
		/** `false`: drawn as a silhouette, with what to master said by the caller. */
		owned: boolean;
		/** Accessible name, usually the title of the reward. */
		label: string;
		/** For a trophy of keys: the keys it shows (`trophyKeys`); none otherwise. */
		keys?: readonly string[];
	}

	let { artId, kind, owned, label, keys = [] }: Props = $props();

	/** Room around an item drawn alone, in units of its drawing. */
	const ITEM_MARGIN = 7;
	const FULL_VIEW_BOX = '0 0 120 120';

	const item = $derived(kind === 'item' ? ITEM_ARTS[artId] : undefined);
	const viewBox = $derived(item ? squareViewBox(item.frame, ITEM_MARGIN) : FULL_VIEW_BOX);
	const layers = $derived(item?.pictureLayers ?? ITEM_LAYERS);
</script>

<div
	class="reward-picture"
	role="img"
	aria-label={label}
	data-art={artId}
	data-kind={kind}
	data-owned={owned}
	data-silhouette={owned ? undefined : ''}
	data-still=""
>
	{#if kind === 'skill'}
		<div class="pose" aria-hidden="true">
			<Companion mood="idle" trick={artId} />
		</div>
	{:else}
		<svg {viewBox} aria-hidden="true" focusable="false">
			{#if kind === 'item'}
				{#each layers as layer (layer)}
					<CompanionItem {artId} {layer} />
				{/each}
			{:else}
				<TrophyArt {artId} {keys} />
			{/if}
		</svg>
	{/if}
</div>

<style>
	.reward-picture {
		display: grid;
		inline-size: 100%;
		aspect-ratio: 1;
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-reward-backdrop);
	}

	svg,
	.pose :global(.companion) {
		display: block;
		inline-size: 100%;
		block-size: auto;
	}

	/* Room for a trick that leaves the view box of the companion (float, cartwheel). */
	.pose {
		padding: var(--dd-space-sm);
	}
</style>
