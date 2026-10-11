<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import type { Profile } from '$lib/state/types';
	import Button from '$lib/ui/components/Button.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';

	interface Props {
		profiles: readonly Profile[];
		/** The browser cannot keep the profiles after the page is closed. */
		memoryOnly: boolean;
		loadFailed: boolean;
		onchoose: (profile: Profile) => void;
		onnew: () => void;
	}

	let { profiles, memoryOnly, loadFailed, onchoose, onnew }: Props = $props();
</script>

<ScreenFrame title={m.play_players_title()}>
	{#if memoryOnly}
		<p class="notice">{m.play_storage_memory_note()}</p>
	{/if}
	{#if loadFailed}
		<p class="notice" role="alert">{m.play_error_load()}</p>
	{/if}

	{#if profiles.length === 0}
		<p class="empty">{m.play_players_empty()}</p>
	{:else}
		<ul class="list" aria-label={m.play_players_list_label()}>
			{#each profiles as profile (profile.id)}
				<li>
					<Button size="lg" onclick={() => onchoose(profile)}>{profile.name}</Button>
				</li>
			{/each}
		</ul>
	{/if}

	<Button variant="secondary" onclick={onnew}>{m.play_new_player()}</Button>
	<a class="home" href={resolve('/')}>{m.play_back_home()}</a>
</ScreenFrame>

<style>
	.list {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--dd-space-md);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.empty {
		font-size: var(--dd-font-size-lg);
		color: var(--dd-color-text-secondary);
	}

	.notice {
		padding: var(--dd-space-sm) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-oops-outline);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-sunken);
	}

	.home {
		display: inline-flex;
		align-items: center;
		min-block-size: var(--dd-size-touch-target-min);
		color: var(--dd-color-accent-base);
		font-weight: var(--dd-font-weight-bold);
	}
</style>
