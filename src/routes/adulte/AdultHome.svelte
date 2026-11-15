<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { Profile } from '$lib/state/types';
	import Button from '$lib/ui/components/Button.svelte';
	import InfoLinks from '$lib/ui/components/InfoLinks.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import BackupLoad from './BackupLoad.svelte';
	import CodeSettings from './CodeSettings.svelte';
	import { duplicateNicknames } from './copy-name';
	import type { Formatters } from './format';
	import InstallSection from './InstallSection.svelte';

	interface Props {
		/** In the order to show them: never a ranking. */
		profiles: readonly Profile[];
		memoryOnly: boolean;
		codeLength: number;
		format: Formatters;
		lastBackupAt: number | null;
		/** Whether the browser promised to keep the data of the site; `null` while it is not known. */
		storageProtected: boolean | null;
		/** Largest backup file read, in bytes. */
		maxBackupFileBytes: number;
		fileStatus: string;
		/** What became of the list of the children (a profile deleted), said in its live region. */
		childrenStatus: string;
		onopen: (profile: Profile) => void;
		onmeasures: () => void;
		onbackup: () => void;
		onimport: (profiles: readonly Profile[]) => Promise<boolean>;
		onleave: () => void;
	}

	let {
		profiles,
		memoryOnly,
		codeLength,
		format,
		lastBackupAt,
		storageProtected,
		maxBackupFileBytes,
		fileStatus,
		childrenStatus,
		onopen,
		onmeasures,
		onbackup,
		onimport,
		onleave
	}: Props = $props();

	/** Nicknames borne by several profiles (made before they had to differ, or loaded). */
	const sameNames = $derived(duplicateNicknames(profiles));
</script>

<ScreenFrame title={m.adult_title()} back={{ label: m.adult_back_to_players(), onclick: onleave }}>
	<div class="home" data-adult-home>
		{#if memoryOnly}
			<p class="notice">{m.adult_memory_only()}</p>
		{/if}

		<section aria-labelledby="children-title">
			<h2 id="children-title">{m.adult_children_title()}</h2>
			{#if profiles.length === 0}
				<p>{m.adult_children_empty()}</p>
			{:else}
				<p>{m.adult_children_hint()}</p>
				{#each sameNames as name (name)}
					<p class="same-name" data-same-name>
						{m.adult_children_same_name({ name, section: m.adult_identity_title() })}
					</p>
				{/each}
				<ul class="children" aria-labelledby="children-title">
					{#each profiles as profile (profile.id)}
						<li>
							<Button variant="secondary" onclick={() => onopen(profile)}>{profile.name}</Button>
						</li>
					{/each}
				</ul>
			{/if}
			<p role="status" data-children-status>{childrenStatus}</p>
		</section>

		<section aria-labelledby="files-title" data-adult-files>
			<h2 id="files-title">{m.adult_files_title()}</h2>
			<p>{m.adult_measures_note()}</p>
			<p>{m.adult_backup_note()}</p>
			<p data-last-backup>
				{lastBackupAt === null
					? m.adult_backup_never()
					: m.adult_backup_last({ date: format.dateTime(lastBackupAt) })}
			</p>
			{#if storageProtected !== null && !memoryOnly}
				<p data-storage-protection={storageProtected ? 'protected' : 'unprotected'}>
					{storageProtected
						? m.adult_storage_protected({ appName: m.app_name() })
						: m.adult_storage_unprotected({ appName: m.app_name() })}
				</p>
			{/if}
			<div class="actions">
				<Button
					variant="secondary"
					onclick={onmeasures}
					disabled={profiles.length === 0}
					data-measures-all
				>
					{m.adult_measures_all()}
				</Button>
				<Button
					variant="secondary"
					onclick={onbackup}
					disabled={profiles.length === 0}
					data-backup-all
				>
					{m.adult_backup_all()}
				</Button>
			</div>
			<p role="status">{fileStatus}</p>
			<BackupLoad {profiles} maxFileBytes={maxBackupFileBytes} onsave={onimport} />
		</section>

		<InstallSection />

		<CodeSettings {codeLength} />

		<section aria-labelledby="info-title" data-adult-info>
			<h2 id="info-title">{m.info_links_label()}</h2>
			<InfoLinks labelledby="info-title" />
		</section>
	</div>
</ScreenFrame>

<style>
	.same-name {
		font-weight: var(--dd-font-weight-bold);
	}

	.home {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--dd-space-2xl);
		justify-self: stretch;
		text-align: start;
	}

	section {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--dd-space-md);
		justify-items: start;
	}

	h2 {
		font-size: var(--dd-font-size-xl);
	}

	.children,
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dd-space-sm);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* A long nickname without a space is cut rather than wider than the page (320 pixels). */
	.children li {
		max-inline-size: 100%;
		overflow-wrap: anywhere;
	}

	.notice {
		padding: var(--dd-space-sm) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-oops-outline);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-sunken);
	}
</style>
