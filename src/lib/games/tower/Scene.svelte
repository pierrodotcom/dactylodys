<script lang="ts">
	import { isRewarded, type GameView } from '../shared/game-view';
	import { stageFor } from '../shared/stage';
	import BlockShape from './BlockShape.svelte';
	import {
		DROP_STAGES,
		FLAG_HEIGHT,
		GROUND_Y,
		SCENE,
		blockLook,
		blockSize,
		blockSpot,
		flagSpot,
		hoverOffset,
		starPoints
	} from './blocks';
	import { CLOUD, DINO, ROCKET, SPARKS, SPEED_LINES, TUFTS } from './shapes';

	interface Props {
		view: GameView;
	}

	let { view }: Props = $props();

	const POLE_HEIGHT = 30;
	const PENNANT_DEPTH = 14;
	const STAR_RADIUS = 7;

	const size = $derived(blockSize(view.total));
	const rewarded = $derived(isRewarded(view));
	const stage = $derived(
		view.phase === 'typing' ? stageFor(view.position, view.group.length, DROP_STAGES) : DROP_STAGES
	);
	const sceneId = $derived(rewarded && view.scene.kind === 'scene' ? view.scene.id : undefined);
	const entrance = $derived(rewarded && view.scene.kind === 'variant' ? view.scene.index : null);
	const below = $derived(Array.from({ length: view.groupIndex }, (_, index) => index));
	const spot = $derived(blockSpot(view.groupIndex, size));
	const place = $derived(`translate(${spot.x} ${spot.y + (rewarded ? 0 : hoverOffset(stage))})`);
	const planted = $derived(rewarded && view.groupIndex === view.total - 1);
	const flag = $derived(flagSpot(view.total));
	const belly = ROCKET.belly * ROCKET.scale;
	const ropeDrop = belly + ROCKET.ropeLength;

	function tuft(x: number): string {
		return `M ${x - 6} ${GROUND_Y} Q ${x - 5} ${GROUND_Y - 8} ${x - 9} ${GROUND_Y - 11} M ${x} ${GROUND_Y} Q ${x} ${GROUND_Y - 9} ${x} ${GROUND_Y - 13} M ${x + 6} ${GROUND_Y} Q ${x + 5} ${GROUND_Y - 8} ${x + 9} ${GROUND_Y - 11}`;
	}
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
	<path class="cloud" d={CLOUD.path} />
	<rect class="floor" x="0" y={GROUND_Y} width={SCENE.width} height={SCENE.height - GROUND_Y} />
	{#each TUFTS as x (x)}
		<path class="tuft" d={tuft(x)} />
	{/each}

	<g class="stack">
		{#each below as index (index)}
			{@const at = blockSpot(index, size)}
			<g transform="translate({at.x} {at.y})">
				<BlockShape {size} look={blockLook(index)} />
			</g>
		{/each}

		<g transform={place}>
			{#if sceneId === 'drop-land'}
				{#each [-1, 1] as side (side)}
					<circle class="dust" data-side={side} cx={side * (size.width / 2 + 3)} cy={-5} r="6" />
				{/each}
			{/if}

			{#if sceneId === 'dino-stomp'}
				<g transform="translate(0 {-size.height})">
					<g class="dino">
						<g transform="scale({DINO.scale})">
							{#each DINO.plates as plate (plate)}
								<path class="plate" d={plate} />
							{/each}
							<path class="dino-body" d={DINO.tailPath} />
							{#each DINO.legs as leg (leg.x)}
								<rect class="dino-body" {...leg} />
							{/each}
							<ellipse class="dino-body" {...DINO.body} />
							<ellipse class="belly" {...DINO.belly} />
							<circle class="dino-body" {...DINO.head} />
							<circle class="cheek" {...DINO.cheek} />
							<circle class="eye" {...DINO.eye} />
							<path class="smile" d={DINO.smilePath} />
						</g>
					</g>
				</g>
			{/if}

			{#if sceneId === 'magnet-snap'}
				{#each SPARKS as spark (`${spark.side}${spark.rise}`)}
					<path
						class="spark"
						d="M {spark.side * (size.width / 2 + 4)} {-size.height *
							spark.rise} l {spark.dx} {spark.dy}"
					/>
				{/each}
			{/if}

			<g
				class="landing"
				data-reward={entrance === null ? undefined : true}
				data-reward-variant={entrance ?? undefined}
			>
				<BlockShape {size} look={blockLook(view.groupIndex)} />

				{#if sceneId === 'slide-in'}
					<g class="speed">
						{#each SPEED_LINES as rise (rise)}
							<line
								class="line"
								x1={size.width / 2 + 6}
								x2={size.width / 2 + 24}
								y1={-size.height * rise}
								y2={-size.height * rise}
							/>
						{/each}
					</g>
				{/if}

				{#if sceneId === 'rocket-crane'}
					<g class="rocket" transform="translate(0 {-size.height - ropeDrop})">
						<path
							class="line"
							d="M {-ROCKET.ropeSpread} {belly} L {-size.width * 0.22} {ropeDrop}"
						/>
						<path class="line" d="M {ROCKET.ropeSpread} {belly} L {size.width * 0.22} {ropeDrop}" />
						<g transform="scale({ROCKET.scale})">
							<path class="flame-outer" d={ROCKET.flameOuterPath} />
							<path class="flame-inner" d={ROCKET.flameInnerPath} />
							{#each ROCKET.finPaths as fin (fin)}
								<path class="fin" d={fin} />
							{/each}
							<path class="hull" d={ROCKET.bodyPath} />
							<circle class="window" {...ROCKET.window} />
						</g>
					</g>
				{/if}
			</g>
		</g>

		{#if planted}
			<g transform="translate({flag.x} {flag.y})">
				<g
					class="flag"
					data-reward={sceneId === undefined ? true : undefined}
					data-reward-variant={sceneId === undefined ? 0 : undefined}
				>
					<line class="pole" x1="0" x2="0" y1="0" y2={-POLE_HEIGHT} />
					<path
						class="pennant"
						d="M 0 {-POLE_HEIGHT} L {FLAG_HEIGHT / 2} {-POLE_HEIGHT +
							PENNANT_DEPTH / 2} L 0 {-POLE_HEIGHT + PENNANT_DEPTH} Z"
					/>
					<polygon
						class="star"
						points={starPoints(STAR_RADIUS)}
						transform="translate(0 {-POLE_HEIGHT - STAR_RADIUS + 1})"
					/>
				</g>
			</g>
		{/if}
	</g>
</svg>

<style>
	.scene {
		--dd-tower-gap: var(--dd-space-md);

		display: block;
		inline-size: 100%;
		max-inline-size: var(--dd-size-scene-max);
		block-size: auto;
		overflow: hidden;
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-surface-sunken);
	}

	.cloud,
	.floor,
	.tuft,
	.pole,
	.pennant,
	.star,
	.line,
	.dino-body,
	.plate,
	.belly,
	.cheek,
	.eye,
	.smile,
	.hull,
	.fin,
	.window,
	.spark,
	.dust {
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.cloud {
		fill: var(--dd-color-pot-bubble);
	}

	.floor {
		fill: var(--dd-color-border-subtle);
	}

	.tuft,
	.line,
	.smile,
	.spark {
		fill: transparent;
	}

	.tuft {
		stroke: var(--dd-color-food-d);
		stroke-width: var(--dd-border-width-target);
	}

	.line {
		stroke: var(--dd-color-drawing-line);
	}

	.pole {
		stroke-width: var(--dd-border-width-target);
	}

	.pennant {
		fill: var(--dd-color-food-b);
	}

	.star {
		fill: var(--dd-color-star-fill);
	}

	.dino-body {
		fill: var(--dd-color-baby-a);
	}

	.plate {
		fill: var(--dd-color-baby-c);
	}

	.belly {
		fill: var(--dd-color-companion-belly);
		stroke: transparent;
	}

	.cheek {
		fill: var(--dd-color-companion-cheek);
		stroke: transparent;
	}

	.eye {
		fill: var(--dd-color-drawing-ink);
		stroke: transparent;
	}

	.hull {
		fill: var(--dd-color-rocket-body);
	}

	.fin {
		fill: var(--dd-color-rocket-fin);
	}

	.window {
		fill: var(--dd-color-rocket-window);
	}

	.flame-outer {
		fill: var(--dd-color-rocket-flame-outer);
	}

	.flame-inner {
		fill: var(--dd-color-rocket-flame-inner);
	}

	.dust {
		fill: var(--dd-color-pot-bubble);
		stroke-width: var(--dd-border-width-thin);
	}

	.spark {
		stroke: var(--dd-color-food-c);
		stroke-width: var(--dd-border-width-target);
	}

	/* Surprise scenes (ADR-034): a moment after the last key, long enough to be seen. */
	[data-scene] .stack,
	[data-scene] .landing,
	[data-scene] .dino,
	[data-scene] .rocket,
	[data-scene] .speed,
	[data-scene] .dust,
	[data-scene] .spark,
	[data-scene] .flag {
		transform-box: fill-box;
		transform-origin: 50% 100%;
		animation-duration: var(--dd-duration-scene);
		animation-delay: var(--dd-duration-reward-delay);
		animation-timing-function: var(--dd-easing-standard);
		animation-fill-mode: both;
	}

	[data-scene] .flag {
		animation-name: plant;
	}

	/* Calm entrance of the flag: after the block, never together. */
	.flag[data-reward] {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-reward) * 0.6);
	}

	[data-scene='drop-land'] .landing {
		animation-name: drop-land;
	}

	[data-scene='drop-land'] .dust[data-side='-1'] {
		transform-origin: 50% 50%;
		animation-name: dust-left;
	}

	[data-scene='drop-land'] .dust[data-side='1'] {
		transform-origin: 50% 50%;
		animation-name: dust-right;
	}

	[data-scene='wobble-settle'] .landing {
		animation-name: wobble-drop;
	}

	[data-scene='wobble-settle'] .stack {
		animation-name: wobble;
	}

	[data-scene='dino-stomp'] .landing {
		animation-name: stomped;
	}

	[data-scene='dino-stomp'] .dino {
		animation-name: dino-hop;
	}

	[data-scene='spin-land'] .landing {
		transform-origin: 50% 50%;
		animation-name: spin-land;
	}

	[data-scene='bounce-land'] .landing {
		animation-name: bounce-land;
	}

	[data-scene='rocket-crane'] .landing {
		animation-name: crane-carries;
	}

	[data-scene='rocket-crane'] .rocket {
		transform-origin: 50% 50%;
		animation-name: rocket-leaves;
	}

	[data-scene='slide-in'] .landing {
		animation-name: slide-in;
	}

	[data-scene='slide-in'] .speed {
		animation-name: speed-fades;
	}

	[data-scene='magnet-snap'] .landing {
		transform-origin: 50% 50%;
		animation-name: magnet-snap;
	}

	[data-scene='magnet-snap'] .spark {
		transform-origin: 50% 50%;
		animation-name: spark;
	}

	@keyframes drop-land {
		0% {
			translate: 0 calc(var(--dd-tower-gap) * -1);
			scale: 1;
		}

		12% {
			translate: 0 calc(var(--dd-tower-gap) * -1.6);
			animation-timing-function: var(--dd-easing-exit);
		}

		36% {
			translate: 0 0;
			scale: 1;
		}

		42% {
			translate: 0 0;
			scale: 1.1 0.82;
		}

		56% {
			translate: 0 calc(var(--dd-space-xs) * -2);
			scale: 0.97 1.05;
		}

		72%,
		100% {
			translate: 0 0;
			scale: 1;
		}
	}

	@keyframes dust-left {
		0%,
		38% {
			opacity: 0;
			translate: 0 0;
			scale: 0.4;
		}

		44% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-lg) * -1) calc(var(--dd-space-xs) * -1);
			scale: 1.8;
		}
	}

	@keyframes dust-right {
		0%,
		38% {
			opacity: 0;
			translate: 0 0;
			scale: 0.4;
		}

		44% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: var(--dd-space-lg) calc(var(--dd-space-xs) * -1);
			scale: 1.8;
		}
	}

	@keyframes wobble-drop {
		0% {
			translate: 0 calc(var(--dd-tower-gap) * -1);
			scale: 1;
			animation-timing-function: var(--dd-easing-exit);
		}

		16% {
			translate: 0 0;
			scale: 1.06 0.9;
		}

		30%,
		100% {
			translate: 0 0;
			scale: 1;
		}
	}

	@keyframes wobble {
		0%,
		14% {
			rotate: 0deg;
		}

		26% {
			rotate: 4deg;
		}

		40% {
			rotate: -4deg;
		}

		54% {
			rotate: 2.5deg;
		}

		68% {
			rotate: -1.5deg;
		}

		82% {
			rotate: 0.6deg;
		}

		100% {
			rotate: 0deg;
		}
	}

	@keyframes stomped {
		0%,
		44% {
			translate: 0 calc(var(--dd-tower-gap) * -1);
			scale: 1;
		}

		52% {
			translate: 0 0;
			scale: 1.08 0.84;
		}

		64% {
			translate: 0 0;
			scale: 1.02 0.97;
		}

		76%,
		100% {
			translate: 0 0;
			scale: 1;
		}
	}

	@keyframes dino-hop {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * -1.7) calc(var(--dd-space-xs) * -1);
			rotate: 0deg;
		}

		8% {
			opacity: 100%;
		}

		26% {
			translate: calc(var(--dd-space-3xl) * -0.85) calc(var(--dd-space-xl) * -1);
			rotate: -10deg;
		}

		44% {
			translate: 0 calc(var(--dd-tower-gap) * -1);
			rotate: 6deg;
		}

		52% {
			translate: 0 0;
			rotate: 0deg;
		}

		66% {
			translate: var(--dd-space-lg) calc(var(--dd-space-lg) * -1);
			rotate: -8deg;
		}

		82% {
			opacity: 100%;
			translate: calc(var(--dd-space-xl) * 2) calc(var(--dd-space-sm) * -1);
			rotate: 4deg;
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * 1.5) 0;
			rotate: 0deg;
		}
	}

	@keyframes spin-land {
		0% {
			translate: 0 calc(var(--dd-tower-gap) * -1);
			rotate: 0deg;
			scale: 1;
		}

		24% {
			translate: 0 calc(var(--dd-tower-gap) * -1.6);
			rotate: 130deg;
			animation-timing-function: var(--dd-easing-exit);
		}

		62% {
			translate: 0 0;
			rotate: 360deg;
			scale: 1;
		}

		68% {
			translate: 0 0;
			rotate: 360deg;
			scale: 1.08 0.88;
		}

		82%,
		100% {
			translate: 0 0;
			rotate: 360deg;
			scale: 1;
		}
	}

	@keyframes bounce-land {
		0% {
			translate: 0 calc(var(--dd-tower-gap) * -1);
			scale: 1;
			animation-timing-function: var(--dd-easing-exit);
		}

		22% {
			translate: 0 0;
			scale: 1.1 0.86;
		}

		30% {
			translate: 0 0;
			scale: 1;
			animation-timing-function: var(--dd-easing-enter);
		}

		46% {
			translate: 0 calc(var(--dd-tower-gap) * -1.8);
			scale: 0.97 1.04;
			animation-timing-function: var(--dd-easing-exit);
		}

		62% {
			translate: 0 0;
			scale: 1.08 0.9;
		}

		70% {
			translate: 0 0;
			scale: 1;
			animation-timing-function: var(--dd-easing-enter);
		}

		80% {
			translate: 0 calc(var(--dd-space-sm) * -1.25);
			animation-timing-function: var(--dd-easing-exit);
		}

		90%,
		100% {
			translate: 0 0;
			scale: 1;
		}
	}

	@keyframes crane-carries {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * 1.6) calc(var(--dd-space-2xl) * -1);
		}

		12% {
			opacity: 100%;
		}

		44% {
			opacity: 100%;
			translate: 0 calc(var(--dd-tower-gap) * -1);
		}

		54% {
			translate: 0 calc(var(--dd-tower-gap) * -1);
		}

		76% {
			translate: 0 0;
			scale: 1;
		}

		82% {
			scale: 1.04 0.94;
		}

		92%,
		100% {
			opacity: 100%;
			translate: 0 0;
			scale: 1;
		}
	}

	@keyframes rocket-leaves {
		0%,
		70% {
			opacity: 100%;
			translate: 0 0;
			animation-timing-function: var(--dd-easing-exit);
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * -1.6) calc(var(--dd-space-xl) * -1.2);
		}
	}

	@keyframes slide-in {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-3xl) * 2) 0;
		}

		10% {
			opacity: 100%;
		}

		58% {
			opacity: 100%;
			translate: calc(var(--dd-space-sm) * -1) 0;
			scale: 1;
		}

		68% {
			translate: 0 0;
			scale: 0.94 1.05;
		}

		82%,
		100% {
			opacity: 100%;
			translate: 0 0;
			scale: 1;
		}
	}

	@keyframes speed-fades {
		0%,
		40% {
			opacity: 100%;
		}

		62%,
		100% {
			opacity: 0;
		}
	}

	@keyframes magnet-snap {
		0% {
			opacity: 0;
			translate: calc(var(--dd-space-2xl) * -1.5) calc(var(--dd-space-2xl) * -1.2);
			rotate: -14deg;
		}

		14% {
			opacity: 100%;
		}

		40% {
			translate: calc(var(--dd-space-xl) * -1.2) calc(var(--dd-space-lg) * -1.2);
			rotate: 6deg;
		}

		56% {
			translate: calc(var(--dd-space-md) * -1) calc(var(--dd-space-md) * -1);
			rotate: -4deg;
			animation-timing-function: var(--dd-easing-exit);
		}

		71% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
			scale: 1;
		}

		76% {
			translate: 0 0;
			scale: 1.07 0.9;
		}

		88%,
		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
			scale: 1;
		}
	}

	@keyframes spark {
		0%,
		70% {
			opacity: 0;
			translate: 0 0;
			scale: 0.5;
		}

		74% {
			opacity: 100%;
			scale: 1;
		}

		100% {
			opacity: 0;
			scale: 1.2;
		}
	}

	@keyframes plant {
		0%,
		76% {
			opacity: 0;
			scale: 1 0.2;
		}

		90% {
			opacity: 100%;
			scale: 1 1.1;
		}

		100% {
			opacity: 100%;
			scale: 1;
		}
	}
</style>
