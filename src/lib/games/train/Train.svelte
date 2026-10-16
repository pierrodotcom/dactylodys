<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { GameProps } from '../types';
	import Bubble from '../shared/Bubble.svelte';
	import GameShell from '../shared/GameShell.svelte';
	import { isRewarded, pickCyclic, type GameView } from '../shared/game-view';
	import Progress from './Progress.svelte';
	import Scene from './Scene.svelte';
	import { QUIPS } from './texts';

	const props: GameProps = $props();

	function quipFor(view: GameView): string {
		return pickCyclic(QUIPS, view.groupIndex)?.() ?? '';
	}

	function announce(view: GameView): string {
		if (!isRewarded(view)) return '';
		return view.groupIndex === view.total - 1
			? m.game_train_announce_last()
			: m.game_train_announce_group({ quip: quipFor(view) });
	}
</script>

<GameShell
	{...props}
	title={m.game_train_title()}
	pauseText={m.game_train_pause_text()}
	arrangement="wide"
	{progress}
	{scene}
	{announce}
/>

{#snippet progress(view: GameView)}
	<Progress
		total={view.total}
		done={view.completed}
		current={isRewarded(view) ? -1 : view.groupIndex}
	/>
{/snippet}

{#snippet scene(view: GameView)}
	<div class="wrap">
		<div class="bubble-row">
			{#if view.phase === 'celebrating'}
				<Bubble still={view.reducedMotion} compact>{quipFor(view)}</Bubble>
			{/if}
		</div>
		<Scene {view} />
	</div>
{/snippet}

<style>
	.wrap {
		position: relative;
		inline-size: 100%;
		max-inline-size: var(--dd-size-scene-max);
	}

	.bubble-row {
		position: absolute;
		inset-block-start: var(--dd-space-sm);
		inset-inline-start: var(--dd-space-sm);
		z-index: var(--dd-z-index-raised);
	}
</style>
