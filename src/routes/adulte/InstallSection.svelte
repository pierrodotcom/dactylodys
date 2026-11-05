<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { installPrompt, type InstallOutcome } from '$lib/offline/install-prompt';
	import type { InstallState } from '$lib/offline/install-state';
	import Button from '$lib/ui/components/Button.svelte';

	/** Nothing is known before the page is open in a browser: the server cannot tell. */
	let offer = $state<InstallState | null>(null);
	/** What happened to the last request: it stays on screen, the event cannot be used twice. */
	let outcome = $state<InstallOutcome | null>(null);
	/** The dialog of the browser is open: nothing to say yet. */
	let asking = $state(false);

	const answer = $derived.by(() => {
		if (asking) return '';
		if (offer === 'installed') return m.adult_install_done({ appName: m.app_name() });
		if (outcome === 'accepted') return m.adult_install_started();
		if (outcome === 'dismissed') return m.adult_install_declined();
		if (offer === 'ios') return m.adult_install_ios();
		if (offer === 'unsupported') return m.adult_install_other();
		return '';
	});

	onMount(() => {
		const update = () => (offer = installPrompt.state());
		update();
		return installPrompt.subscribe(update);
	});

	async function install() {
		asking = true;
		outcome = await installPrompt.request();
		asking = false;
	}
</script>

<section aria-labelledby="install-title" data-adult-install>
	<h2 id="install-title">{m.adult_install_title()}</h2>
	<p>{m.adult_install_note()}</p>
	{#if offer === 'ready' && outcome === null}
		<Button variant="secondary" onclick={install} data-install>{m.adult_install_button()}</Button>
	{/if}
	<p role="status" data-install-answer>{answer}</p>
</section>

<style>
	section {
		display: grid;
		gap: var(--dd-space-md);
		justify-items: start;
	}

	h2 {
		font-size: var(--dd-font-size-xl);
	}
</style>
