<script lang="ts">
	import { focusableWhileScrolling } from '$lib/ui/focus';
	import { m } from '$lib/paraglide/messages.js';
	import type { Profile } from '$lib/state/types';
	import LineChart from '$lib/ui/components/LineChart.svelte';
	import { niceMax } from '$lib/ui/components/line-chart';
	import { isOne } from '$lib/ui/plural';
	import type { AdultRules } from './adult-rules';
	import { practiceWeeks, sessionPoints, speedRuleChange, type SessionPoint } from './evolution';
	import type { Formatters } from './format';

	interface Props {
		profile: Profile;
		rules: AdultRules;
		format: Formatters;
		/** `YYYY-MM-DD` on this device: the weeks of the days played go up to this one. */
		today: string;
		/** The handwriting speed, drawn across the speed chart; `null` before the first measure. */
		handwriting: number | null;
		lessonTitle: (lessonId: string) => string;
	}

	let { profile, rules, format, today, handwriting, lessonTitle }: Props = $props();

	const ACCURACY_MAX = 100;
	const ONE_DECIMAL = 1;
	const WHOLE = 0;

	const points = $derived(sessionPoints(profile.sessions, rules.sessionsShown));
	// Said only while plays measured both ways are on the chart.
	const ruleChange = $derived(speedRuleChange(profile.sessions.slice(-rules.sessionsShown)));
	const weeks = $derived(practiceWeeks(profile.practiceDays, today, rules.weeksShown));
	const totalDays = $derived(weeks.at(-1)?.cumulativeDays ?? 0);
	const speeds = $derived(points.map((point) => point.wordsPerMinute));
	const speedMax = $derived(niceMax(Math.max(...speeds, handwriting ?? 0)));
	const daysMax = $derived(niceMax(totalDays));

	const whole = (value: number) => format.number(value, WHOLE);
	const firstPlay = $derived(points[0]);
	const lastPlay = $derived(points.at(-1));
	const playDate = (point: SessionPoint) =>
		format.sessionDate(point.finishedAt, point.utcOffsetMinutes);
</script>

<!--
	The dates of the first and of the last point under a chart: its axis of time. The chart and its
	dates are hidden from screen readers, which read the table instead.
-->
{#snippet dates(first: string, last: string)}
	<p class="dates" aria-hidden="true" data-chart-dates>
		<span>{first}</span>
		{#if last !== first}<span>{last}</span>{/if}
	</p>
{/snippet}

{#snippet sessionsTable(captionId: string, paper: boolean)}
	<table data-sessions-table={paper ? undefined : ''} data-print-sessions={paper ? '' : undefined}>
		<caption id={captionId}>{m.adult_sessions_caption()}</caption>
		<thead>
			<tr>
				<th scope="col">{m.adult_table_session()}</th>
				<th scope="col">{m.adult_table_date()}</th>
				<th scope="col">{m.adult_table_lesson()}</th>
				<th scope="col">{m.adult_table_accuracy()}</th>
				<th scope="col">{m.adult_table_speed()}</th>
				<th scope="col">{m.adult_table_speed_chars()}</th>
			</tr>
		</thead>
		<tbody>
			{#each points as point (point.rank)}
				<tr>
					<th scope="row">{point.rank}</th>
					<td>{playDate(point)}</td>
					<td>{lessonTitle(point.lessonId)}</td>
					<td>{format.number(point.accuracy, ONE_DECIMAL)}</td>
					<td>{format.number(point.wordsPerMinute, ONE_DECIMAL)}</td>
					<td>{format.number(point.charsPerMinute, WHOLE)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/snippet}

{#snippet weeksTable(captionId: string, paper: boolean)}
	<table data-weeks-table={paper ? undefined : ''} data-print-weeks={paper ? '' : undefined}>
		<caption id={captionId}>{m.adult_weeks_caption()}</caption>
		<thead>
			<tr>
				<th scope="col">{m.adult_table_week()}</th>
				<th scope="col">{m.adult_table_week_days()}</th>
				<th scope="col">{m.adult_table_week_total()}</th>
			</tr>
		</thead>
		<tbody>
			{#each weeks as week (week.weekStart)}
				<tr>
					<th scope="row">{format.day(week.weekStart)}</th>
					<td>{week.days}</td>
					<td>{week.cumulativeDays}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/snippet}

<section class="evolution" aria-labelledby="evolution-title" data-child-evolution>
	<h2 id="evolution-title">{m.adult_evolution_title()}</h2>
	{#if points.length === 0 || !firstPlay || !lastPlay}
		<p data-evolution-empty>{m.adult_evolution_empty({ name: profile.name })}</p>
	{:else}
		<p>
			{isOne(points.length)
				? m.adult_evolution_scope_one()
				: m.adult_evolution_scope_other({ count: points.length })}
		</p>
		<div class="charts">
			<figure>
				<figcaption>{m.adult_accuracy_title()}</figcaption>
				<LineChart
					values={points.map((point) => point.accuracy)}
					max={ACCURACY_MAX}
					formatTick={whole}
				/>
				{@render dates(playDate(firstPlay), playDate(lastPlay))}
			</figure>
			<figure>
				<figcaption>{m.adult_speed_title()}</figcaption>
				<LineChart values={speeds} max={speedMax} reference={handwriting} formatTick={whole} />
				{@render dates(playDate(firstPlay), playDate(lastPlay))}
				{#if handwriting !== null}
					<p class="note">
						{m.adult_speed_reference({ speed: format.number(handwriting, ONE_DECIMAL) })}
					</p>
				{/if}
				<p class="note">{m.adult_speed_note()}</p>
				{#if ruleChange}
					<p class="note" data-speed-rule-change>
						{m.adult_speed_rule_change({
							date: format.sessionDate(ruleChange.finishedAt, ruleChange.utcOffsetMinutes)
						})}
					</p>
				{/if}
			</figure>
		</div>
		<details>
			<summary>{m.adult_table_show()}</summary>
			<div
				class="dd-table-scroll"
				role="region"
				aria-labelledby="sessions-caption"
				{@attach focusableWhileScrolling}
			>
				{@render sessionsTable('sessions-caption', false)}
			</div>
		</details>
	{/if}

	{#if weeks.length > 0}
		{@const firstWeek = weeks[0]?.weekStart ?? ''}
		{@const lastWeek = weeks.at(-1)?.weekStart ?? ''}
		<figure>
			<figcaption>{m.adult_days_title()}</figcaption>
			<LineChart
				values={weeks.map((week) => week.cumulativeDays)}
				max={daysMax}
				formatTick={whole}
			/>
			{@render dates(format.day(firstWeek), format.day(lastWeek))}
			<p class="note" data-days-total>
				{isOne(totalDays)
					? m.adult_days_total_one({ count: totalDays })
					: m.adult_days_total_other({ count: totalDays })}
			</p>
		</figure>
		<details>
			<summary>{m.adult_table_show()}</summary>
			<div
				class="dd-table-scroll"
				role="region"
				aria-labelledby="weeks-caption"
				{@attach focusableWhileScrolling}
			>
				{@render weeksTable('weeks-caption', false)}
			</div>
		</details>
	{/if}

	<!-- On paper, the figures in tables instead of the charts: nothing to open there (E-15). -->
	{#if points.length > 0 || weeks.length > 0}
		<div class="paper" data-print-only data-evolution-paper>
			{#if points.length > 0}
				{@render sessionsTable('print-sessions-caption', true)}
			{/if}
			{#if weeks.length > 0}
				{@render weeksTable('print-weeks-caption', true)}
			{/if}
		</div>
	{/if}
</section>

<style>
	.evolution {
		display: grid;
		gap: var(--dd-space-md);
		justify-items: stretch;
		text-align: start;
	}

	h2 {
		font-size: var(--dd-font-size-xl);
	}

	.charts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(var(--dd-size-control-min), 1fr));
		gap: var(--dd-space-lg);
	}

	figure {
		display: grid;
		gap: var(--dd-space-xs);
		margin: 0;
	}

	figcaption {
		font-weight: var(--dd-font-weight-bold);
	}

	.note {
		color: var(--dd-color-text-secondary);
	}

	.dates {
		display: flex;
		flex-wrap: wrap;
		gap: var(--dd-space-sm);
		justify-content: space-between;
		color: var(--dd-color-text-secondary);
		font-size: var(--dd-font-size-sm);
	}

	summary {
		display: flex;
		align-items: center;
		min-block-size: var(--dd-size-touch-target-min);
		color: var(--dd-color-accent-base);
		font-weight: var(--dd-font-weight-bold);
		cursor: pointer;
	}

	table {
		border-collapse: collapse;
	}

	caption {
		font-weight: var(--dd-font-weight-bold);
		text-align: start;
	}

	th,
	td {
		padding: var(--dd-space-xs) var(--dd-space-md);
		border-block-end-width: var(--dd-border-width-thin);
		border-block-end-style: solid;
		border-block-end-color: var(--dd-color-border-subtle);
		text-align: start;
	}

	.paper {
		display: none;
	}

	/* On paper: the tables, open, in place of the charts and of what opens them. */
	@media print {
		.evolution {
			gap: var(--dd-space-sm);
		}

		.evolution :global([data-chart]),
		figcaption,
		.dates,
		details {
			display: none;
		}

		/* Without their charts, the notes take the whole width, one under the other. */
		.charts {
			display: block;
		}

		.note {
			color: var(--dd-color-print-ink);
		}

		.paper {
			display: grid;
			gap: var(--dd-space-sm);
		}

		table {
			font-size: var(--dd-font-size-print-small);
		}

		th,
		td {
			padding: 0 var(--dd-space-sm);
			border-block-end-color: var(--dd-color-print-border);
		}

		/* One line a play: the titles of the columns wrap, the figures and the dates do not. */
		tbody th,
		td {
			white-space: nowrap;
		}

		tr {
			break-inside: avoid;
		}
	}
</style>
