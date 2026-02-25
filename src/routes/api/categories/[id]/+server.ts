import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { categories } from '$lib/server/schema';
import { requireUser } from '$lib/server/session';
import { parseJson } from '$lib/server/utils';
import { categoryUpdateSchema, idParamSchema } from '$lib/server/validation';
import { json } from '@sveltejs/kit';

export async function PATCH(event) {
	requireUser(event);
	const { id } = idParamSchema.parse(event.params);
	const payload = await parseJson(event, categoryUpdateSchema);
	const [updated] = await db
		.update(categories)
		.set({ name: payload.name })
		.where(eq(categories.id, id))
		.returning();
	if (!updated) {
		return json({ error: { code: 'NOT_FOUND', message: 'Category not found' } }, { status: 404 });
	}
	return json({ data: updated });
}

export async function DELETE(event) {
	requireUser(event);
	const { id } = idParamSchema.parse(event.params);
	const [deleted] = await db.delete(categories).where(eq(categories.id, id)).returning();
	if (!deleted) {
		return json({ error: { code: 'NOT_FOUND', message: 'Category not found' } }, { status: 404 });
	}
	return json({ ok: true });
}
