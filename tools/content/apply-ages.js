// Applies `data/ages.txt` to the three banks as they are: the word bank is otherwise rebuilt from
// Lexique (`build-words.js`), whose download is not always at hand. The builders apply the same
// marks, so that rebuilding a bank gives the same result.
//   node tools/content/apply-ages.js
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadAges, withAges } from './lib/ages.js';
import { CONFIG, REPO_ROOT, writeBankJson } from './lib/common.js';

const marks = loadAges();
const BANKS = [
	{ file: CONFIG.output.wordsFile, list: 'words', marks: marks.words, keyOf: (e) => e.text },
	{ file: CONFIG.output.phrasesFile, list: 'phrases', marks: marks.phrases, keyOf: (e) => e.text },
	{ file: CONFIG.output.textsFile, list: 'texts', marks: marks.texts, keyOf: (e) => e.id }
];

for (const { file, list, marks: bankMarks, keyOf } of BANKS) {
	const path = join(REPO_ROOT, file);
	const bank = JSON.parse(readFileSync(path, 'utf8'));
	bank[list] = withAges(bank[list], bankMarks, keyOf, list.slice(0, -1));
	writeBankJson(path, bank, list);
	console.log(`${file}: ${bankMarks.size} ${list} marked`);
}
