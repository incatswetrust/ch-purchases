import { clearSession, requireUser } from '$lib/server/session';
import { json } from '@sveltejs/kit';

export async function POST(event) {
	requireUser(event);
	clearSession(event);
	return json({ ok: true });
}
