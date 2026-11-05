<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
	import InfoPage from '$lib/ui/components/InfoPage.svelte';
	import { ADULT_RULES } from '../adulte/adult-rules';
	import { PLAY_RULES } from '../jouer/play-rules';

	const appName = m.app_name();
</script>

<InfoPage id="adults" title={m.info_link_adults()}>
	<p>{m.guide_intro({ appName })}</p>
	<div data-print-hidden>
		<Button variant="secondary" onclick={() => window.print()}>{m.info_print()}</Button>
	</div>

	<section aria-labelledby="guide-purpose">
		<h2 id="guide-purpose">{m.guide_purpose_title()}</h2>
		<p>{m.guide_purpose_text({ appName })}</p>
		<p>{m.guide_audience_text()}</p>
		<p data-info-notice>{m.guide_not_treatment()}</p>
	</section>

	<section aria-labelledby="guide-session">
		<h2 id="guide-session">{m.guide_session_title()}</h2>
		<p>{m.guide_session_text()}</p>
		<p>
			{m.guide_session_break({
				exercises: PLAY_RULES.breakAfterExercises,
				minutes: PLAY_RULES.breakAfterMinutes
			})}
		</p>
		<p>{m.guide_session_errors()}</p>
	</section>

	<section aria-labelledby="guide-accuracy">
		<h2 id="guide-accuracy">{m.guide_accuracy_title()}</h2>
		<p>{m.guide_accuracy_text()}</p>
		<p>{m.guide_accuracy_why()}</p>
	</section>

	<section aria-labelledby="guide-target">
		<h2 id="guide-target">{m.guide_target_title()}</h2>
		<p>{m.guide_target_text()}</p>
		<p>{m.guide_measure_intro()}</p>
		<ol>
			<li>{m.adult_measure_step_1()}</li>
			<li>{m.adult_measure_step_2()}</li>
			<li>{m.adult_measure_step_3()}</li>
			<li>{m.guide_measure_step_4({ section: m.adult_target_title() })}</li>
		</ol>
	</section>

	<section aria-labelledby="guide-slow">
		<h2 id="guide-slow">{m.guide_slow_title()}</h2>
		<p>{m.guide_slow_text()}</p>
		<p>{m.guide_slow_advice()}</p>
	</section>

	<section aria-labelledby="guide-space">
		<h2 id="guide-space">{m.guide_space_title()}</h2>
		<p>
			{m.guide_space_open({
				play: m.home_play(),
				change: m.play_change_player(),
				players: m.play_players_title(),
				entry: m.adult_entry_link()
			})}
		</p>
		<p data-print-hidden><a href={resolve('/adulte')}>{m.guide_space_link()}</a></p>
		<p>{m.guide_space_list_intro()}</p>
		<ul>
			<li>{m.guide_space_report()}</li>
			<li>{m.guide_space_evolution()}</li>
			<li>{m.guide_space_target()}</li>
			<li>{m.guide_space_measures()}</li>
			<li>{m.guide_space_backup()}</li>
			<li>{m.guide_space_place({ title: m.adult_worlds_title() })}</li>
			<li>{m.guide_space_words({ title: m.adult_words_title() })}</li>
			<li>{m.guide_space_settings()}</li>
			<li>{m.guide_space_install()}</li>
			<li>{m.guide_space_code({ length: ADULT_RULES.codeLength })}</li>
		</ul>
		<p>{m.guide_space_no_ranking()}</p>
	</section>

	<section aria-labelledby="guide-privacy">
		<h2 id="guide-privacy">{m.guide_privacy_title()}</h2>
		<p>{m.guide_privacy_text()}</p>
	</section>

	<section aria-labelledby="guide-tips">
		<h2 id="guide-tips">{m.guide_tips_title()}</h2>
		<ul>
			<li>{m.guide_tip_posture()}</li>
			<li>{m.guide_tip_regular()}</li>
			<li>{m.guide_tip_eyes()}</li>
			<li>{m.guide_tip_effort()}</li>
			<li>{m.guide_tip_choice()}</li>
		</ul>
	</section>
</InfoPage>
