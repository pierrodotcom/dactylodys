<script lang="ts">
	import { readDurationToken } from '$lib/ui/motion';
	import type { GameView } from '../shared/game-view';
	import { stageFor } from '../shared/stage';
	import { PROBE_STEPS, drawnShare, isColored } from './draw';
	import DrawingArt from './DrawingArt.svelte';
	import {
		BOX_CENTER,
		DINO,
		DINO_CHEEKS,
		DINO_EYES,
		DINO_MOUTH,
		DINO_PLACE,
		DINO_PUPILS,
		DROP_PATH,
		ERASER,
		ERASER_EYES,
		ERASER_MOUTH,
		ERASER_PLACE,
		ERASER_PUPILS,
		LOOP_PATH,
		PAPER,
		PENCIL,
		PENCIL_PLACE,
		PICTURE_PLACE,
		ROCKET,
		ROCKET_SCALE,
		ROCKET_WINDOW,
		SCENE,
		SPARKS,
		SPARK_PATH,
		SPLASH_RADIUS
	} from './scenery';
	import type { DrawingPicture } from './shapes';

	interface Props {
		view: GameView;
		picture: DrawingPicture;
	}

	const SCENE_TOKEN = '--dd-duration-scene';
	const DELAY_TOKEN = '--dd-duration-reward-delay';
	const MS_PER_SECOND = 1000;
	/** Colours of the drop, in turn. */
	const DROP_TONES = 6;

	let { view, picture }: Props = $props();

	let art: ReturnType<typeof DrawingArt> | undefined = $state();

	const celebrating = $derived(view.phase === 'celebrating');
	const share = $derived(drawnShare(view));
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
	{#if sceneId === 'dino-photobomb'}
		<g transform={DINO_PLACE}>
			<g class="stunt dino">
				{#each DINO as piece (piece.d)}
					<path class="piece" data-paint={piece.paint} d={piece.d} />
				{/each}
				{#each DINO_CHEEKS as cheek (cheek.x)}
					<ellipse
						class="piece"
						data-paint="cheek"
						cx={cheek.x}
						cy={cheek.y}
						rx={cheek.rx}
						ry={cheek.ry}
					/>
				{/each}
				{#each DINO_EYES as eye (eye.x)}
					<circle class="piece" data-paint="white" cx={eye.x} cy={eye.y} r={eye.radius} />
				{/each}
				{#each DINO_PUPILS as pupil (pupil.x)}
					<circle class="pupil" cx={pupil.x} cy={pupil.y} r={pupil.radius} />
				{/each}
				<path class="mouth" d={DINO_MOUTH} />
			</g>
		</g>
	{/if}

	{#if sceneId === 'eraser-peek'}
		<g transform={ERASER_PLACE}>
			<g class="stunt eraser">
				{#each ERASER as piece (piece.d)}
					<path class="piece" data-paint={piece.paint} d={piece.d} />
				{/each}
				{#each ERASER_EYES as eye (eye.x)}
					<circle class="piece" data-paint="white" cx={eye.x} cy={eye.y} r={eye.radius} />
				{/each}
				{#each ERASER_PUPILS as pupil (pupil.x)}
					<circle class="pupil" cx={pupil.x} cy={pupil.y} r={pupil.radius} />
				{/each}
				<path class="mouth" d={ERASER_MOUTH} />
			</g>
		</g>
	{/if}

	<rect
		class="paper"
		x={PAPER.x}
		y={PAPER.y}
		width={PAPER.width}
		height={PAPER.height}
		rx={PAPER.radius}
	/>

	<g transform={PENCIL_PLACE}>
		<g class="stunt pencil">
			{#each PENCIL as piece (piece.d)}
				<path class="piece" data-paint={piece.paint} d={piece.d} />
			{/each}
		</g>
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
					<path
						class="mark"
						data-tone={view.groupIndex % DROP_TONES}
						d={SPARK_PATH}
						data-reward
						data-reward-variant={entrance}
					/>
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
							<path class="stunt spark" data-slot={slot} d={SPARK_PATH} />
						</g>
					{/each}
				</g>
			{/if}

			{#if sceneId === 'color-drop'}
				<g transform="translate({tip.x} {tip.y})">
					<circle class="stunt splash" data-tone={view.groupIndex % DROP_TONES} r={SPLASH_RADIUS} />
					<path class="stunt drop" data-tone={view.groupIndex % DROP_TONES} d={DROP_PATH} />
				</g>
			{/if}

			{#if sceneId === 'rocket-trace' && trace !== ''}
				<path class="stunt trail" d={trace} pathLength="1" />
				<g class="stunt flyer">
					<g class="rocket" transform="scale({ROCKET_SCALE})">
						{#each ROCKET as piece (piece.d)}
							<path class="piece" data-paint={piece.paint} d={piece.d} />
						{/each}
						<circle
							class="piece"
							data-paint="window"
							cx={ROCKET_WINDOW.x}
							cy={ROCKET_WINDOW.y}
							r={ROCKET_WINDOW.radius}
						/>
					</g>
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
		background-color: var(--dd-color-surface-sunken);
	}

	.paper {
		fill: var(--dd-color-surface-raised);
		stroke: var(--dd-color-border-subtle);
		stroke-width: var(--dd-border-width-thick);
	}

	.piece,
	.pupil,
	.mouth,
	.mark,
	.drop,
	.splash,
	.spark {
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.mouth,
	.loop,
	.trail {
		fill: transparent;
	}

	.pupil {
		fill: var(--dd-color-drawing-ink);
	}

	.piece[data-paint='wood'] {
		fill: var(--dd-color-food-a);
	}

	.piece[data-paint='lead'] {
		fill: var(--dd-color-drawing-ink);
	}

	.piece[data-paint='body'],
	.piece[data-paint='band'] {
		fill: var(--dd-color-food-e);
	}

	.piece[data-paint='ferrule'] {
		fill: var(--dd-color-pot-steam);
	}

	.piece[data-paint='rubber'] {
		fill: var(--dd-color-food-b);
	}

	.piece[data-paint='green'] {
		fill: var(--dd-color-companion-green-body);
	}

	.piece[data-paint='plate'] {
		fill: var(--dd-color-companion-green-plate);
	}

	.piece[data-paint='cheek'] {
		fill: var(--dd-color-companion-green-cheek);
	}

	.piece[data-paint='white'] {
		fill: var(--dd-color-companion-eye);
	}

	.piece[data-paint='cream'] {
		fill: var(--dd-color-rocket-body);
	}

	.piece[data-paint='fin'] {
		fill: var(--dd-color-rocket-fin);
	}

	.piece[data-paint='window'] {
		fill: var(--dd-color-rocket-window);
	}

	.piece[data-paint='flame'] {
		fill: var(--dd-color-rocket-flame-outer);
	}

	.mark[data-tone='0'],
	.drop[data-tone='0'],
	.splash[data-tone='0'] {
		fill: var(--dd-color-food-a);
	}

	.mark[data-tone='1'],
	.drop[data-tone='1'],
	.splash[data-tone='1'] {
		fill: var(--dd-color-food-b);
	}

	.mark[data-tone='2'],
	.drop[data-tone='2'],
	.splash[data-tone='2'] {
		fill: var(--dd-color-food-c);
	}

	.mark[data-tone='3'],
	.drop[data-tone='3'],
	.splash[data-tone='3'] {
		fill: var(--dd-color-food-d);
	}

	.mark[data-tone='4'],
	.drop[data-tone='4'],
	.splash[data-tone='4'] {
		fill: var(--dd-color-food-e);
	}

	.mark[data-tone='5'],
	.drop[data-tone='5'],
	.splash[data-tone='5'] {
		fill: var(--dd-color-food-f);
	}

	.spark {
		fill: var(--dd-color-star-fill);
	}

	.loop,
	.trail {
		stroke: var(--dd-color-accent-base);
		stroke-width: calc(var(--dd-border-width-drawing-bold) * 1.25);
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

		52% {
			opacity: 100%;
			scale: 0.6;
		}

		100% {
			opacity: 0;
			scale: 1.8;
		}
	}
</style>
