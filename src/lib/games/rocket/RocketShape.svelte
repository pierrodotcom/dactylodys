<svelte:options namespace="svg" />

<script lang="ts">
	import {
		ROCKET_BAND_PATH,
		ROCKET_BODY_PATH,
		ROCKET_FIN_PATHS,
		ROCKET_FLAME_INNER_PATH,
		ROCKET_FLAME_OUTER_PATH,
		ROCKET_LEG_PATHS,
		ROCKET_WINDOW
	} from './shapes';

	interface Props {
		/** Engine off, legs out. */
		landed: boolean;
		/** Changes with every good key: the engine pushes once each time. */
		thrust: number;
		/** Draw the flame without the push. */
		still: boolean;
	}

	let { landed, thrust, still }: Props = $props();
</script>

<g class="rocket" data-still={still || undefined}>
	{#if landed}
		{#each ROCKET_LEG_PATHS as leg (leg)}
			<path class="leg" d={leg} />
		{/each}
	{:else}
		{#key thrust}
			<g class="flame">
				<path class="flame-outer" d={ROCKET_FLAME_OUTER_PATH} />
				<path class="flame-inner" d={ROCKET_FLAME_INNER_PATH} />
			</g>
		{/key}
	{/if}
	{#each ROCKET_FIN_PATHS as fin (fin)}
		<path class="fin" d={fin} />
	{/each}
	<path class="body" d={ROCKET_BODY_PATH} />
	<path class="band" d={ROCKET_BAND_PATH} />
	<circle class="window" cx={ROCKET_WINDOW.cx} cy={ROCKET_WINDOW.cy} r={ROCKET_WINDOW.radius} />
</g>

<style>
	.leg,
	.fin,
	.body,
	.band,
	.window,
	.flame-outer,
	.flame-inner {
		stroke: var(--dd-color-sky-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.leg,
	.band {
		fill: transparent;
	}

	.fin {
		fill: var(--dd-color-rocket-fin);
	}

	.body {
		fill: var(--dd-color-rocket-body);
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

	.flame {
		transform-box: fill-box;
		transform-origin: 50% 0%;
		animation-name: push;
		animation-duration: var(--dd-duration-base);
		animation-timing-function: var(--dd-easing-enter);
	}

	[data-still] .flame {
		animation-name: none;
	}

	@keyframes push {
		0% {
			scale: 1.3 1.6;
		}

		100% {
			scale: 1 1;
		}
	}
</style>
