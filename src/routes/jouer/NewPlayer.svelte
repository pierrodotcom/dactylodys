<script lang="ts">
	import { AGE_BANDS } from '$lib/engine/progression/banks';
	import { m } from '$lib/paraglide/messages.js';
	import { MAX_NAME_LENGTH, MIN_NAME_LENGTH } from '$lib/state/profile';
	import type { AgeBand } from '$lib/state/types';
	import Button from '$lib/ui/components/Button.svelte';
	import ChoiceGroup from '$lib/ui/components/ChoiceGroup.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import { ageBandOfAnswer, checkPlayerName, UNKNOWN_AGE, type AgeAnswer } from './player';

	interface Props {
		/**
		 * Creates the player, with the age group the child chose, `null` when the child does not
		 * know: the profile keeps its own. `false` when the profile could not be stored.
		 */
		oncreate: (name: string, ageBand: AgeBand | null) => Promise<boolean>;
		onback: () => void;
	}

	let { oncreate, onback }: Props = $props();

	const INPUT_ID = 'player-name';
	const ERROR_ID = 'player-name-error';
	const HINT_ID = 'player-name-hint';

	const AGE_LABELS: Readonly<Record<AgeBand, () => string>> = {
		'8-9': m.play_new_age_8_9,
		'10-12': m.play_new_age_10_12
	};
	const AGE_OPTIONS = [
		...AGE_BANDS.map((band) => ({ value: band, label: AGE_LABELS[band]() })),
		{ value: UNKNOWN_AGE, label: m.play_new_age_unknown() }
	];

	let name = $state('');
	let age = $state<AgeAnswer>(UNKNOWN_AGE);
	let error = $state<'empty' | 'invalid' | 'save' | null>(null);
	let busy = $state(false);

	const message = $derived(
		error === 'empty'
			? m.play_new_error_empty()
			: error === 'invalid'
				? m.play_new_error_invalid({ min: MIN_NAME_LENGTH, max: MAX_NAME_LENGTH })
				: error === 'save'
					? m.play_new_error_save()
					: ''
	);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (busy) return;
		const check = checkPlayerName(name);
		if (!check.ok) {
			error = check.reason;
			return;
		}
		error = null;
		busy = true;
		const created = await oncreate(check.name, ageBandOfAnswer(age));
		busy = false;
		if (!created) error = 'save';
	}
</script>

<ScreenFrame title={m.play_new_title()} back={{ label: m.play_new_cancel(), onclick: onback }}>
	<form onsubmit={submit} novalidate>
		<p id={HINT_ID} class="hint">{m.play_new_hint()}</p>
		<label for={INPUT_ID}>{m.play_new_label()}</label>
		<input
			id={INPUT_ID}
			type="text"
			autocomplete="off"
			autocapitalize="off"
			spellcheck="false"
			bind:value={name}
			aria-invalid={error === null ? undefined : 'true'}
			aria-describedby={error === null ? HINT_ID : `${HINT_ID} ${ERROR_ID}`}
		/>
		<p id={ERROR_ID} class="error" role="alert">{message}</p>
		<div class="age" data-new-player-age>
			<ChoiceGroup
				legend={m.play_new_age_legend()}
				name="new-player-age"
				options={AGE_OPTIONS}
				value={age}
				onchange={(value) => (age = value as AgeAnswer)}
			/>
		</div>
		<div class="actions">
			<Button type="submit" disabled={busy}>{m.play_new_submit()}</Button>
		</div>
	</form>
</ScreenFrame>

<style>
	form {
		display: grid;
		gap: var(--dd-space-md);
		justify-items: center;
		inline-size: 100%;
		max-inline-size: var(--dd-size-panel-max);
	}

	.hint {
		color: var(--dd-color-text-secondary);
	}

	label {
		font-size: var(--dd-font-size-lg);
		font-weight: var(--dd-font-weight-bold);
	}

	input {
		inline-size: 100%;
		min-block-size: calc(var(--dd-size-touch-target-min) * 1.25);
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

	.age {
		inline-size: 100%;
	}

	.age :global(fieldset) {
		inline-size: 100%;
		justify-items: center;
	}

	.age :global(.options) {
		justify-content: center;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--dd-space-md);
	}
</style>
