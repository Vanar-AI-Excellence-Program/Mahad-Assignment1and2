# Prism.js Syntax Highlighting Implementation

This document describes the minimal, efficient Prism.js syntax highlighting implementation added to the chatbot interface.

## Overview

The implementation provides syntax highlighting for code blocks in chat messages with the following features:

- **Minimal footprint**: Only essential languages and plugins included
- **Automatic highlighting**: Works during page rendering with fallback support
- **Copy functionality**: One-click code copying with visual feedback
- **Responsive design**: Optimized for mobile and desktop
- **Accessibility**: Proper focus states and keyboard navigation
- **Dark mode support**: Automatic theme adaptation

## Supported Languages

The implementation includes support for the most commonly used programming languages:

- **JavaScript** (`js`, `javascript`)
- **TypeScript** (`ts`, `typescript`)
- **Python** (`py`, `python`)
- **HTML** (`html`, `xml`, `markup`)
- **CSS** (`css`)
- **JSON** (`json`, `yaml`, `yml`)
- **SQL** (`sql`)
- **Bash** (`bash`, `shell`, `sh`)

## Files Added/Modified

### New Files

1. **`src/lib/utils/prism-highlight.ts`**
   - Core utility module for Prism.js functionality
   - Language normalization and validation
   - Code block creation with options
   - Copy-to-clipboard functionality
   - Event handling for copy buttons

2. **`src/lib/assets/prism-custom.css`**
   - Custom CSS styles for syntax highlighting
   - Tomorrow Night theme inspired colors
   - Responsive design and accessibility features
   - Dark mode support

3. **`test-prism-highlighting.js`**
   - Test file with code examples for all supported languages
   - Used to verify highlighting functionality

### Modified Files

1. **`src/app.css`**
   - Replaced default Prism theme with custom CSS import
   - Maintains existing design system integration

2. **`src/routes/dashboard/chatbot/MessageRenderer.svelte`**
   - Updated to use new Prism utility module
   - Removed dynamic imports for better performance
   - Simplified code block processing
   - Removed duplicate styling

## Usage

### Automatic Code Block Detection

Code blocks are automatically detected and highlighted when they use the standard markdown syntax:

````markdown
```javascript
function hello() {
    console.log("Hello, World!");
}
```

```python
def greet(name):
    print(f"Hello, {name}!")
```
````

### Manual Code Block Creation

You can also create code blocks programmatically using the utility functions:

```typescript
import { createCodeBlock } from '$lib/utils/prism-highlight';

const codeBlock = createCodeBlock(
    'console.log("Hello, World!");',
    'javascript',
    {
        showLineNumbers: true,
        showCopyButton: true,
        className: 'custom-class'
    }
);
```

### Options

The `createCodeBlock` function accepts the following options:

- `showLineNumbers` (boolean): Enable line numbering (default: false)
- `showCopyButton` (boolean): Show copy button (default: true)
- `className` (string): Additional CSS classes

## Features

### Copy to Clipboard

- One-click code copying with visual feedback
- Fallback support for older browsers
- Success state indication (checkmark icon)
- Automatic reset after 2 seconds

### Line Numbers

- Optional line numbering for code blocks
- Proper styling and spacing
- Accessible with screen readers

### Responsive Design

- Mobile-optimized code blocks
- Smaller text and padding on small screens
- Horizontal scrolling for long lines
- Touch-friendly copy buttons

### Accessibility

- Proper focus states for copy buttons
- Keyboard navigation support
- Screen reader friendly
- High contrast colors

### Dark Mode

- Automatic theme adaptation
- Consistent with system preferences
- Maintains readability in both modes

## Performance Optimizations

1. **Minimal Imports**: Only essential language components loaded
2. **No Dynamic Loading**: All languages included in bundle for instant highlighting
3. **Efficient DOM Updates**: Minimal re-rendering during content updates
4. **Event Delegation**: Copy button events handled efficiently
5. **CSS Optimization**: Minimal, scoped styles

## Bundle Size Impact

The implementation adds approximately:
- **JavaScript**: ~50KB (minified + gzipped)
- **CSS**: ~8KB (minified + gzipped)
- **Total**: ~58KB additional bundle size

This is significantly smaller than loading all Prism.js languages and plugins.

## Browser Support

- **Modern Browsers**: Full support with Clipboard API
- **Older Browsers**: Fallback to `document.execCommand` for copying
- **Mobile Browsers**: Touch-optimized interface
- **Screen Readers**: Proper ARIA labels and semantic markup

## Customization

### Adding New Languages

To add support for additional languages:

1. Import the language component in `prism-highlight.ts`:
   ```typescript
   import 'prismjs/components/prism-rust';
   ```

2. Add language aliases:
   ```typescript
   const LANGUAGE_ALIASES: Record<string, string> = {
       // ... existing aliases
       'rs': 'rust',
       'rust': 'rust'
   };
   ```

3. Add display name:
   ```typescript
   const displayNames: Record<string, string> = {
       // ... existing names
       'rust': 'Rust'
   };
   ```

### Customizing Colors

Modify the CSS variables in `prism-custom.css`:

```css
.code-content {
    background: var(--code-bg, #2d3748);
    color: var(--code-text, #e2e8f0);
}
```

### Customizing Themes

Create new theme files by copying `prism-custom.css` and modifying the color scheme.

## Testing

Use the `test-prism-highlighting.js` file to verify highlighting works correctly:

1. Copy code examples from the test file
2. Paste into the chatbot interface
3. Verify syntax highlighting appears correctly
4. Test copy functionality
5. Check responsive behavior on different screen sizes

## Troubleshooting

### Code Not Highlighting

1. Check if language is supported
2. Verify code block syntax is correct
3. Check browser console for errors
4. Ensure CSS is loaded properly

### Copy Button Not Working

1. Check browser console for errors
2. Verify clipboard permissions
3. Test with different browsers
4. Check if fallback copy method works

### Styling Issues

1. Verify CSS import path is correct
2. Check for CSS conflicts
3. Test in different browsers
4. Verify dark mode detection

## Future Enhancements

Potential improvements for future versions:

1. **Language Detection**: Automatic language detection for code blocks
2. **Custom Themes**: Theme selector for users
3. **Line Highlighting**: Highlight specific lines in code blocks
4. **Code Folding**: Collapsible code sections
5. **Search in Code**: Find text within code blocks
6. **Export Options**: Download code as files

## Security Considerations

- HTML sanitization prevents XSS attacks
- Clipboard API usage is secure
- No eval() or dangerous code execution
- Input validation for language names

## License

This implementation uses Prism.js which is licensed under MIT License.
The custom code is part of the main project and follows the same licensing terms.
