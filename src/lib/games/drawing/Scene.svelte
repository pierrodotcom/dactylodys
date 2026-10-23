<script lang="ts">
	import { readDurationToken } from '$lib/ui/motion';
	import type { GameView } from '../shared/game-view';
	import { stageFor } from '../shared/stage';
	import { PROBE_STEPS, drawnShare, isColored } from './draw';
	import DrawingArt from './DrawingArt.svelte';
	import Figure from './Figure.svelte';
	import {
		BOX_CENTER,
		CRUMBS,
		DESK_GRAIN,
		DESK_SEAMS,
		DINO,
		DINO_PLACE,
		DROP_PATH,
		DROP_SHINE,
		ERASER,
		ERASER_PLACE,
		LOOP_PATH,
		LOOSE_PENCIL,
		LOOSE_PENCIL_PLACE,
		PAPER,
		PENCIL,
		PENCIL_PLACE,
		PENCIL_POT,
		PICTURE_PLACE,
		ROCKET,
		ROCKET_SCALE,
		SCENE,
		SPARKS,
		SPARK_HEART,
		SPARK_PATH,
		SPLASH,
		TAPES
	} from './scenery';
	import type { DrawingPicture } from './shapes';

	interface Props {
		view: GameView;
		picture: DrawingPicture;
	}

	const SCENE_TOKEN = '--dd-duration-scene';
	const DELAY_TOKEN = '--dd-duration-reward-delay';
	const MS_PER_SECOND = 1000;
	/** Colours of the drop and of the touch left by the entrances, in turn. */
	const DROP_TONES = 6;
	/** How far the shadow of the sheet falls, toward the bottom right. */
	const SHADOW_OFFSET = 4;

	let { view, picture }: Props = $props();

	let art: ReturnType<typeof DrawingArt> | undefined = $state();

	const celebrating = $derived(view.phase === 'celebrating');
	const share = $derived(drawnShare(view));
	const tone = $derived(view.groupIndex % DROP_TONES);
	const sceneId = $derived(celebrating && view.scene.kind === 'scene' ? view.scene.id : undefined);
	const entrance = $derived(
		celebrating && view.scene.kind === 'variant' ? view.scene.index : undefined
	);
	const stage = $derived(
		view.phase === 'typing' ? stageFor(view.position, view.group.length, PROBE_STEPS) : PROBE_STEPS
	);
	const tip = $derived.by(() => (celebrating ? art?.pointAt(share) : null) ?? BOX_CENTER);
	const trace = $derived.by(() => {
		if (sceneId !== 'rocket-trace' || !art) return '';
		return art.traceBetween(Math.max(0, (view.completed - 1) / view.total), share);
	});

	/** The rocket flies along the line the group has just added, for as long as the scene lasts. */
	function fly(node: Element) {
		const motion = node as SVGAnimationElement;
		motion.setAttribute('dur', `${readDurationToken(SCENE_TOKEN)}ms`);
		motion.beginElementAt(readDurationToken(DELAY_TOKEN) / MS_PER_SECOND);
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
	<rect class="desk" x="0" y="0" width={SCENE.width} height={SCENE.height} />
	<path class="seam" d={DESK_SEAMS} />
	<path class="grain" d={DESK_GRAIN} />

	<Figure figure={PENCIL_POT} />
	<g transform={LOOSE_PENCIL_PLACE}><Figure figure={LOOSE_PENCIL} /></g>

	{#if sceneId === 'dino-photobomb'}
		<g transform={DINO_PLACE}>
			<g class="stunt dino"><Figure figure={DINO} /></g>
		</g>
	{/if}

	{#if sceneId === 'eraser-peek'}
		<path class="stunt crumbs" d={CRUMBS} />
		<g transform={ERASER_PLACE}>
			<g class="stunt eraser"><Figure figure={ERASER} /></g>
		</g>
	{/if}

	<rect
		class="sheet-shadow"
		x={PAPER.x + SHADOW_OFFSET}
		y={PAPER.y + SHADOW_OFFSET}
		width={PAPER.width}
		height={PAPER.height}
		rx={PAPER.radius}
	/>
	<rect
		class="paper"
		x={PAPER.x}
		y={PAPER.y}
		width={PAPER.width}
		height={PAPER.height}
		rx={PAPER.radius}
	/>
	{#each TAPES as tape (tape.place)}
		<path class="tape" d={tape.d} transform={tape.place} />
	{/each}

	<g transform={PENCIL_PLACE}>
		<g class="stunt pencil"><Figure figure={PENCIL} /></g>
	</g>

	<g transform={PICTURE_PLACE}>
		<g class="stunt wobbler">
			<DrawingArt
				bind:this={art}
				{picture}
				{share}
				colored={isColored(view)}
				still={view.reducedMotion}
			/>

			{#if entrance !== undefined}
				<g transform="translate({tip.x} {tip.y})">
					<g class="mark" data-tone={tone} data-reward data-reward-variant={entrance}>
						<path class="spark-body" d={SPARK_PATH} />
						<path class="spark-heart" d={SPARK_HEART} />
					</g>
				</g>
			{/if}

			{#if sceneId === 'flourish'}
				<g transform="translate({tip.x} {tip.y})">
					<path class="stunt loop" d={LOOP_PATH} pathLength="1" />
				</g>
			{/if}

			{#if sceneId === 'sparkle'}
				<g transform="translate({tip.x} {tip.y})">
					{#each SPARKS as spark, slot (spark.x)}
						<g transform="translate({spark.x} {spark.y})">
							<g class="stunt spark" data-slot={slot}>
								<path class="spark-body" d={SPARK_PATH} />
								<path class="spark-heart" d={SPARK_HEART} />
							</g>
						</g>
					{/each}
				</g>
			{/if}

			{#if sceneId === 'color-drop'}
				<g transform="translate({tip.x} {tip.y})">
					{#each SPLASH as droplet (droplet.x)}
						<g transform="translate({droplet.x} {droplet.y})">
							<circle class="stunt splash" data-tone={tone} r={droplet.r} />
						</g>
					{/each}
					<g class="stunt drop">
						<path class="drop-body" data-tone={tone} d={DROP_PATH} />
						<path class="drop-shine" d={DROP_SHINE} />
					</g>
				</g>
			{/if}

			{#if sceneId === 'rocket-trace' && trace !== ''}
				<path class="stunt trail" d={trace} pathLength="1" />
				<g class="stunt flyer">
					<g transform="scale({ROCKET_SCALE})"><Figure figure={ROCKET} /></g>
					<animateMotion
						{@attach fly}
						path={trace}
						rotate="auto"
						begin="indefinite"
						fill="freeze"
					/>
				</g>
			{/if}
		</g>
	</g>
</svg>

<style>
	.scene {
		display: block;
		inline-size: 100%;
		max-inline-size: var(--dd-size-scene-max);
		block-size: auto;
		overflow: hidden;
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-drawing-desk);
	}

	.desk {
		fill: var(--dd-color-drawing-desk);
	}

	.seam,
	.grain {
		fill: transparent;
		stroke: var(--dd-color-drawing-desk-dark);
		stroke-linecap: round;
	}

	.seam {
		stroke-width: calc(var(--dd-border-width-drawing-bold) * 0.5);
	}

	.grain {
		stroke-width: calc(var(--dd-border-width-drawing-bold) * 0.35);
	}

	.sheet-shadow {
		fill: var(--dd-color-drawing-shade);
		fill-opacity: var(--dd-opacity-drawing-shade);
	}

	.paper {
		fill: var(--dd-color-drawing-paper);
	}

	.tape {
		fill: var(--dd-color-drawing-tape);
		fill-opacity: var(--dd-opacity-drawing-tape);
	}

	.crumbs {
		fill: var(--dd-color-drawing-rubber);
	}

	.spark-body,
	.drop-body,
	.splash {
		stroke: var(--dd-color-drawing-pencil);
		stroke-width: calc(var(--dd-border-width-drawing-bold) * 0.5);
		stroke-linejoin: round;
	}

	.spark-heart,
	.drop-shine {
		fill: var(--dd-color-drawing-light);
		fill-opacity: var(--dd-opacity-drawing-light);
	}

	.spark .spark-body {
		fill: var(--dd-color-drawing-gold);
	}

	.mark[data-tone='0'] .spark-body,
	.drop-body[data-tone='0'],
	.splash[data-tone='0'] {
		fill: var(--dd-color-drawing-fur);
	}

	.mark[data-tone='1'] .spark-body,
	.drop-body[data-tone='1'],
	.splash[data-tone='1'] {
		fill: var(--dd-color-drawing-petal);
	}

	.mark[data-tone='2'] .spark-body,
	.drop-body[data-tone='2'],
	.splash[data-tone='2'] {
		fill: var(--dd-color-drawing-gold);
	}

	.mark[data-tone='3'] .spark-body,
	.drop-body[data-tone='3'],
	.splash[data-tone='3'] {
		fill: var(--dd-color-drawing-leaf);
	}

	.mark[data-tone='4'] .spark-body,
	.drop-body[data-tone='4'],
	.splash[data-tone='4'] {
		fill: var(--dd-color-drawing-glass);
	}

	.mark[data-tone='5'] .spark-body,
	.drop-body[data-tone='5'],
	.splash[data-tone='5'] {
		fill: var(--dd-color-drawing-lilac);
	}

	.loop,
	.trail {
		fill: transparent;
		stroke: var(--dd-color-accent-base);
		stroke-width: calc(var(--dd-border-width-drawing-bold) * 0.85);
		stroke-linecap: round;
		stroke-linejoin: round;
		/* pathLength="1": the dash covers the whole line, so its offset draws it bit by bit. */
		stroke-dasharray: 1 3;
	}

	/* Surprise scenes (ADR-034): a moment after the last key, long enough to be seen. */
	[data-scene] .stunt {
		transform-box: fill-box;
		transform-origin: 50% 50%;
		animation-duration: var(--dd-duration-scene);
		animation-delay: var(--dd-duration-reward-delay);
		animation-timing-function: var(--dd-easing-standard);
		animation-fill-mode: both;
	}

	[data-scene='flourish'] .loop {
		animation-name: loop-draws;
		animation-timing-function: var(--dd-easing-steady);
	}

	[data-scene='sparkle'] .spark {
		animation-name: twinkle;
		animation-duration: calc(var(--dd-duration-scene) * 0.55);
	}

	[data-scene='sparkle'] .spark[data-slot='1'] {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-scene) * 0.1);
	}

	[data-scene='sparkle'] .spark[data-slot='2'] {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-scene) * 0.2);
	}

	[data-scene='sparkle'] .spark[data-slot='3'] {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-scene) * 0.3);
	}

	[data-scene='sparkle'] .spark[data-slot='4'] {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-scene) * 0.4);
	}

	[data-scene='dino-photobomb'] .dino {
		animation-name: dino-peeks;
	}

	[data-scene='wobble'] .wobbler {
		transform-origin: 50% 100%;
		animation-name: wobble;
	}

	[data-scene='pencil-dance'] .pencil {
		transform-origin: 0% 50%;
		animation-name: pencil-dances;
	}

	[data-scene='rocket-trace'] .trail {
		animation-name: trail-draws;
		animation-timing-function: var(--dd-easing-steady);
	}

	[data-scene='rocket-trace'] .flyer {
		animation-name: rocket-shows;
		animation-timing-function: var(--dd-easing-steady);
	}

	[data-scene='eraser-peek'] .eraser {
		animation-name: eraser-peeks;
	}

	[data-scene='eraser-peek'] .crumbs {
		animation-name: crumbs-show;
	}

	[data-scene='color-drop'] .drop {
		animation-name: drop-falls;
		animation-timing-function: var(--dd-easing-enter);
	}

	[data-scene='color-drop'] .splash {
		animation-name: splash;
	}

	@keyframes loop-draws {
		0% {
			opacity: 0;
			stroke-dashoffset: 1;
		}

		5% {
			opacity: 100%;
			stroke-dashoffset: 1;
		}

		60%,
		85% {
			opacity: 100%;
			stroke-dashoffset: 0;
		}

		100% {
			opacity: 0;
			stroke-dashoffset: 0;
		}
	}

	@keyframes twinkle {
		0% {
			opacity: 0;
			scale: 0.2;
			rotate: -30deg;
		}

		35% {
			opacity: 100%;
			scale: 1.2;
			rotate: 0deg;
		}

		65% {
			opacity: 100%;
			scale: 0.9;
		}

		100% {
			opacity: 0;
			scale: 0.2;
			rotate: 30deg;
		}
	}

	@keyframes dino-peeks {
		0% {
			translate: 100% 0;
			rotate: 0deg;
		}

		22% {
			translate: 0 0;
			rotate: 0deg;
		}

		38% {
			rotate: -6deg;
		}

		54% {
			rotate: 6deg;
		}

		68% {
			translate: 0 0;
			rotate: 0deg;
		}

		92%,
		100% {
			translate: 100% 0;
			rotate: 0deg;
		}
	}

	@keyframes wobble {
		0%,
		100% {
			rotate: 0deg;
		}

		15% {
			rotate: -5deg;
		}

		35% {
			rotate: 5deg;
		}

		55% {
			rotate: -2.5deg;
		}

		75% {
			rotate: 1.5deg;
		}
	}

	@keyframes pencil-dances {
		0%,
		100% {
			translate: 0 0;
			rotate: 0deg;
		}

		15% {
			translate: 0 calc(var(--dd-space-sm) * -1);
			rotate: -16deg;
		}

		30% {
			translate: 0 0;
			rotate: 10deg;
		}

		45% {
			translate: 0 calc(var(--dd-space-sm) * -1);
			rotate: -12deg;
		}

		60% {
			translate: 0 0;
			rotate: 8deg;
		}

		80% {
			translate: 0 calc(var(--dd-space-xs) * -1);
			rotate: -5deg;
		}
	}

	@keyframes trail-draws {
		0% {
			opacity: 0;
			stroke-dashoffset: 1;
		}

		3% {
			opacity: 100%;
			stroke-dashoffset: 1;
		}

		80% {
			opacity: 100%;
			stroke-dashoffset: 0;
		}

		100% {
			opacity: 0;
			stroke-dashoffset: 0;
		}
	}

	@keyframes rocket-shows {
		0% {
			opacity: 0;
		}

		4%,
		92% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
		}
	}

	@keyframes eraser-peeks {
		0% {
			translate: 100% 0;
			rotate: 0deg;
		}

		20% {
			translate: 0 0;
			rotate: 0deg;
		}

		35% {
			rotate: -5deg;
		}

		50% {
			rotate: 5deg;
		}

		65% {
			translate: 0 0;
			rotate: 0deg;
		}

		92%,
		100% {
			translate: 100% 0;
			rotate: 0deg;
		}
	}

	@keyframes crumbs-show {
		0%,
		30% {
			opacity: 0;
		}

		45%,
		85% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
		}
	}

	@keyframes drop-falls {
		0% {
			opacity: 0;
			translate: 0 calc(var(--dd-space-3xl) * -0.75);
			scale: 0.8;
		}

		12% {
			opacity: 100%;
		}

		45% {
			opacity: 100%;
			translate: 0 0;
			scale: 1;
		}

		58%,
		100% {
			opacity: 0;
			translate: 0 0;
			scale: 0.3;
		}
	}

	@keyframes splash {
		0%,
		44% {
			opacity: 0;
			scale: 0.2;
		}

		55% {
			opacity: 100%;
			scale: 1.2;
		}

		80% {
			opacity: 100%;
			scale: 1;
		}

		100% {
			opacity: 0;
			scale: 0.6;
		}
	}
</style>
