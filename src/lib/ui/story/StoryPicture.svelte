<script lang="ts">
	import type { Component } from 'svelte';
	import { STORY_ART_HEIGHT, STORY_ART_WIDTH, storyArtGroup, type StoryArtGroup } from './art-ids';
	import CircuitArt from './art/CircuitArt.svelte';
	import DinosaursArt from './art/DinosaursArt.svelte';
	import KitchenArt from './art/KitchenArt.svelte';
	import SpaceArt from './art/SpaceArt.svelte';
	import ZooArt from './art/ZooArt.svelte';

	interface Props {
		/** `StoryMoment.art`. */
		art: string;
		/** `small`: a page of the notebook among others ("the story so far"). */
		size?: 'large' | 'small';
	}

	const DRAWINGS: Readonly<Record<StoryArtGroup, Component<{ art: string }>>> = {
		dinosaurs: DinosaursArt,
		kitchen: KitchenArt,
		zoo: ZooArt,
		space: SpaceArt,
		circuit: CircuitArt
	};
	const CORNER = 6;

	let { art, size = 'large' }: Props = $props();

	const uid = $props.id();
	const clipId = `story-page-${uid}`;
	const group = $derived(storyArtGroup(art));
	const Drawing = $derived(group === undefined ? undefined : DRAWINGS[group]);
</script>

<!-- Decorative: the text of the story is always written next to its picture. -->
<svg
	class="story-picture"
	data-size={size}
	viewBox="0 0 {STORY_ART_WIDTH} {STORY_ART_HEIGHT}"
	focusable="false"
	aria-hidden="true"
>
	<defs>
		<clipPath id={clipId}>
			<rect width={STORY_ART_WIDTH} height={STORY_ART_HEIGHT} rx={CORNER} />
		</clipPath>
	</defs>
	<g clip-path="url(#{clipId})">
		<rect class="paper" width={STORY_ART_WIDTH} height={STORY_ART_HEIGHT} />
		{#if Drawing}
			<Drawing {art} />
		{/if}
	</g>
	<rect class="edge" width={STORY_ART_WIDTH} height={STORY_ART_HEIGHT} rx={CORNER} />
</svg>

<style>
	.story-picture {
		display: block;
		inline-size: 100%;
		max-inline-size: var(--dd-size-story-picture);
		block-size: auto;
		overflow: visible;
	}

	.story-picture[data-size='small'] {
		max-inline-size: var(--dd-size-story-picture-small);
	}

	.paper {
		fill: var(--dd-color-story-paper);
	}

	.edge {
		fill: none;
		stroke: var(--dd-color-story-line);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}
</style>
