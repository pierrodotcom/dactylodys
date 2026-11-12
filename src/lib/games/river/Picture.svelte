<!-- The picture of the game on the lesson screen: a paper boat and a duck float on a quiet river. -->
<script lang="ts">
	import ObjectArt from './ObjectArt.svelte';
	import { OBJECT_ARTS, RIPPLE } from './shapes';

	const WATER =
		'M8 70C40 62 88 62 120 70Q128 72 128 80V108Q128 118 118 120C88 126 40 126 10 120Q0 118 0 108V80Q0 72 8 70Z';
	const WAVES = 'M12 110h16M58 116h20M106 80h12';
	const [, boat, duck] = OBJECT_ARTS;
</script>

<svg class="picture" viewBox="0 0 128 128" focusable="false" aria-hidden="true">
	<path class="water" d={WATER} />
	<path class="line" d={WATER} />
	<path class="wave" d={WAVES} />
	{#if boat}
		<g transform="translate(44 78) scale(1.5)">
			<path class="wave" d={RIPPLE} />
			<ObjectArt art={boat} />
		</g>
	{/if}
	{#if duck}
		<g transform="translate(96 100) scale(1.25)">
			<path class="wave" d={RIPPLE} />
			<ObjectArt art={duck} />
		</g>
	{/if}
</svg>

<style>
	.picture {
		display: block;
		inline-size: 100%;
		block-size: 100%;
		overflow: visible;
	}

	path {
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.water {
		fill: var(--dd-color-river-water);
	}

	.line {
		fill: transparent;
		stroke: var(--dd-color-river-line);
		stroke-width: var(--dd-border-width-thick);
	}

	.wave {
		fill: transparent;
		stroke: var(--dd-color-river-ripple);
		stroke-width: var(--dd-border-width-thick);
		stroke-opacity: var(--dd-opacity-river-ripple);
	}
</style>
