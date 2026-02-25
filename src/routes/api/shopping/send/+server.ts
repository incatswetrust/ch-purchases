import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { env } from '$lib/server/env';
import { products, storeProductPrices, stores } from '$lib/server/schema';
import { requireUser } from '$lib/server/session';
import { parseJson } from '$lib/server/utils';
import { shoppingSendSchema } from '$lib/server/validation';
import { json } from '@sveltejs/kit';

function escapeHtml(input: string): string {
	return input
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function qtyText(item: { quantity?: number | null; unit?: string | null }): string {
	if (!item.quantity) return '';
	return ` (${item.quantity}${item.unit ? ` ${item.unit}` : ''})`;
}

export async function POST(event) {
	requireUser(event);
	const payload = await parseJson(event, shoppingSendSchema);

	const groupedStores = new Map<string, { storeId: string; storeName: string; items: string[] }>();
	const unknown: string[] = [];

	for (const item of payload.items) {
		let resolvedProductId = item.productId ?? null;
		if (!resolvedProductId) {
			const product = await db.query.products.findFirst({
				where: eq(products.normalizedName, item.rawName.trim().toLowerCase())
			});
			resolvedProductId = product?.id ?? null;
		}

		if (!resolvedProductId) {
			unknown.push(`${item.rawName}${qtyText(item)}`);
			continue;
		}

		const priceRows = await db
			.select({
				storeId: storeProductPrices.storeId,
				storeName: stores.name,
				price: storeProductPrices.lastUnitPrice
			})
			.from(storeProductPrices)
			.innerJoin(stores, eq(stores.id, storeProductPrices.storeId))
			.where(eq(storeProductPrices.productId, resolvedProductId))
			.orderBy(asc(storeProductPrices.lastUnitPrice));

		if (priceRows.length === 0) {
			unknown.push(`${item.rawName}${qtyText(item)}`);
			continue;
		}

		const cheapest = priceRows[0];
		const bucket = groupedStores.get(cheapest.storeId) ?? {
			storeId: cheapest.storeId,
			storeName: cheapest.storeName,
			items: []
		};
		bucket.items.push(`${item.rawName}${qtyText(item)} — price ${cheapest.price}`);
		groupedStores.set(cheapest.storeId, bucket);
	}

	let message = `<b>Shopping list</b>\n\n`;
	for (const storeGroup of groupedStores.values()) {
		message += `<b>Store: ${escapeHtml(storeGroup.storeName)}</b>\n`;
		for (const line of storeGroup.items) {
			message += `- ${escapeHtml(line)}\n`;
		}
		message += '\n';
	}
	if (unknown.length > 0) {
		message += `<b>Unknown / New items</b>\n`;
		for (const line of unknown) {
			message += `- ${escapeHtml(line)}\n`;
		}
	}

	const deliveries: Array<{ telegramId: string; ok: boolean; error?: string }> = [];
	for (const telegramId of env.ALLOWED_TELEGRAM_IDS) {
		const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				chat_id: telegramId.toString(),
				text: message,
				parse_mode: 'HTML'
			})
		});
		if (!response.ok) {
			deliveries.push({
				telegramId: telegramId.toString(),
				ok: false,
				error: `HTTP ${response.status}`
			});
		} else {
			deliveries.push({ telegramId: telegramId.toString(), ok: true });
		}
	}

	return json({ ok: true, message, deliveries });
}
