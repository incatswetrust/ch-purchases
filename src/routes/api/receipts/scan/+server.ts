import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import type { Config } from '@sveltejs/adapter-vercel';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import type { protos } from '@google-cloud/documentai';
import { requireUser } from '$lib/server/session';

export const config: Config = {
	runtime: 'nodejs20.x',
	maxDuration: 30,
	memory: 512
};

const MAX_BYTES = 4 * 1024 * 1024;

type DocEntity = protos.google.cloud.documentai.v1.Document.IEntity;

// Module-level singleton — reused across warm invocations.
let _client: DocumentProcessorServiceClient | null = null;

function getClient(): DocumentProcessorServiceClient {
	if (_client) return _client;

	const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
	if (!raw) throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON is not set');

	const credentials = JSON.parse(raw) as object;
	const location = process.env.DOCAI_LOCATION ?? 'eu';

	_client = new DocumentProcessorServiceClient({
		credentials,
		apiEndpoint: `${location}-documentai.googleapis.com`
	});
	return _client;
}

function processorName(): string {
	const project = process.env.GCP_PROJECT_ID;
	const location = process.env.DOCAI_LOCATION;
	const processor = process.env.DOCAI_PROCESSOR_ID;
	if (!project || !location || !processor) {
		throw new Error('GCP_PROJECT_ID / DOCAI_LOCATION / DOCAI_PROCESSOR_ID are not set');
	}
	return `projects/${project}/locations/${location}/processors/${processor}`;
}

// Parse money from a Document AI entity.
// Prefers normalizedValue.moneyValue (structured), falls back to mentionText.
function parseMoney(entity: DocEntity): number | null {
	const mv = entity.normalizedValue?.moneyValue;
	if (mv) {
		const units = Number(mv.units ?? 0);
		const nanos = Number(mv.nanos ?? 0);
		const value = units + nanos / 1e9;
		if (!isNaN(value) && value >= 0) return Math.round(value * 100) / 100;
	}
	if (entity.mentionText) {
		// Romanian receipts use comma as decimal separator
		const cleaned = entity.mentionText.trim().replace(',', '.').replace(/[^\d.]/g, '');
		const n = parseFloat(cleaned);
		if (!isNaN(n) && n >= 0) return Math.round(n * 100) / 100;
	}
	return null;
}

export async function POST(event: RequestEvent) {
	requireUser(event);

	const contentLength = Number(event.request.headers.get('content-length') ?? 0);
	if (contentLength > MAX_BYTES) {
		return json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Image too large (max 4 MB)' } }, { status: 413 });
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

	const imageBytes = Buffer.from(await file.arrayBuffer()).toString('base64');

	let client: DocumentProcessorServiceClient;
	let name: string;
	try {
		client = getClient();
		name = processorName();
	} catch (err) {
		console.error('Document AI config error:', (err as Error).message);
		return json({ error: { code: 'CONFIG_ERROR', message: 'OCR service is not configured' } }, { status: 500 });
	}

	let entities: DocEntity[];
	try {
		const [result] = await client.processDocument({
			name,
			rawDocument: { content: imageBytes, mimeType: 'image/jpeg' }
		});
		entities = result.document?.entities ?? [];
	} catch (err) {
		console.error('Document AI request failed:', (err as Error).message);
		return json({ error: { code: 'DOCAI_ERROR', message: 'Receipt processing failed' } }, { status: 502 });
	}

	// ── Store ──────────────────────────────────────────────────────────────────
	const supplierEntity = entities.find((e) => e.type === 'supplier_name');
	const storeConfidence = supplierEntity?.confidence ?? 0;
	const storeName = storeConfidence >= 0.5 ? (supplierEntity?.mentionText?.trim() ?? null) : null;

	// ── Total ──────────────────────────────────────────────────────────────────
	const totalEntity = entities.find((e) => e.type === 'total_amount');
	const total = totalEntity ? parseMoney(totalEntity) : null;

	// ── Line items ─────────────────────────────────────────────────────────────
	const items = entities
		.filter((e) => e.type === 'line_item')
		.map((lineItem) => {
			const props: DocEntity[] = lineItem.properties ?? [];

			const descProp = props.find((p) => p.type === 'line_item/description');
			const amountProp = props.find((p) => p.type === 'line_item/amount');
			const qtyProp = props.find((p) => p.type === 'line_item/quantity');
			const unitProp = props.find((p) => p.type === 'line_item/unit_of_measure');

			const name = descProp?.mentionText?.trim() ?? '';
			const price = amountProp ? (parseMoney(amountProp) ?? 0) : 0;
			const quantity = qtyProp?.mentionText
				? parseFloat(qtyProp.mentionText.replace(',', '.')) || 1
				: 1;
			const unit = unitProp?.mentionText?.trim() ?? null;

			// Confidence: minimum across the key sub-fields, or the line_item entity itself.
			const confValues = [lineItem.confidence, descProp?.confidence, amountProp?.confidence]
				.filter((c): c is number => typeof c === 'number');
			const confidence = confValues.length > 0 ? Math.min(...confValues) : 0;

			return { name, price, quantity, unit, confidence };
		});

	return json({
		data: {
			store: { name: storeName, confidence: storeConfidence },
			items,
			total
		}
	});
}
