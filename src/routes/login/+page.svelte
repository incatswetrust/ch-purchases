<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import TopBar from '$lib/components/TopBar.svelte';

	let token = $state('');
	let telegramUrl = $state('');
	let status = $state('');
	let loading = $state(false);
	let pollTimer: number | undefined;

	async function startAuth() {
		loading = true;
		status = '';
		const response = await fetch('/api/auth/web/start', { method: 'POST' });
		const result = await response.json();
		token = result.token;
		telegramUrl = result.telegramUrl;
		loading = false;
		beginPolling();
	}

	function beginPolling() {
		if (!token) return;
		pollTimer = window.setInterval(async () => {
			const response = await fetch(`/api/auth/web/poll?token=${token}`);
			const result = await response.json();
			if (result.ok) {
				if (pollTimer) window.clearInterval(pollTimer);
				window.location.href = '/dashboard';
				return;
			}
			status = result.status ?? 'pending';
			if (status === 'expired' && pollTimer) {
				window.clearInterval(pollTimer);
			}
		}, 2000);
	}
</script>

<section class="stack">
	<TopBar title="Login" backHref="/" />
	<div class="card stack">
		<p>Authorize through your Telegram bot account.</p>
		<Button onclick={startAuth} disabled={loading}>
			{loading ? 'Creating login link...' : 'Open Telegram to authorize'}
		</Button>
		{#if telegramUrl}
			<p><a href={telegramUrl} target="_blank" rel="noreferrer">Open authorization chat</a></p>
			<p>Status: {status || 'pending'}</p>
		{/if}
	</div>
</section>
