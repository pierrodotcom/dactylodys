<script lang="ts">
	import type { SoundPlayer } from '$lib/audio';
	import type { StarCount } from '$lib/engine/progression/types';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import Button from '$lib/ui/components/Button.svelte';
	import Companion from '$lib/ui/components/Companion.svelte';
	import Confetti from '$lib/ui/components/Confetti.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import Stars from '$lib/ui/components/Stars.svelte';
	import { readDurationToken } from '$lib/ui/motion';
	import { isOne } from '$lib/ui/plural';
	import { keyLabel } from './companion';
	import {
		resultActions,
		resultSentence,
		type PlayFacts,
		type ResultPlan,
		type ResultSentence
	} from './lesson-outcome';
	import Parade from './Parade.svelte';
	import type { ResultSummary } from './summary';

	interface Props {
		stars: StarCount;
		summary: ResultSummary;
		facts: PlayFacts;
		plan: ResultPlan;
		saveFailed: boolean;
		/** Which dance the companion does, in the order of the lessons. */
		dance: number;
		/** The day of the play, written under the souvenir photo. */
		date: Date;
		/** Lessons of the world: as many baby dinos march past when it is done. */
		worldLessons: number;
		/** Calm motion: the stars fade in, no confetti. */
		still: boolean;
		sounds: SoundPlayer;
		onnext: () => void;
		onreplay: () => void;
		onmap: () => void;
		onbreak: () => void;
	}

	let {
		stars,
		summary,
		facts,
		plan,
		saveFailed,
		dance,
		date,
		worldLessons,
		still,
		sounds,
		onnext,
		onreplay,
		onmap,
		onbreak
	}: Props = $props();

	const HEADLINES = [
		m.play_result_headline_0,
		m.play_result_headline_1,
		m.play_result_headline_2,
		m.play_result_headline_3
	];
	const NOTES = [
		m.play_result_note_0,
		m.play_result_note_1,
		m.play_result_note_2,
		m.play_result_note_3
	];
	const SENTENCES: Readonly<Record<Exclude<ResultSentence, 'note'>, () => string>> = {
		'retry-close': m.play_result_retry_close,
		'retry-far': m.play_result_retry,
		'world-done': m.play_result_world_done,
		'race-child-accurate': m.play_result_race_child,
		'race-child': m.play_result_race_child_neutral,
		'race-ghost': m.play_result_race_ghost,
		almost: m.play_result_almost,
		perfect: m.play_result_note_perfect
	};
	/** Where the keys go in the sentence of the replay, to draw them as keys; never in a message. */
	const KEYS_SLOT = '';
	const DELAY_TOKEN = '--dd-duration-reward-delay';
	const BEAT_TOKEN = '--dd-duration-beat';

	const photoDate = $derived(
		new Intl.DateTimeFormat(getLocale(), { dateStyle: 'long' }).format(date)
	);

	// One chime per star, as each one pops in.
	$effect(() => {
		const delay = readDurationToken(DELAY_TOKEN);
		const beat = readDurationToken(BEAT_TOKEN);
		const timers = Array.from({ length: stars }, (_, index) =>
			setTimeout(() => sounds.play('star'), delay + beat * index)
		);
		return () => timers.forEach(clearTimeout);
	});

	/** A key as the child sees it: a letter as a capital, Space and Enter by their names. */
	function keyText(char: string): string {
		return keyLabel(char, m.ui_key_space(), getLocale(), m.ui_key_enter());
	}

	const accuracy = $derived(
		isOne(summary.correct)
			? m.play_result_accuracy_one({ correct: summary.correct, total: summary.total })
			: m.play_result_accuracy_other({ correct: summary.correct, total: summary.total })
	);
	const sentence = $derived(resultSentence(plan, facts));
	const sentenceText = $derived(
		sentence === 'note' ? (NOTES[stars]?.() ?? '') : SENTENCES[sentence]()
	);
	const actions = $derived(resultActions(plan, facts));

	/**
	 * The sentence of the replay that tames keys, cut where the keys go: they are drawn as keys,
	 * joined as the language joins a list (« V et B »).
	 */
	const tameSentence = $derived.by(() => {
		if (plan.tame.length === 0) return null;
		const keys = new Intl.ListFormat(getLocale(), { style: 'long', type: 'conjunction' })
			.formatToParts(plan.tame.map(keyText))
			.map((part) => ({ key: part.type === 'element', text: part.value }));
		const [before = '', after = ''] = m
			.play_result_consolidate({ keys: KEYS_SLOT })
			.split(KEYS_SLOT);
		return { before, keys, after };
	});
</script>

<ScreenFrame
	title={HEADLINES[stars]?.() ?? ''}
	wide
	back={{ label: m.play_result_map(), onclick: onmap }}
>
	<div class="step" data-result-step="result">
		<div class="summary">
			<figure class="photo" data-still={still || undefined}>
				<div class="hero">
					<Companion mood={stars > 0 ? 'cheer' : 'happy'} {dance} />
					<div class="stars-zone">
						{#if stars > 0 && !still}
							<Confetti />
						{/if}
						<Stars count={stars} almost={facts.almost} celebrate />
					</div>
				</div>
				<figcaption class="date">{m.play_result_photo_date({ date: photoDate })}</figcaption>
			</figure>
			<div class="details">
				<p
					class="sentence"
					data-sentence={sentence}
					data-race={sentence.startsWith('race-') ? facts.race : undefined}
				>
					{sentenceText}
				</p>
				{#if sentence === 'world-done' && !still}
					<Parade count={worldLessons} />
				{/if}
				<ul class="facts">
					<li>{accuracy}</li>
					{#if summary.bestChar !== null}
						<li>{m.play_result_best({ key: keyText(summary.bestChar) })}</li>
					{/if}
					{#if summary.tameChar !== null}
						<li>{m.play_result_tame({ key: keyText(summary.tameChar) })}</li>
					{/if}
				</ul>
			</div>
		</div>

		{#if saveFailed}
			<p class="warning" role="alert">{m.play_result_save_error()}</p>
		{/if}

		{#if facts.suggestBreak}
			<p class="break">
				<strong>{m.play_break_suggest()}</strong>
				<span>{m.play_break_suggest_detail()}</span>
			</p>
		{/if}

		<div class="actions">
			{#each actions as action (action)}
				{@const variant = action === plan.primary ? 'primary' : 'secondary'}
				{#if action === 'break'}
					<Button {variant} onclick={onbreak}>{m.play_break_button()}</Button>
				{:else if action === 'next'}
					<Button {variant} onclick={onnext}>{m.play_result_next()}</Button>
				{:else if tameSentence}
					<Button {variant} onclick={onreplay} data-result-replay>
						<span class="tame"
							>{tameSentence.before}{#each tameSentence.keys as part, index (index)}{#if part.key}<kbd
										class="key">{part.text}</kbd
									>{:else}{part.text}{/if}{/each}{tameSentence.after}</span
						>
					</Button>
				{:else}
					<Button {variant} onclick={onreplay} data-result-replay>{m.play_result_replay()}</Button>
				{/if}
			{/each}
		</div>
	</div>
</ScreenFrame>

<style>
	.step {
		display: grid;
		gap: var(--dd-space-lg);
		justify-items: center;
		inline-size: 100%;
	}

	/* The photo and what the play says side by side on a laptop: the buttons stay in view. */
	.summary {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: var(--dd-space-lg);
		inline-size: 100%;
	}

	.hero {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: var(--dd-space-lg);
	}

	.stars-zone {
		position: relative;
	}

	/* A souvenir photo: a white frame, a little askew, with the day of the play. */
	.photo {
		display: grid;
		justify-items: center;
		gap: var(--dd-space-xs);
		margin: 0;
		padding: var(--dd-space-md) var(--dd-space-md) var(--dd-space-sm);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-raised);
		box-shadow: var(--dd-shadow-md);
		rotate: -2deg;
	}

	.date {
		color: var(--dd-color-text-secondary);
		font-size: var(--dd-font-size-lg);
		font-weight: var(--dd-font-weight-bold);
	}

	.details {
		display: grid;
		flex: 1 1 var(--dd-size-panel-max);
		gap: var(--dd-space-sm);
		justify-items: center;
		max-inline-size: var(--dd-size-panel-max);
	}

	.sentence {
		font-size: var(--dd-font-size-lg);
		font-weight: var(--dd-font-weight-bold);
	}

	.facts {
		display: grid;
		gap: var(--dd-space-xs);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.facts li:first-child {
		font-weight: var(--dd-font-weight-bold);
	}

	.warning {
		color: var(--dd-color-error-text);
		font-weight: var(--dd-font-weight-bold);
	}

	.break {
		color: var(--dd-color-text-secondary);
	}

	.break strong {
		color: var(--dd-color-text-primary);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--dd-space-md);
	}

	/* A key named on the replay is drawn as a key, like on the keyboard. */
	.key {
		display: inline-block;
		min-inline-size: calc(var(--dd-font-size-lg) * 1.4);
		padding: 0 var(--dd-space-xs);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: currentColor;
		border-radius: var(--dd-radius-sm);
		font-family: inherit;
		font-size: inherit;
		text-align: center;
	}
</style>
