<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { parseVoiceConfig } from '$lib/audio/voice-config';
	import { VOICE_CREDIT_MAX_LENGTH } from '$lib/audio/voice-recordings';
	import { processTake } from '$lib/audio/voice-signal';
	import {
		parseVoiceOrigin,
		voiceLocale,
		voiceTexts,
		type VoiceTextKind
	} from '$lib/audio/voice-texts';
	import { parseProgression } from '$lib/engine/progression/definition';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import Button from '$lib/ui/components/Button.svelte';
	import { isOne } from '$lib/ui/plural';
	import configData from '../../../../content/common/voice.json';
	import progressionData from '../../../../content/fr/progression/azerty-decouverte.json';
	import { buildVoiceArchive, recordedTexts } from './archive';
	import {
		decodeRecording,
		explainMicrophoneError,
		findSupportProblem,
		isLasting,
		readMicrophoneSupport,
		startRecording,
		type ActiveRecording,
		type MicrophoneProblem
	} from './microphone';
	import {
		createIndexedDbTakeStore,
		createMemoryTakeStore,
		type Take,
		type TakeStore
	} from './take-store';

	type Phase = 'idle' | 'starting' | 'recording' | 'processing';
	type ExportIssue = 'consent' | 'take';

	const config = parseVoiceConfig(configData);
	const progression = parseProgression(progressionData);
	const texts = voiceTexts(progression);
	const titles = new Map(
		progression.worlds.flatMap((world): [string, string][] => [
			[world.id, world.title],
			...world.lessons.map((lesson): [string, string] => [lesson.id, lesson.title])
		])
	);

	const MS_PER_SECOND = 1000;
	const REVOKE_DELAY_MS = 10_000;
	const MARKS = { missing: '○', recorded: '✓' } as const;
	const RECORD_BUTTON_ID = 'voix-record';
	const CLEAR_BUTTON_ID = 'voix-clear';
	const CANCEL_CLEAR_BUTTON_ID = 'voix-clear-cancel';
	const ORIGIN_LABELS: Readonly<Record<VoiceTextKind, (params: { title: string }) => string>> = {
		intro: m.dev_voix_origin_intro,
		opening: m.dev_voix_origin_opening,
		line: m.dev_voix_origin_line,
		ending: m.dev_voix_origin_ending
	};
	const PROBLEM_MESSAGES: Readonly<Record<MicrophoneProblem, () => string>> = {
		insecure: m.dev_voix_problem_insecure,
		unsupported: m.dev_voix_problem_unsupported,
		denied: m.dev_voix_problem_denied,
		missing: m.dev_voix_problem_missing,
		failed: m.dev_voix_problem_failed
	};
	const EXPORT_ISSUE_MESSAGES: Readonly<Record<ExportIssue, () => string>> = {
		consent: m.dev_voix_export_need_consent,
		take: m.dev_voix_export_need_take
	};

	let ready = $state(false);
	let position = $state(0);
	let takes = $state.raw<ReadonlyMap<string, Take>>(new Map());
	let phase = $state<Phase>('idle');
	let playing = $state(false);
	let notice = $state('');
	let problem = $state<MicrophoneProblem | null>(null);
	let storageNotice = $state('');
	let credit = $state('');
	let consent = $state(false);
	let exportIssue = $state<ExportIssue | null>(null);
	let exportedName = $state('');
	let exportError = $state('');
	let confirmingClear = $state(false);
	let clearNotice = $state('');
	let clearError = $state(false);

	let store: TakeStore | undefined;
	let recording: ActiveRecording | undefined;
	let recordingKey = '';
	let autoStop: ReturnType<typeof setTimeout> | undefined;
	let playback: { audio: HTMLAudioElement; url: string } | undefined;

	const current = $derived(texts[position]);
	const currentTake = $derived(current ? takes.get(current.key) : undefined);
	const recorded = $derived(recordedTexts(texts, takes).length);
	const remaining = $derived(texts.length - recorded);
	const firstMissing = $derived(texts.findIndex((text) => !takes.has(text.key)));
	const isIdle = $derived(phase === 'idle');
	const canRecord = $derived(ready && !isLasting(problem));
	const recordLabel = $derived(
		phase === 'recording' || phase === 'processing'
			? m.dev_voix_record_stop()
			: currentTake
				? m.dev_voix_record_again()
				: m.dev_voix_record()
	);

	function formatDuration(durationMs: number): string {
		return new Intl.NumberFormat(getLocale(), {
			style: 'unit',
			unit: 'second',
			unitDisplay: 'long',
			maximumFractionDigits: 1
		}).format(durationMs / MS_PER_SECOND);
	}

	function originLabel(origin: string): string {
		const parsed = parseVoiceOrigin(origin);
		const title = parsed ? titles.get(parsed.id) : undefined;
		return parsed && title !== undefined ? ORIGIN_LABELS[parsed.kind]({ title }) : origin;
	}

	function stopPlayback() {
		if (!playback) return;
		playback.audio.pause();
		URL.revokeObjectURL(playback.url);
		playback = undefined;
		playing = false;
	}

	function togglePlayback() {
		if (playing) {
			stopPlayback();
			notice = '';
			return;
		}
		if (!currentTake || !isIdle) return;
		const url = URL.createObjectURL(new Blob([currentTake.wav], { type: 'audio/wav' }));
		const audio = new Audio(url);
		playback = { audio, url };
		playing = true;
		notice = m.dev_voix_status_playing();
		const finish = () => {
			if (playback?.audio !== audio) return;
			stopPlayback();
			notice = '';
		};
		audio.addEventListener('ended', finish);
		audio.addEventListener('error', finish);
		audio.play().catch(finish);
	}

	async function beginRecording() {
		if (!current) return;
		stopPlayback();
		problem = null;
		storageNotice = '';
		phase = 'starting';
		notice = m.dev_voix_status_starting();
		try {
			recording = await startRecording();
		} catch (error) {
			problem = explainMicrophoneError(error);
			notice = '';
			phase = 'idle';
			return;
		}
		recordingKey = current.key;
		phase = 'recording';
		notice = m.dev_voix_status_recording();
		autoStop = setTimeout(() => void finishRecording(), config.maxTakeSeconds * MS_PER_SECOND);
	}

	async function finishRecording() {
		const active = recording;
		if (!active || phase !== 'recording') return;
		clearTimeout(autoStop);
		recording = undefined;
		phase = 'processing';
		notice = m.dev_voix_status_processing();
		try {
			const decoded = await decodeRecording(await active.stop());
			const processed = processTake(decoded.channels, decoded.sampleRate, config);
			if (processed === null) {
				notice = m.dev_voix_status_silent();
			} else {
				await keepTake({
					key: recordingKey,
					wav: processed.wav,
					durationMs: processed.durationMs,
					recordedAt: new Date().toISOString()
				});
				notice = m.dev_voix_status_saved({ duration: formatDuration(processed.durationMs) });
			}
		} catch {
			problem = 'failed';
			notice = '';
		} finally {
			phase = 'idle';
		}
	}

	/** A take that the browser cannot store is still kept for this visit: it can be exported. */
	async function keepTake(take: Take) {
		takes = new Map([...takes, [take.key, take]]);
		exportIssue = null;
		try {
			await store?.save(take);
		} catch {
			storageNotice = m.dev_voix_storage_failed();
		}
	}

	function toggleRecording() {
		if (phase === 'recording') void finishRecording();
		else if (phase === 'idle' && canRecord) void beginRecording();
	}

	function goTo(target: number) {
		if (!isIdle || target < 0 || target >= texts.length) return;
		stopPlayback();
		notice = '';
		position = target;
	}

	function download(bytes: Uint8Array<ArrayBuffer>, fileName: string) {
		const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
		const link = document.createElement('a');
		link.href = url;
		link.download = fileName;
		document.body.append(link);
		link.click();
		link.remove();
		setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
	}

	function exportArchive() {
		exportedName = '';
		exportError = '';
		exportIssue = !consent ? 'consent' : recorded === 0 ? 'take' : null;
		if (exportIssue !== null) return;
		try {
			const archive = buildVoiceArchive({
				texts,
				takes,
				locale: voiceLocale(progression),
				credit,
				exportedAt: new Date(),
				sampleRate: config.sampleRate
			});
			download(archive.bytes, archive.fileName);
			exportedName = archive.fileName;
		} catch (error) {
			exportError = error instanceof Error ? error.message : String(error);
		}
	}

	/** Buttons come and go with the question: the focus follows, so the keyboard is never left nowhere. */
	async function focusButton(id: string) {
		await tick();
		document.getElementById(id)?.focus();
	}

	function askToClear() {
		clearNotice = '';
		clearError = false;
		confirmingClear = true;
		void focusButton(CANCEL_CLEAR_BUTTON_ID);
	}

	function cancelClear() {
		confirmingClear = false;
		void focusButton(CLEAR_BUTTON_ID);
	}

	async function clearEverything() {
		stopPlayback();
		try {
			await store?.clear();
			takes = new Map();
			position = 0;
			notice = '';
			clearNotice = m.dev_voix_clear_done();
		} catch {
			clearError = true;
		}
		confirmingClear = false;
		// Once everything is erased the erase button is off: the next thing to do is to record.
		void focusButton(takes.size === 0 ? RECORD_BUTTON_ID : CLEAR_BUTTON_ID);
	}

	onMount(() => {
		let left = false;
		problem = findSupportProblem(readMicrophoneSupport());
		void (async () => {
			let opened: TakeStore;
			let kept: readonly Take[];
			try {
				opened = createIndexedDbTakeStore();
				kept = await opened.list();
			} catch {
				opened = createMemoryTakeStore();
				kept = [];
				storageNotice = m.dev_voix_storage_volatile();
			}
			if (left) {
				opened.close();
				return;
			}
			store = opened;
			takes = new Map(kept.map((take) => [take.key, take]));
			position = Math.max(0, firstMissing);
			ready = true;
		})();
		return () => {
			left = true;
			clearTimeout(autoStop);
			recording?.cancel();
			stopPlayback();
			store?.close();
		};
	});
</script>

<svelte:head>
	<title>{m.dev_voix_title()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main data-ready={ready}>
	<header>
		<h1>{m.dev_voix_title()}</h1>
		<p>{m.dev_voix_intro()}</p>
		<p class="hint">{m.dev_voix_tip()}</p>
		<p class="hint">{m.dev_voix_privacy_note()}</p>
	</header>

	{#if current}
		<section class="recorder" aria-labelledby="voix-text-heading">
			<div class="card" data-phase={phase} aria-live="polite" aria-atomic="true">
				<h2 id="voix-text-heading">
					{m.dev_voix_position({ position: position + 1, total: texts.length })}
				</h2>
				<p class="origin">{originLabel(current.origin)}</p>
				<p class="text" lang={progression.locale} data-testid="voice-text">{current.text}</p>
				<p class="take" data-testid="take-status" data-recorded={currentTake !== undefined}>
					<span aria-hidden="true">{currentTake ? MARKS.recorded : MARKS.missing}</span>
					{currentTake
						? m.dev_voix_take_done({ duration: formatDuration(currentTake.durationMs) })
						: m.dev_voix_take_none()}
				</p>
			</div>

			<p class="status" role="status" data-testid="recorder-status">{notice}</p>
			{#if problem}
				<p class="problem" role="alert" data-testid="microphone-problem">
					{PROBLEM_MESSAGES[problem]()}
				</p>
			{/if}
			{#if storageNotice}
				<p class="problem" role="alert">{storageNotice}</p>
			{/if}

			<div class="actions">
				<Button
					id={RECORD_BUTTON_ID}
					size="lg"
					disabled={!canRecord}
					aria-disabled={phase === 'starting' || phase === 'processing'}
					data-testid="record-button"
					onclick={toggleRecording}
				>
					{recordLabel}
				</Button>
				<Button
					variant="secondary"
					disabled={!currentTake || !isIdle}
					data-testid="replay-button"
					onclick={togglePlayback}
				>
					{playing ? m.dev_voix_replay_stop() : m.dev_voix_replay()}
				</Button>
			</div>

			<nav class="actions" aria-label={m.dev_voix_moves_label()}>
				<Button
					variant="secondary"
					disabled={!isIdle || position === 0}
					onclick={() => goTo(position - 1)}
				>
					{m.dev_voix_previous()}
				</Button>
				<Button
					variant="secondary"
					disabled={!isIdle || position === texts.length - 1}
					onclick={() => goTo(position + 1)}
				>
					{m.dev_voix_next()}
				</Button>
				<Button
					variant="quiet"
					disabled={!isIdle || firstMissing < 0 || firstMissing === position}
					onclick={() => goTo(firstMissing)}
				>
					{m.dev_voix_first_missing()}
				</Button>
			</nav>

			<p data-testid="voice-progress">
				{m.dev_voix_progress({ recorded, total: texts.length })}
				{#if remaining === 0}
					{m.dev_voix_remaining_none()}
				{:else if isOne(remaining)}
					{m.dev_voix_remaining_one({ count: remaining })}
				{:else}
					{m.dev_voix_remaining_other({ count: remaining })}
				{/if}
			</p>
		</section>
	{/if}

	<section aria-labelledby="voix-export-heading">
		<h2 id="voix-export-heading">{m.dev_voix_export_heading()}</h2>
		<label class="field">
			<span>{m.dev_voix_credit_label()}</span>
			<input
				type="text"
				autocomplete="off"
				maxlength={VOICE_CREDIT_MAX_LENGTH}
				aria-describedby="voix-credit-hint"
				bind:value={credit}
			/>
		</label>
		<p id="voix-credit-hint" class="hint">{m.dev_voix_credit_hint()}</p>
		<label class="check">
			<input
				type="checkbox"
				aria-invalid={exportIssue === 'consent'}
				aria-describedby={exportIssue === 'consent' ? 'voix-export-issue' : undefined}
				bind:checked={consent}
				onchange={() => (exportIssue = null)}
			/>
			<span>{m.dev_voix_consent_label()}</span>
		</label>
		<Button data-testid="export-button" onclick={exportArchive}>
			{m.dev_voix_export_button()}
		</Button>
		{#if exportIssue}
			<p id="voix-export-issue" class="problem" role="alert">
				{EXPORT_ISSUE_MESSAGES[exportIssue]()}
			</p>
		{/if}
		{#if exportError}
			<p class="problem" role="alert">{m.dev_voix_export_error({ detail: exportError })}</p>
		{/if}
		<p role="status">
			{#if exportedName}
				{m.dev_voix_export_done({ filename: exportedName })}
			{/if}
		</p>
		<p class="hint">{m.dev_voix_export_hint()}</p>
	</section>

	<section aria-labelledby="voix-clear-heading">
		<h2 id="voix-clear-heading">{m.dev_voix_clear_heading()}</h2>
		<p class="hint">{m.dev_voix_clear_hint()}</p>
		{#if confirmingClear}
			<div class="question" role="group" aria-labelledby="voix-clear-question">
				<p id="voix-clear-question">
					{isOne(takes.size)
						? m.dev_voix_clear_question_one({ count: takes.size })
						: m.dev_voix_clear_question_other({ count: takes.size })}
				</p>
				<div class="actions">
					<Button variant="secondary" id={CANCEL_CLEAR_BUTTON_ID} onclick={cancelClear}>
						{m.dev_voix_clear_cancel()}
					</Button>
					<Button variant="secondary" onclick={clearEverything}>
						{m.dev_voix_clear_confirm()}
					</Button>
				</div>
			</div>
		{:else}
			<Button
				variant="secondary"
				disabled={takes.size === 0 || !isIdle}
				id={CLEAR_BUTTON_ID}
				onclick={askToClear}
			>
				{m.dev_voix_clear_button()}
			</Button>
		{/if}
		<p role="status">{clearNotice}</p>
		{#if clearError}
			<p class="problem" role="alert">{m.dev_voix_clear_error()}</p>
		{/if}
	</section>
</main>

<style>
	main {
		display: grid;
		gap: var(--dd-space-2xl);
		max-inline-size: var(--dd-size-content-max);
		margin: auto;
		padding: var(--dd-space-lg);
	}

	header,
	section,
	.question {
		display: grid;
		gap: var(--dd-space-md);
		align-content: start;
	}

	h1 {
		font-size: var(--dd-font-size-3xl);
	}

	h2 {
		font-size: var(--dd-font-size-lg);
	}

	.hint,
	.origin {
		color: var(--dd-color-text-secondary);
	}

	.card {
		display: grid;
		gap: var(--dd-space-md);
		padding: var(--dd-space-lg);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-surface-raised);
	}

	/* A dashed frame while the microphone is open: the state is not told by color alone. */
	.card[data-phase='recording'] {
		border-style: dashed;
		border-color: var(--dd-color-accent-base);
	}

	.text {
		font-size: var(--dd-font-size-xl);
		font-weight: var(--dd-font-weight-medium);
		line-height: var(--dd-line-height-relaxed);
	}

	.take,
	.status {
		font-weight: var(--dd-font-weight-bold);
	}

	.status {
		min-block-size: var(--dd-size-touch-target-min);
	}

	.problem {
		padding: var(--dd-space-md);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-error-surface);
		color: var(--dd-color-error-text);
		font-weight: var(--dd-font-weight-bold);
	}

	.actions {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(var(--dd-size-control-min), 1fr));
		gap: var(--dd-space-md);
	}

	.field {
		display: grid;
		gap: var(--dd-space-xs);
		font-weight: var(--dd-font-weight-bold);
	}

	.field input {
		min-block-size: var(--dd-size-touch-target-min);
		padding: var(--dd-space-xs) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-raised);
		color: var(--dd-color-text-primary);
		font-family: inherit;
		font-size: var(--dd-font-size-base);
		font-weight: var(--dd-font-weight-regular);
	}

	.check {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--dd-space-md);
		align-items: start;
	}

	.check input {
		inline-size: var(--dd-size-touch-target-min);
		block-size: var(--dd-size-touch-target-min);
		margin: 0;
	}
</style>
