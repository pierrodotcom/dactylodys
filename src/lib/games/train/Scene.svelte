<script lang="ts">
	import type { DecorOf } from '../shared/decor';
	import { isRewarded, type GameView } from '../shared/game-view';
	import { stageFor } from '../shared/stage';
	import Car from './Car.svelte';
	import Cloud from './Cloud.svelte';
	import {
		AUTUMN_BIRDS,
		AUTUMN_LEAVES,
		LOW_SUN_ART,
		PLATFORM_SNOW,
		ROOF_SNOW,
		SNOWFLAKES,
		SNOW_DOTS,
		TREE_SNOW
	} from './decor';
	import Form from './Form.svelte';
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
		/** The season of this play (`shared/decor.ts`): sky, hills, trees and ground. */
		decor?: DecorOf<'train'>;
	}

	/** Space between two clouds of the departure, along the way the smoke drifts. */
	const PUFF_STEP = { x: -9, y: -11 } as const;
	/** The exclamation mark of the whistle floats this far above the chimney. */
	const WHISTLE_LIFT = 8;

	let { view, decor = 'summer' }: Props = $props();

	const uid = $props.id();

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
	const entrance = $derived(
		view.scene.kind === 'variant' ? view.scene.index : view.rewardIndex % 4
	);
	const ties = $derived(
		Array.from({ length: Math.ceil(SCENE.width / TRACK.tieSpacing) + 1 }, (_, index) => index)
	);
	const station = LANDSCAPE.station;
</script>

<svg
	class="scene"
	viewBox="0 0 {SCENE.width} {SCENE.height}"
	focusable="false"
	aria-hidden="true"
	data-probe={stage}
	data-still={view.reducedMotion || undefined}
	data-scene={sceneId}
	data-decor={decor}
>
	<linearGradient id="{uid}-sky" x1="0" y1="0" x2="0" y2="1">
		<stop class="sky-high" offset="0" />
		<stop class="sky-low" offset="0.85" />
	</linearGradient>
	<rect x="0" y="0" width={SCENE.width} height={SCENE.height} fill="url(#{uid}-sky)" />

	{#if decor === 'autumn'}
		<path class="halo" d={LOW_SUN_ART.halo} data-effect />
		<path class="part low-sun" d={LOW_SUN_ART.disc} />
		<path class="sun-light" d={LOW_SUN_ART.light} />
		<path class="fine" d={AUTUMN_BIRDS} />
	{:else}
		<path class="halo" d={LANDSCAPE.sunHalo} data-effect />
		<Form form={LANDSCAPE.sun} paint="sun" />
	{/if}
	{#if decor === 'winter'}
		<path class="flake" d={SNOWFLAKES} />
		<path class="snow-dot" d={SNOW_DOTS} />
	{/if}
	{#each LANDSCAPE.clouds as cloud (cloud[0]?.x)}
		<Cloud puffs={cloud} tone="sky" />
	{/each}

	<Form form={LANDSCAPE.farHills} paint="hill-far" />
	{#each LANDSCAPE.trees as tree, index (tree.trunk)}
		<path class="part trunk" d={tree.trunk} />
		<Form form={tree.crown} paint="tree" />
		{#if decor === 'winter'}
			<path class="part snow thin" d={TREE_SNOW[index]} />
		{/if}
	{/each}
	<Form form={LANDSCAPE.nearHills} paint="hill-near" />

	<path class="wire" d={LANDSCAPE.wires} />
	{#each LANDSCAPE.poles as pole (pole.pole)}
		<path class="part trunk" d={pole.pole} />
		<path class="part trunk" d={pole.arm} />
		{#each pole.insulators as insulator (insulator)}
			<path class="part glass thin" d={insulator} />
		{/each}
	{/each}

	<Form form={station.roof} paint="roof" />
	<path class="fine" d={station.roofTiles} />
	{#if decor === 'winter'}
		<path class="part snow thin" d={ROOF_SNOW} />
	{/if}
	<path class="part dial" d={station.clock} />
	<path class="fine" d={station.clockHands} />
	<Form form={station.wall} paint="wall" />
	<Form form={station.door} paint="wood" />
	{#each station.windows as window (window)}
		<path class="part glass" d={window} />
	{/each}
	<path class="fine" d={station.windowBars} />
	<Form form={station.platform} paint="stone" />
	{#if decor === 'winter'}
		<path class="part snow thin" d={PLATFORM_SNOW} />
	{/if}

	<rect
		class="part ground"
		x="-2"
		y={TRACK.y - 3}
		width={SCENE.width + 4}
		height={TRACK.groundHeight + 4}
	/>
	<path class="fine" d={LANDSCAPE.grassTufts} />
	{#if decor === 'autumn'}
		{#each AUTUMN_LEAVES as leaf (leaf.shape)}
			<path class="part fallen thin" data-tone={leaf.tone} d={leaf.shape} />
			<path class="fine" d={leaf.vein} />
		{/each}
	{/if}
	<rect
		class="part ballast"
		x="-2"
		y={TRACK.ballastTop}
		width={SCENE.width + 4}
		height={TRACK.ballastBottom - TRACK.ballastTop}
	/>
	<path class="pebbles" d={LANDSCAPE.pebbles} />
	{#each ties as tie (tie)}
		<rect
			class="part tie thin"
			x={tie * TRACK.tieSpacing - TRACK.tieWidth / 2}
			y={TRACK.tieY}
			width={TRACK.tieWidth}
			height={TRACK.tieHeight}
			rx="1"
		/>
	{/each}
	<rect class="part rail" x="-2" y={TRACK.y} width={SCENE.width + 4} height={TRACK.railHeight} />
	<path class="rail-light" d="M0 {TRACK.y + 1}L{SCENE.width} {TRACK.y + 1}" />

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
				<Cloud puffs={EXCLAMATION.wisps} />
				<path class="underlay" d={EXCLAMATION.bar.d} />
				<path class="underlay" d={EXCLAMATION.dot.d} />
				<Form form={EXCLAMATION.bar} paint="steam" edge={false} />
				<Form form={EXCLAMATION.dot} paint="steam" edge={false} />
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
		background-color: var(--dd-color-train-sky-low);
	}

	.sky-high {
		stop-color: var(--dd-color-train-sky-high);
	}

	.sky-low {
		stop-color: var(--dd-color-train-sky-low);
	}

	.halo {
		fill: var(--dd-color-train-light);
		fill-opacity: var(--dd-opacity-train-halo);
	}

	/*
	 * Seasons (ADR-057): each one gives the sky, the hills, the trees and the ground their own
	 * colours, also read by the forms and the clouds; the train and the rails never change.
	 */
	.scene[data-decor='autumn'] {
		--dd-color-train-sky-high: var(--dd-color-decor-sunset-sky-high);
		--dd-color-train-sky-low: var(--dd-color-decor-sunset-sky-low);
		--dd-color-train-cloud: var(--dd-color-decor-sunset-cloud);
		--dd-color-train-hill-far: var(--dd-color-decor-autumn-hill-far);
		--dd-color-train-hill-near: var(--dd-color-decor-autumn-hill-near);
		--dd-color-train-tree: var(--dd-color-decor-autumn-leaf);
		--dd-color-train-grass: var(--dd-color-decor-autumn-grass);
	}

	.scene[data-decor='winter'] {
		--dd-color-train-sky-high: var(--dd-color-decor-winter-sky-high);
		--dd-color-train-sky-low: var(--dd-color-decor-winter-sky-low);
		--dd-color-train-sun: var(--dd-color-decor-winter-sun);
		--dd-color-train-hill-far: var(--dd-color-decor-winter-snow-far);
		--dd-color-train-hill-near: var(--dd-color-decor-winter-snow);
		--dd-color-train-tree: var(--dd-color-decor-winter-evergreen);
		--dd-color-train-grass: var(--dd-color-decor-winter-snow);
	}

	.scene[data-decor='autumn'] .halo {
		fill: var(--dd-color-decor-sunset-halo);
		fill-opacity: var(--dd-opacity-decor-halo);
	}

	.low-sun {
		fill: var(--dd-color-decor-sunset-sun);
	}

	.sun-light {
		fill: var(--dd-color-train-light);
		fill-opacity: var(--dd-opacity-train-light);
	}

	.fallen {
		fill: var(--dd-color-decor-autumn-leaf);
	}

	.fallen[data-tone='red'] {
		fill: var(--dd-color-decor-autumn-leaf-red);
	}

	.fallen[data-tone='gold'] {
		fill: var(--dd-color-decor-autumn-leaf-gold);
	}

	.snow {
		fill: var(--dd-color-decor-winter-snow);
	}

	.flake {
		fill: transparent;
		stroke: var(--dd-color-decor-winter-flake);
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.snow-dot {
		fill: var(--dd-color-decor-winter-flake);
	}

	.part,
	.underlay,
	.fine,
	.wire {
		stroke: var(--dd-color-train-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.thin,
	.fine,
	.wire {
		stroke-width: var(--dd-border-width-thin);
	}

	.fine,
	.wire {
		fill: transparent;
	}

	/* Under two joined forms: only its outer half shows, one outline around both. */
	.underlay {
		fill: var(--dd-color-train-line);
		stroke-width: calc(var(--dd-border-width-thick) * 2);
	}

	.trunk,
	.tie {
		fill: var(--dd-color-train-wood);
	}

	.glass {
		fill: var(--dd-color-train-glass);
	}

	.dial {
		fill: var(--dd-color-train-steam);
	}

	.ground {
		fill: var(--dd-color-train-grass);
	}

	.ballast {
		fill: var(--dd-color-train-stone);
	}

	.pebbles {
		fill: var(--dd-color-train-earth);
	}

	.rail {
		fill: var(--dd-color-train-steel);
	}

	.rail-light {
		stroke: var(--dd-color-train-light);
		stroke-width: var(--dd-border-width-thin);
		vector-effect: non-scaling-stroke;
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
