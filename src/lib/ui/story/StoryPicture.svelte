<script lang="ts">
	import { onMount, type Component } from 'svelte';
	import { STORY_ART_HEIGHT, STORY_ART_WIDTH, storyArtGroup, type StoryArtGroup } from './art-ids';
	import { isMotionReduced, storyPhases, type StoryPhase, type StoryPictureSize } from './phase';
	import CircuitArt from './art/CircuitArt.svelte';
	import DinosaursArt from './art/DinosaursArt.svelte';
	import KitchenArt from './art/KitchenArt.svelte';
	import SpaceArt from './art/SpaceArt.svelte';
	import ZooArt from './art/ZooArt.svelte';

	interface Props {
		/** `StoryMoment.art`. */
		art: string;
		/** `small`: a page of the notebook among others ("the story so far"). */
		size?: StoryPictureSize;
		/** One state only, still: the trial page shows both side by side. */
		phase?: StoryPhase;
	}

	const DRAWINGS: Readonly<Record<StoryArtGroup, Component<{ art: string; phase: StoryPhase }>>> = {
		dinosaurs: DinosaursArt,
		kitchen: KitchenArt,
		zoo: ZooArt,
		space: SpaceArt,
		circuit: CircuitArt
	};
	const CORNER = 6;

	let { art, size = 'large', phase }: Props = $props();

	// Read once mounted, as prerendered pages know nothing of it. In calm motion the style sheet
	// already shows `after` at once (app.css); this only spares drawing `before` under it.
	let still = $state(false);
	onMount(() => {
		still = isMotionReduced(
			document.documentElement,
			matchMedia('(prefers-reduced-motion: reduce)').matches
		);
	});

	const uid = $props.id();
	const clipId = `story-page-${uid}`;
	const group = $derived(storyArtGroup(art));
	const Drawing = $derived(group === undefined ? undefined : DRAWINGS[group]);
	const phases = $derived(phase === undefined ? storyPhases(size, still) : [phase]);
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
		<!-- Keyed by the picture too: another picture in the same place fades again. `after` covers
			`before` with its own paper as it fades in, so what stays is never dimmed. -->
		{#each phases as shown (`${art}-${shown}`)}
			<g
				class="state"
				data-story-phase={shown}
				data-story-change={(shown === 'after' && phases.length > 1) || undefined}
			>
				<rect class="paper" width={STORY_ART_WIDTH} height={STORY_ART_HEIGHT} />
				{#if Drawing}
					<Drawing {art} phase={shown} />
				{/if}
			</g>
		{/each}
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

	/* Not a light effect (no data-effect): the change of picture tells the story. */
	.state[data-story-change] {
		animation-name: story-change;
		animation-duration: var(--dd-duration-story-change);
		animation-delay: var(--dd-duration-story-change-delay);
		animation-timing-function: var(--dd-easing-standard);
		animation-fill-mode: both;
	}

	@keyframes story-change {
		0% {
			opacity: 0;
		}

		100% {
			opacity: 100%;
		}
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
