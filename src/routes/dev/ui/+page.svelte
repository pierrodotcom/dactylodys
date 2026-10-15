<script lang="ts">
	import { toGraphemes } from '$lib/engine/graphemes';
	import { buildCharIndex } from '$lib/keyboard/layout';
	import type { CharIndex, KeyCode, KeyPress, ModifierLevel } from '$lib/keyboard/types';
	import { m } from '$lib/paraglide/messages.js';
	import Button from '$lib/ui/components/Button.svelte';
	import Companion from '$lib/ui/components/Companion.svelte';
	import FingerHint from '$lib/ui/components/FingerHint.svelte';
	import KeyboardView from '$lib/ui/components/KeyboardView.svelte';
	import ListenButton from '$lib/ui/components/ListenButton.svelte';
	import { keyLabel, pressLabel } from '$lib/ui/components/key-labels';
	import Stars from '$lib/ui/components/Stars.svelte';
	import TargetText from '$lib/ui/components/TargetText.svelte';
	import type { PageProps } from './$types';
	import { createDemoVoicePlayer } from './demo-voice';
	import FingerLegend from './FingerLegend.svelte';

	type Mood = 'idle' | 'happy' | 'oops' | 'cheer';
	type StarCount = 0 | 1 | 2 | 3;

	const TARGET_CHARS = ['f', 'j', 'A', 'é', '1', '€', '^', ' '] as const;
	const WRONG_CODES: readonly KeyCode[] = ['KeyD', 'KeyG', 'KeyR', 'KeyV'];
	const MOODS: readonly Mood[] = ['idle', 'happy', 'oops', 'cheer'];
	const STAR_COUNTS: readonly StarCount[] = [0, 1, 2, 3];
	const NO_VALUE = '';

	const THEME_OPTIONS = [
		{ value: NO_VALUE, label: m.dev_ui_theme_system },
		{ value: 'light', label: m.dev_ui_theme_light },
		{ value: 'dark', label: m.dev_ui_theme_dark }
	];
	const MOTION_OPTIONS = [
		{ value: NO_VALUE, label: m.dev_ui_motion_system },
		{ value: 'reduced', label: m.dev_ui_motion_reduced },
		{ value: 'full', label: m.dev_ui_motion_full }
	];
	const SCALE_OPTIONS = [
		{ value: 'md', label: m.dev_ui_scale_md },
		{ value: 'lg', label: m.dev_ui_scale_lg },
		{ value: 'xl', label: m.dev_ui_scale_xl }
	];
	const SPACING_OPTIONS = [
		{ value: 'normal', label: m.dev_ui_spacing_normal },
		{ value: 'wide', label: m.dev_ui_spacing_wide },
		{ value: 'wider', label: m.dev_ui_spacing_wider }
	];
	const MOOD_LABELS: Readonly<Record<Mood, () => string>> = {
		idle: m.dev_ui_mood_idle,
		happy: m.dev_ui_mood_happy,
		oops: m.dev_ui_mood_oops,
		cheer: m.dev_ui_mood_cheer
	};
	const LEVEL_LABELS: Readonly<Record<ModifierLevel, () => string>> = {
		base: m.dev_ui_level_base,
		shift: m.dev_ui_level_shift,
		altgr: m.dev_ui_level_altgr,
		shiftAltgr: m.dev_ui_level_shift_altgr
	};

	const sampleGraphemes = toGraphemes(m.dev_ui_sample_text());
	const LISTEN_SAMPLES = [m.dev_ui_listen_sample_first(), m.dev_ui_listen_sample_second()];
	const demoVoice = createDemoVoicePlayer(LISTEN_SAMPLES);
	const middlePosition = Math.floor(sampleGraphemes.length / 2);

	let { data }: PageProps = $props();

	let theme = $state(NO_VALUE);
	let motion = $state(NO_VALUE);
	let textScale = $state('md');
	let textSpacing = $state('normal');
	let layoutId = $state<string>();
	let position = $state(middlePosition);
	let hasError = $state(false);
	let targetValue = $state(`KeyF:base`);
	let wrongValue = $state(NO_VALUE);
	let mood = $state<Mood>('idle');
	let starsValue = $state('2');

	const layout = $derived(data.layouts.find((item) => item.id === layoutId) ?? data.layouts[0]);
	const charIndex = $derived<CharIndex>(layout ? buildCharIndex(layout) : new Map());
	const targetOptions = $derived(
		TARGET_CHARS.flatMap((char) => {
			const press: KeyPress | undefined = charIndex.get(char)?.[0]?.[0];
			return press && layout
				? [
						{
							value: `${press.code}:${press.level}`,
							label: m.dev_ui_target_option({
								char: pressLabel(layout, press) ?? press.code,
								level: LEVEL_LABELS[press.level]()
							})
						}
					]
				: [];
		})
	);
	const target = $derived.by((): KeyPress | null => {
		const [code, level] = targetValue.split(':');
		const option = targetOptions.find((item) => item.value === targetValue);
		return option && code && level ? { code, level: level as ModifierLevel } : null;
	});
	const wrongCode = $derived(wrongValue === NO_VALUE ? null : wrongValue);
	const errorIndex = $derived(hasError && position < sampleGraphemes.length ? position : null);
	const stars = $derived(Number(starsValue) as StarCount);

	$effect(() => {
		const root = document.documentElement;
		const settings = {
			'data-theme': theme,
			'data-motion': motion,
			'data-text-scale': textScale,
			'data-text-spacing': textSpacing
		};
		for (const [name, value] of Object.entries(settings)) {
			if (value === NO_VALUE) root.removeAttribute(name);
			else root.setAttribute(name, value);
		}
		return () => {
			for (const name of Object.keys(settings)) root.removeAttribute(name);
		};
	});
</script>

<svelte:head>
	<title>{m.dev_ui_title()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main>
	<header>
		<h1>{m.dev_ui_title()}</h1>
		<p>{m.dev_ui_intro()}</p>
	</header>

	<section aria-labelledby="controls-heading">
		<h2 id="controls-heading">{m.dev_ui_controls_heading()}</h2>
		<div class="controls">
			<label>
				<span>{m.dev_ui_theme_label()}</span>
				<select bind:value={theme}>
					{#each THEME_OPTIONS as option (option.value)}
						<option value={option.value}>{option.label()}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>{m.dev_ui_motion_label()}</span>
				<select bind:value={motion}>
					{#each MOTION_OPTIONS as option (option.value)}
						<option value={option.value}>{option.label()}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>{m.dev_ui_scale_label()}</span>
				<select bind:value={textScale}>
					{#each SCALE_OPTIONS as option (option.value)}
						<option value={option.value}>{option.label()}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>{m.dev_ui_spacing_label()}</span>
				<select bind:value={textSpacing}>
					{#each SPACING_OPTIONS as option (option.value)}
						<option value={option.value}>{option.label()}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>{m.dev_ui_layout_label()}</span>
				<select bind:value={layoutId}>
					{#each data.layouts as item (item.id)}
						<option value={item.id}>{item.id}</option>
					{/each}
				</select>
			</label>
			<label>
				<span
					>{m.dev_ui_position_label()} ({m.dev_ui_position_value({
						position,
						total: sampleGraphemes.length
					})})</span
				>
				<input type="range" min="0" max={sampleGraphemes.length} step="1" bind:value={position} />
			</label>
			<label class="check">
				<input type="checkbox" bind:checked={hasError} />
				<span>{m.dev_ui_error_label()}</span>
			</label>
			<label>
				<span>{m.dev_ui_target_label()}</span>
				<select bind:value={targetValue}>
					{#each targetOptions as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>{m.dev_ui_wrong_label()}</span>
				<select bind:value={wrongValue}>
					<option value={NO_VALUE}>{m.dev_ui_wrong_none()}</option>
					{#each WRONG_CODES as code (code)}
						<option value={code}>{layout ? (keyLabel(layout, code) ?? code) : code}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>{m.dev_ui_mood_label()}</span>
				<select bind:value={mood}>
					{#each MOODS as item (item)}
						<option value={item}>{MOOD_LABELS[item]()}</option>
					{/each}
				</select>
			</label>
			<label>
				<span>{m.dev_ui_count_label()}</span>
				<select bind:value={starsValue}>
					{#each STAR_COUNTS as item (item)}
						<option value={String(item)}>{item}</option>
					{/each}
				</select>
			</label>
		</div>
	</section>

	<section aria-labelledby="buttons-heading">
		<h2 id="buttons-heading">{m.dev_ui_buttons_heading()}</h2>
		<p class="hint">{m.dev_ui_buttons_hint()}</p>
		<h3>{m.dev_ui_state_normal()}</h3>
		<div class="row">
			<Button variant="primary">{m.dev_ui_button_primary()}</Button>
			<Button variant="secondary">{m.dev_ui_button_secondary()}</Button>
			<Button variant="quiet">{m.dev_ui_button_quiet()}</Button>
		</div>
		<h3>{m.dev_ui_state_disabled()}</h3>
		<div class="row">
			<Button variant="primary" disabled>{m.dev_ui_button_primary()}</Button>
			<Button variant="secondary" disabled>{m.dev_ui_button_secondary()}</Button>
			<Button variant="quiet" disabled>{m.dev_ui_button_quiet()}</Button>
		</div>
	</section>

	<section aria-labelledby="listen-heading">
		<h2 id="listen-heading">{m.dev_ui_listen_heading()}</h2>
		<p class="hint">{m.dev_ui_listen_hint()}</p>
		<h3>{m.dev_ui_listen_available()}</h3>
		{#each LISTEN_SAMPLES as sample (sample)}
			<div class="row" data-testid="listen-available">
				<p>{sample}</p>
				<ListenButton text={sample} player={demoVoice} />
			</div>
		{/each}
		<h3>{m.dev_ui_listen_missing()}</h3>
		<div class="row" data-testid="listen-missing">
			<p>{m.dev_ui_listen_sample_missing()}</p>
			<ListenButton text={m.dev_ui_listen_sample_missing()} player={demoVoice} />
		</div>
	</section>

	<section aria-labelledby="target-text-heading">
		<h2 id="target-text-heading">{m.dev_ui_target_text_heading()}</h2>
		<h3>{m.dev_ui_text_state_current()}</h3>
		<div data-testid="target-text-live">
			<TargetText graphemes={sampleGraphemes} {position} {errorIndex} />
		</div>
		<h3>{m.dev_ui_text_state_start()}</h3>
		<TargetText graphemes={sampleGraphemes} position={0} errorIndex={null} />
		<h3>{m.dev_ui_text_state_middle()}</h3>
		<TargetText graphemes={sampleGraphemes} position={middlePosition} errorIndex={null} />
		<h3>{m.dev_ui_text_state_error()}</h3>
		<TargetText graphemes={sampleGraphemes} position={middlePosition} errorIndex={middlePosition} />
		<h3>{m.dev_ui_text_state_done()}</h3>
		<TargetText graphemes={sampleGraphemes} position={sampleGraphemes.length} errorIndex={null} />
	</section>

	{#if layout}
		<section aria-labelledby="keyboard-heading">
			<h2 id="keyboard-heading">{m.dev_ui_keyboard_heading()}</h2>
			<h3>{m.dev_ui_keyboard_plain()}</h3>
			<div data-testid="keyboard-plain">
				<KeyboardView
					{layout}
					geometry={data.geometry}
					fingering={data.fingering}
					{target}
					{wrongCode}
					showFingers={false}
				/>
			</div>
			<h3>{m.dev_ui_keyboard_fingers()}</h3>
			<div data-testid="keyboard-fingers">
				<KeyboardView
					{layout}
					geometry={data.geometry}
					fingering={data.fingering}
					{target}
					{wrongCode}
					showFingers={true}
				/>
			</div>
			<h3>{m.dev_ui_keyboard_hands()}</h3>
			<div data-testid="keyboard-hands">
				<KeyboardView
					{layout}
					geometry={data.geometry}
					fingering={data.fingering}
					{target}
					{wrongCode}
					showFingers={true}
					hands={{ presses: target ? [target] : [], trigger: targetValue }}
					still={motion === 'reduced'}
				/>
			</div>
			<h3>{m.dev_ui_legend_heading()}</h3>
			<FingerLegend />
		</section>

		<section aria-labelledby="finger-hint-heading">
			<h2 id="finger-hint-heading">{m.dev_ui_finger_hint_heading()}</h2>
			<div data-testid="finger-hint">
				<FingerHint {target} {layout} fingering={data.fingering} />
			</div>
			<FingerHint target={null} {layout} fingering={data.fingering} />
		</section>
	{/if}

	<section aria-labelledby="stars-heading">
		<h2 id="stars-heading">{m.dev_ui_stars_heading()}</h2>
		<div data-testid="stars-live">
			<Stars count={stars} />
		</div>
		<div class="row">
			{#each STAR_COUNTS as item (item)}
				<Stars count={item} />
			{/each}
		</div>
	</section>

	<section aria-labelledby="companion-heading">
		<h2 id="companion-heading">{m.dev_ui_companion_heading()}</h2>
		<div data-testid="companion-live">
			<Companion {mood} />
		</div>
		<h3>{m.dev_ui_companion_all_heading()}</h3>
		<div class="row">
			{#each MOODS as item (item)}
				<Companion mood={item} />
			{/each}
		</div>
	</section>
</main>

<style>
	main {
		display: grid;
		gap: var(--dd-space-2xl);
		max-inline-size: var(--dd-size-page-wide);
		margin: auto;
		padding: var(--dd-space-lg);
	}

	header,
	section {
		display: grid;
		gap: var(--dd-space-md);
		align-content: start;
		justify-items: start;
	}

	h1 {
		font-size: var(--dd-font-size-3xl);
	}

	h2 {
		font-size: var(--dd-font-size-2xl);
	}

	h3 {
		font-size: var(--dd-font-size-lg);
		color: var(--dd-color-text-secondary);
	}

	.hint {
		color: var(--dd-color-text-secondary);
	}

	.controls {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--dd-size-control-min), 1fr));
		gap: var(--dd-space-md);
		inline-size: 100%;
	}

	label {
		display: grid;
		gap: var(--dd-space-xs);
		align-content: start;
		font-weight: var(--dd-font-weight-bold);
	}

	.check {
		grid-auto-flow: column;
		justify-content: start;
		align-items: center;
		gap: var(--dd-space-sm);
	}

	select,
	input[type='range'] {
		min-block-size: var(--dd-size-touch-target-min);
		font-family: inherit;
		font-size: var(--dd-font-size-base);
	}

	select {
		padding: var(--dd-space-xs) var(--dd-space-md);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-raised);
		color: var(--dd-color-text-primary);
		font-weight: var(--dd-font-weight-regular);
	}

	input[type='checkbox'] {
		inline-size: var(--dd-size-touch-target-min);
		block-size: var(--dd-size-touch-target-min);
		margin: 0;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--dd-space-lg);
	}
</style>
