<script lang="ts">
	let { data } = $props();
</script>

<section class="stack">
	<h1>Family Expense Tracker</h1>
	<div class="card stack">
		{#if data.user}
			<p>You are logged in.</p>
			<a href="/dashboard">Open dashboard</a>
		{:else}
			<p>Track receipts, categories, stores, and item prices in one place.</p>
			<div class="row">
				<a href="/login">Login via Telegram</a>
			</div>
			<p class="hint">
				You can also open this app inside Telegram WebApp and authenticate using `initData`.
			</p>
		{/if}
	</div>
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	h1 {
		font-size: 1.6rem;
	}
	a {
		color: #1d4ed8;
	}
	.hint {
		color: #475569;
		font-size: 0.95rem;
	}
</style>
