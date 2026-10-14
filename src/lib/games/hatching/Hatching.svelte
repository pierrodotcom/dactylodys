<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import Companion from '$lib/ui/components/Companion.svelte';
	import type { GameProps } from '../types';
	import Bubble from '../shared/Bubble.svelte';
	import GameShell from '../shared/GameShell.svelte';
	import { isRewarded, pickCyclic, type GameView } from '../shared/game-view';
	import { stageFor } from '../shared/stage';
	import EggRow from './EggRow.svelte';
	import HatchEgg from './HatchEgg.svelte';
	import { CRACK_COUNT } from './shapes';

	const CRIES = [
		m.game_hatching_cry_1,
		m.game_hatching_cry_2,
		m.game_hatching_cry_3,
		m.game_hatching_cry_4,
		m.game_hatching_cry_5,
		m.game_hatching_cry_6,
		m.game_hatching_cry_7,
		m.game_hatching_cry_8,
		m.game_hatching_cry_9,
		m.game_hatching_cry_10
	];

	const props: GameProps = $props();

	function cryFor(view: GameView): string {
		return pickCyclic(CRIES, view.groupIndex)?.() ?? '';
	}

	function crackStage(view: GameView): number {
		return isRewarded(view) ? 0 : stageFor(view.position, view.group.length, CRACK_COUNT);
	}

	function announce(view: GameView): string {
		if (!isRewarded(view)) return '';
		return view.groupIndex === view.total - 1
			? m.game_hatching_announce_last()
			: m.game_hatching_announce_hatched({ cry: cryFor(view) });
	}
</script>

<GameShell
	{...props}
	title={m.game_hatching_title()}
	pauseText={m.game_hatching_pause_text()}
	{progress}
	{scene}
	{aside}
	{announce}
/>

{#snippet progress(view: GameView)}
	<EggRow
		total={view.total}
		hatched={view.completed}
		current={isRewarded(view) ? -1 : view.groupIndex}
		stage={crackStage(view)}
	/>
{/snippet}

{#snippet scene(view: GameView)}
	<div class="egg-zone">
		<div class="bubble-row">
			{#if isRewarded(view)}
				<Bubble still={view.reducedMotion}>{cryFor(view)}</Bubble>
			{/if}
		</div>
		<div class="egg">
			<HatchEgg
				stage={crackStage(view)}
				hatched={isRewarded(view)}
				variant={view.groupIndex}
				still={view.reducedMotion}
				big
			/>
		</div>
	</div>
{/snippet}

{#snippet aside(view: GameView)}
	<Companion mood={view.mood} />
{/snippet}

<style>
	.egg-zone {
		display: grid;
		justify-items: center;
		gap: var(--dd-space-sm);
	}

	.egg {
		inline-size: var(--dd-size-egg);
	}

	.bubble-row {
		display: grid;
		align-items: end;
		min-block-size: calc(var(--dd-font-size-xl) * 2);
	}
</style>
