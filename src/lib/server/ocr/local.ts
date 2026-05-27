import type { OcrResult, OcrService } from './types.js';

// Lazy worker — created once per warm instance, terminated on error.
let workerPromise: Promise<import('tesseract.js').Worker> | null = null;

function getWorker() {
	if (!workerPromise) {
		workerPromise = (async () => {
			const { createWorker } = await import('tesseract.js');
			// /tmp is the only writable dir on Vercel; tessdata is cached across warm starts.
			const worker = await createWorker('ron', 1, {
				cachePath: '/tmp/tessdata',
				cacheMethod: 'write'
			});
			return worker;
		})().catch((err) => {
			workerPromise = null;
			throw err;
		});
	}
	return workerPromise;
}

export class LocalOcrService implements OcrService {
	async recognize(imageBuffer: Buffer): Promise<OcrResult> {
		const worker = await getWorker();
		const {
			data: { text, confidence }
		} = await worker.recognize(imageBuffer);
		return { text, confidence };
	}
}
