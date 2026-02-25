import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { env, isAllowedTelegramUserId } from '$lib/server/env';
import { loginTokens } from '$lib/server/schema';
import { json } from '@sveltejs/kit';

type TelegramUpdate = {
	message?: {
		text?: string;
		chat?: { id: number };
		from?: { id: number };
	};
};

async function sendTelegramMessage(chatId: number, text: string) {
	await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ chat_id: chatId, text })
	});
}

export async function POST(event) {
	if (env.TELEGRAM_WEBHOOK_SECRET_TOKEN) {
		const header = event.request.headers.get('x-telegram-bot-api-secret-token');
		if (header !== env.TELEGRAM_WEBHOOK_SECRET_TOKEN) {
			return json({ ok: false }, { status: 401 });
		}
	}

	const update = (await event.request.json().catch(() => ({}))) as TelegramUpdate;
	const text = update.message?.text?.trim();
	const fromId = update.message?.from?.id;
	const chatId = update.message?.chat?.id;

	if (!text || !fromId || !chatId || !text.startsWith('/start login_')) {
		return json({ ok: true });
	}

	const token = text.replace('/start login_', '').trim();
	const record = await db.query.loginTokens.findFirst({ where: eq(loginTokens.token, token) });
	if (!record) {
		await sendTelegramMessage(chatId, 'Login token not found.');
		return json({ ok: true });
	}
	if (record.expiresAt < new Date() || record.status !== 'pending') {
		await sendTelegramMessage(chatId, 'Login token is expired or already used.');
		return json({ ok: true });
	}
	if (!isAllowedTelegramUserId(fromId)) {
		await sendTelegramMessage(chatId, 'You are not allowed to access this app.');
		return json({ ok: true });
	}

	await db
		.update(loginTokens)
		.set({
			status: 'approved',
			telegramId: BigInt(fromId)
		})
		.where(eq(loginTokens.token, token));

	await sendTelegramMessage(chatId, 'Authorization approved. Return to the website.');
	return json({ ok: true });
}
