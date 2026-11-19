<script lang="ts">
	import { tick } from 'svelte';
	import { AMBIENCE_IDS } from '$lib/audio/ambience';
	import { AGE_BANDS } from '$lib/engine/progression/banks';
	import { toGraphemes } from '$lib/engine/graphemes';
	import {
		FINGERING_PROFILE_IDS,
		LAYOUT_IDS,
		type FingeringProfileId,
		type LayoutId
	} from '$lib/keyboard/layout-ids';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import { calmDown, type CalmChange } from '$lib/state/calm';
	import { KEYBOARD_COLORS, SESSION_LENGTHS } from '$lib/state/profile';
	import type {
		AgeBand,
		AmbiencePreference,
		ErrorPolicyPreference,
		HandGuidePreference,
		KeyboardColors,
		MotionPreference,
		SessionLength,
		Settings,
		TextScale,
		TextSpacing,
		ThemePreference
	} from '$lib/state/types';
	import Button from '$lib/ui/components/Button.svelte';
	import ChoiceGroup from '$lib/ui/components/ChoiceGroup.svelte';
	import ScreenFrame from '$lib/ui/components/ScreenFrame.svelte';
	import TargetText from '$lib/ui/components/TargetText.svelte';
	import { AMBIENCE_LABELS, FINGERING_LABELS, LAYOUT_LABELS, fingeringChangeNote } from './labels';
	import { PLAY_RULES } from './play-rules';

	interface Props {
		settings: Settings;
		saveState: 'idle' | 'saved' | 'error';
		/** The adult space names the child whose settings these are; the game says "Settings". */
		title?: string;
		backLabel?: string;
		/**
		 * The settings only the adult chooses (the length of a session, Backspace, the keys that fade,
		 * the keyboard layout, the fingering), shown in the adult space only: a child who clicks there
		 * changes how the game teaches.
		 */
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
	const COLORS_LABELS: Readonly<Record<KeyboardColors, () => string>> = {
		all: m.settings_keyboard_colors_all,
		finger: m.settings_keyboard_colors_finger
	};
	const COLORS_OPTIONS = KEYBOARD_COLORS.map((colors) => ({
		value: colors,
		label: COLORS_LABELS[colors]()
	}));
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
		{ value: 'world', label: m.settings_backspace_world() },
		{ value: 'backspace', label: m.settings_backspace_on() },
		{ value: 'retry', label: m.settings_backspace_off() }
	];
	const SESSION_LABELS: Readonly<Record<SessionLength, () => string>> = {
		short: m.settings_session_short,
		normal: m.settings_session_normal,
		long: m.settings_session_long
	};
	const SESSION_OPTIONS = SESSION_LENGTHS.map((length) => ({
		value: length,
		label: SESSION_LABELS[length]()
	}));
	const minutes = new Intl.NumberFormat(getLocale(), {
		style: 'unit',
		unit: 'minute',
		unitDisplay: 'long'
	});
	const typingMinutes = (length: SessionLength) =>
		minutes.format(PLAY_RULES.sessionLengths[length].typingMinutes);
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
	const AGE_LABELS: Readonly<Record<AgeBand, () => string>> = {
		'8-9': m.settings_age_8_9,
		'10-12': m.settings_age_10_12
	};
	const AGE_OPTIONS = AGE_BANDS.map((band) => ({ value: band, label: AGE_LABELS[band]() }));
	const LAYOUT_OPTIONS = LAYOUT_IDS.map((id) => ({ value: id, label: LAYOUT_LABELS[id]() }));
	const FINGERING_OPTIONS = FINGERING_PROFILE_IDS.map((id) => ({
		value: id,
		label: FINGERING_LABELS[id]()
	}));
	const sample = toGraphemes(m.settings_sample_text());
	const CALM_BUTTON_ID = 'settings-calm-button';

	const flag = (value: boolean) => (value ? YES : NO);

	/** What the last press on "Calm everything" changed; empty: it was all calm already. */
	let calmed = $state.raw<readonly CalmChange[] | null>(null);
	/** The three settings as they were before "Calm everything", while they can be given back. */
	let beforeCalm = $state.raw<Partial<Settings> | null>(null);
	let restored = $state(false);
	/** The adult changed the fingering on this screen: one sentence says what it does to the child. */
	let fingeringNote = $state('');

	function calmEverything() {
		const { patch, changes } = calmDown(settings);
		calmed = changes;
		restored = false;
		if (changes.length === 0) return;
		beforeCalm = {
			motion: settings.motion,
			effects: settings.effects,
			soundEnabled: settings.soundEnabled
		};
		onchange(patch);
	}

	async function putBack() {
		if (beforeCalm === null) return;
		const patch = beforeCalm;
		beforeCalm = null;
		calmed = null;
		restored = true;
		onchange(patch);
		// The button that was pressed is gone: the focus goes back to the one that started it all.
		await tick();
		document.getElementById(CALM_BUTTON_ID)?.focus();
	}

	/** One setting changed by hand: what "Calm everything" said is no longer the whole story. */
	function change(patch: Partial<Settings>) {
		calmed = null;
		beforeCalm = null;
		restored = false;
		onchange(patch);
	}
</script>

<ScreenFrame {title} wide back={{ label: backLabel, onclick: onback }}>
	<div class="panel">
		<div class="line calm">
			<div class="name">
				<Button id={CALM_BUTTON_ID} onclick={calmEverything}>{m.settings_calm_button()}</Button>
			</div>
			<div class="about" data-choices>
				<p class="hint">{m.settings_calm_hint()}</p>
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
					{#if restored}
						<p data-calm-restored>{m.settings_calm_undone()}</p>
					{/if}
				</div>
				{#if beforeCalm !== null}
					<Button variant="secondary" onclick={putBack} data-calm-undo>
						{m.settings_calm_undo()}
					</Button>
				{/if}
			</div>
		</div>

		<section class="family" aria-labelledby="settings-family-sound">
			<h2 id="settings-family-sound">{m.settings_family_sound()}</h2>
			<ChoiceGroup
				layout="row"
				legend={m.settings_sound_label()}
				name="setting-sound"
				options={FLAG_OPTIONS}
				value={flag(settings.soundEnabled)}
				onchange={(value) => change({ soundEnabled: value === YES })}
			/>
			<ChoiceGroup
				layout="row"
				legend={m.settings_voice_label()}
				name="setting-voice"
				options={FLAG_OPTIONS}
				value={flag(settings.voiceEnabled)}
				onchange={(value) => change({ voiceEnabled: value === YES })}
			/>
			<ChoiceGroup
				layout="row"
				legend={m.settings_ambience_label()}
				name="setting-ambience"
				options={AMBIENCE_OPTIONS}
				value={settings.ambience}
				hint={adult ? m.settings_ambience_hint() : undefined}
				onchange={(value) => change({ ambience: value as AmbiencePreference })}
			/>
		</section>

		<section class="family" aria-labelledby="settings-family-screen">
			<h2 id="settings-family-screen">{m.settings_family_screen()}</h2>
			<ChoiceGroup
				layout="row"
				legend={m.settings_theme_label()}
				name="setting-theme"
				options={THEME_OPTIONS}
				value={settings.theme}
				onchange={(value) => change({ theme: value as ThemePreference })}
			/>
			<ChoiceGroup
				layout="row"
				legend={m.settings_motion_label()}
				name="setting-motion"
				options={MOTION_OPTIONS}
				value={settings.motion}
				onchange={(value) => change({ motion: value as MotionPreference })}
			/>
			<ChoiceGroup
				layout="row"
				legend={m.settings_effects_label()}
				name="setting-effects"
				options={FLAG_OPTIONS}
				value={flag(settings.effects)}
				hint={adult ? m.settings_effects_hint() : undefined}
				onchange={(value) => change({ effects: value === YES })}
			/>
		</section>

		<section class="family" aria-labelledby="settings-family-text">
			<h2 id="settings-family-text">{m.settings_family_text()}</h2>
			<ChoiceGroup
				layout="row"
				legend={m.settings_scale_label()}
				name="setting-scale"
				options={SCALE_OPTIONS}
				value={settings.textScale}
				onchange={(value) => change({ textScale: value as TextScale })}
			/>
			<ChoiceGroup
				layout="row"
				legend={m.settings_spacing_label()}
				name="setting-spacing"
				options={SPACING_OPTIONS}
				value={settings.textSpacing}
				onchange={(value) => change({ textSpacing: value as TextSpacing })}
			/>
			<!-- Right under the two settings it shows: the effect is seen where the child acts. -->
			<div class="line" role="group" aria-labelledby="settings-sample-label" data-settings-sample>
				<div class="name" id="settings-sample-label">{m.settings_sample_label()}</div>
				<div class="about" data-choices>
					<TargetText graphemes={sample} position={2} errorIndex={null} />
				</div>
			</div>
		</section>

		<section class="family" aria-labelledby="settings-family-keyboard">
			<h2 id="settings-family-keyboard">{m.settings_family_keyboard()}</h2>
			<ChoiceGroup
				layout="row"
				legend={m.settings_keyboard_label()}
				name="setting-keyboard"
				options={FLAG_OPTIONS}
				value={flag(settings.showKeyboard)}
				onchange={(value) => change({ showKeyboard: value === YES })}
			/>
			<ChoiceGroup
				layout="row"
				legend={m.settings_hand_label()}
				name="setting-hand"
				options={HAND_OPTIONS}
				value={settings.handGuide}
				onchange={(value) => change({ handGuide: value as HandGuidePreference })}
			/>
			<ChoiceGroup
				layout="row"
				legend={m.settings_keyboard_colors_label()}
				name="setting-keyboard-colors"
				options={COLORS_OPTIONS}
				value={settings.keyboardColors}
				hint={adult ? m.settings_keyboard_colors_hint() : undefined}
				onchange={(value) => change({ keyboardColors: value as KeyboardColors })}
			/>
			{#if adult}
				<ChoiceGroup
					layout="row"
					legend={m.settings_keyboard_fade_label()}
					name="setting-keyboard-fade"
					options={FADE_OPTIONS}
					value={flag(settings.keyboardFade)}
					hint={m.settings_keyboard_fade_hint()}
					onchange={(value) => change({ keyboardFade: value === YES })}
				/>
				<ChoiceGroup
					layout="row"
					legend={m.settings_backspace_label()}
					name="setting-backspace"
					options={BACKSPACE_OPTIONS}
					value={settings.errorPolicy}
					hint={m.settings_backspace_hint()}
					onchange={(value) => change({ errorPolicy: value as ErrorPolicyPreference })}
				/>
				<ChoiceGroup
					layout="row"
					legend={m.settings_layout_label()}
					name="setting-layout"
					options={LAYOUT_OPTIONS}
					value={settings.layoutId}
					hint={m.settings_layout_hint()}
					onchange={(value) => change({ layoutId: value as LayoutId })}
				/>
				<ChoiceGroup
					layout="row"
					legend={m.settings_fingering_label()}
					name="setting-fingering"
					options={FINGERING_OPTIONS}
					value={settings.fingeringProfileId}
					hint={m.settings_fingering_hint()}
					onchange={(value) => {
						const to = value as FingeringProfileId;
						fingeringNote = fingeringChangeNote(settings.fingeringProfileId, to);
						change({ fingeringProfileId: to });
					}}
				/>
				<!--
					Right under the choice, where the adult acts: what a change of fingering does. Always on the
					page, empty until then, so that a screen reader says it when it comes; the page keeps one
					status, the one that says the setting is kept.
				-->
				<div class="line">
					<div class="name"></div>
					<p class="about note" aria-live="polite" data-fingering-changed>
						{fingeringNote}
					</p>
				</div>
			{/if}
		</section>

		<section class="family" aria-labelledby="settings-family-player">
			<h2 id="settings-family-player">{m.settings_family_player()}</h2>
			<ChoiceGroup
				layout="row"
				legend={m.settings_age_label()}
				name="setting-age"
				options={AGE_OPTIONS}
				value={settings.ageBand}
				hint={adult ? m.settings_age_hint() : undefined}
				onchange={(value) => change({ ageBand: value as AgeBand })}
			/>
			{#if adult}
				<ChoiceGroup
					layout="row"
					legend={m.settings_session_label()}
					name="setting-session"
					options={SESSION_OPTIONS}
					value={settings.sessionLength}
					hint={m.settings_session_hint({
						short: typingMinutes('short'),
						normal: typingMinutes('normal'),
						long: typingMinutes('long')
					})}
					onchange={(value) => change({ sessionLength: value as SessionLength })}
				/>
			{/if}
		</section>
	</div>
</ScreenFrame>

<style>
	/*
	 * Everything starts on the left edge of the page, under the way out, and the title stays in
	 * the middle.
	 */
	.panel {
		display: grid;
		gap: var(--dd-space-lg);
		inline-size: 100%;
		text-align: start;
	}

	.family {
		display: grid;
		gap: var(--dd-size-setting-gap);
	}

	.family h2 {
		padding-block-end: var(--dd-space-xs);
		border-block-end-width: var(--dd-border-width-thin);
		border-block-end-style: solid;
		border-block-end-color: var(--dd-color-border-strong);
		font-size: var(--dd-font-size-lg);
		line-height: var(--dd-line-height-tight);
	}

	/*
	 * A line that is not a choice ("Calm everything", the sample of the text) is cut like the
	 * lines of choices: what it says starts on the same vertical as the choices.
	 */
	.line {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--dd-space-xs) var(--dd-space-lg);
	}

	.line > .name {
		flex: 0 1 var(--dd-size-setting-name);
		min-inline-size: 0;
		font-weight: var(--dd-font-weight-bold);
		line-height: var(--dd-line-height-tight);
	}

	.line > .about {
		display: grid;
		flex: 1 1 var(--dd-size-setting-choices-min);
		gap: var(--dd-space-sm);
		justify-items: start;
		min-inline-size: 0;
	}

	.calm {
		align-items: baseline;
		row-gap: var(--dd-space-sm);
	}

	.calmed {
		display: grid;
		gap: var(--dd-space-xs);
	}

	.calmed ul {
		margin: 0;
		padding-inline-start: var(--dd-space-lg);
	}

	.hint {
		color: var(--dd-color-text-secondary);
	}

	.status,
	.note {
		font-weight: var(--dd-font-weight-bold);
	}

	.status {
		min-block-size: calc(var(--dd-font-size-base) * 1.6);
	}

	.error {
		color: var(--dd-color-error-text);
	}
</style>
