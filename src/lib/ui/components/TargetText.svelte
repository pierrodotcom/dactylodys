<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { spokenGrapheme } from './spoken';
	import { toTargetUnits } from './target-text';

	interface Props {
		graphemes: readonly string[];
		position: number;
		errorIndex: number | null;
		/**
		 * Wrong characters written after the good ones, to erase with Backspace: shown where the next
		 * character goes, struck by a wavy line and framed, not by their colour alone.
		 */
		pending?: readonly string[];
	}

	const SPACE = ' ';
	const LINE_BREAK = '\n';

	let { graphemes, position, errorIndex, pending = [] }: Props = $props();

	function shownGlyph(grapheme: string): string {
		if (grapheme === SPACE) return m.ui_target_space_symbol();
		if (grapheme === LINE_BREAK) return m.ui_target_enter_symbol();
		return grapheme;
	}

	const units = $derived(toTargetUnits(graphemes));

	const alternative = $derived.by(() => {
		const text = graphemes.join('');
		const expected = graphemes[position];
		const toErase = pending.at(-1);
		if (toErase !== undefined) {
			return m.ui_target_text_erase({ text, char: spokenGrapheme(toErase) });
		}
		return expected === undefined
			? m.ui_target_text_done({ text })
			: m.ui_target_text_label({ text, char: spokenGrapheme(expected) });
	});

	// While something is to erase, the next character waits: Backspace is the key to press.
	function stateOf(index: number): 'done' | 'current' | 'next' {
		if (index < position) return 'done';
		return index === position && pending.length === 0 ? 'current' : 'next';
	}
</script>

<div class="target-text">
	<p class="dd-visually-hidden">{alternative}</p>
	<div class="text" aria-hidden="true">
		{#each units as unit (unit[0]?.cells[0]?.index)}
			<span class="unit">
				{#each unit as group (group.cells[0]?.index)}
					<span class={group.kind}>
						{#each group.cells as cell (cell.index)}
							{#if cell.index === position}
								{#each pending as wrong, rank (rank)}
									<span class="cell" data-state="wrong">{shownGlyph(wrong)}</span>
								{/each}
							{/if}
							<span
								class="cell"
								data-state={stateOf(cell.index)}
								data-error={(cell.index === errorIndex && pending.length === 0) || undefined}
								>{shownGlyph(cell.text)}</span
							>
						{/each}
					</span>
				{/each}
			</span>
		{/each}
	</div>
</div>

<style>
	.target-text {
		position: relative;
	}

	.text {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		column-gap: var(--dd-typing-letter-spacing-current);
		row-gap: var(--dd-space-sm);
		font-family: var(--dd-font-family-base);
		font-size: var(--dd-typing-size-current);
		font-weight: var(--dd-font-weight-medium);
		line-height: var(--dd-line-height-tight);
	}

	.unit {
		display: inline-flex;
		align-items: center;
		column-gap: var(--dd-typing-letter-spacing-current);
	}

	.word {
		display: inline-flex;
		column-gap: var(--dd-typing-letter-spacing-current);
	}

	.space {
		display: inline-flex;
		margin-inline: var(--dd-typing-word-spacing-current);
	}

	.cell {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: var(--dd-space-xs);
		border-width: var(--dd-border-width-thick);
		border-style: solid;
		border-color: transparent;
		border-radius: var(--dd-radius-md);
		color: var(--dd-color-text-primary);
	}

	.cell[data-state='done'] {
		color: var(--dd-color-typing-done);
	}

	.cell[data-state='current'] {
		border-color: var(--dd-color-typing-current-frame);
		background-color: var(--dd-color-typing-current-surface);
	}

	.cell[data-state='wrong'] {
		border-style: dashed;
		border-color: var(--dd-color-oops-outline);
		background-color: var(--dd-color-error-surface);
		color: var(--dd-color-error-text);
		text-decoration-line: underline;
		text-decoration-style: wavy;
		text-decoration-color: var(--dd-color-error-text);
		text-decoration-thickness: var(--dd-border-width-thick);
		text-underline-offset: var(--dd-space-xs);
	}

	.cell[data-error] {
		border-style: dashed;
		border-color: var(--dd-color-oops-outline);
		animation-name: shake;
		animation-duration: var(--dd-duration-slow);
		animation-timing-function: var(--dd-easing-standard);
	}

	@keyframes shake {
		0%,
		100% {
			translate: 0;
		}
		20%,
		60% {
			translate: calc(var(--dd-space-xs) * -1);
		}
		40%,
		80% {
			translate: var(--dd-space-xs);
		}
	}
</style>
