<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import InfoPage from '$lib/ui/components/InfoPage.svelte';
</script>

<InfoPage id="privacy" title={m.info_link_privacy()}>
	<p>{m.privacy_intro({ appName: m.app_name() })}</p>

	<section aria-labelledby="privacy-kept">
		<h2 id="privacy-kept">{m.privacy_kept_title()}</h2>
		<p>{m.privacy_kept_intro()}</p>
		<ul>
			<li>{m.privacy_kept_profiles()}</li>
			<li>{m.privacy_kept_local()}</li>
			<li>{m.privacy_kept_files()}</li>
		</ul>
		<p>{m.privacy_nickname()}</p>
	</section>

	<section aria-labelledby="privacy-never">
		<h2 id="privacy-never">{m.privacy_never_title()}</h2>
		<ul>
			<li>{m.privacy_never_send()}</li>
			<li>{m.privacy_never_third()}</li>
			<li>{m.privacy_never_external()}</li>
		</ul>
		<p>{m.privacy_host()}</p>
	</section>

	<section aria-labelledby="privacy-backup">
		<h2 id="privacy-backup">{m.privacy_backup_title()}</h2>
		<p>{m.privacy_backup_how({ all: m.adult_backup_all() })}</p>
		<p>{m.privacy_backup_content()}</p>
		<p>{m.privacy_backup_restore({ load: m.adult_import_label() })}</p>
		<p>{m.privacy_measures()}</p>
	</section>

	<section aria-labelledby="privacy-erase">
		<h2 id="privacy-erase">{m.privacy_erase_title()}</h2>
		<p>{m.privacy_erase_how()}</p>
		<p>{m.privacy_erase_backup_first()}</p>
		<p>{m.privacy_private_browsing()}</p>
	</section>
</InfoPage>
