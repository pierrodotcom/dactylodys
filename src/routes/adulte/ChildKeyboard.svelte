<script lang="ts">
	import { masteryGroups, type MasteryRules } from '$lib/engine/progression/mastery';
	import type { ProgressState } from '$lib/engine/progression/types';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import type { Settings } from '$lib/state/types';
	import KeyboardView from '$lib/ui/components/KeyboardView.svelte';
	import { loadKeyboardAssets, type KeyboardAssets } from '../jouer/assets';
	import { keyLabel } from '../jouer/companion';
	import type { Formatters } from './format';
	import { keyMasteries } from './report';

	interface Props {
		progress: ProgressState;
		settings: Settings;
		rules: MasteryRules;
		format: Formatters;
	}

	let { progress, settings, rules, format }: Props = $props();

	let assets = $state.raw<KeyboardAssets | null>(null);
	let failed = $state(false);

	$effect(() => {
		let cancelled = false;
		const wanted = { layoutId: settings.layoutId, fingeringProfileId: settings.fingeringProfileId };
		loadKeyboardAssets(wanted).then(
			(loaded) => {
				if (!cancelled) assets = loaded;
			},
			() => {
				if (!cancelled) failed = true;
			}
		);
		return () => {
			cancelled = true;
		};
	});

	const locale = getLocale();
	const collator = new Intl.Collator(locale);
	const groups = $derived(masteryGroups(progress, rules, collator.compare));
	const keys = $derived(assets ? keyMasteries(progress, assets.charIndex, rules) : new Map());

	function written(chars: readonly string[]): string {
		if (chars.length === 0) return m.adult_keys_none();
		return format.list(chars.map((char) => keyLabel(char, m.ui_key_space(), locale)));
	}
</script>

<section class="keys" aria-labelledby="keys-title" data-child-keyboard>
	<h2 id="keys-title">{m.adult_keyboard_title()}</h2>
	<p>{m.adult_keyboard_intro()}</p>
	{#if assets}
		<div class="board">
			<KeyboardView
				layout={assets.layout}
				geometry={assets.geometry}
				fingering={assets.fingering}
				target={null}
				wrongCode={null}
				showFingers={false}
				mastery={keys}
			/>
		</div>
	{:else if failed}
		<p>{m.adult_keyboard_failed()}</p>
	{/if}
	<ul class="legend">
		<li>
			<span class="sample" data-mastery="acquired"></span>{m.adult_keyboard_legend_acquired()}
		</li>
		<li><span class="sample" data-mastery="fragile"></span>{m.adult_keyboard_legend_fragile()}</li>
		<li><span class="sample"></span>{m.adult_keyboard_legend_other()}</li>
	</ul>
	<ul class="lists" data-mastery-lists>
		<li data-keys="acquired">{m.adult_keys_acquired({ keys: written(groups.acquired) })}</li>
		<li data-keys="fragile">{m.adult_keys_fragile({ keys: written(groups.fragile) })}</li>
		<li data-keys="learning">{m.adult_keys_learning({ keys: written(groups.learning) })}</li>
	</ul>
</section>

<style>
	.keys {
		display: grid;
		gap: var(--dd-space-md);
		justify-items: start;
		text-align: start;
	}

	h2 {
		font-size: var(--dd-font-size-xl);
	}

	.board {
		justify-self: stretch;
	}

	.legend,
	.lists {
		display: grid;
		gap: var(--dd-space-sm);
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.legend li {
		display: flex;
		align-items: center;
		gap: var(--dd-space-sm);
	}

	.sample {
		flex: none;
		inline-size: var(--dd-size-key-hint);
		block-size: var(--dd-size-key-hint);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-key-border);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-key-surface);
	}

	.sample[data-mastery='acquired'] {
		outline-style: solid;
		outline-width: var(--dd-border-width-target);
		outline-color: var(--dd-color-mastery-acquired-line);
		outline-offset: 0;
		background-color: var(--dd-color-mastery-acquired-surface);
	}

	.sample[data-mastery='fragile'] {
		outline-style: dashed;
		outline-width: var(--dd-border-width-target);
		outline-color: var(--dd-color-mastery-fragile-line);
		outline-offset: 0;
		background-color: var(--dd-color-mastery-fragile-surface);
	}
</style>
