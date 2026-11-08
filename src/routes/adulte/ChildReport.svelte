<script lang="ts">
	import type { ProgressionDefinition } from '$lib/engine/progression/types';
	import { m } from '$lib/paraglide/messages.js';
	import type { Profile } from '$lib/state/types';
	import Button from '$lib/ui/components/Button.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import { isElidedBefore } from '$lib/ui/elision';
	import type { FreePracticeRules } from '../jouer/free-practice';
	import type { AdultRules } from './adult-rules';
	import ChildEvolution from './ChildEvolution.svelte';
	import ChildKeyboard from './ChildKeyboard.svelte';
	import ChildLessons from './ChildLessons.svelte';
	import ChildTarget from './ChildTarget.svelte';
	import ChildWords from './ChildWords.svelte';
	import ChildWorlds from './ChildWorlds.svelte';
	import type { Formatters } from './format';
	import { latestHandwriting } from './target';

	interface Props {
		profile: Profile;
		progression: ProgressionDefinition | undefined;
		rules: AdultRules;
		freeRules: FreePracticeRules;
		format: Formatters;
		today: string;
		lessonTitle: (lessonId: string) => string;
		/** What the last download of this screen gave, said in its live region. */
		fileStatus: string;
		onmeasure: (wordsPerMinute: number) => Promise<boolean>;
		onopenworld: (worldId: string) => Promise<boolean>;
		onsavewords: (words: readonly string[]) => Promise<boolean>;
		/** Opens the settings of the child, the same as in the game. */
		onsettings: () => void;
		onmeasures: () => void;
		onbackup: () => void;
		onback: () => void;
	}

	let {
		profile,
		progression,
		rules,
		freeRules,
		format,
		today,
		lessonTitle,
		fileStatus,
		onmeasure,
		onopenworld,
		onsavewords,
		onsettings,
		onmeasures,
		onbackup,
		onback
	}: Props = $props();

	const elided = $derived(isElidedBefore(profile.name));

	const handwriting = $derived(latestHandwriting(profile.handwritingSamples));
</script>

<ScreenFrame
	title={elided
		? m.adult_child_title_elided({ name: profile.name })
		: m.adult_child_title({ name: profile.name })}
	wide
	back={{ label: m.adult_back_to_list(), onclick: onback }}
>
	<div class="report" data-child-report>
		<ChildLessons {progression} progress={profile.progress} />
		<ChildKeyboard
			progress={profile.progress}
			settings={profile.settings}
			rules={rules.mastery}
			hesitation={rules.hesitation}
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
		{#if progression}
			<ChildWorlds {profile} {progression} {format} {onopenworld} />
		{/if}
		<ChildWords {profile} rules={freeRules} {format} onsave={onsavewords} />
		<section class="files" aria-labelledby="child-settings-title">
			<h2 id="child-settings-title">{m.settings_title()}</h2>
			<p>{m.adult_settings_note({ name: profile.name })}</p>
			<Button variant="secondary" onclick={onsettings} data-child-settings>
				{elided
					? m.adult_settings_open_elided({ name: profile.name })
					: m.adult_settings_open({ name: profile.name })}
			</Button>
		</section>
		<section class="files" aria-labelledby="child-files-title">
			<h2 id="child-files-title">{m.adult_files_title()}</h2>
			<p>{m.adult_measures_note()}</p>
			<div class="actions">
				<Button variant="secondary" onclick={onmeasures} data-measures-child>
					{elided
						? m.adult_measures_child_elided({ name: profile.name })
						: m.adult_measures_child({ name: profile.name })}
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
		grid-template-columns: minmax(0, 1fr);
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
