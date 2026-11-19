<script lang="ts">
	import type { GuideMode, LessonDefinition } from '$lib/engine/progression/types';
	import type { Hand, KeyPress, ModifierLevel } from '$lib/keyboard/types';
	import type { VoicePlayer } from '$lib/audio/voice-types';
	import type { RewardDefinition } from '$lib/engine/rewards';
	import RewardPicture from '$lib/ui/companion/RewardPicture.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import FingerHint from '$lib/ui/components/FingerHint.svelte';
	import KeyboardView from '$lib/ui/components/KeyboardView.svelte';
	import ListenButton from '$lib/ui/components/ListenButton.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import { revealBelow } from '$lib/ui/focus';
	import { isOne } from '$lib/ui/plural';
	import type { KeyboardAssets } from './assets';
	import type { GameOption } from './game-choice';
	import GamePicker from './GamePicker.svelte';
	import { headingCount, introLines, introShown, type IntroLine } from './intro-keys';
	import RaceChoice from './RaceChoice.svelte';

	interface Props {
		lesson: LessonDefinition;
		/** What the lesson brings: its new characters, and the capitals it unlocks. */
		fresh: readonly string[];
		/** The number the child reads; `null` for a detour, which has none. */
		number: number | null;
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
		/** A passed lesson whose pace was kept: the child may race the ghost (ADR-022). */
		canRace: boolean;
		/**
		 * The child enters a world where a mistake is erased with Backspace and has not played there
		 * yet: one written sentence says so.
		 */
		erasingNew?: boolean;
		/** `race`: the child switched the race on before taking a game. */
		onplay: (gameId: string, race: boolean) => void;
		onback: () => void;
	}

	const HAND_NAMES: Readonly<Record<Hand, () => string>> = {
		left: m.play_intro_hand_left,
		right: m.play_intro_hand_right
	};
	const HAND_LINES: Readonly<
		Record<ModifierLevel, (inputs: { keys: string; hand: string }) => string>
	> = {
		base: m.play_intro_hand_keys,
		shift: m.play_intro_hand_keys_shift,
		altgr: m.play_intro_hand_keys_altgr,
		shiftAltgr: m.play_intro_hand_keys_shift_altgr
	};
	/** Between the characters of one line: they are read one by one, like the keys. */
	const KEY_SEPARATOR = ' ';

	let {
		lesson,
		fresh,
		number,
		assets,
		games,
		gameId,
		guide,
		still,
		voice,
		loadFailed,
		prize,
		canRace,
		erasingNew = false,
		onplay,
		onback
	}: Props = $props();

	let race = $state(false);
	let instruction: HTMLElement | undefined = $state();

	// The child does not read: the instruction is said once as the lesson opens.
	$effect(() => {
		const said = lesson.intro;
		const speaker = voice;
		void speaker.speak(said);
		return () => speaker.stop();
	});

	// The new keys, else what the data of the lesson says it works (capitals, Backspace), else none.
	const shown = $derived(introShown(lesson, fresh, assets.charIndex, assets.fingering));
	const presses = $derived(shown?.keys ?? []);
	const marked = $derived(presses.flatMap((entry) => entry.codes));
	const lines = $derived(introLines(presses, assets.fingering));
	const heading = $derived.by(() => {
		if (shown === null) return '';
		const one = isOne(headingCount(lesson, shown));
		if (shown.kind === 'new') return one ? m.play_intro_keys_one() : m.play_intro_keys_other();
		return one ? m.play_intro_practice_one() : m.play_intro_practice_other();
	});
	const noTarget: KeyPress | null = null;
	const hands = $derived(
		guide === 'none' || presses.length === 0
			? null
			: { presses: presses.map((entry) => entry.press), trigger: lesson.id, repeat: true }
	);

	function handLine(line: Extract<IntroLine, { kind: 'hand' }>): string {
		return HAND_LINES[line.level]({
			keys: line.chars.join(KEY_SEPARATOR),
			hand: HAND_NAMES[line.hand]()
		});
	}
</script>

<ScreenFrame
	title={lesson.title}
	focusHeading={false}
	wide
	back={{ label: m.play_intro_back(), onclick: onback }}
>
	<!--
		One column, tight: the instruction, the keys and the games hold together on a laptop screen;
		the screen opens on them, the instruction first (the bar of the player stays above).
	-->
	<div class="lesson">
		<div class="head">
			<p class="number">
				{lesson.tour !== undefined
					? m.play_lesson_tour()
					: number === null
						? m.play_lesson_detour()
						: m.play_lesson_number({ number })}
			</p>
			<ListenButton text={lesson.intro} player={voice} />
			{#if prize}
				<div class="prize" data-prize={prize.id}>
					<div class="prize-picture" aria-hidden="true">
						<RewardPicture artId={prize.artId} kind={prize.kind} owned={true} label={prize.title} />
					</div>
					<div class="prize-text">
						<p>{m.play_reward_prize({ title: prize.title })}</p>
						<!-- A grand tour asks more than passing it: what to master is said beforehand. -->
						{#if lesson.tour !== undefined}
							<p class="prize-how">{prize.description}</p>
						{/if}
					</div>
				</div>
			{/if}
		</div>
		<p class="intro" bind:this={instruction}>{lesson.intro}</p>

		{#if shown}
			<section class="keys" aria-labelledby="intro-keys-heading" data-intro-keys={shown.kind}>
				<!--
					Beside the keyboard: the title of the keys, the fingers, and the sentence of the world under
					them. The keyboard is a picture only (screen readers skip it): the title comes first for them.
				-->
				<div class="keys-row">
					<div class="board">
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
					</div>
					<div class="beside">
						<h2 id="intro-keys-heading">{heading}</h2>
						<ul class="hints">
							{#each lines as line, index (index)}
								<li>
									{#if line.kind === 'key'}
										<FingerHint
											target={line.key.press}
											layout={assets.layout}
											fingering={assets.fingering}
										/>
									{:else}
										<p class="finger-hint" data-hand-line={line.hand}>{handLine(line)}</p>
									{/if}
								</li>
							{/each}
						</ul>
						{#if erasingNew}
							<p class="notice" data-erasing-notice>{m.play_intro_erasing()}</p>
						{/if}
					</div>
				</div>
			</section>
		{:else if erasingNew}
			<!-- Right above the games, where the screen settles: the child reads it before choosing. -->
			<p class="notice" data-erasing-notice>{m.play_intro_erasing()}</p>
		{/if}

		<div class="choice" {@attach revealBelow(() => instruction)}>
			<GamePicker
				{games}
				proposed={gameId}
				reveal={null}
				onplay={(id) => onplay(id, canRace && race)}
			/>

			{#if canRace}
				<RaceChoice checked={race} onchange={(value) => (race = value)} />
			{/if}

			{#if loadFailed}
				<p class="problem" role="alert">{m.play_game_load_error()}</p>
			{/if}
		</div>
	</div>
</ScreenFrame>

<style>
	.lesson {
		display: grid;
		gap: var(--dd-space-sm);
		justify-items: center;
		inline-size: 100%;
	}

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

	.prize-text {
		display: grid;
		gap: var(--dd-space-xs);
		max-inline-size: var(--dd-size-panel-max);
	}

	.prize-how {
		font-weight: var(--dd-font-weight-regular);
	}

	.intro {
		font-size: var(--dd-font-size-lg);
		text-align: center;
	}

	.notice {
		padding: var(--dd-space-sm) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-typing-current-frame);
		border-radius: var(--dd-radius-md);
		font-weight: var(--dd-font-weight-bold);
		text-align: center;
	}

	/* Smaller keys, so that the games below stay in view on a laptop screen. */
	.keys {
		--dd-size-key-unit: var(--dd-size-key-unit-compact);
		display: grid;
		justify-self: stretch;
		gap: var(--dd-space-sm);
		justify-items: center;
	}

	.keys h2 {
		font-size: var(--dd-font-size-lg);
		color: var(--dd-color-text-secondary);
	}

	/* The keyboard and, beside it, how to press the keys; one under the other on a narrow page. */
	.keys-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: var(--dd-space-md) var(--dd-space-xl);
		inline-size: 100%;
	}

	.board {
		flex: 2 1 var(--dd-size-text-zone-min);
		min-inline-size: 0;
	}

	.beside {
		display: grid;
		flex: 1 1 var(--dd-size-text-zone-side-min);
		gap: var(--dd-space-sm);
		justify-items: center;
	}

	.hints {
		display: grid;
		gap: var(--dd-space-xs);
		justify-items: center;
		margin: 0;
		padding: 0;
		list-style: none;
		text-align: center;
	}

	/* Several keys of one hand: written like the hint of a single key. */
	.finger-hint {
		color: var(--dd-color-text-primary);
		font-size: var(--dd-font-size-xl);
		font-weight: var(--dd-font-weight-bold);
		line-height: var(--dd-line-height-tight);
	}

	.choice {
		display: grid;
		gap: var(--dd-space-sm);
		justify-items: center;
		inline-size: 100%;
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
