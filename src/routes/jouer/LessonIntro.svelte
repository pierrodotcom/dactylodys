<script lang="ts">
	import type { GuideMode, LessonDefinition } from '$lib/engine/progression/types';
	import { targetKeyPress } from '$lib/games/shared/target';
	import type { KeyPress } from '$lib/keyboard/types';
	import type { VoicePlayer } from '$lib/audio/voice-types';
	import type { RewardDefinition } from '$lib/engine/rewards';
	import RewardPicture from '$lib/ui/companion/RewardPicture.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import FingerHint from '$lib/ui/components/FingerHint.svelte';
	import KeyboardView from '$lib/ui/components/KeyboardView.svelte';
	import ListenButton from '$lib/ui/components/ListenButton.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import { isOne } from '$lib/ui/plural';
	import type { KeyboardAssets } from './assets';
	import type { GameOption } from './game-choice';
	import GamePicker from './GamePicker.svelte';

	interface Props {
		lesson: LessonDefinition;
		number: number;
		assets: KeyboardAssets;
		/** The games of the world; each one starts the lesson. */
		games: readonly GameOption[];
		/** The game proposed for this lesson. */
		gameId: string;
		/** What the hand on the keyboard shows in this lesson: here, the new keys one after the other. */
		guide: GuideMode;
		/** Calm motion: the fingers light up, they do not move. */
		still: boolean;
		/** Says the instruction of the lesson as the screen opens, and again on demand. */
		voice: VoicePlayer;
		/** The chosen game could not be loaded. */
		loadFailed: boolean;
		/** What passing the lesson earns, when the child does not own it yet. */
		prize: RewardDefinition | null;
		onplay: (gameId: string) => void;
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
		voice,
		loadFailed,
		prize,
		onplay,
		onback
	}: Props = $props();

	// The child does not read: the instruction is said once as the lesson opens.
	$effect(() => {
		const said = lesson.intro;
		const speaker = voice;
		void speaker.speak(said);
		return () => speaker.stop();
	});

	const presses = $derived(
		lesson.newChars.flatMap((char) => {
			const press = targetKeyPress(assets.charIndex, char);
			return press === null ? [] : [{ char, press }];
		})
	);
	const marked = $derived(presses.map((entry) => entry.press.code));
	const noTarget: KeyPress | null = null;
	const hands = $derived(
		guide === 'none'
			? null
			: { presses: presses.map((entry) => entry.press), trigger: lesson.id, repeat: true }
	);
</script>

<ScreenFrame
	title={lesson.title}
	focusHeading={false}
	wide
	back={{ label: m.play_intro_back(), onclick: onback }}
>
	<!-- Number, prize and Listen share one line: the pictures of the games stay in view on a laptop. -->
	<div class="head">
		<p class="number">{m.play_lesson_number({ number })}</p>
		<ListenButton text={lesson.intro} player={voice} />
		{#if prize}
			<div class="prize" data-prize={prize.id}>
				<div class="prize-picture" aria-hidden="true">
					<RewardPicture artId={prize.artId} kind={prize.kind} owned={true} label={prize.title} />
				</div>
				<p>{m.play_reward_prize({ title: prize.title })}</p>
			</div>
		{/if}
	</div>
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

	<GamePicker {games} proposed={gameId} {onplay} />

	{#if loadFailed}
		<p class="problem" role="alert">{m.play_game_load_error()}</p>
	{/if}
</ScreenFrame>

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: var(--dd-space-md);
	}

	.number {
		color: var(--dd-color-text-secondary);
		font-weight: var(--dd-font-weight-bold);
	}

	.prize {
		display: flex;
		align-items: center;
		gap: var(--dd-space-sm);
		color: var(--dd-color-text-secondary);
		font-weight: var(--dd-font-weight-bold);
	}

	.prize-picture {
		flex: none;
		inline-size: var(--dd-size-touch-target-min);
	}

	.intro {
		font-size: var(--dd-font-size-lg);
		text-align: center;
	}

	/* Smaller keys, so that the games below stay in view on a laptop screen. */
	.keys {
		--dd-size-key-unit: var(--dd-size-key-unit-compact);
		display: grid;
		gap: var(--dd-space-sm);
		justify-items: center;
	}

	.keys h2 {
		font-size: var(--dd-font-size-lg);
		color: var(--dd-color-text-secondary);
	}

	.hints {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--dd-space-xs) var(--dd-space-xl);
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
</style>
