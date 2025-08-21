<script lang="ts">
	import { onMount } from 'svelte';
	import type { ChatTreeNode } from '$lib/utils/chat-tree';
	import { getActiveBranch, createForkFromMessage } from '$lib/utils/chat-tree';
	import MessageRenderer from './MessageRenderer.svelte';

	let messages: any[] = [];
	let chatHistory: ChatTreeNode[] = [];
	let input = '';
	let isLoading = false;
	let currentStreamingMessage = '';
	let selectedConversationId: string | null = null;
	let showHistory = true;
	let editingMessageId: string | null = null;
	let editingContent = '';

	// Load chat history from database
	async function loadChatHistory() {
		try {
			const response = await fetch('/api/chat');
			if (response.ok) {
				chatHistory = await response.json();
				console.log('Loaded chat history:', chatHistory);
			} else {
				console.error('Failed to load chat history');
			}
		} catch (error) {
			console.error('Error loading chat history:', error);
		}
	}

	// Start a new conversation
	function startNewChat() {
		messages = [];
		selectedConversationId = null;
		showHistory = false;
		editingMessageId = null;
		editingContent = '';
	}

	// Load a specific conversation
	function loadConversation(conversation: ChatTreeNode) {
		const flatMessages = flattenConversation(conversation);
		messages = flatMessages;
		selectedConversationId = conversation.id;
		showHistory = false;
		editingMessageId = null;
		editingContent = '';
	}

	// Flatten a conversation tree to linear array
	function flattenConversation(conversation: ChatTreeNode): any[] {
		const result: any[] = [];
		
		function traverse(node: ChatTreeNode) {
			result.push({
				id: node.id,
				role: node.role,
				content: node.content,
				createdAt: node.createdAt,
				isEdited: node.isEdited,
				originalContent: node.originalContent
			});
			
			if (node.children && node.children.length > 0) {
				node.children.forEach(child => traverse(child));
			}
		}
		
		traverse(conversation);
		return result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
	}

	// Fork a conversation from a specific message
	async function forkConversation(messageId: string) {
		const conversation = findConversationByMessageId(chatHistory, messageId);
		if (conversation) {
			const messagesUpToFork = getMessagesUpToFork(conversation, messageId);
			messages = messagesUpToFork;
			selectedConversationId = messageId;
			showHistory = false;
			editingMessageId = null;
			editingContent = '';
		}
	}

	// Start editing a user message
	function startEditing(message: any) {
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

	// Save edited message
	async function saveEditedMessage(message: any) {
		if (!editingContent.trim() || editingContent === message.content) {
			cancelEditing();
			return;
		}

		try {
			isLoading = true;
			
			// Find the index of the message being edited
			const messageIndex = messages.findIndex(m => m.id === message.id);
			if (messageIndex === -1) {
				console.error('Message not found in current conversation');
				return;
			}
			
			// Remove all messages after the edited message (AI responses and subsequent messages)
			messages = messages.slice(0, messageIndex + 1);
			
			// Update the edited message content in the UI immediately
			messages[messageIndex] = {
				...messages[messageIndex],
				content: editingContent,
				isEdited: true
			};
			
			// Add a temporary loading message for the AI response
			messages = [...messages, { 
				id: 'temp-ai-' + Date.now(),
				role: 'assistant', 
				content: '',
				isLoading: true 
			}];
			
			// Call the edit API
			const response = await fetch('/api/chat', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messageId: message.id,
					newContent: editingContent
				})
			});

			if (response.ok) {
				// Handle streaming response
				const reader = response.body?.getReader();
				if (reader) {
					const decoder = new TextDecoder();
					let fullContent = '';
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
									
									// Reload chat history to show the updated structure
									await loadChatHistory();
									
									// Update the current conversation to show the new branch
									const updatedConversation = findConversationByMessageId(chatHistory, selectedConversationId!);
									if (updatedConversation) {
										loadConversation(updatedConversation);
									}
									
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
				
				// Remove the temporary loading message and show error
				messages = messages.slice(0, -1);
				messages = [...messages, { 
					id: 'error-' + Date.now(),
					role: 'assistant', 
					content: 'Sorry, I encountered an error while regenerating the response. Please try again.',
					isError: true
				}];
				
				alert('Failed to edit message. Please try again.');
			}
		} catch (error) {
			console.error('Error editing message:', error);
			
			// Remove the temporary loading message and show error
			messages = messages.slice(0, -1);
			messages = [...messages, { 
				id: 'error-' + Date.now(),
				role: 'assistant', 
				content: 'Sorry, I encountered an error while regenerating the response. Please try again.',
				isError: true
			}];
			
			alert('Error editing message. Please try again.');
		} finally {
			isLoading = false;
		}
	}

	async function handleChatSubmit(event: Event) {
		event.preventDefault();
		if (input.trim() && !isLoading) {
			const userMessage = input.trim();
			input = '';
			
			messages = [...messages, { role: 'user', content: userMessage }];
			isLoading = true;
			currentStreamingMessage = '';

			try {
				const response = await fetch('/api/chat', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ 
						messages: messages,
						parentId: selectedConversationId
					}),
				});

				if (response.ok) {
					messages = [...messages, { role: 'assistant', content: '' }];
					
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
										
										await loadChatHistory();
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
				} else {
					const error = await response.text();
					messages = [...messages, { role: 'assistant', content: `Error: ${error || 'Failed to get response'}` }];
				}
			} catch (error) {
				console.error('Chat error:', error);
				messages = [...messages, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }];
			} finally {
				isLoading = false;
				currentStreamingMessage = '';
			}
		}
	}

	onMount(() => {
		loadChatHistory();
	});

	$: if (messages.length > 0) {
		setTimeout(() => {
			const chatContainer = document.getElementById('chat-container');
			if (chatContainer) {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			}
		}, 100);
	}

	// Find conversation containing a specific message
	function findConversationByMessageId(conversations: ChatTreeNode[], messageId: string): ChatTreeNode | null {
		for (const conv of conversations) {
			if (conv.id === messageId) return conv;
			if (conv.children) {
				for (const child of conv.children) {
					if (child.id === messageId) return conv;
				}
			}
		}
		return null;
	}

	// Get messages up to a specific fork point
	function getMessagesUpToFork(conversation: ChatTreeNode, forkMessageId: string): any[] {
		const result: any[] = [];
		
		function traverse(node: ChatTreeNode, includeThis: boolean = false) {
			if (includeThis || node.id === forkMessageId) {
				result.push({
					id: node.id,
					role: node.role,
					content: node.content,
					createdAt: node.createdAt,
					isEdited: node.isEdited,
					originalContent: node.originalContent
				});
				includeThis = true;
			}
			
			if (node.children && node.children.length > 0) {
				node.children.forEach(child => traverse(child, includeThis));
			}
		}
		
		traverse(conversation);
		return result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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
							class="px-3 lg:px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
						>
							New Chat
						</button>
					</div>
					<p class="text-sm text-gray-600">Your previous conversations and branches</p>
				</div>
				
				<div class="flex-1 overflow-y-auto p-3 lg:p-4 space-y-3 max-h-64 lg:max-h-none">
					{#if chatHistory.length === 0}
						<div class="text-center text-gray-500 py-6 lg:py-8">
							<div class="w-12 h-12 lg:w-16 lg:h-16 mx-auto mb-3 lg:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
								<svg class="w-6 h-6 lg:w-8 lg:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
								</svg>
							</div>
							<p class="text-sm">No conversations yet</p>
							<p class="text-xs text-gray-400">Start a new chat to begin</p>
						</div>
					{:else}
						{#each chatHistory as conversation}
							<div class="space-y-2">
								<button
									on:click={() => loadConversation(conversation)}
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
													{conversation.content.substring(0, 40)}...
												</p>
												{#if conversation.isEdited}
													<span class="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">Edited</span>
												{/if}
											</div>
											<p class="text-xs text-gray-500">
												{new Date(conversation.createdAt).toLocaleDateString()}
											</p>
										</div>
									</div>
								</button>
								
								<button
									on:click={() => forkConversation(conversation.id)}
									class="w-full text-left p-1 lg:p-2 rounded-lg hover:bg-green-50 transition-all duration-200 text-xs text-green-600 border-2 border-green-100 hover:border-green-200 hover:shadow-sm"
								>
									<div class="flex items-center space-x-2">
										<svg class="w-3 h-3 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path>
										</svg>
										<span>Fork from here</span>
									</div>
								</button>
								
								{#if conversation.children && conversation.children.length > 0}
									<div class="ml-3 lg:ml-6 space-y-2">
										{#each conversation.children as child}
											<div class="space-y-2">
												<button
													on:click={() => loadConversation(child)}
													class="w-full text-left p-1 lg:p-2 rounded-lg hover:bg-purple-50 transition-all duration-200 border-2 border-gray-100 hover:border-purple-200 hover:shadow-sm text-xs lg:text-sm"
												>
													<div class="flex items-start space-x-2">
														<div class="w-4 h-4 lg:w-6 lg:h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
															<svg class="w-2 h-2 lg:w-3 lg:h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path>
															</svg>
														</div>
														<div class="flex-1 min-w-0">
															<div class="flex items-center space-x-2 mb-1">
																<p class="text-xs lg:text-sm text-gray-700 truncate">
																	{child.content.substring(0, 30)}...
																</p>
																{#if child.isEdited}
																	<span class="text-xs text-purple-600 bg-purple-100 px-1 py-0.5 rounded-full">Edited</span>
																{/if}
															</div>
															<p class="text-xs text-gray-500">
																{new Date(child.createdAt).toLocaleDateString()}
															</p>
														</div>
													</div>
												</button>
												
												<button
													on:click={() => forkConversation(child.id)}
													class="w-full text-left p-1 rounded hover:bg-green-50 transition-all duration-200 text-xs text-green-600 border-2 border-green-100 hover:border-green-200 hover:shadow-sm ml-2 lg:ml-4"
												>
													<div class="flex items-center space-x-1">
														<svg class="w-2 h-2 lg:w-3 lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path>
														</svg>
														<span>Fork</span>
													</div>
												</button>
												
												<!-- Show nested children (edited versions) -->
												{#if child.children && child.children.length > 0}
													<div class="ml-2 lg:ml-4 space-y-1">
														{#each child.children as grandchild}
															{#if grandchild.role === 'user'}
																<button
																	on:click={() => loadConversation(grandchild)}
																	class="w-full text-left p-1 rounded hover:bg-orange-50 transition-all duration-200 border border-gray-100 hover:border-orange-200 hover:shadow-sm text-xs"
																>
																	<div class="flex items-start space-x-1">
																		<div class="w-3 h-3 lg:w-4 lg:h-4 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
																			<svg class="w-1.5 h-1.5 lg:w-2 lg:h-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
																			</svg>
																		</div>
																		<div class="flex-1 min-w-0">
																			<p class="text-xs text-gray-600 truncate">
																				{grandchild.content.substring(0, 25)}...
																			</p>
																			<p class="text-xs text-gray-400">
																				{new Date(grandchild.createdAt).toLocaleDateString()}
																			</p>
																		</div>
																	</div>
																</button>
															{/if}
														{/each}
													</div>
												{/if}
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					{/if}
				</div>
			</div>
		{/if}

		<!-- Main Chat Area -->
		<div class="flex-1 flex flex-col min-h-0">
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
							<h1 class="text-lg lg:text-2xl font-bold text-gray-900">AI Assistant</h1>
							<p class="text-xs lg:text-sm text-gray-600">Powered by Gemini 2.0 Flash</p>
						</div>
					</div>
					<div class="flex items-center space-x-2">
						<div class="w-2 h-2 lg:w-3 lg:h-3 bg-green-500 rounded-full animate-pulse"></div>
						<span class="text-xs lg:text-sm text-gray-600 font-medium">Online</span>
					</div>
				</div>
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

					{#each messages as message}
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
											
											<button
												on:click={() => forkConversation(message.id)}
												class="text-xs text-white hover:text-blue-100 font-medium flex items-center space-x-1 hover:bg-white/20 px-1.5 lg:px-2 py-1 rounded transition-colors"
											>
												<svg class="w-2.5 h-2.5 lg:w-3 lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path>
												</svg>
												<span>Fork from here</span>
											</button>
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
</div>
