<script lang="ts">
	export let content: string;
	export let isLoading: boolean = false;
	export let isError: boolean = false;

	// Simple markdown-like formatting function
	function formatContent(text: string): string {
		if (!text) return '';
		
		let formatted = text;
		
		// Headers
		formatted = formatted
			.replace(/^### (.*$)/gim, '<h3>$1</h3>')
			.replace(/^## (.*$)/gim, '<h2>$1</h2>')
			.replace(/^# (.*$)/gim, '<h1>$1</h1>');
		
		// Code blocks
		formatted = formatted
			.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 rounded-lg p-4 overflow-x-auto"><code>$1</code></pre>');
		
		// Inline code
		formatted = formatted
			.replace(/`([^`\n]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
		
		// Bold and italic
		formatted = formatted
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.*?)\*/g, '<em>$1</em>');
		
		// Lists
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
			.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 italic">$1</blockquote>');
		
		// Tables
		formatted = formatted
			.replace(/\|(.+)\|/g, function(match, content) {
				const cells = content.split('|').map((cell: string) => cell.trim());
				const isHeader = match.includes('---');
				
				if (isHeader) {
					return ''; // Skip separator rows
				}
				
				const cellHtml = cells.map((cell: string) => {
					if (cell === '') return '';
					return `<td class="border border-gray-300 px-3 py-2">${cell}</td>`;
				}).join('');
				
				return `<tr class="border-b border-gray-300">${cellHtml}</tr>`;
			});
		
		// Wrap table rows in table element
		formatted = formatted
			.replace(/(<tr[^>]*>.*?<\/tr>)/gs, '<div class="overflow-x-auto"><table class="min-w-full border-collapse border border-gray-300 mb-4">$1</table></div>');
		
		// Horizontal rules
		formatted = formatted
			.replace(/^---$/gim, '<hr class="border-t border-gray-300 my-6">');
		
		// Links
		formatted = formatted
			.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>');
		
		// Line breaks
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
			.replace(/<p><hr><\/p>/g, '<hr>');
		
		// Final cleanup
		formatted = formatted
			.replace(/^<p>/, '')
			.replace(/<\/p>$/, '');
		
		return formatted;
	}
</script>

{#if isLoading}
	<div class="flex items-center space-x-2">
		<span>Regenerating response...</span>
		<div class="flex space-x-1">
			<div class="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-blue-500 rounded-full animate-bounce"></div>
			<div class="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
			<div class="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
		</div>
	</div>
{:else}
	<div class="prose prose-sm max-w-none {isError ? 'text-red-700' : 'text-gray-800'} markdown-content">
		{@html formatContent(content)}
	</div>
{/if}

<style>
	/* Custom styles for markdown content */
	:global(.markdown-content) {
		/* Headings */
		:global(h1) {
			@apply text-2xl font-bold text-gray-900 mb-4 mt-6;
		}
		:global(h2) {
			@apply text-xl font-bold text-gray-900 mb-3 mt-5;
		}
		:global(h3) {
			@apply text-lg font-semibold text-gray-900 mb-2 mt-4;
		}

		/* Paragraphs */
		:global(p) {
			@apply mb-4 leading-relaxed;
		}

		/* Lists */
		:global(ul), :global(ol) {
			@apply mb-4 pl-6;
		}
		:global(li) {
			@apply mb-2;
		}
		:global(ul li) {
			@apply list-disc;
		}
		:global(ol li) {
			@apply list-decimal;
		}

		/* Code blocks */
		:global(pre) {
			@apply bg-gray-100 rounded-lg p-4 overflow-x-auto mb-4;
		}
		:global(pre code) {
			@apply text-sm font-mono text-gray-800;
		}

		/* Inline code */
		:global(code) {
			@apply bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800;
		}

		/* Links */
		:global(a) {
			@apply text-blue-600 hover:text-blue-800 underline;
		}

		/* Blockquotes */
		:global(blockquote) {
			@apply border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 italic;
		}

		/* Tables */
		:global(table) {
			@apply min-w-full border-collapse border border-gray-300 mb-4;
		}
		:global(th), :global(td) {
			@apply border border-gray-300 px-3 py-2;
		}
		:global(th) {
			@apply bg-gray-100 font-semibold;
		}

		/* Horizontal rules */
		:global(hr) {
			@apply border-t border-gray-300 my-6;
		}

		/* Strong and emphasis */
		:global(strong) {
			@apply font-semibold;
		}
		:global(em) {
			@apply italic;
		}
	}
</style>
