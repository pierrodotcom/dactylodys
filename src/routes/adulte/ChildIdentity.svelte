<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { MAX_NAME_LENGTH, MIN_NAME_LENGTH } from '$lib/state/profile';
	import type { Profile } from '$lib/state/types';
	import Button from '$lib/ui/components/Button.svelte';
	import { isElidedBefore } from '$lib/ui/elision';
	import { checkPlayerName } from '../jouer/player';

	interface Props {
		profile: Profile;
		/** The nicknames of the other profiles of the device: the new one bears none of them. */
		otherNames: readonly string[];
		/** Keeps the new nickname, already checked; `false` when the device refused it. */
		onrename: (name: string) => Promise<boolean>;
		/** Opens the confirmation of the deletion: nothing is deleted from here. */
		ondelete: () => void;
	}

	let { profile, otherNames, onrename, ondelete }: Props = $props();

	const INPUT_ID = 'child-name';
	const HINT_ID = 'child-name-hint';
	const PROBLEM_ID = 'child-name-problem';

	/** What the adult is writing; `null`: the nickname as it is kept. */
	let typed = $state<string | null>(null);
	let problem = $state<'empty' | 'invalid' | 'taken' | 'save' | null>(null);
	/** The other profile that bears the nickname already. */
	let takenBy = $state('');
	let status = $state('');
	let busy = $state(false);

	const name = $derived(typed ?? profile.name);
	const message = $derived(
		problem === 'empty'
			? m.adult_rename_error_empty()
			: problem === 'invalid'
				? m.adult_rename_error_invalid({ min: MIN_NAME_LENGTH, max: MAX_NAME_LENGTH })
				: problem === 'taken'
					? m.adult_rename_error_taken({ name: takenBy })
					: problem === 'save'
						? m.adult_rename_error_save()
						: ''
	);

	async function rename(event: SubmitEvent) {
		event.preventDefault();
		if (busy) return;
		status = '';
		// The same rule as for a new player.
		const check = checkPlayerName(name, otherNames);
		if (!check.ok) {
			problem = check.reason;
			takenBy = check.reason === 'taken' ? check.existing : '';
			return;
		}
		problem = null;
		busy = true;
		const saved = await onrename(check.name);
		busy = false;
		if (!saved) {
			problem = 'save';
			return;
		}
		typed = null;
		status = m.adult_rename_done({ name: check.name });
	}
</script>

<section class="identity" aria-labelledby="child-identity-title" data-child-identity>
	<h2 id="child-identity-title">{m.adult_identity_title()}</h2>
	<form class="form" onsubmit={rename} novalidate>
		<label for={INPUT_ID}>{m.adult_rename_label()}</label>
		<p id={HINT_ID} class="note">
			{m.adult_rename_hint({ min: MIN_NAME_LENGTH, max: MAX_NAME_LENGTH })}
		</p>
		<input
			id={INPUT_ID}
			type="text"
			autocomplete="off"
			autocapitalize="off"
			spellcheck="false"
			maxlength={MAX_NAME_LENGTH}
			value={name}
			oninput={(event) => (typed = event.currentTarget.value)}
			aria-invalid={problem === null ? undefined : 'true'}
			aria-describedby={problem === null ? HINT_ID : `${HINT_ID} ${PROBLEM_ID}`}
			data-child-name
		/>
		<p id={PROBLEM_ID} class="problem" role="alert">{message}</p>
		<Button type="submit" variant="secondary" disabled={busy} data-child-rename>
			{m.adult_rename_submit()}
		</Button>
	</form>
	<p role="status">{status}</p>
	<p>{m.adult_delete_note()}</p>
	<Button variant="secondary" onclick={ondelete} data-child-delete>
		{isElidedBefore(profile.name)
			? m.adult_delete_open_elided({ name: profile.name })
			: m.adult_delete_open({ name: profile.name })}
	</Button>
</section>

<style>
	.identity,
	.form {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--dd-space-md);
		justify-items: start;
		text-align: start;
		/* A long nickname without a space is cut rather than wider than the page (320 pixels). */
		overflow-wrap: anywhere;
	}

	.form {
		gap: var(--dd-space-xs);
		inline-size: 100%;
	}

	h2 {
		font-size: var(--dd-font-size-xl);
	}

	label {
		font-weight: var(--dd-font-weight-bold);
	}

	.note {
		color: var(--dd-color-text-secondary);
	}

	input {
		inline-size: 100%;
		max-inline-size: var(--dd-size-panel-max);
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
	}

	input[aria-invalid='true'] {
		border-color: var(--dd-color-error-text);
		border-style: dashed;
	}

	.problem {
		color: var(--dd-color-error-text);
		font-weight: var(--dd-font-weight-bold);
	}
</style>
