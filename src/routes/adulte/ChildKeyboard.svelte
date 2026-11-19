<script lang="ts">
	import type { CharIndex, KeyCode } from '$lib/keyboard/types';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import type { Profile } from '$lib/state/types';
	import KeyboardView from '$lib/ui/components/KeyboardView.svelte';
	import { loadKeyboardAssets, type KeyboardAssets } from '../jouer/assets';
	import { keyLabel } from '../jouer/companion';
	import type { AdultRules } from './adult-rules';
	import type { Formatters } from './format';
	import { adultKeyStates, type AdultCharState } from './report';

	interface Props {
		profile: Pick<Profile, 'progress' | 'charDays' | 'settings'>;
		rules: Pick<AdultRules, 'mastery' | 'acquired' | 'hesitation'>;
		format: Formatters;
	}

	let { profile, rules, format }: Props = $props();

	/** The keyboard drawn frames the acquired keys and the fragile ones; the lists say the rest. */
	const DRAWN: Readonly<Record<AdultCharState, 'acquired' | 'learning' | 'fragile'>> = {
		acquired: 'acquired',
		'typed-right': 'learning',
		learning: 'learning',
		fragile: 'fragile'
	};
	const NO_KEYS: CharIndex = new Map();
	const PERCENT = 100;
	const WHOLE = 0;

	let assets = $state.raw<KeyboardAssets | null>(null);
	let failed = $state(false);

	$effect(() => {
		let cancelled = false;
		const wanted = {
			layoutId: profile.settings.layoutId,
			fingeringProfileId: profile.settings.fingeringProfileId
		};
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
	// The lists wait for the layout: whether a key is long to find is read on its physical key.
	// Without it (it could not be loaded), they are said without the hesitant keys.
	const charIndex = $derived(assets?.charIndex ?? (failed ? NO_KEYS : null));
	const states = $derived(
		charIndex ? adultKeyStates(profile, charIndex, rules, collator.compare) : null
	);
	const drawn = $derived(
		new Map<KeyCode, 'acquired' | 'learning' | 'fragile'>(
			[...(states?.keys ?? [])].map(([code, state]) => [code, DRAWN[state]])
		)
	);
	const percent = (rate: number) => format.number(rate * PERCENT, WHOLE);

	function written(chars: readonly string[]): string {
		if (chars.length === 0) return m.adult_keys_none();
		return format.list(
			chars.map((char) => keyLabel(char, m.ui_key_space(), locale, m.ui_key_enter()))
		);
	}
</script>

<section class="keys" aria-labelledby="keys-title" data-child-keyboard>
	<h2 id="keys-title">{m.adult_keyboard_title()}</h2>
	<p>
		{m.adult_keyboard_intro({
			recent: rules.mastery.acquiredMinAttempts,
			errors: percent(rules.mastery.acquiredMaxErrorRate),
			days: rules.acquired.minDays,
			attempts: rules.acquired.minAttempts,
			acquiredErrors: percent(rules.acquired.maxErrorRate)
		})}
	</p>
	{#if assets}
		<div class="board" data-keyboard-board>
			<KeyboardView
				layout={assets.layout}
				geometry={assets.geometry}
				fingering={assets.fingering}
				target={null}
				wrongCode={null}
				showFingers={false}
				mastery={drawn}
			/>
		</div>
		<ul class="legend" data-keyboard-legend>
			<li>
				<span class="sample" data-mastery="acquired"></span>{m.adult_keyboard_legend_acquired()}
			</li>
			<li>
				<span class="sample" data-mastery="fragile"></span>{m.adult_keyboard_legend_fragile()}
			</li>
			<li><span class="sample"></span>{m.adult_keyboard_legend_other()}</li>
		</ul>
	{:else if failed}
		<p>{m.adult_keyboard_failed()}</p>
	{/if}
	{#if states}
		<ul class="lists" data-mastery-lists>
			<li data-keys="acquired">
				{m.adult_keys_acquired({ keys: written(states.groups.acquired) })}
			</li>
			<li data-keys="typed-right">
				{m.adult_keys_typed_right({ keys: written(states.groups['typed-right']) })}
			</li>
			<li data-keys="fragile">{m.adult_keys_fragile({ keys: written(states.groups.fragile) })}</li>
			<li data-keys="learning">
				{m.adult_keys_learning({ keys: written(states.groups.learning) })}
			</li>
			{#if assets}
				<li data-keys="hesitant">
					{states.hesitant.length === 0
						? m.adult_keys_hesitant_none()
						: m.adult_keys_hesitant({ keys: written(states.hesitant) })}
				</li>
			{/if}
		</ul>
	{/if}
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
