<script lang="ts">
	import type { GameView } from '../shared/game-view';
	import AstreShape from './AstreShape.svelte';
	import { FLIGHT, SCENE, departureIndex, destinationLit, rocketPose } from './flight';
	import InhabitantShape from './InhabitantShape.svelte';
	import RocketShape from './RocketShape.svelte';
	import { COUGH_PUFFS, STARS } from './shapes';

	interface Props {
		view: GameView;
	}

	const HOME_VARIANT = 3;
	const REWARD_VARIANTS = 4;
	/** Directions of the sparks of the fireworks around the astre reached, in degrees. */
	const SPARK_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;
	const SPARK_COLORS = 4;
	const SPARK_RADIUS = 7;
	const INHABITANT = { x: 372, y: 63, scale: 0.9 } as const;
	const ROCKET_SCALE = 1.2;
	/** Where the smoke of a cough appears, behind the engine. */
	const COUGH_OFFSET = { x: -30, y: -40 } as const;

	let { view }: Props = $props();

	const pose = $derived(rocketPose(view));
	const departure = $derived(departureIndex(view));
	const lit = $derived(destinationLit(view));
	const coughing = $derived(view.errorIndex !== null);
	const destinationVariant = $derived(view.groupIndex);
	const sceneId = $derived(lit && view.scene.kind === 'scene' ? view.scene.id : undefined);

	function astreTransform(centerX: number): string {
		const scale = FLIGHT.astreScale;
		const half = 50 * scale;
		return `translate(${centerX - half} ${FLIGHT.astreY - half}) scale(${scale})`;
	}
</script>

<svg
	class="sky"
	viewBox="0 0 {SCENE.width} {SCENE.height}"
	focusable="false"
	aria-hidden="true"
	data-still={view.reducedMotion || undefined}
	data-scene={sceneId}
>
	{#each STARS as star (star.x)}
		<circle class="star" cx={star.x} cy={star.y} r={star.radius} />
	{/each}

	<g transform={astreTransform(FLIGHT.departureX)}>
		<AstreShape variant={departure ?? HOME_VARIANT} lit={true} />
	</g>
	<g transform={astreTransform(FLIGHT.destinationX)}>
		<AstreShape variant={destinationVariant} {lit} />
	</g>

	{#if lit}
		<g transform="translate({INHABITANT.x} {INHABITANT.y}) scale({INHABITANT.scale})">
			{#if sceneId === 'inhabitant-joy'}
				<g class="inhabitant">
					<InhabitantShape variant={destinationVariant} />
				</g>
			{:else}
				<g data-reward data-reward-variant={destinationVariant % REWARD_VARIANTS}>
					<InhabitantShape variant={destinationVariant} />
				</g>
			{/if}
		</g>
	{/if}

	{#if sceneId === 'fireworks'}
		{#each SPARK_ANGLES as angle, index (angle)}
			<g transform="rotate({angle} {FLIGHT.destinationX} {FLIGHT.astreY})">
				<circle
					class="spark"
					cx={FLIGHT.destinationX}
					cy={FLIGHT.astreY}
					r={SPARK_RADIUS}
					data-color={index % SPARK_COLORS}
				/>
			</g>
		{/each}
	{/if}

	{#if coughing}
		<g transform="translate({pose.x + COUGH_OFFSET.x} {pose.y + COUGH_OFFSET.y})">
			<g class="cough">
				{#each COUGH_PUFFS as puff (puff.x)}
					<circle class="puff" cx={puff.x} cy={puff.y} r={puff.radius} />
				{/each}
			</g>
		</g>
	{/if}

	<g transform="translate({pose.x} {pose.y}) rotate({pose.angle}) scale({ROCKET_SCALE})">
		<g class="flyer">
			<RocketShape landed={pose.landed} thrust={view.position} still={view.reducedMotion} />
		</g>
	</g>
</svg>

<style>
	.sky {
		display: block;
		inline-size: 100%;
		max-inline-size: var(--dd-size-scene-max);
		block-size: auto;
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-sky-base);
	}

	.star {
		fill: var(--dd-color-sky-star);
	}

	.puff {
		fill: var(--dd-color-rocket-smoke);
		stroke: var(--dd-color-sky-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-dasharray: 4 3;
		vector-effect: non-scaling-stroke;
	}

	.cough {
		transform-box: fill-box;
		transform-origin: 100% 50%;
		animation-name: puff-out;
		animation-duration: var(--dd-duration-slow);
		animation-timing-function: var(--dd-easing-enter);
	}

	[data-still] .cough {
		animation-name: none;
	}

	@keyframes puff-out {
		0% {
			scale: 0.5;
		}

		100% {
			scale: 1;
		}
	}
	.spark {
		opacity: 0;
	}

	.spark[data-color='0'] {
		fill: var(--dd-color-star-fill);
	}

	.spark[data-color='1'] {
		fill: var(--dd-color-finger-left-index);
	}

	.spark[data-color='2'] {
		fill: var(--dd-color-finger-right-ring);
	}

	.spark[data-color='3'] {
		fill: var(--dd-color-sky-star);
	}

	/* Surprise scenes (ADR-032): a moment after the last key, long enough to be seen. */
	[data-scene] .flyer,
	[data-scene] .inhabitant,
	[data-scene] .spark {
		transform-box: fill-box;
		transform-origin: 50% 50%;
		animation-duration: var(--dd-duration-scene);
		animation-delay: var(--dd-duration-reward-delay);
		animation-timing-function: var(--dd-easing-standard);
		animation-fill-mode: both;
	}

	/* The rocket is drawn nose up and turned nose right: its left side is the top of the sky. */
	[data-scene='looping'] .flyer {
		transform-origin: -60% 50%;
		animation-name: looping;
	}

	[data-scene='barrel-roll'] .flyer {
		animation-name: barrel-roll;
	}

	[data-scene='inhabitant-joy'] .inhabitant {
		transform-origin: 50% 100%;
		animation-name: joy;
	}

	[data-scene='fireworks'] .spark {
		animation-name: spark;
	}

	@keyframes looping {
		0% {
			rotate: 0deg;
		}

		70%,
		100% {
			rotate: 360deg;
		}
	}

	@keyframes barrel-roll {
		0%,
		50%,
		100% {
			scale: 1 1;
		}

		25%,
		75% {
			scale: -1 1;
		}
	}

	@keyframes joy {
		0% {
			opacity: 0;
			translate: 0 0;
			rotate: 0deg;
		}

		10% {
			opacity: 100%;
		}

		25%,
		55% {
			translate: 0 -35%;
		}

		40%,
		70% {
			translate: 0 0;
			rotate: 0deg;
		}

		78%,
		94% {
			rotate: -10deg;
		}

		86% {
			rotate: 10deg;
		}

		100% {
			opacity: 100%;
			translate: 0 0;
			rotate: 0deg;
		}
	}

	@keyframes spark {
		0%,
		20% {
			opacity: 0;
			translate: 0 0;
		}

		30% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-xl) * 2) 0;
		}
	}
</style>
