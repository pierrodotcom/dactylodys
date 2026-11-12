<!--
	Floup asks, the companion answers: the question (then the reaction) in Floup's bubble, the
	answer typed so far in the companion's. The text to type stays in the text zone of the game.
-->
<script lang="ts">
	import Companion from '$lib/ui/components/Companion.svelte';
	import type { DecorOf } from '../shared/decor';
	import { isRewarded, type GameView } from '../shared/game-view';
	import Backdrop from './Backdrop.svelte';
	import HostFigure from './HostFigure.svelte';
	import { HOST_FRAME } from './shapes';
	import { answerSoFar, hostFace, questionOf, reactionOf } from './talk';
	import { QUESTIONS, REACTIONS } from './texts';

	interface Props {
		view: GameView;
		decor?: DecorOf<'dialogue'>;
	}

	let { view, decor = 'garden' }: Props = $props();

	const rewarded = $derived(isRewarded(view));
	const question = $derived(questionOf(QUESTIONS, view)?.() ?? '');
	const reaction = $derived(reactionOf(REACTIONS, view)?.line() ?? '');
	const face = $derived(hostFace(REACTIONS, view));
	const answer = $derived(answerSoFar(view));
	const sceneId = $derived(rewarded && view.scene.kind === 'scene' ? view.scene.id : undefined);
	const entrance = $derived(rewarded && view.scene.kind === 'variant' ? view.scene.index : null);
	/** Grows with every good key: the companion has said one more character. */
	const probe = $derived([...answer].length);
</script>

<div
	class="dialogue-scene"
	data-decor={decor}
	data-probe={probe}
	data-still={view.reducedMotion || undefined}
>
	<Backdrop {decor} />

	<div class="host-line">
		{#if rewarded}
			<p
				class="bubble speech"
				aria-hidden="true"
				data-reward
				data-reward-variant="0"
				data-still={view.reducedMotion || undefined}
			>
				{reaction}
				{@render tail('host')}
			</p>
		{:else}
			<p class="speech question">
				{question}
				{@render tail('host')}
			</p>
		{/if}
	</div>

	<div class="cast">
		<svg
			class="host"
			viewBox="0 0 {HOST_FRAME.width} {HOST_FRAME.height}"
			focusable="false"
			aria-hidden="true"
			data-scene={sceneId}
		>
			<HostFigure {face} {entrance} {sceneId} still={view.reducedMotion} />
		</svg>

		<p class="speech answer" aria-hidden="true" data-said={answer === '' ? undefined : true}>
			{#if answer === ''}
				<span class="dots"><span></span><span></span><span></span></span>
			{:else}
				<span class="said">{answer}</span>
			{/if}
			{@render tail('companion')}
		</p>

		<div class="companion">
			<Companion mood={view.mood} />
		</div>
	</div>
</div>

{#snippet tail(side: 'host' | 'companion')}
	<svg class="tail" data-side={side} viewBox="0 0 16 16" focusable="false" aria-hidden="true">
		<path class="tail-fill" d="M0 0L5 15L16 0Z" />
		<path class="tail-line" d="M0 0L5 15L16 0" />
	</svg>
{/snippet}

<style>
	.dialogue-scene {
		position: relative;
		display: grid;
		grid-template-rows: auto auto;
		align-content: space-between;
		gap: var(--dd-space-sm);
		inline-size: 100%;
		max-inline-size: var(--dd-size-scene-max);
		padding: var(--dd-space-md) var(--dd-space-md) var(--dd-space-xs);
		overflow: hidden;
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-dialogue-sky);
	}

	/* Two lines of room for the question, so that nothing below moves from one to the next. */
	.host-line {
		position: relative;
		display: grid;
		align-items: end;
		min-block-size: calc(
			var(--dd-font-size-base) * var(--dd-line-height-tight) * 2 + var(--dd-space-sm) * 2 +
				var(--dd-border-width-thick) * 2
		);
	}

	.speech {
		position: relative;
		margin: 0;
		padding: var(--dd-space-sm) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-bubble-border);
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-bubble-surface);
		color: var(--dd-color-bubble-text);
		font-size: var(--dd-font-size-base);
		font-weight: var(--dd-font-weight-bold);
		line-height: var(--dd-line-height-tight);
	}

	/* Short of the right edge: the sky of the decor shows beside it. */
	.host-line .speech {
		justify-self: start;
		max-inline-size: var(--dd-size-dialogue-question-max);
	}

	.cast {
		position: relative;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: end;
		gap: var(--dd-space-sm);
	}

	.host,
	.companion {
		inline-size: var(--dd-size-dialogue-character);
		block-size: var(--dd-size-dialogue-character);
		overflow: visible;
	}

	.companion {
		--dd-size-companion: var(--dd-size-dialogue-character);
	}

	.answer {
		align-self: center;
		justify-self: end;
		min-inline-size: var(--dd-size-touch-target-min);
		border-color: var(--dd-color-dialogue-answer-border);
		background-color: var(--dd-color-dialogue-answer-surface);
		color: var(--dd-color-dialogue-answer-text);
		overflow-wrap: anywhere;
	}

	.said {
		white-space: pre-wrap;
	}

	/* The companion is thinking: three still dots, never blinking. */
	.dots {
		display: inline-flex;
		gap: var(--dd-space-xs);
		align-items: center;
		block-size: calc(var(--dd-font-size-base) * var(--dd-line-height-tight));
	}

	.dots span {
		inline-size: var(--dd-space-sm);
		block-size: var(--dd-space-sm);
		border-radius: var(--dd-radius-pill);
		background-color: var(--dd-color-dialogue-answer-dot);
	}

	.tail {
		position: absolute;
		inline-size: var(--dd-size-bubble-tail);
		block-size: var(--dd-size-bubble-tail);
		overflow: visible;
	}

	/* Under Floup's bubble, pointing down to Floup. */
	.tail[data-side='host'] {
		inset-block-end: calc(var(--dd-size-bubble-tail) * -1 + var(--dd-border-width-thick));
		inset-inline-start: var(--dd-space-xl);
	}

	/* On the right of the answer, halfway down, pointing to the companion. */
	.tail[data-side='companion'] {
		inset-block: 0;
		inset-inline-end: calc(var(--dd-size-bubble-tail) * -1 + var(--dd-border-width-thick));
		margin-block: auto;
		rotate: -90deg;
	}

	.tail-fill {
		fill: var(--dd-color-bubble-surface);
	}

	.answer .tail-fill {
		fill: var(--dd-color-dialogue-answer-surface);
	}

	.tail-line {
		fill: transparent;
		stroke: var(--dd-color-bubble-border);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}

	/* Surprise scenes (ADR-034): Floup's joy, a moment after the last key. */
	[data-scene] :global(.figure),
	[data-scene] :global(.antenna),
	[data-scene] :global(.flower),
	[data-scene] :global(.heart) {
		transform-box: fill-box;
		transform-origin: 50% 100%;
		animation-duration: var(--dd-duration-scene);
		animation-delay: var(--dd-duration-reward-delay);
		animation-timing-function: var(--dd-easing-standard);
		animation-fill-mode: both;
	}

	[data-scene='bounce'] :global(.figure) {
		animation-name: bounce;
	}

	[data-scene='spin'] :global(.figure) {
		transform-origin: 50% 50%;
		animation-name: spin;
	}

	[data-scene='flip'] :global(.figure) {
		transform-origin: 50% 50%;
		animation-name: flip;
	}

	[data-scene='flower'] :global(.flower) {
		transform-origin: 50% 50%;
		animation-name: bloom;
	}

	[data-scene='antenna-whirl'] :global(.figure) {
		animation-name: hover;
	}

	/* The antenna turns around the top of the head, where it grows. */
	[data-scene='antenna-whirl'] :global(.antenna) {
		transform-box: view-box;
		transform-origin: 60px 31px;
		animation-name: whirl;
	}

	[data-scene='hearts'] :global(.heart) {
		transform-origin: 50% 50%;
		animation-name: rise;
	}

	[data-scene='hearts'] :global(.heart[data-index='1']) {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-base));
	}

	[data-scene='hearts'] :global(.heart[data-index='2']) {
		animation-delay: calc(var(--dd-duration-reward-delay) + var(--dd-duration-slow));
	}

	@keyframes bounce {
		0%,
		30%,
		60%,
		90%,
		100% {
			translate: 0 0;
		}

		15% {
			translate: 0 -16%;
		}

		45% {
			translate: 0 -10%;
		}

		75% {
			translate: 0 -5%;
		}
	}

	@keyframes spin {
		0% {
			rotate: 0deg;
		}

		80%,
		100% {
			rotate: 360deg;
		}
	}

	@keyframes flip {
		0% {
			translate: 0 0;
			rotate: 0deg;
		}

		40% {
			translate: 0 -30%;
		}

		70% {
			translate: 0 0;
			rotate: -360deg;
		}

		100% {
			translate: 0 0;
			rotate: -360deg;
		}
	}

	@keyframes bloom {
		0% {
			scale: 0;
		}

		30% {
			scale: 1.3;
		}

		45%,
		100% {
			scale: 1;
		}
	}

	@keyframes hover {
		0%,
		100% {
			translate: 0 0;
		}

		30%,
		70% {
			translate: 0 -14%;
		}
	}

	@keyframes whirl {
		0% {
			rotate: 0deg;
		}

		100% {
			rotate: 1080deg;
		}
	}

	@keyframes rise {
		0% {
			opacity: 0;
			translate: 0 40%;
		}

		25% {
			opacity: 100%;
		}

		100% {
			opacity: 0;
			translate: 0 -160%;
		}
	}
</style>
