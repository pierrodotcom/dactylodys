<script lang="ts">
	import type { ProgressionDefinition } from '$lib/engine/progression/types';
	import { m } from '$lib/paraglide/messages.js';
	import type { Profile } from '$lib/state/types';
	import Button from '$lib/ui/components/Button.svelte';
	import ChoiceGroup from '$lib/ui/components/ChoiceGroup.svelte';
	import { focusOnMount } from '$lib/ui/focus';
	import type { Formatters } from './format';
	import { openedWorlds, worldsToOpen } from './place';

	interface Props {
		profile: Profile;
		progression: ProgressionDefinition;
		format: Formatters;
		/** Opens the world ahead; `false` when the device refused to store it. */
		onopenworld: (worldId: string) => Promise<boolean>;
	}

	let { profile, progression, format, onopenworld }: Props = $props();

	const closed = $derived(worldsToOpen(progression, profile));
	const opened = $derived(openedWorlds(progression, profile));
	const options = $derived(closed.map((world) => ({ value: world.id, label: world.title })));

	/** The world chosen in the list; the first closed one until the adult picks another. */
	let picked = $state<string | null>(null);
	const chosen = $derived(closed.find((world) => world.id === picked) ?? closed[0]);
	/** The world waiting for the confirmation of the adult. */
	let confirming = $state<string | null>(null);
	let status = $state('');
	let failed = $state(false);
	/** The question was answered "Cancel": the button that asked it takes the focus back. */
	let cancelled = $state(false);
	let statusLine = $state<HTMLElement | null>(null);

	function ask() {
		status = '';
		failed = false;
		cancelled = false;
		confirming = chosen?.id ?? null;
	}

	async function open(worldId: string) {
		const title = closed.find((world) => world.id === worldId)?.title ?? '';
		confirming = null;
		picked = null;
		const ok = await onopenworld(worldId);
		failed = !ok;
		status = ok ? m.adult_worlds_opened({ world: title, name: profile.name }) : '';
		// The buttons of the question are gone: the focus goes to what happened.
		statusLine?.focus();
	}

	function cancel() {
		confirming = null;
		cancelled = true;
	}
</script>

<section class="worlds" aria-labelledby="worlds-title" data-child-worlds>
	<h2 id="worlds-title">{m.adult_worlds_title()}</h2>
	<p>{m.adult_worlds_intro({ name: profile.name })}</p>
	<p class="note">{m.adult_worlds_note()}</p>
	{#if opened.length > 0}
		<p data-worlds-opened>
			{m.adult_worlds_already({ worlds: format.list(opened.map((world) => world.title)) })}
		</p>
	{/if}

	{#if chosen === undefined}
		<p data-worlds-none>{m.adult_worlds_none({ name: profile.name })}</p>
	{:else if confirming !== null}
		{@const waiting = confirming}
		<!-- The question takes the focus: the button that asked it is gone. -->
		<p class="question" tabindex="-1" {@attach focusOnMount}>
			{m.adult_worlds_confirm_question({
				world: closed.find((world) => world.id === waiting)?.title ?? '',
				name: profile.name
			})}
		</p>
		<div class="actions">
			<Button onclick={() => open(waiting)} data-world-confirm>{m.adult_worlds_confirm()}</Button>
			<Button variant="secondary" onclick={cancel}>
				{m.adult_worlds_cancel()}
			</Button>
		</div>
	{:else}
		<ChoiceGroup
			legend={m.adult_worlds_legend()}
			name="world-to-open"
			{options}
			value={chosen.id}
			onchange={(value) => (picked = value)}
		/>
		<Button
			variant="secondary"
			onclick={ask}
			data-world-open
			{@attach cancelled ? focusOnMount : undefined}
		>
			{m.adult_worlds_open()}
		</Button>
	{/if}
	<p role="status" tabindex="-1" bind:this={statusLine}>
		{#if failed}
			<span class="problem">{m.adult_worlds_failed()}</span>
		{:else}
			{status}
		{/if}
	</p>
</section>

<style>
	.worlds {
		display: grid;
		gap: var(--dd-space-md);
		justify-items: start;
		text-align: start;
	}

	h2 {
		font-size: var(--dd-font-size-xl);
	}

	.note {
		color: var(--dd-color-text-secondary);
	}

	.question {
		font-weight: var(--dd-font-weight-bold);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dd-space-sm);
	}

	.problem {
		color: var(--dd-color-error-text);
		font-weight: var(--dd-font-weight-bold);
	}
</style>
