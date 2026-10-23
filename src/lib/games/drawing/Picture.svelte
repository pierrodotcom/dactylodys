<!-- The picture of the game on the lesson screen: a taped sheet with a finished drawing, and the magic pencil. -->
<script lang="ts">
	import DrawingArt from './DrawingArt.svelte';
	import Figure from './Figure.svelte';
	import { PENCIL } from './scenery';
	import { DRAWINGS } from './shapes';

	/** The sheet leans a little; the 200 x 200 box of the drawing sits on it. */
	const SHEET_PLACE = 'rotate(-4 50 50)';
	const PICTURE_PLACE = 'translate(11 11) scale(0.39)';
	const TAPE_PLACE = 'translate(48 6) rotate(3)';
	const PENCIL_PLACE = 'translate(70 95) rotate(-52) scale(0.3)';
</script>

<svg viewBox="0 0 100 100" focusable="false" aria-hidden="true">
	<g transform={SHEET_PLACE}>
		<rect class="shadow" x="9" y="7" width="82" height="88" rx="3" />
		<rect class="paper" x="7" y="5" width="82" height="88" rx="3" />
		<g transform={PICTURE_PLACE}>
			<DrawingArt picture={DRAWINGS[0]} share={1} colored={true} still={true} />
		</g>
		<path class="tape" d="M-11 -3.5L11 -3.5L11 3.5L-11 3.5Z" transform={TAPE_PLACE} />
	</g>
	<g transform={PENCIL_PLACE}><Figure figure={PENCIL} /></g>
</svg>

<style>
	svg {
		display: block;
		inline-size: 100%;
		block-size: 100%;
	}

	.paper {
		fill: var(--dd-color-drawing-paper);
		stroke: var(--dd-color-border-strong);
		stroke-width: var(--dd-border-width-thin);
	}

	.shadow {
		fill: var(--dd-color-drawing-shade);
		fill-opacity: var(--dd-opacity-drawing-shade);
	}

	.tape {
		fill: var(--dd-color-drawing-tape);
		fill-opacity: var(--dd-opacity-drawing-tape);
	}
</style>
