<script lang="ts">
	import { checkerPath, fluffPath, roundedStarPath } from '$lib/ui/companion/geometry';
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
	const FLAG_X = 516;
	/** Past the flag and its cloth: where a ghost that is done waits, beside the child, never behind. */
	const GHOST_SEAT_X = FLAG_X + 28;
	const CHILD_SIZE = 60;
	const GHOST_SIZE = 52;
	/** In reduced motion, a figure moves only every twelfth of the track. */
	const STILL_STEPS = 12;
	const GREETINGS: readonly GhostPose[] = ['clap', 'wave', 'bow', 'dance'];
	/** The ghost stands on the grass like the child; it floats up by itself when it runs. */
	const GHOST_Y = 9;

	/** The scenery goes on past both ends: a wide screen shows more of it, never an edge. */
	const SCENERY_FROM = -WIDTH;
	const SCENERY_TO = 2 * WIDTH;
	const GRASS_TOP = 57;
	function tuft(x: number): string {
		return (
			`M${x - 2.4} 57.4C${x - 2.6} 55.6 ${x - 3.4} 54.4 ${x - 4.6} 53.6C${x - 2.8} 54 ${x - 1.6} 55.2 ${x - 1} 56.4` +
			`C${x - 0.8} 54.6 ${x} 53 ${x + 0.6} 52C${x + 1} 53.8 ${x + 0.8} 55.2 ${x + 0.8} 56.4` +
			`C${x + 1.4} 55.4 ${x + 2.6} 54.6 ${x + 4.2} 54.4C${x + 3} 55.2 ${x + 2.4} 56.2 ${x + 2.2} 57.4Z`
		);
	}
	const TUFTS = [-470, -330, -170, -40, 96, 214, 331, 452, 640, 770, 905, 1060].map(tuft).join('');
	const PEBBLES = [-250, 30, 158, 276, 398, 515, 700, 980]
		.map(
			(x) =>
				`M${x - 2} 61.6C${x - 2} 60.2 ${x + 2} 60.2 ${x + 2.2} 61.6C${x + 2} 62.6 ${x - 2} 62.6 ${x - 2} 61.6Z`
		)
		.join('');
	/** The finish line on the ground, under the flag. */
	const FINISH = checkerPath(FLAG_X - 6, GRASS_TOP + 1, 6, 3, 2);
	const CLOTH = `M${FLAG_X + 1} 11C${FLAG_X + 9} 9.6 ${FLAG_X + 16} 12.6 ${FLAG_X + 25} 11.4C${FLAG_X + 21} 15.6 ${FLAG_X + 21} 20.4 ${FLAG_X + 25} 25C${FLAG_X + 16} 26.4 ${FLAG_X + 9} 23.2 ${FLAG_X + 1} 24.6Z`;
	const STAR = roundedStarPath(FLAG_X + 11, 17.8, 4.2, 1.8, 5, 0.3);
	const DUST = fluffPath(0, 0, 2.2, 6, 0.5);
	const DUST_SMALL = fluffPath(0, 0, 1.4, 5, 0.4);

	/** A figure runs until it touches the flag, so that both are seen at the finish. */
	function place(share: number, size: number): number {
		const bounded = Math.min(Math.max(share, 0), 1);
		const shown = still ? Math.floor(bounded * STILL_STEPS) / STILL_STEPS : bounded;
		return LANE_START + shown * (FLAG_X - LANE_START - size);
	}

	const childX = $derived(place(childShare, CHILD_SIZE));
	const ghostX = $derived(ghostShare >= 1 ? GHOST_SEAT_X : place(ghostShare, GHOST_SIZE));
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
	<path class="grass" d="M{SCENERY_FROM} {GRASS_TOP}H{SCENERY_TO}V64H{SCENERY_FROM}Z" />
	<path class="grass-edge" d="M{SCENERY_FROM} {GRASS_TOP}H{SCENERY_TO}" />
	<path class="tufts" d={TUFTS} />
	<path class="pebbles" d={PEBBLES} />
	<path class="lane" d="M{LANE_START} 61H{FLAG_X}" />
	<rect class="finish-light" x={FLAG_X - 6} y={GRASS_TOP + 1} width="12" height="6" />
	<path class="finish" d={FINISH} />
	<g class="flag">
		<path class="pole" d="M{FLAG_X} {GRASS_TOP + 1}V10" />
		<circle class="knob" cx={FLAG_X} cy="9" r="2" />
		<g class="cloth-wave">
			<path class="cloth" d={CLOTH} />
			<path class="star" d={STAR} />
		</g>
	</g>
	{#if childShare > 0 && !arrived}
		<g class="dust" transform="translate({childX + 10} {GRASS_TOP - 1})">
			<path d={DUST} />
			<path d={DUST_SMALL} transform="translate(-5 1)" />
		</g>
	{/if}
	<svg
		class="ghost"
		x={ghostX}
		y={GHOST_Y}
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

	.grass {
		fill: var(--dd-color-race-grass);
	}

	.grass-edge {
		stroke: var(--dd-color-race-grass-line);
		stroke-width: var(--dd-border-width-thin);
	}

	.tufts {
		fill: var(--dd-color-race-grass);
		stroke: var(--dd-color-race-grass-line);
		stroke-width: var(--dd-border-width-thin);
		stroke-linejoin: round;
	}

	.pebbles,
	.dust {
		fill: var(--dd-color-race-dust);
		stroke: var(--dd-color-race-lane);
		stroke-width: var(--dd-border-width-thin);
	}

	.lane {
		stroke: var(--dd-color-race-lane);
		stroke-width: var(--dd-border-width-thin);
		stroke-dasharray: var(--dd-border-width-focus);
	}

	.finish-light {
		fill: var(--dd-color-race-finish-light);
	}

	.finish {
		fill: var(--dd-color-race-finish);
	}

	.pole {
		stroke: var(--dd-color-race-pole);
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
	}

	.knob {
		fill: var(--dd-color-race-pole);
	}

	.cloth {
		fill: var(--dd-color-race-flag);
		stroke: var(--dd-color-race-pole);
		stroke-width: var(--dd-border-width-thin);
		stroke-linejoin: round;
	}

	.star {
		fill: var(--dd-color-race-flag-star);
	}

	/* The flag flutters slowly: the only thing that moves by itself above the game. */
	.cloth-wave {
		transform-box: view-box;
		transform-origin: 572px 18px;
		animation-name: flutter;
		animation-duration: var(--dd-duration-race-flag);
		animation-timing-function: var(--dd-easing-standard);
		animation-iteration-count: infinite;
		animation-direction: alternate;
	}

	[data-still] .cloth-wave {
		animation-name: none;
	}

	@keyframes flutter {
		0% {
			transform: skewY(-3deg) scale(1, 1);
		}

		100% {
			transform: skewY(3deg) scale(0.94, 1);
		}
	}

	.ghost {
		opacity: var(--dd-opacity-race-ghost);
	}
</style>
