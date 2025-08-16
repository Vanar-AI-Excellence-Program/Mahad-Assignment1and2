<script lang="ts">
	import { onMount } from 'svelte';

	export let data: any;

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

	const securityFeatures = [
		{
			name: 'Two-Factor Authentication',
			description: 'Add an extra layer of security to your account',
			status: 'Not enabled',
			icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
			color: 'from-warning-500 to-warning-600',
			action: 'Enable 2FA'
		},
		{
			name: 'Password Change',
			description: 'Update your password regularly for better security',
			status: 'Last changed: 30 days ago',
			icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
			color: 'from-primary-500 to-primary-600',
			action: 'Change Password'
		},
		{
			name: 'Login History',
			description: 'Review your recent login activity and locations',
			status: 'Last login: Today',
			icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
			color: 'from-success-500 to-success-600',
			action: 'View History'
		},
		{
			name: 'Session Management',
			description: 'Manage active sessions across devices',
			status: '1 active session',
			icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
			color: 'from-info-500 to-info-600',
			action: 'Manage Sessions'
		}
	];

	const securityTips = [
		'Use a strong, unique password for your account',
		'Enable two-factor authentication for extra security',
		'Never share your login credentials with anyone',
		'Log out from shared devices when finished',
		'Regularly review your login activity for suspicious activity'
	];
</script>

<svelte:head>
	<title>Security Settings - AuthFlow</title>
	<meta name="description" content="Manage your account security settings and preferences." />
</svelte:head>

<div class="container-custom py-8">
	<!-- Header -->
	<div class="mb-8 animate-fade-in-up" bind:this={animatedElements[0]}>
		<h1 class="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
			Security Settings
		</h1>
		<p class="text-lg text-gray-600">
			Manage your account security and privacy preferences
		</p>
	</div>

	<!-- Security Overview Card -->
	<div class="mb-8 animate-on-scroll" bind:this={animatedElements[1]}>
		<div class="card bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
			<div class="card-body">
				<div class="flex items-start space-x-4">
					<div class="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
						<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
						</svg>
					</div>
					<div class="flex-1">
						<h3 class="text-lg font-semibold text-primary-900 mb-2">Account Security Status</h3>
						<p class="text-primary-800 mb-4">
							Your account is currently secure with basic protection enabled. Consider enabling additional security features for enhanced protection.
						</p>
						<div class="flex items-center space-x-4">
							<div class="flex items-center space-x-2">
								<div class="w-3 h-3 bg-success-500 rounded-full"></div>
								<span class="text-sm font-medium text-primary-800">Email Verified</span>
							</div>
							<div class="flex items-center space-x-2">
								<div class="w-3 h-3 bg-success-500 rounded-full"></div>
								<span class="text-sm font-medium text-primary-800">Strong Password</span>
							</div>
							<div class="flex items-center space-x-2">
								<div class="w-3 h-3 bg-warning-500 rounded-full"></div>
								<span class="text-sm font-medium text-primary-800">2FA Not Enabled</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Security Features Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
		{#each securityFeatures as feature, index}
		<div class="animate-on-scroll" bind:this={animatedElements[index + 2]} style="animation-delay: {index * 100}ms;">
			<div class="card-hover">
				<div class="card-body">
					<div class="flex items-start space-x-4">
						<div class="w-12 h-12 bg-gradient-to-br {feature.color} rounded-xl flex items-center justify-center shadow-soft">
							<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={feature.icon}></path>
							</svg>
						</div>
						<div class="flex-1">
							<h3 class="text-lg font-semibold text-gray-900 mb-2">{feature.name}</h3>
							<p class="text-gray-600 mb-3">{feature.description}</p>
							<div class="flex items-center justify-between">
								<span class="text-sm text-gray-500">{feature.status}</span>
								<button class="btn-secondary btn-sm">
									{feature.action}
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		{/each}
	</div>

	<!-- Security Tips -->
	<div class="animate-on-scroll" bind:this={animatedElements[6]}>
		<div class="card">
			<div class="card-header">
				<h2 class="text-xl font-semibold text-gray-900">Security Best Practices</h2>
				<p class="text-sm text-gray-600">Follow these tips to keep your account secure</p>
			</div>
			<div class="card-body">
				<div class="space-y-4">
					{#each securityTips as tip, index}
					<div class="flex items-start space-x-3">
						<div class="w-6 h-6 bg-success-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
							<svg class="w-4 h-4 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
							</svg>
						</div>
						<p class="text-gray-700">{tip}</p>
					</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<!-- Additional Security Options -->
	<div class="mt-8 animate-on-scroll" bind:this={animatedElements[7]}>
		<div class="card">
			<div class="card-header">
				<h2 class="text-xl font-semibold text-gray-900">Additional Security Options</h2>
				<p class="text-sm text-gray-600">Advanced security features and settings</p>
			</div>
			<div class="card-body">
				<div class="space-y-4">
					<div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
						<div>
							<h3 class="font-medium text-gray-900">Account Recovery</h3>
							<p class="text-sm text-gray-600">Set up recovery options in case you lose access</p>
						</div>
						<button class="btn-secondary btn-sm">Configure</button>
					</div>
					
					<div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
						<div>
							<h3 class="font-medium text-gray-900">Privacy Settings</h3>
							<p class="text-sm text-gray-600">Control what information is shared</p>
						</div>
						<button class="btn-secondary btn-sm">Manage</button>
					</div>
					
					<div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
						<div>
							<h3 class="font-medium text-gray-900">Data Export</h3>
							<p class="text-sm text-gray-600">Download your account data</p>
						</div>
						<button class="btn-secondary btn-sm">Export</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
