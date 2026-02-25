<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Select from '$lib/components/Select.svelte';

	let stores: Array<{ id: string; name: string }> = $state([]);
	let storeId = $state('');
	let purchasedAt = $state(new Date().toISOString().slice(0, 16));
	let note = $state('');
	let errorMessage = $state('');

	async function loadStores() {
		const response = await fetch('/api/stores');
		const result = await response.json();
		stores = result.data ?? [];
	}

	async function createReceipt() {
		errorMessage = '';
		const response = await fetch('/api/receipts', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				storeId,
				purchasedAt: new Date(purchasedAt).toISOString(),
				note: note || null
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
</script>

<section class="stack">
	<h1>New receipt</h1>
	<div class="card stack">
		<Select id="store" label="Store" bind:value={storeId} options={stores.map((s) => ({ value: s.id, label: s.name }))} />
		<label class="field">
			<span>Purchased at</span>
			<input type="datetime-local" bind:value={purchasedAt} />
		</label>
		<label class="field">
			<span>Note</span>
			<textarea bind:value={note} rows="3"></textarea>
		</label>
		{#if errorMessage}<p class="error">{errorMessage}</p>{/if}
		<Button onclick={createReceipt}>Create</Button>
	</div>
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
