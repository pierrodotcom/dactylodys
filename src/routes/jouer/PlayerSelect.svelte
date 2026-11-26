<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import type { Profile, UnreadableProfile } from '$lib/state/types';
	import Button from '$lib/ui/components/Button.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import { focusOnMount } from '$lib/ui/focus';
	import { lastPlayerFirst } from './last-player';

	interface Props {
		profiles: readonly Profile[];
		/** The player who played last here: offered first, and set apart from the others. */
		lastPlayerId?: string | null;
		/** The browser cannot keep the profiles after the page is closed. */
		memoryOnly: boolean;
		loadFailed: boolean;
		onchoose: (profile: Profile) => void;
		onnew: () => void;
		/** Records the app cannot open; each one can be deleted after a confirmation. */
		unreadable?: readonly UnreadableProfile[];
		forgetFailed?: boolean;
		onforget?: (id: string) => void;
	}

	let {
		profiles,
		lastPlayerId = null,
		memoryOnly,
		loadFailed,
		onchoose,
		onnew,
		unreadable = [],
		forgetFailed = false,
		onforget = () => {}
	}: Props = $props();

	const ordered = $derived(lastPlayerFirst(profiles, lastPlayerId));
	/** With a last player to set apart, the others step back; with none, every player is offered alike. */
	const lastKnown = $derived(ordered[0]?.id === lastPlayerId);

	/** The record whose deletion waits for a confirmation: one at a time. */
	let confirming = $state<string | null>(null);

	function labelOf(record: UnreadableProfile): string {
		return record.name ?? m.play_unreadable_unnamed();
	}

	function forget(id: string) {
		confirming = null;
		onforget(id);
	}
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
			{#each ordered as profile (profile.id)}
				{@const last = lastKnown && profile.id === lastPlayerId}
				<li>
					<Button
						size="lg"
						variant={last || !lastKnown ? 'primary' : 'secondary'}
						data-last-player={last || undefined}
						onclick={() => onchoose(profile)}
					>
						{profile.name}
					</Button>
				</li>
			{/each}
		</ul>
	{/if}

	<!-- The only thing to do on an empty device is a main button; beside players, it steps back. -->
	<Button variant={profiles.length === 0 ? 'primary' : 'secondary'} onclick={onnew}>
		{m.play_new_player()}
	</Button>

	{#if unreadable.length > 0}
		<section class="unreadable" aria-labelledby="unreadable-title">
			<h2 id="unreadable-title">{m.play_unreadable_title()}</h2>
			<ul class="records">
				{#each unreadable as record, index (record.id ?? `no-id-${index}`)}
					<li class="record">
						<!-- One sentence, the name of the player in it: « Lou : abîmé, … ». -->
						<p data-unreadable-reason={record.reason}>
							{record.reason === 'newer-version'
								? m.play_unreadable_newer({ name: labelOf(record), appName: m.app_name() })
								: m.play_unreadable_invalid({ name: labelOf(record) })}
						</p>
						{#if record.id !== null}
							{@const id = record.id}
							{#if confirming === id}
								<!-- The question takes the focus: the button that asked it is gone. -->
								<p class="question" tabindex="-1" {@attach focusOnMount}>
									{m.play_unreadable_confirm({ name: labelOf(record) })}
								</p>
								<div class="actions">
									<Button variant="secondary" onclick={() => forget(id)}>
										{m.play_unreadable_confirm_yes()}
									</Button>
									<Button onclick={() => (confirming = null)}>
										{m.play_unreadable_confirm_no()}
									</Button>
								</div>
							{:else}
								<Button variant="secondary" onclick={() => (confirming = id)}>
									{m.play_unreadable_delete()}
								</Button>
							{/if}
						{/if}
					</li>
				{/each}
			</ul>
			{#if forgetFailed}
				<p class="notice" role="alert">{m.play_unreadable_failed()}</p>
			{/if}
		</section>
	{/if}
	<nav class="links" aria-label={m.play_players_links_label()}>
		<a class="home" href={resolve('/')}>{m.play_back_home()}</a>
		<a class="home" href={resolve('/adulte')} data-adult-entry>{m.adult_entry_link()}</a>
	</nav>
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

	/* A long nickname without a space is cut rather than wider than the page (320 pixels). */
	.list li {
		max-inline-size: 100%;
		overflow-wrap: anywhere;
	}

	.unreadable {
		display: grid;
		gap: var(--dd-space-sm);
		justify-items: center;
	}

	.unreadable h2 {
		font-size: var(--dd-font-size-lg);
	}

	.records {
		display: grid;
		gap: var(--dd-space-md);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.record,
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: var(--dd-space-sm);
	}

	.question:focus {
		outline: none;
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

	.links {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--dd-space-lg);
	}

	.home {
		display: inline-flex;
		align-items: center;
		min-block-size: var(--dd-size-touch-target-min);
		color: var(--dd-color-accent-base);
		font-weight: var(--dd-font-weight-bold);
	}
</style>
