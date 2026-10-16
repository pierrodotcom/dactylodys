<script lang="ts">
	import { untrack } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { MAX_NAME_LENGTH, MIN_NAME_LENGTH } from '$lib/state/profile';
	import Button from '$lib/ui/components/Button.svelte';
	import { checkPlayerName } from './player';

	interface Props {
		/** Prefix of the identifiers of the form, so that two forms never share one. */
		id: string;
		/** The name the companion has; empty when it has none. */
		name: string;
		/** Ideas of the catalogue: one click names the companion. */
		suggestions: readonly string[];
		/** Called with a name that follows the rules of a nickname. */
		onname: (name: string) => void;
		/** Shown when the child may answer later. */
		onlater?: () => void;
	}

	let { id, name, suggestions, onname, onlater }: Props = $props();

	let value = $state(untrack(() => name));
	let error = $state<'empty' | 'invalid' | null>(null);

	const inputId = $derived(`${id}-input`);
	const errorId = $derived(`${id}-error`);
	const ideasId = $derived(`${id}-ideas`);
	const message = $derived(
		error === 'empty'
			? m.play_companion_name_error_empty()
			: error === 'invalid'
				? m.play_companion_name_error_invalid({ min: MIN_NAME_LENGTH, max: MAX_NAME_LENGTH })
				: ''
	);

	function give(raw: string) {
		const check = checkPlayerName(raw);
		if (!check.ok) {
			error = check.reason;
			return;
		}
		error = null;
		value = check.name;
		onname(check.name);
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		give(value);
	}
</script>

<form class="name-form" onsubmit={submit} novalidate>
	<label for={inputId}>{m.play_companion_name_label()}</label>
	<input
		id={inputId}
		type="text"
		autocomplete="off"
		autocapitalize="off"
		spellcheck="false"
		bind:value
		aria-invalid={error === null ? undefined : 'true'}
		aria-describedby={error === null ? undefined : errorId}
	/>
	<p id={errorId} class="error" role="alert">{message}</p>
	{#if suggestions.length > 0}
		<div class="ideas" role="group" aria-labelledby={ideasId}>
			<p id={ideasId} class="ideas-title">{m.play_companion_name_ideas()}</p>
			<ul>
				{#each suggestions as idea (idea)}
					<li>
						<Button variant="secondary" onclick={() => give(idea)}>{idea}</Button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
	<div class="actions">
		<Button type="submit">{m.play_companion_name_submit()}</Button>
		{#if onlater}
			<Button variant="quiet" onclick={onlater}>{m.play_reward_name_later()}</Button>
		{/if}
	</div>
</form>

<style>
	.name-form {
		display: grid;
		gap: var(--dd-space-sm);
		justify-items: center;
		inline-size: 100%;
		max-inline-size: var(--dd-size-panel-max);
	}

	label {
		font-size: var(--dd-font-size-lg);
		font-weight: var(--dd-font-weight-bold);
	}

	input {
		inline-size: 100%;
		min-block-size: var(--dd-size-touch-target-min);
		padding: var(--dd-space-sm) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-raised);
		color: var(--dd-color-text-primary);
		font-family: inherit;
		font-size: var(--dd-font-size-xl);
		text-align: center;
	}

	input[aria-invalid='true'] {
		border-color: var(--dd-color-error-text);
		border-style: dashed;
	}

	.error {
		min-block-size: calc(var(--dd-font-size-base) * 1.6);
		color: var(--dd-color-error-text);
		font-weight: var(--dd-font-weight-bold);
	}

	.ideas {
		display: grid;
		gap: var(--dd-space-xs);
		justify-items: center;
	}

	.ideas-title {
		color: var(--dd-color-text-secondary);
	}

	.ideas ul {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--dd-space-sm);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--dd-space-md);
	}
</style>
