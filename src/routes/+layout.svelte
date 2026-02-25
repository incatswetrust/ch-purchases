<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import Button from '$lib/components/Button.svelte';
	import { onMount } from 'svelte';

	let { children, data } = $props();
	let isMenuOpen = $state(false);
	let menuRef: HTMLElement | undefined;

	afterNavigate(() => {
		isMenuOpen = false;
	});

	onMount(() => {
		const onDocClick = (event: MouseEvent) => {
			if (!isMenuOpen) return;
			const target = event.target as Node | null;
			if (!target) return;
			if (menuRef && !menuRef.contains(target)) {
				isMenuOpen = false;
			}
		};
		document.addEventListener('click', onDocClick);
		return () => {
			document.removeEventListener('click', onDocClick);
		};
	});

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
		<nav bind:this={menuRef} class:open={isMenuOpen}>
			{#if data.user}
				<a href="/dashboard" onclick={() => (isMenuOpen = false)}>Dashboard</a>
				<a href="/analytics" onclick={() => (isMenuOpen = false)}>Analytics</a>
				<a href="/lists" onclick={() => (isMenuOpen = false)}>Shopping Lists</a>
				<Button variant="secondary" onclick={logout}>Logout</Button>
			{:else}
				<a href="/login" onclick={() => (isMenuOpen = false)}>Login</a>
			{/if}
		</nav>
	</header>
	{#if isMenuOpen}
		<button
			type="button"
			class="menu-backdrop"
			aria-label="Close menu"
			onclick={() => (isMenuOpen = false)}
		></button>
	{/if}
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
	.menu-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.1);
		border: 0;
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
