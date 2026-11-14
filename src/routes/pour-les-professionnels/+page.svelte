<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { LAYOUT_IDS } from '$lib/keyboard/layout-ids';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import Button from '$lib/ui/components/Button.svelte';
	import InfoPage from '$lib/ui/components/InfoPage.svelte';
	import { createFormatters } from '../adulte/format';
	import { progressionFor } from '../jouer/content';
	import { LAYOUT_LABELS } from '../jouer/labels';
	import { PLAY_RULES } from '../jouer/play-rules';
	import { professionalFacts } from './facts';
	import { RESEARCH_SUMMARY_URL, REVIEW_ISSUE_URL } from './links';

	const appName = m.app_name();
	const format = createFormatters(getLocale());
	const progression = progressionFor(LAYOUT_IDS[0]);
	if (!progression) throw new Error(`no progression for ${LAYOUT_IDS[0]}`);
	const facts = professionalFacts(progression, PLAY_RULES);
	const pause = { exercises: facts.breakAfterExercises, minutes: facts.breakAfterMinutes };
	const accuracy = format.number(facts.unlockAccuracy, 0);
	const layouts = format.list(LAYOUT_IDS.map((id) => LAYOUT_LABELS[id]()));

	// Paper has no links: the printed sheet says where to find the game. Known only in the browser.
	let gameUrl = $state('');
	onMount(() => {
		gameUrl = new URL(resolve('/'), window.location.href).href;
	});
</script>

<InfoPage id="professionals" title={m.info_link_professionals()}>
	<p>{m.pro_intro({ appName })}</p>
	{#if gameUrl}
		<p data-print-only data-game-address>{m.pro_game_address({ url: gameUrl })}</p>
	{/if}
	<div data-print-hidden>
		<Button variant="secondary" onclick={() => window.print()}>{m.info_print()}</Button>
	</div>

	<section aria-labelledby="pro-about">
		<h2 id="pro-about">{m.pro_about_title()}</h2>
		<p>
			{m.pro_about_what({ appName })}
			{m.pro_about_free()}
			{m.pro_about_offline()}
		</p>
	</section>

	<section aria-labelledby="pro-audience">
		<h2 id="pro-audience">{m.pro_audience_title()}</h2>
		<p>{m.pro_audience_who()}</p>
		<p>{m.pro_audience_goal()}</p>
		<p>{m.pro_audience_why()}</p>
		<p>{m.pro_audience_path({ lessons: facts.lessons, worlds: facts.worlds })}</p>
	</section>

	<section aria-labelledby="pro-design" data-print-breakable>
		<h2 id="pro-design">{m.pro_design_title()}</h2>
		<p>{m.pro_design_intro()}</p>
		<ul>
			<li>
				<strong>{m.pro_design_accuracy_name()}</strong>
				{m.pro_design_accuracy({ accuracy })}
			</li>
			<li>
				<strong>{m.pro_design_sessions_name()}</strong>
				{m.pro_design_sessions(pause)}
			</li>
			<li><strong>{m.pro_design_no_hook_name()}</strong> {m.pro_design_no_hook()}</li>
			<li><strong>{m.pro_design_fade_name()}</strong> {m.pro_design_fade()}</li>
			<li>
				<strong>{m.pro_design_senses_name()}</strong>
				{m.pro_design_senses({ calm: m.settings_calm_button() })}
			</li>
			<li><strong>{m.pro_design_backspace_name()}</strong> {m.pro_design_backspace()}</li>
			<li><strong>{m.pro_design_age_name()}</strong> {m.pro_design_age()}</li>
			<li><strong>{m.pro_design_sheet_name()}</strong> {m.pro_design_sheet()}</li>
			<li><strong>{m.pro_design_story_name()}</strong> {m.pro_design_story()}</li>
		</ul>
		<p data-print-hidden>
			<a href={RESEARCH_SUMMARY_URL} rel="external" data-research-link
				>{m.pro_design_sources_link()}</a
			>
		</p>
	</section>

	<section aria-labelledby="pro-use">
		<h2 id="pro-use">{m.pro_use_title()}</h2>
		<ul>
			<li>{m.pro_use_players({ players: m.play_players_title() })}</li>
			<li>{m.pro_use_space()}</li>
			<li>{m.pro_use_tools()}</li>
			<li>{m.pro_use_backup()}</li>
			<li>{m.pro_use_layouts({ layouts })}</li>
			<li>{m.pro_use_rhythm()}</li>
		</ul>
		<p>{m.pro_use_guide({ page: m.info_link_adults() })}</p>
		<p data-print-hidden><a href={resolve('/pour-les-adultes')}>{m.info_link_adults()}</a></p>
	</section>

	<section aria-labelledby="pro-not">
		<h2 id="pro-not">{m.pro_not_title()}</h2>
		<p data-info-notice>{m.pro_not_treatment()}</p>
		<p>{m.pro_not_assessment()}</p>
		<p>{m.pro_not_decision()}</p>
	</section>

	<section aria-labelledby="pro-limits">
		<h2 id="pro-limits">{m.pro_limits_title()}</h2>
		<ul>
			<li>{m.pro_limit_language()}</li>
			<li>{m.pro_limit_fingering()}</li>
			<li>{m.pro_limit_dictation()}</li>
			<li>{m.pro_limit_keyboard()}</li>
			<li>{m.pro_limit_evaluation()}</li>
		</ul>
	</section>

	<section aria-labelledby="pro-review" data-print-breakable>
		<h2 id="pro-review">{m.pro_review_title()}</h2>
		<p>{m.pro_review_intro()}</p>
		<ol data-review-questions>
			<li>{m.pro_review_q_order()}</li>
			<li>{m.pro_review_q_fingering()}</li>
			<li>{m.pro_review_q_duration(pause)}</li>
			<li>{m.pro_review_q_threshold({ accuracy })}</li>
			<li>
				{m.pro_review_q_fade({
					attempts: facts.fadeMinAttempts,
					errors: format.number(facts.fadeMaxErrorPercent, 0)
				})}
			</li>
			<li>{m.pro_review_q_measures()}</li>
			<li>{m.pro_review_q_practice()}</li>
			<li>{m.pro_review_q_wording()}</li>
		</ol>
		<p>{m.pro_review_how()}</p>
		<p data-print-hidden>
			<a href={REVIEW_ISSUE_URL} rel="external" data-review-link>{m.pro_review_link()}</a>
		</p>
		<p data-print-only>{m.pro_review_address({ url: REVIEW_ISSUE_URL })}</p>
	</section>
</InfoPage>
