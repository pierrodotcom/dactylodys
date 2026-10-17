<script lang="ts">
	import StoryDino from '../StoryDino.svelte';

	interface Props {
		/** One of `STORY_ART_GROUPS.circuit`. */
		art: string;
	}

	let { art }: Props = $props();
</script>

<!-- Placeholder until the pictures are drawn: one group per picture, named by `data-story-art`. -->
<g data-story-art={art}>
	<rect class="sky" x="0" y="0" width="160" height="70" />
	<rect class="ground" x="0" y="70" width="160" height="30" />
	<StoryDino x={56} y={30} size={48} />
</g>

<style>
	.sky {
		fill: var(--dd-color-story-sky);
	}

	.ground {
		fill: var(--dd-color-story-grass);
		stroke: var(--dd-color-story-line);
		stroke-width: var(--dd-border-width-thick);
		vector-effect: non-scaling-stroke;
	}
</style>
