<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	// Layout component for the application

	let isScrolled = false;
	let isMobileMenuOpen = false;

	onMount(() => {
		const handleScroll = () => {
			isScrolled = window.scrollY > 10;
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	});

	function toggleMobileMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
	}
</script>

<svelte:head>
	<title>AuthFlow - Secure Authentication</title>
	<meta name="description" content="A secure authentication application built with SvelteKit" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
	<!-- Navigation - Show only on public routes (not dashboard or admin) -->
	{#if !$page.url.pathname.startsWith('/dashboard') && !$page.url.pathname.startsWith('/admin')}
	<nav class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 {isScrolled ? 'bg-white/95 backdrop-blur-md shadow-medium border-b border-gray-100' : 'bg-transparent'}">
		<div class="container-custom">
			<div class="flex justify-between items-center h-16 lg:h-20">
				<!-- Logo -->
				<div class="flex items-center">
					<a href="/" class="flex items-center space-x-3 group">
						<div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-glow group-hover:shadow-glow-lg transition-all duration-300">
							<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
							</svg>
						</div>
						<span class="text-2xl font-bold text-gradient">AuthFlow</span>
					</a>
				</div>

				<!-- Desktop Navigation -->
				<div class="hidden md:flex items-center space-x-8">
					<a href="/#features" class="nav-link">Features</a>
					<a href="/#technology" class="nav-link">Technology</a>
					<a href="/#security" class="nav-link">Security</a>
				</div>
				
				<!-- Desktop CTA Buttons -->
				<div class="hidden md:flex items-center space-x-4">
					<a href="/login" class="btn-secondary btn-md">
						Sign in
					</a>
					<a href="/auth/register" class="btn-primary btn-md">
						Get Started
					</a>
				</div>

				<!-- Mobile Menu Button -->
				<button
					on:click={toggleMobileMenu}
					class="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200"
					aria-label="Toggle mobile menu"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						{#if isMobileMenuOpen}
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
						{:else}
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
						{/if}
					</svg>
				</button>
			</div>
		</div>

		<!-- Mobile Menu -->
		{#if isMobileMenuOpen}
		<div class="md:hidden bg-white border-t border-gray-100 shadow-large animate-fade-in-down">
			<div class="px-4 py-6 space-y-4">
				<a href="/#features" class="block nav-link text-base">Features</a>
				<a href="/#technology" class="block nav-link text-base">Technology</a>
				<a href="/#security" class="block nav-link text-base">Security</a>
				<div class="divider"></div>
				<a href="/login" class="block btn-secondary btn-md w-full justify-center">Sign in</a>
				<a href="/auth/register" class="block btn-primary btn-md w-full justify-center">Get Started</a>
			</div>
		</div>
		{/if}
	</nav>
	{/if}

	<!-- Main Content with proper spacing for fixed nav -->
	<main class="{!$page.url.pathname.startsWith('/dashboard') && !$page.url.pathname.startsWith('/admin') ? 'pt-16 lg:pt-20' : ''}">
		<slot />
	</main>

	<!-- Footer for public pages -->
	{#if !$page.url.pathname.startsWith('/dashboard') && !$page.url.pathname.startsWith('/admin')}
	<footer class="bg-gray-900 text-white py-16 mt-20">
		<div class="container-custom">
			<div class="grid grid-cols-1 md:grid-cols-4 gap-8">
				<div class="col-span-1 md:col-span-2">
					<div class="flex items-center space-x-3 mb-6">
						<div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
							<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
							</svg>
						</div>
						<span class="text-2xl font-bold">AuthFlow</span>
					</div>
					<p class="text-gray-400 text-lg leading-relaxed max-w-md">
						Secure, scalable authentication for modern applications. Built with cutting-edge technology and security best practices.
					</p>
				</div>
				
				<div>
					<h3 class="text-lg font-semibold mb-4">Product</h3>
					<ul class="space-y-3 text-gray-400">
						<li><a href="/#features" class="hover:text-white transition-colors duration-200">Features</a></li>
						<li><a href="/#security" class="hover:text-white transition-colors duration-200">Security</a></li>
						<li><a href="/#pricing" class="hover:text-white transition-colors duration-200">Pricing</a></li>
					</ul>
				</div>
				
				<div>
					<h3 class="text-lg font-semibold mb-4">Company</h3>
					<ul class="space-y-3 text-gray-400">
						<li><a href="/about" class="hover:text-white transition-colors duration-200">About</a></li>
						<li><a href="/blog" class="hover:text-white transition-colors duration-200">Blog</a></li>
						<li><a href="/contact" class="hover:text-white transition-colors duration-200">Contact</a></li>
					</ul>
				</div>
			</div>
			
			<div class="divider border-gray-800 mt-12"></div>
			
			<div class="flex flex-col md:flex-row justify-between items-center pt-8">
				<p class="text-gray-400 text-sm">
					© 2024 AuthFlow. All rights reserved.
				</p>
				<div class="flex space-x-6 mt-4 md:mt-0">
					<a href="/privacy" class="text-gray-400 hover:text-white text-sm transition-colors duration-200">Privacy</a>
					<a href="/terms" class="text-gray-400 hover:text-white text-sm transition-colors duration-200">Terms</a>
				</div>
			</div>
		</div>
	</footer>
	{/if}
</div>
