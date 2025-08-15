<script lang="ts">
	import { onMount } from 'svelte';

	let messages: any[] = [];
	let input = '';
	let isLoading = false;

	async function handleChatSubmit(event: Event) {
		event.preventDefault();
		if (input.trim() && !isLoading) {
			const userMessage = input.trim();
			input = '';
			
			// Add user message
			messages = [...messages, { role: 'user', content: userMessage }];
			isLoading = true;

			try {
				const response = await fetch('/api/chat', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ messages: messages }),
				});

				if (response.ok) {
					const result = await response.json();
					messages = [...messages, { role: 'assistant', content: result.content }];
				} else {
					const error = await response.json();
					messages = [...messages, { role: 'assistant', content: `Error: ${error.error || 'Failed to get response'}` }];
				}
			} catch (error) {
				console.error('Chat error:', error);
				messages = [...messages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }];
			} finally {
				isLoading = false;
			}
		}
	}

	onMount(() => {
		// Scroll to bottom when new messages arrive
		const chatContainer = document.getElementById('chat-container');
		if (chatContainer) {
			chatContainer.scrollTop = chatContainer.scrollHeight;
		}
	});

	$: if (messages.length > 0) {
		setTimeout(() => {
			const chatContainer = document.getElementById('chat-container');
			if (chatContainer) {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			}
		}, 100);
	}
</script>

<svelte:head>
	<title>Chatbot - AuthFlow Dashboard</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 p-4">
	<div class="max-w-6xl mx-auto h-[calc(100vh-2rem)] flex flex-col">
		<!-- Chat Header -->
		<div class="bg-white rounded-t-xl shadow-sm border-b border-gray-200 px-6 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-3">
					<div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
						<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
						</svg>
					</div>
					<div>
						<h1 class="text-2xl font-bold text-gray-900">AI Assistant</h1>
						<p class="text-gray-600 text-sm">Powered by Gemini 2.0 Flash</p>
					</div>
				</div>
				<div class="flex items-center space-x-2">
					<div class="w-3 h-3 bg-green-500 rounded-full"></div>
					<span class="text-sm text-gray-500">Online</span>
				</div>
			</div>
		</div>

		<!-- Chat Messages Area - Full Height -->
		<div class="flex-1 bg-white overflow-hidden">
			<div id="chat-container" class="h-full overflow-y-auto p-6 space-y-6">
				{#if messages.length === 0}
					<div class="flex flex-col items-center justify-center h-full text-center text-gray-500">
						<div class="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
							<svg class="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
							</svg>
						</div>
						<h2 class="text-2xl font-semibold text-gray-700 mb-2">Welcome to AI Assistant</h2>
						<p class="text-lg text-gray-500 mb-4">I'm here to help you with any questions or tasks</p>
						<div class="max-w-md">
							<p class="text-sm text-gray-400 leading-relaxed">
								You can ask me about programming, writing, analysis, or just have a friendly conversation. 
								I'm powered by Google's latest Gemini 2.0 Flash model for the best possible responses.
							</p>
						</div>
					</div>
				{/if}

				{#each messages as message}
					<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
						<div class="max-w-2xl px-6 py-4 rounded-2xl {message.role === 'user' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-50 text-gray-800 border border-gray-200'}">
							{#if message.role === 'user'}
								<div class="flex items-center space-x-3 mb-2">
									<div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
										<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
										</svg>
									</div>
									<span class="text-sm font-semibold">You</span>
								</div>
							{:else}
								<div class="flex items-center space-x-3 mb-2">
									<div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
										<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
										</svg>
									</div>
									<span class="text-sm font-semibold text-blue-600">AI Assistant</span>
								</div>
							{/if}
							<div class="prose prose-sm max-w-none">
								<p class="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
							</div>
						</div>
					</div>
				{/each}

				{#if isLoading}
					<div class="flex justify-start">
						<div class="max-w-2xl px-6 py-4 rounded-2xl bg-gray-50 border border-gray-200">
							<div class="flex items-center space-x-3 mb-2">
								<div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
									<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
									</svg>
								</div>
								<span class="text-sm font-semibold text-blue-600">AI Assistant</span>
							</div>
							<div class="flex items-center space-x-2">
								<span class="text-gray-600">Thinking</span>
								<div class="flex space-x-1">
									<div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
									<div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
									<div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Chat Input - Fixed at Bottom -->
		<div class="bg-white rounded-b-xl shadow-sm border-t border-gray-200 p-6">
			<form on:submit={handleChatSubmit} class="flex space-x-4">
				<div class="flex-1 relative">
					<input
						bind:value={input}
						type="text"
						placeholder="Ask me anything... I'm here to help!"
						class="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 resize-none"
						disabled={isLoading}
					/>
					{#if input.trim()}
						<button
							type="button"
							on:click={() => input = ''}
							class="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
							</svg>
						</button>
					{/if}
				</div>
				<button
					type="submit"
					disabled={!input.trim() || isLoading}
					class="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold hover:from-blue-700 hover:to-purple-700 focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-3 shadow-lg"
				>
					{#if isLoading}
						<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						<span>Thinking...</span>
					{:else}
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
						</svg>
						<span>Send</span>
					{/if}
				</button>
			</form>
		</div>
	</div>
</div>
