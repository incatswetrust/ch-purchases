import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { stores } from '$lib/server/schema';
import { requireUser } from '$lib/server/session';
import { parseJson } from '$lib/server/utils';
import { idParamSchema, storeUpdateSchema } from '$lib/server/validation';
import { json } from '@sveltejs/kit';

export async function PATCH(event) {
	requireUser(event);
	const { id } = idParamSchema.parse(event.params);
	const payload = await parseJson(event, storeUpdateSchema);
	try {
		const [updated] = await db
			.update(stores)
			.set({ name: payload.name })
			.where(eq(stores.id, id))
			.returning();
		if (!updated) {
			return json({ error: { code: 'NOT_FOUND', message: 'Store not found' } }, { status: 404 });
		}
		return json({ data: updated });
	} catch {
		return json(
			{ error: { code: 'CONFLICT', message: 'Store with this name already exists' } },
			{ status: 409 }
		);
	}
}

export async function DELETE(event) {
	requireUser(event);
	const { id } = idParamSchema.parse(event.params);
	const [deleted] = await db.delete(stores).where(eq(stores.id, id)).returning();
	if (!deleted) {
		return json({ error: { code: 'NOT_FOUND', message: 'Store not found' } }, { status: 404 });
	}
	return json({ ok: true });
}
