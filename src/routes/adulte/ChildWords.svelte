<script lang="ts">
	import { readAdultWords, type AdultWordsReading } from '$lib/engine/free-practice/words';
	import { buildCharIndex } from '$lib/keyboard/layout';
	import { loadLayout } from '$lib/keyboard/registry';
	import type { CharIndex } from '$lib/keyboard/types';
	import { m } from '$lib/paraglide/messages.js';
	import type { Profile } from '$lib/state/types';
	import Button from '$lib/ui/components/Button.svelte';
	import { isElidedBefore } from '$lib/ui/elision';
	import { isOne } from '$lib/ui/plural';
	import type { FreePracticeRules } from '../jouer/free-practice';
	import type { Formatters } from './format';

	interface Props {
		profile: Profile;
		rules: FreePracticeRules;
		format: Formatters;
		/** Keeps the words in place of the previous ones; `false` when the device refused them. */
		onsave: (words: readonly string[]) => Promise<boolean>;
	}

	let { profile, rules, format, onsave }: Props = $props();

	const elided = $derived(isElidedBefore(profile.name));

	let index = $state.raw<CharIndex | null>(null);
	let keyboardFailed = $state(false);
	let text = $state('');
	let reading = $state.raw<AdultWordsReading | null>(null);
	let status = $state('');
	let failed = $state(false);

	/** Loaded again only when the layout changes, not each time the profile is saved. */
	const layoutId = $derived(profile.settings.layoutId);

	// The words are checked against the keyboard of this child, never another one.
	$effect(() => {
		let cancelled = false;
		index = null;
		keyboardFailed = false;
		loadLayout(layoutId).then(
			(layout) => {
				if (!cancelled) index = buildCharIndex(layout);
			},
			() => {
				if (!cancelled) keyboardFailed = true;
			}
		);
		return () => {
			cancelled = true;
		};
	});

	const refused = $derived(
		reading === null
			? ''
			: format.list(
					reading.unproducible.map((entry) =>
						m.adult_words_refused_word({ word: entry.word, chars: format.list(entry.chars) })
					)
				)
	);

	async function keep(words: readonly string[]) {
		failed = false;
		status = '';
		const ok = await onsave(words);
		failed = !ok;
		if (!ok) return;
		if (words.length === 0) status = m.adult_words_cleared();
		else if (isOne(words.length)) status = m.adult_words_saved_one({ count: words.length });
		else status = m.adult_words_saved_other({ count: words.length });
	}

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (index === null) return;
		const read = readAdultWords(text, index, rules);
		reading = read;
		await keep(read.words);
		if (!failed) text = '';
	}

	async function clear() {
		reading = null;
		await keep([]);
	}
</script>

<section class="words" aria-labelledby="words-title" data-child-words>
	<h2 id="words-title">{m.adult_words_title()}</h2>
	<p>{m.adult_words_intro({ name: profile.name })}</p>
	<p data-words-current>
		{profile.adultWords.length === 0
			? m.adult_words_current_none()
			: m.adult_words_current({ words: format.list(profile.adultWords) })}
	</p>

	{#if keyboardFailed}
		<p class="problem" role="alert">
			{elided
				? m.adult_words_keyboard_failed_elided({ name: profile.name })
				: m.adult_words_keyboard_failed({ name: profile.name })}
		</p>
	{:else}
		<form class="form" onsubmit={save}>
			<label class="field">
				<span>{m.adult_words_label()}</span>
				<textarea
					bind:value={text}
					rows="4"
					autocomplete="off"
					spellcheck="false"
					aria-describedby="words-hint"
					data-words-input></textarea>
			</label>
			<p id="words-hint" class="note">
				{m.adult_words_hint({ max: rules.maxWords, length: rules.maxWordLength })}
			</p>
			<div class="actions">
				<Button type="submit" disabled={index === null} data-words-save>
					{m.adult_words_save()}
				</Button>
				{#if profile.adultWords.length > 0}
					<Button variant="secondary" onclick={clear} data-words-clear>
						{m.adult_words_clear()}
					</Button>
				{/if}
			</div>
		</form>
	{/if}

	<!-- Said as soon as the words are saved: what was kept, and what was not and why. -->
	<div class="outcome" aria-live="polite" data-words-outcome>
		{#if failed}
			<p class="problem">{m.adult_words_failed()}</p>
		{:else if status}
			<p data-words-status>{status}</p>
		{/if}
		{#if reading && reading.unproducible.length > 0}
			<p data-words-refused>
				{elided
					? m.adult_words_refused_elided({ name: profile.name, words: refused })
					: m.adult_words_refused({ name: profile.name, words: refused })}
			</p>
		{/if}
		{#if reading && reading.tooLong.length > 0}
			<p data-words-too-long>
				{m.adult_words_too_long({
					max: rules.maxWordLength,
					words: format.list(reading.tooLong)
				})}
			</p>
		{/if}
		{#if reading && reading.leftOver > 0}
			<p data-words-left-over>
				{isOne(reading.leftOver)
					? m.adult_words_left_over_one({ count: reading.leftOver, max: rules.maxWords })
					: m.adult_words_left_over_other({ count: reading.leftOver, max: rules.maxWords })}
			</p>
		{/if}
	</div>
</section>

<style>
	.words,
	.form,
	.outcome {
		display: grid;
		gap: var(--dd-space-md);
		justify-items: start;
		text-align: start;
	}

	.form,
	.field,
	textarea {
		inline-size: 100%;
	}

	h2 {
		font-size: var(--dd-font-size-xl);
	}

	.field {
		display: grid;
		gap: var(--dd-space-xs);
		font-weight: var(--dd-font-weight-bold);
	}

	textarea {
		min-block-size: var(--dd-size-touch-target-min);
		padding: var(--dd-space-sm) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-raised);
		color: var(--dd-color-text-primary);
		font-family: inherit;
		font-size: var(--dd-font-size-lg);
		font-weight: var(--dd-font-weight-regular);
		resize: vertical;
	}

	.note {
		color: var(--dd-color-text-secondary);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dd-space-sm);
	}

	.problem {
		color: var(--dd-color-error-text);
		font-weight: var(--dd-font-weight-bold);
	}
</style>
