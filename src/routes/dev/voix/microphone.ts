/**
 * Why the microphone cannot be used. `insecure` and `unsupported` are known as soon as the page
 * opens and will not change; the others are answers to one attempt, and trying again makes sense.
 */
export type MicrophoneProblem = 'insecure' | 'unsupported' | 'denied' | 'missing' | 'failed';

/** What the browser offers, read once so that the decision can be tested without a browser. */
export interface MicrophoneSupport {
	readonly isSecureContext: boolean;
	readonly hasGetUserMedia: boolean;
	readonly hasMediaRecorder: boolean;
	readonly hasDecoder: boolean;
}

export interface DecodedRecording {
	readonly channels: readonly Float32Array[];
	readonly sampleRate: number;
}

export interface ActiveRecording {
	/** Ends the recording and releases the microphone. */
	stop(): Promise<Blob>;
	/** Releases the microphone and throws the recording away. */
	cancel(): void;
}

const DENIED_ERRORS = ['NotAllowedError', 'SecurityError', 'PermissionDeniedError'];
const MISSING_ERRORS = ['NotFoundError', 'DevicesNotFoundError', 'OverconstrainedError'];
/** A rate every browser accepts for a context that only decodes; the take is resampled afterwards. */
const DECODING_SAMPLE_RATE = 44_100;

export function findSupportProblem(support: MicrophoneSupport): MicrophoneProblem | null {
	// Browsers hide the microphone outside HTTPS: say so rather than "not supported".
	if (!support.isSecureContext) return 'insecure';
	if (!support.hasGetUserMedia || !support.hasMediaRecorder || !support.hasDecoder) {
		return 'unsupported';
	}
	return null;
}

export function isLasting(problem: MicrophoneProblem | null): boolean {
	return problem === 'insecure' || problem === 'unsupported';
}

export function explainMicrophoneError(error: unknown): MicrophoneProblem {
	const name = (error as { name?: unknown } | null | undefined)?.name;
	if (typeof name !== 'string') return 'failed';
	if (DENIED_ERRORS.includes(name)) return 'denied';
	if (MISSING_ERRORS.includes(name)) return 'missing';
	return 'failed';
}

export function readMicrophoneSupport(): MicrophoneSupport {
	return {
		isSecureContext: window.isSecureContext,
		hasGetUserMedia: typeof navigator.mediaDevices?.getUserMedia === 'function',
		hasMediaRecorder: typeof MediaRecorder === 'function',
		hasDecoder: typeof OfflineAudioContext === 'function'
	};
}

/** Asks for the microphone and starts recording; rejects with the error of the browser. */
export async function startRecording(): Promise<ActiveRecording> {
	const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
	const release = () => stream.getTracks().forEach((track) => track.stop());
	const chunks: Blob[] = [];
	let recorder: MediaRecorder;
	try {
		recorder = new MediaRecorder(stream);
	} catch (error) {
		release();
		throw error;
	}
	const finished = new Promise<Blob>((resolve, reject) => {
		recorder.addEventListener('dataavailable', (event) => {
			if (event.data.size > 0) chunks.push(event.data);
		});
		recorder.addEventListener('stop', () => {
			resolve(new Blob(chunks, { type: recorder.mimeType }));
		});
		recorder.addEventListener('error', () => reject(new Error('The recording failed')));
	});
	finished.catch(() => undefined);
	const end = () => {
		try {
			if (recorder.state !== 'inactive') recorder.stop();
		} finally {
			release();
		}
	};
	try {
		recorder.start();
	} catch (error) {
		release();
		throw error;
	}
	return {
		stop() {
			end();
			return finished;
		},
		cancel() {
			try {
				end();
			} catch {
				// Nothing is kept of a cancelled recording, not even its failure.
			}
		}
	};
}

/** Whatever format the browser recorded in, back to plain samples. */
export async function decodeRecording(recording: Blob): Promise<DecodedRecording> {
	if (recording.size === 0) throw new Error('The recording is empty');
	const context = new OfflineAudioContext(1, 1, DECODING_SAMPLE_RATE);
	const buffer = await context.decodeAudioData(await recording.arrayBuffer());
	return {
		channels: Array.from({ length: buffer.numberOfChannels }, (_, index) =>
			buffer.getChannelData(index)
		),
		sampleRate: buffer.sampleRate
	};
}
