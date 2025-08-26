<script lang="ts">
	import { onMount } from 'svelte';
	import MessageRenderer from './MessageRenderer.svelte';

	interface Message {
		id: string;
		role: 'user' | 'assistant';
		content: string;
		isEdited?: boolean;
		originalContent?: string;
		isLoading?: boolean;
		isError?: boolean;
		createdAt: string;
	}

	interface Branch {
		id: string;
		name: string;
		createdAt: string;
		parentBranchId?: string;
	}

	interface Conversation {
		id: string;
		title: string;
		createdAt: string;
		updatedAt: string;
	}

	let messages: Message[] = [];
	let input = '';
	let isLoading = false;
	let currentStreamingMessage = '';
	let showHistory = true;
	let editingMessageId: string | null = null;
	let editingContent = '';
	let conversations: Conversation[] = [];
	let currentConversationId: string | null = null;
	let currentBranchId: string | null = null;
	let branches: Branch[] = [];
	let showBranchSelector = false;

	// Load conversations for the user
	async function loadConversations() {
		try {
			const response = await fetch('/api/chat');
			if (response.ok) {
				const data = await response.json();
				conversations = data.conversations || [];
			}
		} catch (error) {
			console.error('Error loading conversations:', error);
		}
	}

	// Load a specific conversation and branch
	async function loadConversation(conversationId: string, branchId?: string) {
		try {
			const url = branchId 
				? `/api/chat?conversationId=${conversationId}&branchId=${branchId}`
				: `/api/chat?conversationId=${conversationId}`;
			
			const response = await fetch(url);
			if (response.ok) {
				const data = await response.json();
				messages = data.messages || [];
				branches = data.branches || [];
				currentConversationId = conversationId;
				currentBranchId = data.branchId || branches[0]?.id;
				showHistory = false;
			}
		} catch (error) {
			console.error('Error loading conversation:', error);
		}
	}

	// Start a new conversation
	async function startNewChat() {
		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					messages: [],
					title: 'New Conversation'
				})
			});

			if (response.ok) {
				const data = await response.json();
				// The API will create a new conversation and return the ID
				// For now, we'll just clear the current state
				messages = [];
				currentConversationId = null;
				currentBranchId = null;
				branches = [];
				showHistory = false;
				await loadConversations();
			}
		} catch (error) {
			console.error('Error starting new chat:', error);
		}
	}

	// Start editing a user message
	function startEditing(message: Message) {
		if (message.role === 'user') {
			editingMessageId = message.id;
			editingContent = message.content;
		}
	}

	// Cancel editing
	function cancelEditing() {
		editingMessageId = null;
		editingContent = '';
	}

	// Save edited message - creates a new branch
	async function saveEditedMessage(message: Message) {
		if (!editingContent.trim() || editingContent === message.content) {
			cancelEditing();
			return;
		}

		try {
			isLoading = true;
			
			// Call the edit API to create a new fork
			const response = await fetch('/api/chat', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messageId: message.id,
					newContent: editingContent,
					branchName: `Edit: ${editingContent.substring(0, 30)}...`
				})
			});

			if (response.ok) {
				// Handle streaming response
				const reader = response.body?.getReader();
				if (reader) {
					const decoder = new TextDecoder();
					let fullContent = '';
					
					// Add a temporary loading message for the AI response
					messages = [...messages, { 
						id: 'temp-ai-' + Date.now(),
						role: 'assistant', 
						content: '',
						isLoading: true,
						createdAt: new Date().toISOString()
					}];
					
					const tempMessageIndex = messages.length - 1;
					
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						
						const chunk = decoder.decode(value);
						const lines = chunk.split('\n');
						
						for (const line of lines) {
							if (line.startsWith('data: ')) {
								const data = line.slice(6);
								
								if (data === '[DONE]') {
									// Update the temporary message with the final content
									messages[tempMessageIndex] = {
										...messages[tempMessageIndex],
										content: fullContent,
										isLoading: false
									};
									messages = [...messages];
									
									// Reload conversations to show the updated structure
									await loadConversations();
									
									cancelEditing();
									break;
								}
								
								try {
									const parsed = JSON.parse(data);
									if (parsed.chunk) {
										fullContent += parsed.chunk;
										// Update the temporary message with streaming content
										messages[tempMessageIndex] = {
											...messages[tempMessageIndex],
											content: fullContent
										};
										messages = [...messages];
									}
								} catch (e) {
									console.error('Error parsing chunk:', e);
								}
							}
						}
					}
				}
			} else {
				const error = await response.text();
				console.error('Failed to edit message:', error);
				alert('Failed to edit message. Please try again.');
			}
		} catch (error) {
			console.error('Error editing message:', error);
			alert('Error editing message. Please try again.');
		} finally {
			isLoading = false;
		}
	}

	// Regenerate AI response
	async function regenerateResponse(message: Message) {
		if (message.role !== 'assistant') return;

		try {
			isLoading = true;
			
			// Call the regenerate API
			const response = await fetch('/api/chat/fork', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messageId: message.id,
					branchName: `Regeneration: ${new Date().toLocaleTimeString()}`
				})
			});

			if (response.ok) {
				// For now, just show a success message
				// In a full implementation, this would handle the AI regeneration
				alert('Regeneration initiated. This will create a new branch.');
			}
		} catch (error) {
			console.error('Error regenerating response:', error);
			alert('Error regenerating response. Please try again.');
		} finally {
			isLoading = false;
		}
	}

	// Fork conversation from a specific message
	async function forkFromMessage(message: Message) {
		if (!currentConversationId) return;

		try {
			const response = await fetch('/api/chat/fork', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messageId: message.id,
					conversationId: currentConversationId,
					branchName: `Fork from ${message.role} message`
				})
			});

			if (response.ok) {
				const data = await response.json();
				// Switch to the new branch
				await loadConversation(currentConversationId, data.branch.id);
				alert('New branch created! You can now continue from this point.');
			}
		} catch (error) {
			console.error('Error forking conversation:', error);
			alert('Error forking conversation. Please try again.');
		}
	}

	// Switch to a different branch
	async function switchBranch(branchId: string) {
		if (!currentConversationId) return;

		try {
			const response = await fetch('/api/chat/fork', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					conversationId: currentConversationId,
					branchId: branchId
				})
			});

			if (response.ok) {
				const data = await response.json();
				messages = data.messages || [];
				currentBranchId = branchId;
				showBranchSelector = false;
			}
		} catch (error) {
			console.error('Error switching branch:', error);
			alert('Error switching branch. Please try again.');
		}
	}

	// Navigate to previous branch (like ChatGPT's back button)
	async function goToPreviousBranch() {
		if (!currentConversationId || !currentBranchId) return;

		try {
			// Find the current branch and get its parent
			const currentBranch = branches.find(b => b.id === currentBranchId);
			if (!currentBranch?.parentBranchId) {
				// If no parent, go to the main branch
				const mainBranch = branches.find(b => !b.parentBranchId);
				if (mainBranch) {
					await switchBranch(mainBranch.id);
				}
				return;
			}

			// Switch to parent branch
			await switchBranch(currentBranch.parentBranchId);
		} catch (error) {
			console.error('Error going to previous branch:', error);
		}
	}

	// Navigate to next branch (like ChatGPT's forward button)
	async function goToNextBranch() {
		if (!currentConversationId || !currentBranchId) return;

		try {
			// Find child branches of current branch
			const childBranches = branches.filter(b => b.parentBranchId === currentBranchId);
			
			if (childBranches.length === 0) {
				// No child branches to go to
				return;
			}

			// For now, go to the first child branch
			// In a more sophisticated implementation, you might want to remember the path
			await switchBranch(childBranches[0].id);
		} catch (error) {
			console.error('Error going to next branch:', error);
		}
	}

	// Check if we can navigate backward (has parent branch)
	$: canGoBack = currentBranchId && branches.find(b => b.id === currentBranchId)?.parentBranchId;

	// Check if we can navigate forward (has child branches)
	$: canGoForward = currentBranchId && branches.filter(b => b.parentBranchId === currentBranchId).length > 0;

	// Get the branch path from root to current branch
	function getBranchPath(branchId: string): Branch[] {
		const path: Branch[] = [];
		let currentBranch: Branch | undefined = branches.find(b => b.id === branchId);
		
		if (!currentBranch) return path;
		
		// Build path from current branch back to root
		while (currentBranch) {
			path.unshift(currentBranch);
			currentBranch = branches.find(b => b.id === currentBranch.parentBranchId);
		}
		
		return path;
	}

	async function handleChatSubmit(event: Event) {
		event.preventDefault();
		
		if (input.trim() && !isLoading) {
			const userMessage = input.trim();
			input = '';
			
			// Add user message to the current conversation
			const newMessage: Message = {
				id: 'temp-' + Date.now(),
				role: 'user',
				content: userMessage,
				createdAt: new Date().toISOString()
			};
			
			messages = [...messages, newMessage];
			isLoading = true;
			currentStreamingMessage = '';

			try {
				// Create conversation if it doesn't exist
				if (!currentConversationId) {
					const response = await fetch('/api/chat', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ 
							messages: messages,
							title: userMessage.substring(0, 50) + '...'
						}),
					});

					if (response.ok) {
						// Get the conversation ID from the response
						// For now, we'll use a placeholder
						currentConversationId = 'new-conversation';
					}
				} else {
					// Add message to existing conversation
					const response = await fetch('/api/chat', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ 
							messages: messages,
							conversationId: currentConversationId,
							branchId: currentBranchId
						}),
					});

					if (response.ok) {
						// Handle streaming response
						const reader = response.body?.getReader();
						if (reader) {
							const decoder = new TextDecoder();
							
							while (true) {
								const { done, value } = await reader.read();
								if (done) break;
								
								const chunk = decoder.decode(value);
								const lines = chunk.split('\n');
								
								for (const line of lines) {
									if (line.startsWith('data: ')) {
										const data = line.slice(6);
										
										if (data === '[DONE]') {
											const lastMessageIndex = messages.length - 1;
											messages[lastMessageIndex] = {
												...messages[lastMessageIndex],
												content: currentStreamingMessage
											};
											messages = [...messages];
											
											await loadConversations();
											break;
										}
										
										try {
											const parsed = JSON.parse(data);
											if (parsed.chunk) {
												currentStreamingMessage += parsed.chunk;
												const lastMessageIndex = messages.length - 1;
												messages[lastMessageIndex] = {
													...messages[lastMessageIndex],
													content: currentStreamingMessage
												};
												messages = [...messages];
											}
										} catch (e) {
											console.error('Error parsing chunk:', e);
										}
									}
								}
							}
						}
					}
				}
			} catch (error) {
				console.error('Chat error:', error);
				messages = [...messages, { 
					id: 'error-' + Date.now(),
					role: 'assistant', 
					content: 'Sorry, I encountered an error. Please try again.',
					createdAt: new Date().toISOString()
				}];
			} finally {
				isLoading = false;
				currentStreamingMessage = '';
			}
		}
	}

	onMount(() => {
		loadConversations();
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

<div class="min-h-screen bg-gray-50 p-2 sm:p-4">
	<div class="max-w-7xl mx-auto h-[calc(100vh-6rem)] sm:h-[calc(100vh-8rem)] flex flex-col lg:flex-row">
		<!-- Chat History Sidebar -->
		{#if showHistory}
			<div class="w-full lg:w-80 bg-white rounded-t-xl lg:rounded-l-xl lg:rounded-t-none shadow-sm border-b-2 lg:border-r-2 lg:border-b-0 border-gray-100 flex flex-col flex-shrink-0">
				<div class="p-4 lg:p-6 border-b-2 border-gray-100">
					<div class="flex items-center justify-between mb-4">
						<h2 class="text-lg lg:text-xl font-semibold text-gray-900">Chat History</h2>
						<button
							on:click={startNewChat}
							class="px-4 lg:px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95 flex items-center space-x-2"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
							</svg>
							<span>New Chat</span>
						</button>
					</div>
					<p class="text-sm text-gray-600">Your main conversations (branches can be viewed from within each chat)</p>
				</div>
				
				<div class="flex-1 overflow-y-auto p-3 lg:p-4 space-y-3 max-h-64 lg:max-h-none">
					{#if conversations.length === 0}
						<div class="text-center text-gray-500 py-6 lg:py-8">
							<div class="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-3 lg:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
								<svg class="w-6 h-6 lg:w-8 lg:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
								</svg>
							</div>
							<p class="text-sm">No conversations yet</p>
							<p class="text-xs text-gray-400">Start a new chat to begin</p>
						</div>
					{:else}
						{#each conversations as conversation}
							<div class="space-y-2">
								<button
									on:click={() => loadConversation(conversation.id)}
									class="w-full text-left p-2 lg:p-3 rounded-lg hover:bg-blue-50 transition-all duration-200 border-2 border-gray-100 hover:border-blue-200 hover:shadow-sm"
								>
									<div class="flex items-start space-x-2 lg:space-x-3">
										<div class="w-6 h-6 lg:w-8 lg:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
											<svg class="w-3 h-3 lg:w-4 lg:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
											</svg>
										</div>
										<div class="flex-1 min-w-0">
											<div class="flex items-center space-x-2 mb-1">
												<p class="text-xs lg:text-sm font-medium text-gray-900 truncate">
													{conversation.title}
												</p>
											</div>
											<p class="text-xs text-gray-500">
												{conversation.createdAt ? new Date(conversation.createdAt).toLocaleDateString() : 'Recent'}
											</p>
										</div>
									</div>
								</button>
								
								<button
									on:click={() => startNewChat()}
									class="w-full text-left p-2 lg:p-3 rounded-lg hover:bg-green-50 transition-all duration-200 text-xs text-green-600 border-2 border-green-100 hover:border-green-200 hover:shadow-sm group"
									title="Start a new chat from here (GPT-style forking)"
								>
									<div class="flex items-center space-x-2">
										<svg class="w-3 h-3 lg:w-4 lg:h-4 text-green-600 group-hover:text-green-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
										</svg>
										<span class="font-medium">Start new chat from here</span>
									</div>
								</button>
							</div>
						{/each}
					{/if}
				</div>
			</div>
		{/if}

		<!-- Main Chat Area -->
		<div class="flex-1 flex flex-col min-h-0">
			<!-- Fork Notification -->
			{#if showBranchSelector}
				<div class="bg-green-50 border-l-4 border-green-400 p-4 mb-4 rounded-r-lg shadow-sm">
					<div class="flex items-center">
						<div class="flex-shrink-0">
							<svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
							</svg>
						</div>
						<div class="ml-3">
							<p class="text-sm font-medium text-green-800">
								New chat branch created! You can now continue the conversation from this point.
							</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Chat Header -->
			<div class="bg-white rounded-b-xl lg:rounded-r-xl lg:rounded-b-none shadow-sm border-b-2 lg:border-b-0 border-gray-100 px-4 lg:px-6 py-3 lg:py-4 flex-shrink-0">
				<div class="flex items-center justify-between">
					<div class="flex items-center space-x-2 lg:space-x-3">
						{#if showHistory}
							<button
								on:click={() => showHistory = false}
								class="p-1.5 lg:p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-800"
								aria-label="Hide chat history sidebar"
							>
								<svg class="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
								</svg>
							</button>
						{:else}
							<button
								on:click={() => showHistory = true}
								class="p-1.5 lg:p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-800"
								aria-label="Show chat history sidebar"
							>
								<svg class="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
								</svg>
							</button>
						{/if}
						
						<div class="w-8 h-8 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
							<svg class="w-4 h-4 lg:w-6 lg:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
							</svg>
						</div>
						<div>
							<h1 class="text-lg lg:text-2xl font-bold text-gray-900">
								AI Assistant
								{#if currentBranchId && branches.find(b => b.id === currentBranchId)?.parentBranchId}
									<span class="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full ml-2">Forked Branch</span>
								{/if}
							</h1>
							<p class="text-xs lg:text-sm text-gray-600">Powered by Gemini 2.0 Flash</p>
						</div>
					</div>
					<div class="flex items-center space-x-2">
						{#if messages.length > 0}
							<button
								on:click={() => showBranchSelector = true}
								class="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium rounded-lg transition-colors border border-blue-200 hover:border-blue-300 flex items-center space-x-1"
								title="View conversation branches"
							>
								<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
								</svg>
								<span>Branches</span>
							</button>
						{/if}
						{#if currentBranchId && branches.find(b => b.id === currentBranchId)?.parentBranchId}
							<button
								on:click={startNewChat}
								class="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-medium rounded-lg transition-colors border border-green-200 hover:border-green-300 flex items-center space-x-1"
								title="Start a completely new chat"
							>
								<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
								</svg>
								<span>New Chat</span>
							</button>
						{/if}
						<div class="w-2 h-2 lg:w-3 lg:h-3 bg-green-500 rounded-full animate-pulse"></div>
						<span class="text-xs lg:text-sm text-gray-600 font-medium">Online</span>
					</div>
				</div>
				
				<!-- Current Branch Indicator -->
				{#if currentBranchId && branches.length > 0}
					<div class="flex items-center justify-center mt-2">
						<div class="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-lg text-xs text-gray-600">
							<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
							</svg>
							<span>Current: {branches.find(b => b.id === currentBranchId)?.name || 'Main Branch'}</span>
						</div>
					</div>
				{/if}
			</div>

			<!-- Chat Messages Area -->
			<div class="flex-1 bg-white overflow-hidden min-h-0">
				<div id="chat-container" class="h-full overflow-y-auto p-3 lg:p-6 space-y-4 lg:space-y-6">
					{#if messages.length === 0}
						<div class="flex flex-col items-center justify-center h-full text-center text-gray-500 px-4">
							<div class="w-16 h-16 lg:w-24 lg:h-24 mx-auto mb-4 lg:mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
								<svg class="w-8 h-8 lg:w-12 lg:h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
								</svg>
							</div>
							<h2 class="text-lg lg:text-2xl font-semibold text-gray-700 mb-2">Welcome to AI Assistant</h2>
							<p class="text-base lg:text-lg text-gray-500 mb-3 lg:mb-4">I'm here to help you with any questions or tasks</p>
							<div class="max-w-md">
								<p class="text-xs lg:text-sm text-gray-400 leading-relaxed">
									You can ask me about programming, writing, analysis, or just have a friendly conversation. 
									I'm powered by Google's latest Gemini 2.0 Flash model for the best possible responses.
								</p>
							</div>
						</div>
					{/if}

					{#each messages as message, index}
						<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
							<div class="max-w-xs sm:max-w-md lg:max-w-2xl px-3 lg:px-6 py-3 lg:py-4 rounded-2xl {message.role === 'user' ? 'bg-blue-600 text-white shadow-lg' : message.isError ? 'bg-red-50 text-red-800 border-2 border-red-200' : 'bg-white text-gray-800 border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow'}">
								{#if message.role === 'user'}
									<div class="flex items-center space-x-2 lg:space-x-3 mb-2">
										<div class="w-6 h-6 lg:w-8 lg:h-8 bg-white/20 rounded-full flex items-center justify-center">
											<svg class="w-3 h-3 lg:w-4 lg:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
											</svg>
										</div>
										<span class="text-xs lg:text-sm font-semibold text-white">You</span>
										{#if message.isEdited}
											<span class="text-xs text-white/70 bg-white/20 px-2 py-1 rounded-full">Edited</span>
										{/if}
									</div>
									
									{#if editingMessageId === message.id}
										<!-- Edit Mode -->
										<div class="space-y-3">
											<textarea
												bind:value={editingContent}
												class="w-full px-3 py-2 text-gray-800 rounded-lg border-2 border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
												rows="3"
												placeholder="Edit your message..."
											></textarea>
											<div class="flex space-x-2">
												<button
													on:click={() => saveEditedMessage(message)}
													disabled={isLoading}
													class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
												>
													{#if isLoading}
														<svg class="w-3 h-3 animate-spin inline mr-1" fill="none" viewBox="0 0 24 24">
															<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
															<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
														</svg>
													{/if}
													Save
												</button>
												<button
													on:click={cancelEditing}
													disabled={isLoading}
													class="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
												>
													Cancel
												</button>
											</div>
										</div>
									{:else}
										<!-- Display Mode -->
										<div class="prose prose-sm max-w-none">
											<div class="text-sm lg:text-base leading-relaxed whitespace-pre-wrap text-white font-medium">
												{message.content}
											</div>
										</div>
										
										<div class="mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-white/30 flex items-center justify-between">
											<button
												on:click={() => startEditing(message)}
												class="text-xs text-white hover:text-blue-100 font-medium flex items-center space-x-1 hover:bg-white/20 px-1.5 lg:px-2 py-1 rounded transition-colors"
											>
												<svg class="w-2.5 h-2.5 lg:w-3 lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
												</svg>
												<span>Edit</span>
											</button>
											
											<!-- Only show "Start new chat from here" button for the last user message in the conversation -->
											{#if index === messages.length - 1 || (index < messages.length - 1 && messages[index + 1]?.role === 'assistant')}
												<button
													on:click={() => startNewChat()}
													class="text-xs text-white hover:text-blue-100 font-medium flex items-center space-x-1 hover:bg-white/20 px-1.5 lg:px-2 py-1 rounded transition-colors group"
													title="Start a new chat from this message"
												>
													<svg class="w-2.5 h-2.5 lg:w-3 lg:h-3 text-white group-hover:text-blue-100 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
													</svg>
													<span>New chat from here</span>
												</button>
											{/if}
										</div>
									{/if}
								{:else}
									<div class="flex items-center space-x-2 lg:space-x-3 mb-2">
										<div class="w-6 h-6 lg:w-8 lg:h-8 {message.isError ? 'bg-red-100' : 'bg-gradient-to-br from-blue-500 to-purple-600'} rounded-full flex items-center justify-center">
											{#if message.isError}
												<svg class="w-3 h-3 lg:w-4 lg:h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
												</svg>
											{:else}
												<svg class="w-3 h-3 lg:w-4 lg:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
												</svg>
											{/if}
										</div>
										<span class="text-xs lg:text-sm font-semibold {message.isError ? 'text-red-600' : 'text-blue-600'}">
											{message.isError ? 'Error' : 'AI Assistant'}
										</span>
									</div>
									<MessageRenderer 
										content={message.content} 
										isLoading={message.isLoading} 
										isError={message.isError} 
									/>
									
									<!-- AI Message Actions -->
									<div class="mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-gray-200 flex items-center justify-end space-x-2">
										<button
											on:click={() => regenerateResponse(message)}
											class="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
											title="Regenerate this response (creates new branch)"
										>
											<svg class="w-2.5 h-2.5 lg:w-3 lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
											</svg>
											<span>Regenerate</span>
										</button>
										<button
											on:click={() => forkFromMessage(message)}
											class="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
											title="Fork conversation from this message"
										>
											<svg class="w-2.5 h-2.5 lg:w-3 lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
											</svg>
											<span>Fork</span>
										</button>
									</div>
								{/if}
							</div>
						</div>
					{/each}

					{#if isLoading && currentStreamingMessage === ''}
						<div class="flex justify-start">
							<div class="max-w-xs sm:max-w-md lg:max-w-2xl px-3 lg:px-6 py-3 lg:py-4 rounded-2xl bg-white border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
								<div class="flex items-center space-x-2 lg:space-x-3 mb-2">
									<div class="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
										<svg class="w-3 h-3 lg:w-4 lg:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
										</svg>
									</div>
									<span class="text-xs lg:text-sm font-semibold text-blue-600">AI Assistant</span>
								</div>
								<div class="flex items-center space-x-2">
									<span class="text-sm lg:text-base text-gray-700 font-medium">Thinking</span>
									<div class="flex space-x-1">
										<div class="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-blue-500 rounded-full animate-bounce"></div>
										<div class="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
										<div class="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
									</div>
								</div>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Chat Input -->
			<div class="bg-white rounded-b-xl lg:rounded-br-xl shadow-sm border-t-2 border-gray-100 p-3 lg:p-6 flex-shrink-0">
				<!-- Branch Navigation Buttons (ChatGPT Style) -->
				{#if messages.length > 0 && (canGoBack || canGoForward)}
					<div class="flex items-center justify-center space-x-1 mb-4">
						<button
							on:click={goToPreviousBranch}
							disabled={!canGoBack}
							class="flex items-center space-x-1.5 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 rounded-lg hover:bg-gray-100 disabled:hover:bg-transparent border border-gray-200 hover:border-gray-300 disabled:border-gray-100"
							title="Go to previous branch"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
							</svg>
							<span>Previous</span>
						</button>
						
						<div class="w-px h-6 bg-gray-300 mx-2"></div>
						
						<button
							on:click={goToNextBranch}
							disabled={!canGoForward}
							class="flex items-center space-x-1.5 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed transition-all duration-200 rounded-lg hover:bg-gray-100 disabled:hover:bg-transparent border border-gray-200 hover:border-gray-300 disabled:border-gray-100"
							title="Go to next branch"
						>
							<span>Next</span>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
							</svg>
						</button>
					</div>
					
					<!-- Branch Path Breadcrumb -->
					{#if currentBranchId}
						{@const branchPath = getBranchPath(currentBranchId)}
						{#if branchPath.length > 1}
							<div class="flex items-center justify-center mb-3">
								<div class="flex items-center space-x-1 text-xs text-gray-500">
									{#each branchPath as branch, index}
										{#if index > 0}
											<svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
											</svg>
										{/if}
										<span class="px-2 py-1 rounded {branch.id === currentBranchId ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600'}">
											{branch.name || 'Main Branch'}
										</span>
									{/each}
								</div>
							</div>
						{/if}
					{/if}
				{/if}

				<form on:submit={handleChatSubmit} class="flex space-x-2 lg:space-x-4">
					<div class="flex-1 relative">
						<input
							bind:value={input}
							type="text"
							placeholder="Ask me anything... I'm here to help!"
							class="w-full px-3 lg:px-6 py-3 lg:py-4 text-base lg:text-lg border-2 border-gray-200 rounded-xl lg:rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 resize-none hover:border-gray-300 focus:shadow-md"
							disabled={isLoading}
						/>
						{#if input.trim()}
							<button
								type="button"
								on:click={() => input = ''}
								class="absolute right-2 lg:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
								aria-label="Clear input text"
							>
								<svg class="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
								</svg>
							</button>
						{/if}
					</div>
					<button
						type="submit"
						disabled={!input.trim() || isLoading}
						class="px-4 lg:px-8 py-3 lg:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl lg:rounded-2xl font-semibold hover:from-blue-700 hover:to-purple-700 focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 lg:space-x-3 shadow-lg hover:shadow-xl text-sm lg:text-base transform hover:scale-105 active:scale-95"
					>
						{#if isLoading}
							<svg class="w-4 h-4 lg:w-5 lg:h-5 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							<span class="hidden sm:inline">Thinking...</span>
						{:else}
							<svg class="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
							</svg>
							<span class="hidden sm:inline">Send</span>
						{/if}
					</button>
				</form>
			</div>
		</div>
	</div>
	
	<!-- Branch Viewer Modal -->
	{#if showBranchSelector}
		<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
				<div class="p-6 border-b border-gray-200">
					<div class="flex items-center justify-between">
						<h2 class="text-xl font-bold text-gray-900">Conversation Branches</h2>
						<button
							on:click={() => showBranchSelector = false}
							class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
						>
							<svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
							</svg>
						</button>
					</div>
					<p class="text-sm text-gray-600 mt-2">View and switch between different conversation paths</p>
				</div>
				
				<div class="flex-1 overflow-y-auto p-6">
					{#if branches.length === 0}
						<div class="text-center text-gray-500 py-8">
							<p>No branches found for this conversation</p>
						</div>
					{:else}
						<div class="space-y-4">
							{#each branches as branch}
								<div class="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
									<div class="flex items-center justify-between mb-3">
										<h3 class="font-medium text-gray-900">Branch {branch.name}</h3>
										{#if branch.parentBranchId}
											<span class="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">Forked</span>
										{/if}
									</div>
									
									<div class="space-y-2">
										<div class="flex items-start space-x-3 text-sm">
											<div class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100 text-gray-600">
												<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
												</svg>
											</div>
											<div class="flex-1 min-w-0">
												<p class="text-gray-900 font-medium">
													{branch.name}
												</p>
												<p class="text-gray-600 truncate">
													{branch.createdAt ? new Date(branch.createdAt).toLocaleDateString() : 'Recent'}
												</p>
											</div>
										</div>
									</div>
									
									<div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
										<span class="text-xs text-gray-500">
											{branch.createdAt ? new Date(branch.createdAt).toLocaleDateString() : 'Recent'}
										</span>
										<button
											on:click={() => switchBranch(branch.id)}
											class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
										>
											Load Branch
										</button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
