<script lang="ts">
	import { onMount } from 'svelte';

	let messages: any[] = [];
	let chatHistory: any[] = [];
	let input = '';
	let isLoading = false;
	let currentStreamingMessage = '';
	let selectedConversationId: string | null = null;
	let showHistory = true;
	
	// Enhanced forking and editing state
	let editingMessageId: string | null = null;
	let editingContent = '';
	let isEditing = false;
	let editingMessageIndex: number = -1;
	
	// Forking state
	let currentBranchId: string | null = null;
	let availableBranches: any[] = [];
	let showBranchSelector = false;
	
	// Version control state
	let messageVersions: Map<string, any[]> = new Map(); // messageId -> versions[]
	let currentVersions: Map<string, number> = new Map(); // messageId -> current version index
	let editedMessages: Set<string> = new Set(); // Track which messages have been edited
	
	// Conversation branching state
	let conversationBranches: Map<string, any[]> = new Map(); // branchId -> messages[]
	let branchHistory: Map<string, { original: any[], edited: any[] }> = new Map(); // messageId -> { original, edited }
	

	
	// Input focus management
	let inputElement: HTMLInputElement;
	
	// Keyboard shortcuts
	function handleKeydown(event: KeyboardEvent) {
		// Ctrl/Cmd + Enter to submit
		if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
			event.preventDefault();
			if (input.trim() && !isLoading && !isEditing) {
				handleChatSubmit(event);
			}
		}
		
		// Escape to cancel editing
		if (event.key === 'Escape' && isEditing) {
			event.preventDefault();
			cancelEditing();
		}
		
		// Focus input when typing anywhere (except in input fields)
		if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && !isEditing) {
			const target = event.target as HTMLElement;
			if (target && !target.matches('input, textarea, [contenteditable]')) {
				if (inputElement) {
					inputElement.focus();
				}
			}
		}
	}

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
		cancelEditing();
		
		// Clear version data for new chat
		messageVersions.clear();
		currentVersions.clear();
		editedMessages.clear();
		
		// Clear branch data for new chat
		conversationBranches.clear();
		currentBranchId = null;
		branchHistory.clear();
		
		// Focus on input after starting new chat
		setTimeout(() => {
			if (inputElement) {
				inputElement.focus();
			}
		}, 100);
	}

	// Delete a conversation
	async function deleteConversation(conversationId: string) {
		if (confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
			try {
				const response = await fetch(`/api/chat/${conversationId}`, {
					method: 'DELETE',
				});
				
				if (response.ok) {
					// Remove from local state
					chatHistory = chatHistory.filter(conv => conv.id !== conversationId);
					
					// If this was the currently selected conversation, clear it
					if (selectedConversationId === conversationId) {
						messages = [];
						selectedConversationId = null;
					}
				} else {
					console.error('Failed to delete conversation');
				}
			} catch (error) {
				console.error('Error deleting conversation:', error);
			}
		}
	}

	// Load a specific conversation
	async function loadConversation(conversation: any) {
		messages = conversation.messages;
		selectedConversationId = conversation.id;
		showHistory = false;
		cancelEditing();
		
		// Initialize version control for messages that have been edited
		initializeMessageVersions();
		
		// Focus on input after loading conversation
		setTimeout(() => {
			if (inputElement) {
				inputElement.focus();
			}
		}, 100);
	}
	
	// Initialize message versions from database
	function initializeMessageVersions() {
		console.log('🔧 [initializeMessageVersions] Starting initialization');
		
		// Don't clear existing version data if we already have it
		const existingVersions = Array.from(messageVersions.keys());
		if (existingVersions.length > 0) {
			console.log('🔧 [initializeMessageVersions] Preserving existing versions:', existingVersions);
			return;
		}
		
		// This would typically load version information from the database
		// For now, we'll check if messages have been edited by looking for forks
		messages.forEach((message, index) => {
			// Check if this message has been edited (has a fork)
			// This is a simplified check - in a real implementation, you'd query the database
			if (message.updatedAt && message.updatedAt !== message.createdAt) {
				// This message has been edited, so it might have versions
				// For now, we'll add a placeholder version
				addMessageVersion(message.id, { ...message });
				editedMessages.add(message.id);
			}
		});
		
		console.log('🔧 [initializeMessageVersions] Initialization complete');
	}



	// Start editing a message in current conversation
	function startEditingMessage(messageIndex: number) {
		const message = messages[messageIndex];
		if (message && message.role === 'user') {
			console.log('🔧 [startEditingMessage] Starting edit for message:', message);
			
			editingMessageId = message.id || `msg-${Date.now()}`;
			editingContent = message.content;
			isEditing = true;
			editingMessageIndex = messageIndex;
			
			// Don't add versions automatically - only when actually edited
			
			console.log('🔧 [startEditingMessage] Editing state:', { editingMessageId, editingContent, isEditing });
		}
	}

	// Cancel editing
	function cancelEditing() {
		editingMessageId = null;
		editingContent = '';
		isEditing = false;
		editingMessageIndex = -1;
	}
	
	// Copy message content
	function copyMessage(content: string) {
		navigator.clipboard.writeText(content).then(() => {
			console.log('Message copied to clipboard');
		}).catch(err => {
			console.error('Failed to copy message:', err);
		});
	}

	// Version control functions
	function getMessageVersionInfo(messageId: string): { version: number; totalVersions: number; hasVersions: boolean } {
		const versions = messageVersions.get(messageId) || [];
		const currentVersion = currentVersions.get(messageId) || 0;
		const hasVersions = editedMessages.has(messageId) && versions.length > 1;
		const hasBranches = branchHistory.has(messageId);
		
		console.log('🔧 [getMessageVersionInfo]', {
			messageId,
			versionsCount: versions.length,
			currentVersion,
			hasVersions,
			hasBranches,
			isEdited: editedMessages.has(messageId),
			versions: versions.map(v => ({ id: v.id, content: v.content.substring(0, 30) }))
		});
		
		return { 
			version: currentVersion + 1, 
			totalVersions: versions.length || 1,
			hasVersions: hasVersions || hasBranches
		};
	}
	
	function switchToVersion(messageId: string, versionIndex: number) {
		const versions = messageVersions.get(messageId);
		if (versions && versionIndex >= 0 && versionIndex < versions.length) {
			currentVersions.set(messageId, versionIndex);
			
			// Get the branch history for this message
			const branchData = branchHistory.get(messageId);
			if (branchData) {
				// Switch to the appropriate branch based on version
				if (versionIndex === 0) {
					// Original version - show original branch
					messages = [...branchData.original];
					currentBranchId = `original_${messageId}`;
					console.log('🔧 [switchToVersion] Switched to original branch:', {
						messageId,
						versionIndex,
						messagesLength: messages.length,
						originalContent: branchData.original.find(m => m.id === messageId)?.content.substring(0, 30)
					});
				} else {
					// Edited version - show edited branch
					messages = [...branchData.edited];
					currentBranchId = `edited_${messageId}`;
					console.log('🔧 [switchToVersion] Switched to edited branch:', {
						messageId,
						versionIndex,
						messagesLength: messages.length,
						editedContent: branchData.edited.find(m => m.id === messageId)?.content.substring(0, 30)
					});
				}
			} else {
				// Fallback to old behavior for messages without branch history
				const messageIndex = messages.findIndex(m => m.id === messageId);
				if (messageIndex !== -1) {
					messages[messageIndex] = { ...versions[versionIndex] };
					messages = [...messages]; // Trigger reactivity
					
					console.log('🔧 [switchToVersion] Fallback - updated single message:', {
						messageId,
						versionIndex,
						newContent: versions[versionIndex].content.substring(0, 30),
						totalVersions: versions.length
					});
				}
			}
		}
	}
	
	function addMessageVersion(messageId: string, version: any) {
		const versions = messageVersions.get(messageId) || [];
		versions.push(version);
		messageVersions.set(messageId, versions);
		currentVersions.set(messageId, versions.length - 1); // Set to latest version
		
		// Mark as edited if we have multiple versions
		if (versions.length > 1) {
			editedMessages.add(messageId);
		}
		
		console.log('🔧 [addMessageVersion]', {
			messageId,
			versionContent: version.content.substring(0, 30),
			totalVersions: versions.length,
			isEdited: editedMessages.has(messageId),
			allVersions: versions.map(v => ({ id: v.id, content: v.content.substring(0, 30) }))
		});
	}

	// Save edited message and create fork
	async function saveEditedMessage() {
		if (!editingContent.trim() || !selectedConversationId) return;
		
		console.log('🔧 [saveEditedMessage] Starting fork for message:', editingMessageId);
		
		// Get the current message to edit
		const messageToEdit = messages[editingMessageIndex];
		if (!messageToEdit) {
			console.error('🔧 [saveEditedMessage] No message found at index:', editingMessageIndex);
			return;
		}
		
		// Store the editing state before clearing it
		const currentEditingIndex = editingMessageIndex;
		const currentEditingContent = editingContent;
		const currentMessageToEdit = messageToEdit;
		
		// Clear editing state first
		cancelEditing();
		
		// Create conversation branches
		const originalBranch = [...messages]; // Complete original conversation
		const editedBranch = [
			...messages.slice(0, currentEditingIndex), // Messages before the edit
			{ ...currentMessageToEdit, content: currentEditingContent }, // Edited message
		];
		
		// Store both branches
		const branchId = `branch_${currentMessageToEdit.id}_${Date.now()}`;
		conversationBranches.set(`original_${branchId}`, originalBranch);
		conversationBranches.set(`edited_${branchId}`, editedBranch);
		branchHistory.set(currentMessageToEdit.id, {
			original: originalBranch,
			edited: editedBranch
		});
		
		console.log('🔧 [saveEditedMessage] Created branches:', {
			branchId,
			originalLength: originalBranch.length,
			editedLength: editedBranch.length
		});
		
		// Create fork by sending the edited message to the API
		try {
			// Build conversation context up to the edited message
			const conversationContext = messages.slice(0, currentEditingIndex);
			const messagesToSend = [
				...conversationContext,
				{ role: 'user', content: currentEditingContent }
			];
			
			console.log('🔧 [saveEditedMessage] Sending messages:', messagesToSend);
			
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages: messagesToSend,
					parentId: selectedConversationId,
					isEditing: true,
					editMessageId: currentMessageToEdit.id
				}),
			});

			if (response.ok) {
				console.log('🔧 [saveEditedMessage] Fork created successfully');
				
				// Handle streaming response to get the new AI response
				const reader = response.body?.getReader();
				if (reader) {
					const decoder = new TextDecoder();
					let newResponseContent = '';
					
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						
						const chunk = decoder.decode(value);
						const lines = chunk.split('\n');
						
						for (const line of lines) {
							if (line.startsWith('data: ')) {
								const data = line.slice(6);
								
								if (data === '[DONE]') {
									// Add the new AI response to the edited branch
									editedBranch.push({ role: 'assistant', content: newResponseContent });
									
									// Update the edited branch in storage
									conversationBranches.set(`edited_${branchId}`, editedBranch);
									branchHistory.set(currentMessageToEdit.id, {
										original: originalBranch,
										edited: editedBranch
									});
									
									// Set current branch to edited version
									currentBranchId = `edited_${branchId}`;
									messages = [...editedBranch];
									
									// Add version tracking for the edited message
									addMessageVersion(currentMessageToEdit.id, { ...currentMessageToEdit }); // Original
									addMessageVersion(currentMessageToEdit.id, { ...currentMessageToEdit, content: currentEditingContent }); // Edited
									
									console.log('🔧 [saveEditedMessage] Updated with edited branch:', {
										branchId: currentBranchId,
										messagesLength: messages.length,
										versions: messageVersions.get(currentMessageToEdit.id)?.length || 0
									});
									
									// Reload the conversation to get the updated structure
									await loadChatHistory();
									
									// Find and load the updated conversation
									const updatedConversation = chatHistory.find(conv => conv.id === selectedConversationId);
									if (updatedConversation) {
										await loadConversation(updatedConversation);
									}
									break;
								}
								
								try {
									const parsed = JSON.parse(data);
									if (parsed.chunk) {
										newResponseContent += parsed.chunk;
									}
								} catch (e) {
									// Ignore parsing errors for non-JSON data
								}
							}
						}
					}
				} else {
					console.error('🔧 [saveEditedMessage] Failed to create fork:', response.status);
				}
			}
		} catch (error) {
			console.error('🔧 [saveEditedMessage] Error creating fork:', error);
		}
	}



	// Format message content with enhanced markdown-like formatting
	function formatMessage(content: string): string {
		if (!content) return '';
		
		let formatted = content;
		
		// Headers (must be at start of line)
		formatted = formatted
			.replace(/^### (.*$)/gim, '<h3>$1</h3>')
			.replace(/^## (.*$)/gim, '<h2>$1</h2>')
			.replace(/^# (.*$)/gim, '<h1>$1</h1>');
		
		// Code blocks (must be before other formatting)
		formatted = formatted
			.replace(/```(\w+)?\n([\s\S]*?)```/g, function(match, lang, code) {
				const language = lang || 'text';
				return `<pre><code class="language-${language}">${code}</code></pre>`;
			})
			.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
		
		// Inline code
		formatted = formatted
			.replace(/`([^`\n]+)`/g, '<code>$1</code>');
		
		// Bold text
		formatted = formatted
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/__(.*?)__/g, '<strong>$1</strong>');
		
		// Italic text
		formatted = formatted
			.replace(/\*(.*?)\*/g, '<em>$1</em>')
			.replace(/_(.*?)_/g, '<em>$1</em>');
		
		// Enhanced table detection and formatting
		formatted = formatted.replace(/(\|.*\|[\r\n]+)+/g, function(match) {
			const lines = match.trim().split('\n');
			if (lines.length < 2) return match;
			
			// Check if it's a proper table (has header separator)
			const headerSeparator = lines[1];
			if (!headerSeparator.includes('|') || !headerSeparator.match(/\|[\s\-:|]+\|/)) {
				return match;
			}
			
			let tableHtml = '<div class="table-container"><table class="markdown-table">';
			
			lines.forEach((line, index) => {
				if (index === 1) return; // Skip separator line
				
				const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
				if (cells.length === 0) return;
				
				const tag = index === 0 ? 'th' : 'td';
				tableHtml += '<tr>';
				cells.forEach(cell => {
					tableHtml += `<${tag}>${cell}</${tag}>`;
				});
				tableHtml += '</tr>';
			});
			
			tableHtml += '</table></div>';
			return tableHtml;
		});
		
		// Process lists - convert to li elements first
		formatted = formatted
			.replace(/^(\s*)[*\-] (.*$)/gim, function(match, spaces, content) {
				const indent = spaces.length;
				return `<li style="margin-left: ${indent * 1.5}rem">${content}</li>`;
			})
			.replace(/^(\s*)(\d+)\. (.*$)/gim, function(match, spaces, number, content) {
				const indent = spaces.length;
				return `<li style="margin-left: ${indent * 1.5}rem">${content}</li>`;
			});
		
		// Blockquotes
		formatted = formatted
			.replace(/^> (.*$)/gim, '<blockquote><p>$1</p></blockquote>');
		
		// Horizontal rules
		formatted = formatted
			.replace(/^---$/gim, '<hr>')
			.replace(/^\*\*\*$/gim, '<hr>');
		
		// Links
		formatted = formatted
			.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
		
		// Line breaks and paragraphs
		formatted = formatted
			.replace(/\n\n/g, '</p><p>')
			.replace(/\n/g, '<br>');
		
		// Wrap in paragraph tags
		formatted = formatted
			.replace(/^(.*)$/gm, '<p>$1</p>');
		
		// Clean up empty paragraphs and fix list formatting
		formatted = formatted
			.replace(/<p><\/p>/g, '')
			.replace(/<p><br><\/p>/g, '')
			.replace(/<p><li>/g, '<li>')
			.replace(/<\/li><\/p>/g, '</li>')
			.replace(/<p><h1>/g, '<h1>')
			.replace(/<\/h1><\/p>/g, '</h1>')
			.replace(/<p><h2>/g, '<h2>')
			.replace(/<\/h2><\/p>/g, '</h2>')
			.replace(/<p><h3>/g, '<h3>')
			.replace(/<\/h3><\/p>/g, '</h3>')
			.replace(/<p><pre>/g, '<pre>')
			.replace(/<\/pre><\/p>/g, '</pre>')
			.replace(/<p><blockquote>/g, '<blockquote>')
			.replace(/<\/blockquote><\/p>/g, '</blockquote>')
			.replace(/<p><hr><\/p>/g, '<hr>')
			.replace(/<p><div class="table-container">/g, '<div class="table-container">')
			.replace(/<\/table><\/div><\/p>/g, '</table></div>');
		
		// Final cleanup
		formatted = formatted
			.replace(/^<p>/, '')
			.replace(/<\/p>$/, '');
		
		return formatted;
	}

	async function handleChatSubmit(event: Event) {
		event.preventDefault();
		if (input.trim() && !isLoading && !isEditing) {
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
										
										// Focus back to input after response is complete
										setTimeout(() => {
											if (inputElement) {
												inputElement.focus();
											}
										}, 100);
										break;
									}
									
									// Handle conversation ID from streaming response
									try {
										const parsed = JSON.parse(data);
										if (parsed.conversationId && !selectedConversationId) {
											selectedConversationId = parsed.conversationId;
											console.log('🔧 [handleChatSubmit] Set conversationId from response:', selectedConversationId);
										}
									} catch (e) {
										// Ignore parsing errors for non-JSON data
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
		// Focus on input when page loads
		setTimeout(() => {
			if (inputElement) {
				inputElement.focus();
			}
		}, 100);
		
		// Add keyboard event listener
		document.addEventListener('keydown', handleKeydown);
		
		// Cleanup on unmount
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
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
	<style>
		/* Enhanced markdown content styling */
		.markdown-content {
			line-height: 1.6;
		}
		
		.markdown-content h1 {
			font-size: 1.5rem;
			font-weight: 700;
			margin: 1rem 0 0.5rem 0;
			color: #1f2937;
		}
		
		.markdown-content h2 {
			font-size: 1.25rem;
			font-weight: 600;
			margin: 0.75rem 0 0.5rem 0;
			color: #374151;
		}
		
		.markdown-content h3 {
			font-size: 1.125rem;
			font-weight: 600;
			margin: 0.5rem 0 0.25rem 0;
			color: #4b5563;
		}
		
		.markdown-content p {
			margin: 0.5rem 0;
		}
		
		.markdown-content code {
			background-color: #f3f4f6;
			padding: 0.125rem 0.25rem;
			border-radius: 0.25rem;
			font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
			font-size: 0.875em;
			color: #dc2626;
		}
		
		.markdown-content pre {
			background-color: #1e293b;
			color: #e2e8f0;
			padding: 1rem;
			border-radius: 0.5rem;
			overflow-x: auto;
			margin: 0.75rem 0;
			border: 1px solid #334155;
			position: relative;
		}
		
		.markdown-content pre code {
			background-color: transparent;
			padding: 0;
			color: inherit;
			font-family: 'JetBrains Mono', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
			font-size: 0.875rem;
			line-height: 1.5;
		}
		
		/* Syntax highlighting for common languages */
		.markdown-content .language-javascript {
			color: #fbbf24;
		}
		
		.markdown-content .language-python {
			color: #34d399;
		}
		
		.markdown-content .language-html {
			color: #f87171;
		}
		
		.markdown-content .language-css {
			color: #60a5fa;
		}
		
		.markdown-content .language-sql {
			color: #a78bfa;
		}
		
		.markdown-content blockquote {
			border-left: 4px solid #3b82f6;
			padding-left: 1rem;
			margin: 0.75rem 0;
			color: #6b7280;
			font-style: italic;
		}
		
		.markdown-content ul, .markdown-content ol {
			margin: 0.5rem 0;
			padding-left: 1.5rem;
		}
		
		.markdown-content li {
			margin: 0.25rem 0;
		}
		
		.markdown-content a {
			color: #3b82f6;
			text-decoration: underline;
		}
		
		.markdown-content a:hover {
			color: #2563eb;
		}
		
		.markdown-content hr {
			border: none;
			border-top: 1px solid #e5e7eb;
			margin: 1rem 0;
		}
		
		/* Enhanced table styling */
		.table-container {
			overflow-x: auto;
			margin: 1rem 0;
			border-radius: 0.5rem;
			border: 1px solid #e5e7eb;
			box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
		}
		
		.markdown-table {
			width: 100%;
			border-collapse: collapse;
			background-color: white;
			font-size: 0.875rem;
		}
		
		.markdown-table th {
			background-color: #f8fafc;
			border: 1px solid #e2e8f0;
			padding: 0.75rem;
			text-align: left;
			font-weight: 600;
			color: #1e293b;
			position: sticky;
			top: 0;
			z-index: 10;
		}
		
		.markdown-table td {
			border: 1px solid #e2e8f0;
			padding: 0.75rem;
			text-align: left;
			color: #334155;
			vertical-align: top;
		}
		
		.markdown-table tr:nth-child(even) {
			background-color: #f8fafc;
		}
		
		.markdown-table tr:hover {
			background-color: #f1f5f9;
		}
		
		/* Responsive table */
		@media (max-width: 768px) {
			.markdown-table {
				font-size: 0.75rem;
			}
			
			.markdown-table th,
			.markdown-table td {
				padding: 0.5rem;
			}
			
			.table-container {
				margin: 0.5rem 0;
			}
		}
	</style>
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
							<div class="relative group">
								<button
									on:click={() => loadConversation(conversation)}
									class="w-full text-left p-3 lg:p-4 rounded-lg hover:bg-blue-50 transition-all duration-200 border-2 border-gray-100 hover:border-blue-200 hover:shadow-sm"
								>
									<div class="flex items-start space-x-3 lg:space-x-4">
										<div class="w-8 h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
											<svg class="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
											</svg>
										</div>
										<div class="flex-1 min-w-0">
											<p class="text-sm lg:text-base font-medium text-gray-900 truncate mb-1">
												{conversation.title}
											</p>
											<div class="flex items-center space-x-2 text-xs text-gray-500">
												<span>{new Date(conversation.updatedAt).toLocaleDateString()}</span>
												<span>•</span>
												<span>{conversation.messageCount} messages</span>
											</div>
										</div>
									</div>
								</button>
								<button
									on:click={() => deleteConversation(conversation.id)}
									class="absolute top-2 right-2 p-1 hover:bg-red-100 rounded-full text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
									title="Delete conversation"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
									</svg>
								</button>
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

					{#each messages as message, messageIndex}
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
									</div>
									<div class="prose prose-sm max-w-none">
										{#if isEditing && editingMessageIndex === messageIndex}
											<!-- Inline editing interface -->
											<div class="space-y-3">
												<textarea
													bind:value={editingContent}
													class="w-full px-3 lg:px-4 py-2 lg:py-3 text-sm lg:text-base border-2 border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all duration-200 resize-none bg-white text-gray-800"
													rows="3"
													placeholder="Edit your message..."
												></textarea>
												<div class="flex space-x-2">
													<button
														on:click={saveEditedMessage}
														disabled={!editingContent.trim() || isLoading}
														class="px-3 lg:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center space-x-1"
													>
														<svg class="w-3 h-3 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
														</svg>
														<span>Save & Regenerate</span>
													</button>
													<button
														on:click={cancelEditing}
														class="px-3 lg:px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium flex items-center space-x-1"
													>
														<svg class="w-3 h-3 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
														</svg>
														<span>Cancel</span>
													</button>
												</div>
											</div>
										{:else}
											<!-- Normal message display -->
										<div class="text-sm lg:text-base leading-relaxed whitespace-pre-wrap text-white font-medium">
											{message.content}
											{#if isLoading && message.role === 'assistant' && message.content === ''}
												<span class="inline-block w-2 h-4 bg-white animate-pulse"></span>
											{/if}
										</div>
										{/if}
									</div>
									<div class="mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-white/30 flex items-center justify-end space-x-2">
										<button
											on:click={() => copyMessage(message.content)}
											class="text-xs text-white hover:text-blue-100 font-medium flex items-center space-x-1 hover:bg-white/20 px-1.5 lg:px-2 py-1 rounded transition-colors"
											title="Copy message"
										>
											<svg class="w-2.5 h-2.5 lg:w-3 lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
											</svg>
											<span>Copy</span>
										</button>
										<button
											on:click={() => startEditingMessage(messageIndex)}
											class="text-xs text-white hover:text-blue-100 font-medium flex items-center space-x-1 hover:bg-white/20 px-1.5 lg:px-2 py-1 rounded transition-colors"
											title="Edit message"
										>
											<svg class="w-2.5 h-2.5 lg:w-3 lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
											</svg>
											<span>Edit</span>
										</button>
										
										<!-- Version Control Buttons -->
										{#if getMessageVersionInfo(message.id).hasVersions}
											<div class="flex items-center space-x-1 text-xs text-white">
												<button
													on:click={() => {
														const currentVersion = currentVersions.get(message.id) || 0;
														if (currentVersion > 0) {
															switchToVersion(message.id, currentVersion - 1);
														}
													}}
													disabled={currentVersions.get(message.id) === 0}
													class="hover:text-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
													title="Previous version"
												>
													<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
													</svg>
												</button>
												
												<span class="px-1 font-medium">
													{getMessageVersionInfo(message.id).version}/{getMessageVersionInfo(message.id).totalVersions}
												</span>
												
												<button
													on:click={() => {
														const currentVersion = currentVersions.get(message.id) || 0;
														const versions = messageVersions.get(message.id) || [];
														if (currentVersion < versions.length - 1) {
															switchToVersion(message.id, currentVersion + 1);
														}
													}}
													disabled={currentVersions.get(message.id) === (messageVersions.get(message.id)?.length || 1) - 1}
													class="hover:text-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
													title="Next version"
												>
													<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
													</svg>
										</button>
											</div>
										{/if}

									</div>
								{:else}
									<div class="flex items-center space-x-2 lg:space-x-3 mb-2">
										<div class="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
											<svg class="w-3 h-3 lg:w-4 lg:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
											</svg>
										</div>
										<span class="text-xs lg:text-sm font-semibold text-blue-600">AI Assistant</span>
									</div>
									<div class="prose prose-sm max-w-none">
										<div class="text-sm lg:text-base leading-relaxed whitespace-pre-wrap text-gray-800 font-medium markdown-content">
											{@html formatMessage(message.content)}
											{#if isLoading && message.role === 'assistant' && message.content === ''}
												<span class="inline-block w-2 h-4 bg-blue-500 animate-pulse"></span>
											{/if}
											{#if isLoading && message.role === 'assistant' && message.content && currentStreamingMessage === message.content}
												<span class="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1"></span>
											{/if}
										</div>
									</div>
									<div class="mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-gray-200 flex items-center justify-end space-x-2">
										<button
											on:click={() => copyMessage(message.content)}
											class="text-xs text-gray-600 hover:text-blue-600 font-medium flex items-center space-x-1 hover:bg-gray-100 px-1.5 lg:px-2 py-1 rounded transition-colors"
											title="Copy message"
										>
											<svg class="w-2.5 h-2.5 lg:w-3 lg:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
											</svg>
											<span>Copy</span>
										</button>
										
										<!-- Version Control Buttons for Assistant Messages -->
										{#if getMessageVersionInfo(message.id).hasVersions}
											<div class="flex items-center space-x-1 text-xs text-gray-600">
										<button
													on:click={() => {
														const currentVersion = currentVersions.get(message.id) || 0;
														if (currentVersion > 0) {
															switchToVersion(message.id, currentVersion - 1);
														}
													}}
													disabled={currentVersions.get(message.id) === 0}
													class="hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
													title="Previous version"
												>
													<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
											</svg>
										</button>
												
												<span class="px-1 font-medium">
													{getMessageVersionInfo(message.id).version}/{getMessageVersionInfo(message.id).totalVersions}
												</span>
												
										<button
													on:click={() => {
														const currentVersion = currentVersions.get(message.id) || 0;
														const versions = messageVersions.get(message.id) || [];
														if (currentVersion < versions.length - 1) {
															switchToVersion(message.id, currentVersion + 1);
														}
													}}
													disabled={currentVersions.get(message.id) === (messageVersions.get(message.id)?.length || 1) - 1}
													class="hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
													title="Next version"
												>
													<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
											</svg>
										</button>
									</div>
										{/if}
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
					<form on:submit={handleChatSubmit} class="flex space-x-2 lg:space-x-4">
						<div class="flex-1 relative">
							<input
								bind:value={input}
								bind:this={inputElement}
								type="text"
								placeholder={isEditing ? "Complete your edit above first..." : "Ask me anything... I'm here to help!"}
								class="w-full px-3 lg:px-6 py-3 lg:py-4 text-base lg:text-lg border-2 border-gray-200 rounded-xl lg:rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 resize-none hover:border-gray-300 focus:shadow-md"
								disabled={isLoading || isEditing}
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
							disabled={!input.trim() || isLoading || isEditing}
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
