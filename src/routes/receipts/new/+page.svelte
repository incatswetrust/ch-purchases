<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Select from '$lib/components/Select.svelte';
	import Input from '$lib/components/Input.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import BottomBar from '$lib/components/BottomBar.svelte';

	let stores: Array<{ id: string; name: string }> = $state([]);
	let products: Array<{ id: string; name: string }> = $state([]);
	let storeId = $state('');
	let storeName = $state('');
	let purchasedAt = $state(new Date().toISOString().slice(0, 16));
	let note = $state('');
	let items = $state([
		{ productName: '', quantity: 1, unit: 'pcs', totalPrice: 0, categoryId: '', categoryName: '' }
	]);
	let errorMessage = $state('');
	let showItemsEditor = $state(false);
	let categorySuggestionsByIndex = $state<Record<number, Array<{ id: string; name: string }>>>({});

	async function loadStores() {
		const [storesRes, productsRes] = await Promise.all([fetch('/api/stores'), fetch('/api/products')]);
		stores = (await storesRes.json()).data ?? [];
		products = (await productsRes.json()).data ?? [];
	}

	async function createReceipt() {
		errorMessage = '';
		const response = await fetch('/api/receipts', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				storeId: storeId || undefined,
				storeName: storeId ? undefined : storeName || undefined,
				purchasedAt: new Date(purchasedAt).toISOString(),
				note: note || null,
				items: items
					.filter((item) => item.productName.trim())
					.map((item) => ({
						productName: item.productName,
						quantity: Number(item.quantity),
						unit: item.unit || null,
						totalPrice: Number(item.totalPrice),
						categoryId: item.categoryId || undefined,
						categoryName: item.categoryId ? undefined : item.categoryName || undefined
					}))
			})
		});
		const result = await response.json();
		if (!response.ok) {
			errorMessage = result.error?.message ?? 'Failed to create receipt';
			return;
		}
		window.location.href = `/receipts/${result.data.id}`;
	}

	$effect.pre(() => {
		loadStores();
	});

	function addRow() {
		items = [
			...items,
			{ productName: '', quantity: 1, unit: 'pcs', totalPrice: 0, categoryId: '', categoryName: '' }
		];
	}

	async function searchCategories(term: string, index: number) {
		if (!term.trim()) {
			categorySuggestionsByIndex[index] = [];
			return;
		}
		const response = await fetch(`/api/categories?query=${encodeURIComponent(term)}`);
		const result = await response.json();
		categorySuggestionsByIndex[index] = result.data ?? [];
	}
</script>

<section class="stack">
	<TopBar title="New receipt" backHref="/dashboard" />
	<div class="card stack">
		<Select id="store" label="Existing store" bind:value={storeId} options={stores.map((s) => ({ value: s.id, label: s.name }))} />
		<Input id="store-name" label="Or type new store" bind:value={storeName} />
		<label class="field">
			<span>Purchased at</span>
			<input type="datetime-local" bind:value={purchasedAt} />
		</label>
		<label class="field">
			<span>Note</span>
			<textarea bind:value={note} rows="3"></textarea>
		</label>
		{#if errorMessage}<p class="error">{errorMessage}</p>{/if}
		<button class="btn btnGhost" type="button" onclick={() => (showItemsEditor = !showItemsEditor)}>
			{showItemsEditor ? 'Hide items' : 'Add items'}
		</button>
		<div class="stack" class:hidden={!showItemsEditor}>
			<h3>Items</h3>
			{#each items as item, idx}
				<div class="card stack">
					<label class="field">
						<span>Product</span>
						<input type="text" bind:value={item.productName} list="products" />
						<datalist id="products">
							{#each products as product}
								<option value={product.name}></option>
							{/each}
						</datalist>
					</label>
					<label class="field">
						<span>Quantity</span>
						<input type="number" min="0.001" step="0.001" bind:value={item.quantity} />
					</label>
					<label class="field">
						<span>Unit</span>
						<input type="text" bind:value={item.unit} />
					</label>
					<label class="field">
						<span>Category</span>
						<input
							type="text"
							bind:value={item.categoryName}
							oninput={() => searchCategories(item.categoryName, idx)}
							required
						/>
					</label>
					{#if categorySuggestionsByIndex[idx]?.length}
						<div class="suggestions">
							{#each categorySuggestionsByIndex[idx] as suggestion}
								<button
									type="button"
									onclick={() => {
										item.categoryId = suggestion.id;
										item.categoryName = suggestion.name;
										categorySuggestionsByIndex[idx] = [];
									}}
								>
									{suggestion.name}
								</button>
							{/each}
						</div>
					{/if}
					<label class="field">
						<span>Total price</span>
						<input type="number" min="0" step="0.01" bind:value={item.totalPrice} />
					</label>
				</div>
			{/each}
		</div>
	</div>
	<BottomBar>
		<Button variant="accent" onclick={addRow}>Add item</Button>
		<Button onclick={createReceipt}>Create receipt</Button>
	</BottomBar>
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
</style>
