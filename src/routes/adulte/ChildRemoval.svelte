<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { Profile } from '$lib/state/types';
	import Button from '$lib/ui/components/Button.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import { isElidedBefore } from '$lib/ui/elision';

	interface Props {
		profile: Profile;
		/** What the download of the backup gave, said in the live region of the screen. */
		fileStatus: string;
		onbackup: () => void;
		/** Deletes the profile for good; `false` when the device refused. */
		onconfirm: () => Promise<boolean>;
		oncancel: () => void;
	}

	let { profile, fileStatus, onbackup, onconfirm, oncancel }: Props = $props();

	let busy = $state(false);
	let failed = $state(false);

	async function remove() {
		if (busy) return;
		busy = true;
		failed = false;
		failed = !(await onconfirm());
		busy = false;
	}
</script>

<ScreenFrame
	title={isElidedBefore(profile.name)
		? m.adult_delete_title_elided({ name: profile.name })
		: m.adult_delete_title({ name: profile.name })}
	back={{ label: m.adult_delete_cancel(), onclick: oncancel }}
>
	<div class="removal" data-child-removal>
		<p>{m.adult_delete_what()}</p>
		<p class="final">{m.adult_delete_final()}</p>
		<p>{m.adult_delete_backup_first()}</p>
		<Button onclick={onbackup} disabled={busy} data-backup-child>
			{m.adult_backup_child({ name: profile.name })}
		</Button>
		<p role="status">{fileStatus}</p>
		<Button variant="secondary" onclick={remove} disabled={busy} data-child-delete-confirm>
			{m.adult_delete_confirm()}
		</Button>
		{#if failed}
			<p class="problem" role="alert">{m.adult_delete_failed()}</p>
		{/if}
	</div>
</ScreenFrame>

<style>
	.removal {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--dd-space-md);
		justify-items: start;
		justify-self: stretch;
		text-align: start;
		/* A long nickname without a space is cut rather than wider than the page (320 pixels). */
		overflow-wrap: anywhere;
	}

	.final,
	.problem {
		font-weight: var(--dd-font-weight-bold);
	}

	.problem {
		color: var(--dd-color-error-text);
	}
</style>
