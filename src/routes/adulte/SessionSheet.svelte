<script lang="ts">
	import type { ProgressionDefinition } from '$lib/engine/progression/types';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import type { Profile } from '$lib/state/types';
	import Button from '$lib/ui/components/Button.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import { isElidedBefore } from '$lib/ui/elision';
	import { isOne } from '$lib/ui/plural';
	import { loadKeyboardAssets, type KeyboardAssets } from '../jouer/assets';
	import { keyLabel } from '../jouer/companion';
	import type { PlayRules } from '../jouer/play-rules';
	import type { AdultRules } from './adult-rules';
	import type { Formatters } from './format';
	import { sessionSheet } from './session-sheet';

	interface Props {
		profile: Profile;
		progression: ProgressionDefinition | undefined;
		rules: AdultRules;
		playRules: PlayRules;
		format: Formatters;
		/** The local day, `YYYY-MM-DD`. */
		today: string;
		onback: () => void;
	}

	let { profile, progression, rules, playRules, format, today, onback }: Props = $props();

	let assets = $state.raw<KeyboardAssets | null>(null);
	let failed = $state(false);

	$effect(() => {
		let cancelled = false;
		const wanted = {
			layoutId: profile.settings.layoutId,
			fingeringProfileId: profile.settings.fingeringProfileId
		};
		loadKeyboardAssets(wanted).then(
			(loaded) => {
				if (!cancelled) assets = loaded;
			},
			() => {
				if (!cancelled) failed = true;
			}
		);
		return () => {
			cancelled = true;
		};
	});

	const locale = getLocale();
	const collator = new Intl.Collator(locale);
	const name = $derived(profile.name);
	const elided = $derived(isElidedBefore(name));
	/** The keys are said once the layout is known: the hesitant ones need it. */
	const ready = $derived(assets !== null || failed);
	const sheet = $derived(
		sessionSheet({
			profile,
			progression,
			charIndex: assets?.charIndex ?? null,
			rules,
			playRules,
			compare: collator.compare
		})
	);

	const length = $derived.by(() => {
		const duration = format.minutes(sheet.breakAfterMinutes);
		const count = sheet.breakAfterExercises;
		if (count === 0) return m.adult_sheet_during_length({ duration });
		return isOne(count)
			? m.adult_sheet_during_length_games_one({ duration, count })
			: m.adult_sheet_during_length_games_other({ duration, count });
	});

	function written(chars: readonly string[]): string {
		return format.list(
			chars.map((char) => keyLabel(char, m.ui_key_space(), locale, m.ui_key_enter()))
		);
	}

	function print() {
		window.print();
	}
</script>

<ScreenFrame
	title={elided ? m.adult_sheet_title_elided({ name }) : m.adult_sheet_title({ name })}
	back={{
		label: elided ? m.adult_sheet_back_elided({ name }) : m.adult_sheet_back({ name }),
		onclick: onback
	}}
>
	<article class="sheet" data-session-sheet>
		<p class="header" data-sheet-header>
			{m.adult_sheet_header({ appName: m.app_name(), date: format.day(today) })}
		</p>
		<div class="tools" data-sheet-tools>
			<Button onclick={print} data-sheet-print>{m.adult_sheet_print()}</Button>
		</div>

		<section aria-labelledby="sheet-now-title" data-sheet-now>
			<h2 id="sheet-now-title">{m.adult_sheet_now_title({ name })}</h2>
			<ul>
				{#if sheet.lesson}
					<li data-sheet-lesson>
						{m.adult_sheet_now_lesson({
							lesson: sheet.lesson.title,
							number: sheet.lesson.number,
							world: sheet.lesson.worldTitle
						})}
					</li>
				{:else}
					<li>{m.adult_no_progression()}</li>
				{/if}
				{#if ready}
					{#if sheet.status === 'first'}
						<li data-sheet-keys="first">{m.adult_sheet_keys_first({ name })}</li>
					{:else if sheet.status === 'quiet'}
						<li data-sheet-keys="quiet">{m.adult_sheet_keys_quiet({ name })}</li>
					{:else}
						{#if sheet.learning.length > 0}
							<li data-sheet-keys="learning">
								{m.adult_sheet_keys_learning({ keys: written(sheet.learning) })}
							</li>
						{/if}
						{#if sheet.fragile.length > 0}
							<li data-sheet-keys="fragile">
								{m.adult_sheet_keys_fragile({ keys: written(sheet.fragile) })}
							</li>
						{/if}
						{#if sheet.hesitant.length > 0}
							<li data-sheet-keys="hesitant">
								{m.adult_sheet_keys_hesitant({ keys: written(sheet.hesitant) })}
							</li>
						{/if}
						<li>{m.adult_sheet_keys_note()}</li>
					{/if}
				{/if}
			</ul>
		</section>

		<section aria-labelledby="sheet-before-title">
			<h2 id="sheet-before-title">{m.adult_sheet_before_title()}</h2>
			<ul>
				<li>{m.adult_sheet_before_moment()}</li>
				<li>{m.adult_sheet_before_seat({ name })}</li>
				<li>{m.adult_sheet_before_hands()}</li>
				<li>{m.adult_sheet_before_keyboard()}</li>
			</ul>
		</section>

		<section aria-labelledby="sheet-during-title">
			<h2 id="sheet-during-title">{m.adult_sheet_during_title()}</h2>
			<ul>
				<li data-sheet-length>{length}</li>
				<li>{m.adult_sheet_during_accuracy()}</li>
				<li>{m.adult_sheet_during_eyes()}</li>
				<li>{m.adult_sheet_during_role()}</li>
				<li>{m.adult_sheet_during_errors({ name })}</li>
			</ul>
		</section>

		<section aria-labelledby="sheet-after-title">
			<h2 id="sheet-after-title">{m.adult_sheet_after_title()}</h2>
			<ul>
				<li>{m.adult_sheet_after_stop()}</li>
				<li>{m.adult_sheet_after_praise()}</li>
			</ul>
		</section>

		<section aria-labelledby="sheet-know-title">
			<h2 id="sheet-know-title">{m.adult_sheet_know_title()}</h2>
			<ul>
				<li>{m.adult_sheet_know_rhythm()}</li>
				<li>{m.adult_sheet_know_slow()}</li>
			</ul>
		</section>

		<p class="footer" data-sheet-footer>{m.adult_sheet_footer({ appName: m.app_name() })}</p>
	</article>
</ScreenFrame>

<style>
	.sheet {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--dd-space-xl);
		justify-self: stretch;
		text-align: start;
	}

	.header {
		color: var(--dd-color-text-secondary);
	}

	section {
		display: grid;
		gap: var(--dd-space-sm);
	}

	h2 {
		font-size: var(--dd-font-size-xl);
	}

	ul {
		display: grid;
		gap: var(--dd-space-xs);
		margin: 0;
		padding-inline-start: var(--dd-space-lg);
	}

	.footer {
		padding-block-start: var(--dd-space-md);
		border-block-start-width: var(--dd-border-width-thin);
		border-block-start-style: solid;
		border-block-start-color: var(--dd-color-border-strong);
		color: var(--dd-color-text-secondary);
		font-size: var(--dd-font-size-sm);
	}

	/*
	 * One A4 page, black on white, without the print button; `ScreenFrame` hides its way out.
	 * The page itself is reached through the sheet, so that no other screen prints otherwise.
	 */
	@media print {
		@page {
			size: A4;
			margin: var(--dd-size-print-page-margin);
		}

		:global(html:has([data-session-sheet])),
		:global(body:has([data-session-sheet])) {
			min-block-size: 0;
			background-color: var(--dd-color-print-paper);
			color: var(--dd-color-print-ink);
			font-size: var(--dd-font-size-print-base);
			line-height: var(--dd-line-height-print);
		}

		.tools {
			display: none;
		}

		.sheet {
			gap: var(--dd-space-md);
		}

		.header,
		.footer {
			color: var(--dd-color-print-ink);
		}

		section {
			gap: var(--dd-space-xs);
			break-inside: avoid;
		}

		h2 {
			font-size: var(--dd-font-size-print-heading);
		}

		ul {
			gap: 0;
		}

		.footer {
			padding-block-start: var(--dd-space-sm);
			border-block-start-color: var(--dd-color-print-ink);
			font-size: var(--dd-font-size-print-small);
		}
	}
</style>
