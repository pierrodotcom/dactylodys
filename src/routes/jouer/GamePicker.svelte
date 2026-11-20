<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import GamePicture from '$lib/games/GamePicture.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { focusOnMountInPlace, revealInView } from '$lib/ui/focus';
	import type { GameOption } from './game-choice';

	interface Props {
		/** The games of the world. */
		games: readonly GameOption[];
		/** The game proposed for this lesson: first, bigger, and focused. */
		proposed: string;
		onplay: (gameId: string) => void;
		/**
		 * How the games come into view as the screen opens; `null` when the screen brings them in
		 * itself. By default, only when they are not in view already.
		 */
		reveal?: Attachment<HTMLElement> | null;
		/** Wide tiles that share the width of the row, each picture beside its title. */
		tiles?: boolean;
	}

	let { games, proposed, onplay, reveal = revealInView, tiles = false }: Props = $props();

	const ordered = $derived([
		...games.filter((game) => game.value === proposed),
		...games.filter((game) => game.value !== proposed)
	]);
</script>

<!-- The focused picture alone could leave the others cut at the bottom of a laptop screen. -->
<ul
	class="games"
	aria-label={m.play_game_choice_legend()}
	data-many={games.length > 2 || undefined}
	data-tiles={tiles || undefined}
	{@attach reveal ?? undefined}
>
	{#each ordered as game (game.value)}
		{@const isProposed = game.value === proposed}
		<li>
			<button
				type="button"
				class="game"
				data-proposed={isProposed || undefined}
				data-game={game.value}
				{@attach isProposed ? focusOnMountInPlace : undefined}
				onclick={() => onplay(game.value)}
			>
				<span class="picture" aria-hidden="true">
					<GamePicture gameId={game.value} />
				</span>
				<span class="title">{game.playLabel}</span>
			</button>
		</li>
	{/each}
</ul>

<style>
	.games {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		justify-content: center;
		gap: var(--dd-space-lg);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.game {
		display: grid;
		justify-items: center;
		gap: var(--dd-space-sm);
		min-inline-size: var(--dd-size-touch-target-min);
		padding: var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-surface-raised);
		color: var(--dd-color-text-primary);
		font: inherit;
		cursor: pointer;
		transition-property: scale, border-color;
		transition-duration: var(--dd-duration-fast);
		transition-timing-function: var(--dd-easing-standard);
	}

	.game:hover,
	.game:focus-visible {
		border-color: var(--dd-color-accent-base);
		scale: var(--dd-scale-target);
	}

	.game:focus-visible {
		outline-style: solid;
		outline-width: var(--dd-border-width-target);
		outline-color: var(--dd-color-focus-ring);
		outline-offset: var(--dd-border-width-thick);
	}

	.picture {
		display: block;
		inline-size: var(--dd-size-game-picture);
		block-size: var(--dd-size-game-picture);
	}

	/* The other games are smaller, and nod now and then: they can be chosen too. */
	.game:not([data-proposed]) .picture {
		inline-size: var(--dd-size-game-picture-small);
		block-size: var(--dd-size-game-picture-small);
		animation-name: nod;
		animation-duration: var(--dd-duration-guide-pause);
		animation-delay: var(--dd-duration-beat);
		animation-iteration-count: infinite;
		animation-timing-function: var(--dd-easing-standard);
	}

	.game[data-proposed] {
		border-color: var(--dd-color-accent-base);
		border-width: var(--dd-border-width-target);
	}

	.game[data-proposed] .picture {
		animation-name: bob;
		animation-duration: var(--dd-duration-guide-pause);
		animation-iteration-count: infinite;
		animation-timing-function: var(--dd-easing-standard);
	}

	.title {
		font-size: var(--dd-font-size-lg);
		font-weight: var(--dd-font-weight-bold);
	}

	.game[data-proposed] .title {
		font-size: var(--dd-font-size-xl);
	}

	/*
	 * Three games or more: smaller pictures and titles on two or three lines, so that all the games
	 * stay on one row, even with a long title proposed (world 6), under the keys of the lesson.
	 */
	.games[data-many] .title {
		max-inline-size: var(--dd-size-game-title-small-max);
		line-height: var(--dd-line-height-tight);
		text-wrap: balance;
	}

	.games[data-many] .game[data-proposed] .title {
		max-inline-size: var(--dd-size-game-title-proposed-max);
		font-size: var(--dd-font-size-lg);
	}

	.games[data-many] .game[data-proposed] .picture {
		inline-size: var(--dd-size-game-picture-many);
		block-size: var(--dd-size-game-picture-many);
	}

	.games[data-many] .game:not([data-proposed]) .picture {
		inline-size: var(--dd-size-game-picture-small-many);
		block-size: var(--dd-size-game-picture-small-many);
	}

	/*
	 * Tiles: the games share the row, each one at least as wide as a tile, one under the other on a
	 * narrow page. The picture is at the left of the title, above it when the tile is too narrow for
	 * the longest word of the title beside it. They grow less when pointed: they are wide.
	 */
	.games[data-tiles] {
		align-items: stretch;
		justify-content: start;
	}

	.games[data-tiles] > li {
		display: flex;
		flex: 1 1 var(--dd-size-game-tile-min);
		min-inline-size: 0;
	}

	.games[data-tiles] .game {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--dd-space-sm) var(--dd-space-md);
		inline-size: 100%;
		padding-block: var(--dd-space-sm);
		text-align: start;
	}

	.games[data-tiles] .picture {
		flex: none;
	}

	.games[data-tiles] .title {
		flex: 1 1 0;
		min-inline-size: var(--dd-size-game-tile-title-min);
	}

	.games[data-tiles] .game:hover,
	.games[data-tiles] .game:focus-visible {
		scale: var(--dd-scale-tile);
	}

	@keyframes bob {
		0%,
		30%,
		100% {
			translate: 0 0;
		}

		15% {
			translate: 0 calc(var(--dd-space-sm) * -1);
		}
	}

	@keyframes nod {
		0%,
		20%,
		100% {
			rotate: 0deg;
		}

		5% {
			rotate: -6deg;
		}

		12% {
			rotate: 6deg;
		}
	}
</style>
