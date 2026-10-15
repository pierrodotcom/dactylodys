<script lang="ts">
	import GamePicture from '$lib/games/GamePicture.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { focusOnMount } from '$lib/ui/focus';
	import type { GameOption } from './game-choice';

	interface Props {
		/** The games of the world. */
		games: readonly GameOption[];
		/** The game proposed for this lesson: first, bigger, and focused. */
		proposed: string;
		onplay: (gameId: string) => void;
	}

	let { games, proposed, onplay }: Props = $props();

	const ordered = $derived([
		...games.filter((game) => game.value === proposed),
		...games.filter((game) => game.value !== proposed)
	]);
</script>

<ul class="games" aria-label={m.play_game_choice_legend()}>
	{#each ordered as game (game.value)}
		{@const isProposed = game.value === proposed}
		<li>
			<button
				type="button"
				class="game"
				data-proposed={isProposed || undefined}
				data-game={game.value}
				{@attach isProposed ? focusOnMount : undefined}
				onclick={() => onplay(game.value)}
			>
				<span class="picture" aria-hidden="true">
					<GamePicture gameId={game.value} />
				</span>
				<span class="title">{m.play_game_play({ game: game.title })}</span>
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
