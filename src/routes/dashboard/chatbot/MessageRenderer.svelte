<script lang="ts">
    import {marked} from 'marked';
    import { onMount, afterUpdate } from 'svelte';
    import { 
        createCodeBlock, 
        initializeHighlighting, 
        normalizeLanguage,
        isLanguageSupported 
    } from '$lib/utils/prism-highlight';
    
    export let content: string = '';
	export let isLoading: boolean = false;
	export let isError: boolean = false;
	export let sources: Array<{filename: string, content: string, similarity: number}> = [];

    let container: HTMLDivElement;
    let showSources = false;
    
    // Configure marked for security and features
    marked.setOptions({
        breaks: true, // Convert line breaks to <br>
        gfm: true,    // GitHub Flavored Markdown
        sanitize: false, // We'll handle sanitization ourselves
        smartLists: true,
        smartypants: true
    });
    
    // Simple HTML sanitization function
    function sanitizeHtml(html: string): string {
        // Remove potentially dangerous tags and attributes
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
            .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
    }
    


    // Render markdown to HTML with enhanced code block handling
    function renderMarkdown(text: string): string {
        try {
            let html = marked(text);
            
            // Process code blocks with language specification
            html = html.replace(
                /<pre><code class="language-([^"]*)"[^>]*>([\s\S]*?)<\/code><\/pre>/g,
                (match: string, languageFromFence: string, codeContent: string) => {
                    const decodedContent = codeContent
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'");
                    
                    const language = languageFromFence.toLowerCase() || 'none';
                    return createCodeBlock(decodedContent, language, {
                        showCopyButton: true,
                        showLineNumbers: false
                    });
                }
            );

            // Process code blocks without language specification
            html = html.replace(
                /<pre><code(?![^>]*class="language-)[^>]*>([\s\S]*?)<\/code><\/pre>/g,
                (match: string, codeContent: string) => {
                    const decodedContent = codeContent
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'");
                    
                    return createCodeBlock(decodedContent, 'none', {
                        showCopyButton: true,
                        showLineNumbers: false
                    });
                }
            );
            
            return sanitizeHtml(html);
        } catch (error) {
            console.error('Markdown rendering error:', error);
            // Fallback to plain text with line breaks
            return text.replace(/\n/g, '<br>');
        }
    }
    
    // Update content when it changes
    $: if (container && content) {
        container.innerHTML = renderMarkdown(content);
        // Use setTimeout to ensure DOM is updated
        setTimeout(() => {
            if (container) {
                initializeHighlighting(container);
            }
        }, 0);
    }
    
    onMount(() => {
        // Initial setup
        if (container) {
            initializeHighlighting(container);
        }
    });

    // Highlight code blocks after content updates
    afterUpdate(() => {
        if (container) {
            initializeHighlighting(container);
        }
    });
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
    <div class="space-y-4">
        <div
            bind:this={container}
            class="prose prose-sm max-w-none {isError ? 'text-red-700' : 'text-gray-800'} markdown-content"
        >
            {#if !content}
                <span class="text-gray-400">No content</span>
            {/if}
        </div>
        
        <!-- Source Information Section -->
        {#if sources && sources.length > 0}
            <div class="mt-4 border-t border-gray-200 pt-4">
                <button 
                    on:click={() => showSources = !showSources}
                    class="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>{showSources ? 'Hide' : 'Show'} sources ({sources.length})</span>
                </button>
                
                {#if showSources}
                    <div class="mt-3 space-y-3">
                        {#each sources as source, index}
                            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="text-sm font-medium text-blue-900">
                                        📄 {source.filename}
                                    </span>
                                    <span class="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                        {source.similarity}% match
                                    </span>
                                </div>
                                <p class="text-sm text-blue-800 leading-relaxed">
                                    {source.content}
                                </p>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<style>
    /* Keep your existing markdown styles */
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
