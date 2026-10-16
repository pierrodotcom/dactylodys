<!-- The picture of the game on the lesson screen: a sheet with a finished, coloured drawing. -->
<script lang="ts">
	import DrawingArt from './DrawingArt.svelte';
	import { DRAWINGS } from './shapes';

	/** Place of the 200 x 200 box of the drawing on the sheet. */
	const PLACE = 'translate(9 9) scale(0.41)';
</script>

<svg viewBox="0 0 100 100" focusable="false" aria-hidden="true">
	<rect class="paper" x="3" y="3" width="94" height="94" rx="10" />
	<g transform={PLACE}>
		<DrawingArt picture={DRAWINGS[0]} share={1} colored={true} still={true} />
	</g>
</svg>

<style>
	svg {
		display: block;
		inline-size: 100%;
		block-size: 100%;
	}

	.paper {
		fill: var(--dd-color-surface-raised);
		stroke: var(--dd-color-border-strong);
		stroke-width: var(--dd-border-width-thick);
	}
</style>
