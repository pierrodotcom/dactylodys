<script lang="ts">
	import IngredientShape from './IngredientShape.svelte';
	import Pot from './Pot.svelte';
	import { SPLASH } from './shapes';

	/** A tomato falls into the soup and makes it jump. */
	const FALLING = 'translate(262 106) rotate(-14) scale(1.2)';
	/** Each drop flies out of the soup in its direction, bigger than in the game to be seen. */
	const DROPS = [
		'rotate(-152 260 156) translate(50 0) translate(260 156) scale(1.6) translate(-260 -156)',
		'rotate(-28 260 156) translate(50 0) translate(260 156) scale(1.6) translate(-260 -156)'
	];
	const STEAM = ['M196 124C188 112 202 104 196 92', 'M328 124C320 112 334 104 328 92'];
</script>

<svg class="picture" viewBox="110 58 300 172" focusable="false" aria-hidden="true">
	<Pot layer="back" />
	<g transform={FALLING}>
		<IngredientShape variant={1} stage={0} />
	</g>
	<Pot layer="surface" />
	<Pot layer="front" />
	{#each DROPS as drop (drop)}
		<g transform={drop}>
			<path class="soup line" d={SPLASH.dropPath} />
			<path class="white" d={SPLASH.glintPath} />
		</g>
	{/each}
	{#each STEAM as wisp (wisp)}
		<path class="steam" d={wisp} />
		<path class="steam-core" d={wisp} />
	{/each}
</svg>

<style>
	.picture {
		display: block;
		inline-size: 100%;
		block-size: 100%;
		overflow: visible;
	}

	.line,
	.steam,
	.steam-core {
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.line {
		stroke: var(--dd-color-recipe-line);
		stroke-width: var(--dd-border-width-thick);
	}

	.soup {
		fill: var(--dd-color-recipe-soup);
	}

	.white {
		fill: var(--dd-color-recipe-cloth);
	}

	.steam,
	.steam-core {
		fill: transparent;
	}

	.steam {
		stroke: var(--dd-color-recipe-steam);
		stroke-width: calc(var(--dd-border-width-target) * 2);
		stroke-opacity: var(--dd-opacity-recipe-steam);
	}

	.steam-core {
		stroke: var(--dd-color-recipe-light);
		stroke-width: var(--dd-border-width-thick);
	}
</style>
