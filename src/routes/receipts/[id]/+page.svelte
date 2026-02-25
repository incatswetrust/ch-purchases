<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Select from '$lib/components/Select.svelte';
	import Table from '$lib/components/Table.svelte';
	import Input from '$lib/components/Input.svelte';

	let { params } = $props();
	let receipt: any = $state(null);
	let items: any[] = $state([]);
	let stores: any[] = $state([]);
	let products: any[] = $state([]);
	let categories: any[] = $state([]);

	let storeId = $state('');
	let purchasedAt = $state('');
	let note = $state('');

	let newProductId = $state('');
	let newProductName = $state('');
	let newCategoryId = $state('');
	let newQty = $state(1);
	let newUnit = $state('pcs');
	let newTotalPrice = $state(0);
	let editItemId = $state('');
	let editProductId = $state('');
	let editCategoryId = $state('');
	let editQty = $state(1);
	let editUnit = $state('');
	let editTotalPrice = $state(0);
	let errorMessage = $state('');

	async function loadAll() {
		const [receiptRes, storesRes, productsRes, categoriesRes] = await Promise.all([
			fetch(`/api/receipts/${params.id}`),
			fetch('/api/stores'),
			fetch('/api/products'),
			fetch('/api/categories')
		]);

		const receiptResult = await receiptRes.json();
		if (receiptRes.ok) {
			receipt = receiptResult.data.receipt;
			items = receiptResult.data.items;
			products = receiptResult.data.products ?? [];
			categories = receiptResult.data.categories ?? [];
			storeId = receipt.storeId;
			purchasedAt = new Date(receipt.purchasedAt).toISOString().slice(0, 16);
			note = receipt.note ?? '';
		}
		stores = (await storesRes.json()).data ?? [];
		const fallbackProducts = (await productsRes.json()).data ?? [];
		const fallbackCategories = (await categoriesRes.json()).data ?? [];
		if (products.length === 0) products = fallbackProducts;
		if (categories.length === 0) categories = fallbackCategories;
	}

	async function saveReceipt() {
		await fetch(`/api/receipts/${params.id}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				storeId,
				purchasedAt: new Date(purchasedAt).toISOString(),
				note: note || null
			})
		});
		await loadAll();
	}

	async function addItem() {
		errorMessage = '';
		const response = await fetch(`/api/receipts/${params.id}/items`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				productId: newProductId || (products[0]?.id ?? ''),
				productName: newProductName || undefined,
				categoryId: newCategoryId || null,
				quantity: Number(newQty),
				unit: newUnit || null,
				totalPrice: Number(newTotalPrice)
			})
		});
		const result = await response.json();
		if (!response.ok) {
			errorMessage = result.error?.message ?? 'Failed to add item';
			return;
		}
		newProductId = '';
		newProductName = '';
		newCategoryId = '';
		newQty = 1;
		newUnit = 'pcs';
		newTotalPrice = 0;
		await loadAll();
	}

	async function deleteItem(id: string) {
		await fetch(`/api/receipt-items/${id}`, { method: 'DELETE' });
		await loadAll();
	}

	async function startEdit(item: any) {
		editItemId = item.id;
		editProductId = item.productId;
		editCategoryId = item.categoryId ?? '';
		editQty = Number(item.quantity);
		editUnit = item.unit ?? '';
		editTotalPrice = Number(item.totalPrice);
	}

	async function saveEdit() {
		await fetch(`/api/receipt-items/${editItemId}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				productId: editProductId,
				categoryId: editCategoryId || null,
				quantity: Number(editQty),
				unit: editUnit || null,
				totalPrice: Number(editTotalPrice)
			})
		});
		editItemId = '';
		await loadAll();
	}

	async function deleteReceipt() {
		await fetch(`/api/receipts/${params.id}`, { method: 'DELETE' });
		window.location.href = '/dashboard';
	}

	$effect.pre(() => {
		loadAll();
	});

	function productName(id: string) {
		return products.find((p) => p.id === id)?.name ?? id;
	}

	function categoryName(id: string | null) {
		if (!id) return '—';
		return categories.find((c) => c.id === id)?.name ?? id;
	}
</script>

<section class="stack">
	<h1>Receipt</h1>
	{#if receipt}
		<div class="card stack">
			<h2>Receipt details</h2>
			<Select id="store" label="Store" bind:value={storeId} options={stores.map((s) => ({ value: s.id, label: s.name }))} />
			<label class="field">
				<span>Purchased at</span>
				<input type="datetime-local" bind:value={purchasedAt} />
			</label>
			<label class="field">
				<span>Note</span>
				<textarea bind:value={note} rows="3"></textarea>
			</label>
			<div class="row">
				<Button onclick={saveReceipt}>Save receipt</Button>
				<Button variant="danger" onclick={deleteReceipt}>Delete receipt</Button>
			</div>
		</div>

		<div class="card stack">
			<h2>Add item</h2>
			<Select id="product" label="Existing product" bind:value={newProductId} options={products.map((p) => ({ value: p.id, label: p.name }))} />
			<Input id="new-product" label="Or create product name" bind:value={newProductName} />
			<Select id="category" label="Category" bind:value={newCategoryId} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
			<div class="row">
				<label class="field">
					<span>Quantity</span>
					<input type="number" min="0.001" step="0.001" bind:value={newQty} />
				</label>
				<Input id="unit" label="Unit" bind:value={newUnit} />
				<label class="field">
					<span>Total price</span>
					<input type="number" min="0" step="0.01" bind:value={newTotalPrice} />
				</label>
			</div>
			{#if errorMessage}<p class="error">{errorMessage}</p>{/if}
			<Button onclick={addItem}>Add item</Button>
		</div>

		<Table headers={['Product', 'Category', 'Qty', 'Unit', 'Total', 'Unit price', 'Actions']}>
			{#each items as item}
				<tr>
					<td>{productName(item.productId)}</td>
					<td>{categoryName(item.categoryId)}</td>
					<td>{Number(item.quantity)}</td>
					<td>{item.unit ?? '—'}</td>
					<td>{Number(item.totalPrice).toFixed(2)}</td>
					<td>{Number(item.unitPrice).toFixed(4)}</td>
					<td class="row">
						<Button variant="secondary" onclick={() => startEdit(item)}>Edit</Button>
						<Button variant="danger" onclick={() => deleteItem(item.id)}>Delete</Button>
					</td>
				</tr>
			{/each}
		</Table>

		{#if editItemId}
			<div class="card stack">
				<h2>Edit item</h2>
				<Select id="edit-product" label="Product" bind:value={editProductId} options={products.map((p) => ({ value: p.id, label: p.name }))} />
				<Select id="edit-category" label="Category" bind:value={editCategoryId} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
				<div class="row">
					<label class="field">
						<span>Quantity</span>
						<input type="number" min="0.001" step="0.001" bind:value={editQty} />
					</label>
					<Input id="edit-unit" label="Unit" bind:value={editUnit} />
					<label class="field">
						<span>Total price</span>
						<input type="number" min="0" step="0.01" bind:value={editTotalPrice} />
					</label>
				</div>
				<div class="row">
					<Button onclick={saveEdit}>Save item</Button>
					<Button variant="secondary" onclick={() => (editItemId = '')}>Cancel</Button>
				</div>
			</div>
		{/if}
	{/if}
</section>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	input,
	textarea {
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		padding: 0.5rem;
	}
	.error {
		color: #b91c1c;
	}
</style>
