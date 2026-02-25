import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { shoppingListItems, shoppingLists } from '$lib/server/schema';
import { requireUser } from '$lib/server/session';
import { idParamSchema } from '$lib/server/validation';
import { json } from '@sveltejs/kit';

export async function GET(event) {
	requireUser(event);
	const { id } = idParamSchema.parse(event.params);
	const list = await db.query.shoppingLists.findFirst({ where: eq(shoppingLists.id, id) });
	if (!list) {
		return json({ error: { code: 'NOT_FOUND', message: 'List not found' } }, { status: 404 });
	}
	const items = await db.query.shoppingListItems.findMany({
		where: eq(shoppingListItems.listId, id)
	});
	return json({ data: { list, items } });
}
