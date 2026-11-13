<script lang="ts" module>
	/** The pages written for adults, linked from the home page and from the adult space. */
	export type InfoPageId = 'adults' | 'professionals' | 'privacy' | 'accessibility';
</script>

<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		/** The page these links are shown on, if it is one of them. */
		current?: InfoPageId;
		/** The id of a heading that names the links; without it, they are named by a label. */
		labelledby?: string;
	}

	let { current, labelledby }: Props = $props();

	const links = [
		{ id: 'adults', route: '/pour-les-adultes', label: m.info_link_adults() },
		{
			id: 'professionals',
			route: '/pour-les-professionnels',
			label: m.info_link_professionals()
		},
		{ id: 'privacy', route: '/confidentialite', label: m.info_link_privacy() },
		{ id: 'accessibility', route: '/accessibilite', label: m.info_link_accessibility() }
	] as const;
</script>

<nav
	class="info-links"
	aria-labelledby={labelledby}
	aria-label={labelledby ? undefined : m.info_links_label()}
	data-info-links
>
	<ul>
		{#each links as link (link.id)}
			<li>
				<a href={resolve(link.route)} aria-current={link.id === current ? 'page' : undefined}
					>{link.label}</a
				>
			</li>
		{/each}
	</ul>
</nav>

<style>
	ul {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--dd-space-xs) var(--dd-space-lg);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	a {
		display: inline-flex;
		align-items: center;
		min-block-size: var(--dd-size-touch-target-min);
		color: var(--dd-color-accent-base);
		font-size: var(--dd-font-size-sm);
	}

	a[aria-current='page'] {
		color: var(--dd-color-text-primary);
		font-weight: var(--dd-font-weight-bold);
	}
</style>
