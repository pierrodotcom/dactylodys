<script lang="ts">
	import Companion from '$lib/ui/components/Companion.svelte';
	import GhostFigure, { type GhostPose } from './GhostFigure.svelte';

	interface Props {
		/** Share of the exercise typed right, from 0 to 1. */
		childShare: number;
		/** Share of the exercise the ghost has done, from 0 to 1. */
		ghostShare: number;
		/** The child is done: the ghost greets them, wherever it is. */
		arrived: boolean;
		/** Which greeting, in turn: they follow one another from one race to the next. */
		greeting: number;
		/** Reduced motion: both move by small steps and the ghost holds its poses. */
		still: boolean;
		label: string;
	}

	let { childShare, ghostShare, arrived, greeting, still, label }: Props = $props();

	/** The track is drawn in a box of 600 × 64 units; both figures stand in squares. */
	const WIDTH = 600;
	const LANE_START = 4;
	const FLAG_X = 572;
	const CHILD_SIZE = 60;
	const GHOST_SIZE = 52;
	/** In reduced motion, a figure moves only every twelfth of the track. */
	const STILL_STEPS = 12;
	const GREETINGS: readonly GhostPose[] = ['clap', 'wave', 'bow', 'dance'];

	function place(share: number, size: number): number {
		const bounded = Math.min(Math.max(share, 0), 1);
		const shown = still ? Math.floor(bounded * STILL_STEPS) / STILL_STEPS : bounded;
		return LANE_START + shown * (FLAG_X - LANE_START - size / 2);
	}

	const childX = $derived(place(childShare, CHILD_SIZE));
	const ghostX = $derived(place(ghostShare, GHOST_SIZE));
	const pose = $derived<GhostPose>(
		arrived
			? (GREETINGS[greeting % GREETINGS.length] as GhostPose)
			: ghostShare >= 1
				? 'wait'
				: 'run'
	);
</script>

<svg
	class="track"
	viewBox="0 0 {WIDTH} 64"
	preserveAspectRatio="xMidYMax meet"
	role="img"
	aria-label={label}
	data-ghost-track
	data-still={still || undefined}
>
	<path class="ground" d="M0 60H{WIDTH}" />
	<path class="lane" d="M{LANE_START} 60H{FLAG_X}" />
	<g class="flag">
		<path class="pole" d="M{FLAG_X} 60V10" />
		<path
			class="cloth"
			d="M{FLAG_X} 10H{FLAG_X + 22}L{FLAG_X + 16} 18L{FLAG_X + 22} 26H{FLAG_X}Z"
		/>
	</g>
	<svg
		class="ghost"
		x={ghostX}
		y={-4}
		width={GHOST_SIZE}
		height={GHOST_SIZE}
		viewBox="0 0 120 120"
		overflow="visible"
		data-ghost-share={ghostShare >= 1 ? 'done' : 'running'}
	>
		<GhostFigure {pose} />
	</svg>
	<svg class="child" x={childX} y={2} width={CHILD_SIZE} height={CHILD_SIZE} viewBox="0 0 120 120">
		<Companion mood={arrived ? 'cheer' : 'idle'} />
	</svg>
</svg>

<style>
	.track {
		display: block;
		inline-size: 100%;
		block-size: var(--dd-size-race-track);
	}

	.child :global(.companion) {
		inline-size: 100%;
		block-size: 100%;
	}

	.ground {
		stroke: var(--dd-color-race-ground);
		stroke-width: var(--dd-border-width-thick);
	}

	.lane {
		stroke: var(--dd-color-race-lane);
		stroke-width: var(--dd-border-width-thin);
		stroke-dasharray: var(--dd-border-width-thick);
	}

	.pole {
		stroke: var(--dd-color-race-pole);
		stroke-width: var(--dd-border-width-thick);
	}

	.cloth {
		fill: var(--dd-color-race-flag);
		stroke: var(--dd-color-race-pole);
		stroke-width: var(--dd-border-width-thin);
	}

	.ghost {
		opacity: var(--dd-opacity-race-ghost);
	}
</style>
