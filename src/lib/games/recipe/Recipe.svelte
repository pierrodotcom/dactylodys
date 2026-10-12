<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { GameProps } from '../types';
	import Bubble from '../shared/Bubble.svelte';
	import GameShell from '../shared/GameShell.svelte';
	import { isRewarded, pickCyclic, type GameView } from '../shared/game-view';
	import { dishName } from './dish';
	import IngredientRow from './IngredientRow.svelte';
	import RecipeScene from './RecipeScene.svelte';
	import { DISH_TEMPLATES, QUIPS } from './texts';

	const props: GameProps = $props();

	const dish = $derived(dishName(props.exercise.groups, DISH_TEMPLATES));

	function quipFor(view: GameView): string {
		return pickCyclic(QUIPS, view.groupIndex)?.() ?? '';
	}

	function announce(view: GameView): string {
		if (view.phase === 'finale') return m.game_recipe_announce_finale({ name: dish });
		if (!isRewarded(view)) return '';
		return view.groupIndex === view.total - 1
			? m.game_recipe_announce_last()
			: m.game_recipe_announce_added({ quip: quipFor(view) });
	}
</script>

<GameShell
	{...props}
	title={m.game_recipe_title()}
	pauseText={m.game_recipe_pause_text()}
	arrangement="wide"
	{progress}
	{scene}
	{finale}
	{announce}
/>

{#snippet progress(view: GameView)}
	<IngredientRow
		total={view.total}
		done={view.completed}
		current={isRewarded(view) ? -1 : view.groupIndex}
	/>
{/snippet}

{#snippet scene(view: GameView)}
	<div class="kitchen-wrap">
		<div class="bubble-row">
			{#if view.phase === 'celebrating'}
				<Bubble still={view.reducedMotion} compact>{quipFor(view)}</Bubble>
			{/if}
		</div>
		<RecipeScene {view} />
	</div>
{/snippet}

{#snippet finale()}
	<h2>{m.game_recipe_finale_title()}</h2>
	<p>{m.game_recipe_finale_intro()}</p>
	<p class="dish-name">{dish}</p>
{/snippet}

<style>
	.kitchen-wrap {
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

	h2 {
		font-size: var(--dd-font-size-2xl);
	}

	.dish-name {
		font-size: var(--dd-font-size-2xl);
		font-weight: var(--dd-font-weight-bold);
		line-height: var(--dd-line-height-tight);
	}
</style>
