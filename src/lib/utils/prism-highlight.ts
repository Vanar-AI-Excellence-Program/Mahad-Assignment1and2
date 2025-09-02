/**
 * Prism.js Syntax Highlighting Utility
 * 
 * Minimal implementation with essential languages and features:
 * - Core languages: JavaScript, TypeScript, Python, HTML, CSS, JSON, SQL, Bash
 * - Essential plugins: Line Numbers, Copy Button
 * - Optimized for performance and bundle size
 */

import Prism from 'prismjs';

// Import only essential language components
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';

// Import essential plugins
import 'prismjs/plugins/line-numbers/prism-line-numbers';
import 'prismjs/plugins/toolbar/prism-toolbar';
import 'prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard';

// Language aliases for common extensions
const LANGUAGE_ALIASES: Record<string, string> = {
  'js': 'javascript',
  'ts': 'typescript',
  'py': 'python',
  'html': 'markup',
  'xml': 'markup',
  'sh': 'bash',
  'shell': 'bash',
  'zsh': 'bash',
  'yaml': 'json',
  'yml': 'json',
  'md': 'markdown',
  'markdown': 'markup' // Use markup for markdown as it's close enough
};

/**
 * Normalize language name to Prism.js supported language
 */
export function normalizeLanguage(lang: string): string {
  const normalized = lang.toLowerCase().trim();
  return LANGUAGE_ALIASES[normalized] || normalized;
}

/**
 * Check if a language is supported by Prism.js
 */
export function isLanguageSupported(lang: string): boolean {
  const normalized = normalizeLanguage(lang);
  return !!Prism.languages[normalized];
}

/**
 * Highlight code with Prism.js
 */
export function highlightCode(code: string, language: string): string {
  const normalizedLang = normalizeLanguage(language);
  
  if (!isLanguageSupported(normalizedLang)) {
    // Fallback to plain text if language not supported
    return Prism.util.encode(code);
  }
  
  try {
    const highlighted = Prism.highlight(code, Prism.languages[normalizedLang], normalizedLang);
    return typeof highlighted === 'string' ? highlighted : Prism.util.encode(code);
  } catch (error) {
    console.warn(`Failed to highlight ${normalizedLang} code:`, error);
    return Prism.util.encode(code);
  }
}

/**
 * Add line numbers to code block
 */
export function addLineNumbers(code: string): string {
  const lines = code.split('\n');
  const numberedLines = lines.map((line, index) => 
    `<span class="line-number" data-line="${index + 1}"></span>${line}`
  ).join('\n');
  
  return `<span class="line-numbers-rows">${lines.map((_, index) => 
    `<span aria-hidden="true" data-line="${index + 1}"></span>`
  ).join('')}</span>${numberedLines}`;
}

/**
 * Create a complete code block with syntax highlighting
 */
export function createCodeBlock(code: string, language: string, options: {
  showLineNumbers?: boolean;
  showCopyButton?: boolean;
  className?: string;
} = {}): string {
  const {
    showLineNumbers = false,
    showCopyButton = true,
    className = ''
  } = options;
  
  const normalizedLang = normalizeLanguage(language);
  const highlightedCode = highlightCode(code, normalizedLang);
  
  let finalCode = highlightedCode;
  let finalClassName = `language-${normalizedLang}`;
  
  if (showLineNumbers) {
    finalCode = addLineNumbers(highlightedCode);
    finalClassName += ' line-numbers';
  }
  
  if (className) {
    finalClassName += ` ${className}`;
  }
  
  const codeElement = `<code class="${finalClassName}">${finalCode}</code>`;
  
  if (showCopyButton) {
    return `
      <div class="code-block-wrapper" data-language="${normalizedLang}">
        <div class="code-header">
          <span class="language-label">${normalizedLang.toUpperCase()}</span>
          <button class="copy-button" data-code="${btoa(code)}" title="Copy code">
            <svg class="copy-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
          </button>
        </div>
        <pre class="code-content">${codeElement}</pre>
      </div>
    `;
  }
  
  return `<pre class="code-content">${codeElement}</pre>`;
}

/**
 * Copy code to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.warn('Clipboard API failed, falling back to execCommand:', error);
    
    // Fallback for older browsers
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
      document.body.removeChild(textArea);
      return successful;
    } catch (fallbackError) {
      document.body.removeChild(textArea);
      console.error('Fallback copy failed:', fallbackError);
      return false;
    }
  }
}

/**
 * Setup copy button event listeners
 */
export function setupCopyButtons(container: HTMLElement): void {
  const copyButtons = container.querySelectorAll('.copy-button');
  
  copyButtons.forEach(button => {
    // Remove existing listeners to prevent duplicates
    button.removeEventListener('click', handleCopyClick);
    button.addEventListener('click', handleCopyClick);
  });
}

/**
 * Handle copy button click
 */
async function handleCopyClick(event: Event): Promise<void> {
  event.preventDefault();
  event.stopPropagation();
  
  const button = event.currentTarget as HTMLButtonElement;
  const codeData = button.getAttribute('data-code');
  
  if (!codeData) return;
  
  const code = atob(codeData);
  const success = await copyToClipboard(code);
  
  if (success) {
    // Show success state
    const originalHTML = button.innerHTML;
    button.innerHTML = `
      <svg class="copy-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
    `;
    
    // Reset after 2 seconds
    setTimeout(() => {
      button.innerHTML = originalHTML;
    }, 2000);
  }
}

/**
 * Initialize Prism.js highlighting for a container
 */
export function initializeHighlighting(container: HTMLElement): void {
  // Setup copy buttons
  setupCopyButtons(container);
  
  // Highlight any existing code blocks
  const codeBlocks = container.querySelectorAll('pre code');
  codeBlocks.forEach(codeElement => {
    const language = codeElement.className.match(/language-(\w+)/)?.[1];
    if (language && isLanguageSupported(language)) {
      try {
        Prism.highlightElement(codeElement as HTMLElement);
      } catch (error) {
        console.warn(`Failed to highlight ${language} code:`, error);
      }
    }
  });
}

/**
 * Get list of supported languages
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(Prism.languages).filter(lang => 
    !lang.startsWith('_') && typeof Prism.languages[lang] === 'object'
  );
}

/**
 * Get language display name
 */
export function getLanguageDisplayName(language: string): string {
  const displayNames: Record<string, string> = {
    'javascript': 'JavaScript',
    'typescript': 'TypeScript',
    'python': 'Python',
    'markup': 'HTML',
    'css': 'CSS',
    'json': 'JSON',
    'sql': 'SQL',
    'bash': 'Bash'
  };
  
  const normalized = normalizeLanguage(language);
  return displayNames[normalized] || normalized.toUpperCase();
}
