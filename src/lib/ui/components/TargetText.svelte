<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { spokenGrapheme } from './spoken';
	import { endsLine, toTargetUnits } from './target-text';

	interface Props {
		graphemes: readonly string[];
		position: number;
		errorIndex: number | null;
		/**
		 * Wrong characters written after the good ones, to erase with Backspace: shown where the next
		 * character goes, struck by a wavy line and framed, not by their colour alone.
		 */
		pending?: readonly string[];
		/**
		 * At most this many lines in view (1 or 2): a long text never pushes the game off the screen;
		 * the line being typed is the first one in view, the next one below it. Absent: every line.
		 */
		lines?: 1 | 2;
		/** Calm motion: the text goes from one line to the next without sliding. */
		still?: boolean;
	}

	const SPACE = ' ';
	const LINE_BREAK = '\n';

	let { graphemes, position, errorIndex, pending = [], lines, still = false }: Props = $props();

	let view: HTMLElement | undefined = $state();

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

	// The line where the child types comes first in view, the next one below it; the browser stops
	// at the last lines. Once everything is typed, the text stays where it is.
	$effect(() => {
		void position;
		void pending.length;
		void graphemes;
		if (lines === undefined || !view) return;
		const box = view;
		const here = box.querySelector<HTMLElement>('[data-state="wrong"], [data-state="current"]');
		const line = here?.closest<HTMLElement>('.unit');
		if (!line) return;
		const top = line.offsetTop - parseFloat(getComputedStyle(line).marginBlockStart);
		if (Math.abs(box.scrollTop - top) < 1) return;
		box.scrollTo({ top, behavior: still ? 'auto' : 'smooth' });
	});
</script>

<div class="target-text">
	<p class="dd-visually-hidden">{alternative}</p>
	<div class="text" aria-hidden="true" data-lines={lines} bind:this={view}>
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
			{#if endsLine(unit)}
				<!-- Enter: what follows is typed on the next line. -->
				<span class="line-end" data-line-end></span>
			{/if}
		{/each}
	</div>
</div>

<style>
	.target-text {
		position: relative;
	}

	/* The lines are spaced by the margins of their units: a line break adds no room of its own. */
	.text {
		position: relative;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		column-gap: var(--dd-typing-letter-spacing-current);
		font-family: var(--dd-font-family-base);
		font-size: var(--dd-typing-size-current);
		font-weight: var(--dd-font-weight-medium);
		line-height: var(--dd-line-height-tight);
	}

	/*
	 * One line: a cell (its letter, padding and frame) and the margins of its unit. The room on the
	 * sides keeps a letter that shakes after a mistake inside the window.
	 */
	.text[data-lines] {
		overflow: hidden;
		padding-inline: var(--dd-space-xs);
	}

	.text[data-lines='1'] {
		max-block-size: calc(
			var(--dd-typing-size-current) * var(--dd-line-height-tight) + var(--dd-space-xs) * 4 +
				var(--dd-border-width-thick) * 2
		);
	}

	.text[data-lines='2'] {
		max-block-size: calc(
			var(--dd-typing-size-current) * var(--dd-line-height-tight) * 2 + var(--dd-space-xs) * 8 +
				var(--dd-border-width-thick) * 4
		);
	}

	.unit {
		display: inline-flex;
		align-items: center;
		column-gap: var(--dd-typing-letter-spacing-current);
		margin-block: var(--dd-space-xs);
	}

	.word {
		display: inline-flex;
		column-gap: var(--dd-typing-letter-spacing-current);
	}

	.space {
		display: inline-flex;
		margin-inline: var(--dd-typing-word-spacing-current);
	}

	/* A small symbol at the end of its line, quieter than the letters until it is the key to type. */
	.enter {
		display: inline-flex;
		margin-inline-start: var(--dd-typing-word-spacing-current);
	}

	.enter > .cell[data-state='next'] {
		color: var(--dd-color-text-secondary);
	}

	.line-end {
		flex-basis: 100%;
		block-size: 0;
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
