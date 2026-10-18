<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { m } from '$lib/paraglide/messages.js';
	import type { GameProps } from '../types';
	import Bubble from '../shared/Bubble.svelte';
	import GameShell from '../shared/GameShell.svelte';
	import { isRewarded, pickCyclic, type GameView } from '../shared/game-view';
	import AstreRow from './AstreRow.svelte';
	import { greetingPlace, isLastLeg } from './flight';
	import RocketScene from './RocketScene.svelte';
	import { GREETINGS } from './texts';

	const props: GameProps = $props();

	let frameWidth = $state(0);
	let frameHeight = $state(0);
	let bubbleWidth = $state(0);
	let bubbleHeight = $state(0);

	/** The place comes from the measured frame: the style sheet reads it in two custom properties. */
	function placeAt(place: { x: number; y: number }): Attachment<HTMLElement> {
		return (node) => {
			node.style.setProperty('--dd-greeting-x', `${place.x}px`);
			node.style.setProperty('--dd-greeting-y', `${place.y}px`);
		};
	}

	function greetingFor(view: GameView): string {
		return pickCyclic(GREETINGS, view.groupIndex)?.() ?? '';
	}

	function announce(view: GameView): string {
		if (!isRewarded(view)) return '';
		return isLastLeg(view)
			? m.game_rocket_announce_landed()
			: m.game_rocket_announce_arrived({ greeting: greetingFor(view) });
	}
</script>

<GameShell
	{...props}
	title={m.game_rocket_title()}
	pauseText={m.game_rocket_pause_text()}
	arrangement="stacked"
	{progress}
	{scene}
	{announce}
/>

{#snippet progress(view: GameView)}
	<AstreRow
		total={view.total}
		reached={view.completed}
		current={isRewarded(view) ? -1 : view.groupIndex}
	/>
{/snippet}

{#snippet scene(view: GameView)}
	{@const place = greetingPlace(
		{ width: frameWidth, height: frameHeight },
		{ width: bubbleWidth, height: bubbleHeight },
		isRewarded(view) && isLastLeg(view)
	)}
	<div class="voyage" bind:clientWidth={frameWidth} bind:clientHeight={frameHeight}>
		<!-- Next to the inhabitant who speaks, wherever the scene is drawn in its frame. -->
		<div
			class="bubble-spot"
			bind:offsetWidth={bubbleWidth}
			bind:offsetHeight={bubbleHeight}
			{@attach placeAt(place)}
		>
			{#if isRewarded(view)}
				<Bubble still={view.reducedMotion} compact>{greetingFor(view)}</Bubble>
			{/if}
		</div>
		<RocketScene {view} />
	</div>
{/snippet}

<style>
	.voyage {
		position: relative;
		display: grid;
		grid-template-rows: minmax(0, 1fr);
		inline-size: 100%;
		block-size: 100%;
	}

	/* Its padding keeps the bubble off the inhabitant and off the edges of the frame. */
	/* Measured from the top left corner, like the drawing. */
	.bubble-spot {
		position: absolute;
		top: 0;
		left: 0;
		translate: var(--dd-greeting-x) var(--dd-greeting-y);
		z-index: var(--dd-z-index-raised);
		padding: var(--dd-space-sm);
		white-space: nowrap;
	}
</style>
