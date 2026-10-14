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
			<g data-reward data-reward-variant={destinationVariant % REWARD_VARIANTS}>
				<InhabitantShape variant={destinationVariant} />
			</g>
		</g>
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
		<RocketShape landed={pose.landed} thrust={view.position} still={view.reducedMotion} />
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
</style>
