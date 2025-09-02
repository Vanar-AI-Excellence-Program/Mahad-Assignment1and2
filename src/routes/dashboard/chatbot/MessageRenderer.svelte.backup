<script lang="ts">
    import {marked} from 'marked';
    import { onMount, afterUpdate } from 'svelte';
    import Prism from 'prismjs';
    
    export let content: string = '';
	export let isLoading: boolean = false;
	export let isError: boolean = false;

    let container: HTMLDivElement;
    
    // Language component mapping for dynamic loading
    const languageComponents: Record<string, string> = {
        javascript: 'prism-javascript',
        js: 'prism-javascript',
        typescript: 'prism-typescript', 
        ts: 'prism-typescript',
        python: 'prism-python',
        py: 'prism-python',
        java: 'prism-java',
        c: 'prism-c',
        cpp: 'prism-cpp',
        'c++': 'prism-cpp',
        csharp: 'prism-csharp',
        'c#': 'prism-csharp',
        php: 'prism-php',
        ruby: 'prism-ruby',
        rb: 'prism-ruby',
        go: 'prism-go',
        rust: 'prism-rust',
        rs: 'prism-rust',
        sql: 'prism-sql',
        json: 'prism-json',
        css: 'prism-css',
        html: 'prism-markup',
        xml: 'prism-markup',
        markup: 'prism-markup',
        bash: 'prism-bash',
        shell: 'prism-bash',
        sh: 'prism-bash',
        yaml: 'prism-yaml',
        yml: 'prism-yaml',
        markdown: 'prism-markdown',
        md: 'prism-markdown'
    };

    // Dynamic language loading
    async function loadLanguage(language: string) {
        if (language === 'none' || Prism.languages[language]) {
            return; // Already loaded or not needed
        }
        
        const componentName = languageComponents[language];
        if (componentName) {
            try {
                await import(/* @vite-ignore */ `prismjs/components/${componentName}.js`);
            } catch (error) {
                console.warn(`Failed to load Prism language: ${language}`, error);
            }
        }
    }
    
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
    


    // Copy code to clipboard
    async function copyCode(codeText: string, button: HTMLButtonElement) {
        try {
            await navigator.clipboard.writeText(codeText);
            // Change button to show success state
            const originalHTML = button.innerHTML;
            button.innerHTML = `
                <svg class="copy-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
            `;
            // Reset button after 2 seconds
            setTimeout(() => {
                button.innerHTML = originalHTML;
            }, 2000);
            console.log('Code copied to clipboard');
        } catch (err) {
            console.error('Failed to copy code:', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = codeText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            // Show success state even for fallback
            const originalHTML = button.innerHTML;
            button.innerHTML = `
                <svg class="copy-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
            `;
            setTimeout(() => {
                button.innerHTML = originalHTML;
            }, 2000);
        }
    }
    
    // Render markdown to HTML with copy buttons for code blocks
    function renderMarkdown(text: string): string {
        try {
            let html = marked(text);
            // Add Prism syntax highlighting and copy buttons to code blocks
            // First handle code blocks with language specification
            html = html.replace(
                /<pre><code class="language-([^"]*)"[^>]*>([\s\S]*?)<\/code><\/pre>/g,
                (match: string, languageFromFence: string, codeContent: string) => {
                    const decodedContent = codeContent
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'");
                    
                    // Use language from markdown code fence (e.g., ```python)
                    const language = languageFromFence.toLowerCase() || 'none';
                    
                    return `
                        <div class="code-block-wrapper relative" data-language="${language}">
                            <div class="flex justify-between items-center bg-gray-800 text-white px-4 py-2 rounded-t-lg">
                                <span class="text-sm font-medium">${language !== 'none' ? language.toUpperCase() : 'CODE'}</span>
                                <button
                                    class="copy-button text-gray-300 hover:text-white transition-colors"
                                    data-code="${btoa(decodedContent)}"
                                    title="Copy code"
                                >
                                    <svg class="copy-icon w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                    </svg>
                                </button>
                            </div>
                            <pre class="bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto text-sm font-mono leading-relaxed"><code class="language-${language}">${decodedContent}</code></pre>
                        </div>
                    `;
                }
            );

            // Then handle code blocks without language specification
            html = html.replace(
                /<pre><code(?![^>]*class="language-)[^>]*>([\s\S]*?)<\/code><\/pre>/g,
                (match: string, codeContent: string) => {
                    const decodedContent = codeContent
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'");
                    
                    return `
                        <div class="code-block-wrapper relative" data-language="none">
                            <div class="flex justify-between items-center bg-gray-800 text-white px-4 py-2 rounded-t-lg">
                                <span class="text-sm font-medium">CODE</span>
                                <button
                                    class="copy-button text-gray-300 hover:text-white transition-colors"
                                    data-code="${btoa(decodedContent)}"
                                    title="Copy code"
                                >
                                    <svg class="copy-icon w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                    </svg>
                                </button>
                            </div>
                            <pre class="bg-gray-900 text-gray-100 p-4 rounded-b-lg overflow-x-auto text-sm font-mono leading-relaxed"><code>${decodedContent}</code></pre>
                        </div>
                    `;
                }
            );
            
            return sanitizeHtml(html);
        } catch (error) {
            console.error('Markdown rendering error:', error);
            // Fallback to plain text with line breaks
            return text.replace(/\n/g, '<br>');
        }
    }
    
    // Setup copy button event listeners
    function setupCopyButtons() {
        if (container) {
            const copyButtons = container.querySelectorAll('.copy-button');
            copyButtons.forEach(button => {
                // Remove any existing listeners to prevent duplicates
                button.removeEventListener('click', handleCopyClick);
                button.addEventListener('click', handleCopyClick);
            });
        }
    }
    
    // Handle copy button click
    function handleCopyClick(e: Event) {
        e.preventDefault();
        e.stopPropagation();
        // Find the button element (could be the target or its parent)
        let buttonElement = e.target as HTMLElement;
        while (buttonElement && !buttonElement.classList.contains('copy-button')) {
            buttonElement = buttonElement.parentElement as HTMLElement;
        }
        if (buttonElement && buttonElement.classList.contains('copy-button')) {
            const codeData = buttonElement.getAttribute('data-code');
            if (codeData) {
                const decodedContent = atob(codeData);
                copyCode(decodedContent, buttonElement as HTMLButtonElement);
            }
        }
    }
    
    // Update content when it changes
    $: if (container && content) {
        container.innerHTML = renderMarkdown(content);
        // Use setTimeout to ensure DOM is updated
        setTimeout(() => {
            setupCopyButtons();
        }, 0);
    }
    
    onMount(() => {
        // Initial setup
        if (container) {
            setupCopyButtons();
        }
    });

    // Highlight code blocks after content updates
    afterUpdate(async () => {
        if (container) {
            const codeBlocks = container.querySelectorAll('.code-block-wrapper');
            
            for (const block of codeBlocks) {
                const language = block.getAttribute('data-language');
                const codeElement = block.querySelector('code');
                
                if (language && language !== 'none' && codeElement) {
                    // Load language component if needed
                    await loadLanguage(language);
                    
                    // Apply Prism highlighting to the code element
                    try {
                        Prism.highlightElement(codeElement);
                        console.log(`Successfully highlighted ${language} code block`);
                    } catch (error) {
                        console.warn(`Failed to highlight ${language}:`, error);
                    }
                }
            }
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
    <div
        bind:this={container}
        class="prose prose-sm max-w-none {isError ? 'text-red-700' : 'text-gray-800'} markdown-content"
    >
        {#if !content}
            <span class="text-gray-400">No content</span>
        {/if}
	</div>
{/if}

<style>
    /* Enhanced Prism.js syntax highlighting colors */
    :global(.code-block-wrapper .token.comment),
    :global(.code-block-wrapper .token.prolog),
    :global(.code-block-wrapper .token.doctype),
    :global(.code-block-wrapper .token.cdata) {
        color: #75715e !important;
        font-style: italic;
    }
    
    :global(.code-block-wrapper .token.punctuation) {
        color: #f8f8f2 !important;
    }
    
    :global(.code-block-wrapper .token.property),
    :global(.code-block-wrapper .token.tag),
    :global(.code-block-wrapper .token.constant),
    :global(.code-block-wrapper .token.symbol),
    :global(.code-block-wrapper .token.deleted) {
        color: #f92672 !important;
    }
    
    :global(.code-block-wrapper .token.boolean),
    :global(.code-block-wrapper .token.number) {
        color: #ae81ff !important;
    }
    
    :global(.code-block-wrapper .token.selector),
    :global(.code-block-wrapper .token.attr-name),
    :global(.code-block-wrapper .token.string),
    :global(.code-block-wrapper .token.char),
    :global(.code-block-wrapper .token.builtin),
    :global(.code-block-wrapper .token.inserted) {
        color: #a6e22e !important;
    }
    
    :global(.code-block-wrapper .token.operator),
    :global(.code-block-wrapper .token.entity),
    :global(.code-block-wrapper .token.url),
    :global(.code-block-wrapper .language-css .token.string),
    :global(.code-block-wrapper .style .token.string),
    :global(.code-block-wrapper .token.variable) {
        color: #f8f8f2 !important;
    }
    
    :global(.code-block-wrapper .token.atrule),
    :global(.code-block-wrapper .token.attr-value),
    :global(.code-block-wrapper .token.function),
    :global(.code-block-wrapper .token.class-name) {
        color: #e6db74 !important;
    }
    
    :global(.code-block-wrapper .token.keyword) {
        color: #66d9ef !important;
        font-weight: bold;
    }
    
    :global(.code-block-wrapper .token.regex),
    :global(.code-block-wrapper .token.important) {
        color: #fd971f !important;
    }
    
    /* Python specific */
    :global(.code-block-wrapper .language-python .token.decorator) {
        color: #66d9ef !important;
    }
    
    /* JavaScript specific */
    :global(.code-block-wrapper .language-javascript .token.template-string) {
        color: #a6e22e !important;
    }
    
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
