<script lang="ts">
	import { page } from '$app/stores';
</script>

<div class="container mx-auto px-4 py-8">
	<div class="max-w-4xl mx-auto text-center">
		<h1 class="text-4xl font-bold text-gray-900 mb-6">
			Welcome to AuthFlow
		</h1>
		<p class="text-xl text-gray-600 mb-8">
			A secure authentication application built with SvelteKit, PostgreSQL, and modern web technologies.
		</p>
		
		<div class="grid md:grid-cols-2 gap-8 mt-12">
			<div class="card">
				<h2 class="text-2xl font-semibold text-gray-900 mb-4">Features</h2>
				<ul class="text-left space-y-2 text-gray-600">
					<li>✅ Secure email & password authentication</li>
					<li>✅ Email verification system</li>
					<li>✅ Password reset functionality</li>
					<li>✅ Database session management</li>
					<li>✅ Protected routes</li>
					<li>✅ User profile management</li>
				</ul>
			</div>
			
			<div class="card">
				<h2 class="text-2xl font-semibold text-gray-900 mb-4">Technology Stack</h2>
				<ul class="text-left space-y-2 text-gray-600">
					<li>🚀 SvelteKit with Svelte 5</li>
					<li>🔐 Auth.js for authentication</li>
					<li>🗄️ PostgreSQL with Drizzle ORM</li>
					<li>🎨 TailwindCSS for styling</li>
					<li>📧 Nodemailer for emails</li>
					<li>🛡️ TypeScript for type safety</li>
				</ul>
			</div>
		</div>
		
		<div class="mt-12 space-x-4">
			<a href="/auth/login" class="btn-primary">
				Get Started
			</a>
			<a href="/auth/register" class="btn-secondary">
				Create Account
			</a>
		</div>
	</div>
</div>
