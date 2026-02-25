import { createSession } from '$lib/server/session';
import { parseJson } from '$lib/server/utils';
import { upsertTelegramUser, validateTelegramInitData } from '$lib/server/services/auth';
import { json } from '@sveltejs/kit';
import { z } from 'zod';

const schema = z.object({
	initData: z.string().min(1)
});

export async function POST(event) {
	try {
		const { initData } = await parseJson(event, schema);
		const { user } = validateTelegramInitData(initData);
		const upserted = await upsertTelegramUser(user);
		await createSession(event, upserted.telegramId);
		return json({ ok: true });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unauthorized';
		const status = message === 'Forbidden' ? 403 : 401;
		return json({ error: { code: status === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED', message } }, { status });
	}
}
