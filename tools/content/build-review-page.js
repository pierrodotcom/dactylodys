// Builds docs/relecture/relecture.html: a standalone page to accept or reject every word and phrase.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));

const words = read('content/fr/words/base.json');
const phrases = read('content/fr/phrases/base.json');

const themeTitles = Object.fromEntries(words.themes.map((theme) => [theme.id, theme.title]));
const byLevelThenText = (a, b) => a.level - b.level || a.text.localeCompare(b.text, 'fr');

const data = {
	wordBankId: words.id,
	phraseBankId: phrases.id,
	themeTitles,
	words: [...words.words].sort(byLevelThenText),
	phrases: [...phrases.phrases].sort(byLevelThenText)
};

const embedded = JSON.stringify(data).replaceAll('<', '\\u003c');

const page = `<!doctype html>
<html lang="fr">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="robots" content="noindex" />
		<title>DactyloDys — relecture des mots et des phrases</title>
		<style>
			:root {
				color-scheme: light dark;
				--bg: #fbf4e8;
				--surface: #fffdf8;
				--text: #2a2118;
				--muted: #6b5d4d;
				--line: #cbbfae;
				--yes: #0b6e4f;
				--no: #a8322a;
				--focus: #3b3bd1;
			}
			@media (prefers-color-scheme: dark) {
				:root {
					--bg: #1c1814;
					--surface: #27221c;
					--text: #f3ead9;
					--muted: #b8aa95;
					--line: #5a4f41;
					--yes: #6fd1ae;
					--no: #f09a90;
					--focus: #a9a9ff;
				}
			}
			* { box-sizing: border-box; }
			body { margin: 0; background: var(--bg); color: var(--text); font: 1.05rem/1.5 system-ui, sans-serif; }
			header { position: sticky; top: 0; z-index: 1; background: var(--bg); border-bottom: 2px solid var(--line); padding: 0.75rem 1rem; }
			main { max-width: 60rem; margin: 0 auto; padding: 1rem; }
			h1 { font-size: 1.3rem; margin: 0 0 0.25rem; }
			h2 { margin: 2rem 0 0.5rem; font-size: 1.2rem; }
			.bar { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
			.count { font-weight: 700; }
			button, select, input { font: inherit; color: inherit; }
			button, select { min-height: 2.75rem; padding: 0 0.9rem; border: 2px solid var(--line); border-radius: 0.5rem; background: var(--surface); cursor: pointer; }
			:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
			.help { color: var(--muted); margin: 0.25rem 0 0; }
			.row { display: grid; grid-template-columns: minmax(10rem, 1fr) auto auto; gap: 0.75rem; align-items: center; padding: 0.4rem 0.6rem; border-bottom: 1px solid var(--line); }
			.row[data-answer='yes'] { border-left: 0.4rem solid var(--yes); }
			.row[data-answer='no'] { border-left: 0.4rem solid var(--no); }
			.row[data-answer='no'] .text { text-decoration: line-through; color: var(--muted); }
			.row.current { background: var(--surface); }
			.text { font-size: 1.3rem; font-weight: 600; }
			.meta { color: var(--muted); font-size: 0.9rem; }
			.choice { display: flex; gap: 0.4rem; }
			.choice button[aria-pressed='true'].yes { background: var(--yes); border-color: var(--yes); color: var(--bg); }
			.choice button[aria-pressed='true'].no { background: var(--no); border-color: var(--no); color: var(--bg); }
			.note { width: 12rem; min-height: 2.75rem; padding: 0 0.5rem; border: 2px solid var(--line); border-radius: 0.5rem; background: var(--surface); }
			[hidden] { display: none !important; }
			@media (max-width: 40rem) { .row { grid-template-columns: 1fr; } .note { width: 100%; } }
		</style>
	</head>
	<body>
		<header>
			<h1>Relecture des mots et des phrases</h1>
			<div class="bar">
				<span class="count" id="count" aria-live="polite"></span>
				<label>Afficher <select id="list"><option value="words">les mots</option><option value="phrases">les phrases</option></select></label>
				<label>Thème <select id="theme"></select></label>
				<label><input type="checkbox" id="pending" /> seulement ce qui reste</label>
				<button type="button" id="export">Enregistrer mes réponses dans un fichier</button>
				<button type="button" id="import">Reprendre depuis un fichier</button>
				<input type="file" id="file" accept="application/json" hidden />
			</div>
			<p class="help">Pour chaque ligne : <strong>Oui</strong> = on garde, <strong>Non</strong> = on retire. Au clavier : <kbd>O</kbd> ou <kbd>N</kbd> répond et passe à la ligne suivante, <kbd>↑</kbd> <kbd>↓</kbd> pour se déplacer. La case de droite sert à noter une remarque (thème faux, mot trop difficile…). Tes réponses sont gardées dans ce navigateur ; enregistre-les dans un fichier quand tu as fini ou pour continuer plus tard.</p>
		</header>
		<main id="rows"></main>
		<script type="application/json" id="data">${embedded}</script>
		<script>
			const data = JSON.parse(document.getElementById('data').textContent);
			const STORAGE_KEY = 'dactylodys-relecture-fr';
			const answers = { words: {}, phrases: {} };
			try {
				Object.assign(answers, JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'));
			} catch {}
			const save = () => {
				try {
					localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
				} catch {}
			};

			const rows = document.getElementById('rows');
			const listSelect = document.getElementById('list');
			const themeSelect = document.getElementById('theme');
			const pendingOnly = document.getElementById('pending');
			const count = document.getElementById('count');
			const levelLabel = { 1: 'niveau 1', 2: 'niveau 2', 3: 'niveau 3' };

			themeSelect.append(new Option('tous', ''));
			for (const [id, title] of Object.entries(data.themeTitles)) themeSelect.append(new Option(title, id));
			themeSelect.append(new Option('sans thème', '-'));

			const entry = (kind, text) => (answers[kind][text] ??= {});
			const visible = () => {
				const kind = listSelect.value;
				const theme = themeSelect.value;
				return data[kind].filter((item) => {
					if (theme === '-' && item.themes.length > 0) return false;
					if (theme && theme !== '-' && !item.themes.includes(theme)) return false;
					return !pendingOnly.checked || answers[kind][item.text]?.keep === undefined;
				});
			};

			function updateCount() {
				const kind = listSelect.value;
				const all = data[kind];
				const yes = all.filter((item) => answers[kind][item.text]?.keep === true).length;
				const no = all.filter((item) => answers[kind][item.text]?.keep === false).length;
				count.textContent = yes + ' oui · ' + no + ' non · ' + (all.length - yes - no) + ' restants sur ' + all.length;
			}

			function setAnswer(row, keep) {
				const kind = listSelect.value;
				const item = entry(kind, row.dataset.text);
				item.keep = item.keep === keep ? undefined : keep;
				paint(row);
				save();
				updateCount();
			}

			function paint(row) {
				const keep = answers[listSelect.value][row.dataset.text]?.keep;
				row.dataset.answer = keep === true ? 'yes' : keep === false ? 'no' : '';
				row.querySelector('.yes').setAttribute('aria-pressed', String(keep === true));
				row.querySelector('.no').setAttribute('aria-pressed', String(keep === false));
			}

			function render() {
				const kind = listSelect.value;
				rows.replaceChildren();
				for (const item of visible()) {
					const row = document.createElement('div');
					row.className = 'row';
					row.dataset.text = item.text;
					row.tabIndex = 0;

					const label = document.createElement('div');
					const text = document.createElement('span');
					text.className = 'text';
					text.textContent = item.text;
					const meta = document.createElement('div');
					meta.className = 'meta';
					const themes = item.themes.map((id) => data.themeTitles[id] ?? id).join(', ') || 'sans thème';
					meta.textContent = themes + ' · ' + levelLabel[item.level];
					label.append(text, meta);

					const choice = document.createElement('div');
					choice.className = 'choice';
					for (const [name, keep, caption] of [['yes', true, 'Oui'], ['no', false, 'Non']]) {
						const button = document.createElement('button');
						button.type = 'button';
						button.className = name;
						button.textContent = caption;
						button.tabIndex = -1;
						button.setAttribute('aria-label', caption + ' : ' + item.text);
						button.addEventListener('click', () => setAnswer(row, keep));
						choice.append(button);
					}

					const note = document.createElement('input');
					note.className = 'note';
					note.placeholder = 'remarque';
					note.setAttribute('aria-label', 'Remarque sur ' + item.text);
					note.value = answers[kind][item.text]?.note ?? '';
					note.addEventListener('input', () => {
						entry(kind, item.text).note = note.value.trim() || undefined;
						save();
					});

					row.append(label, choice, note);
					row.addEventListener('focus', () => {
						rows.querySelector('.current')?.classList.remove('current');
						row.classList.add('current');
					});
					paint(row);
					rows.append(row);
				}
				updateCount();
			}

			rows.addEventListener('keydown', (event) => {
				const row = event.target.closest('.row');
				if (!row || event.target.classList.contains('note')) return;
				const key = event.key.toLowerCase();
				if (key === 'o' || key === 'n') {
					const keep = key === 'o';
					if (answers[listSelect.value][row.dataset.text]?.keep !== keep) setAnswer(row, keep);
					row.nextElementSibling?.focus();
					event.preventDefault();
				} else if (event.key === 'ArrowDown') {
					row.nextElementSibling?.focus();
					event.preventDefault();
				} else if (event.key === 'ArrowUp') {
					row.previousElementSibling?.focus();
					event.preventDefault();
				}
			});

			for (const control of [listSelect, themeSelect, pendingOnly]) control.addEventListener('change', render);

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
				link.href = URL.createObjectURL(new Blob([JSON.stringify(result, null, '\\t')], { type: 'application/json' }));
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
					answers.words = loaded.words ?? {};
					answers.phrases = loaded.phrases ?? {};
					save();
					render();
				} catch {
					alert('Ce fichier ne contient pas de réponses de relecture.');
				}
				file.value = '';
			});

			render();
		</script>
	</body>
</html>
`;

const target = new URL('docs/relecture/relecture.html', root);
writeFileSync(target, page);
console.log(`${fileURLToPath(target)}: ${data.words.length} words, ${data.phrases.length} phrases`);
