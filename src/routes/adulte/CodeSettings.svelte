<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
	import { focusOnMount } from '$lib/ui/focus';
	import {
		isValidCode,
		readAdultCode,
		removeAdultCode,
		writeAdultCode,
		type StoredCode
	} from './adult-storage';

	interface Props {
		codeLength: number;
	}

	let { codeLength }: Props = $props();

	// svelte-ignore state_referenced_locally
	let stored = $state.raw<StoredCode>(readAdultCode(codeLength));
	let editing = $state(false);
	let first = $state('');
	let second = $state('');
	let status = $state('');
	let problem = $state('');
	/** The field the problem is about, which a screen reader reads it with. */
	let faulty = $state<'first' | 'second' | null>(null);
	const PROBLEM_ID = 'code-problem';

	function startEditing() {
		first = '';
		second = '';
		problem = '';
		faulty = null;
		status = '';
		editing = true;
	}

	function save(event: SubmitEvent) {
		event.preventDefault();
		if (!isValidCode(first, codeLength)) {
			problem = m.adult_code_invalid({ length: codeLength });
			faulty = 'first';
			return;
		}
		if (first !== second) {
			problem = m.adult_code_mismatch();
			faulty = 'second';
			return;
		}
		problem = '';
		faulty = null;
		editing = false;
		status = writeAdultCode(first, codeLength) ? m.adult_code_saved() : m.adult_code_failed();
		stored = readAdultCode(codeLength);
	}

	function remove() {
		status = removeAdultCode() ? m.adult_code_removed() : m.adult_code_failed();
		stored = readAdultCode(codeLength);
	}
</script>

<section class="code" aria-labelledby="code-title" data-code-settings>
	<h2 id="code-title">{m.adult_code_title()}</h2>
	{#if stored.status === 'unavailable'}
		<p>{m.adult_code_unavailable()}</p>
	{:else}
		<p>
			{stored.status === 'set'
				? m.adult_code_set_status()
				: m.adult_code_none({ length: codeLength })}
		</p>
		{#if editing}
			<form class="form" onsubmit={save}>
				<label class="field">
					<span>{m.adult_code_new_label({ length: codeLength })}</span>
					<input
						bind:value={first}
						type="password"
						inputmode="numeric"
						autocomplete="off"
						maxlength={codeLength}
						aria-invalid={faulty === 'first' || undefined}
						aria-describedby={faulty === 'first' ? PROBLEM_ID : undefined}
						{@attach focusOnMount}
						data-code-new
					/>
				</label>
				<label class="field">
					<span>{m.adult_code_repeat_label()}</span>
					<input
						bind:value={second}
						type="password"
						inputmode="numeric"
						autocomplete="off"
						maxlength={codeLength}
						aria-invalid={faulty === 'second' || undefined}
						aria-describedby={faulty === 'second' ? PROBLEM_ID : undefined}
						data-code-repeat
					/>
				</label>
				{#if problem}
					<p id={PROBLEM_ID} class="problem" role="alert">{problem}</p>
				{/if}
				<div class="actions">
					<Button type="submit">{m.adult_code_save()}</Button>
					<Button variant="secondary" onclick={() => (editing = false)}>
						{m.adult_code_cancel()}
					</Button>
				</div>
			</form>
		{:else}
			<div class="actions">
				<Button variant="secondary" onclick={startEditing}>
					{stored.status === 'set' ? m.adult_code_change() : m.adult_code_add()}
				</Button>
				{#if stored.status === 'set'}
					<Button variant="secondary" onclick={remove}>{m.adult_code_remove()}</Button>
				{/if}
			</div>
		{/if}
		<p class="note">{m.adult_code_storage_note()}</p>
	{/if}
	<p role="status">{status}</p>
</section>

<style>
	.code,
	.form {
		display: grid;
		gap: var(--dd-space-md);
		justify-items: start;
		text-align: start;
	}

	h2 {
		font-size: var(--dd-font-size-xl);
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

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dd-space-sm);
	}

	.problem {
		color: var(--dd-color-error-text);
		font-weight: var(--dd-font-weight-bold);
	}

	.note {
		color: var(--dd-color-text-secondary);
	}
</style>
