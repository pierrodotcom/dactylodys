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
	}

	let { legend, name, options, value, onchange }: Props = $props();
</script>

<fieldset>
	<legend>{legend}</legend>
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
</fieldset>

<style>
	fieldset {
		display: grid;
		gap: var(--dd-space-sm);
		min-inline-size: 0;
		margin: 0;
		padding: 0;
		border: 0;
	}

	legend {
		margin-block-end: var(--dd-space-sm);
		padding: 0;
		font-size: var(--dd-font-size-lg);
		font-weight: var(--dd-font-weight-bold);
	}

	.options {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dd-space-sm);
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

	.choice[data-checked] {
		border-color: var(--dd-color-accent-base);
		background-color: var(--dd-color-accent-base);
		color: var(--dd-color-text-on-accent);
		font-weight: var(--dd-font-weight-bold);
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
