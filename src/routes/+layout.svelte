<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import Button from '$lib/components/Button.svelte';

	let { children, data } = $props();
	let isMenuOpen = $state(false);

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
		<a class="brand" href="/">Family Expense Tracker</a>
		<button class="menu-btn" type="button" onclick={() => (isMenuOpen = !isMenuOpen)}>Menu</button>
		<nav class:open={isMenuOpen}>
			{#if data.user}
				<a href="/dashboard">Dashboard</a>
				<a href="/analytics">Analytics</a>
				<a href="/lists">Shopping Lists</a>
				<Button variant="secondary" onclick={logout}>Logout</Button>
			{:else}
				<a href="/login">Login</a>
			{/if}
		</nav>
	</header>
	<main class="container">{@render children()}</main>
</div>

<style>
	.app-shell {
		min-height: 100vh;
		background: #e8e2d8;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.6rem 0.75rem;
		border-bottom: 1px solid var(--border);
		background: var(--surface);
		position: sticky;
		top: 0;
		z-index: 50;
	}
	.brand {
		font-weight: 700;
		color: var(--text);
		text-decoration: none;
		font-size: 0.95rem;
	}
	.menu-btn {
		border: 1px solid var(--border);
		background: var(--surface);
		border-radius: 10px;
		padding: 0.45rem 0.7rem;
	}
	nav {
		display: none;
		position: absolute;
		top: calc(100% + 4px);
		right: 0.6rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 0.6rem;
		box-shadow: var(--shadow);
		flex-direction: column;
		align-items: stretch;
		gap: 0.5rem;
		min-width: 180px;
	}
	nav.open {
		display: flex;
	}
	nav a {
		color: var(--primary);
		text-decoration: none;
		padding: 0.25rem 0;
	}
	main {
		padding-top: 0.9rem;
		padding-bottom: 1.25rem;
	}

	@media (min-width: 768px) {
		.menu-btn {
			display: none;
		}
		nav {
			display: flex;
			position: static;
			border: 0;
			padding: 0;
			box-shadow: none;
			flex-direction: row;
			align-items: center;
			min-width: auto;
		}
		.brand {
			font-size: 1rem;
		}
	}
</style>
