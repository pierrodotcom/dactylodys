<script lang="ts">
	import {
		BABY_PLATES,
		BABY_VARIANTS,
		CRACKS,
		EGG_PATH,
		SHELL_BOTTOM_PATH,
		SHELL_TOP_PATH,
		SPOTS
	} from './shapes';

	interface Props {
		/** Number of cracks to draw on a whole egg. */
		stage: number;
		hatched: boolean;
		/** Which baby dino comes out; the colors cycle. */
		variant: number;
		/** The big egg moves when it hatches; the small ones of the row only change shape. */
		big?: boolean;
	}

	let { stage, hatched, variant, big = false }: Props = $props();

	const color = $derived(Math.abs(variant) % BABY_VARIANTS);
</script>

<svg
	class="egg"
	viewBox="0 0 120 150"
	focusable="false"
	aria-hidden="true"
	data-hatched={hatched || undefined}
	data-big={big || undefined}
	data-color={color}
>
	{#if hatched}
		<g class="baby">
			<ellipse class="body line" cx="60" cy="100" rx="32" ry="26" />
			<g transform="translate(0 -8)">
				<path class="plate line" d={BABY_PLATES[0]} />
				<path class="plate line" d={BABY_PLATES[1]} />
				<path class="plate line" d={BABY_PLATES[2]} />
				<circle class="body line" cx="60" cy="68" r="27" />
				<circle class="white line" cx="49" cy="64" r="7" />
				<circle class="white line" cx="71" cy="64" r="7" />
				<circle class="ink" cx="50" cy="65" r="3.5" />
				<circle class="ink" cx="72" cy="65" r="3.5" />
				<circle class="cheek" cx="40" cy="78" r="4" />
				<circle class="cheek" cx="80" cy="78" r="4" />
				<path class="open line" d="M52 79Q60 87 68 79" />
			</g>
		</g>
		<path class="shell line" d={SHELL_BOTTOM_PATH} />
		<g class="cap">
			<path class="shell line" d={SHELL_TOP_PATH} />
		</g>
	{:else}
		<path class="shell line" d={EGG_PATH} />
		{#each SPOTS as spot (spot.x)}
			<circle class="spot" cx={spot.x} cy={spot.y} r={spot.radius} />
		{/each}
		{#each CRACKS as crack, index (index)}
			{#if index < stage}
				<path class="crack" d={crack} />
			{/if}
		{/each}
	{/if}
</svg>

<style>
	.egg {
		display: block;
		inline-size: 100%;
		block-size: auto;
		overflow: visible;
	}

	.line {
		stroke: var(--dd-color-egg-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.shell {
		fill: var(--dd-color-egg-shell);
	}

	.spot {
		fill: var(--dd-color-egg-spot);
	}

	.crack {
		fill: transparent;
		stroke: var(--dd-color-egg-crack);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	[data-big] .crack {
		stroke-width: var(--dd-border-width-target);
	}

	.body {
		fill: var(--dd-color-baby-a);
	}

	[data-color='1'] .body {
		fill: var(--dd-color-baby-b);
	}

	[data-color='2'] .body {
		fill: var(--dd-color-baby-c);
	}

	[data-color='3'] .body {
		fill: var(--dd-color-baby-d);
	}

	.plate {
		fill: var(--dd-color-companion-plate);
	}

	.white {
		fill: var(--dd-color-companion-eye);
	}

	.ink {
		fill: var(--dd-color-companion-line);
	}

	.cheek {
		fill: var(--dd-color-companion-cheek);
	}

	.open {
		fill: transparent;
	}

	.cap {
		transform-box: fill-box;
		transform-origin: 20% 90%;
		rotate: -38deg;
		translate: -14% -18%;
	}

	[data-big] .baby {
		animation-name: emerge;
		animation-duration: var(--dd-duration-slow);
		animation-timing-function: var(--dd-easing-enter);
	}

	[data-big] .cap {
		animation-name: lift;
		animation-duration: var(--dd-duration-slow);
		animation-timing-function: var(--dd-easing-enter);
	}

	@keyframes emerge {
		0% {
			translate: 0 30%;
			scale: 0.7;
		}

		70% {
			translate: 0 -6%;
			scale: 1.05;
		}

		100% {
			translate: 0 0;
			scale: 1;
		}
	}

	@keyframes lift {
		0% {
			rotate: 0deg;
			translate: 0 0;
		}

		100% {
			rotate: -38deg;
			translate: -14% -18%;
		}
	}
</style>
