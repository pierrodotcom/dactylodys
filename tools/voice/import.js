import { spawnSync } from 'node:child_process';
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync
} from 'node:fs';
import * as nodeModule from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readZipEntry } from '../content/lib/zip.js';

const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TOOL_DIR, '..', '..');
const VOICE_CONFIG_FILE = 'content/common/voice.json';
const ATTRIBUTIONS_FILE = 'static/ATTRIBUTIONS.md';
const VOICE_FOLDER = 'static/voice';
const MANIFEST_FILE = 'manifest.json';

const USAGE = `Importe une archive d'enregistrements faite sur la page /dev/voix.

  node tools/voice/import.js <archive.zip> [--prune] [--no-ffmpeg] [--target <dossier>]

  --prune       supprime les enregistrements dont le texte n'existe plus
  --no-ffmpeg   garde les fichiers WAV, même si ffmpeg est installé
  --target      dossier où écrire à la place du dépôt (static/ y est créé au besoin)
`;

function parseArguments(argv) {
	const options = {
		archive: undefined,
		prune: false,
		ffmpeg: true,
		target: REPO_ROOT,
		help: false
	};
	for (let i = 0; i < argv.length; i++) {
		const argument = argv[i];
		if (argument === '--prune') options.prune = true;
		else if (argument === '--no-ffmpeg') options.ffmpeg = false;
		else if (argument === '--help' || argument === '-h') options.help = true;
		else if (argument === '--target') {
			i += 1;
			if (argv[i] === undefined) throw new Error('--target attend un dossier.');
			options.target = resolve(argv[i]);
		} else if (argument.startsWith('--')) throw new Error(`Option inconnue : ${argument}`);
		else if (options.archive === undefined) options.archive = resolve(argument);
		else throw new Error('Une seule archive à la fois.');
	}
	return options;
}

/**
 * The key of a text, the list of the texts and the formats of the files are written once, in the
 * TypeScript of the app: the tool loads those very modules rather than a copy that could drift.
 * Node runs them by stripping their types; this hook finds their extensionless imports.
 */
function allowTypeScriptImports() {
	if (typeof nodeModule.registerHooks !== 'function' || !process.features.typescript) {
		throw new Error(`Cet outil demande Node 24 ou plus récent (ici : ${process.version}).`);
	}
	nodeModule.registerHooks({
		resolve(specifier, context, nextResolve) {
			try {
				return nextResolve(specifier, context);
			} catch (error) {
				if (!specifier.startsWith('.')) throw error;
				return nextResolve(`${specifier}.ts`, context);
			}
		}
	});
}

function readJson(path) {
	return JSON.parse(readFileSync(path, 'utf8'));
}

function hasFfmpeg() {
	return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
}

function convertToMp3(wavPath, mp3Path, bitrateKbps) {
	const result = spawnSync(
		'ffmpeg',
		[
			...['-hide_banner', '-loglevel', 'error', '-y', '-i', wavPath],
			...['-ac', '1', '-codec:a', 'libmp3lame', '-b:a', `${bitrateKbps}k`, mp3Path]
		],
		{ encoding: 'utf8' }
	);
	if (result.status !== 0) {
		throw new Error(`ffmpeg n'a pas pu convertir ${wavPath} : ${result.stderr || result.error}`);
	}
}

async function main() {
	const options = parseArguments(process.argv.slice(2));
	if (options.help || options.archive === undefined) {
		console.log(USAGE);
		return options.help ? 0 : 1;
	}
	allowTypeScriptImports();
	const { parseVoiceConfig } = await import('../../src/lib/audio/voice-config.ts');
	const { parseVoiceManifest } = await import('../../src/lib/audio/voice-player.ts');
	const { VOICE_RECORDINGS_FILE, parseVoiceRecordings } =
		await import('../../src/lib/audio/voice-recordings.ts');
	const { readWavHeader } = await import('../../src/lib/audio/voice-signal.ts');
	const { LOOK_REMINDER_ID, LOOK_REMINDER_MESSAGE, voiceLocale, voiceTexts } =
		await import('../../src/lib/audio/voice-texts.ts');
	const { updateAttributions } = await import('./lib/attributions.ts');
	const { planImport, renderReport, serializeManifest } = await import('./lib/import-plan.ts');

	const archive = readFileSync(options.archive);
	const recordings = parseVoiceRecordings(
		JSON.parse(readZipEntry(archive, VOICE_RECORDINGS_FILE).toString('utf8'))
	);
	const sounds = new Map();
	const durations = new Map();
	for (const clip of recordings.clips) {
		const wav = readZipEntry(archive, clip.file);
		durations.set(clip.key, readWavHeader(wav).durationMs);
		sounds.set(clip.key, wav);
	}

	// The reminder said by the games is listed by the page too: without it, --prune would delete its clip.
	const messages = readJson(join(REPO_ROOT, 'messages', `${recordings.locale}.json`));
	const reminders =
		typeof messages[LOOK_REMINDER_MESSAGE] === 'string'
			? [{ id: LOOK_REMINDER_ID, text: messages[LOOK_REMINDER_MESSAGE] }]
			: [];
	const texts = new Map();
	for (const source of readJson(join(TOOL_DIR, 'config.json')).sources) {
		const progression = readJson(join(REPO_ROOT, source.progression));
		if (voiceLocale(progression) !== recordings.locale) continue;
		const story = source.story ? readJson(join(REPO_ROOT, source.story)) : undefined;
		for (const text of voiceTexts(progression, story, reminders)) {
			if (!texts.has(text.key)) texts.set(text.key, text);
		}
	}
	if (texts.size === 0) {
		throw new Error(`Aucun parcours pour la langue « ${recordings.locale} » dans config.json.`);
	}

	const config = parseVoiceConfig(readJson(join(REPO_ROOT, VOICE_CONFIG_FILE)));
	const voiceDir = join(options.target, VOICE_FOLDER, recordings.locale);
	const manifestPath = join(voiceDir, MANIFEST_FILE);
	const existing = existsSync(manifestPath) ? parseVoiceManifest(readJson(manifestPath)) : null;
	const format = options.ffmpeg && hasFfmpeg() ? 'mp3' : 'wav';
	const plan = planImport({
		recordings,
		durations,
		existing,
		texts: [...texts.values()],
		format,
		prune: options.prune
	});

	// Everything is prepared aside first: a failed conversion leaves the published voice untouched.
	const workDir = mkdtempSync(join(tmpdir(), 'dactylodys-voix-'));
	try {
		const prepared = plan.writes.map((write) => {
			const wav = sounds.get(write.key);
			if (format === 'wav') return { file: write.file, data: wav };
			const wavPath = join(workDir, `${write.key}.wav`);
			const mp3Path = join(workDir, write.file);
			writeFileSync(wavPath, wav);
			convertToMp3(wavPath, mp3Path, config.mp3BitrateKbps);
			return { file: write.file, data: readFileSync(mp3Path) };
		});
		mkdirSync(voiceDir, { recursive: true });
		for (const file of plan.deletes) rmSync(join(voiceDir, file), { force: true });
		for (const { file, data } of prepared) writeFileSync(join(voiceDir, file), data);
	} finally {
		rmSync(workDir, { recursive: true, force: true });
	}
	writeFileSync(manifestPath, serializeManifest(plan.manifest), 'utf8');

	const attributionsPath = join(options.target, ATTRIBUTIONS_FILE);
	const attributions = readFileSync(
		existsSync(attributionsPath) ? attributionsPath : join(REPO_ROOT, ATTRIBUTIONS_FILE),
		'utf8'
	);
	writeFileSync(
		attributionsPath,
		updateAttributions(attributions, recordings.locale, plan.manifest.voice.name),
		'utf8'
	);

	const totalBytes = Object.values(plan.manifest.clips).reduce((total, clip) => {
		const path = join(voiceDir, clip.file);
		return total + (existsSync(path) ? statSync(path).size : 0);
	}, 0);
	console.log(
		renderReport({
			plan,
			directory: relative(options.target, voiceDir).replaceAll('\\', '/'),
			format,
			mp3BitrateKbps: config.mp3BitrateKbps,
			totalBytes
		})
	);
	return 0;
}

try {
	process.exitCode = await main();
} catch (error) {
	console.error(`Import impossible : ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
}
