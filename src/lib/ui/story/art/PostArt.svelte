<script lang="ts">
	import type { Component } from 'svelte';
	import type { StoryPhase } from '../phase';
	import CircuitArt from './CircuitArt.svelte';
	import DinosaursArt from './DinosaursArt.svelte';
	import KitchenArt from './KitchenArt.svelte';
	import SpaceArt from './SpaceArt.svelte';
	import ZooArt from './ZooArt.svelte';

	interface Props {
		/** One of `STORY_ART_GROUPS.post`. */
		art: string;
		/** `before`: the picture of a friend met earlier; `after`: the paper of the lesson arrives. */
		phase?: StoryPhase;
	}

	type Paper =
		'letters' | 'list' | 'envelope' | 'recipe' | 'caption' | 'postcard' | 'invitation' | 'flight';

	interface PostPicture {
		/** The drawing of an earlier world it starts from, always in its finished state. */
		readonly base: Component<{ art: string; phase: StoryPhase }>;
		readonly baseArt: string;
		readonly paper: Paper;
		/** Where the paper is put: its centre, its turn in degrees and its scale. */
		readonly at: readonly [number, number, number, number];
	}

	/*
	 * The last world tells no new place: the companion writes to the friends of the five worlds.
	 * Each picture is one of theirs, and the paper of the lesson (a list, a letter, a card) comes
	 * into it. Nothing else is drawn, so the pictures of the earlier worlds stay as they are.
	 */
	const PICTURES: Readonly<Record<string, PostPicture>> = {
		'post-opening': {
			base: CircuitArt,
			baseArt: 'circuit-ending',
			paper: 'letters',
			at: [132, 76, -6, 1]
		},
		'post-list': {
			base: KitchenArt,
			baseArt: 'kitchen-opening',
			paper: 'list',
			at: [137, 30, 8, 1]
		},
		'post-trex': {
			base: DinosaursArt,
			baseArt: 'dino-trex',
			paper: 'envelope',
			at: [134, 24, -10, 1]
		},
		'post-recipe': {
			base: KitchenArt,
			baseArt: 'kitchen-quiche',
			paper: 'recipe',
			at: [134, 24, 6, 1]
		},
		'post-caption': {
			base: ZooArt,
			baseArt: 'zoo-giraffe',
			paper: 'caption',
			at: [26, 24, -5, 1]
		},
		'post-card': { base: SpaceArt, baseArt: 'space-moon', paper: 'postcard', at: [130, 26, 9, 1] },
		'post-invite': {
			base: CircuitArt,
			baseArt: 'circuit-horn',
			paper: 'invitation',
			at: [136, 30, -8, 1]
		},
		'post-ending': {
			base: DinosaursArt,
			baseArt: 'dino-ending',
			paper: 'flight',
			at: [118, 24, 0, 1]
		}
	};

	/** The small envelopes flying away at the end: centre, turn, scale. */
	const FLYING: readonly (readonly [number, number, number, number])[] = [
		[-22, 10, -14, 0.62],
		[0, -2, 8, 0.74],
		[24, 8, -6, 0.58]
	];

	let { art, phase = 'after' }: Props = $props();
	const picture = $derived(PICTURES[art]);
	const after = $derived(phase === 'after');

	function place([x, y, turn, scale]: readonly [number, number, number, number]): string {
		return `translate(${x} ${y}) rotate(${turn}) scale(${scale})`;
	}
</script>

{#if picture}
	{@const Base = picture.base}
	<g data-story-art={art} data-post-paper={after ? picture.paper : undefined}>
		<Base art={picture.baseArt} phase="after" />
		{#if after}
			<g class="paper" transform={place(picture.at)}>
				{#if picture.paper === 'envelope'}
					{@render envelope()}
				{:else if picture.paper === 'letters'}
					<g transform="translate(-5 6) rotate(-8)">{@render envelope()}</g>
					<g transform="translate(4 1) rotate(5)">{@render envelope()}</g>
					<g transform="translate(-1 -5) rotate(-2)">{@render envelope()}</g>
				{:else if picture.paper === 'flight'}
					{#each FLYING as at, index (index)}
						<path
							class="swish open"
							d="M{at[0] - 20} {at[1] + 9}Q{at[0] - 12} {at[1] + 2} {at[0] - 9} {at[1] + 6}"
						/>
						<g transform={place(at)}>{@render envelope()}</g>
					{/each}
				{:else if picture.paper === 'list'}
					{@render list()}
				{:else if picture.paper === 'recipe'}
					{@render recipe()}
				{:else if picture.paper === 'caption'}
					{@render caption()}
				{:else if picture.paper === 'postcard'}
					{@render postcard()}
				{:else}
					{@render invitation()}
				{/if}
			</g>
		{/if}
	</g>
{/if}

{#snippet sheet(width: number, height: number, fill: string)}
	<rect class="cast" x={-width / 2 + 1.4} y={-height / 2 + 1.8} {width} {height} rx="1.6" />
	<rect class="line {fill}" x={-width / 2} y={-height / 2} {width} {height} rx="1.6" />
{/snippet}

<!-- A letter, sealed: its flap, its folds and a round seal. -->
{#snippet envelope()}
	{@render sheet(34, 22, 'paper-fill')}
	<path class="line thin open" d="M-17 11L-4 1M17 11L4 1" />
	<path class="line flap" d="M-16.4 -10.6L0 2.6L16.4 -10.6Z" />
	<circle class="line seal" cx="0" cy="2.4" r="3.2" />
	<path class="light-line open" d="M-1.4 1.6Q0 0.6 1.4 1.6" />
{/snippet}

<!-- A list on a torn page: a title, then a dash and a word per line. -->
{#snippet list()}
	{@render sheet(28, 36, 'paper-fill')}
	<path class="margin open" d="M-8 -18V18" />
	<path class="ink-line open" d="M-5 -12H9" />
	{#each [-4, 3, 10] as y (y)}
		<path class="ink-line open" d="M-11.5 {y}H-9.5" />
		<path class="pencil open" d="M-5 {y}H{y === 3 ? 6 : 9}" />
	{/each}
{/snippet}

<!-- A recipe card: a coloured band with a spoon, then the steps. -->
{#snippet recipe()}
	{@render sheet(36, 26, 'paper-fill')}
	<path class="band" d="M-17.2 -11.4Q-17.2 -13 -15.6 -13H15.6Q17.2 -13 17.2 -11.4V-6H-17.2Z" />
	<path class="line open" d="M-18 -6H18" />
	<ellipse class="line metal" cx="-11" cy="-9.6" rx="2.4" ry="1.6" />
	<path class="line thin open" d="M-8.6 -9.6H-1" />
	{#each [-1, 4, 9] as y (y)}
		<circle class="dot" cx="-12" cy={y} r="1.1" />
		<path class="pencil open" d="M-8 {y}H{y === 4 ? 7 : 12}" />
	{/each}
{/snippet}

<!-- A drawing in its frame, its caption written on a strip of paper underneath. -->
{#snippet caption()}
	<rect class="cast" x="-15.6" y="-15.2" width="34" height="26" rx="1.2" />
	<rect class="line wood" x="-17" y="-17" width="34" height="26" rx="1.2" />
	<rect class="line sky" x="-13" y="-13" width="26" height="18" />
	<circle class="sun" cx="7" cy="-8" r="2.6" />
	<path class="line grass" d="M-13 5V0Q-6 -5 0 -1Q6 2 13 -3V5Z" />
	<g transform="translate(0 14) rotate(3)">
		{@render sheet(28, 8, 'paper-fill')}
		<path class="pencil open" d="M-10 0H10" />
	</g>
{/snippet}

<!-- A postcard: the picture on one side, the stamp and the lines of the address on the other. -->
{#snippet postcard()}
	{@render sheet(38, 26, 'paper-fill')}
	<rect class="line night" x="-16" y="-10" width="15" height="20" rx="0.8" />
	<path class="moon" d="M-8 -6A5 5 0 1 0 -8 4A4 4 0 1 1 -8 -6Z" />
	<circle class="star" cx="-13" cy="-5" r="0.9" />
	<circle class="star" cx="-4" cy="6" r="0.7" />
	<path class="line thin open" d="M1.5 -10V10" />
	<rect class="line stamp" x="9" y="-10" width="8" height="9" />
	<path class="light-line open" d="M10.6 -7.6H15.4M10.6 -5.4H15.4M10.6 -3.2H13.6" />
	{#each [3, 7] as y (y)}
		<path class="pencil open" d="M4 {y}H15" />
	{/each}
{/snippet}

<!-- An invitation: a folded card with confetti and a ribbon. -->
{#snippet invitation()}
	{@render sheet(30, 34, 'paper-fill')}
	<path class="line ribbon" d="M-15 -4H15V2H-15Z" />
	<path class="line knot" d="M0 -1L-5 -6L-5 4ZM0 -1L5 -6L5 4Z" />
	<circle class="confetti-a" cx="-9" cy="-12" r="1.3" />
	<circle class="confetti-b" cx="7" cy="-11" r="1.1" />
	<circle class="confetti-c" cx="-1" cy="-14" r="0.9" />
	<path class="pencil open" d="M-9 8H9M-6 12H6" />
{/snippet}

<style>
	.line {
		stroke: var(--dd-color-story-line);
		stroke-width: var(--dd-border-width-thick);
		stroke-linejoin: round;
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.thin {
		stroke-width: var(--dd-border-width-thin);
	}

	.open {
		fill: none;
	}

	.cast {
		fill: var(--dd-color-story-shade);
		opacity: var(--dd-opacity-story-shade);
	}

	.paper-fill {
		fill: var(--dd-color-story-paper);
	}

	.flap {
		fill: var(--dd-color-story-page);
	}

	.seal,
	.stamp {
		fill: var(--dd-color-story-a);
	}

	.band {
		fill: var(--dd-color-story-c);
	}

	.metal {
		fill: var(--dd-color-story-metal);
	}

	.dot {
		fill: var(--dd-color-story-ink);
	}

	.wood {
		fill: var(--dd-color-story-wood);
	}

	.sky {
		fill: var(--dd-color-story-sky);
	}

	.sun,
	.star {
		fill: var(--dd-color-story-star);
	}

	.grass {
		fill: var(--dd-color-story-leaf);
	}

	.night {
		fill: var(--dd-color-story-night);
	}

	.moon {
		fill: var(--dd-color-story-white);
	}

	.ribbon,
	.knot {
		fill: var(--dd-color-story-h);
	}

	.confetti-a {
		fill: var(--dd-color-story-f);
	}

	.confetti-b {
		fill: var(--dd-color-story-b);
	}

	.confetti-c {
		fill: var(--dd-color-story-g);
	}

	.light-line {
		stroke: var(--dd-color-story-light);
		stroke-width: var(--dd-border-width-thin);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.ink-line {
		stroke: var(--dd-color-story-ink);
		stroke-width: var(--dd-border-width-drawing-bold);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.pencil {
		stroke: var(--dd-color-story-soil);
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}

	.margin {
		stroke: var(--dd-color-story-a);
		stroke-width: var(--dd-border-width-thin);
		vector-effect: non-scaling-stroke;
	}

	.swish {
		stroke: var(--dd-color-story-star);
		stroke-width: var(--dd-border-width-thick);
		stroke-linecap: round;
		vector-effect: non-scaling-stroke;
	}
</style>
