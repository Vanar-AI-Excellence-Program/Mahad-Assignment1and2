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

	const features = [
		{
			icon: '🔐',
			title: 'Secure Authentication',
			description: 'Enterprise-grade security with multi-factor authentication and advanced encryption.',
			color: 'from-primary-500 to-primary-600'
		},
		{
			icon: '📧',
			title: 'Email Verification',
			description: 'Robust email verification system with customizable templates and delivery tracking.',
			color: 'from-success-500 to-success-600'
		},
		{
			icon: '🔄',
			title: 'Password Reset',
			description: 'Secure password reset functionality with time-limited tokens and audit logging.',
			color: 'from-warning-500 to-warning-600'
		},
		{
			icon: '💾',
			title: 'Session Management',
			description: 'Database-stored sessions with configurable expiration and security policies.',
			color: 'from-purple-500 to-purple-600'
		},
		{
			icon: '🛡️',
			title: 'Protected Routes',
			description: 'Role-based access control with middleware and authentication guards.',
			color: 'from-indigo-500 to-indigo-600'
		},
		{
			icon: '👤',
			title: 'User Profiles',
			description: 'Comprehensive user profile management with customizable fields and avatars.',
			color: 'from-pink-500 to-pink-600'
		}
	];

	const technologies = [
		{ name: 'SvelteKit', description: 'Full-stack framework with Svelte 5', icon: '🚀' },
		{ name: 'Auth.js', description: 'Next-generation authentication', icon: '🔐' },
		{ name: 'PostgreSQL', description: 'Enterprise database with Drizzle ORM', icon: '🗄️' },
		{ name: 'TailwindCSS', description: 'Utility-first CSS framework', icon: '🎨' },
		{ name: 'TypeScript', description: 'Type-safe JavaScript development', icon: '🛡️' },
		{ name: 'Nodemailer', description: 'Professional email delivery', icon: '📧' }
	];
</script>

<svelte:head>
	<title>AuthFlow - Secure Authentication for Modern Applications</title>
	<meta name="description" content="Enterprise-grade authentication solution built with SvelteKit, PostgreSQL, and modern web technologies. Secure, scalable, and developer-friendly." />
</svelte:head>

<!-- Hero Section -->
<section class="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-primary-50 py-20 lg:py-32">
	<div class="absolute inset-0 bg-grid-pattern opacity-5"></div>
	<div class="container-custom relative z-10">
		<div class="max-w-4xl mx-auto text-center">
			{#if data.session}
				<!-- Authenticated user content -->
				<div class="card-hover max-w-2xl mx-auto animate-fade-in-up">
					<div class="card-body text-center">
						<div class="w-20 h-20 bg-gradient-to-br from-success-500 to-success-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow">
							<svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
							</svg>
						</div>
						<h1 class="text-4xl lg:text-5xl font-display font-bold text-white mb-4">
							Welcome back, <span class="text-neon">{data.session.user?.email}</span>!
						</h1>
						<p class="text-xl text-gray-600 mb-8 leading-relaxed">
							You're successfully signed in. Access your dashboard to manage your account and explore all features.
						</p>
						<a href="/dashboard" class="btn-primary btn-lg group">
							Go to Dashboard
							<svg class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
							</svg>
						</a>
					</div>
				</div>
			{:else}
				<!-- Guest user content -->
				<div class="animate-fade-in-up" bind:this={animatedElements[0]}>
					<h1 class="text-5xl lg:text-7xl font-display font-bold text-white mb-6 text-balance">
						Secure Authentication
						<span class="block text-neon">Made Simple</span>
					</h1>
					<p class="text-xl lg:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed text-balance">
						Enterprise-grade authentication solution built with cutting-edge technology. 
						Secure, scalable, and developer-friendly for modern applications.
					</p>
					
					<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
						<a href="/auth/register" class="btn-primary btn-xl group">
							Get Started Free
							<svg class="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
							</svg>
						</a>
						<a href="/login" class="btn-secondary btn-xl">
							Sign In
						</a>
					</div>
				</div>

				<!-- Floating elements for visual interest -->
				<div class="absolute top-20 left-10 w-20 h-20 bg-primary-200 rounded-full opacity-20 animate-float"></div>
				<div class="absolute bottom-20 right-10 w-32 h-32 bg-success-200 rounded-full opacity-20 animate-float" style="animation-delay: 1s;"></div>
				<div class="absolute top-1/2 left-20 w-16 h-16 bg-warning-200 rounded-full opacity-20 animate-float" style="animation-delay: 2s;"></div>
			{/if}
		</div>
	</div>
</section>

{#if !data.session}
<!-- Features Section -->
<section id="features" class="py-20 lg:py-32 matrix-bg">
	<div class="container-custom">
		<div class="text-center mb-16 animate-on-scroll" bind:this={animatedElements[1]}>
			<h2 class="text-4xl lg:text-5xl font-display font-bold text-white mb-6">
				Everything You Need for
				<span class="text-neon">Secure Authentication</span>
			</h2>
			<p class="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
				Built with modern security standards and best practices, AuthFlow provides all the tools you need to implement robust authentication in your applications.
			</p>
		</div>

		<div class="grid-feature">
			{#each features as feature, index}
			<div class="animate-on-scroll" bind:this={animatedElements[index + 2]} style="animation-delay: {index * 100}ms;">
				<div class="card-hover h-full group">
					<div class="card-body text-center">
						<div class="w-16 h-16 bg-gradient-to-br {feature.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow group-hover:shadow-glow-lg transition-all duration-300">
							<span class="text-2xl">{feature.icon}</span>
						</div>
						<h3 class="text-xl font-heading font-semibold text-white mb-4">{feature.title}</h3>
						<p class="text-gray-300 leading-relaxed">{feature.description}</p>
					</div>
				</div>
			</div>
			{/each}
		</div>
	</div>
</section>

<!-- Technology Stack Section -->
<section id="technology" class="py-20 lg:py-32 matrix-bg">
	<div class="container-custom">
		<div class="text-center mb-16 animate-on-scroll" bind:this={animatedElements[8]}>
			<h2 class="text-4xl lg:text-5xl font-display font-bold text-white mb-6">
				Built with
				<span class="text-neon">Modern Technology</span>
			</h2>
			<p class="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
				Leveraging the latest web technologies and frameworks to deliver a fast, secure, and scalable authentication solution.
			</p>
		</div>

		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
			{#each technologies as tech, index}
			<div class="animate-on-scroll" bind:this={animatedElements[index + 9]} style="animation-delay: {index * 100}ms;">
				<div class="text-center group">
					<div class="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-soft group-hover:shadow-medium transition-all duration-300 group-hover:-translate-y-1">
						<span class="text-3xl">{tech.icon}</span>
					</div>
					<h3 class="font-heading font-semibold text-white mb-2">{tech.name}</h3>
					<p class="text-sm text-gray-300 leading-relaxed">{tech.description}</p>
				</div>
			</div>
			{/each}
		</div>
	</div>
</section>

<!-- Security Section -->
<section id="security" class="py-20 lg:py-32 matrix-bg">
	<div class="container-custom">
		<div class="max-w-4xl mx-auto">
			<div class="text-center mb-16 animate-on-scroll" bind:this={animatedElements[15]}>
				<h2 class="text-4xl lg:text-5xl font-display font-bold text-white mb-6">
					Enterprise-Grade
					<span class="text-neon">Security</span>
				</h2>
				<p class="text-xl text-gray-600 leading-relaxed">
					Your security is our top priority. We implement industry best practices and cutting-edge security measures.
				</p>
			</div>

			<div class="grid md:grid-cols-2 gap-12 items-center">
				<div class="animate-on-scroll" bind:this={animatedElements[16]}>
					<div class="space-y-6">
						<div class="flex items-start space-x-4">
							<div class="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
								<svg class="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
								</svg>
							</div>
							<div>
								<h3 class="font-heading font-semibold text-white mb-2">End-to-End Encryption</h3>
								<p class="text-gray-300">All data is encrypted in transit and at rest using industry-standard encryption algorithms.</p>
							</div>
						</div>

						<div class="flex items-start space-x-4">
							<div class="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
								<svg class="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
								</svg>
							</div>
							<div>
								<h3 class="font-heading font-semibold text-white mb-2">Multi-Factor Authentication</h3>
								<p class="text-gray-300">Support for TOTP, SMS, and email-based two-factor authentication.</p>
							</div>
						</div>

						<div class="flex items-start space-x-4">
							<div class="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
								<svg class="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
								</svg>
							</div>
							<div>
								<h3 class="font-heading font-semibold text-white mb-2">Rate Limiting & Protection</h3>
								<p class="text-gray-300">Advanced rate limiting and protection against brute force attacks and DDoS.</p>
							</div>
						</div>
					</div>
				</div>

				<div class="animate-on-scroll" bind:this={animatedElements[17]}>
					<div class="card-hover">
						<div class="card-body text-center">
							<div class="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-glow">
								<svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
								</svg>
							</div>
							<h3 class="text-2xl font-heading font-semibold text-white mb-4">Security First</h3>
							<p class="text-gray-300 mb-6">
								Built with security best practices and regularly audited for vulnerabilities.
							</p>
							<div class="flex justify-center space-x-2">
								<span class="badge-success">SOC 2 Ready</span>
								<span class="badge-primary">GDPR Compliant</span>
								<span class="badge-warning">ISO 27001</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- CTA Section -->
<section class="py-20 lg:py-32 bg-gradient-to-br from-primary-600 to-primary-800">
	<div class="container-custom">
		<div class="max-w-3xl mx-auto text-center text-white">
			<h2 class="text-4xl lg:text-5xl font-bold mb-6">
				Ready to Get Started?
			</h2>
			<p class="text-xl text-primary-100 mb-8 leading-relaxed">
				Join thousands of developers who trust AuthFlow for their authentication needs. 
				Get started today with our free tier.
			</p>
			<div class="flex flex-col sm:flex-row gap-4 justify-center">
				<a href="/auth/register" class="btn-secondary btn-lg bg-white hover:bg-gray-50 text-primary-700 hover:text-primary-800">
					Start Building Now
				</a>
				<a href="/login" class="btn-ghost btn-lg text-white hover:bg-white/10 border-white/20">
					Sign In
				</a>
			</div>
		</div>
	</div>
</section>
{/if}

<style>
	.bg-grid-pattern {
		background-image: 
			linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
			linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px);
		background-size: 20px 20px;
	}
</style>
