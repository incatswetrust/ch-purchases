export interface OcrResult {
	text: string;
	confidence: number; // 0–100
}

export interface OcrService {
	recognize(imageBuffer: Buffer): Promise<OcrResult>;
}
