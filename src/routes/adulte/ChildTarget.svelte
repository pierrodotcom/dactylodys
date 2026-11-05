<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { HandwritingSample, Profile } from '$lib/state/types';
	import Button from '$lib/ui/components/Button.svelte';
	import { isOne } from '$lib/ui/plural';
	import type { AdultRules } from './adult-rules';
	import type { Formatters } from './format';
	import { keyboardSpeed, readHandwritingWords, targetStatus } from './target';

	interface Props {
		profile: Profile;
		rules: AdultRules;
		format: Formatters;
		handwriting: HandwritingSample | null;
		/** Keeps a new handwriting speed; `false` when the device refused to store it. */
		onmeasure: (wordsPerMinute: number) => Promise<boolean>;
	}

	let { profile, rules, format, handwriting, onmeasure }: Props = $props();

	const ONE_DECIMAL = 1;

	let words = $state('');
	let problem = $state('');
	let status = $state('');

	const counted = $derived(Math.min(profile.sessions.length, rules.keyboardSpeedSessions));
	const keyboard = $derived(keyboardSpeed(profile.sessions, rules.keyboardSpeedSessions));
	const standing = $derived(targetStatus(keyboard, handwriting?.wordsPerMinute ?? null));

	async function save(event: SubmitEvent) {
		event.preventDefault();
		status = '';
		const value = readHandwritingWords(words, rules.handwritingMinWords, rules.handwritingMaxWords);
		if (value === null) {
			problem = m.adult_measure_invalid({
				min: rules.handwritingMinWords,
				max: rules.handwritingMaxWords
			});
			return;
		}
		problem = '';
		const ok = await onmeasure(value);
		status = ok ? m.adult_measure_saved() : m.adult_measure_failed();
		if (ok) words = '';
	}
</script>

<section class="target" aria-labelledby="target-title" data-child-target>
	<h2 id="target-title">{m.adult_target_title()}</h2>
	<p>{m.adult_target_goal()}</p>
	<ul class="speeds">
		<li data-target-hand>
			{handwriting
				? m.adult_target_hand({
						speed: format.number(handwriting.wordsPerMinute, ONE_DECIMAL),
						date: format.date(handwriting.measuredAt)
					})
				: m.adult_target_hand_none()}
		</li>
		<li data-target-keyboard>
			{#if keyboard === null}
				{m.adult_target_keyboard_none()}
			{:else if isOne(counted)}
				{m.adult_target_keyboard_one({ speed: format.number(keyboard, ONE_DECIMAL) })}
			{:else}
				{m.adult_target_keyboard_other({
					speed: format.number(keyboard, ONE_DECIMAL),
					count: counted
				})}
			{/if}
		</li>
	</ul>
	{#if standing === 'reached'}
		<p data-target-status="reached">{m.adult_target_reached()}</p>
	{:else if standing === 'below'}
		<p data-target-status="below">{m.adult_target_below()}</p>
	{/if}
	<p class="note">{m.adult_target_slow_phase()}</p>

	<form class="measure" onsubmit={save}>
		<h3>{m.adult_measure_title()}</h3>
		<ol>
			<li>{m.adult_measure_step_1()}</li>
			<li>{m.adult_measure_step_2()}</li>
			<li>{m.adult_measure_step_3()}</li>
		</ol>
		<label class="field">
			<span>{m.adult_measure_label()}</span>
			<input
				bind:value={words}
				type="text"
				inputmode="numeric"
				autocomplete="off"
				data-measure-words
			/>
		</label>
		{#if problem}
			<p class="problem" role="alert">{problem}</p>
		{/if}
		<Button type="submit">{m.adult_measure_save()}</Button>
		<p role="status">{status}</p>
	</form>
</section>

<style>
	.target,
	.measure {
		display: grid;
		gap: var(--dd-space-md);
		justify-items: start;
		text-align: start;
	}

	h2 {
		font-size: var(--dd-font-size-xl);
	}

	h3 {
		font-size: var(--dd-font-size-lg);
	}

	.speeds,
	ol {
		display: grid;
		gap: var(--dd-space-xs);
		margin: 0;
	}

	.note {
		color: var(--dd-color-text-secondary);
	}

	.field {
		display: grid;
		gap: var(--dd-space-xs);
		font-weight: var(--dd-font-weight-bold);
	}

	input {
		min-block-size: var(--dd-size-touch-target-min);
		inline-size: var(--dd-size-control-min);
		padding: var(--dd-space-sm) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-raised);
		color: var(--dd-color-text-primary);
		font-family: inherit;
		font-size: var(--dd-font-size-lg);
	}

	.problem {
		color: var(--dd-color-error-text);
		font-weight: var(--dd-font-weight-bold);
	}
</style>
