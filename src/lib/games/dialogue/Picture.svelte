<!-- The picture of the game on the lesson screen: Floup asks something, a question mark in its bubble. -->
<script lang="ts">
	import HostFigure from './HostFigure.svelte';

	const BUBBLE =
		'M70 2H112Q120 2 120 10V34Q120 42 112 42H96L86 52L88 42H70Q62 42 62 34V10Q62 2 70 2Z';
	const MARK = 'M84 16C84 9 98 9 98 16C98 21 91 22 91 28';
</script>

<svg class="picture" viewBox="-4 -4 128 128" focusable="false" aria-hidden="true">
	<g transform="translate(-6 10) scale(0.92)">
		<HostFigure face="asking" still />
	</g>
	<path class="speech" d={BUBBLE} />
	<path class="mark" d={MARK} />
	<circle class="mark-dot" cx="91" cy="34" r="2.6" />
</svg>

<style>
	.picture {
		display: block;
		inline-size: 100%;
		block-size: 100%;
		overflow: visible;
	}

	.speech {
		fill: var(--dd-color-bubble-surface);
		stroke: var(--dd-color-bubble-border);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	.mark {
		fill: transparent;
		stroke: var(--dd-color-dialogue-host-question);
		stroke-width: var(--dd-border-width-target);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.mark-dot {
		fill: var(--dd-color-dialogue-host-question);
	}
</style>
