<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import InfoPage from '$lib/ui/components/InfoPage.svelte';
	import { PROJECT_ISSUES_URL } from '$lib/ui/project-links';
</script>

<InfoPage id="accessibility" title={m.info_link_accessibility()}>
	<p>{m.a11y_intro({ appName: m.app_name() })}</p>
	<p>{m.a11y_no_label()}</p>

	<section aria-labelledby="a11y-checked">
		<h2 id="a11y-checked">{m.a11y_checked_title()}</h2>
		<ul>
			<li>{m.a11y_checked_keyboard()}</li>
			<li>{m.a11y_checked_axe()}</li>
			<li>{m.a11y_checked_reflow()}</li>
			<li>{m.a11y_checked_contrast()}</li>
			<li>{m.a11y_checked_targets()}</li>
			<li>{m.a11y_checked_motion()}</li>
			<li>{m.a11y_checked_reader()}</li>
		</ul>
	</section>

	<section aria-labelledby="a11y-limits">
		<h2 id="a11y-limits">{m.a11y_limits_title()}</h2>
		<ul>
			<li>{m.a11y_limit_sight()}</li>
			<li>{m.a11y_limit_reader()}</li>
			<li>{m.a11y_limit_small_keys()}</li>
			<li>{m.a11y_limit_hand()}</li>
			<li>{m.a11y_limit_tab_title()}</li>
		</ul>
	</section>

	<section aria-labelledby="a11y-settings">
		<h2 id="a11y-settings">{m.a11y_settings_title()}</h2>
		<p>{m.a11y_settings_where({ open: m.play_settings_open() })}</p>
		<ul>
			<li>{m.a11y_setting_theme({ label: m.settings_theme_label() })}</li>
			<li>{m.a11y_setting_motion({ label: m.settings_motion_label() })}</li>
			<li>{m.a11y_setting_scale({ label: m.settings_scale_label() })}</li>
			<li>{m.a11y_setting_spacing({ label: m.settings_spacing_label() })}</li>
			<li>{m.a11y_setting_keyboard({ label: m.settings_keyboard_label() })}</li>
			<li>{m.a11y_setting_hand({ label: m.settings_hand_label() })}</li>
			<li>
				{m.a11y_setting_sound({ sound: m.settings_sound_label(), voice: m.settings_voice_label() })}
			</li>
		</ul>
	</section>

	<section aria-labelledby="a11y-report">
		<h2 id="a11y-report">{m.a11y_report_title()}</h2>
		<p>{m.a11y_report_text()}</p>
		<p><a href={PROJECT_ISSUES_URL} rel="external" data-issues-link>{m.a11y_report_link()}</a></p>
	</section>
</InfoPage>
