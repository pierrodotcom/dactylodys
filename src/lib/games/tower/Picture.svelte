<script lang="ts">
	import BlockShape from './BlockShape.svelte';
	import { starPoints } from './blocks';

	/** The blocks of the picture, from the bottom: size and place, all drawn with the game's own blocks. */
	const BLOCKS = [
		{ width: 70, height: 20, x: 50, look: { colour: 'a', mark: 'windows' } },
		{ width: 62, height: 20, x: 54, look: { colour: 'e', mark: 'studs' } },
		{ width: 56, height: 20, x: 49, look: { colour: 'b', mark: 'stripes' } },
		{ width: 48, height: 20, x: 52, look: { colour: 'd', mark: 'bar' } }
	] as const;
	const GROUND = 92;
	const BLOCK_HEIGHT = 20;
</script>

<svg viewBox="0 0 100 100" focusable="false" aria-hidden="true">
	<line class="ground" x1="6" x2="94" y1={GROUND} y2={GROUND} />
	{#each BLOCKS as block, index (index)}
		<g transform="translate({block.x} {GROUND - index * BLOCK_HEIGHT})">
			<BlockShape size={block} look={block.look} />
		</g>
	{/each}
	<g transform="translate(44 {GROUND - BLOCKS.length * BLOCK_HEIGHT})">
		<line class="pole" x1="0" x2="0" y1="0" y2="-12" />
		<polygon class="star" points={starPoints(6)} transform="translate(0 -15)" />
	</g>
</svg>

<style>
	.ground,
	.pole,
	.star {
		stroke: var(--dd-color-drawing-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.pole {
		stroke-width: var(--dd-border-width-target);
	}

	.star {
		fill: var(--dd-color-star-fill);
	}
</style>
