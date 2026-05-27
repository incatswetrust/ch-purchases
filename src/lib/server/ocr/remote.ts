import type { OcrResult, OcrService } from './types.js';

// Drop-in replacement: set OCR_SERVICE_URL to point to an external OCR microservice.
// POST /recognize with body { image: base64 }, expects { text, confidence }.
export class RemoteOcrService implements OcrService {
	constructor(private readonly url: string) {}

	async recognize(imageBuffer: Buffer): Promise<OcrResult> {
		const response = await fetch(`${this.url}/recognize`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ image: imageBuffer.toString('base64') })
		});
		if (!response.ok) {
			throw new Error(`Remote OCR service error: ${response.status}`);
		}
		const data = (await response.json()) as { text: string; confidence: number };
		return { text: data.text, confidence: data.confidence };
	}
}
