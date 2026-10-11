<script lang="ts">
	import type { StarCount } from '$lib/engine/progression/types';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
	import Companion from '$lib/ui/components/Companion.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import Stars from '$lib/ui/components/Stars.svelte';
	import { keyName } from '$lib/ui/components/names';
	import { isOne } from '$lib/ui/plural';
	import type { ResultSummary } from './summary';

	interface Props {
		stars: StarCount;
		summary: ResultSummary;
		/** The lesson that follows when it is open, `null` otherwise. */
		hasOpenNext: boolean;
		/** Last lesson of the world, passed. */
		worldDone: boolean;
		suggestBreak: boolean;
		saveFailed: boolean;
		onnext: () => void;
		onreplay: () => void;
		onmap: () => void;
		onbreak: () => void;
	}

	let {
		stars,
		summary,
		hasOpenNext,
		worldDone,
		suggestBreak,
		saveFailed,
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
	const SPACE = ' ';

	function keyText(char: string): string {
		return char === SPACE ? (keyName('Space') ?? char) : char.toLocaleUpperCase();
	}

	const accuracy = $derived(
		isOne(summary.correct)
			? m.play_result_accuracy_one({ correct: summary.correct, total: summary.total })
			: m.play_result_accuracy_other({ correct: summary.correct, total: summary.total })
	);
	const nextIsPrimary = $derived(hasOpenNext && !suggestBreak);
	const replayIsPrimary = $derived(!hasOpenNext && !suggestBreak);
</script>

<ScreenFrame title={HEADLINES[stars]?.() ?? ''}>
	<div class="hero">
		<Companion mood={stars > 0 ? 'cheer' : 'happy'} />
		<Stars count={stars} />
	</div>
	<p class="note">{NOTES[stars]?.()}</p>

	<ul class="facts">
		<li>{accuracy}</li>
		{#if summary.bestChar !== null}
			<li>{m.play_result_best({ key: keyText(summary.bestChar) })}</li>
		{/if}
		{#if summary.tameChar !== null}
			<li>{m.play_result_tame({ key: keyText(summary.tameChar) })}</li>
		{/if}
	</ul>

	{#if worldDone}
		<p class="encourage">{m.play_result_world_done()}</p>
	{:else if !hasOpenNext}
		<p class="encourage">{m.play_result_retry()}</p>
	{/if}

	{#if saveFailed}
		<p class="warning" role="alert">{m.play_result_save_error()}</p>
	{/if}

	{#if suggestBreak}
		<section class="break" aria-labelledby="result-break-title">
			<h2 id="result-break-title">{m.play_break_suggest()}</h2>
			<p>{m.play_break_suggest_detail()}</p>
			<Button size="lg" onclick={onbreak}>{m.play_break_button()}</Button>
		</section>
	{/if}

	<div class="actions">
		{#if hasOpenNext}
			<Button variant={nextIsPrimary ? 'primary' : 'secondary'} onclick={onnext}>
				{m.play_result_next()}
			</Button>
		{/if}
		<Button variant={replayIsPrimary ? 'primary' : 'secondary'} onclick={onreplay}>
			{m.play_result_replay()}
		</Button>
		<Button variant="secondary" onclick={onmap}>{m.play_result_map()}</Button>
	</div>
</ScreenFrame>

<style>
	.hero {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: var(--dd-space-lg);
	}

	.note {
		font-size: var(--dd-font-size-xl);
	}

	.facts {
		display: grid;
		gap: var(--dd-space-xs);
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: var(--dd-font-size-lg);
	}

	.facts li:first-child {
		font-weight: var(--dd-font-weight-bold);
	}

	.encourage {
		font-size: var(--dd-font-size-lg);
		color: var(--dd-color-text-secondary);
	}

	.warning {
		color: var(--dd-color-error-text);
		font-weight: var(--dd-font-weight-bold);
	}

	.break {
		display: grid;
		gap: var(--dd-space-sm);
		justify-items: center;
		padding: var(--dd-space-lg);
		border-width: var(--dd-border-width-target);
		border-style: solid;
		border-color: var(--dd-color-accent-base);
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-surface-raised);
	}

	.break h2 {
		font-size: var(--dd-font-size-2xl);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--dd-space-md);
	}
</style>
