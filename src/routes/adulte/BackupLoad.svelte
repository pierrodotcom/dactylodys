<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import {
		applyImport,
		planImport,
		type ConflictChoice,
		type ImportReady,
		type ImportRefusal
	} from '$lib/state/backup';
	import type { Profile } from '$lib/state/types';
	import Button from '$lib/ui/components/Button.svelte';
	import { focusOnMount } from '$lib/ui/focus';
	import { isOne } from '$lib/ui/plural';
	import { distinctName, nameCopies, type CopyNameFormat } from './copy-name';

	interface Props {
		/** The profiles of the device, which a loaded profile may stand beside or replace. */
		profiles: readonly Profile[];
		/** Saves the profiles of the file; `false` when the device refused. */
		onsave: (profiles: readonly Profile[]) => Promise<boolean>;
	}

	let { profiles, onsave }: Props = $props();

	const copyName: CopyNameFormat = (name, number) => m.adult_copy_name({ name, number });
	const REFUSALS: Readonly<Record<ImportRefusal, () => string>> = {
		'not-a-backup': () => m.adult_import_refused_not_a_backup({ appName: m.app_name() }),
		'newer-version': () => m.adult_import_refused_newer_version({ appName: m.app_name() }),
		invalid: m.adult_import_refused_invalid
	};

	let plan = $state.raw<ImportReady | null>(null);
	let choices = $state<Record<string, ConflictChoice>>({});
	/** What became of the last file, said once in the live region. */
	let result = $state<{ readonly text: string; readonly ok: boolean } | null>(null);
	let busy = $state(false);

	const takenNames = $derived([
		...profiles.map((profile) => profile.name),
		...(plan?.importable.map((profile) => profile.name) ?? [])
	]);

	async function readFile(event: Event & { currentTarget: HTMLInputElement }) {
		const input = event.currentTarget;
		const file = input.files?.[0];
		// The same file can be chosen again after a change of mind.
		input.value = '';
		if (!file) return;
		plan = null;
		result = null;
		let text: string;
		try {
			text = await file.text();
		} catch {
			result = { text: m.adult_import_unreadable_file(), ok: false };
			return;
		}
		const read = planImport(text, profiles);
		if (!read.ok) {
			result = { text: REFUSALS[read.reason](), ok: false };
			return;
		}
		if (read.importable.length === 0 && read.conflicts.length === 0) {
			result = { text: m.adult_import_empty(), ok: false };
			return;
		}
		if (read.conflicts.length === 0) {
			await finish(read, {});
			return;
		}
		// Keeping both never loses anything: it is the choice made unless the adult changes it.
		choices = Object.fromEntries(
			read.conflicts.map((conflict) => [conflict.incoming.id, 'keep-both'])
		);
		plan = read;
	}

	async function finish(ready: ImportReady, chosen: Readonly<Record<string, ConflictChoice>>) {
		busy = true;
		const imported = applyImport(ready, chosen, () => crypto.randomUUID());
		const saved = nameCopies(imported, profiles, copyName);
		const ok = await onsave(saved);
		busy = false;
		plan = null;
		result = ok
			? {
					text: isOne(saved.length)
						? m.adult_import_done_one({ count: saved.length })
						: m.adult_import_done_other({ count: saved.length }),
					ok: true
				}
			: { text: m.adult_import_failed(), ok: false };
	}

	function confirm(event: SubmitEvent) {
		event.preventDefault();
		if (plan) void finish(plan, choices);
	}

	function cancel() {
		plan = null;
		result = { text: m.adult_import_cancelled(), ok: true };
	}
</script>

<div class="load" data-backup-load>
	<label class="file">
		<span>{m.adult_import_label()}</span>
		<input type="file" accept=".json,application/json" onchange={readFile} disabled={busy} />
	</label>

	{#if plan}
		<form class="conflicts" onsubmit={confirm} data-import-conflicts>
			<h3 tabindex="-1" {@attach focusOnMount}>{m.adult_import_conflicts_title()}</h3>
			{#each plan.conflicts as conflict (conflict.incoming.id)}
				{@const id = conflict.incoming.id}
				<fieldset>
					<legend>{m.adult_import_conflict_legend({ name: conflict.existing.name })}</legend>
					<label class="choice">
						<input type="radio" name="choice-{id}" value="replace" bind:group={choices[id]} />
						<span>{m.adult_import_replace()}</span>
					</label>
					<label class="choice">
						<input type="radio" name="choice-{id}" value="keep-both" bind:group={choices[id]} />
						<span>
							{m.adult_import_keep_both({
								copy: distinctName(conflict.incoming.name, takenNames, copyName)
							})}
						</span>
					</label>
				</fieldset>
			{/each}
			<div class="actions">
				<Button type="submit" disabled={busy}>{m.adult_import_confirm()}</Button>
				<Button variant="secondary" onclick={cancel} disabled={busy}>
					{m.adult_import_cancel()}
				</Button>
			</div>
		</form>
	{/if}

	<p
		class="result"
		role="status"
		data-import-result={result ? (result.ok ? 'ok' : 'refused') : undefined}
	>
		{result?.text ?? ''}
	</p>
</div>

<style>
	.load,
	.conflicts {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--dd-space-md);
		justify-items: start;
		text-align: start;
	}

	.file {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--dd-space-xs);
		font-weight: var(--dd-font-weight-bold);
	}

	input[type='file'] {
		inline-size: 100%;
		min-block-size: var(--dd-size-touch-target-min);
		font-family: inherit;
		font-size: var(--dd-font-size-base);
	}

	h3 {
		font-size: var(--dd-font-size-lg);
	}

	h3:focus {
		outline: none;
	}

	fieldset {
		display: grid;
		gap: var(--dd-space-xs);
		margin: 0;
		padding: var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-md);
	}

	legend {
		padding: 0 var(--dd-space-xs);
		font-weight: var(--dd-font-weight-bold);
	}

	.choice {
		display: flex;
		align-items: center;
		gap: var(--dd-space-sm);
		min-block-size: var(--dd-size-touch-target-min);
		cursor: pointer;
	}

	.choice input {
		inline-size: var(--dd-size-icon);
		block-size: var(--dd-size-icon);
		margin: 0;
		accent-color: var(--dd-color-accent-base);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dd-space-sm);
	}

	.result {
		font-weight: var(--dd-font-weight-bold);
	}
</style>
