import { error, json, type RequestEvent } from '@sveltejs/kit';
import { ZodError, type z } from 'zod';

export type ApiErrorCode =
	| 'BAD_REQUEST'
	| 'UNAUTHORIZED'
	| 'FORBIDDEN'
	| 'NOT_FOUND'
	| 'CONFLICT'
	| 'INTERNAL_ERROR';

export function apiError(
	status: number,
	code: ApiErrorCode,
	message: string,
	details?: unknown
): Response {
	return json({ error: { code, message, details } }, { status });
}

export async function parseJson<T extends z.ZodTypeAny>(
	event: RequestEvent,
	schema: T
): Promise<z.infer<T>> {
	const payload = await event.request.json().catch(() => {
		throw error(400, 'Invalid JSON payload');
	});

	try {
		return schema.parse(payload);
	} catch (err) {
		if (err instanceof ZodError) {
			throw error(400, `Validation error: ${JSON.stringify(err.issues)}`);
		}
		throw err;
	}
}

export function parseQuery<T extends z.ZodTypeAny>(
	event: RequestEvent,
	schema: T
): z.infer<T> {
	const query = Object.fromEntries(event.url.searchParams.entries());
	try {
		return schema.parse(query);
	} catch (err) {
		if (err instanceof ZodError) {
			throw error(400, `Validation error: ${JSON.stringify(err.issues)}`);
		}
		throw err;
	}
}
