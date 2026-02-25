<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import Button from '$lib/components/Button.svelte';

	let { children, data } = $props();

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/';
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
	<header>
		<a href="/">Family Expense Tracker</a>
		<nav>
			{#if data.user}
				<a href="/dashboard">Dashboard</a>
				<a href="/analytics">Analytics</a>
				<Button variant="secondary" onclick={logout}>Logout</Button>
			{:else}
				<a href="/login">Login</a>
			{/if}
		</nav>
	</header>
	<main>{@render children()}</main>
</div>

<style>
	.app-shell {
		min-height: 100vh;
		background: #f8fafc;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.85rem 1rem;
		border-bottom: 1px solid #e2e8f0;
		background: #fff;
	}
	header > a {
		font-weight: 700;
		color: #0f172a;
		text-decoration: none;
	}
	nav {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	nav a {
		color: #1d4ed8;
		text-decoration: none;
	}
	main {
		max-width: 1100px;
		margin: 0 auto;
		padding: 1rem;
	}
</style>
