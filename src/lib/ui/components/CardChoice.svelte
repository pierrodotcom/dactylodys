<script lang="ts">
	interface Option {
		value: string;
		title: string;
		description: string;
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
	<div class="cards">
		{#each options as option (option.value)}
			<label class="card" data-checked={value === option.value || undefined}>
				<input
					type="radio"
					{name}
					value={option.value}
					checked={value === option.value}
					onchange={() => onchange(option.value)}
				/>
				<span class="head">
					<span class="title">{option.title}</span>
					{#if value === option.value}
						<svg class="check" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
							<path d="M4 12.5L9.5 18L20 6.5" />
						</svg>
					{/if}
				</span>
				<span class="description">{option.description}</span>
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
		text-align: center;
	}

	.cards {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--dd-space-md);
	}

	.card {
		position: relative;
		display: grid;
		flex: 1 1 var(--dd-size-choice-card-min);
		align-content: start;
		gap: var(--dd-space-xs);
		max-inline-size: var(--dd-size-panel-max);
		min-block-size: var(--dd-size-touch-target-min);
		padding: var(--dd-space-md) var(--dd-space-lg);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: var(--dd-color-border-strong);
		border-radius: var(--dd-radius-lg);
		background-color: var(--dd-color-surface-raised);
		color: var(--dd-color-text-primary);
		text-align: start;
		cursor: pointer;
	}

	.card:hover {
		background-color: var(--dd-color-surface-sunken);
	}

	.card[data-checked] {
		border-color: var(--dd-color-accent-base);
		border-width: var(--dd-border-width-target);
		box-shadow: var(--dd-shadow-md);
	}

	.card:has(input:focus-visible) {
		outline-style: solid;
		outline-width: var(--dd-border-width-focus);
		outline-color: var(--dd-color-focus-ring);
		outline-offset: var(--dd-space-xs);
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--dd-space-sm);
	}

	.title {
		font-size: var(--dd-font-size-lg);
		font-weight: var(--dd-font-weight-bold);
		line-height: var(--dd-line-height-tight);
	}

	.description {
		color: var(--dd-color-text-secondary);
		font-size: var(--dd-font-size-sm);
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
		inline-size: var(--dd-font-size-lg);
		block-size: var(--dd-font-size-lg);
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
