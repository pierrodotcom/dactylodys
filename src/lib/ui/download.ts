/* The browser needs the address of the file a moment after the click to start the download. */
const REVOKE_DELAY_MS = 10_000;

/** Hands a text file to the browser, which saves it in the downloads: nothing leaves the device. */
export function downloadTextFile(fileName: string, text: string, type: string): void {
	const url = URL.createObjectURL(new Blob([text], { type }));
	const link = document.createElement('a');
	link.href = url;
	link.download = fileName;
	document.body.append(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
