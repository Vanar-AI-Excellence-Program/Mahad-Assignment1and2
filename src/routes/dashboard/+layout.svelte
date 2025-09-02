<script lang="ts">
	import type { LayoutData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	export let data: LayoutData;

	let isScrolled = false;
	let isMobileMenuOpen = false;

	onMount(() => {
		const handleScroll = () => {
			isScrolled = window.scrollY > 10;
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	});

	async function handleLogout() {
		try {
			const response = await fetch('/logout', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (response.ok) {
				console.log('✅ Logout successful');
				await goto('/');
			} else {
				console.error('❌ Logout failed');
			}
		} catch (error) {
			console.error('❌ Logout error:', error);
		}
	}

	function toggleMobileMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
	}

	const navigation = [
		{ name: 'Dashboard', href: '/dashboard', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z' },
		{ name: 'Profile', href: '/dashboard/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
		{ name: 'Chatbot', href: '/dashboard/chatbot', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' }
	];
</script>

<div class="min-h-screen matrix-bg">
	<!-- Dashboard Navigation -->
	<nav class="fixed top-0 left-0 right-0 z-50 transition-all duration-300 {isScrolled ? 'glass-strong shadow-large border-b border-panel-700' : 'glass shadow-soft'}">
		<div class="container-custom">
			<div class="flex justify-between items-center h-16 lg:h-20">
				<!-- Logo and Brand -->
				<div class="flex items-center">
					<a href="/dashboard" class="flex items-center space-x-3 group">
						<div class="w-10 h-10 bg-gradient-to-br from-primary-400 to-electric-500 rounded-xl flex items-center justify-center shadow-neon group-hover:shadow-neon transition-all duration-300 animate-glow-pulse">
							<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
							</svg>
						</div>
						<span class="text-xl font-display font-bold text-neon">AuthFlow</span>
					</a>
					
					{#if (data.session?.user as any)?.role === 'admin'}
						<a href="/admin" class="ml-6 btn-primary btn-sm shadow-neon hover:shadow-neon transition-all duration-300 transform hover:scale-105 active:scale-95" aria-label="Go to Admin Dashboard">
							<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
							</svg>
							Admin Dashboard
						</a>
					{/if}
				</div>
				
				<!-- Desktop Navigation -->
				<div class="hidden md:flex items-center space-x-1">
					{#each navigation as item}
						<a 
							href={item.href} 
							class="nav-link text-gray-300 hover:text-white transition-all duration-200 hover:text-glow-cyan {item.href === $page.url.pathname ? 'text-primary-400 text-glow-cyan' : ''}"
						>
							<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon}></path>
							</svg>
							{item.name}
						</a>
					{/each}
				</div>
				
				<!-- User Menu and Actions -->
				<div class="flex items-center space-x-4">
					<!-- User Info -->
					<div class="hidden md:flex items-center space-x-3">
						<div class="w-8 h-8 bg-gradient-to-br from-primary-400 to-electric-500 rounded-full flex items-center justify-center shadow-neon">
							<span class="text-sm font-medium text-white">
								{data.session?.user?.firstName ? data.session.user.firstName[0] : data.session?.user?.email?.[0] || 'U'}
							</span>
						</div>
						<div class="text-right">
							<p class="text-sm font-medium text-white">
								{data.session?.user?.firstName ? `${data.session.user.firstName} ${data.session.user.lastName}` : data.session?.user?.email}
							</p>
							<p class="text-xs text-gray-400">Signed in</p>
						</div>
					</div>
					
					<!-- Action Buttons -->
					<div class="flex items-center space-x-2">
						<a href="/dashboard/profile" class="btn-secondary btn-sm neon-border">
							<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
							</svg>
							Profile
						</a>
						
						<button
							on:click={handleLogout}
							class="btn-ghost btn-sm text-gray-300 hover:text-white"
						>
							<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
							</svg>
							Sign out
						</button>
					</div>

					<!-- Mobile Menu Button -->
					<button
						on:click={toggleMobileMenu}
						class="md:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-panel-800/50 transition-all duration-200 neon-border"
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
		</div>

		<!-- Mobile Menu -->
		{#if isMobileMenuOpen}
		<div class="md:hidden glass-strong border-t border-panel-700 shadow-large animate-fade-in-down">
			<div class="px-4 py-6 space-y-4">
				{#each navigation as item}
				<a 
					href={item.href} 
					class="block nav-link text-base text-gray-300 hover:text-glow-cyan transition-all duration-200 {item.href === $page.url.pathname ? 'text-primary-400 text-glow-cyan' : ''}"
				>
					<svg class="w-5 h-5 mr-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={item.icon}></path>
					</svg>
					{item.name}
				</a>
				{/each}
				
				{#if (data.session?.user as any)?.role === 'admin'}
				<div class="divider"></div>
				<a href="/admin" class="block btn-primary btn-md btn-admin w-full justify-center shadow-neon hover:shadow-neon transition-all duration-300" aria-label="Go to Admin Dashboard">
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
					</svg>
					Admin Dashboard
				</a>
				{/if}
				
				<div class="divider"></div>
				
				<!-- Mobile User Info -->
				<div class="flex items-center space-x-3 p-3 bg-panel-800/50 rounded-lg">
					<div class="w-10 h-10 bg-gradient-to-br from-primary-400 to-electric-500 rounded-full flex items-center justify-center shadow-neon">
						<span class="text-sm font-medium text-white">
							{data.session?.user?.firstName ? data.session.user.firstName[0] : data.session?.user?.email?.[0] || 'U'}
						</span>
					</div>
					<div>
						<p class="text-sm font-medium text-white">
							{data.session?.user?.firstName ? `${data.session.user.firstName} ${data.session.user.lastName}` : data.session?.user?.email}
						</p>
						<p class="text-xs text-gray-400">Signed in</p>
					</div>
				</div>
				
				<div class="divider"></div>
				
				<a href="/dashboard/profile" class="block btn-secondary btn-md w-full justify-center neon-border">
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
					</svg>
					Profile
				</a>
				
				<button
					on:click={handleLogout}
					class="block btn-ghost btn-md w-full justify-center text-gray-300 hover:text-white"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
					</svg>
					Sign out
				</button>
			</div>
		</div>
		{/if}
	</nav>

	<!-- Main Content with proper spacing for fixed nav -->
	<main class="pt-16 lg:pt-20 min-h-screen">
		<slot />
	</main>
</div> 