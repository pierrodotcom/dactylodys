<script lang="ts">
	import IngredientShape from './IngredientShape.svelte';
	import { POT } from './shapes';

	/** Where the ingredient waits, above the pot. */
	const INGREDIENT = 'translate(260 88) scale(1.1)';
</script>

<svg class="picture" viewBox="100 30 320 210" focusable="false" aria-hidden="true">
	{#each POT.handlePaths as handle (handle)}
		<path class="handle" d={handle} />
	{/each}
	<ellipse class="inside" cx={POT.rim.cx} cy={POT.rim.cy} rx={POT.rim.rx} ry={POT.rim.ry} />
	<ellipse class="soup" cx={POT.soup.cx} cy={POT.soup.cy} rx={POT.soup.rx} ry={POT.soup.ry} />
	<path class="pot" d={POT.bodyPath} />
	<g transform={INGREDIENT}>
		<IngredientShape variant={0} stage={0} />
	</g>
</svg>

<style>
	.picture {
		display: block;
		inline-size: 100%;
		block-size: 100%;
		overflow: visible;
	}

	.handle,
	.inside,
	.soup,
	.pot {
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.handle {
		fill: transparent;
		stroke-width: var(--dd-border-width-target);
	}

	.inside {
		fill: var(--dd-color-pot-inside);
	}

	.soup {
		fill: var(--dd-color-pot-soup);
	}

	.pot {
		fill: var(--dd-color-pot-body);
	}
</style>
