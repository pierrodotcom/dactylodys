<script lang="ts">
	import { fingerForKey } from '$lib/keyboard/fingering';
	import type {
		FingeringProfile,
		KeyboardGeometryDefinition,
		KeyCode,
		KeyPress,
		LayoutDefinition
	} from '$lib/keyboard/types';
	import HandGuide from './HandGuide.svelte';
	import { homeKeyCodes, keyLabel, modifierCodes } from './key-labels';
	import { keyName } from './names';

	interface Props {
		layout: LayoutDefinition;
		geometry: KeyboardGeometryDefinition;
		fingering: FingeringProfile;
		target: KeyPress | null;
		wrongCode: KeyCode | null;
		showFingers: boolean;
		/** Further keys to highlight like the target, e.g. the new keys of a lesson. */
		marked?: readonly KeyCode[];
		/** Hands drawn over the keys, showing these presses in turn; `null`: no hands. */
		hands?: { readonly presses: readonly KeyPress[]; readonly trigger: string } | null;
		/** Calm motion for the hands: the finger lights up, it does not move. */
		still?: boolean;
	}

	let {
		layout,
		geometry,
		fingering,
		target,
		wrongCode,
		showFingers,
		marked = [],
		hands = null,
		still = false
	}: Props = $props();

	const markedKeys = $derived(new Set(marked));
	const homeKeys = $derived(new Set(homeKeyCodes(fingering)));
	const modifiers = $derived(new Set(target === null ? [] : modifierCodes(target, fingering)));
	const rows = $derived(
		geometry.rows.map((row) => ({
			offset: row.offset,
			keys: row.keys.map((key) => {
				const label = keyLabel(layout, key.code) ?? keyName(key.code) ?? '';
				return {
					code: key.code,
					width: key.width,
					label,
					isLong: label.length > 1,
					finger: fingerForKey(fingering, key.code)
				};
			})
		}))
	);
</script>

<div class="keyboard" aria-hidden="true">
	{#each rows as row, rowIndex (rowIndex)}
		<div class="row">
			{#if row.offset > 0}
				<span class="slot" data-width={row.offset}></span>
			{/if}
			{#each row.keys as key (key.code)}
				<span
					class="key"
					data-code={key.code}
					data-width={key.width}
					data-finger={(showFingers && key.finger) || undefined}
					data-target={target?.code === key.code || markedKeys.has(key.code) || undefined}
					data-modifier={modifiers.has(key.code) || undefined}
					data-wrong={wrongCode === key.code || undefined}
				>
					<span class="label" data-long={key.isLong || undefined}>{key.label}</span>
					{#if homeKeys.has(key.code)}
						<span class="home-mark"></span>
					{/if}
				</span>
			{/each}
		</div>
	{/each}
	{#if hands}
		<HandGuide {geometry} {fingering} presses={hands.presses} trigger={hands.trigger} {still} />
	{/if}
</div>

<style>
	.keyboard {
		position: relative;
		display: inline-grid;
		gap: var(--dd-size-key-gap);
		max-inline-size: 100%;
		padding: var(--dd-space-sm);
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-surface-sunken);
	}

	.row {
		display: flex;
		gap: var(--dd-size-key-gap);
	}

	.slot,
	.key {
		flex: none;
		inline-size: var(--dd-size-key-unit);
		block-size: var(--dd-size-key-unit);
	}

	[data-width='1.25'] {
		inline-size: calc(var(--dd-size-key-unit) * 1.25 + var(--dd-size-key-gap) * 0.25);
	}

	[data-width='1.5'] {
		inline-size: calc(var(--dd-size-key-unit) * 1.5 + var(--dd-size-key-gap) * 0.5);
	}

	[data-width='1.75'] {
		inline-size: calc(var(--dd-size-key-unit) * 1.75 + var(--dd-size-key-gap) * 0.75);
	}

	[data-width='2'] {
		inline-size: calc(var(--dd-size-key-unit) * 2 + var(--dd-size-key-gap));
	}

	[data-width='2.25'] {
		inline-size: calc(var(--dd-size-key-unit) * 2.25 + var(--dd-size-key-gap) * 1.25);
	}

	[data-width='2.5'] {
		inline-size: calc(var(--dd-size-key-unit) * 2.5 + var(--dd-size-key-gap) * 1.5);
	}

	[data-width='2.75'] {
		inline-size: calc(var(--dd-size-key-unit) * 2.75 + var(--dd-size-key-gap) * 1.75);
	}

	[data-width='3'] {
		inline-size: calc(var(--dd-size-key-unit) * 3 + var(--dd-size-key-gap) * 2);
	}

	[data-width='6.25'] {
		inline-size: calc(var(--dd-size-key-unit) * 6.25 + var(--dd-size-key-gap) * 5.25);
	}

	[data-width='7'] {
		inline-size: calc(var(--dd-size-key-unit) * 7 + var(--dd-size-key-gap) * 6);
	}

	.key {
		position: relative;
		display: grid;
		place-items: center;
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-key-border);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-key-surface);
		color: var(--dd-color-key-text);
		font-size: var(--dd-font-size-key);
		font-weight: var(--dd-font-weight-bold);
		line-height: var(--dd-line-height-tight);
		transition-property: scale;
		transition-duration: var(--dd-duration-fast);
		transition-timing-function: var(--dd-easing-standard);
	}

	.label,
	.home-mark {
		grid-area: 1 / 1;
	}

	.label[data-long] {
		font-size: var(--dd-font-size-key-small);
	}

	.home-mark {
		align-self: end;
		inline-size: var(--dd-size-key-home-mark);
		block-size: var(--dd-border-width-thick);
		margin-block-end: var(--dd-space-xs);
		border-radius: var(--dd-radius-pill);
		background-color: currentColor;
	}

	.key[data-finger] {
		color: var(--dd-color-key-text-on-finger);
	}

	.key[data-finger='left-pinky'] {
		background-color: var(--dd-color-finger-left-pinky);
	}

	.key[data-finger='left-ring'] {
		background-color: var(--dd-color-finger-left-ring);
	}

	.key[data-finger='left-middle'] {
		background-color: var(--dd-color-finger-left-middle);
	}

	.key[data-finger='left-index'] {
		background-color: var(--dd-color-finger-left-index);
	}

	.key[data-finger='left-thumb'] {
		background-color: var(--dd-color-finger-left-thumb);
	}

	.key[data-finger='right-thumb'] {
		background-color: var(--dd-color-finger-right-thumb);
	}

	.key[data-finger='right-index'] {
		background-color: var(--dd-color-finger-right-index);
	}

	.key[data-finger='right-middle'] {
		background-color: var(--dd-color-finger-right-middle);
	}

	.key[data-finger='right-ring'] {
		background-color: var(--dd-color-finger-right-ring);
	}

	.key[data-finger='right-pinky'] {
		background-color: var(--dd-color-finger-right-pinky);
	}

	.key[data-target],
	.key[data-modifier] {
		z-index: var(--dd-z-index-raised);
		outline-style: solid;
		outline-width: var(--dd-border-width-target);
		outline-color: var(--dd-color-key-target-outline);
		outline-offset: 0;
		scale: var(--dd-scale-target);
	}

	.key[data-wrong] {
		z-index: var(--dd-z-index-raised);
		outline-style: dashed;
		outline-width: var(--dd-border-width-target);
		outline-color: var(--dd-color-oops-outline);
		outline-offset: 0;
	}
</style>
