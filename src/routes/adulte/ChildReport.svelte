<script lang="ts">
	import type { ProgressionDefinition } from '$lib/engine/progression/types';
	import { m } from '$lib/paraglide/messages.js';
	import type { Profile } from '$lib/state/types';
	import Button from '$lib/ui/components/Button.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import type { AdultRules } from './adult-rules';
	import ChildEvolution from './ChildEvolution.svelte';
	import ChildKeyboard from './ChildKeyboard.svelte';
	import ChildLessons from './ChildLessons.svelte';
	import ChildTarget from './ChildTarget.svelte';
	import type { Formatters } from './format';
	import { latestHandwriting } from './target';

	interface Props {
		profile: Profile;
		progression: ProgressionDefinition | undefined;
		rules: AdultRules;
		format: Formatters;
		today: string;
		lessonTitle: (lessonId: string) => string;
		/** What the last download of this screen gave, said in its live region. */
		fileStatus: string;
		onmeasure: (wordsPerMinute: number) => Promise<boolean>;
		onmeasures: () => void;
		onbackup: () => void;
		onback: () => void;
	}

	let {
		profile,
		progression,
		rules,
		format,
		today,
		lessonTitle,
		fileStatus,
		onmeasure,
		onmeasures,
		onbackup,
		onback
	}: Props = $props();

	const handwriting = $derived(latestHandwriting(profile.handwritingSamples));
</script>

<ScreenFrame
	title={m.adult_child_title({ name: profile.name })}
	wide
	back={{ label: m.adult_back_to_list(), onclick: onback }}
>
	<div class="report" data-child-report>
		<ChildLessons {progression} progress={profile.progress} />
		<ChildKeyboard
			progress={profile.progress}
			settings={profile.settings}
			rules={rules.mastery}
			{format}
		/>
		<ChildEvolution
			{profile}
			{rules}
			{format}
			{today}
			handwriting={handwriting?.wordsPerMinute ?? null}
			{lessonTitle}
		/>
		<ChildTarget {profile} {rules} {format} {handwriting} {onmeasure} />
		<section class="files" aria-labelledby="child-files-title">
			<h2 id="child-files-title">{m.adult_files_title()}</h2>
			<p>{m.adult_measures_note()}</p>
			<div class="actions">
				<Button variant="secondary" onclick={onmeasures} data-measures-child>
					{m.adult_measures_child({ name: profile.name })}
				</Button>
				<Button variant="secondary" onclick={onbackup} data-backup-child>
					{m.adult_backup_child({ name: profile.name })}
				</Button>
			</div>
			<p role="status">{fileStatus}</p>
		</section>
	</div>
</ScreenFrame>

<style>
	.report {
		display: grid;
		gap: var(--dd-space-2xl);
		justify-self: stretch;
	}

	.files {
		display: grid;
		gap: var(--dd-space-md);
		justify-items: start;
		text-align: start;
	}

	h2 {
		font-size: var(--dd-font-size-xl);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dd-space-sm);
	}
</style>
