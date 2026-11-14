<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import type { Profile } from '$lib/state/types';
	import Button from '$lib/ui/components/Button.svelte';
	import InfoLinks from '$lib/ui/components/InfoLinks.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import BackupLoad from './BackupLoad.svelte';
	import CodeSettings from './CodeSettings.svelte';
	import type { Formatters } from './format';
	import InstallSection from './InstallSection.svelte';

	interface Props {
		/** In the order to show them: never a ranking. */
		profiles: readonly Profile[];
		memoryOnly: boolean;
		codeLength: number;
		format: Formatters;
		lastBackupAt: number | null;
		fileStatus: string;
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
		fileStatus,
		onopen,
		onmeasures,
		onbackup,
		onimport,
		onleave
	}: Props = $props();
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
				<ul class="children" aria-labelledby="children-title">
					{#each profiles as profile (profile.id)}
						<li>
							<Button variant="secondary" onclick={() => onopen(profile)}>{profile.name}</Button>
						</li>
					{/each}
				</ul>
			{/if}
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
			<BackupLoad {profiles} onsave={onimport} />
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

	.notice {
		padding: var(--dd-space-sm) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-oops-outline);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-sunken);
	}
</style>
