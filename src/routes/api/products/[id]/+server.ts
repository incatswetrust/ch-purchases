import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { products } from '$lib/server/schema';
import { requireUser } from '$lib/server/session';
import { parseJson } from '$lib/server/utils';
import { idParamSchema, normalizeProductName, productUpdateSchema } from '$lib/server/validation';
import { json } from '@sveltejs/kit';

export async function PATCH(event) {
	requireUser(event);
	const { id } = idParamSchema.parse(event.params);
	const payload = await parseJson(event, productUpdateSchema);
	const [updated] = await db
		.update(products)
		.set({
			name: payload.name.trim(),
			normalizedName: normalizeProductName(payload.name)
		})
		.where(eq(products.id, id))
		.returning();
	if (!updated) {
		return json({ error: { code: 'NOT_FOUND', message: 'Product not found' } }, { status: 404 });
	}
	return json({ data: updated });
}

export async function DELETE(event) {
	requireUser(event);
	const { id } = idParamSchema.parse(event.params);
	const [deleted] = await db.delete(products).where(eq(products.id, id)).returning();
	if (!deleted) {
		return json({ error: { code: 'NOT_FOUND', message: 'Product not found' } }, { status: 404 });
	}
	return json({ ok: true });
}
