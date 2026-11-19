<script lang="ts">
	import { Tween } from 'svelte/motion';
	import {
		HAND_STROKES,
		fingerMoves,
		keyboardSize,
		restingHands,
		tipAt,
		type FingerMove,
		type FingerShape,
		type Point
	} from '$lib/keyboard/hands';
	import type { FingeringProfile, KeyboardGeometryDefinition, KeyPress } from '$lib/keyboard/types';
	import type { HandDrawing } from '$lib/state/types';
	import { readDurationToken, readEasingToken } from '../motion';
	import { handFill } from './hand-fill';

	interface Props {
		geometry: KeyboardGeometryDefinition;
		fingering: FingeringProfile;
		/** Key presses to show, one after the other; none: the hands only rest on the keyboard. */
		presses: readonly KeyPress[];
		/** The presses are shown again each time it changes. */
		trigger: string;
		/** How the hands rest, as the child chose (version 20): filled, or only their contour. */
		drawing: HandDrawing;
		/** Calm motion: the finger lights up where it rests, it does not move. */
		still: boolean;
		/** Shows the presses again and again, after a pause, for a child whose eyes wander. */
		repeat?: boolean;
	}

	const MOVE_TOKEN = '--dd-duration-guide-move';
	const HOLD_TOKEN = '--dd-duration-guide-hold';
	const EASING_TOKEN = '--dd-easing-standard';
	const PAUSE_TOKEN = '--dd-duration-guide-pause';
	const OUTLINE_WIDTH = HAND_STROKES.finger + HAND_STROKES.outline * 2;
	/** The inside reaches under the middle of the contour: no gap shows between the two. */
	const FILL_WIDTH = HAND_STROKES.finger + HAND_STROKES.outline;

	let { geometry, fingering, presses, trigger, drawing, still, repeat = false }: Props = $props();

	const uid = $props.id();
	const maskId = `hands-inside-${uid}`;
	const hands = $derived(restingHands(geometry, fingering));
	const fill = $derived(handFill(hands, drawing));
	const size = $derived(keyboardSize(geometry));
	let moves = $state.raw<readonly FingerMove[]>([]);
	const progress = new Tween(0);

	function sleep(ms: number, signal: AbortSignal): Promise<void> {
		return new Promise((resolve) => {
			const timer = setTimeout(resolve, ms);
			signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
		});
	}

	async function show(
		sequence: readonly (readonly FingerMove[])[],
		calm: boolean,
		again: boolean,
		signal: AbortSignal
	) {
		void progress.set(0, { duration: 0 });
		moves = [];
		if (sequence.length === 0) return;
		const duration = readDurationToken(MOVE_TOKEN);
		const hold = readDurationToken(HOLD_TOKEN);
		const easing = readEasingToken(EASING_TOKEN);
		do {
			await showOnce(sequence, calm, signal, { duration, hold, easing });
			if (!again || signal.aborted) return;
			moves = [];
			await sleep(readDurationToken(PAUSE_TOKEN), signal);
		} while (!signal.aborted);
	}

	async function showOnce(
		sequence: readonly (readonly FingerMove[])[],
		calm: boolean,
		signal: AbortSignal,
		timing: { duration: number; hold: number; easing: (time: number) => number }
	) {
		const { duration, hold, easing } = timing;
		for (const step of sequence) {
			if (signal.aborted) return;
			moves = step;
			if (calm) {
				await sleep(duration * 2 + hold, signal);
				continue;
			}
			await progress.set(1, { duration, easing });
			if (signal.aborted) return;
			await sleep(hold, signal);
			if (signal.aborted) return;
			await progress.set(0, { duration, easing });
		}
	}

	$effect(() => {
		void trigger;
		const sequence = presses
			.map((press) => fingerMoves(geometry, fingering, press))
			.filter((step) => step.length > 0);
		const controller = new AbortController();
		void show(sequence, still, repeat, controller.signal);
		return () => controller.abort();
	});

	function tipOf(shape: FingerShape): Point {
		const move = moves.find((candidate) => candidate.finger === shape.finger);
		return move === undefined ? shape.tip : tipAt(move, progress.current);
	}

	function isActive(shape: FingerShape): boolean {
		return moves.some((move) => move.finger === shape.finger);
	}

	function pointsOf(points: readonly Point[]): string {
		return points.map((point) => `${point.x},${point.y}`).join(' ');
	}
</script>

<div class="hands" data-hand-guide data-hand-drawing={drawing} data-still={still || undefined}>
	<svg
		viewBox="0 0 {size.width} {size.height}"
		preserveAspectRatio="none"
		focusable="false"
		aria-hidden="true"
	>
		<!--
			The contour of the hands at rest: their inside is cut out of their outline, whole, so that no
			seam shows where a finger meets the palm. In contour, nothing else: the letters of the home
			row stay as legible as the others (E-11).
		-->
		<mask
			id={maskId}
			maskUnits="userSpaceOnUse"
			x="0"
			y="0"
			width={size.width}
			height={size.height}
		>
			<rect class="keep" x="0" y="0" width={size.width} height={size.height} />
			{#each hands as hand (hand.hand)}
				<g class="hand-cut">
					<polygon
						points={pointsOf(hand.palm)}
						stroke-width={HAND_STROKES.finger}
						stroke-linejoin="round"
					/>
					{#each hand.fingers as shape (shape.finger)}
						{@const tip = tipOf(shape)}
						<line
							x1={shape.base.x}
							y1={shape.base.y}
							x2={tip.x}
							y2={tip.y}
							stroke-width={HAND_STROKES.finger}
							stroke-linecap="round"
						/>
					{/each}
				</g>
			{/each}
		</mask>
		<!--
			Filled, the default (version 20): the inside, under the contour, as the hands were first
			drawn; a folded finger fainter, as its contour.
		-->
		{#if fill}
			<g class="hand-fill folded" data-hand-fill="folded">
				{#each fill.folded as shape (shape.finger)}
					<line
						x1={shape.base.x}
						y1={shape.base.y}
						x2={shape.tip.x}
						y2={shape.tip.y}
						stroke-width={FILL_WIDTH}
						stroke-linecap="round"
					/>
				{/each}
			</g>
			<g class="hand-fill" data-hand-fill="resting">
				{#each fill.palms as palm, index (index)}
					<polygon points={pointsOf(palm)} stroke-width={FILL_WIDTH} stroke-linejoin="round" />
				{/each}
				{#each fill.fingers as shape (shape.finger)}
					{@const tip = tipOf(shape)}
					<line
						x1={shape.base.x}
						y1={shape.base.y}
						x2={tip.x}
						y2={tip.y}
						stroke-width={FILL_WIDTH}
						stroke-linecap="round"
					/>
				{/each}
			</g>
		{/if}
		<g class="outline" mask="url(#{maskId})">
			{#each hands as hand (hand.hand)}
				<polygon
					points={pointsOf(hand.palm)}
					stroke-width={OUTLINE_WIDTH}
					stroke-linejoin="round"
				/>
				{#each hand.fingers.filter((shape) => !shape.folded) as shape (shape.finger)}
					{@const tip = tipOf(shape)}
					<line
						x1={shape.base.x}
						y1={shape.base.y}
						x2={tip.x}
						y2={tip.y}
						stroke-width={OUTLINE_WIDTH}
						stroke-linecap="round"
						data-finger={shape.finger}
					/>
				{/each}
			{/each}
		</g>
		<!--
			A reduced fingering (ADR-075, choice 6): the fingers it does not use are folded, short and
			faded. The hand keeps its shape and shows what to do with them; they never show a key.
		-->
		<g class="outline folded" mask="url(#{maskId})">
			{#each hands as hand (hand.hand)}
				{#each hand.fingers.filter((shape) => shape.folded) as shape (shape.finger)}
					<line
						x1={shape.base.x}
						y1={shape.base.y}
						x2={shape.tip.x}
						y2={shape.tip.y}
						stroke-width={OUTLINE_WIDTH}
						stroke-linecap="round"
						data-finger={shape.finger}
						data-folded
					/>
				{/each}
			{/each}
		</g>
		<!-- Only the finger that shows a key is filled; it says which finger it is. -->
		{#each hands as hand (hand.hand)}
			{#each hand.fingers.filter(isActive) as shape (shape.finger)}
				{@const tip = tipOf(shape)}
				<g class="active" data-active={shape.finger}>
					<line
						class="active-outline"
						x1={shape.base.x}
						y1={shape.base.y}
						x2={tip.x}
						y2={tip.y}
						stroke-width={OUTLINE_WIDTH}
						stroke-linecap="round"
					/>
					<line
						class="active-fill"
						x1={shape.base.x}
						y1={shape.base.y}
						x2={tip.x}
						y2={tip.y}
						stroke-width={HAND_STROKES.finger}
						stroke-linecap="round"
					/>
				</g>
			{/each}
		{/each}
	</svg>
</div>

<style>
	/* Covers the keys of KeyboardView exactly: its padding, less half a gap on each side. */
	.hands {
		position: absolute;
		inset: calc(var(--dd-space-sm) - var(--dd-size-key-gap) / 2);
		z-index: var(--dd-z-index-guide);
		opacity: var(--dd-opacity-hand);
		pointer-events: none;
	}

	svg {
		display: block;
		inline-size: 100%;
		block-size: 100%;
		overflow: hidden;
	}

	/* Light and shade of a mask, never a colour on screen: the theme and the system leave them. */
	mask {
		forced-color-adjust: none;
	}

	.keep {
		fill: var(--dd-color-hand-mask-keep);
	}

	/* Its own name: a game draws `.cut` too (the cuts of the recipe), and the tests look for them. */
	.hand-cut polygon,
	.hand-cut line {
		fill: var(--dd-color-hand-mask-cut);
		stroke: var(--dd-color-hand-mask-cut);
	}

	/* Its own name, as `hand-cut`: `.fill` is a common word for a drawing. */
	.hand-fill polygon,
	.hand-fill line {
		fill: var(--dd-color-hand-fill);
		stroke: var(--dd-color-hand-fill);
	}

	.outline polygon,
	.outline line,
	.active-outline {
		fill: var(--dd-color-hand-outline);
		stroke: var(--dd-color-hand-outline);
	}

	.folded {
		opacity: var(--dd-opacity-hand-folded);
	}

	.active-fill {
		stroke: var(--dd-color-hand-active);
	}
</style>
