<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	export let data: PageData;

	let animatedElements: HTMLElement[] = [];

	onMount(() => {
		// Intersection Observer for scroll animations
		const observer = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					entry.target.classList.add('animate');
				}
			});
		}, { threshold: 0.1 });

		animatedElements.forEach(el => observer.observe(el));

		return () => {
			animatedElements.forEach(el => observer.unobserve(el));
		};
	});

	const stats = [
		{
			name: 'Account Status',
			value: 'Active',
			change: '+100%',
			changeType: 'positive',
			icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
			color: 'from-success-500 to-success-600'
		},
		{
			name: 'Last Login',
			value: 'Today',
			change: 'Secure',
			changeType: 'neutral',
			icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
			color: 'from-primary-500 to-primary-600'
		},
		{
			name: 'Email Verified',
			value: 'Yes',
			change: 'Verified',
			changeType: 'positive',
			icon: 'M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
			color: 'from-warning-500 to-warning-600'
		}
	];

	const quickActions = [
		{
			name: 'Update Profile',
			description: 'Edit your personal information and preferences',
			href: '/dashboard/profile',
			icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
			color: 'from-primary-500 to-primary-600'
		},
		{
			name: 'AI Chatbot',
			description: 'Interact with our intelligent assistant',
			href: '/dashboard/chatbot',
			icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
			color: 'from-success-500 to-success-600'
		},
		{
			name: 'Security Settings',
			description: 'Manage your account security preferences',
			href: '/dashboard/security',
			icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
			color: 'from-warning-500 to-warning-600'
		}
	];

	const recentActivity = [
		{
			action: 'Successfully signed in',
			time: '2 minutes ago',
			icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
			color: 'text-success-600',
			bgColor: 'bg-success-100'
		},
		{
			action: 'Profile updated',
			time: '1 hour ago',
			icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
			color: 'text-primary-600',
			bgColor: 'bg-primary-100'
		},
		{
			action: 'Email verification completed',
			time: '2 days ago',
			icon: 'M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
			color: 'text-warning-600',
			bgColor: 'bg-warning-100'
		}
	];
</script>

<svelte:head>
	<title>Dashboard - AuthFlow</title>
	<meta name="description" content="Welcome to your AuthFlow dashboard. Manage your account, security settings, and explore features." />
</svelte:head>

<div class="container-custom py-8">
	<!-- Welcome Header -->
	<div class="mb-8 animate-fade-in-up" bind:this={animatedElements[0]}>
		<h1 class="text-3xl lg:text-4xl font-display font-bold text-white mb-2">
			Welcome back, <span class="text-neon">{data.session?.user?.firstName || data.session?.user?.email}</span>! 👋
		</h1>
		<p class="text-lg text-gray-300">
			Here's what's happening with your account today.
		</p>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
		{#each stats as stat, index}
		<div class="animate-on-scroll" bind:this={animatedElements[index + 1]} style="animation-delay: {index * 100}ms;">
			<div class="card-hover">
				<div class="card-body">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-gray-400">{stat.name}</p>
							<p class="text-2xl font-bold text-white">{stat.value}</p>
						</div>
						<div class="w-12 h-12 bg-gradient-to-br {stat.color} rounded-xl flex items-center justify-center shadow-glow">
							<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={stat.icon}></path>
							</svg>
						</div>
					</div>
					<div class="mt-4 flex items-center">
						<span class="text-sm font-medium text-success-600">{stat.change}</span>
						<span class="text-sm text-gray-500 ml-2">{stat.changeType === 'positive' ? '✓' : '•'}</span>
					</div>
				</div>
			</div>
		</div>
		{/each}
	</div>

	<!-- Main Content Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
		<!-- Quick Actions -->
		<div class="lg:col-span-2 animate-on-scroll" bind:this={animatedElements[4]}>
			<div class="card">
				<div class="card-header">
					<h2 class="text-xl font-semibold text-gray-900">Quick Actions</h2>
					<p class="text-sm text-gray-600">Get things done quickly</p>
				</div>
				<div class="card-body">
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						{#each quickActions as action, index}
						<a 
							href={action.href}
							class="group block p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-medium transition-all duration-200"
						>
							<div class="flex items-center space-x-3">
								<div class="w-10 h-10 bg-gradient-to-br {action.color} rounded-lg flex items-center justify-center shadow-soft group-hover:shadow-glow transition-all duration-200">
									<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={action.icon}></path>
									</svg>
								</div>
								<div>
									<h3 class="font-medium text-gray-900 group-hover:text-primary-600 transition-colors duration-200">
										{action.name}
									</h3>
									<p class="text-sm text-gray-600">{action.description}</p>
								</div>
							</div>
						</a>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<!-- Recent Activity -->
		<div class="animate-on-scroll" bind:this={animatedElements[5]}>
			<div class="card">
				<div class="card-header">
					<h2 class="text-xl font-semibold text-gray-900">Recent Activity</h2>
					<p class="text-sm text-gray-600">Your latest account activity</p>
				</div>
				<div class="card-body">
					<div class="space-y-4">
						{#each recentActivity as activity, index}
						<div class="flex items-start space-x-3">
							<div class="w-8 h-8 {activity.bgColor} rounded-lg flex items-center justify-center flex-shrink-0">
								<svg class="w-4 h-4 {activity.color}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={activity.icon}></path>
								</svg>
							</div>
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium text-gray-900">{activity.action}</p>
								<p class="text-xs text-gray-500">{activity.time}</p>
							</div>
						</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Account Overview -->
	<div class="mt-8 animate-on-scroll" bind:this={animatedElements[6]}>
		<div class="card-glass">
			<div class="card-header">
				<h2 class="text-xl font-heading font-semibold text-white">Account Overview</h2>
				<p class="text-sm text-gray-300">Your account details and status</p>
			</div>
			<div class="card-body">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium text-gray-400">Email Address</span>
							<span class="text-sm text-white">{data.session?.user?.email}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium text-gray-400">Account Status</span>
							<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-400/20 text-secondary-400 border border-secondary-400/30">Active</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium text-gray-400">Email Verified</span>
							<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-400/20 text-secondary-400 border border-secondary-400/30">Verified</span>
						</div>
					</div>
					
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium text-gray-400">Member Since</span>
							<span class="text-sm text-white">Today</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium text-gray-400">Last Login</span>
							<span class="text-sm text-white">Just now</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium text-gray-400">Security Level</span>
							<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-400/20 text-primary-400 border border-primary-400/30">High</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Getting Started Tips -->
	<div class="mt-8 animate-on-scroll" bind:this={animatedElements[7]}>
		<div class="card bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
			<div class="card-body">
				<div class="flex items-start space-x-4">
					<div class="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
						<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
						</svg>
					</div>
					<div class="flex-1">
						<h3 class="text-lg font-semibold text-primary-900 mb-2">Getting Started</h3>
						<p class="text-primary-800 mb-4">
							Welcome to AuthFlow! Here are some things you can do to get started:
						</p>
						<ul class="space-y-2 text-primary-800">
							<li class="flex items-center">
								<span class="w-2 h-2 bg-primary-600 rounded-full mr-3"></span>
								Complete your profile with additional information
							</li>
							<li class="flex items-center">
								<span class="w-2 h-2 bg-primary-600 rounded-full mr-3"></span>
								Try our AI chatbot for assistance
							</li>
							<li class="flex items-center">
								<span class="w-2 h-2 bg-primary-600 rounded-full mr-3"></span>
								Review and update your security settings
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	</div>
</div> 