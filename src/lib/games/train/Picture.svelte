<!-- The picture of the game on the lesson screen: a locomotive and a wagon on the rail. -->
<script lang="ts">
	import LocoShape from './LocoShape.svelte';
	import { wagonLook } from './shapes';
	import { slotX } from './train';
	import WagonShape from './WagonShape.svelte';

	const look = wagonLook(0);
</script>

<svg class="picture" viewBox="-70 -110 190 122" focusable="false" aria-hidden="true">
	<rect class="rail" x="-70" y="0" width="190" height="5" />
	<LocoShape />
	<g transform="translate({slotX(0)} 0)">
		<WagonShape tone={look.tone} cargo={look.cargo} />
	</g>
</svg>

<style>
	.picture {
		display: block;
		inline-size: 100%;
		block-size: 100%;
		overflow: visible;
	}

	.rail {
		fill: var(--dd-color-border-strong);
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}
</style>
