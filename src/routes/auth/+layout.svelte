<script lang="ts">
	import { page } from '$app/stores';
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
	<div class="max-w-md w-full space-y-8">
		<div class="text-center">
			<h2 class="mt-6 text-3xl font-extrabold text-gray-900">
				{$page.url.pathname.includes('login') ? 'Sign in to your account' : 
				  $page.url.pathname.includes('register') ? 'Create your account' :
				  $page.url.pathname.includes('reset') ? 'Reset your password' :
				  'Authentication'}
			</h2>
			<p class="mt-2 text-sm text-gray-600">
				{$page.url.pathname.includes('login') ? 'Welcome back! Please sign in to continue.' : 
				  $page.url.pathname.includes('register') ? 'Join us! Create your account to get started.' :
				  $page.url.pathname.includes('reset') ? 'Enter your email to receive a password reset link.' :
				  ''}
			</p>
		</div>
		
		<slot />
		
		<div class="text-center mt-6">
			<a href="/" class="text-sm text-primary-600 hover:text-primary-500">
				← Back to home
			</a>
		</div>
	</div>
</div> 