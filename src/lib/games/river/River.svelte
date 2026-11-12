<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { GameProps } from '../types';
	import GameShell from '../shared/GameShell.svelte';
	import { decorFor } from '../shared/decor';
	import { isRewarded, pickCyclic, type GameView } from '../shared/game-view';
	import Progress from './Progress.svelte';
	import Scene from './Scene.svelte';
	import { OBJECT_NAMES, QUIPS } from './texts';

	const props: GameProps = $props();

	const decor = $derived(decorFor('river', props.playCount));

	function announce(view: GameView): string {
		if (!isRewarded(view)) return '';
		const object = pickCyclic(OBJECT_NAMES, view.rewardIndex)?.() ?? '';
		return view.groupIndex === view.total - 1
			? m.game_river_announce_last({ object })
			: m.game_river_announce_group({
					object,
					quip: pickCyclic(QUIPS, view.rewardIndex)?.(props.settings.ageBand) ?? ''
				});
	}
</script>

<GameShell
	{...props}
	title={m.game_river_title()}
	pauseText={m.game_river_pause_text()}
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
		offset={view.playOffset}
	/>
{/snippet}

{#snippet scene(view: GameView)}
	<Scene {view} {decor} ageBand={props.settings.ageBand} />
{/snippet}
