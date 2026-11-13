<script lang="ts">
	/*
	 * One object set down in the hideout, drawn around the point of its place at (0, 0): from a
	 * hook (it hangs below) or on a surface (it stands above). The object is the drawing of the
	 * companion's item or of the trophy, with what holds it in the cabin and the shadow it casts.
	 * Units are those of its drawing: the cabin scales it to its place.
	 */
	import CompanionItem from '$lib/ui/companion/CompanionItem.svelte';
	import { ITEM_ARTS, ITEM_LAYERS } from '$lib/ui/companion/items';
	import TrophyArt from '$lib/ui/companion/TrophyArt.svelte';
	import { anchorOffset, extentOf, placePoint, type DecorationArt } from './decorations';

	interface Props {
		artId: string;
		art: DecorationArt;
		/** For a trophy of keys: the keys written on its keycaps (`trophyKeys`). */
		keys?: readonly string[];
	}

	let { artId, art, keys = [] }: Props = $props();

	const layers = $derived(ITEM_ARTS[artId]?.pictureLayers ?? ITEM_LAYERS);
	const placed = $derived.by(() => {
		const [dx, dy] = anchorOffset(art);
		const [ax, ay] = art.anchor;
		return `translate(${dx - ax} ${dy - ay}) rotate(${art.turn ?? 0})`;
	});
	const ties = $derived((art.ties ?? []).map((tie) => placePoint(art, tie)));
	const ground = $derived.by(() => {
		const [left, , width] = extentOf(art);
		return { cx: left + width / 2, rx: width * 0.42 };
	});
</script>

{#snippet drawing()}
	{#if art.source === 'item'}
		{#each layers as layer (layer)}
			<CompanionItem {artId} {layer} alone />
		{/each}
	{:else}
		<TrophyArt {artId} {keys} />
	{/if}
{/snippet}

<g class="decoration" data-decoration={artId} data-holder={art.holder}>
	{#if art.mount === 'hang'}
		<!-- Its shadow on the wall: the same drawing as one flat shape, a little lower. -->
		<g class="wall-cast" transform="translate(2.5 3.5)" data-silhouette="">
			<g transform={placed}>{@render drawing()}</g>
		</g>
	{:else}
		<ellipse class="ground-cast" cx={ground.cx} cy="0" rx={ground.rx} ry="3" />
	{/if}

	{#if art.holder === 'cord'}
		{#each ties as [x, y], index (index)}
			<path class="cord" d="M0 0L{x} {y}" />
		{/each}
	{:else if art.holder === 'hanger'}
		<path class="iron-line" d="M-2.2 9V4.5C-2.2 -1.2 3.4 -1.4 3.4 2.6" />
		<path
			class="wood"
			d="M-33 20.5Q-32 17 -28 15.5L-3 8.5Q0 7.6 3 8.5L28 15.5Q32 17 33 20.5Q30 19 27 19.2L0 12.2L-27 19.2Q-30 19 -33 20.5Z"
		/>
		<path class="light" d="M-26 15.6L-3 9.4Q0 8.7 3 9.4L26 15.6L25 16.4L0 10L-25 16.4Z" />
	{:else if art.holder === 'saucer'}
		<ellipse class="saucer" cx="0" cy="-2" rx="23" ry="5" />
		<ellipse class="saucer-well" cx="0" cy="-3.2" rx="14" ry="2.6" />
		<path class="light" d="M-19 -4.6Q-10 -6.8 0 -7Q-11 -5.6 -17 -3.2Z" />
	{:else if art.holder === 'book'}
		<path
			class="book-cover"
			d="M-27 -9.5H25Q28 -9.5 28 -6.5V-1Q28 0 26.5 0H-27Q-28.5 0 -28.5 -1.5V-8Q-28.5 -9.5 -27 -9.5Z"
		/>
		<path class="pages" d="M-25 -7.8H25.6V-1.8H-25Z" />
		<path class="page-lines" d="M-23 -5.8H24M-23 -3.8H24" />
		<path class="book-band" d="M14 -9.5H18V0H14Z" />
	{:else if art.holder === 'cushion'}
		<path
			class="cushion"
			d="M-26 0C-30 -4 -28 -11 -21 -12C-9 -14.5 9 -14.5 21 -12C28 -11 30 -4 26 0C12 2.4 -12 2.4 -26 0Z"
		/>
		<path
			class="cast"
			d="M-24 -1.2C-10 1 10 1 24 -1.2C25.6 -3 26.2 -5 25.8 -6.4C12 -3.4 -12 -3.4 -25.8 -6.4C-26.2 -5 -25.6 -3 -24 -1.2Z"
		/>
		<path class="light" d="M-19 -11Q0 -13.6 16 -11.4Q0 -12 -17 -9.6Z" />
		{#each [-27, 27] as x (x)}
			<path class="tassel" d="M{x} -3l{x < 0 ? -3 : 3} 4l{x < 0 ? 2 : -2} 1Z" />
		{/each}
	{:else if art.holder === 'weight'}
		<path class="weight" d="M-8 0C-10 -3 -9 -6 -5 -7L-2.4 -8.6H2.4L5 -7C9 -6 10 -3 8 0Z" />
		<path class="cord" d="M-2.8 -7.4H2.8" />
	{:else if art.holder === 'jar'}
		<ellipse class="jar-inside" cx="0" cy="-22" rx="10.5" ry="3" />
	{/if}

	<g transform={placed}>{@render drawing()}</g>

	{#if art.holder === 'jar'}
		<path
			class="jar"
			d="M-10.5 -22Q-12.6 -14 -12 -6Q-11.4 0 0 0Q11.4 0 12 -6Q12.6 -14 10.5 -22Q0 -18.6 -10.5 -22Z"
		/>
		<path class="jar-band" d="M-12.2 -12Q0 -9.2 12.2 -12L12.1 -8.6Q0 -5.8 -12.1 -8.6Z" />
		<path class="light" d="M-8.6 -18Q-10 -10 -8 -4Q-9.4 -10 -7.4 -18Z" />
	{/if}
</g>

<style>
	.decoration path,
	.decoration ellipse {
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.wall-cast {
		--dd-color-silhouette: var(--dd-color-hideout-shade);

		opacity: var(--dd-opacity-hideout-cast);
	}

	.ground-cast,
	.cast {
		fill: var(--dd-color-hideout-shade);
		opacity: var(--dd-opacity-hideout-cast);
	}

	.light {
		fill: var(--dd-color-hideout-light);
		opacity: var(--dd-opacity-hideout-light);
	}

	.cord {
		fill: transparent;
		stroke: var(--dd-color-hideout-cord);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.iron-line {
		fill: transparent;
		stroke: var(--dd-color-hideout-iron);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.wood,
	.saucer,
	.book-cover,
	.pages,
	.cushion,
	.tassel,
	.weight,
	.jar {
		stroke: var(--dd-color-hideout-ink);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}

	.wood {
		fill: var(--dd-color-hideout-furniture);
	}

	.saucer {
		fill: var(--dd-color-hideout-saucer);
	}

	.saucer-well {
		fill: var(--dd-color-hideout-saucer-rim);
		opacity: var(--dd-opacity-hideout-light);
	}

	.book-cover {
		fill: var(--dd-color-hideout-book-b);
	}

	.pages {
		fill: var(--dd-color-hideout-pages);
		stroke-width: var(--dd-border-width-thin);
	}

	.page-lines {
		fill: transparent;
		stroke: var(--dd-color-hideout-wall-grain);
		stroke-width: var(--dd-border-width-thin);
		vector-effect: non-scaling-stroke;
	}

	.book-band {
		fill: var(--dd-color-hideout-book-c);
	}

	.cushion {
		fill: var(--dd-color-hideout-cushion);
	}

	.tassel {
		fill: var(--dd-color-hideout-book-c);
		stroke-width: var(--dd-border-width-thin);
	}

	.weight {
		fill: var(--dd-color-hideout-floor-light);
	}

	.jar {
		fill: var(--dd-color-hideout-jar);
	}

	.jar-inside {
		fill: var(--dd-color-hideout-ink);
	}

	.jar-band {
		fill: var(--dd-color-hideout-paper);
		opacity: var(--dd-opacity-hideout-light);
	}
</style>
