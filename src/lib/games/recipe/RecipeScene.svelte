<script lang="ts">
	import type { GameView } from '../shared/game-view';
	import IngredientShape from './IngredientShape.svelte';
	import { ingredientPlace, isDishReady, prepStage } from './prep';
	import { KITCHEN, POT, SCENE } from './shapes';

	interface Props {
		view: GameView;
	}

	let { view }: Props = $props();

	const place = $derived(ingredientPlace(view));
	const stage = $derived(prepStage(view));
	const ready = $derived(isDishReady(view));

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
		<g class="bubbles">
			{#each POT.bubbles as bubble (bubble.x)}
				<circle class="bubble-dot" cx={bubble.x} cy={bubble.y} r={bubble.radius} />
			{/each}
		</g>
		<g transform={placeTransform(KITCHEN.potIngredient)}>
			<g class="jump">
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
		{#each POT.steamPaths as steam (steam)}
			<path class="steam" d={steam} />
		{/each}
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

	.jump {
		animation-name: drop-in;
		animation-duration: var(--dd-duration-slow);
		animation-timing-function: var(--dd-easing-enter);
	}

	.bubbles {
		animation-name: rise;
		animation-duration: var(--dd-duration-slow);
		animation-timing-function: var(--dd-easing-enter);
	}

	[data-still] .jump,
	[data-still] .bubbles {
		animation-name: none;
	}

	@keyframes drop-in {
		0% {
			translate: 0 calc(var(--dd-space-3xl) * -1.5);
		}

		100% {
			translate: 0 0;
		}
	}

	@keyframes rise {
		0% {
			translate: 0 var(--dd-space-md);
		}

		100% {
			translate: 0 0;
		}
	}
</style>
