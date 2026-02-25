<script lang="ts">
	import Button from '$lib/components/Button.svelte';

	type ItemDraft = {
		rawName: string;
		productId: string | null;
		quantity: number | null;
		unit: string | null;
		suggestions: Array<{ id: string; name: string }>;
	};

	let title = $state('Weekly shopping');
	let listId = $state('');
	let items: ItemDraft[] = $state([
		{ rawName: '', productId: null, quantity: null, unit: null, suggestions: [] }
	]);
	let optimize = $state<{ stores: any[]; unknown: any[]; newItems: any[] } | null>(null);

	async function autocomplete(index: number) {
		const term = items[index].rawName.trim();
		if (!term) {
			items[index].suggestions = [];
			return;
		}
		const response = await fetch(`/api/products?query=${encodeURIComponent(term)}`);
		const result = await response.json();
		items[index].suggestions = (result.data ?? []).map((p: any) => ({ id: p.id, name: p.name }));
	}

	function pickSuggestion(index: number, suggestion: { id: string; name: string }) {
		items[index].rawName = suggestion.name;
		items[index].productId = suggestion.id;
		items[index].suggestions = [];
	}

	function addItem() {
		items = [...items, { rawName: '', productId: null, quantity: null, unit: null, suggestions: [] }];
	}

	async function saveList() {
		const response = await fetch('/api/lists', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				title,
				items: items
					.filter((item) => item.rawName.trim())
					.map((item) => ({
						productId: item.productId,
						rawName: item.rawName,
						quantity: item.quantity,
						unit: item.unit
					}))
			})
		});
		const result = await response.json();
		listId = result.data.id;
	}

	async function optimizeList() {
		if (!listId) return;
		const response = await fetch(`/api/lists/${listId}/optimize`);
		const result = await response.json();
		optimize = result.data;
	}
</script>

<section class="stack">
	<h1>Shopping List</h1>
	<div class="card stack">
		<label class="field">
			<span>Title</span>
			<input bind:value={title} />
		</label>
		{#each items as item, index}
			<div class="card stack item-row">
				<label class="field">
					<span>Item</span>
					<input bind:value={item.rawName} oninput={() => autocomplete(index)} />
				</label>
				{#if item.suggestions.length}
					<div class="suggestions">
						{#each item.suggestions as suggestion}
							<button type="button" onclick={() => pickSuggestion(index, suggestion)}>{suggestion.name}</button>
						{/each}
					</div>
				{/if}
				<div class="row">
					<label class="field">
						<span>Qty</span>
						<input type="number" min="0" step="0.001" bind:value={item.quantity} />
					</label>
					<label class="field">
						<span>Unit</span>
						<input bind:value={item.unit} />
					</label>
				</div>
			</div>
		{/each}
		<div class="row">
			<Button variant="accent" onclick={addItem}>Add item</Button>
			<Button onclick={saveList}>Save list</Button>
			<Button variant="secondary" onclick={optimizeList} disabled={!listId}>Optimize shopping</Button>
		</div>
	</div>

	{#if optimize}
		<div class="card stack">
			<h2>Optimized by store</h2>
			{#each optimize.stores as store}
				<div class="card stack">
					<h3>{store.storeName}</h3>
					{#each store.items as item}
						<p>{item.name}</p>
					{/each}
				</div>
			{/each}

			{#if optimize.unknown.length}
				<div class="card stack">
					<h3>Unknown price</h3>
					{#each optimize.unknown as item}
						<p>{item.name}</p>
					{/each}
				</div>
			{/if}

			{#if optimize.newItems.length}
				<div class="card stack">
					<h3>New items</h3>
					{#each optimize.newItems as item}
						<p>{item.name}</p>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</section>

<style>
	.item-row {
		padding: 0.8rem;
	}
	.suggestions {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.suggestions button {
		text-align: left;
		border: 1px solid #bfc6c4;
		background: #fff;
		border-radius: 8px;
		padding: 0.45rem 0.55rem;
	}
</style>
