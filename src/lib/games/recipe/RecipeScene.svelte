<script lang="ts">
	import type { GameView } from '../shared/game-view';
	import IngredientShape from './IngredientShape.svelte';
	import { ingredientPlace, isDishReady, prepStage } from './prep';
	import { BURP_BUBBLE, DIVING_BOARD, KITCHEN, POT, SCENE, SPLASH } from './shapes';

	interface Props {
		view: GameView;
	}

	let { view }: Props = $props();

	const place = $derived(ingredientPlace(view));
	const stage = $derived(prepStage(view));
	const ready = $derived(isDishReady(view));
	const sceneId = $derived(
		place === 'pot' && view.scene.kind === 'scene' ? view.scene.id : undefined
	);
	const entrance = $derived(view.scene.kind === 'variant' ? view.scene.index : 0);

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
	data-scene={sceneId}
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
			{#if sceneId === 'diving-board'}
				<g class="diving-board">
					<rect class="plank" {...DIVING_BOARD.plank} />
					<rect class="plank" {...DIVING_BOARD.leg} />
				</g>
			{/if}
			{#if sceneId === undefined}
				<g data-reward data-reward-variant={entrance}>
					<IngredientShape variant={view.groupIndex} {stage} />
				</g>
			{:else}
				<g class="diver">
					<IngredientShape variant={view.groupIndex} {stage} />
				</g>
			{/if}
		</g>
	{/if}

	<g class="pot-body">
		<path class="pot" d={POT.bodyPath} />
	</g>

	{#if sceneId === 'somersault' || sceneId === 'diving-board'}
		{#each SPLASH.angles as angle (angle)}
			<g transform="rotate({angle} {SPLASH.center.x} {SPLASH.center.y})">
				<circle class="drop" cx={SPLASH.center.x} cy={SPLASH.center.y} r={SPLASH.radius} />
			</g>
		{/each}
	{/if}

	{#if sceneId === 'burp'}
		<circle class="burp" cx={BURP_BUBBLE.cx} cy={BURP_BUBBLE.cy} r={BURP_BUBBLE.r} />
	{/if}

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
	.plank {
		fill: var(--dd-color-border-strong);
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.drop,
	.burp {
		fill: var(--dd-color-pot-soup);
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.burp {
		fill: var(--dd-color-pot-bubble);
	}

	/* Surprise scenes (ADR-032): a moment after the last key, long enough to be seen. */
	[data-scene] .diver,
	[data-scene] .diving-board,
	[data-scene] .drop,
	[data-scene] .burp,
	[data-scene] .pot-body {
		transform-box: fill-box;
		transform-origin: 50% 50%;
		animation-duration: var(--dd-duration-scene);
		animation-delay: var(--dd-duration-reward-delay);
		animation-timing-function: var(--dd-easing-standard);
		animation-fill-mode: both;
	}

	[data-scene] .pot-body {
		transform-origin: 50% 100%;
	}

	[data-scene='somersault'] .diver {
		animation-name: somersault;
	}

	[data-scene='somersault'] .drop,
	[data-scene='diving-board'] .drop {
		animation-name: splash;
	}

	[data-scene='rim-bounce'] .diver {
		animation-name: rim-bounce;
	}

	[data-scene='diving-board'] .diver {
		animation-name: dive;
	}

	[data-scene='diving-board'] .diving-board {
		animation-name: board-shows;
	}

	[data-scene='burp'] .diver {
		animation-name: drop-in;
	}

	[data-scene='burp'] .burp {
		animation-name: burp;
	}

	[data-scene='burp'] .pot-body {
		animation-name: squash;
	}

	@keyframes somersault {
		0% {
			opacity: 0;
			translate: 0 calc(var(--dd-space-3xl) * -2.2);
			rotate: 0deg;
		}

		10% {
			opacity: 100%;
		}

		55% {
			translate: 0 calc(var(--dd-space-3xl) * -2.4);
			rotate: 360deg;
		}

		85%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 360deg;
		}
	}

	@keyframes splash {
		0%,
		82% {
			opacity: 0;
			translate: 0 0;
		}

		86% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * 0.8) 0;
		}
	}

	@keyframes rim-bounce {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * -2) calc(var(--dd-space-3xl) * -2.5);
			rotate: 0deg;
		}

		10% {
			opacity: 100%;
		}

		35% {
			translate: calc(var(--dd-space-3xl) * -1.6) calc(var(--dd-space-3xl) * -0.6);
			rotate: 0deg;
		}

		55% {
			translate: calc(var(--dd-space-3xl) * -0.8) calc(var(--dd-space-3xl) * -1.8);
			rotate: 200deg;
		}

		85%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 360deg;
		}
	}

	@keyframes dive {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * -3.3) calc(var(--dd-space-3xl) * -1.75);
			rotate: 0deg;
		}

		8% {
			opacity: 100%;
		}

		28% {
			translate: calc(var(--dd-space-3xl) * -2.4) calc(var(--dd-space-3xl) * -1.75);
		}

		36% {
			translate: calc(var(--dd-space-3xl) * -2.4) calc(var(--dd-space-3xl) * -2.3);
		}

		44% {
			translate: calc(var(--dd-space-3xl) * -2.4) calc(var(--dd-space-3xl) * -1.75);
		}

		56% {
			translate: calc(var(--dd-space-3xl) * -1.8) calc(var(--dd-space-3xl) * -2.9);
			rotate: 90deg;
		}

		85%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 180deg;
		}
	}

	@keyframes board-shows {
		0%,
		70% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
		}
	}

	@keyframes drop-in {
		0% {
			opacity: 0;
			translate: 0 calc(var(--dd-space-3xl) * -1.5);
		}

		10% {
			opacity: 100%;
		}

		35%,
		100% {
			opacity: 100%;
			translate: 0 0;
		}
	}

	@keyframes burp {
		0%,
		40% {
			opacity: 0;
			scale: 0.1;
		}

		50% {
			opacity: 100%;
			scale: 0.4;
		}

		80% {
			opacity: 100%;
			scale: 1.2;
		}

		90%,
		100% {
			opacity: 0;
			scale: 1.5;
		}
	}

	@keyframes squash {
		0%,
		55%,
		100% {
			scale: 1 1;
		}

		75% {
			scale: 1.04 0.94;
		}
	}
</style>
