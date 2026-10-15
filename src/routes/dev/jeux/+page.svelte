<script lang="ts">
	import { onMount, type Component } from 'svelte';
	import { createSoundPlayer } from '$lib/audio';
	import { gameDescription, gameTitle } from '$lib/games/labels';
	import { GAMES, findGame } from '$lib/games/registry';
	import type { GameOutcome, GameProps } from '$lib/games/types';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
	import CardChoice from '$lib/ui/components/CardChoice.svelte';
	import type { PageProps } from './$types';
	import { SAMPLE_EXERCISE } from './sample';

	type Step = 'choose' | 'loading' | 'playing' | 'done';

	const options = GAMES.map((game) => ({
		value: game.id,
		title: gameTitle(game.id),
		description: gameDescription(game.id)
	}));

	/** Often enough to see the reminder in the short sample exercise. */
	const LOOK_REMINDER_EVERY = 2;

	let { data }: PageProps = $props();

	let gameId = $state(GAMES[0]?.id ?? '');
	let showKeyboard = $state(true);
	let reducedMotion = $state(false);
	let showHand = $state(true);
	let step = $state<Step>('choose');
	let ActiveGame = $state.raw<Component<GameProps> | null>(null);
	let outcome = $state.raw<GameOutcome | null>(null);

	const sounds = createSoundPlayer({ isEnabled: () => false });
	const settings = $derived({
		soundEnabled: false,
		reducedMotion,
		showKeyboard,
		errorPolicy: 'retry' as const,
		guide: { mode: showHand ? ('every-key' as const) : ('none' as const), freshChars: [] },
		lookReminderEvery: LOOK_REMINDER_EVERY
	});

	onMount(() => {
		reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
		return () => sounds.dispose();
	});

	async function play() {
		const definition = findGame(gameId);
		if (!definition) return;
		step = 'loading';
		ActiveGame = (await definition.load()).default;
		step = 'playing';
	}

	function finish(result: GameOutcome) {
		outcome = result;
		step = 'done';
	}

	function backToChoice() {
		step = 'choose';
	}
</script>

<svelte:head>
	<title>{m.dev_games_title()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	{#if step === 'playing' && ActiveGame}
		<ActiveGame
			exercise={SAMPLE_EXERCISE}
			layout={data.assets.layout}
			charIndex={data.assets.charIndex}
			geometry={data.assets.geometry}
			fingering={data.assets.fingering}
			{settings}
			{sounds}
			onComplete={finish}
			onQuit={backToChoice}
		/>
	{:else}
		<div class="page">
			<header>
				<h1>{m.dev_games_title()}</h1>
				<p>{m.dev_games_intro()}</p>
			</header>

			{#if step === 'done' && outcome}
				<section aria-labelledby="result-heading">
					<h2 id="result-heading">{m.dev_games_result_heading()}</h2>
					<pre class="raw">{JSON.stringify(outcome.metrics, null, 2)}</pre>
				</section>
			{/if}

			<CardChoice
				legend={m.dev_games_choice_legend()}
				name="game"
				{options}
				value={gameId}
				onchange={(value) => (gameId = value)}
			/>

			<div class="controls">
				<label>
					<input type="checkbox" bind:checked={showKeyboard} />
					<span>{m.dev_games_keyboard_label()}</span>
				</label>
				<label>
					<input type="checkbox" bind:checked={reducedMotion} />
					<span>{m.dev_games_reduced_label()}</span>
				</label>
				<label>
					<input type="checkbox" bind:checked={showHand} />
					<span>{m.dev_games_hand_label()}</span>
				</label>
			</div>

			<div class="actions">
				<Button size="lg" disabled={step === 'loading'} onclick={play}>
					{step === 'loading' ? m.dev_games_loading() : m.dev_games_play()}
				</Button>
			</div>
		</div>
	{/if}
</main>

<style>
	.page {
		display: grid;
		gap: var(--dd-space-xl);
		max-inline-size: var(--dd-size-page-wide);
		margin: auto;
		padding: var(--dd-space-xl) var(--dd-space-lg);
	}

	header {
		display: grid;
		gap: var(--dd-space-sm);
		text-align: center;
	}

	h1 {
		font-size: var(--dd-font-size-3xl);
	}

	h2 {
		font-size: var(--dd-font-size-xl);
	}

	section {
		display: grid;
		gap: var(--dd-space-sm);
	}

	.raw {
		overflow-x: auto;
		margin: 0;
		padding: var(--dd-space-md);
		border-width: var(--dd-border-width-thin);
		border-style: solid;
		border-color: var(--dd-color-border-subtle);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-sunken);
		font-family: var(--dd-font-family-mono);
		font-size: var(--dd-font-size-sm);
		line-height: var(--dd-line-height-base);
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--dd-space-lg);
	}

	.controls label {
		display: inline-flex;
		align-items: center;
		gap: var(--dd-space-sm);
		min-block-size: var(--dd-size-touch-target-min);
	}

	.controls input {
		inline-size: var(--dd-font-size-lg);
		block-size: var(--dd-font-size-lg);
	}

	.actions {
		display: flex;
		justify-content: center;
	}
</style>
