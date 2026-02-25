<script lang="ts">
	let { children, className = '' }: { children?: import('svelte').Snippet; className?: string } =
		$props();
</script>

<section class={`card ${className}`.trim()}>
	{@render children?.()}
</section>
