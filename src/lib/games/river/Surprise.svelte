<svelte:options namespace="svg" />

<!--
	The surprise scenes of the river (ADR-034): something happens on the water a moment after the
	object is caught, then goes away. Never with calm motion: the game then gives no scene.
-->
<script lang="ts">
	import { dotPath, ovalShape } from '../shared/decor-art';
	import { DOCK } from './river';

	interface Props {
		sceneId: string;
	}

	let { sceneId }: Props = $props();

	const WATER_Y = DOCK.y + 12;
	const DROPS = [-2, -1, 0, 1, 2].map((step) => ({
		step,
		d: ovalShape(DOCK.x + step * 9, WATER_Y - 8, 3, 4.5)
	}));
	const RING = ovalShape(DOCK.x, WATER_Y, 30, 6);
	const FISH = 'M-16 0C-10 -9 6 -10 12 0C6 10 -10 9 -16 0ZM12 0L22 -8L20 0L22 8Z';
	const FISH_EYE = dotPath(-8, -2, 1.6);
	const BUBBLES = [-34, 0, 30].map((dx, index) => ({
		index,
		d: dotPath(DOCK.x + dx, WATER_Y + 14, 5 + index)
	}));
	const FROG = {
		body: ovalShape(0, 0, 14, 10),
		belly: ovalShape(0, 3, 8, 5),
		eyes: dotPath(-7, -9, 4.4) + dotPath(7, -9, 4.4),
		pupils: dotPath(-7, -9, 1.6) + dotPath(7, -9, 1.6),
		smile: 'M-5 1Q0 5 5 1',
		legs: 'M-13 6Q-20 10 -16 12M13 6Q20 10 16 12'
	};
	const ARCS = [
		{ band: 'a', r: 118 },
		{ band: 'b', r: 110 },
		{ band: 'c', r: 102 },
		{ band: 'd', r: 94 }
	].map(
		(arc) =>
			({
				band: arc.band,
				d: `M${DOCK.x - arc.r} ${WATER_Y - 6}A${arc.r} ${arc.r} 0 0 1 ${DOCK.x + arc.r} ${WATER_Y - 6}`
			}) as const
	);
	const DRAGONFLY = {
		body: 'M-14 0H12',
		head: dotPath(14, 0, 3),
		wings: ovalShape(-2, -7, 9, 3.6) + ovalShape(-2, 7, 9, 3.6)
	};
</script>

<g class="surprise" data-scene={sceneId}>
	{#if sceneId === 'splash'}
		<path class="foam ring" d={RING} />
		{#each DROPS as drop (drop.step)}
			<path class="water-drop" data-step={drop.step} d={drop.d} />
		{/each}
	{:else if sceneId === 'fish-leap'}
		<g transform="translate(150 {WATER_Y})">
			<g class="fish">
				<path class="fish-body" d={FISH} />
				<path class="line" d={FISH} />
				<path class="dot" d={FISH_EYE} />
			</g>
		</g>
	{:else if sceneId === 'bubbles'}
		{#each BUBBLES as bubble (bubble.index)}
			<path class="air" data-index={bubble.index} d={bubble.d} />
		{/each}
	{:else if sceneId === 'frog-hop'}
		<g transform="translate(86 222)">
			<g class="frog">
				<path class="frog-skin" d={FROG.legs} />
				<path class="frog-skin" d={FROG.body} />
				<path class="line" d={FROG.body} />
				<path class="frog-belly" d={FROG.belly} />
				<path class="frog-skin" d={FROG.eyes} />
				<path class="line" d={FROG.eyes} />
				<path class="dot" d={FROG.pupils} />
				<path class="line" d={FROG.smile} />
				<path class="line" d={FROG.legs} />
			</g>
		</g>
	{:else if sceneId === 'rainbow'}
		<g class="rainbow">
			{#each ARCS as arc (arc.band)}
				<path class="arc" data-band={arc.band} d={arc.d} />
			{/each}
		</g>
	{:else if sceneId === 'dragonfly'}
		<g transform="translate(70 70)">
			<g class="dragonfly">
				<path class="wing" d={DRAGONFLY.wings} />
				<path class="fine" d={DRAGONFLY.wings} />
				<path class="dragonfly-body" d={DRAGONFLY.body} />
				<path class="dragonfly-head" d={DRAGONFLY.head} />
			</g>
		</g>
	{/if}
</g>

<style>
	path {
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.surprise :is(.ring, .water-drop, .fish, .air, .frog, .rainbow, .dragonfly) {
		transform-box: fill-box;
		transform-origin: 50% 50%;
		animation-duration: var(--dd-duration-scene);
		animation-delay: var(--dd-duration-reward-delay);
		animation-timing-function: var(--dd-easing-standard);
		animation-fill-mode: both;
	}

	.line,
	.fine {
		fill: transparent;
		stroke: var(--dd-color-river-line);
		stroke-width: var(--dd-border-width-thick);
	}

	.fine {
		stroke-width: var(--dd-border-width-thin);
	}

	.dot {
		fill: var(--dd-color-river-line);
	}

	.foam {
		fill: transparent;
		stroke: var(--dd-color-river-foam);
		stroke-width: var(--dd-border-width-target);
	}

	.water-drop {
		fill: var(--dd-color-river-foam);
		stroke: var(--dd-color-river-line);
		stroke-width: var(--dd-border-width-thin);
	}

	.fish-body {
		fill: var(--dd-color-river-fish);
	}

	.air {
		fill: transparent;
		stroke: var(--dd-color-river-foam);
		stroke-width: var(--dd-border-width-thick);
	}

	.frog-skin {
		fill: var(--dd-color-river-frog);
	}

	.frog-belly {
		fill: var(--dd-color-river-frog-belly);
	}

	.arc {
		fill: transparent;
		stroke-width: var(--dd-border-width-drawing-bold);
		stroke-linecap: butt;
	}

	.arc[data-band='a'] {
		stroke: var(--dd-color-river-rainbow-a);
	}

	.arc[data-band='b'] {
		stroke: var(--dd-color-river-rainbow-b);
	}

	.arc[data-band='c'] {
		stroke: var(--dd-color-river-rainbow-c);
	}

	.arc[data-band='d'] {
		stroke: var(--dd-color-river-rainbow-d);
	}

	.wing {
		fill: var(--dd-color-river-wing);
	}

	.dragonfly-body {
		fill: transparent;
		stroke: var(--dd-color-river-dragonfly);
		stroke-width: var(--dd-border-width-target);
	}

	.dragonfly-head {
		fill: var(--dd-color-river-dragonfly);
	}

	[data-scene='splash'] .ring {
		animation-name: ring;
	}

	[data-scene='splash'] .water-drop {
		animation-name: drop-middle;
	}

	[data-scene='splash'] .water-drop[data-step='-2'],
	[data-scene='splash'] .water-drop[data-step='-1'] {
		animation-name: drop-left;
	}

	[data-scene='splash'] .water-drop[data-step='1'],
	[data-scene='splash'] .water-drop[data-step='2'] {
		animation-name: drop-right;
	}

	[data-scene='fish-leap'] .fish {
		animation-name: leap;
	}

	[data-scene='bubbles'] .air {
		animation-name: rise;
	}

	[data-scene='bubbles'] .air[data-index='1'] {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-base));
	}

	[data-scene='bubbles'] .air[data-index='2'] {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-slow));
	}

	[data-scene='frog-hop'] .frog {
		transform-origin: 50% 100%;
		animation-name: hop;
	}

	[data-scene='rainbow'] .rainbow {
		transform-origin: 50% 100%;
		animation-name: arch;
	}

	[data-scene='dragonfly'] .dragonfly {
		animation-name: fly;
	}

	@keyframes ring {
		0% {
			opacity: 100%;
			scale: 0.3;
		}

		100% {
			opacity: 0;
			scale: 1.6;
		}
	}

	@keyframes drop-middle {
		0% {
			opacity: 0;
			translate: 0 0;
		}

		15% {
			opacity: 100%;
		}

		45% {
			translate: 0 -500%;
		}

		100% {
			opacity: 0;
			translate: 0 0;
		}
	}

	@keyframes drop-left {
		0% {
			opacity: 0;
			translate: 0 0;
		}

		15% {
			opacity: 100%;
		}

		45% {
			translate: -300% -360%;
		}

		100% {
			opacity: 0;
			translate: -500% 0;
		}
	}

	@keyframes drop-right {
		0% {
			opacity: 0;
			translate: 0 0;
		}

		15% {
			opacity: 100%;
		}

		45% {
			translate: 300% -360%;
		}

		100% {
			opacity: 0;
			translate: 500% 0;
		}
	}

	/* From the water on the left, over the objects, back into the water on the right. */
	@keyframes leap {
		0% {
			opacity: 0;
			translate: 0 0;
			rotate: -30deg;
		}

		10% {
			opacity: 100%;
		}

		50% {
			translate: 300% -380%;
			rotate: 0deg;
		}

		90% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: 600% 0;
			rotate: 30deg;
		}
	}

	@keyframes rise {
		0% {
			opacity: 0;
			translate: 0 0;
		}

		20% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: 0 -600%;
		}
	}

	@keyframes hop {
		0% {
			opacity: 0;
			scale: 0.4;
			translate: 0 0;
		}

		15% {
			opacity: 100%;
			scale: 1;
			translate: 0 0;
		}

		30% {
			translate: 60% -90%;
		}

		45% {
			translate: 120% 0;
		}

		60% {
			translate: 180% -90%;
		}

		75% {
			translate: 240% 0;
		}

		90% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: 240% 0;
		}
	}

	@keyframes arch {
		0% {
			opacity: 0;
			scale: 0.8;
		}

		25%,
		75% {
			opacity: 100%;
			scale: 1;
		}

		100% {
			opacity: 0;
			scale: 1;
		}
	}

	@keyframes fly {
		0% {
			opacity: 0;
			translate: 0 0;
		}

		10% {
			opacity: 100%;
		}

		40% {
			translate: 450% 60%;
		}

		55% {
			translate: 550% -40%;
		}

		70% {
			translate: 600% 40%;
		}

		90% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: 1100% 0;
		}
	}
</style>
