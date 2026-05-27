import { json } from '@sveltejs/kit';
import type { Config } from '@sveltejs/adapter-vercel';
import { requireUser } from '$lib/server/session';
import { getOcrService } from '$lib/server/ocr/index.js';
import { preprocessReceiptImage } from '$lib/server/ocr/preprocess.js';
import { parseReceiptText } from '$lib/server/receipt-parser/index.js';

// Fluid Compute + extended timeout for OCR (Node.js runtime required — not Edge).
export const config: Config = {
	runtime: 'nodejs22.x',
	maxDuration: 300
};

// Max 8 MB raw upload (client compresses before sending, so real-world is <4 MB).
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(event) {
	requireUser(event);

	const contentLength = Number(event.request.headers.get('content-length') ?? 0);
	if (contentLength > MAX_BYTES) {
		return json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Image too large (max 8 MB)' } }, { status: 413 });
	}

	let formData: FormData;
	try {
		formData = await event.request.formData();
	} catch {
		return json({ error: { code: 'BAD_REQUEST', message: 'Expected multipart/form-data' } }, { status: 400 });
	}

	const file = formData.get('image');
	if (!(file instanceof File)) {
		return json({ error: { code: 'BAD_REQUEST', message: 'Missing "image" field' } }, { status: 400 });
	}

	const rawBuffer = Buffer.from(await file.arrayBuffer());

	// --- QR path (optional, for future use when Romanian receipts carry QR codes) ---
	const qrResult = await tryReadQr(rawBuffer);
	if (qrResult) {
		// QR data from Romanian ANAF format could be parsed here in the future.
		// For now, fall through to OCR so the receipt items are still extracted.
	}

	// --- OCR path ---
	let preprocessed: Buffer;
	try {
		preprocessed = await preprocessReceiptImage(rawBuffer);
	} catch (err) {
		console.error('Image preprocessing failed:', err);
		return json({ error: { code: 'PREPROCESS_ERROR', message: 'Failed to process image' } }, { status: 422 });
	}

	let ocrText: string;
	let ocrConfidence: number;
	try {
		const ocr = await getOcrService();
		const result = await ocr.recognize(preprocessed);
		ocrText = result.text;
		ocrConfidence = result.confidence;
	} catch (err) {
		console.error('OCR failed:', err);
		return json({ error: { code: 'OCR_ERROR', message: 'Text recognition failed' } }, { status: 502 });
	}

	const draft = parseReceiptText(ocrText, ocrConfidence);

	return json({ data: draft });
}

async function tryReadQr(imageBuffer: Buffer): Promise<string | null> {
	try {
		const sharp = (await import('sharp')).default;
		const { data, info } = await sharp(imageBuffer)
			.greyscale()
			.raw()
			.toBuffer({ resolveWithObject: true });

		const jsQR = (await import('jsqr')).default;
		const code = jsQR(new Uint8ClampedArray(data), info.width, info.height);
		return code?.data ?? null;
	} catch {
		return null;
	}
}
