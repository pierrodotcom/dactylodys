<!--
	The river: objects float in from the left, one behind the other; the first one waits at the dock,
	above the companion, until its group is typed; then the companion fishes it out into the crate.
	Nothing ever floats away. The text to type stays in the text zone of the game.
-->
<script lang="ts">
	import Companion from '$lib/ui/components/Companion.svelte';
	import Bubble from '../shared/Bubble.svelte';
	import type { DecorOf } from '../shared/decor';
	import { isRewarded, pickCyclic, type GameView } from '../shared/game-view';
	import Floater from './Floater.svelte';
	import Riverbank from './Riverbank.svelte';
	import { SCENE, objectOf, probeOf, riverObjects } from './river';
	import { OBJECT_ARTS } from './shapes';
	import Surprise from './Surprise.svelte';
	import { QUIPS } from './texts';

	interface Props {
		view: GameView;
		decor?: DecorOf<'river'>;
	}

	let { view, decor = 'day' }: Props = $props();

	const rewarded = $derived(isRewarded(view));
	const objects = $derived(riverObjects(view));
	const typing = $derived(view.phase === 'typing');
	const sceneId = $derived(rewarded && view.scene.kind === 'scene' ? view.scene.id : undefined);
	const quip = $derived(pickCyclic(QUIPS, view.rewardIndex)?.() ?? '');
	const label = $derived({ text: view.group, typed: view.position });
</script>

<div
	class="river-scene"
	data-decor={decor}
	data-probe={probeOf(view)}
	data-still={view.reducedMotion || undefined}
>
	<svg
		class="river"
		viewBox="0 0 {SCENE.width} {SCENE.height}"
		focusable="false"
		aria-hidden="true"
	>
		<Riverbank {decor} />
		{#each objects as object (object.index)}
			{@const art = objectOf(OBJECT_ARTS, view, object.index)}
			{#if art}
				<Floater
					{art}
					place={object.place}
					role={object.role}
					still={view.reducedMotion}
					label={typing && object.role === 'docked' ? label : undefined}
				/>
			{/if}
		{/each}
		{#if sceneId}
			<Surprise {sceneId} />
		{/if}
	</svg>

	<div class="companion">
		<Companion mood={view.mood} />
	</div>

	{#if view.phase === 'celebrating'}
		<div class="bubble-row">
			<Bubble still={view.reducedMotion} compact>{quip}</Bubble>
		</div>
	{/if}
</div>

<style>
	.river-scene {
		position: relative;
		inline-size: 100%;
		max-inline-size: var(--dd-size-scene-max);
		overflow: hidden;
		border-radius: var(--dd-radius-lg);
	}

	.river {
		display: block;
		inline-size: 100%;
		block-size: auto;
	}

	/* On the near bank, under the dock, in the middle of the scene. */
	.companion {
		position: absolute;
		inset-block-end: 0;
		inset-inline: 0;
		margin-inline: auto;
		inline-size: var(--dd-size-river-companion);
		aspect-ratio: 1;
		--dd-size-companion: var(--dd-size-river-companion-fill);
	}

	.bubble-row {
		position: absolute;
		inset-block-start: var(--dd-space-sm);
		inset-inline-start: var(--dd-space-sm);
		z-index: var(--dd-z-index-raised);
	}
</style>
