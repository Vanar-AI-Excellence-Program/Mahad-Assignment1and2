<script lang="ts">
	import { onMount, onDestroy, tick } from 'svelte';
	import { 
		dbChatsToTree,
		getActivePath,
		createFork,
		addAIResponse,
		goToParent,
		goToNext,
		getNavigationInfo,
		getConversationTitle,
		getLastMessage,
		getConversationCreatedAt,
		getVersionNavigationInfo,
		goToPreviousVersion,
		goToNextVersion,
		getAIRegenerationInfo as getAIRegenerationInfoUtil,
		goToPreviousRegeneration,
		goToNextRegeneration,
		type ChatTree,
		type ChatTreeNode,
		type ConversationState
	} from '$lib/utils/chat-tree-v3';
	import MessageRenderer from './MessageRenderer.svelte';

	// Conversation-based tree management
	let conversations: Record<string, ChatTree> = {}; // Each conversation has its own tree
	let currentConversationId: string | null = null;
	let currentNodeId: string | null = null;
	
	// Get the current conversation's tree
	$: currentChatTree = currentConversationId ? conversations[currentConversationId] || {} : {};
	
	// UI state
	let input = '';
	let isLoading = false;
	let showHistory = true;
	let editingMessageId: string | null = null;
	let editingContent = '';
	let autoScrollRequested = false;
	
	// Upload state
	let isUploading = false;
	let uploadMessage = '';
	let selectedFile: File | null = null;
	
	// Temporary state for immediate UI updates
	let pendingUserMessage: string | null = null;
	let streamingAIResponse = '';
	let streamingActive = false;
	
	// Word-by-word streaming state
	let wordBuffer: string[] = [];
	let wordStreamingInterval: NodeJS.Timeout | null = null;
	
	// Source information for messages
	let messageSources: Record<string, Array<{filename: string, content: string, similarity: number}>> = {};

	// Persist/restore UI state (conversation + active node)
	const UI_STATE_KEY = 'chat_ui_state_v1';
	let restoredConversationId: string | null = null;
	let restoredNodeId: string | null = null;
	let hasAppliedRestore = false;

	function loadUIState() {
		try {
			const raw = localStorage.getItem(UI_STATE_KEY);
			if (!raw) return;
			const parsed = JSON.parse(raw);
			restoredConversationId = parsed?.conversationId || null;
			restoredNodeId = parsed?.nodeId || null;
			console.log('Restored UI state:', { restoredConversationId, restoredNodeId });
		} catch (e) {
			console.warn('Failed to load UI state:', e);
		}
	}

	function saveUIState() {
		if (typeof window !== 'undefined') {
			try {
				localStorage.setItem(UI_STATE_KEY, JSON.stringify({
					conversationId: currentConversationId,
					nodeId: currentNodeId
				}));
			} catch (e) {
				console.warn('Failed to save UI state:', e);
			}
		}
	}

	// Word-by-word streaming functions
	function startWordStreaming() {
		if (wordStreamingInterval) {
			clearInterval(wordStreamingInterval);
		}
		
		wordStreamingInterval = setInterval(() => {
			if (wordBuffer.length > 0) {
				const nextWord = wordBuffer.shift();
				if (nextWord) {
					streamingAIResponse += (streamingAIResponse ? ' ' : '') + nextWord;
					streamingAIResponse = streamingAIResponse; // Trigger reactivity
				}
			} else if (!streamingActive) {
				// No more words in buffer and streaming is done
				stopWordStreaming();
			}
		}, 80); // 80ms delay between words for smooth effect
	}

	function stopWordStreaming() {
		if (wordStreamingInterval) {
			clearInterval(wordStreamingInterval);
			wordStreamingInterval = null;
		}
		// Flush any remaining words immediately
		if (wordBuffer.length > 0) {
			const remainingWords = wordBuffer.join(' ');
			streamingAIResponse += (streamingAIResponse ? ' ' : '') + remainingWords;
			streamingAIResponse = streamingAIResponse;
			wordBuffer = [];
		}
	}

	function addWordsToBuffer(text: string) {
		// Split text into words and add to buffer
		const words = text.trim().split(/\s+/).filter(word => word.length > 0);
		wordBuffer.push(...words);
	}
	
	// Computed values for current conversation
	$: messages = getActivePath(currentChatTree, currentNodeId);
	
	// Fallback: if no messages from path, show all messages in current conversation
	$: displayMessages = messages.length > 0 ? messages : 
		(currentConversationId ? Object.values(currentChatTree).filter(node => 
			node.conversationId === currentConversationId
		).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : []);
	
	// Navigation info
	$: navigationInfo = currentNodeId ? getNavigationInfo(currentChatTree, currentNodeId) : {
		hasParent: false,
		hasNext: false,
		hasChildren: false,
		parentId: null,
		nextId: null,
		childIds: []
	};
	
	// Get list of conversations for the sidebar
	$: conversationList = Object.keys(conversations).map(convId => ({
		id: convId,
		title: getConversationTitle(conversations[convId]),
		lastMessage: getLastMessage(conversations[convId]),
		createdAt: getConversationCreatedAt(conversations[convId])
	})).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

	// Load chat history from database
	async function loadChatHistory() {
		try {
			const response = await fetch('/api/chat');
			if (response.ok) {
				const conversationsWithMessages = await response.json();
				console.log('Loaded conversations from DB:', conversationsWithMessages);

				// Convert each conversation's messages to a tree
				conversations = {};
				conversationsWithMessages.forEach((conversation: any) => {
					if (conversation.messages && conversation.messages.length > 0) {
						conversations[conversation.id] = dbChatsToTree(conversation.messages);
					} else {
						conversations[conversation.id] = {};
					}
				});
				
				console.log('Converted conversations to trees:', conversations);
				
				// Preserve current conversation during reload, or restore from localStorage
				const conversationToUse = currentConversationId || restoredConversationId;
				
				if (!hasAppliedRestore && restoredConversationId && conversations[restoredConversationId]) {
					hasAppliedRestore = true;
					// Only switch conversation if we don't already have one active
					if (!currentConversationId) {
						currentConversationId = restoredConversationId;
					}
					if (restoredNodeId && conversationToUse && conversations[conversationToUse] && conversations[conversationToUse][restoredNodeId]) {
						currentNodeId = restoredNodeId;
						console.log('Restored node:', currentNodeId);
					} else if (!currentNodeId && conversationToUse && conversations[conversationToUse]) {
						const nodes = Object.values(conversations[conversationToUse]).sort((a: any, b: any) =>
							new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
						);
						currentNodeId = nodes.length > 0 ? (nodes[nodes.length - 1] as any).id : null;
					}
				} else if (!currentConversationId && Object.keys(conversations).length > 0) {
					// Default: first conversation and its sensible node (latest assistant or its user)
					currentConversationId = Object.keys(conversations)[0];
					currentNodeId = getDefaultNodeIdForConversation(conversations[currentConversationId]);
					console.log('Set current conversation to:', currentConversationId);
				}
				
				console.log('After loadChatHistory - currentConversationId:', currentConversationId, 'currentNodeId:', currentNodeId);
			} else {
				console.error('Failed to load chat history');
			}
		} catch (error) {
			console.error('Error loading chat history:', error);
		}
	}

	// Start a new conversation
	function startNewChat() {
		const newConversationId = crypto.randomUUID();
		conversations[newConversationId] = {};
		currentConversationId = newConversationId;
		currentNodeId = null;
		showHistory = false;
		editingMessageId = null;
		editingContent = '';
		console.log('Started new conversation:', newConversationId);
	}

	// Load a specific conversation
	function loadConversation(conversationId: string) {
		console.log('Loading conversation:', conversationId);
		
		if (conversations[conversationId]) {
			currentConversationId = conversationId;
			// Choose best initial node for this conversation
			const defaultNode = getDefaultNodeIdForConversation(conversations[conversationId]);
			currentNodeId = defaultNode;
			
			showHistory = false;
			editingMessageId = null;
			editingContent = '';
		}
	}

	// Start editing a user message
	function startEditing(message: any) {
		console.log('startEditing called with message:', message);
		
		if (message.role === 'user') {
			editingMessageId = message.id;
			editingContent = message.content;
		} else {
			console.log('Cannot edit non-user message');
		}
	}

	// Cancel editing
	function cancelEditing() {
		editingMessageId = null;
		editingContent = '';
	}
			
	// Save edited message
	async function saveEditedMessage(message: any) {
		console.log('saveEditedMessage called with message:', message);
		
		if (!editingContent.trim() || editingContent === message.content) {
			console.log('No changes or empty content, canceling edit');
			cancelEditing();
			return;
		}

		try {
			isLoading = true;
			
			// Call the edit API to create a new branch with streaming
			console.log('Calling edit API with:', { messageId: editingMessageId, newContent: editingContent });
			const response = await fetch('/api/chat', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messageId: editingMessageId,
					newContent: editingContent
				})
			});

			if (response.ok) {
				// Handle streaming response from edit API
				const reader = response.body?.getReader();
					const decoder = new TextDecoder();
				let accumulatedResponse = '';
					
				if (reader) {
					try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						
						const chunk = decoder.decode(value);
						const lines = chunk.split('\n');
						
						for (const line of lines) {
							if (line.startsWith('data: ')) {
								const data = line.slice(6);
								if (data === '[DONE]') {
										// Streaming complete, reload chat history
										console.log('Edit streaming complete, reloading chat history...');
									await loadChatHistory();
										console.log('Chat history reloaded after edit, current tree size:', Object.keys(currentChatTree).length);

										// Navigate to the new branch
										// Find the new user message first (the edited one)
										const newUserMessage = Object.values(currentChatTree).find(node =>
											node.role === 'user' &&
											node.content === editingContent &&
											node.isEdited === true
										);

										if (newUserMessage) {
											// Then find the AI response that has this new user message as parent
											const newAIMessage = Object.values(currentChatTree).find(node =>
												node.role === 'assistant' &&
												node.parentId === newUserMessage.id
											);

											if (newAIMessage) {
												currentNodeId = newAIMessage.id;
												console.log('Navigated to new AI response after edit:', newAIMessage.id);
											} else {
												// If no AI response found, navigate to the new user message
												currentNodeId = newUserMessage.id;
												console.log('Navigated to new user message (no AI response yet):', newUserMessage.id);
											}

											// Ensure we stay in the same conversation and persist selection
											currentConversationId = newUserMessage.conversationId;
											saveUIState();
											// Do not auto-scroll here; user is focused on this context

										} else {
											console.log('No new user message found after edit');
											console.log('Available messages:', Object.values(currentChatTree).map(m => ({
												role: m.role,
												content: m.content.substring(0, 50),
												isEdited: m.isEdited
											})));
									}
									
									cancelEditing();
									break;
									} else {
								try {
									const parsed = JSON.parse(data);
									if (parsed.chunk) {
												accumulatedResponse += parsed.chunk;
												console.log('Received edit chunk:', parsed.chunk);
									}
								} catch (e) {
											console.log('Failed to parse edit chunk data:', data, e);
										}
									}
								}
							}
						}
					} finally {
						reader.releaseLock();
					}
				} else {
					// Fallback: reload chat history if streaming fails
					console.log('No reader available, falling back to direct reload');
					await loadChatHistory();
					cancelEditing();
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

	async function handleChatSubmit(event: Event) {
		event.preventDefault();
		
		if (input.trim() && !isLoading) {
			const userMessage = input.trim();
			input = '';
			
			// Immediately show user message in UI
			pendingUserMessage = userMessage;
			streamingAIResponse = '';
			streamingActive = false;
			wordBuffer = [];
			stopWordStreaming(); // Clear any existing streaming
			
			try {
				isLoading = true;
			
			// Generate conversation ID if this is a new chat
				let conversationId = currentConversationId;
				if (!conversationId) {
					conversationId = crypto.randomUUID();
					conversations[conversationId] = {};
					currentConversationId = conversationId;
					console.log('Generated new conversation ID:', conversationId);
				}

				// Call the API to send the message with streaming
				const response = await fetch('/api/chat', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ 
						messages: [{ role: 'user', content: userMessage }],
						parentId: currentNodeId,
						conversationId: conversationId
					}),
				});

				if (response.ok) {
					// Handle streaming response
					const reader = response.body?.getReader();
						const decoder = new TextDecoder();
					let accumulatedResponse = '';
						
					if (reader) {
						try {
						while (true) {
							const { done, value } = await reader.read();
							if (done) break;
							
							const chunk = decoder.decode(value);
							const lines = chunk.split('\n');
							
							for (const line of lines) {
								if (line.startsWith('data: ')) {
									const data = line.slice(6);
									if (data === '[DONE]') {
											// Streaming complete, clear pending state and reload chat history
											console.log('✅ Streaming complete, finishing word streaming...');
											streamingActive = false;
											stopWordStreaming(); // Finish any remaining words immediately
											
											// Wait a moment for word streaming to complete, then reload
											setTimeout(async () => {
												pendingUserMessage = null;
												streamingAIResponse = '';
												autoScrollRequested = true;
												await loadChatHistory();
												console.log('Chat history reloaded, current tree size:', Object.keys(currentChatTree).length);

											// Navigate to the latest AI response in the current conversation
											// Find the newest user message with the content we just sent
											const newUserMessage = Object.values(currentChatTree)
												.filter(node => 
													node.role === 'user' && 
													node.content === userMessage &&
													node.conversationId === currentConversationId
												)
												.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

											if (newUserMessage) {
												// Find the AI response that's a child of this specific user message
												const latestAIMessage = Object.values(currentChatTree).find(node =>
													node.role === 'assistant' &&
													node.parentId === newUserMessage.id
												);

												if (latestAIMessage) {
													currentNodeId = latestAIMessage.id;
													console.log('Navigated to latest AI response:', latestAIMessage.id, 'for user message:', newUserMessage.id);
													
													// Move pending sources to the actual AI message ID
													if (messageSources['pending']) {
														messageSources[latestAIMessage.id] = messageSources['pending'];
														delete messageSources['pending'];
														console.log('📚 Moved sources from pending to AI message:', latestAIMessage.id);
													}
													
													// Ensure we save the UI state with the correct conversation
													saveUIState();
										} else {
													console.log('No AI response found for new user message:', newUserMessage.id);
												}
											} else {
												console.log('No new user message found with content:', userMessage);
												console.log('Available messages:', Object.values(currentChatTree).map(m => ({ 
													role: m.role, 
													content: m.content.substring(0, 50), 
													parentId: m.parentId,
													conversationId: m.conversationId 
												})));
											}
												}, 200); // Wait 200ms for word streaming to complete
										break;
										} else {
									try {
										const parsed = JSON.parse(data);
										if (parsed.chunk) {
											if (!streamingActive) {
												streamingActive = true;
												startWordStreaming(); // Start word-by-word streaming
											}
											
											// Add words from this chunk to the buffer
											addWordsToBuffer(parsed.chunk);
											console.log('📝 Chunk received, added to word buffer:', parsed.chunk);
											console.log('📄 Words in buffer:', wordBuffer.length, 'Current display length:', streamingAIResponse.length);
										} else if (parsed.type === 'sources' && parsed.sources) {
											// Store source information temporarily for the pending message
											messageSources['pending'] = parsed.sources;
											console.log('📚 Sources received for pending message:', parsed.sources);
										}
									} catch (e) {
										console.log('Failed to parse chunk data:', data, e);
									}
								}
							}
						}
							}
						} finally {
							reader.releaseLock();
					}
										} else {
						// Fallback: reload chat history if streaming fails
						streamingActive = false;
						stopWordStreaming();
						pendingUserMessage = null;
						streamingAIResponse = '';
						await loadChatHistory();

						// Navigate to the latest AI response in the current conversation
						const newUserMessage = Object.values(currentChatTree)
							.filter(node => 
								node.role === 'user' && 
								node.content === userMessage &&
								node.conversationId === currentConversationId
							)
							.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

						if (newUserMessage) {
							const latestAIMessage = Object.values(currentChatTree).find(node =>
								node.role === 'assistant' &&
								node.parentId === newUserMessage.id
							);

							if (latestAIMessage) {
								currentNodeId = latestAIMessage.id;
								console.log('Navigated to latest AI response:', latestAIMessage.id);
								saveUIState();
							}
						}
														}
													} else {
					const error = await response.text();
					console.error('Chat API error:', error);
					alert('Failed to send message. Please try again.');
													}
												} catch (error) {
				console.error('Chat error:', error);
				alert('Error sending message. Please try again.');
				// Clear pending state on error
				streamingActive = false;
				stopWordStreaming();
				pendingUserMessage = null;
				streamingAIResponse = '';
			} finally {
				isLoading = false;
			}
		}
	}

	// Navigation functions
	function goToPreviousBranch() {
		if (currentNodeId) {
			const parentId = goToParent(currentChatTree, currentNodeId);
			if (parentId && currentChatTree[parentId] && currentChatTree[parentId].conversationId === currentConversationId) {
				currentNodeId = parentId;
				console.log('Navigated to parent:', parentId);
			}
		}
	}

	function goToNextBranch() {
		if (currentNodeId) {
			const nextId = goToNext(currentChatTree, currentNodeId);
			if (nextId && currentChatTree[nextId] && currentChatTree[nextId].conversationId === currentConversationId) {
				currentNodeId = nextId;
				console.log('Navigated to next:', nextId);
			}
		}
	}

	// Version navigation functions (ChatGPT-style)
	function getAssistantChildId(messageId: string): string | null {
		const node = currentChatTree[messageId];
		if (!node) return null;
		const assistantChildren = node.children
			.map((id) => currentChatTree[id])
			.filter((n) => n && n.role === 'assistant')
			.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
		return assistantChildren.length > 0 ? assistantChildren[0].id : null;
	}

	// Prefer the latest assistant in the subtree; if none, fallback to latest leaf
	function getLatestAssistantInSubtree(tree: ChatTree, startId: string): string {
		let currentId = startId;
		let lastAssistantId: string | null = tree[currentId]?.role === 'assistant' ? currentId : null;
		while (true) {
			const node = tree[currentId];
			if (!node || node.children.length === 0) break;
			const sortedChildren = node.children
				.map((id) => tree[id])
				.filter((n) => n)
				.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
			const latestChild = sortedChildren[sortedChildren.length - 1];
			if (latestChild.role === 'assistant') lastAssistantId = latestChild.id;
			currentId = latestChild.id;
		}
		return lastAssistantId ?? currentId;
	}

	function getDefaultNodeIdForConversation(tree: ChatTree): string | null {
		const nodes = Object.values(tree).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
		if (nodes.length === 0) return null;
		// Prefer the latest assistant message
		for (let i = nodes.length - 1; i >= 0; i--) {
			if (nodes[i].role === 'assistant') return getLatestAssistantInSubtree(tree, nodes[i].id);
		}
		// Else pick last user message's assistant child if present
		const last = nodes[nodes.length - 1];
		if (last.role === 'user') {
			const child = last.children
				.map((id) => tree[id])
				.find((n) => n && n.role === 'assistant');
			if (child) return getLatestAssistantInSubtree(tree, child.id);
		}
		// Fallback to the latest assistant or the last node
		return getLatestAssistantInSubtree(tree, last.id);
	}

	function navigateToPreviousVersion(messageId: string) {
		console.log('Attempting to navigate to previous version of:', messageId);
		const previousVersionId = goToPreviousVersion(currentChatTree, messageId);
		console.log('Previous version ID:', previousVersionId);
		if (previousVersionId) {
			const assistantId = getAssistantChildId(previousVersionId);
			const targetId = assistantId ?? previousVersionId;
			currentNodeId = getLatestAssistantInSubtree(currentChatTree, targetId);
			console.log('Successfully navigated to previous version:', currentNodeId);
			// Trigger reactive update
			currentNodeId = currentNodeId;
		} else {
			console.log('No previous version available for message:', messageId);
		}
	}

	function navigateToNextVersion(messageId: string) {
		console.log('Attempting to navigate to next version of:', messageId);
		const nextVersionId = goToNextVersion(currentChatTree, messageId);
		console.log('Next version ID:', nextVersionId);
		if (nextVersionId) {
			const assistantId = getAssistantChildId(nextVersionId);
			const targetId = assistantId ?? nextVersionId;
			currentNodeId = getLatestAssistantInSubtree(currentChatTree, targetId);
			console.log('Successfully navigated to next version:', currentNodeId);
			// Trigger reactive update
			currentNodeId = currentNodeId;
		} else {
			console.log('No next version available for message:', messageId);
		}
	}

	function getMessageVersionInfo(messageId: string) {
		const versionInfo = getVersionNavigationInfo(currentChatTree, messageId);
		console.log('Version info for message', messageId, ':', versionInfo);
		return versionInfo;
	}

	// Regeneration functions
	async function regenerateAIResponse(messageId: string) {
		console.log('Regenerating AI response for message:', messageId);
		
		try {
			isLoading = true;
			
			// Call the regeneration API
			const response = await fetch('/api/chat', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messageId })
			});

			if (response.ok) {
				// Handle streaming response from regeneration API
				const reader = response.body?.getReader();
				const decoder = new TextDecoder();
				let accumulatedResponse = '';
					
				if (reader) {
					try {
						while (true) {
							const { done, value } = await reader.read();
							if (done) break;
							
							const chunk = decoder.decode(value);
							const lines = chunk.split('\n');
							
							for (const line of lines) {
								if (line.startsWith('data: ')) {
									const data = line.slice(6);
									if (data === '[DONE]') {
										// Regeneration complete, reload chat history
										console.log('Regeneration streaming complete, reloading chat history...');
										await loadChatHistory();
										
										// Navigate to the new regenerated response
										const regeneratedMessage = Object.values(currentChatTree).find(node =>
											node.role === 'assistant' &&
											node.parentId === currentChatTree[messageId]?.parentId &&
											node.id !== messageId
										);

										if (regeneratedMessage) {
											currentNodeId = regeneratedMessage.id;
											console.log('Navigated to regenerated AI response:', regeneratedMessage.id);
											saveUIState();
										}
										break;
									} else {
										try {
											const parsed = JSON.parse(data);
											if (parsed.chunk) {
												accumulatedResponse += parsed.chunk;
												console.log('Received regeneration chunk:', parsed.chunk);
											} else if (parsed.type === 'sources' && parsed.sources) {
												// Store source information for the regenerated message
												messageSources[messageId] = parsed.sources;
												console.log('Sources received for regenerated message:', parsed.sources);
											}
										} catch (e) {
											console.log('Failed to parse regeneration chunk data:', data, e);
										}
									}
								}
							}
						}
					} finally {
						reader.releaseLock();
					}
				} else {
					// Fallback: reload chat history if streaming fails
					console.log('No reader available, falling back to direct reload');
					await loadChatHistory();
				}
			} else {
				const error = await response.text();
				console.error('Failed to regenerate message:', error);
				alert('Failed to regenerate message. Please try again.');
			}
		} catch (error) {
			console.error('Error regenerating message:', error);
			alert('Error regenerating message. Please try again.');
		} finally {
			isLoading = false;
		}
	}

	function navigateToPreviousRegeneration(messageId: string) {
		console.log('Attempting to navigate to previous regeneration of:', messageId);
		const previousRegenerationId = goToPreviousRegeneration(currentChatTree, messageId);
		console.log('Previous regeneration ID:', previousRegenerationId);
		if (previousRegenerationId) {
			currentNodeId = previousRegenerationId;
			console.log('Successfully navigated to previous regeneration:', currentNodeId);
			// Trigger reactive update
			currentNodeId = currentNodeId;
		} else {
			console.log('No previous regeneration available for message:', messageId);
		}
	}

	function navigateToNextRegeneration(messageId: string) {
		console.log('Attempting to navigate to next regeneration of:', messageId);
		const nextRegenerationId = goToNextRegeneration(currentChatTree, messageId);
		console.log('Next regeneration ID:', nextRegenerationId);
		if (nextRegenerationId) {
			currentNodeId = nextRegenerationId;
			console.log('Successfully navigated to next regeneration:', currentNodeId);
			// Trigger reactive update
			currentNodeId = currentNodeId;
		} else {
			console.log('No next regeneration available for message:', messageId);
		}
	}

	function getAIRegenerationInfo(messageId: string) {
		const regenInfo = getAIRegenerationInfoUtil(currentChatTree, messageId);
		console.log('Regeneration info for message', messageId, ':', regenInfo);
		return regenInfo;
	}

	// Load chat history on mount
	onMount(() => {
		loadUIState();
		loadChatHistory();
	});

	// Auto-scroll to bottom when messages change, pending messages appear, or streaming updates
	$: if (messages.length > 0 || pendingUserMessage || streamingAIResponse) {
		if (autoScrollRequested || pendingUserMessage || streamingActive) {
			if (streamingActive) {
				console.log('🔄 Auto-scrolling due to streaming update, response length:', streamingAIResponse.length);
			}
		setTimeout(() => {
			const chatContainer = document.getElementById('chat-container');
			if (chatContainer) {
					chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
				}
				autoScrollRequested = false;
			}, 50);
		}
	}

	// Save UI state on component destroy
	onDestroy(() => {
		saveUIState();
		stopWordStreaming(); // Clean up any active streaming
	});

	// Copy button functionality for AI responses
	function copyAIResponse(event: Event) {
		const button = event.currentTarget as HTMLButtonElement;
		const aiResponseContainer = button.closest('.ai-response-container');
		
		if (!aiResponseContainer) return;
		
		// Find the message content within the AI response container
		const messageContent = aiResponseContainer.querySelector('.markdown-content');
		if (!messageContent) return;
		
		// Get the text content (without HTML tags)
		const textToCopy = messageContent.textContent || (messageContent as HTMLElement).innerText || '';
		
		// Use modern clipboard API
		if (navigator.clipboard && window.isSecureContext) {
			navigator.clipboard.writeText(textToCopy).then(() => {
				// Show success feedback
				showCopyFeedback(button, true);
			}).catch(err => {
				console.error('Failed to copy: ', err);
				// Fallback to older method
				fallbackCopyTextToClipboard(textToCopy, button);
			});
		} else {
			// Fallback for older browsers or non-secure contexts
			fallbackCopyTextToClipboard(textToCopy, button);
		}
	}
	
	function fallbackCopyTextToClipboard(text: string, button: HTMLButtonElement) {
		const textArea = document.createElement('textarea');
		textArea.value = text;
		textArea.style.position = 'fixed';
		textArea.style.left = '-999999px';
		textArea.style.top = '-999999px';
		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();
		
		try {
			const successful = document.execCommand('copy');
			if (successful) {
				showCopyFeedback(button, true);
			} else {
				showCopyFeedback(button, false);
			}
		} catch (err) {
			console.error('Fallback copy failed: ', err);
			showCopyFeedback(button, false);
		}
		
		document.body.removeChild(textArea);
	}
	
	function showCopyFeedback(button: HTMLButtonElement, success: boolean) {
		const originalText = button.innerHTML;
		const originalClasses = button.className;
		
		if (success) {
			button.innerHTML = `
				<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
				</svg>
				Copied!
			`;
			button.className = originalClasses + ' copied';
		} else {
			button.innerHTML = `
				<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
				</svg>
				Failed
			`;
			button.className = originalClasses + ' failed';
		}
		
		// Revert after 1.5 seconds
		setTimeout(() => {
			button.innerHTML = originalText;
			button.className = originalClasses;
		}, 1500);
	}

	// File upload handler
	async function handleFileUpload() {
		const fileInput = document.createElement('input');
		fileInput.type = 'file';
		fileInput.accept = '.txt,.pdf';
		fileInput.onchange = async (event) => {
			const target = event.target as HTMLInputElement;
			const file = target.files?.[0];
			
			if (file) {
				selectedFile = file;
				await uploadFile(file);
			}
		};
		fileInput.click();
	}

	async function uploadFile(file: File) {
		try {
			isUploading = true;
			uploadMessage = '📤 Uploading document...';

			const formData = new FormData();
			formData.append('file', file);
			if (currentConversationId) {
				formData.append('conversationId', currentConversationId);
			}

			const response = await fetch('/api/upload', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				const result = await response.json();
				uploadMessage = `✅ Document uploaded successfully! Created ${result.chunks} chunks.`;
				
				// Clear the message after 5 seconds
				setTimeout(() => {
					uploadMessage = '';
				}, 5000);
			} else {
				const error = await response.json();
				uploadMessage = `❌ Upload failed: ${error.error || 'Unknown error'}`;
			}
		} catch (error) {
			console.error('Upload error:', error);
			uploadMessage = '❌ Upload failed: Network error';
		} finally {
			isUploading = false;
			selectedFile = null;
		}
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
					<p class="text-sm text-gray-600">Your previous conversations</p>
				</div>
				
				<div class="flex-1 overflow-y-auto p-3 lg:p-4 space-y-3 max-h-64 lg:max-h-none">
					{#if conversationList.length === 0}
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
						{#each conversationList as conversation}
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
												{conversation.lastMessage}
											</p>
											<p class="text-xs text-gray-400">
												{new Date(conversation.createdAt).toLocaleDateString()}
													</p>
												</div>
											</div>
										</button>
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
					
					<!-- Branch Navigation -->
					{#if currentNodeId && navigationInfo.hasParent}
						<div class="flex items-center space-x-2">
							<button
								on:click={goToPreviousBranch}
								disabled={!navigationInfo.hasParent}
								class="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
								title="Go to parent message"
								aria-label="Navigate to parent message in conversation tree"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
								</svg>
							</button>
							
							<span class="text-xs text-gray-500 font-medium">
								{currentNodeId ? "Branch View" : "Main Conversation"}
							</span>
							
							<button
								on:click={goToNextBranch}
								disabled={!navigationInfo.hasNext}
								class="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
								title="Go to next message"
								aria-label="Navigate to next message in conversation tree"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
								</svg>
							</button>
							
							<button
								on:click={() => {
									const rootMessage = Object.values(currentChatTree).find(node => node.parentId === null);
									if (rootMessage) {
										currentNodeId = rootMessage.id;
									}
								}}
								class="px-3 py-1.5 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors font-medium"
								title="Back to full conversation"
							>
								<svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
								</svg>
								Full Chat
							</button>
						</div>
					{/if}
					
					<div class="flex items-center space-x-2">
						<div class="w-2 h-2 lg:w-3 lg:h-3 bg-green-500 rounded-full animate-pulse"></div>
						<span class="text-xs lg:text-sm text-gray-600 font-medium">Online</span>
					</div>
				</div>
			</div>

			<!-- Chat Messages Area -->
			<div class="flex-1 bg-white overflow-hidden min-h-0">
				<div id="chat-container" class="h-full overflow-y-auto p-3 lg:p-6 space-y-4 lg:space-y-6">

					
					{#if displayMessages.length === 0}
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
					{:else}
					{#each displayMessages as message}
						<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
								<div class="max-w-xs sm:max-w-md lg:max-w-2xl px-3 lg:px-6 py-3 lg:py-4 rounded-2xl {message.role === 'user' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-800 border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow'}">
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
										{#if message.version && message.version > 1}
											<span class="text-xs text-white/70 bg-white/20 px-2 py-1 rounded-full">v{message.version}</span>
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
												{#if message.isEdited}
													<div class="mt-2 flex items-center space-x-2">
														<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
															<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
															</svg>
															Edited v{message.version || 1}
														</span>
													</div>
												{/if}
										</div>
										
										<div class="mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-white/30 flex items-center justify-between">
												{#if message.id && !message.id.startsWith('temp-')}
												<div class="flex items-center space-x-2">
													<button
														on:click={() => startEditing(message)}
														class="text-xs text-white hover:text-blue-100 font-medium flex items-center space-x-1 hover:bg-white/20 px-1.5 lg:px-2 py-1 rounded transition-colors"
													>
														<svg class="w-2.5 h-2.5 lg:w-3 lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
														</svg>
														<span>Edit</span>
													</button>
													
														<!-- Version navigation arrows (ChatGPT-style) -->
														{#if message.role === 'user'}
															{@const versionInfo = getMessageVersionInfo(message.id)}
															{#if versionInfo.hasVersions}
																<div class="flex items-center space-x-2 ml-3 px-2 py-1 bg-white/10 rounded-lg border border-white/20">
															<button
																		on:click={() => navigateToPreviousVersion(message.id)}
																		disabled={!versionInfo.canGoToPrevious}
																		class="text-xs text-white/80 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed font-medium flex items-center space-x-1 hover:bg-white/20 px-1.5 py-1 rounded transition-colors"
																		title="Previous version"
																		aria-label="Go to previous version of this message"
															>
																<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
																</svg>
															</button>
																	<span class="text-xs text-white/80 font-semibold px-2 bg-white/10 rounded border border-white/20">
																		{versionInfo.currentVersion} / {versionInfo.totalVersions}
															</span>
															<button
																		on:click={() => navigateToNextVersion(message.id)}
																		disabled={!versionInfo.canGoToNext}
																		class="text-xs text-white/80 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed font-medium flex items-center space-x-1 hover:bg-white/20 px-1.5 py-1 rounded transition-colors"
																		title="Next version"
																		aria-label="Go to next version of this message"
															>
																<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
																</svg>
															</button>
														</div>
															{/if}
													{/if}
												</div>
											{/if}
										</div>
									{/if}
								{:else}
									<div class="ai-response-container">
										<div class="flex items-center space-x-2 lg:space-x-3 mb-2">
											<div class="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
												<svg class="w-3 h-3 lg:w-4 lg:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
												</svg>
											</div>
											<span class="text-xs lg:text-sm font-semibold text-blue-600">AI Assistant</span>
										</div>
										<MessageRenderer 
											content={message.content} 
											isLoading={false}
											isError={false}
											sources={messageSources[message.id] || []}
										/>
										
										<!-- Regeneration controls and copy button -->
										<div class="mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-gray-200 flex items-center justify-between">
											<div class="flex items-center space-x-2">
												<!-- Regenerate button -->
												<button
													on:click={() => regenerateAIResponse(message.id)}
													disabled={isLoading}
													class="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1 hover:bg-blue-50 px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
													title="Regenerate this AI response"
													aria-label="Regenerate AI response"
												>
													<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
													</svg>
													<span>Regenerate</span>
												</button>
												
												<!-- Regeneration navigation -->
												{#if getAIRegenerationInfo(message.id).hasRegenerations}
													{@const regenInfo = getAIRegenerationInfo(message.id)}
													<div class="flex items-center space-x-2 ml-3 px-2 py-1 bg-blue-50 rounded-lg border border-blue-200">
														<button
															on:click={() => navigateToPreviousRegeneration(message.id)}
															disabled={!regenInfo.canGoToPrevious}
															class="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium flex items-center space-x-1 hover:bg-blue-100 px-1.5 py-1 rounded transition-colors"
															title="Previous regeneration"
															aria-label="Go to previous regeneration of this response"
														>
															<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
															</svg>
														</button>
														<span class="text-xs text-blue-600 font-semibold px-2 bg-blue-100 rounded border border-blue-200">
															{regenInfo.currentVersion} / {regenInfo.totalVersions}
														</span>
														<button
															on:click={() => navigateToNextRegeneration(message.id)}
															disabled={!regenInfo.canGoToNext}
															class="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium flex items-center space-x-1 hover:bg-blue-100 px-1.5 py-1 rounded transition-colors"
															title="Next regeneration"
															aria-label="Go to next regeneration of this response"
														>
															<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
															</svg>
														</button>
													</div>
												{/if}
											</div>
											
											<!-- Copy button -->
											<button
												on:click={copyAIResponse}
												class="copy-button"
												aria-label="Copy AI response"
												title="Copy this AI response to clipboard"
											>
												<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
												</svg>
												Copy
											</button>
										</div>
									</div>
								{/if}
							</div>
						</div>
					{/each}

					<!-- Pending user message (shown immediately when submitted) -->
					{#if pendingUserMessage}
						<div class="flex justify-end">
							<div class="max-w-xs sm:max-w-md lg:max-w-2xl px-3 lg:px-6 py-3 lg:py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm hover:shadow-md transition-shadow">
								<div class="flex items-center space-x-2 lg:space-x-3 mb-2">
									<div class="w-6 h-6 lg:w-8 lg:h-8 bg-white/20 rounded-full flex items-center justify-center">
										<svg class="w-3 h-3 lg:w-4 lg:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
										</svg>
									</div>
									<span class="text-xs lg:text-sm font-semibold text-white/90">You</span>
								</div>
								<MessageRenderer 
									content={pendingUserMessage} 
									isLoading={false}
									isError={false}
									sources={[]}
								/>
							</div>
						</div>
					{/if}

					<!-- AI response (thinking state or streaming) -->
					{#if pendingUserMessage && isLoading}
						<div class="flex justify-start">
							<div class="max-w-xs sm:max-w-md lg:max-w-2xl px-3 lg:px-6 py-3 lg:py-4 rounded-2xl bg-white border-2 border-gray-100 shadow-sm hover:shadow-md transition-shadow">
								<div class="ai-response-container">
									<div class="flex items-center space-x-2 lg:space-x-3 mb-2">
										<div class="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
											<svg class="w-3 h-3 lg:w-4 lg:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
											</svg>
										</div>
										<span class="text-xs lg:text-sm font-semibold text-blue-600">AI Assistant</span>
									</div>
									
									{#if streamingAIResponse && streamingActive}
										<!-- Show streaming response -->
										<div class="relative">
											<MessageRenderer 
												content={streamingAIResponse} 
												isLoading={false}
												isError={false}
												sources={messageSources['pending'] || []}
											/>
											<!-- Typing cursor for active streaming -->
											<span class="inline-block w-0.5 h-4 bg-blue-500 ml-1 animate-pulse"></span>
										</div>
										
										<!-- Copy button for streaming AI response — safe isolated scope -->
										<button
											on:click={copyAIResponse}
											class="copy-button"
											aria-label="Copy AI response"
											title="Copy this AI response to clipboard"
										>
											<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
											</svg>
											Copy
										</button>

									{:else}
										<!-- Show thinking animation -->
									<div class="flex items-center space-x-2">
										<span class="text-sm lg:text-base text-gray-700 font-medium">Thinking</span>
										<div class="flex space-x-1">
											<div class="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-blue-500 rounded-full animate-bounce"></div>
											<div class="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
											<div class="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
										</div>
									</div>
									{/if}
								</div>
							</div>
						</div>
					{/if}
					{/if}
				</div>
			</div>

			<!-- Chat Input -->
			<div class="bg-white rounded-b-xl lg:rounded-br-xl shadow-sm border-t-2 border-gray-100 p-3 lg:p-6 flex-shrink-0">
				<!-- Upload Status Message -->
				{#if uploadMessage}
					<div class="mb-3 p-3 rounded-lg text-sm {uploadMessage.startsWith('✅') ? 'bg-green-100 text-green-800 border border-green-200' : uploadMessage.startsWith('❌') ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}">
						{uploadMessage}
					</div>
				{/if}
				
				<form on:submit={handleChatSubmit} class="flex space-x-2 lg:space-x-4">
					<!-- Upload Button -->
					<button
						type="button"
						on:click={handleFileUpload}
						class="px-3 lg:px-4 py-3 lg:py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-2 border-green-400 hover:border-green-500 rounded-xl lg:rounded-2xl transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
						disabled={isLoading || isUploading}
						aria-label="Upload file"
						title="Upload documents for Q&A"
					>
						{#if isUploading}
							<svg class="w-5 h-5 lg:w-6 lg:h-6 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
						{:else}
							<svg class="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
							</svg>
						{/if}
					</button>
					<div class="flex-1 relative">
						<input
							bind:value={input}
							type="text"
							placeholder="Ask me anything... I'm here to help!"
							class="w-full px-3 lg:px-6 py-3 lg:py-4 text-base lg:text-lg border-2 border-gray-200 rounded-xl lg:rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 resize-none hover:border-gray-300 focus:shadow-md"
							disabled={isLoading || isUploading}
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
						disabled={!input.trim() || isLoading || isUploading}
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

<style>
	/* Copy button styles for AI responses */
	.copy-button {
		cursor: pointer;
		font-size: 0.9em;
		margin-top: 0.5em;
		padding: 0.25rem 0.5rem;
		background-color: #f3f4f6;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		color: #6b7280;
		transition: all 0.2s ease-in-out;
		display: inline-flex;
		align-items: center;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.copy-button:hover {
		background-color: #e5e7eb;
		border-color: #9ca3af;
		color: #374151;
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.copy-button:focus {
		outline: none;
		box-shadow: 0 0 0 2px #3b82f6;
	}

	.copy-button.copied {
		color: #059669;
		background-color: #d1fae5;
		border-color: #10b981;
	}

	.copy-button.failed {
		color: #dc2626;
		background-color: #fee2e2;
		border-color: #ef4444;
	}

	/* AI response container positioning */
	.ai-response-container {
		position: relative;
	}
</style>

