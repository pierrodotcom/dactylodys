<script lang="ts">
	import { toGraphemes } from '$lib/engine/graphemes';
	import { LAYOUT_IDS, type LayoutId } from '$lib/keyboard/layout-ids';
	import { m } from '$lib/paraglide/messages.js';
	import type {
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
	import { LAYOUT_LABELS } from './labels';

	interface Props {
		settings: Settings;
		saveState: 'idle' | 'saved' | 'error';
		onchange: (patch: Partial<Settings>) => void;
		onback: () => void;
	}

	let { settings, saveState, onchange, onback }: Props = $props();

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
	const LAYOUT_OPTIONS = LAYOUT_IDS.map((id) => ({ value: id, label: LAYOUT_LABELS[id]() }));
	const sample = toGraphemes(m.settings_sample_text());

	const flag = (value: boolean) => (value ? YES : NO);
</script>

<ScreenFrame title={m.settings_title()}>
	<div class="groups">
		<ChoiceGroup
			legend={m.settings_sound_label()}
			name="setting-sound"
			options={FLAG_OPTIONS}
			value={flag(settings.soundEnabled)}
			onchange={(value) => onchange({ soundEnabled: value === YES })}
		/>
		<ChoiceGroup
			legend={m.settings_theme_label()}
			name="setting-theme"
			options={THEME_OPTIONS}
			value={settings.theme}
			onchange={(value) => onchange({ theme: value as ThemePreference })}
		/>
		<ChoiceGroup
			legend={m.settings_motion_label()}
			name="setting-motion"
			options={MOTION_OPTIONS}
			value={settings.motion}
			onchange={(value) => onchange({ motion: value as MotionPreference })}
		/>
		<ChoiceGroup
			legend={m.settings_scale_label()}
			name="setting-scale"
			options={SCALE_OPTIONS}
			value={settings.textScale}
			onchange={(value) => onchange({ textScale: value as TextScale })}
		/>
		<ChoiceGroup
			legend={m.settings_spacing_label()}
			name="setting-spacing"
			options={SPACING_OPTIONS}
			value={settings.textSpacing}
			onchange={(value) => onchange({ textSpacing: value as TextSpacing })}
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
			onchange={(value) => onchange({ showKeyboard: value === YES })}
		/>
		<ChoiceGroup
			legend={m.settings_layout_label()}
			name="setting-layout"
			options={LAYOUT_OPTIONS}
			value={settings.layoutId}
			onchange={(value) => onchange({ layoutId: value as LayoutId })}
		/>
	</div>

	<div class="status" role="status">
		{#if saveState === 'saved'}
			<p>{m.settings_saved()}</p>
		{:else if saveState === 'error'}
			<p class="error">{m.settings_save_error()}</p>
		{/if}
	</div>

	<Button onclick={onback}>{m.settings_back()}</Button>
</ScreenFrame>

<style>
	.groups {
		display: grid;
		gap: var(--dd-space-xl);
		inline-size: 100%;
		justify-items: center;
	}

	.sample {
		display: grid;
		gap: var(--dd-space-sm);
		justify-items: center;
	}

	.sample h2 {
		font-size: var(--dd-font-size-lg);
	}

	.status {
		min-block-size: calc(var(--dd-font-size-base) * 1.6);
		font-weight: var(--dd-font-weight-bold);
	}

	.error {
		color: var(--dd-color-error-text);
	}
</style>
