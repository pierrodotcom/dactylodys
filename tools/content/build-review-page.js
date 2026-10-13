// Builds the page where a person accepts or rejects every word and phrase.
//   node tools/content/build-review-page.js              -> docs/relecture/relecture.html (answers in a file)
//   node tools/content/build-review-page.js --artifact F -> F, a claude.ai artifact (answers in its database)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = new URL('../../', import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));

const artifactFlag = process.argv.indexOf('--artifact');
const artifactTarget = artifactFlag === -1 ? null : process.argv[artifactFlag + 1];
if (artifactFlag !== -1 && !artifactTarget) throw new Error('--artifact needs a file path');
const mode = artifactTarget ? 'artifact' : 'file';

const words = read('content/fr/words/base.json');
const phrases = read('content/fr/phrases/base.json');
const byLevelThenText = (a, b) => a.level - b.level || a.text.localeCompare(b.text, 'fr');
const byText = (a, b) => a.text.localeCompare(b.text, 'fr');

// Document ids of the artifact database follow the alphabetical order, which only changes when
// an entry is added or removed; every document also stores its text.
const withIds = (entries, prefix) =>
	[...entries]
		.sort(byText)
		.map((entry, index) => ({
			id: prefix + String(index).padStart(4, '0'),
			text: entry.text,
			themes: entry.themes,
			level: entry.level
		}))
		.sort(byLevelThenText);

const data = {
	mode,
	wordBankId: words.id,
	phraseBankId: phrases.id,
	themeTitles: Object.fromEntries(words.themes.map((theme) => [theme.id, theme.title])),
	words: withIds(words.words, 'w'),
	phrases: withIds(phrases.phrases, 'p')
};
const embedded = JSON.stringify(data).replaceAll('<', '\\u003c');

const fonts =
	mode === 'artifact'
		? '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;600;700&display=swap" />'
		: '';

const style = `<style>
	/* One column of answer rows under a compact sticky bar of counters and filters. */
	:root {
		--bg: #fbf4e8;
		--surface: #fffdf8;
		--text: #2a2118;
		--muted: #6b5d4d;
		--line: #cbbfae;
		--accent: #0b6e6e;
		--yes: #0b6e4f;
		--no: #a8322a;
		--on-strong: #fffdf8;
		--focus: #3b3bd1;
		--font: 'Atkinson Hyperlegible Next', 'Atkinson Hyperlegible', system-ui, sans-serif;
	}
	@media (prefers-color-scheme: dark) {
		:root:not([data-theme='light']) {
			--bg: #1c1814;
			--surface: #27221c;
			--text: #f3ead9;
			--muted: #b8aa95;
			--line: #5a4f41;
			--accent: #7fd6d6;
			--yes: #6fd1ae;
			--no: #f09a90;
			--on-strong: #1c1814;
			--focus: #a9a9ff;
			color-scheme: dark;
		}
	}
	:root[data-theme='dark'] {
		--bg: #1c1814;
		--surface: #27221c;
		--text: #f3ead9;
		--muted: #b8aa95;
		--line: #5a4f41;
		--accent: #7fd6d6;
		--yes: #6fd1ae;
		--no: #f09a90;
		--on-strong: #1c1814;
		--focus: #a9a9ff;
		color-scheme: dark;
	}
	* {
		box-sizing: border-box;
	}
	body {
		margin: 0;
		background: var(--bg);
		color: var(--text);
		font: 1.05rem/1.5 var(--font);
	}
	.wrap {
		max-width: 46rem;
		margin-inline: auto;
		padding-inline: 1rem;
		padding-block: 1rem 3rem;
	}
	h1 {
		margin: 0;
		font-size: 1.4rem;
		text-wrap: balance;
	}
	.help {
		margin: 0.5rem 0 0;
		color: var(--muted);
	}
	.bar {
		position: sticky;
		top: env(safe-area-inset-top, 0px);
		z-index: 1;
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 0.75rem;
		align-items: center;
		margin-block: 1rem 0.5rem;
		padding-block: 0.5rem;
		background: var(--bg);
		border-bottom: 2px solid var(--line);
	}
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 0.75rem;
		align-items: center;
		margin-block-end: 0.5rem;
	}
	.count {
		flex: 1 1 100%;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.status {
		flex: 1 1 100%;
		color: var(--muted);
		font-size: 0.9rem;
	}
	.status[data-state='error'] {
		color: var(--no);
		font-weight: 700;
	}
	label {
		display: inline-flex;
		gap: 0.4rem;
		align-items: center;
		min-height: 2.75rem;
	}
	button,
	select,
	input {
		font: inherit;
		color: inherit;
	}
	button,
	select {
		min-height: 3rem;
		padding: 0 1rem;
		border: 2px solid var(--line);
		border-radius: 0.5rem;
		background: var(--surface);
	}
	button {
		cursor: pointer;
	}
	input[type='checkbox'] {
		width: 1.4rem;
		height: 1.4rem;
		accent-color: var(--accent);
	}
	:focus-visible {
		outline: 3px solid var(--focus);
		outline-offset: 2px;
	}
	.row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.5rem 0.75rem;
		align-items: center;
		padding: 0.6rem 0.6rem 0.6rem 0.75rem;
		border-bottom: 1px solid var(--line);
		border-left: 0.4rem solid transparent;
	}
	.row[data-answer='yes'] {
		border-left-color: var(--yes);
	}
	.row[data-answer='no'] {
		border-left-color: var(--no);
	}
	.row[data-answer='no'] .text {
		text-decoration: line-through;
		color: var(--muted);
	}
	.row:focus-within {
		background: var(--surface);
	}
	.entry {
		min-width: 0;
	}
	.text {
		font-size: 1.3rem;
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.meta {
		color: var(--muted);
		font-size: 0.9rem;
	}
	.choice {
		display: flex;
		gap: 0.4rem;
	}
	.choice button {
		min-width: 4rem;
		font-weight: 700;
	}
	.choice button.yes[aria-pressed='true'] {
		background: var(--yes);
		border-color: var(--yes);
		color: var(--on-strong);
	}
	.choice button.no[aria-pressed='true'] {
		background: var(--no);
		border-color: var(--no);
		color: var(--on-strong);
	}
	.note {
		grid-column: 1 / -1;
		width: 100%;
		min-height: 2.75rem;
		padding: 0 0.6rem;
		border: 2px solid var(--line);
		border-radius: 0.5rem;
		background: var(--surface);
	}
	.empty {
		padding-block: 2rem;
		color: var(--muted);
	}
	@media (max-width: 30rem) {
		.row {
			grid-template-columns: minmax(0, 1fr);
		}
		.choice button {
			flex: 1;
		}
	}
</style>`;

const fileControls =
	mode === 'file'
		? `<button type="button" id="export">Enregistrer mes réponses dans un fichier</button>
			<button type="button" id="import">Reprendre depuis un fichier</button>
			<input type="file" id="file" accept="application/json" hidden />`
		: '';

const help =
	mode === 'file'
		? 'Pour chaque ligne : <strong>Oui</strong> = on garde, <strong>Non</strong> = on retire. Au clavier : <kbd>O</kbd> ou <kbd>N</kbd> répond et passe à la ligne suivante. La case sous le mot sert à noter une remarque (thème faux, mot trop difficile…). Tes réponses sont gardées dans ce navigateur ; enregistre-les dans un fichier quand tu as fini ou pour continuer plus tard.'
		: 'Pour chaque ligne : <strong>Oui</strong> = on garde, <strong>Non</strong> = on retire. La case sous le mot sert à noter une remarque (thème faux, mot trop difficile…). Tes réponses sont enregistrées en ligne au fur et à mesure : tu peux commencer sur le téléphone et continuer sur l’ordinateur.';

const body = `<div class="wrap">
	<h1>Relecture des mots et des phrases</h1>
	<p class="help">${help}</p>
	<div class="bar">
		<span class="count" id="count" aria-live="polite"></span>
		<span class="status" id="status" role="status"></span>
	</div>
	<div class="filters">
		<label>Afficher <select id="list"><option value="words">les mots</option><option value="phrases">les phrases</option></select></label>
		<label>Thème <select id="theme"></select></label>
		<label>Réponses <select id="shown"><option value="">toutes</option><option value="pending">ce qui reste</option><option value="yes">les Oui</option><option value="no">les Non</option></select></label>
		${fileControls}
	</div>
	<main id="rows"></main>
</div>
<script type="application/json" id="data">${embedded}</script>`;

const fileScript =
	mode === 'file'
		? `	function wireFiles() {
		document.getElementById('export').addEventListener('click', () => {
			const result = {
				schemaVersion: 1,
				wordBankId: data.wordBankId,
				phraseBankId: data.phraseBankId,
				savedAt: new Date().toISOString(),
				words: answers.words,
				phrases: answers.phrases
			};
			const link = document.createElement('a');
			link.href = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
			link.download = 'relecture-fr__' + result.savedAt.slice(0, 10) + '.json';
			link.click();
			URL.revokeObjectURL(link.href);
		});
		const file = document.getElementById('file');
		document.getElementById('import').addEventListener('click', () => file.click());
		file.addEventListener('change', async () => {
			const picked = file.files[0];
			if (!picked) return;
			try {
				const loaded = JSON.parse(await picked.text());
				for (const kind of KINDS) answers[kind] = loaded[kind] ?? {};
				writeLocal();
				render();
				setStatus('Réponses reprises depuis le fichier.');
			} catch {
				setStatus('Ce fichier ne contient pas de réponses de relecture.', 'error');
			}
			file.value = '';
		});
	}

`
		: '';

const script = `<script>
	const data = JSON.parse(document.getElementById('data').textContent);
	const answers = { words: {}, phrases: {} };
	const KINDS = ['words', 'phrases'];
	const STORAGE_KEY = 'dactylodys-relecture-fr';

	const rows = document.getElementById('rows');
	const listSelect = document.getElementById('list');
	const themeSelect = document.getElementById('theme');
	const shown = document.getElementById('shown');
	const count = document.getElementById('count');
	const status = document.getElementById('status');

	const setStatus = (text, state) => {
		status.textContent = text;
		status.dataset.state = state ?? '';
	};

	const readLocal = () => {
		try {
			const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
			for (const kind of KINDS) answers[kind] = stored[kind] ?? {};
		} catch {}
	};
	const writeLocal = () => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
		} catch {}
	};

	// Replaced by the artifact database when it is available.
	let persist = () => writeLocal();

	themeSelect.append(new Option('tous', ''));
	for (const [id, title] of Object.entries(data.themeTitles)) themeSelect.append(new Option(title, id));
	themeSelect.append(new Option('sans thème', '-'));

	const answerOf = (kind, item) => answers[kind][item.text];
	const visible = () => {
		const kind = listSelect.value;
		const theme = themeSelect.value;
		return data[kind].filter((item) => {
			if (theme === '-' && item.themes.length > 0) return false;
			if (theme && theme !== '-' && !item.themes.includes(theme)) return false;
			const keep = answerOf(kind, item)?.keep;
			if (shown.value === 'pending') return keep === undefined;
			if (shown.value === 'yes') return keep === true;
			if (shown.value === 'no') return keep === false;
			return true;
		});
	};

	function updateCount() {
		const kind = listSelect.value;
		const all = data[kind];
		const yes = all.filter((item) => answerOf(kind, item)?.keep === true).length;
		const no = all.filter((item) => answerOf(kind, item)?.keep === false).length;
		count.textContent = yes + ' oui · ' + no + ' non · ' + (all.length - yes - no) + ' restants sur ' + all.length;
	}

	function paint(row, item) {
		const answer = answerOf(listSelect.value, item);
		row.dataset.answer = answer?.keep === true ? 'yes' : answer?.keep === false ? 'no' : '';
		row.querySelector('.yes').setAttribute('aria-pressed', String(answer?.keep === true));
		row.querySelector('.no').setAttribute('aria-pressed', String(answer?.keep === false));
		const note = row.querySelector('.note');
		if (document.activeElement !== note) note.value = answer?.note ?? '';
	}

	function change(kind, item, patch) {
		const next = { ...answers[kind][item.text], ...patch };
		if (next.keep === undefined) delete next.keep;
		if (!next.note) delete next.note;
		if (Object.keys(next).length === 0) delete answers[kind][item.text];
		else answers[kind][item.text] = next;
		persist(kind, item);
		updateCount();
	}

	function render() {
		const kind = listSelect.value;
		const items = visible();
		rows.replaceChildren();
		if (items.length === 0) {
			const empty = document.createElement('p');
			empty.className = 'empty';
			empty.textContent = 'Rien à afficher avec ces filtres.';
			rows.append(empty);
		}
		for (const item of items) {
			const row = document.createElement('div');
			row.className = 'row';
			row.item = item;

			const entry = document.createElement('div');
			entry.className = 'entry';
			const text = document.createElement('div');
			text.className = 'text';
			text.textContent = item.text;
			const meta = document.createElement('div');
			meta.className = 'meta';
			const themes = item.themes.map((id) => data.themeTitles[id] ?? id).join(', ') || 'sans thème';
			meta.textContent = themes + ' · niveau ' + item.level;
			entry.append(text, meta);

			const choice = document.createElement('div');
			choice.className = 'choice';
			for (const [name, keep, caption] of [['yes', true, 'Oui'], ['no', false, 'Non']]) {
				const button = document.createElement('button');
				button.type = 'button';
				button.className = name;
				button.textContent = caption;
				button.setAttribute('aria-label', caption + ' : ' + item.text);
				button.addEventListener('click', () => {
					const current = answerOf(kind, item)?.keep;
					change(kind, item, { keep: current === keep ? undefined : keep });
					paint(row, item);
				});
				choice.append(button);
			}

			const note = document.createElement('input');
			note.className = 'note';
			note.id = 'note-' + item.id;
			note.placeholder = 'remarque (facultatif)';
			note.setAttribute('aria-label', 'Remarque sur ' + item.text);
			note.addEventListener('change', () => change(kind, item, { note: note.value.trim() }));

			row.append(entry, choice, note);
			paint(row, item);
			rows.append(row);
		}
		updateCount();
	}

	function repaint() {
		for (const row of rows.querySelectorAll('.row')) paint(row, row.item);
		updateCount();
	}

	rows.addEventListener('keydown', (event) => {
		const row = event.target.closest('.row');
		if (!row || event.target.classList.contains('note')) return;
		const key = event.key.toLowerCase();
		if (key !== 'o' && key !== 'n') return;
		const keep = key === 'o';
		if (answerOf(listSelect.value, row.item)?.keep !== keep) {
			change(listSelect.value, row.item, { keep });
			paint(row, row.item);
		}
		row.nextElementSibling?.querySelector('.' + (keep ? 'yes' : 'no'))?.focus();
		event.preventDefault();
	});

	for (const control of [listSelect, themeSelect, shown]) control.addEventListener('change', render);

${fileScript}	async function wireDatabase() {
		const db = (await window.claude?.use?.('db')) ?? null;
		if (!db) {
			setStatus('Enregistrement en ligne indisponible : tes réponses restent sur cet appareil seulement.', 'error');
			return;
		}
		const queues = {};
		let waiting = 0;
		const merged = {};
		persist = (kind, item) => {
			writeLocal();
			const ref = db.collection(kind).doc(item.id);
			waiting += 1;
			setStatus('Enregistrement…');
			queues[item.id] = (queues[item.id] ?? Promise.resolve())
				.then(() => {
					const answer = answers[kind][item.text];
					return answer ? ref.set({ text: item.text, ...answer }) : ref.delete();
				})
				.then(() => {
					waiting -= 1;
					if (waiting === 0) setStatus('Tout est enregistré en ligne.');
				})
				.catch((error) => {
					waiting -= 1;
					setStatus('Une réponse n’a pas pu être enregistrée (' + (error?.code ?? 'erreur') + '). Réessaie de répondre à cette ligne.', 'error');
				});
		};
		for (const kind of KINDS) {
			db.collection(kind)
				.limit(1000)
				.onSnapshot(
					(snapshot) => {
						if (waiting > 0 || snapshot.metadata.hasPendingWrites) return;
						const next = {};
						for (const doc of snapshot.docs) {
							const { text, keep, note } = doc.data() ?? {};
							if (typeof text !== 'string') continue;
							const answer = {};
							if (typeof keep === 'boolean') answer.keep = keep;
							if (typeof note === 'string' && note) answer.note = note;
							next[text] = answer;
						}
						const local = answers[kind];
						answers[kind] = next;
						if (!merged[kind]) {
							merged[kind] = true;
							for (const item of data[kind]) {
								if (!local[item.text] || next[item.text]) continue;
								answers[kind][item.text] = local[item.text];
								persist(kind, item);
							}
						}
						writeLocal();
						if (kind === listSelect.value) repaint();
						if (waiting === 0) setStatus('Tout est enregistré en ligne.');
					},
					() => setStatus('La liaison avec l’enregistrement en ligne est coupée. Recharge la page.', 'error')
				);
		}
	}

	if (data.mode === 'file') {
		readLocal();
		wireFiles();
		render();
	} else {
		readLocal();
		setStatus('Chargement de tes réponses…');
		render();
		wireDatabase();
	}
</script>`;

const title = 'Relecture DactyloDys';
const page =
	mode === 'artifact'
		? `<title>${title}</title>\n${fonts}\n${style}\n${body}\n${script}\n`
		: `<!doctype html>
<html lang="fr">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="robots" content="noindex" />
		<title>${title}</title>
		${style}
	</head>
	<body>
		${body}
		${script}
	</body>
</html>
`;

const target = artifactTarget
	? pathToFileURL(artifactTarget)
	: new URL('docs/relecture/relecture.html', root);
writeFileSync(target, page);
console.log(
	`${fileURLToPath(target)} (${mode}): ${data.words.length} words, ${data.phrases.length} phrases`
);
