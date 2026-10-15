<script lang="ts">
	import type { GuideMode, LessonDefinition } from '$lib/engine/progression/types';
	import { targetKeyPress } from '$lib/games/shared/target';
	import type { KeyPress } from '$lib/keyboard/types';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
	import CardChoice from '$lib/ui/components/CardChoice.svelte';
	import FingerHint from '$lib/ui/components/FingerHint.svelte';
	import KeyboardView from '$lib/ui/components/KeyboardView.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import { focusOnMount } from '$lib/ui/focus';
	import { isOne } from '$lib/ui/plural';
	import type { KeyboardAssets } from './assets';
	import type { GameOption } from './game-choice';

	interface Props {
		lesson: LessonDefinition;
		number: number;
		assets: KeyboardAssets;
		/** The games of the world; the child chooses when there are several. */
		games: readonly GameOption[];
		gameId: string;
		/** What the hand on the keyboard shows in this lesson: here, the new keys one after the other. */
		guide: GuideMode;
		/** Calm motion: the fingers light up, they do not move. */
		still: boolean;
		/** The chosen game could not be loaded. */
		loadFailed: boolean;
		onchoose: (gameId: string) => void;
		onstart: () => void;
		onback: () => void;
	}

	let {
		lesson,
		number,
		assets,
		games,
		gameId,
		guide,
		still,
		loadFailed,
		onchoose,
		onstart,
		onback
	}: Props = $props();

	const presses = $derived(
		lesson.newChars.flatMap((char) => {
			const press = targetKeyPress(assets.charIndex, char);
			return press === null ? [] : [{ char, press }];
		})
	);
	const marked = $derived(presses.map((entry) => entry.press.code));
	const noTarget: KeyPress | null = null;
	const hands = $derived(
		guide === 'none' ? null : { presses: presses.map((entry) => entry.press), trigger: lesson.id }
	);
</script>

<ScreenFrame title={lesson.title} focusHeading={false} wide>
	<p class="number">{m.play_lesson_number({ number })}</p>
	<p class="intro">{lesson.intro}</p>

	<section class="keys" aria-labelledby="intro-keys-heading">
		<h2 id="intro-keys-heading">
			{isOne(presses.length) ? m.play_intro_keys_one() : m.play_intro_keys_other()}
		</h2>
		<KeyboardView
			layout={assets.layout}
			geometry={assets.geometry}
			fingering={assets.fingering}
			target={noTarget}
			wrongCode={null}
			showFingers={true}
			{marked}
			{hands}
			{still}
		/>
		<ul class="hints">
			{#each presses as entry (entry.char)}
				<li>
					<FingerHint target={entry.press} layout={assets.layout} fingering={assets.fingering} />
				</li>
			{/each}
		</ul>
	</section>

	{#if games.length > 1}
		<CardChoice
			legend={m.play_game_choice_legend()}
			name="game"
			options={games}
			value={gameId}
			onchange={onchoose}
		/>
	{/if}

	{#if loadFailed}
		<p class="problem" role="alert">{m.play_game_load_error()}</p>
	{/if}

	<div class="actions">
		<Button size="lg" {@attach focusOnMount} onclick={onstart}>{m.play_intro_start()}</Button>
		<Button variant="quiet" onclick={onback}>{m.play_intro_back()}</Button>
	</div>
</ScreenFrame>

<style>
	.number {
		color: var(--dd-color-text-secondary);
		font-weight: var(--dd-font-weight-bold);
	}

	.intro {
		font-size: var(--dd-font-size-xl);
	}

	.keys {
		display: grid;
		gap: var(--dd-space-md);
		justify-items: center;
	}

	.keys h2 {
		font-size: var(--dd-font-size-lg);
		color: var(--dd-color-text-secondary);
	}

	.hints {
		display: grid;
		gap: var(--dd-space-xs);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.problem {
		padding: var(--dd-space-sm) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-oops-outline);
		border-radius: var(--dd-radius-md);
		font-weight: var(--dd-font-weight-bold);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: var(--dd-space-md);
	}
</style>
