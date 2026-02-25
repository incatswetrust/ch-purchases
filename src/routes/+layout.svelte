<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import Button from '$lib/components/Button.svelte';
	import { onMount } from 'svelte';

	let { children, data } = $props();
	let menuOpen = $state(false);
	let menuButtonEl: HTMLButtonElement | undefined;
	let menuPanelEl: HTMLElement | undefined;

	afterNavigate(() => {
		menuOpen = false;
	});

	onMount(() => {
		const onPointerDown = (event: PointerEvent) => {
			if (!menuOpen) return;
			const target = event.target as Node | null;
			if (!target) return;
			if (menuPanelEl?.contains(target)) return;
			if (menuButtonEl?.contains(target)) return;
			menuOpen = false;
		};
		document.addEventListener('pointerdown', onPointerDown, { capture: true });
		return () => {
			document.removeEventListener('pointerdown', onPointerDown, { capture: true });
		};
	});

	function toggleMenu(event: MouseEvent) {
		event.stopPropagation();
		menuOpen = !menuOpen;
	}

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
		<button
			bind:this={menuButtonEl}
			class="menu-btn"
			type="button"
			aria-expanded={menuOpen}
			aria-controls="mobile-menu"
			onclick={toggleMenu}
		>
			Menu
		</button>
		<nav id="mobile-menu" bind:this={menuPanelEl} class:open={menuOpen}>
			{#if data.user}
				<a href="/dashboard" onclick={() => (menuOpen = false)}>Dashboard</a>
				<a href="/analytics" onclick={() => (menuOpen = false)}>Analytics</a>
				<a href="/lists" onclick={() => (menuOpen = false)}>Shopping Lists</a>
				<Button variant="secondary" onclick={logout}>Logout</Button>
			{:else}
				<a href="/login" onclick={() => (menuOpen = false)}>Login</a>
			{/if}
		</nav>
	</header>
	{#if menuOpen}
		<button
			type="button"
			class="menu-backdrop"
			aria-label="Close menu"
			onclick={() => (menuOpen = false)}
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
		z-index: 60;
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
		position: relative;
		z-index: 61;
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
		z-index: 62;
	}
	nav.open {
		display: flex;
	}
	.menu-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.1);
		border: 0;
		z-index: 40;
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
