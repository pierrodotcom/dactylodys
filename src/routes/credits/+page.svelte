<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import InfoPage from '$lib/ui/components/InfoPage.svelte';
	import {
		PROJECT_ATTRIBUTIONS_URL,
		PROJECT_LICENSE_URL,
		PROJECT_REPOSITORY_URL
	} from '$lib/ui/project-links';
	import {
		CODE_LICENSE,
		CONTENT_LICENSE,
		CREDIT_SOURCES,
		VOICE_AUTHOR,
		type CreditSourceId
	} from './sources';

	/** What the page says of each source, and the name of its link when it has an address. */
	const TEXTS: Record<
		CreditSourceId,
		{ text: (inputs: { license: string }) => string; link?: () => string }
	> = {
		font: { text: m.credits_source_font, link: m.credits_source_font_link },
		layout_pc: { text: m.credits_source_layout_pc, link: m.credits_source_layout_pc_link },
		layout_mac: { text: m.credits_source_layout_mac, link: m.credits_source_layout_mac_link },
		lexique: { text: m.credits_source_lexique, link: m.credits_source_lexique_link },
		wiktionary: { text: m.credits_source_wiktionary, link: m.credits_source_wiktionary_link },
		voice: { text: ({ license }) => m.credits_source_voice({ name: VOICE_AUTHOR, license }) }
	};
</script>

<InfoPage id="credits" title={m.info_link_credits()}>
	<p>{m.credits_intro({ appName: m.app_name() })}</p>

	<section aria-labelledby="credits-code">
		<h2 id="credits-code">{m.credits_code_title()}</h2>
		<p>{m.credits_code_text({ license: CODE_LICENSE })}</p>
		<p>
			<a href={PROJECT_REPOSITORY_URL} rel="external" data-repository-link
				>{m.credits_code_link()}</a
			>
		</p>
		<p><a href={PROJECT_LICENSE_URL} rel="external">{m.credits_license_link()}</a></p>
	</section>

	<section aria-labelledby="credits-content">
		<h2 id="credits-content">{m.credits_content_title()}</h2>
		<p>{m.credits_content_text({ license: CONTENT_LICENSE })}</p>
	</section>

	<section aria-labelledby="credits-layouts">
		<h2 id="credits-layouts">{m.credits_layouts_title()}</h2>
		<p>{m.credits_layouts_text()}</p>
	</section>

	<section aria-labelledby="credits-sources">
		<h2 id="credits-sources">{m.credits_sources_title()}</h2>
		<p>{m.credits_sources_intro()}</p>
		<ul>
			{#each CREDIT_SOURCES as source (source.id)}
				{@const texts = TEXTS[source.id]}
				<li data-credit-source={source.id}>
					{texts.text({ license: source.license })}
					{#if 'url' in source && texts.link}
						<a href={source.url} rel="external">{texts.link()}</a>
					{/if}
				</li>
			{/each}
		</ul>
		<p><a href={PROJECT_ATTRIBUTIONS_URL} rel="external">{m.credits_detail_link()}</a></p>
	</section>
</InfoPage>
