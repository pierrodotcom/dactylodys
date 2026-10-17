<script lang="ts">
	import Companion from '$lib/ui/components/Companion.svelte';

	type Mood = 'idle' | 'happy' | 'oops' | 'cheer';

	interface Props {
		/** Top left corner of the companion's square, in the units of the story picture. */
		x: number;
		y: number;
		/** Side of the square; the companion's own drawing is 120 units wide. */
		size: number;
		mood?: Mood;
		/** Looks to the left instead of the right. */
		flip?: boolean;
	}

	let { x, y, size, mood = 'happy', flip = false }: Props = $props();
</script>

<!--
	The child's own companion, with its colour and the items it wears (`provideCompanionAppearance`),
	placed in a story picture. Its name never appears: the story is said by a recorded voice.
-->
<g
	class="story-dino"
	transform={flip ? `translate(${2 * x + size} 0) scale(-1 1)` : undefined}
	data-story-dino
>
	<svg {x} {y} width={size} height={size} viewBox="0 0 120 120" overflow="visible">
		<Companion {mood} />
	</svg>
</g>

<style>
	/* The companion sizes itself for a page; in a picture, it fills the square it is given. */
	.story-dino :global(.companion) {
		inline-size: 100%;
		block-size: 100%;
	}
</style>
