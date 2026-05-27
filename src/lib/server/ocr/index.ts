import type { OcrService } from './types.js';

export type { OcrResult, OcrService } from './types.js';

let _service: OcrService | null = null;

// Factory: use RemoteOcrService when OCR_SERVICE_URL is set, otherwise LocalOcrService.
// Swap the implementation by setting OCR_SERVICE_URL — no code changes needed.
export async function getOcrService(): Promise<OcrService> {
	if (_service) return _service;
	const remoteUrl = process.env.OCR_SERVICE_URL;
	if (remoteUrl) {
		const { RemoteOcrService } = await import('./remote.js');
		_service = new RemoteOcrService(remoteUrl);
	} else {
		const { LocalOcrService } = await import('./local.js');
		_service = new LocalOcrService();
	}
	return _service!;
}
