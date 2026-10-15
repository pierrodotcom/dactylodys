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
	import { readDurationToken, readEasingToken } from '../motion';

	interface Props {
		geometry: KeyboardGeometryDefinition;
		fingering: FingeringProfile;
		/** Key presses to show, one after the other; none: the hands only rest on the keyboard. */
		presses: readonly KeyPress[];
		/** The presses are shown again each time it changes. */
		trigger: string;
		/** Calm motion: the finger lights up where it rests, it does not move. */
		still: boolean;
	}

	const MOVE_TOKEN = '--dd-duration-guide-move';
	const HOLD_TOKEN = '--dd-duration-guide-hold';
	const EASING_TOKEN = '--dd-easing-standard';
	const OUTLINE_WIDTH = HAND_STROKES.finger + HAND_STROKES.outline * 2;

	let { geometry, fingering, presses, trigger, still }: Props = $props();

	const hands = $derived(restingHands(geometry, fingering));
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
		signal: AbortSignal
	) {
		void progress.set(0, { duration: 0 });
		moves = [];
		if (sequence.length === 0) return;
		const duration = readDurationToken(MOVE_TOKEN);
		const hold = readDurationToken(HOLD_TOKEN);
		const easing = readEasingToken(EASING_TOKEN);
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
		void show(sequence, still, controller.signal);
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

<div class="hands" data-hand-guide data-still={still || undefined}>
	<svg
		viewBox="0 0 {size.width} {size.height}"
		preserveAspectRatio="none"
		focusable="false"
		aria-hidden="true"
	>
		{#each hands as hand (hand.hand)}
			<g class="outline">
				<polygon
					points={pointsOf(hand.palm)}
					stroke-width={OUTLINE_WIDTH}
					stroke-linejoin="round"
				/>
				{#each hand.fingers as shape (shape.finger)}
					{@const tip = tipOf(shape)}
					<line
						x1={shape.base.x}
						y1={shape.base.y}
						x2={tip.x}
						y2={tip.y}
						stroke-width={OUTLINE_WIDTH}
						stroke-linecap="round"
					/>
				{/each}
			</g>
			<g class="fill">
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
						data-finger={shape.finger}
						data-active={isActive(shape) || undefined}
					/>
				{/each}
			</g>
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

	.outline polygon,
	.outline line {
		fill: var(--dd-color-hand-outline);
		stroke: var(--dd-color-hand-outline);
	}

	.fill polygon,
	.fill line {
		fill: var(--dd-color-hand-fill);
		stroke: var(--dd-color-hand-fill);
	}

	.fill line[data-active] {
		stroke: var(--dd-color-hand-active);
	}
</style>
