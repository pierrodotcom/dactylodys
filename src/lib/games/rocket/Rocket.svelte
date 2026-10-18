<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { GameProps } from '../types';
	import Bubble from '../shared/Bubble.svelte';
	import GameShell from '../shared/GameShell.svelte';
	import { isRewarded, pickCyclic, type GameView } from '../shared/game-view';
	import AstreRow from './AstreRow.svelte';
	import { isLastLeg } from './flight';
	import RocketScene from './RocketScene.svelte';
	import { GREETINGS } from './texts';

	const props: GameProps = $props();

	function greetingFor(view: GameView): string {
		return pickCyclic(GREETINGS, view.groupIndex)?.() ?? '';
	}

	function announce(view: GameView): string {
		if (!isRewarded(view)) return '';
		return isLastLeg(view)
			? m.game_rocket_announce_landed()
			: m.game_rocket_announce_arrived({ greeting: greetingFor(view) });
	}
</script>

<GameShell
	{...props}
	title={m.game_rocket_title()}
	pauseText={m.game_rocket_pause_text()}
	arrangement="stacked"
	{progress}
	{scene}
	{announce}
/>

{#snippet progress(view: GameView)}
	<AstreRow
		total={view.total}
		reached={view.completed}
		current={isRewarded(view) ? -1 : view.groupIndex}
	/>
{/snippet}

{#snippet scene(view: GameView)}
	<div class="voyage">
		<div class="bubble-row">
			{#if isRewarded(view)}
				<Bubble still={view.reducedMotion} compact>{greetingFor(view)}</Bubble>
			{/if}
		</div>
		<RocketScene {view} />
	</div>
{/snippet}

<style>
	.voyage {
		position: relative;
		display: grid;
		grid-template-rows: minmax(0, 1fr);
		inline-size: 100%;
		block-size: 100%;
	}

	.bubble-row {
		position: absolute;
		inset-block-start: var(--dd-space-sm);
		inset-inline-start: var(--dd-space-sm);
		z-index: var(--dd-z-index-raised);
	}
</style>
