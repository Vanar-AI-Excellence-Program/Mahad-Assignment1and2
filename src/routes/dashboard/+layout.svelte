<script lang="ts">
	import type { LayoutData } from './$types';

	export let data: LayoutData;
</script>

<!-- Main content -->
<main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
	<slot />
</main> 