<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { LAYOUT_IDS } from '$lib/keyboard/layout-ids';
	import type { RawInputEvent } from '$lib/keyboard/types';
	import promptData from '../../../../content/fr/dev/trace-prompts.json';
	import PromptRecorder from './PromptRecorder.svelte';
	import {
		buildTraces,
		detectEnvironment,
		isIdentical,
		isRecorded,
		parsePrompts,
		serializeTraces,
		traceFileName
	} from './recording';

	const prompts = parsePrompts(promptData);
	const REVOKE_DELAY_MS = 10_000;

	let layoutId = $state<string>(LAYOUT_IDS[0]);
	let keyboard = $state('');
	let browser = $state('');
	let browserVersion = $state('');
	let os = $state('');
	let osVersion = $state('');
	let userAgent = $state('');
	let runs = $state<RawInputEvent[][]>(prompts.map(() => []));
	let downloadedName = $state('');
	let downloadError = $state('');

	onMount(() => {
		userAgent = navigator.userAgent;
		({ browser, browserVersion, os, osVersion } = detectEnvironment(userAgent));
	});

	const recorded = $derived(runs.filter((events) => isRecorded(events)).length);
	const different = $derived(
		prompts.filter(
			(prompt, index) => isRecorded(runs[index] ?? []) && !isIdentical(prompt, runs[index] ?? [])
		).length
	);

	function download() {
		downloadedName = '';
		downloadError = '';
		try {
			const environment = { browser, browserVersion, os, osVersion };
			const recordedAt = new Date().toISOString();
			const traces = buildTraces(prompts, runs, {
				layoutId,
				keyboard: keyboard.trim(),
				userAgent,
				environment,
				recordedAt
			});
			const filename = traceFileName(layoutId, environment, recordedAt.slice(0, 10));
			const url = URL.createObjectURL(
				new Blob([serializeTraces(traces)], { type: 'application/json' })
			);
			const link = document.createElement('a');
			link.href = url;
			link.download = filename;
			document.body.append(link);
			link.click();
			link.remove();
			setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
			downloadedName = filename;
		} catch (error) {
			downloadError = error instanceof Error ? error.message : String(error);
		}
	}
</script>

<svelte:head>
	<title>{m.traces_title()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	<header>
		<h1>{m.traces_title()}</h1>
		<p>{m.traces_intro()}</p>
		<p>{m.traces_privacy_note()}</p>
	</header>

	<section aria-labelledby="traces-setup-heading">
		<h2 id="traces-setup-heading">{m.traces_setup_heading()}</h2>
		<p class="hint">{m.traces_setup_hint()}</p>
		<div class="fields">
			<label>
				<span>{m.traces_layout_label()}</span>
				<select bind:value={layoutId}>
					{#each LAYOUT_IDS as id (id)}
						<option value={id}>{id}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>{m.traces_keyboard_label()}</span>
				<input
					type="text"
					autocomplete="off"
					placeholder={m.traces_keyboard_placeholder()}
					bind:value={keyboard}
				/>
			</label>
			<label>
				<span>{m.traces_browser_label()}</span>
				<input type="text" autocomplete="off" bind:value={browser} />
			</label>
			<label>
				<span>{m.traces_browser_version_label()}</span>
				<input type="text" autocomplete="off" bind:value={browserVersion} />
			</label>
			<label>
				<span>{m.traces_os_label()}</span>
				<input type="text" autocomplete="off" bind:value={os} />
			</label>
			<label>
				<span>{m.traces_os_version_label()}</span>
				<input type="text" autocomplete="off" bind:value={osVersion} />
			</label>
		</div>
	</section>

	<section aria-labelledby="traces-prompts-heading">
		<h2 id="traces-prompts-heading">{m.traces_prompts_heading()}</h2>
		<ol class="prompts">
			{#each prompts as prompt, index (prompt.id)}
				<li>
					<PromptRecorder
						{prompt}
						position={index + 1}
						total={prompts.length}
						bind:events={runs[index]!}
					/>
				</li>
			{/each}
		</ol>
	</section>

	<section aria-labelledby="traces-finish-heading">
		<h2 id="traces-finish-heading">{m.traces_finish_heading()}</h2>
		{#if recorded === 0}
			<p>{m.traces_finish_none()}</p>
		{:else}
			<p>{m.traces_finish_summary({ recorded, total: prompts.length, different })}</p>
		{/if}
		<button type="button" class="primary" disabled={recorded === 0} onclick={download}>
			{m.traces_download_button()}
		</button>
		<p role="status">
			{#if downloadedName}
				{m.traces_download_done({ filename: downloadedName })}
			{/if}
		</p>
		{#if downloadError}
			<p class="error" role="alert">{m.traces_download_error({ detail: downloadError })}</p>
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
	section {
		display: grid;
		gap: var(--dd-space-md);
		align-content: start;
	}

	h1 {
		font-size: var(--dd-font-size-3xl);
	}

	h2 {
		font-size: var(--dd-font-size-2xl);
	}

	.hint {
		color: var(--dd-color-text-secondary);
	}

	.fields {
		display: grid;
		gap: var(--dd-space-md);
	}

	label {
		display: grid;
		gap: var(--dd-space-xs);
		font-weight: var(--dd-font-weight-bold);
	}

	input,
	select {
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

	.prompts {
		display: grid;
		gap: var(--dd-space-lg);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.primary {
		justify-self: start;
		min-block-size: var(--dd-size-touch-target-min);
		padding: var(--dd-space-sm) var(--dd-space-xl);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-accent-base);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-accent-base);
		color: var(--dd-color-text-on-accent);
		font-family: inherit;
		font-size: var(--dd-font-size-lg);
		font-weight: var(--dd-font-weight-bold);
		cursor: pointer;
	}

	.primary:hover:not(:disabled) {
		border-color: var(--dd-color-accent-hover);
		background-color: var(--dd-color-accent-hover);
	}

	.primary:disabled {
		opacity: var(--dd-opacity-disabled);
		cursor: not-allowed;
	}

	.error {
		color: var(--dd-color-error-text);
		font-weight: var(--dd-font-weight-bold);
	}
</style>
