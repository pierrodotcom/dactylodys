<script lang="ts">
	interface Option {
		value: string;
		label: string;
	}

	interface Props {
		legend: string;
		name: string;
		options: readonly Option[];
		value: string;
		onchange: (value: string) => void;
		/**
		 * `row`: the name on the left and the choices on the right, for a list of settings whose
		 * choices all start on the same vertical; on a narrow screen the choices go under the name.
		 */
		layout?: 'stacked' | 'row';
		/** The choices in the middle of the whole width, on a screen where everything is centred. */
		centered?: boolean;
		/** A word of explanation under the choices, read with the group. */
		hint?: string;
	}

	let {
		legend,
		name,
		options,
		value,
		onchange,
		layout = 'stacked',
		centered = false,
		hint
	}: Props = $props();

	const legendId = $derived(`${name}-legend`);
	const hintId = $derived(`${name}-hint`);
</script>

<!--
	A group named by its legend, as a fieldset would be: a fieldset cannot put its legend
	beside its content, which the `row` layout needs.
-->
<div
	class="group"
	role="group"
	aria-labelledby={legendId}
	aria-describedby={hint ? hintId : undefined}
	data-layout={layout}
	data-centered={centered || undefined}
>
	<div class="legend" id={legendId}>{legend}</div>
	<div class="body" data-choices>
		<div class="options">
			{#each options as option (option.value)}
				<label class="choice" data-checked={value === option.value || undefined}>
					<input
						type="radio"
						{name}
						value={option.value}
						checked={value === option.value}
						onchange={() => onchange(option.value)}
					/>
					{#if value === option.value}
						<svg class="check" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
							<path d="M4 12.5L9.5 18L20 6.5" />
						</svg>
					{/if}
					<span>{option.label}</span>
				</label>
			{/each}
		</div>
		{#if hint}<p class="hint" id={hintId}>{hint}</p>{/if}
	</div>
</div>

<style>
	.group {
		display: grid;
		gap: var(--dd-space-md);
		min-inline-size: 0;
	}

	.legend {
		font-size: var(--dd-font-size-lg);
		font-weight: var(--dd-font-weight-bold);
		line-height: var(--dd-line-height-tight);
	}

	.body {
		display: grid;
		gap: var(--dd-space-sm);
		min-inline-size: 0;
	}

	.options {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dd-space-sm);
	}

	.hint {
		color: var(--dd-color-text-secondary);
	}

	.group[data-centered] {
		inline-size: 100%;
		justify-items: center;
		text-align: center;
	}

	.group[data-centered] .options {
		justify-content: center;
	}

	/*
	 * A line of a list of settings. The name keeps one width and the choices one least width:
	 * every line of the list folds at the same width of the page, and the choices of all the lines
	 * start on the same vertical, beside the name or under it.
	 */
	.group[data-layout='row'] {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--dd-space-xs) var(--dd-space-lg);
		text-align: start;
	}

	/* With a word of explanation under the choices, the name stays level with the choices. */
	.group[data-layout='row']:has(.hint) {
		align-items: baseline;
	}

	.group[data-layout='row'] .legend {
		flex: 0 1 var(--dd-size-setting-name);
		min-inline-size: 0;
		font-size: var(--dd-font-size-base);
	}

	.group[data-layout='row'] .body {
		flex: 1 1 var(--dd-size-setting-choices-min);
	}

	.choice {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--dd-space-sm);
		min-block-size: var(--dd-size-touch-target-min);
		min-inline-size: var(--dd-size-touch-target-min);
		padding: var(--dd-space-sm) var(--dd-space-lg);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-md);
		background-color: var(--dd-color-surface-raised);
		color: var(--dd-color-text-primary);
		font-size: var(--dd-font-size-base);
		font-weight: var(--dd-font-weight-medium);
		line-height: var(--dd-line-height-tight);
		cursor: pointer;
	}

	.choice:hover {
		background-color: var(--dd-color-surface-sunken);
	}

	/*
	 * The chosen one: a check mark and a thick frame, on the same background as the others. A
	 * filled shape is a button that does something (ADR-075). The padding gives back what the
	 * frame takes: choosing does not move the neighbours more than the check mark does.
	 */
	.choice[data-checked] {
		padding: calc(var(--dd-space-sm) + var(--dd-border-width-thick) - var(--dd-border-width-target))
			calc(var(--dd-space-lg) + var(--dd-border-width-thick) - var(--dd-border-width-target));
		border-width: var(--dd-border-width-target);
		border-color: var(--dd-color-accent-base);
		font-weight: var(--dd-font-weight-bold);
	}

	/* Narrower choices in a line of settings: three of them fit beside the name. */
	.group[data-layout='row'] .choice {
		padding-inline: var(--dd-space-sm);
	}

	.group[data-layout='row'] .choice[data-checked] {
		padding-inline: calc(
			var(--dd-space-sm) + var(--dd-border-width-thick) - var(--dd-border-width-target)
		);
	}

	.choice:has(input:focus-visible) {
		outline-style: solid;
		outline-width: var(--dd-border-width-focus);
		outline-color: var(--dd-color-focus-ring);
		outline-offset: var(--dd-space-xs);
	}

	input {
		position: absolute;
		inset: 0;
		margin: 0;
		opacity: 0;
		cursor: pointer;
	}

	.check {
		flex: none;
		inline-size: var(--dd-font-size-base);
		block-size: var(--dd-font-size-base);
		color: var(--dd-color-accent-base);
	}

	.check path {
		fill: transparent;
		stroke: currentColor;
		stroke-width: var(--dd-border-width-target);
		stroke-linecap: round;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}
</style>
