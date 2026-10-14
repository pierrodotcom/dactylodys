<script lang="ts">
	import type { GameView } from '../shared/game-view';
	import IngredientShape from './IngredientShape.svelte';
	import { ingredientPlace, isDishReady, prepStage } from './prep';
	import { KITCHEN, POT, SCENE } from './shapes';

	const REWARD_VARIANTS = 4;

	interface Props {
		view: GameView;
	}

	let { view }: Props = $props();

	const place = $derived(ingredientPlace(view));
	const stage = $derived(prepStage(view));
	const ready = $derived(isDishReady(view));
	const rewardVariant = $derived(view.groupIndex % REWARD_VARIANTS);

	function placeTransform(spot: { x: number; y: number; scale: number }): string {
		return `translate(${spot.x} ${spot.y}) scale(${spot.scale})`;
	}
</script>

<svg
	class="kitchen"
	viewBox="0 0 {SCENE.width} {SCENE.height}"
	focusable="false"
	aria-hidden="true"
	data-still={view.reducedMotion || undefined}
>
	<path class="counter" d={KITCHEN.counterPath} />
	<path class="board" d={KITCHEN.boardPath} />

	{#each POT.handlePaths as handle (handle)}
		<path class="handle" d={handle} />
	{/each}
	<ellipse class="inside" cx={POT.rim.cx} cy={POT.rim.cy} rx={POT.rim.rx} ry={POT.rim.ry} />
	<ellipse class="soup" cx={POT.soup.cx} cy={POT.soup.cy} rx={POT.soup.rx} ry={POT.soup.ry} />

	{#if place === 'pot'}
		<g class="bubbles" data-reward data-reward-variant="0">
			{#each POT.bubbles as bubble (bubble.x)}
				<circle class="bubble-dot" cx={bubble.x} cy={bubble.y} r={bubble.radius} />
			{/each}
		</g>
		<g transform={placeTransform(KITCHEN.potIngredient)}>
			<g data-reward data-reward-variant={rewardVariant}>
				<IngredientShape variant={view.groupIndex} {stage} />
			</g>
		</g>
	{/if}

	<path class="pot" d={POT.bodyPath} />

	{#if place === 'board'}
		<g transform={placeTransform(KITCHEN.boardIngredient)}>
			<IngredientShape variant={view.groupIndex} {stage} />
		</g>
	{/if}

	{#if ready}
		<g data-reward data-reward-variant="0">
			{#each POT.steamPaths as steam (steam)}
				<path class="steam" d={steam} />
			{/each}
		</g>
	{/if}
</svg>

<style>
	.kitchen {
		display: block;
		inline-size: 100%;
		max-inline-size: var(--dd-size-scene-max);
		block-size: auto;
		overflow: hidden;
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-surface-sunken);
	}

	.counter,
	.board,
	.handle,
	.inside,
	.soup,
	.pot,
	.bubble-dot,
	.steam {
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.counter {
		fill: var(--dd-color-border-subtle);
	}

	.board {
		fill: var(--dd-color-border-strong);
	}

	.handle,
	.steam {
		fill: transparent;
	}

	.handle {
		stroke-width: var(--dd-border-width-target);
	}

	.steam {
		stroke: var(--dd-color-pot-steam);
		stroke-width: var(--dd-border-width-target);
	}

	.inside {
		fill: var(--dd-color-pot-inside);
	}

	.soup {
		fill: var(--dd-color-pot-soup);
	}

	.pot {
		fill: var(--dd-color-pot-body);
	}

	.bubble-dot {
		fill: var(--dd-color-pot-bubble);
	}
</style>
