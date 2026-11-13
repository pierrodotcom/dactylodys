import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import playRules from '../../content/common/play-rules.json';
import progression from '../../content/fr/progression/azerty-decouverte.json';
import { REVIEW_TEMPLATE_FILE } from '../../src/routes/pour-les-professionnels/links';

/*
 * The sheet for professionals lives twice: in the game (`/pour-les-professionnels`) and as a
 * Markdown file to send by mail (`docs/fiche-professionnels.md`). Its call for review lives a third
 * time, as the issue form of the repository. Neither may drift away from the page unnoticed.
 */
const PAGE = 'src/routes/pour-les-professionnels/+page.svelte';
const SHEET = 'docs/fiche-professionnels.md';
const TEMPLATE = `.github/ISSUE_TEMPLATE/${REVIEW_TEMPLATE_FILE}`;
const MIN_SECTIONS = 6;
const MIN_QUESTIONS = 5;
const MAX_QUESTIONS = 8;

const source = readFileSync(PAGE, 'utf8');
const sheet = readFileSync(SHEET, 'utf8');
const messages = JSON.parse(readFileSync('messages/fr.json', 'utf8')) as Record<string, string>;

/** The values the page passes to its questions, read from the same data as the page. */
const PARAMS: Record<string, string> = {
	exercises: String(playRules.breakAfterExercises),
	minutes: String(playRules.breakAfterMinutes),
	accuracy: String(progression.rules.unlockAccuracy),
	attempts: String(progression.rules.keyboardFade.acquiredMinAttempts),
	errors: String(Math.round(progression.rules.keyboardFade.acquiredMaxErrorRate * 100))
};

function message(key: string): string {
	const text = messages[key];
	if (text === undefined) throw new Error(`missing message: ${key}`);
	return text.replace(/\{(\w+)\}/g, (_, name: string) => {
		const value = PARAMS[name];
		if (value === undefined) throw new Error(`${key}: no value for {${name}}`);
		return value;
	});
}

function keysOf(pattern: RegExp, text: string): string[] {
	return [...text.matchAll(pattern)].map((match) => match[1] ?? '');
}

const sectionTitles = keysOf(/<h2 id="[\w-]+">\{m\.(\w+)\(\)\}<\/h2>/g, source).map(message);
const questionsBlock = /<ol data-review-questions>([\s\S]*?)<\/ol>/.exec(source)?.[1] ?? '';
const questions = keysOf(/m\.(pro_review_q_\w+)\(/g, questionsBlock).map(message);

describe('the sheet for professionals', () => {
	it('has the same section titles in the game and in its Markdown version', () => {
		const headings = [...sheet.matchAll(/^## (.+)$/gm)].map((match) => match[1]?.trim());

		expect(sectionTitles.length).toBeGreaterThanOrEqual(MIN_SECTIONS);
		expect(headings).toEqual(sectionTitles);
	});

	it('asks between five and eight precise questions', () => {
		expect(questions.length).toBeGreaterThanOrEqual(MIN_QUESTIONS);
		expect(questions.length).toBeLessThanOrEqual(MAX_QUESTIONS);
	});

	it('asks the same questions in its Markdown version, with the same figures', () => {
		const missing = questions.filter((question) => !sheet.includes(question));

		expect(missing).toEqual([]);
	});

	it('asks the same questions in the issue form of the repository', () => {
		expect(existsSync(TEMPLATE)).toBe(true);
		const template = readFileSync(TEMPLATE, 'utf8');
		const missing = questions.filter((question) => !template.includes(question));

		expect(missing).toEqual([]);
	});

	it('gives the Markdown sheet the course described by the page, with the figures of the data', () => {
		const lessons = progression.worlds.reduce((count, world) => count + world.lessons.length, 0);
		const path = (messages['pro_audience_path'] ?? '')
			.replace('{lessons}', String(lessons))
			.replace('{worlds}', String(progression.worlds.length));

		expect(path).not.toBe('');
		expect(sheet).toContain(path);
	});

	it('never writes the name of the app in the page itself', () => {
		const appName = messages['app_name'] ?? '';

		expect(appName.trim()).toBeTruthy();
		expect(source.toLowerCase()).not.toContain(appName.toLowerCase());
	});
});
