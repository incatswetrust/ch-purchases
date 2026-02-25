<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Select from '$lib/components/Select.svelte';
	import Table from '$lib/components/Table.svelte';
	import Input from '$lib/components/Input.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import BottomBar from '$lib/components/BottomBar.svelte';

	let { params } = $props();
	let receipt: any = $state(null);
	let items: any[] = $state([]);
	let stores: any[] = $state([]);
	let products: any[] = $state([]);
	let categories: any[] = $state([]);

	let storeId = $state('');
	let newStoreName = $state('');
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
	let showAddItem = $state(false);
	let categoryQuery = $state('');
	let categorySuggestions: Array<{ id: string; name: string }> = $state([]);
	let editCategoryName = $state('');
	let editCategoryQuery = $state('');
	let editCategorySuggestions: Array<{ id: string; name: string }> = $state([]);

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
		let resolvedStoreId = storeId;
		if (newStoreName.trim()) {
			const created = await fetch('/api/stores', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name: newStoreName.trim() })
			}).then((res) => res.json());
			resolvedStoreId = created.data.id;
		}
		await fetch(`/api/receipts/${params.id}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				storeId: resolvedStoreId,
				purchasedAt: new Date(purchasedAt).toISOString(),
				note: note || null
			})
		});
		newStoreName = '';
		await loadAll();
	}

	async function addItem() {
		errorMessage = '';
		if (!newCategoryId && !categoryQuery.trim()) {
			errorMessage = 'Category is required';
			return;
		}
		const response = await fetch(`/api/receipts/${params.id}/items`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				productId: newProductId || (products[0]?.id ?? ''),
				productName: newProductName || undefined,
				categoryId: newCategoryId || null,
				categoryName: newCategoryId ? undefined : categoryQuery || undefined,
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
		categoryQuery = '';
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
		editCategoryName = item.categoryId ? categoryName(item.categoryId) : '';
		editQty = Number(item.quantity);
		editUnit = item.unit ?? '';
		editTotalPrice = Number(item.totalPrice);
	}

	async function saveEdit() {
		if (!editCategoryId && !editCategoryName.trim()) {
			errorMessage = 'Category is required';
			return;
		}
		await fetch(`/api/receipt-items/${editItemId}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				productId: editProductId,
				categoryId: editCategoryId || null,
				categoryName: editCategoryId ? undefined : editCategoryName || undefined,
				quantity: Number(editQty),
				unit: editUnit || null,
				totalPrice: Number(editTotalPrice)
			})
		});
		editItemId = '';
		await loadAll();
	}

	async function searchCategories(term: string, edit = false) {
		if (!term.trim()) {
			if (edit) editCategorySuggestions = [];
			else categorySuggestions = [];
			return;
		}
		const response = await fetch(`/api/categories?query=${encodeURIComponent(term)}`);
		const result = await response.json();
		if (edit) editCategorySuggestions = result.data ?? [];
		else categorySuggestions = result.data ?? [];
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
	<TopBar title="Receipt" backHref="/dashboard" />
	{#if receipt}
		<div class="card stack">
			<h2>Receipt details</h2>
			<Select id="store" label="Store" bind:value={storeId} options={stores.map((s) => ({ value: s.id, label: s.name }))} />
			<Input id="new-store" label="Or type new store" bind:value={newStoreName} />
			<label class="field">
				<span>Purchased at</span>
				<input type="datetime-local" bind:value={purchasedAt} />
			</label>
			<label class="field">
				<span>Note</span>
				<textarea bind:value={note} rows="3"></textarea>
			</label>
			<div class="row">
				<Button variant="danger" onclick={deleteReceipt}>Delete receipt</Button>
			</div>
		</div>

		<div class="card stack">
			<div class="row" style="justify-content: space-between; align-items: center;">
				<h2>Add item</h2>
				<Button variant="accent" onclick={() => (showAddItem = !showAddItem)}>
					{showAddItem ? 'Close' : 'Add item'}
				</Button>
			</div>
			<div class:hidden={!showAddItem} class="stack">
			<Select id="product" label="Existing product" bind:value={newProductId} options={products.map((p) => ({ value: p.id, label: p.name }))} />
			<Input id="new-product" label="Or create product name" bind:value={newProductName} />
			<Select id="category" label="Category" bind:value={newCategoryId} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
			<label class="field">
				<span>Or type new category</span>
				<input
					type="text"
					bind:value={categoryQuery}
					oninput={() => searchCategories(categoryQuery)}
					placeholder="Type category name"
				/>
			</label>
			{#if categorySuggestions.length}
				<div class="suggestions">
					{#each categorySuggestions as suggestion}
						<button
							type="button"
							onclick={() => {
								newCategoryId = suggestion.id;
								categoryQuery = suggestion.name;
								categorySuggestions = [];
							}}
						>
							{suggestion.name}
						</button>
					{/each}
				</div>
			{/if}
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
		</div>

		<div class="desktop-table">
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
		</div>
		<div class="mobile-items stack">
			{#each items as item}
				<div class="card stack">
					<div class="row" style="justify-content: space-between; align-items: center;">
						<strong>{productName(item.productId)}</strong>
						<span class="badge">{Number(item.totalPrice).toFixed(2)}</span>
					</div>
					<p class="muted">
						{Number(item.quantity)} {item.unit ?? ''} · unit {Number(item.unitPrice).toFixed(4)}
					</p>
					<div class="row">
						<Button variant="secondary" onclick={() => startEdit(item)}>Edit</Button>
						<Button variant="danger" onclick={() => deleteItem(item.id)}>Delete</Button>
					</div>
				</div>
			{/each}
		</div>

		{#if editItemId}
			<div class="card stack">
				<h2>Edit item</h2>
				<Select id="edit-product" label="Product" bind:value={editProductId} options={products.map((p) => ({ value: p.id, label: p.name }))} />
				<Select id="edit-category" label="Category" bind:value={editCategoryId} options={categories.map((c) => ({ value: c.id, label: c.name }))} />
				<label class="field">
					<span>Or type new category</span>
					<input
						type="text"
						bind:value={editCategoryName}
						oninput={() => searchCategories(editCategoryName, true)}
						placeholder="Type category name"
					/>
				</label>
				{#if editCategorySuggestions.length}
					<div class="suggestions">
						{#each editCategorySuggestions as suggestion}
							<button
								type="button"
								onclick={() => {
									editCategoryId = suggestion.id;
									editCategoryName = suggestion.name;
									editCategorySuggestions = [];
								}}
							>
								{suggestion.name}
							</button>
						{/each}
					</div>
				{/if}
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
		<BottomBar>
			<Button onclick={saveReceipt}>Save receipt</Button>
		</BottomBar>
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
	.hidden {
		display: none;
	}
	.desktop-table {
		display: none;
	}
	.muted {
		color: var(--muted);
		font-size: 0.9rem;
	}
	.suggestions {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.suggestions button {
		text-align: left;
		border: 1px solid var(--border);
		background: #fff;
		border-radius: 8px;
		padding: 0.45rem 0.55rem;
	}
	@media (min-width: 768px) {
		.desktop-table {
			display: block;
		}
		.mobile-items {
			display: none;
		}
		.hidden {
			display: flex;
		}
	}
</style>
