<script lang="ts">
	import { AMBIENCE_IDS } from '$lib/audio/ambience';
	import { toGraphemes } from '$lib/engine/graphemes';
	import { LAYOUT_IDS, type LayoutId } from '$lib/keyboard/layout-ids';
	import { m } from '$lib/paraglide/messages.js';
	import { calmDown, type CalmChange } from '$lib/state/calm';
	import type {
		AmbiencePreference,
		ErrorPolicy,
		HandGuidePreference,
		MotionPreference,
		Settings,
		TextScale,
		TextSpacing,
		ThemePreference
	} from '$lib/state/types';
	import Button from '$lib/ui/components/Button.svelte';
	import ChoiceGroup from '$lib/ui/components/ChoiceGroup.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import TargetText from '$lib/ui/components/TargetText.svelte';
	import { AMBIENCE_LABELS, LAYOUT_LABELS } from './labels';

	interface Props {
		settings: Settings;
		saveState: 'idle' | 'saved' | 'error';
		/** The adult space names the child whose settings these are; the game says "Settings". */
		title?: string;
		backLabel?: string;
		/** The settings only the adult chooses, such as Backspace, shown in the adult space only. */
		adult?: boolean;
		onchange: (patch: Partial<Settings>) => void;
		onback: () => void;
	}

	let {
		settings,
		saveState,
		title = m.settings_title(),
		backLabel = m.settings_back(),
		adult = false,
		onchange,
		onback
	}: Props = $props();

	const YES = 'yes';
	const NO = 'no';
	const FLAG_OPTIONS = [
		{ value: YES, label: m.settings_on() },
		{ value: NO, label: m.settings_off() }
	];
	const THEME_OPTIONS = [
		{ value: 'system', label: m.settings_theme_system() },
		{ value: 'light', label: m.settings_theme_light() },
		{ value: 'dark', label: m.settings_theme_dark() }
	];
	const MOTION_OPTIONS = [
		{ value: 'system', label: m.settings_motion_system() },
		{ value: 'reduced', label: m.settings_motion_reduced() },
		{ value: 'full', label: m.settings_motion_full() }
	];
	const HAND_OPTIONS = [
		{ value: 'auto', label: m.settings_hand_auto() },
		{ value: 'always', label: m.settings_hand_always() },
		{ value: 'off', label: m.settings_hand_off() }
	];
	const SCALE_OPTIONS = [
		{ value: 'md', label: m.settings_scale_md() },
		{ value: 'lg', label: m.settings_scale_lg() },
		{ value: 'xl', label: m.settings_scale_xl() }
	];
	const SPACING_OPTIONS = [
		{ value: 'normal', label: m.settings_spacing_normal() },
		{ value: 'wide', label: m.settings_spacing_wide() },
		{ value: 'wider', label: m.settings_spacing_wider() }
	];
	const BACKSPACE_OPTIONS = [
		{ value: 'backspace', label: m.settings_backspace_on() },
		{ value: 'retry', label: m.settings_backspace_off() }
	];
	const FADE_OPTIONS = [
		{ value: YES, label: m.settings_keyboard_fade_on() },
		{ value: NO, label: m.settings_keyboard_fade_off() }
	];
	const AMBIENCE_OPTIONS = [
		{ value: 'none', label: m.settings_ambience_none() },
		...AMBIENCE_IDS.map((id) => ({ value: id, label: AMBIENCE_LABELS[id]() }))
	];
	const CALM_LABELS: Readonly<Record<CalmChange, () => string>> = {
		motion: m.settings_calm_motion,
		effects: m.settings_calm_effects,
		sound: m.settings_calm_sound
	};
	const LAYOUT_OPTIONS = LAYOUT_IDS.map((id) => ({ value: id, label: LAYOUT_LABELS[id]() }));
	const sample = toGraphemes(m.settings_sample_text());

	const flag = (value: boolean) => (value ? YES : NO);

	/** What the last press on "Calm everything" changed; empty: it was all calm already. */
	let calmed = $state.raw<readonly CalmChange[] | null>(null);

	function calmEverything() {
		const { patch, changes } = calmDown(settings);
		calmed = changes;
		if (changes.length > 0) onchange(patch);
	}

	/** One setting changed by hand: what "Calm everything" said is no longer the whole story. */
	function change(patch: Partial<Settings>) {
		calmed = null;
		onchange(patch);
	}
</script>

<ScreenFrame {title} wide back={{ label: backLabel, onclick: onback }}>
	<section class="calm" aria-labelledby="settings-calm-button">
		<Button id="settings-calm-button" onclick={calmEverything}>{m.settings_calm_button()}</Button>
		<p class="hint">{m.settings_calm_hint()}</p>
	</section>

	<!-- One status for the page: what was kept, and what "Calm everything" did. -->
	<div class="status" role="status">
		{#if saveState === 'saved'}
			<p>{m.settings_saved()}</p>
		{:else if saveState === 'error'}
			<p class="error">{m.settings_save_error()}</p>
		{/if}
		{#if calmed !== null}
			<div class="calmed" data-calm-status>
				{#if calmed.length === 0}
					<p>{m.settings_calm_already()}</p>
				{:else}
					<p>{m.settings_calm_done()}</p>
					<ul>
						{#each calmed as item (item)}
							<li>{CALM_LABELS[item]()}</li>
						{/each}
					</ul>
					<p>{m.settings_calm_more()}</p>
				{/if}
			</div>
		{/if}
	</div>

	<div class="groups">
		<ChoiceGroup
			legend={m.settings_sound_label()}
			name="setting-sound"
			options={FLAG_OPTIONS}
			value={flag(settings.soundEnabled)}
			onchange={(value) => change({ soundEnabled: value === YES })}
		/>
		<ChoiceGroup
			legend={m.settings_voice_label()}
			name="setting-voice"
			options={FLAG_OPTIONS}
			value={flag(settings.voiceEnabled)}
			onchange={(value) => change({ voiceEnabled: value === YES })}
		/>
		<ChoiceGroup
			legend={m.settings_theme_label()}
			name="setting-theme"
			options={THEME_OPTIONS}
			value={settings.theme}
			onchange={(value) => change({ theme: value as ThemePreference })}
		/>
		<ChoiceGroup
			legend={m.settings_motion_label()}
			name="setting-motion"
			options={MOTION_OPTIONS}
			value={settings.motion}
			onchange={(value) => change({ motion: value as MotionPreference })}
		/>
		<div class="setting" data-setting="effects">
			<ChoiceGroup
				legend={m.settings_effects_label()}
				name="setting-effects"
				options={FLAG_OPTIONS}
				value={flag(settings.effects)}
				onchange={(value) => change({ effects: value === YES })}
			/>
			{#if adult}<p class="hint">{m.settings_effects_hint()}</p>{/if}
		</div>
		<div class="setting" data-setting="ambience">
			<ChoiceGroup
				legend={m.settings_ambience_label()}
				name="setting-ambience"
				options={AMBIENCE_OPTIONS}
				value={settings.ambience}
				onchange={(value) => change({ ambience: value as AmbiencePreference })}
			/>
			{#if adult}<p class="hint">{m.settings_ambience_hint()}</p>{/if}
		</div>
		<ChoiceGroup
			legend={m.settings_scale_label()}
			name="setting-scale"
			options={SCALE_OPTIONS}
			value={settings.textScale}
			onchange={(value) => change({ textScale: value as TextScale })}
		/>
		<ChoiceGroup
			legend={m.settings_spacing_label()}
			name="setting-spacing"
			options={SPACING_OPTIONS}
			value={settings.textSpacing}
			onchange={(value) => change({ textSpacing: value as TextSpacing })}
		/>
		<section class="sample" aria-labelledby="settings-sample-label">
			<h2 id="settings-sample-label">{m.settings_sample_label()}</h2>
			<TargetText graphemes={sample} position={2} errorIndex={null} />
		</section>
		<ChoiceGroup
			legend={m.settings_keyboard_label()}
			name="setting-keyboard"
			options={FLAG_OPTIONS}
			value={flag(settings.showKeyboard)}
			onchange={(value) => change({ showKeyboard: value === YES })}
		/>
		<ChoiceGroup
			legend={m.settings_hand_label()}
			name="setting-hand"
			options={HAND_OPTIONS}
			value={settings.handGuide}
			onchange={(value) => change({ handGuide: value as HandGuidePreference })}
		/>
		<ChoiceGroup
			legend={m.settings_layout_label()}
			name="setting-layout"
			options={LAYOUT_OPTIONS}
			value={settings.layoutId}
			onchange={(value) => change({ layoutId: value as LayoutId })}
		/>
		{#if adult}
			<div class="adult-only" data-adult-setting="backspace">
				<ChoiceGroup
					legend={m.settings_backspace_label()}
					name="setting-backspace"
					options={BACKSPACE_OPTIONS}
					value={settings.errorPolicy}
					onchange={(value) => change({ errorPolicy: value as ErrorPolicy })}
				/>
				<p class="hint">{m.settings_backspace_hint()}</p>
			</div>
			<div class="adult-only" data-adult-setting="keyboard-fade">
				<ChoiceGroup
					legend={m.settings_keyboard_fade_label()}
					name="setting-keyboard-fade"
					options={FADE_OPTIONS}
					value={flag(settings.keyboardFade)}
					onchange={(value) => change({ keyboardFade: value === YES })}
				/>
				<p class="hint">{m.settings_keyboard_fade_hint()}</p>
			</div>
		{/if}
	</div>
</ScreenFrame>

<style>
	/* Two columns where there is room: the settings fit in about one screen. */
	.groups {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--dd-size-settings-column)), 1fr));
		gap: var(--dd-space-lg);
		align-items: start;
		inline-size: 100%;
	}

	/* Each setting takes its whole column, its choices centred on one line where they fit. */
	.groups :global(fieldset) {
		inline-size: 100%;
	}

	.groups :global(.options) {
		justify-content: center;
	}

	/* Narrower choices than elsewhere: three of them fit on one line of a column. */
	.groups :global(.choice) {
		padding-inline: var(--dd-space-sm);
	}

	.sample {
		grid-column: 1 / -1;
		display: grid;
		gap: var(--dd-space-sm);
		justify-items: center;
	}

	.sample h2 {
		font-size: var(--dd-font-size-lg);
	}

	.calm {
		display: grid;
		gap: var(--dd-space-sm);
		justify-items: center;
		text-align: center;
	}

	.calmed {
		display: grid;
		gap: var(--dd-space-xs);
		justify-items: center;
		text-align: center;
	}

	.calmed ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.adult-only,
	.setting {
		display: grid;
		gap: var(--dd-space-sm);
	}

	.hint {
		color: var(--dd-color-text-secondary);
	}

	.status {
		min-block-size: calc(var(--dd-font-size-base) * 1.6);
		font-weight: var(--dd-font-weight-bold);
	}

	.error {
		color: var(--dd-color-error-text);
	}
</style>
