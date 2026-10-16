<script lang="ts">
	import { isRewarded, type GameView } from '../shared/game-view';
	import { stageFor } from '../shared/stage';
	import Car from './Car.svelte';
	import Cloud from './Cloud.svelte';
	import LocoShape from './LocoShape.svelte';
	import { EXCLAMATION, LANDSCAPE, SMOKE_PUFFS, TRACK } from './shapes';
	import {
		SCENE,
		chimneyPoint,
		holdBack,
		isDeparting,
		rollRatio,
		sceneIdOf,
		trainOriginX,
		trainScale,
		wagonIndexes
	} from './train';

	interface Props {
		view: GameView;
	}

	/** Space between two clouds of the departure, along the way the smoke drifts. */
	const PUFF_STEP = { x: -9, y: -11 } as const;
	/** The exclamation mark of the whistle floats this far above the chimney. */
	const WHISTLE_LIFT = 8;

	let { view }: Props = $props();

	// One step per good key: the wagon that rolls in moves a notch each time.
	const stage = $derived(
		view.phase === 'typing'
			? stageFor(view.position, view.group.length, view.group.length)
			: view.group.length
	);
	const rewarded = $derived(isRewarded(view));
	const departing = $derived(isDeparting(view));
	const sceneId = $derived(rewarded ? sceneIdOf(view) : undefined);
	const scale = $derived(trainScale(view.total));
	const originX = $derived(trainOriginX(view.total));
	const chimney = $derived(chimneyPoint(view.total));
	const wagons = $derived(wagonIndexes(view));
	const entrance = $derived(view.scene.kind === 'variant' ? view.scene.index : view.groupIndex % 4);
	const ties = $derived(
		Array.from({ length: Math.ceil(SCENE.width / TRACK.tieSpacing) }, (_, index) => index)
	);
</script>

<svg
	class="scene"
	viewBox="0 0 {SCENE.width} {SCENE.height}"
	focusable="false"
	aria-hidden="true"
	data-probe={stage}
	data-still={view.reducedMotion || undefined}
	data-scene={sceneId}
>
	<path class="hill far" d={LANDSCAPE.farHillPath} />
	<path class="hill near" d={LANDSCAPE.nearHillPath} />
	<circle class="sun" cx={LANDSCAPE.sun.x} cy={LANDSCAPE.sun.y} r={LANDSCAPE.sun.radius} />
	{#each LANDSCAPE.clouds as cloud (cloud[0]?.x)}
		<g>
			{#each cloud as puff (puff.x)}
				<circle class="sky-cloud" cx={puff.x} cy={puff.y} r={puff.radius} />
			{/each}
		</g>
	{/each}
	<path class="station-wall" d={LANDSCAPE.station.bodyPath} />
	<path class="station-roof" d={LANDSCAPE.station.roofPath} />
	<path class="station-door" d={LANDSCAPE.station.doorPath} />
	{#each LANDSCAPE.station.windowPaths as window (window)}
		<path class="station-window" d={window} />
	{/each}

	<rect
		class="ground"
		x="0"
		y={TRACK.y + TRACK.railHeight}
		width={SCENE.width}
		height={TRACK.groundHeight}
	/>
	{#each ties as tie (tie)}
		<rect
			class="tie"
			x={tie * TRACK.tieSpacing}
			y={TRACK.tieY}
			width={TRACK.tieWidth}
			height={TRACK.tieHeight}
		/>
	{/each}
	<rect class="rail" x="0" y={TRACK.y} width={SCENE.width} height={TRACK.railHeight} />

	<g class="train" data-departing={departing || undefined}>
		<g transform="translate({originX} {TRACK.y}) scale({scale})">
			<g class="loco-pose">
				<LocoShape puff={!departing && sceneId !== 'whistle-puff'} />
			</g>
			{#each wagons as index (index)}
				{@const arriving = index === view.groupIndex}
				<Car
					{index}
					total={view.total}
					ratio={arriving ? rollRatio(view) : 1}
					hold={arriving ? holdBack(view) : 0}
					{arriving}
					hooked={rewarded}
					sceneId={arriving ? sceneIdOf(view) : undefined}
					{entrance}
					still={view.reducedMotion}
				/>
			{/each}
		</g>
	</g>

	{#if sceneId === 'whistle-puff'}
		<g transform="translate({chimney.x} {chimney.y - WHISTLE_LIFT})">
			<g class="exclaim">
				<path class="bar" d={EXCLAMATION.barPath} />
				<circle
					class="dot"
					cx={EXCLAMATION.dot.x}
					cy={EXCLAMATION.dot.y}
					r={EXCLAMATION.dot.radius}
				/>
				<Cloud puffs={EXCLAMATION.wisps} />
			</g>
		</g>
	{/if}

	{#if departing}
		{#each SMOKE_PUFFS as puff, order (order)}
			<g transform="translate({chimney.x + PUFF_STEP.x * order} {chimney.y + PUFF_STEP.y * order})">
				<g
					class="puff"
					data-order={order}
					data-reward={view.reducedMotion || undefined}
					data-reward-variant={view.reducedMotion ? 1 : undefined}
				>
					<Cloud puffs={puff} />
				</g>
			</g>
		{/each}
	{/if}
</svg>

<style>
	.scene {
		display: block;
		inline-size: 100%;
		max-inline-size: var(--dd-size-scene-max);
		block-size: auto;
		overflow: hidden;
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-surface-sunken);
	}

	.hill,
	.sun,
	.sky-cloud,
	.station-wall,
	.station-roof,
	.station-door,
	.station-window,
	.ground,
	.tie,
	.rail,
	.bar,
	.dot {
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	.hill.far {
		fill: var(--dd-color-wear-leaf);
	}

	.hill.near {
		fill: var(--dd-color-companion-green-body);
	}

	.sun {
		fill: var(--dd-color-star-fill);
	}

	.sky-cloud {
		fill: var(--dd-color-surface-raised);
		stroke: transparent;
	}

	.station-wall {
		fill: var(--dd-color-surface-raised);
	}

	.station-roof {
		fill: var(--dd-color-wear-red);
	}

	.station-door {
		fill: var(--dd-color-wear-leather);
	}

	.station-window {
		fill: var(--dd-color-wear-glass);
	}

	.ground {
		fill: var(--dd-color-border-subtle);
		stroke: transparent;
	}

	.tie {
		fill: var(--dd-color-wear-leather);
		stroke-width: var(--dd-border-width-thin);
	}

	.rail {
		fill: var(--dd-color-border-strong);
	}

	.bar,
	.dot {
		fill: var(--dd-color-surface-raised);
	}

	/* The train leaves after the last reward: it rolls out of the scene, slowly at first. */
	.train[data-departing],
	.loco-pose,
	.exclaim,
	.puff:not([data-reward]) {
		transform-box: fill-box;
		transform-origin: 50% 100%;
		animation-duration: var(--dd-duration-scene);
		animation-delay: var(--dd-duration-reward-delay);
		animation-timing-function: var(--dd-easing-standard);
		animation-fill-mode: both;
	}

	.train[data-departing] {
		animation-name: depart;
		animation-duration: calc(var(--dd-duration-scene) * 2);
		animation-timing-function: var(--dd-easing-exit);
	}

	[data-still] .train[data-departing] {
		animation-name: fade-away;
		animation-duration: var(--dd-duration-reward);
		animation-timing-function: var(--dd-easing-standard);
	}

	.puff:not([data-reward]) {
		animation-name: smoke;
		animation-duration: calc(var(--dd-duration-scene) * 1.5);
		animation-timing-function: var(--dd-easing-steady);
	}

	.puff[data-order='1'] {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-beat));
	}

	.puff[data-order='2'] {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-beat) * 2);
	}

	.puff[data-order='3'] {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-beat) * 3);
	}

	[data-scene='whistle-puff'] .loco-pose {
		transform-origin: 50% 100%;
		animation-name: loco-toot;
	}

	.exclaim {
		animation-name: exclaim;
	}

	@keyframes depart {
		0% {
			translate: 0 0;
		}

		100% {
			translate: calc(var(--dd-space-3xl) * 9) 0;
		}
	}

	@keyframes fade-away {
		0% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
		}
	}

	@keyframes smoke {
		0% {
			opacity: 0;
			scale: 0.4;
			translate: 0 0;
		}

		15% {
			opacity: 100%;
			scale: 1;
		}

		100% {
			opacity: 0;
			scale: 1.5;
			translate: calc(var(--dd-space-2xl) * -1) calc(var(--dd-space-lg) * -1);
		}
	}

	@keyframes loco-toot {
		0%,
		8% {
			scale: 1 1;
		}

		14% {
			scale: 1.04 0.95;
		}

		22% {
			scale: 0.98 1.04;
		}

		32%,
		100% {
			scale: 1 1;
		}
	}

	@keyframes exclaim {
		0% {
			opacity: 0;
			scale: 0.3;
			translate: 0 0;
		}

		12% {
			opacity: 100%;
			scale: 1.2;
		}

		20% {
			scale: 1;
		}

		26%,
		34% {
			rotate: -5deg;
		}

		30%,
		38% {
			rotate: 5deg;
		}

		44% {
			rotate: 0deg;
		}

		78% {
			opacity: 100%;
			translate: 0 calc(var(--dd-space-sm) * -1);
		}

		100% {
			opacity: 0;
			scale: 1.1;
			translate: 0 calc(var(--dd-space-md) * -1);
		}
	}
</style>
