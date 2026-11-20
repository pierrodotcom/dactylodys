<script lang="ts">
	import { untrack } from 'svelte';
	import { lessonIntro } from '$lib/engine/progression/definition';
	import type { GuideMode, LessonDefinition } from '$lib/engine/progression/types';
	import { fingerForKey, isReducedFingering } from '$lib/keyboard/fingering';
	import type { Finger, Hand, KeyPress, ModifierLevel } from '$lib/keyboard/types';
	import type { HandDrawing } from '$lib/state/types';
	import { sayInTurn } from '$lib/audio/voice-sequence';
	import type { VoicePlayer } from '$lib/audio/voice-types';
	import type { RewardDefinition } from '$lib/engine/rewards';
	import RewardPicture from '$lib/ui/companion/RewardPicture.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import FingerHint from '$lib/ui/components/FingerHint.svelte';
	import { pressLabel } from '$lib/ui/components/key-labels';
	import KeyboardView from '$lib/ui/components/KeyboardView.svelte';
	import ListenButton from '$lib/ui/components/ListenButton.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import { revealBelow } from '$lib/ui/focus';
	import { readDurationToken } from '$lib/ui/motion';
	import { isOne } from '$lib/ui/plural';
	import type { KeyboardAssets } from './assets';
	import type { GameOption } from './game-choice';
	import GamePicker from './GamePicker.svelte';
	import { headingCount, introLines, introShown, introSteps, type IntroLine } from './intro-keys';
	import { introText, silencing } from './intro-text';
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
		/** How the hands rest on the keyboard, as the child chose: filled or as a contour. */
		handDrawing: HandDrawing;
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
	/** How long the hand takes to show one key (`HandGuide`): out, held, back. */
	const MOVE_TOKEN = '--dd-duration-guide-move';
	const HOLD_TOKEN = '--dd-duration-guide-hold';

	let {
		lesson,
		fresh,
		number,
		assets,
		games,
		gameId,
		guide,
		handDrawing,
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

	// The sentence of the platform of the keyboard: a Mac has some keys elsewhere (P-09). Its own
	// sentence is silent until it is recorded: the voice only says what was recorded.
	const intro = $derived(lessonIntro(lesson, assets.layout.platform));
	// A reduced fingering (ADR-075, choice 6): the instruction, written for ten fingers, may name a
	// finger the child leaves folded. The screen shows the short sentences instead, and the voice
	// never says the instruction whole: only the short sentences, once they are all recorded.
	const written = $derived(introText(lesson, assets.layout.platform, assets.fingering));
	const reduced = $derived(isReducedFingering(assets.fingering));

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
	const handShown = $derived(guide !== 'none' && presses.length > 0);

	/** The short sentence being said: the hand shows its key alone; `null`: every key in turn. */
	let step = $state<number | null>(null);
	/** Counts the times the short sentences start: the hand starts over with them. */
	let round = $state(0);
	const steps = $derived(introSteps(lesson, presses));
	// Read from the lesson alone: the voice starts over only when the lesson or the voice changes.
	const sentences = $derived((lesson.steps ?? []).map((item) => item.text));
	// Once its short sentences are all recorded, the instruction is said one at a time, each while
	// the hand shows its key (audit P-13): a sentence never ends before the hand is back. Until then,
	// the whole sentence, as before.
	const speaker = $derived(
		sayInTurn(reduced ? silencing(voice, intro) : voice, {
			text: intro,
			sentences,
			onsentence: (index) => {
				if (index === 0) round += 1;
				step = index;
			},
			minSentenceMs: handShown
				? readDurationToken(MOVE_TOKEN) * 2 + readDurationToken(HOLD_TOKEN)
				: 0
		})
	);
	const stepPress = $derived(step === null ? null : (steps[step]?.press ?? null));
	const stepChar = $derived(step === null ? undefined : steps[step]?.char);

	// The child does not read: the instruction is said once as the lesson opens. What the sentences
	// change on screen while they are said never says them again.
	$effect(() => {
		const said = intro;
		const saying = speaker;
		untrack(() => void saying.speak(said));
		return () => saying.stop();
	});

	const hands = $derived.by(() => {
		if (!handShown) return null;
		if (step !== null) {
			return {
				presses: stepPress === null ? [] : [stepPress],
				trigger: `${lesson.id}#${round}#${step}`
			};
		}
		return { presses: presses.map((entry) => entry.press), trigger: lesson.id, repeat: true };
	});

	function handLine(line: Extract<IntroLine, { kind: 'hand' }>): string {
		return HAND_LINES[line.level]({
			keys: line.chars.join(KEY_SEPARATOR),
			hand: HAND_NAMES[line.hand]()
		});
	}

	/**
	 * The little key before the line of a key: its sign, in the colour of its finger on the keyboard.
	 * The line names the finger: the colour only links it to the keyboard. `null` for a key printed
	 * without a sign (Space, Backspace): its name is in the line.
	 */
	function keycapOf(press: KeyPress): { label: string; finger: Finger } | null {
		const label = pressLabel(assets.layout, press);
		const finger = fingerForKey(assets.fingering, press.code);
		return label && finger !== null ? { label, finger } : null;
	}
</script>

<ScreenFrame
	title={lesson.title}
	focusHeading={false}
	wide
	back={{ label: m.play_intro_back(), onclick: onback }}
>
	<!-- On the row of the way out, at its right: what passing the lesson earns. -->
	{#snippet aside()}
		{#if prize}
			<div class="prize" data-prize={prize.id} data-tour={lesson.tour !== undefined || undefined}>
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
	{/snippet}

	<p class="number">
		{lesson.tour !== undefined
			? m.play_lesson_tour()
			: number === null
				? m.play_lesson_detour()
				: m.play_lesson_number({ number })}
	</p>

	<!--
		Three cards, one under the other: the instruction, the keys, the games. On a laptop screen the
		page opens on the instruction, the top of the games in view (the bar of the player stays above).
	-->
	<div class="cards">
		<section
			class="card instruction"
			aria-labelledby="intro-instruction-heading"
			bind:this={instruction}
		>
			<h2 id="intro-instruction-heading" class="dd-visually-hidden">
				{m.play_intro_instruction_heading()}
			</h2>
			<ListenButton text={intro} player={speaker} />
			{#if written.kind === 'steps'}
				<!-- One short sentence a line, as the voice says them. -->
				<ul class="intro intro-steps" data-intro-steps>
					{#each written.sentences as sentence (sentence)}
						<li>{sentence}</li>
					{/each}
				</ul>
			{:else}
				<p class="intro" data-intro>{written.text}</p>
			{/if}
		</section>

		{#if shown}
			<section
				class="card keys"
				aria-labelledby="intro-keys-heading"
				data-intro-keys={shown.kind}
				data-intro-step={stepChar}
			>
				<h2 id="intro-keys-heading">{heading}</h2>
				<!--
					The keyboard, and beside it how to press the keys; one under the other on a narrow page.
					The keyboard is a picture only (screen readers skip it): the lines say the same.
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
							{handDrawing}
							{still}
						/>
					</div>
					<div class="beside">
						<ul class="hints">
							{#each lines as line, index (index)}
								<li>
									{#if line.kind === 'key'}
										{@const keycap = keycapOf(line.key.press)}
										{#if keycap}
											<span class="keycap" data-finger={keycap.finger} aria-hidden="true">
												{keycap.label}
											</span>
										{/if}
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
		{/if}

		<section
			class="card choice"
			aria-labelledby="intro-games-heading"
			{@attach revealBelow(() => instruction)}
		>
			<h2 id="intro-games-heading">{m.play_game_choice_legend()}</h2>
			{#if shown === null && erasingNew}
				<!-- Right above the games, where the screen settles: the child reads it before choosing. -->
				<p class="notice" data-erasing-notice>{m.play_intro_erasing()}</p>
			{/if}

			<GamePicker
				{games}
				proposed={gameId}
				reveal={null}
				tiles
				onplay={(id) => onplay(id, canRace && race)}
			/>

			{#if canRace}
				<RaceChoice checked={race} onchange={(value) => (race = value)} />
			{/if}

			{#if loadFailed}
				<p class="problem" role="alert">{m.play_game_load_error()}</p>
			{/if}
		</section>
	</div>
</ScreenFrame>

<style>
	/*
	 * Small, above the title (it is read after it): the frame sets its rows far apart, this one stays
	 * close to the title.
	 */
	.number {
		order: -1;
		margin-block-end: calc(var(--dd-space-md) * -1);
		color: var(--dd-color-text-secondary);
		font-weight: var(--dd-font-weight-bold);
	}

	.prize {
		display: flex;
		align-items: center;
		gap: var(--dd-space-sm);
		padding: var(--dd-space-xs) var(--dd-space-md) var(--dd-space-xs) var(--dd-space-xs);
		border-width: var(--dd-border-width-thin);
		border-style: solid;
		border-color: var(--dd-color-border-subtle);
		border-radius: var(--dd-radius-pill);
		background-color: var(--dd-color-surface-sunken);
		color: var(--dd-color-text-secondary);
		font-weight: var(--dd-font-weight-bold);
	}

	/* What a grand tour asks takes two lines or three: a rounded box rather than a pill. */
	.prize[data-tour] {
		border-radius: var(--dd-radius-lg);
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

	.cards {
		display: grid;
		gap: var(--dd-space-md);
		min-inline-size: 0;
	}

	/* A border, not only a background: the cards stay apart in forced colours. */
	.card {
		display: grid;
		gap: var(--dd-space-sm);
		min-inline-size: 0;
		padding: var(--dd-space-md) var(--dd-space-lg);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-subtle);
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-surface-raised);
	}

	.card h2 {
		font-size: var(--dd-font-size-lg);
	}

	/* Listen at the left of the instruction; above it on a narrow page. */
	.instruction {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--dd-space-sm) var(--dd-space-lg);
	}

	.intro {
		flex: 1 1 var(--dd-size-text-zone-side-min);
		font-size: var(--dd-font-size-lg);
	}

	.intro-steps {
		display: grid;
		gap: var(--dd-space-xs);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.notice {
		padding: var(--dd-space-sm) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-typing-current-frame);
		border-radius: var(--dd-radius-md);
		font-weight: var(--dd-font-weight-bold);
	}

	/* Smaller keys, so that the games below stay in view on a laptop screen. */
	.keys {
		--dd-size-key-unit: var(--dd-size-key-unit-compact);
	}

	.keys-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--dd-space-md) var(--dd-space-xl);
		min-inline-size: 0;
	}

	.board {
		flex: 2 1 var(--dd-size-text-zone-min);
		min-inline-size: 0;
	}

	/* A column, not a grid: the list of the fingers is held to its width on a narrow page. */
	.beside {
		display: flex;
		flex: 1 1 var(--dd-size-text-zone-side-min);
		flex-direction: column;
		gap: var(--dd-space-sm);
		align-items: start;
		max-inline-size: 100%;
	}

	/*
	 * The finger of a key is never cut: the list is as wide as its longest line, which widens the
	 * column beside the keyboard when it must; only a page narrower than that line makes it wrap.
	 */
	.hints {
		display: grid;
		gap: var(--dd-space-sm);
		inline-size: var(--dd-size-hint-line);
		max-inline-size: 100%;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.hints li {
		display: flex;
		align-items: center;
		gap: var(--dd-space-sm);
	}

	/* A key of the keyboard beside, in the colour of its finger; in forced colours, its frame. */
	.keycap {
		display: grid;
		flex: none;
		place-items: center;
		min-inline-size: var(--dd-size-key-unit);
		block-size: var(--dd-size-key-unit);
		padding-inline: var(--dd-space-xs);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-key-border);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-key-surface);
		color: var(--dd-color-key-text-on-finger);
		font-size: var(--dd-font-size-key);
		font-weight: var(--dd-font-weight-bold);
		line-height: var(--dd-line-height-tight);
	}

	.keycap[data-finger='left-pinky'] {
		background-color: var(--dd-color-finger-left-pinky);
	}

	.keycap[data-finger='left-ring'] {
		background-color: var(--dd-color-finger-left-ring);
	}

	.keycap[data-finger='left-middle'] {
		background-color: var(--dd-color-finger-left-middle);
	}

	.keycap[data-finger='left-index'] {
		background-color: var(--dd-color-finger-left-index);
	}

	.keycap[data-finger='left-thumb'] {
		background-color: var(--dd-color-finger-left-thumb);
	}

	.keycap[data-finger='right-thumb'] {
		background-color: var(--dd-color-finger-right-thumb);
	}

	.keycap[data-finger='right-index'] {
		background-color: var(--dd-color-finger-right-index);
	}

	.keycap[data-finger='right-middle'] {
		background-color: var(--dd-color-finger-right-middle);
	}

	.keycap[data-finger='right-ring'] {
		background-color: var(--dd-color-finger-right-ring);
	}

	.keycap[data-finger='right-pinky'] {
		background-color: var(--dd-color-finger-right-pinky);
	}

	/* Several keys of one hand: written like the hint of a single key (`FingerHint`). */
	.finger-hint {
		color: var(--dd-color-text-secondary);
		font-size: var(--dd-font-size-xl);
		font-weight: var(--dd-font-weight-regular);
		line-height: var(--dd-line-height-tight);
	}

	.problem {
		justify-self: start;
		padding: var(--dd-space-sm) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-oops-outline);
		border-radius: var(--dd-radius-md);
		font-weight: var(--dd-font-weight-bold);
	}
</style>
