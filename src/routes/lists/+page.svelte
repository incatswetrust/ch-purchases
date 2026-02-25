<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import BottomBar from '$lib/components/BottomBar.svelte';

	type ItemDraft = {
		rawName: string;
		productId: string | null;
		quantity: number | null;
		unit: string | null;
		suggestions: Array<{ id: string; name: string }>;
	};

	let title = $state('Weekly shopping');
	let items: ItemDraft[] = $state([
		{ rawName: '', productId: null, quantity: null, unit: null, suggestions: [] }
	]);
	let messagePreview = $state('');
	let deliveryResults = $state<Array<{ telegramId: string; ok: boolean; error?: string }>>([]);
	let sending = $state(false);

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

	async function sendToTelegram() {
		sending = true;
		const response = await fetch('/api/shopping/send', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				items: items
					.filter((item) => item.rawName.trim())
					.map((item) => ({
						rawName: item.rawName,
						productId: item.productId,
						quantity: item.quantity,
						unit: item.unit
					}))
			})
		});
		const result = await response.json();
		sending = false;
		messagePreview = result.message ?? '';
		deliveryResults = result.deliveries ?? [];
	}
</script>

<section class="stack">
	<TopBar title="Shopping List" />
	<div class="card stack">
		<p class="badge">{title}</p>
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
	</div>
	<BottomBar>
		<Button variant="accent" onclick={addItem}>Add item</Button>
		<Button variant="accent" onclick={sendToTelegram} disabled={sending}>
			{sending ? 'Sending...' : 'Send to Telegram'}
		</Button>
	</BottomBar>

	{#if messagePreview}
		<div class="card stack">
			<h2>Telegram message preview</h2>
			<pre>{messagePreview}</pre>
			<h3>Deliveries</h3>
			{#each deliveryResults as result}
				<p>
					{result.telegramId}: {result.ok ? 'ok' : `failed (${result.error ?? 'unknown'})`}
				</p>
			{/each}
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
	pre {
		white-space: pre-wrap;
		background: #fff;
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 0.65rem;
	}
</style>
