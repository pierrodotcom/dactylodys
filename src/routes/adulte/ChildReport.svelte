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
	import ChildIdentity from './ChildIdentity.svelte';
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
		/** Opens the session sheet of the child, to print. */
		onsheet: () => void;
		onmeasures: () => void;
		onbackup: () => void;
		/** The nicknames of the other profiles of the device. */
		otherNames: readonly string[];
		/** Keeps a new nickname; `false` when the device refused it. */
		onrename: (name: string) => Promise<boolean>;
		/** Opens the confirmation of the deletion of the profile. */
		ondelete: () => void;
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
		onsheet,
		onmeasures,
		onbackup,
		otherNames,
		onrename,
		ondelete,
		onback
	}: Props = $props();

	const elided = $derived(isElidedBefore(profile.name));

	const handwriting = $derived(latestHandwriting(profile.handwritingSamples));

	/** The day the report is printed, written on the paper: a report is read later. */
	const printedOn = $derived(format.day(today));
</script>

<ScreenFrame
	title={elided
		? m.adult_child_title_elided({ name: profile.name })
		: m.adult_child_title({ name: profile.name })}
	wide
	back={{ label: m.adult_back_to_list(), onclick: onback }}
>
	<div class="report" data-child-report>
		<p class="printed" data-print-only data-report-printed>
			{m.adult_report_printed({ appName: m.app_name(), date: printedOn })}
		</p>
		<!-- Read first, act afterwards (E-15): the contents say which part is which. -->
		<div class="top" data-print-hidden>
			<nav class="contents" aria-labelledby="report-contents-title" data-report-contents>
				<h2 id="report-contents-title">{m.adult_report_contents_title()}</h2>
				<div class="columns">
					<div>
						<h3 id="report-read-title">{m.adult_report_contents_read()}</h3>
						<ul aria-labelledby="report-read-title">
							<li><a href="#now-title">{m.adult_report_now_title({ name: profile.name })}</a></li>
							<li><a href="#keys-title">{m.adult_keyboard_title()}</a></li>
							<li><a href="#evolution-title">{m.adult_evolution_title()}</a></li>
							<li><a href="#target-title">{m.adult_target_title()}</a></li>
						</ul>
					</div>
					<div>
						<h3 id="report-act-title">{m.adult_report_contents_act()}</h3>
						<ul aria-labelledby="report-act-title">
							<li><a href="#child-sheet-title">{m.adult_sheet_section_title()}</a></li>
							{#if progression}
								<li><a href="#worlds-title">{m.adult_worlds_title()}</a></li>
							{/if}
							<li><a href="#words-title">{m.adult_words_title()}</a></li>
							<li><a href="#child-settings-title">{m.settings_title()}</a></li>
							<li><a href="#child-files-title">{m.adult_files_title()}</a></li>
							<li><a href="#child-identity-title">{m.adult_identity_title()}</a></li>
						</ul>
					</div>
				</div>
			</nav>
			<Button variant="secondary" onclick={() => window.print()} data-report-print>
				{m.adult_report_print()}
			</Button>
		</div>
		<ChildLessons {profile} {progression} {format} />
		<ChildKeyboard {profile} {rules} {format} />
		<ChildEvolution
			{profile}
			{rules}
			{format}
			{today}
			handwriting={handwriting?.wordsPerMinute ?? null}
			{lessonTitle}
		/>
		<ChildTarget {profile} {rules} {format} {handwriting} {onmeasure} />
		<!-- What the adult does now and then: never on paper. -->
		<div class="later" data-print-hidden>
			<section class="files" aria-labelledby="child-sheet-title">
				<h2 id="child-sheet-title">{m.adult_sheet_section_title()}</h2>
				<p>{m.adult_sheet_section_note({ name: profile.name })}</p>
				<Button variant="secondary" onclick={onsheet} data-child-sheet>
					{m.adult_sheet_open()}
				</Button>
			</section>
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
			<ChildIdentity {profile} {otherNames} {onrename} {ondelete} />
		</div>
	</div>
</ScreenFrame>

<style>
	.report,
	.later {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--dd-space-2xl);
		justify-self: stretch;
	}

	.top {
		display: grid;
		gap: var(--dd-space-md);
		justify-items: start;
		text-align: start;
	}

	.contents {
		display: grid;
		gap: var(--dd-space-sm);
		justify-self: stretch;
		padding: var(--dd-space-md) var(--dd-space-lg);
		border-width: var(--dd-border-width-thin);
		border-style: solid;
		border-color: var(--dd-color-border-subtle);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-raised);
	}

	/* Two columns side by side when they fit, one under the other on a narrow screen (320 pixels). */
	.columns {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(var(--dd-size-control-min), 100%), 1fr));
		gap: var(--dd-space-md) var(--dd-space-xl);
	}

	.contents ul {
		display: grid;
		margin: 0;
		padding-inline-start: var(--dd-space-lg);
	}

	.contents a {
		display: inline-flex;
		align-items: center;
		min-block-size: var(--dd-size-touch-target-min);
		color: var(--dd-color-accent-base);
		font-weight: var(--dd-font-weight-bold);
	}

	.contents h3 {
		font-size: var(--dd-font-size-lg);
	}

	.printed {
		display: none;
	}

	.files {
		display: grid;
		gap: var(--dd-space-md);
		justify-items: start;
		text-align: start;
	}

	/*
	 * A long nickname without a space is cut rather than wider than the page (320 pixels), in every
	 * sentence and every button of the report that names the child.
	 */
	.report :global(p),
	.report :global(button) {
		overflow-wrap: anywhere;
	}

	/* A section reached from the contents shows its title under the top of the screen. */
	.report :global(h2) {
		scroll-margin-block-start: var(--dd-space-lg);
	}

	h2 {
		font-size: var(--dd-font-size-xl);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dd-space-sm);
	}

	/*
	 * On paper (E-15): what the adult reads, black on white, without a button nor a field, the
	 * figures in tables; two A4 pages for the profiles tried (tested). `ScreenFrame` hides its way
	 * out.
	 */
	@media print {
		@page {
			size: A4;
			margin: var(--dd-size-print-page-margin);
		}

		:global(html:has([data-child-report])),
		:global(body:has([data-child-report])) {
			min-block-size: 0;
			background-color: var(--dd-color-print-paper);
			color: var(--dd-color-print-ink);
			font-size: var(--dd-font-size-print-base);
			line-height: var(--dd-line-height-print);
		}

		.report {
			gap: var(--dd-space-sm);
		}

		.report :global(table) {
			font-size: var(--dd-font-size-print-small);
		}

		.report :global([data-print-hidden]),
		.report :global(form),
		.report :global(button),
		.report :global(input),
		.report :global(textarea),
		.report :global([data-keyboard-board]),
		.report :global([data-keyboard-legend]) {
			display: none;
		}

		.printed {
			display: block;
			color: var(--dd-color-print-ink);
		}

		.report :global(h2) {
			font-size: var(--dd-font-size-print-heading);
		}

		.report :global(h3) {
			font-size: var(--dd-font-size-print-base);
		}

		.report :global(section) {
			gap: var(--dd-space-xs);
		}

		.report :global(.note) {
			color: var(--dd-color-print-ink);
		}
	}
</style>
