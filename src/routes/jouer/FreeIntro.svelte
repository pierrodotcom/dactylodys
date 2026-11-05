<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import type { GameOption } from './game-choice';
	import GamePicker from './GamePicker.svelte';

	interface Props {
		/** The games offered: those of the world of the map. */
		games: readonly GameOption[];
		/** The game proposed: first, bigger, and focused. */
		gameId: string;
		/** The chosen game could not be loaded. */
		loadFailed: boolean;
		onplay: (gameId: string) => void;
		onback: () => void;
	}

	let { games, gameId, loadFailed, onplay, onback }: Props = $props();
</script>

<!-- The free practice: no lesson, no keys to learn, only a game to choose. -->
<ScreenFrame
	title={m.play_free_title()}
	focusHeading={false}
	wide
	back={{ label: m.play_free_back(), onclick: onback }}
>
	<p class="intro">{m.play_free_intro()}</p>
	{#if loadFailed}
		<p class="warning" role="alert">{m.play_game_load_error()}</p>
	{/if}
	<GamePicker {games} proposed={gameId} {onplay} />
</ScreenFrame>

<style>
	.intro {
		font-size: var(--dd-font-size-lg);
	}

	.warning {
		color: var(--dd-color-error-text);
		font-weight: var(--dd-font-weight-bold);
	}
</style>
