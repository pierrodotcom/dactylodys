<script lang="ts">
	import type { SceneChoice } from '$lib/engine/rewards/scenes';
	import {
		BABY_PLATES,
		BABY_VARIANTS,
		CRACKS,
		DIZZY_STARS,
		EGG_PATH,
		HAT_PATH,
		SHARDS,
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
		/** Calm motion: the baby fades in and the cap is already off. */
		still?: boolean;
		/** How the big egg hatches: a surprise scene, or a common entrance. */
		scene?: SceneChoice;
	}

	const COMMON_ENTRANCE: SceneChoice = { kind: 'variant', index: 0 };

	let {
		stage,
		hatched,
		variant,
		big = false,
		still = false,
		scene = COMMON_ENTRANCE
	}: Props = $props();

	const color = $derived(Math.abs(variant) % BABY_VARIANTS);
	const sceneId = $derived(big && !still && scene.kind === 'scene' ? scene.id : undefined);
	const entrance = $derived(scene.kind === 'variant' ? scene.index : 0);
	const wholeOnTop = $derived(sceneId === 'burst' || sceneId === 'triple-jump');
</script>

<svg
	class="egg"
	viewBox="0 0 120 150"
	focusable="false"
	aria-hidden="true"
	data-hatched={hatched || undefined}
	data-big={big || undefined}
	data-still={still || undefined}
	data-color={color}
	data-scene={(hatched && sceneId) || undefined}
>
	{#if hatched}
		<g
			class="baby"
			data-reward={(big && sceneId === undefined) || undefined}
			data-reward-variant={big && sceneId === undefined ? entrance : undefined}
		>
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
				{#if sceneId === 'burst'}
					<path class="shell line" d={HAT_PATH} />
				{/if}
			</g>
		</g>
		<g class="bottom">
			<path class="shell line" d={SHELL_BOTTOM_PATH} />
		</g>
		<g class="cap">
			<path class="shell line" d={SHELL_TOP_PATH} />
		</g>
		{#if sceneId === 'fall-out'}
			<g class="dizzy">
				{#each DIZZY_STARS as star (star)}
					<path class="star line" d={star} />
				{/each}
			</g>
		{/if}
		{#if sceneId === 'burst'}
			{#each SHARDS as shard (shard.angle)}
				<g transform="rotate({shard.angle} 60 78)">
					<path class="shard shell line" d={shard.path} />
				</g>
			{/each}
		{/if}
		{#if wholeOnTop}
			<g class="whole">
				<path class="shell line" d={EGG_PATH} />
				{#each SPOTS as spot (spot.x)}
					<circle class="spot" cx={spot.x} cy={spot.y} r={spot.radius} />
				{/each}
			</g>
		{/if}
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

	.star {
		fill: var(--dd-color-star-fill);
	}

	[data-big]:not([data-still]):not([data-scene]) .cap {
		animation-name: lift;
		animation-duration: var(--dd-duration-reward);
		animation-delay: var(--dd-duration-reward-delay);
		animation-timing-function: var(--dd-easing-enter);
		animation-fill-mode: backwards;
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
	/* Surprise scenes (ADR-032): a moment after the last key, long enough to be seen. */
	[data-scene] .baby,
	[data-scene] .bottom,
	[data-scene] .cap,
	[data-scene] .whole,
	[data-scene] .dizzy,
	[data-scene] .shard {
		transform-box: fill-box;
		animation-duration: var(--dd-duration-scene);
		animation-delay: var(--dd-duration-reward-delay);
		animation-timing-function: var(--dd-easing-standard);
		animation-fill-mode: both;
	}

	[data-scene] .baby,
	[data-scene] .bottom,
	[data-scene] .whole {
		transform-origin: 50% 100%;
	}

	[data-scene] .dizzy,
	[data-scene] .shard {
		transform-origin: 50% 50%;
	}

	[data-scene='fall-out'] .baby {
		animation-name: fall;
	}

	[data-scene='fall-out'] .bottom,
	[data-scene='fall-out'] .cap {
		animation-name: shell-away;
	}

	[data-scene='fall-out'] .dizzy {
		animation-name: dizzy;
	}

	[data-scene='burst'] .whole {
		animation-name: swell;
	}

	[data-scene='burst'] .cap {
		animation-name: cap-flies;
	}

	[data-scene='burst'] .bottom {
		animation-name: bottom-drops;
	}

	[data-scene='burst'] .shard {
		animation-name: shard-flies;
	}

	[data-scene='burst'] .baby {
		animation-name: pop-out;
	}

	[data-scene='triple-jump'] .whole {
		animation-name: three-jumps;
	}

	[data-scene='triple-jump'] .cap {
		animation-name: lift-late;
	}

	[data-scene='triple-jump'] .bottom {
		animation-name: appear-late;
	}

	[data-scene='triple-jump'] .baby {
		animation-name: emerge-late;
	}

	[data-scene='peek'] .cap {
		animation-name: ajar;
	}

	[data-scene='peek'] .baby {
		animation-name: peek;
	}

	@keyframes fall {
		0% {
			opacity: 0;
			translate: 0 -10%;
		}

		15% {
			opacity: 100%;
			translate: 0 -10%;
		}

		45% {
			translate: 0 18%;
		}

		58% {
			translate: 0 8%;
		}

		70%,
		100% {
			opacity: 100%;
			translate: 0 18%;
		}
	}

	@keyframes shell-away {
		0% {
			opacity: 100%;
			rotate: 0deg;
			translate: 0 0;
		}

		45% {
			opacity: 100%;
			rotate: 0deg;
			translate: 0 -30%;
		}

		70%,
		100% {
			opacity: 0;
			rotate: 0deg;
			translate: 0 -60%;
		}
	}

	@keyframes dizzy {
		0%,
		68% {
			opacity: 0;
			rotate: 0deg;
			translate: 0 18%;
		}

		75% {
			opacity: 100%;
		}

		100% {
			opacity: 100%;
			rotate: 360deg;
			translate: 0 18%;
		}
	}

	@keyframes swell {
		0% {
			opacity: 100%;
			scale: 1;
			rotate: 0deg;
		}

		10% {
			rotate: -4deg;
		}

		20% {
			scale: 1.05;
			rotate: 4deg;
		}

		30% {
			rotate: -4deg;
		}

		40% {
			opacity: 100%;
			scale: 1.15;
			rotate: 0deg;
		}

		45%,
		100% {
			opacity: 0;
			scale: 1.2;
		}
	}

	@keyframes cap-flies {
		0%,
		44% {
			opacity: 100%;
			rotate: 0deg;
			translate: 0 0;
		}

		100% {
			opacity: 0;
			rotate: -120deg;
			translate: -60% -80%;
		}
	}

	@keyframes bottom-drops {
		0%,
		44% {
			opacity: 100%;
			rotate: 0deg;
			translate: 0 0;
		}

		100% {
			opacity: 0;
			rotate: 30deg;
			translate: 30% 60%;
		}
	}

	@keyframes shard-flies {
		0%,
		44% {
			opacity: 0;
			translate: 0 0;
		}

		50% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: calc(var(--dd-space-xl) * 1.5) 0;
		}
	}

	@keyframes pop-out {
		0%,
		44% {
			opacity: 0;
			scale: 0.3;
		}

		60% {
			opacity: 100%;
			scale: 1.15;
		}

		75% {
			scale: 0.95;
		}

		100% {
			opacity: 100%;
			scale: 1;
		}
	}

	@keyframes three-jumps {
		0%,
		16%,
		36%,
		58% {
			opacity: 100%;
			translate: 0 0;
		}

		8% {
			translate: 0 -12%;
		}

		26% {
			translate: 0 -18%;
		}

		47% {
			translate: 0 -26%;
		}

		62%,
		100% {
			opacity: 0;
			translate: 0 0;
		}
	}

	@keyframes appear-late {
		0%,
		57% {
			opacity: 0;
		}

		60%,
		100% {
			opacity: 100%;
		}
	}

	@keyframes lift-late {
		0%,
		57% {
			opacity: 0;
			rotate: 0deg;
			translate: 0 0;
		}

		60% {
			opacity: 100%;
			rotate: 0deg;
			translate: 0 0;
		}

		85%,
		100% {
			opacity: 100%;
			rotate: -38deg;
			translate: -14% -18%;
		}
	}

	@keyframes emerge-late {
		0%,
		60% {
			opacity: 0;
			translate: 0 30%;
		}

		85% {
			opacity: 100%;
			translate: 0 -6%;
		}

		100% {
			opacity: 100%;
			translate: 0 0;
		}
	}

	@keyframes ajar {
		0% {
			rotate: 0deg;
			translate: 0 0;
		}

		15%,
		55% {
			rotate: -26deg;
			translate: 0 0;
		}

		62%,
		72% {
			rotate: 0deg;
			translate: 0 0;
		}

		88%,
		100% {
			rotate: -38deg;
			translate: -14% -18%;
		}
	}

	@keyframes peek {
		0% {
			translate: 0 30%;
		}

		15%,
		48% {
			translate: 0 4%;
		}

		25% {
			translate: -6% 4%;
		}

		38% {
			translate: 6% 4%;
		}

		60%,
		72% {
			translate: 0 30%;
		}

		85% {
			translate: 0 -8%;
		}

		100% {
			translate: 0 0;
		}
	}
</style>
