document.addEventListener('DOMContentLoaded', () => {
    const mdInput = document.getElementById('md-input');
    const renderedHtmlView = document.getElementById('rendered-html-view');
    const rawHtmlView = document.getElementById('raw-html-view');
    const tabRendered = document.getElementById('tab-rendered');
    const tabRaw = document.getElementById('tab-raw');

    // Basic Markdown to HTML converter
    function simpleMarkdownToHtml(md) {
        let html = md;

        // Blockquotes (must be before paragraphs)
        html = html.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');
        
        // Web Videos @[web-video](VIDEO_ID)
        html = html.replace(/@\[web-video\]\(([^)]+)\)/g, '<div class="video-container"><iframe src="https://www.youtube.com/embed/$1" frameborder="0" allowfullscreen></iframe></div>');

        // Local Videos @[local-video](URL)
        html = html.replace(/@\[local-video\]\(([^)]+)\)/g, '<video controls src="$1" style="width: 100%"></video>');

        // Headers
        html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
        html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
        html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');

        // Unordered lists
        html = html.replace(/^\* (.*$)/gm, '<ul><li>$1</li></ul>');
        html = html.replace(/^ *- (.*$)/gm, '<ul><li>$1</li></ul>'); // Support for hyphen
        html = html.replace(/<\/ul>\n<ul>/gm, ''); // Merge adjacent list items

        // Ordered lists
        html = html.replace(/^\d+\. (.*$)/gm, '<ol><li>$1</li></ol>');
        html = html.replace(/<\/ol>\n<ol>/gm, ''); // Merge adjacent list items

        // Code blocks (simple version: lines starting with ```)
        html = html.replace(/^```([\s\S]*?)^```/gm, '<pre><code>$1</code></pre>');
        
        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

        // Italic
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.*?)_/g, '<em>$1</em>');
        
        // Strikethrough
        html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
        
        // Underline
        html = html.replace(/\+\+(.*?)\+\+/g, '<u>$1</u>');
        
        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Paragraphs (any line not otherwise processed)
        // This is tricky with a simple regex parser. We'll wrap remaining lines.
        // Avoid wrapping block elements again.
        html = html.split('\n').map(line => {
            if (line.trim() === '') return '';
            if (line.startsWith('<h') || line.startsWith('<ul') || line.startsWith('<ol') || line.startsWith('<block') || line.startsWith('<pre')) {
                return line;
            }
            return '<p>' + line + '</p>';
        }).join('\n').replace(/<p><\/p>/g, ''); // Remove empty paragraphs


        // Line breaks (simple approach, replace newline with <br>)
        // This should ideally be smarter, e.g. only for soft breaks
        // For now, we assume markdown newlines that are not part of other blocks become <br>
        // The paragraph logic above handles block separation mostly.
        // html = html.replace(/\n/g, '<br>'); // This might be too aggressive after paragraph wrapping

        return html.trim();
    }

    function updatePreview() {
        const mdText = mdInput.value;
        const htmlOutput = simpleMarkdownToHtml(mdText);
        renderedHtmlView.innerHTML = htmlOutput;
        rawHtmlView.textContent = htmlOutput;
    }

    mdInput.addEventListener('input', updatePreview);

    // Tab switching
    tabRendered.addEventListener('click', () => {
        renderedHtmlView.classList.remove('hidden');
        rawHtmlView.classList.add('hidden');
        tabRendered.classList.add('active');
        tabRaw.classList.remove('active');
    });

    tabRaw.addEventListener('click', () => {
        renderedHtmlView.classList.add('hidden');
        rawHtmlView.classList.remove('hidden');
        tabRendered.classList.remove('active');
        tabRaw.classList.add('active');
    });

    // Toolbar actions
    function applyFormat(prefix, suffix = prefix, isBlock = false, placeholder = 'text') {
        const start = mdInput.selectionStart;
        const end = mdInput.selectionEnd;
        const selectedText = mdInput.value.substring(start, end);
        const textToInsert = selectedText || placeholder;
        let newText;

        if (isBlock) {
            // For block elements, apply to the whole line or create a new line
            const currentLineStart = mdInput.value.lastIndexOf('\n', start -1) + 1;
            const currentLineEnd = mdInput.value.indexOf('\n', end);
            const lineEnd = currentLineEnd === -1 ? mdInput.value.length : currentLineEnd;
            
            const lineText = mdInput.value.substring(currentLineStart, lineEnd);

            if (lineText.trim() === '') { // Empty line, insert new block
                newText = prefix + textToInsert + suffix;
            } else { // Wrap existing line
                 // Check if already formatted, then unformat (basic toggle)
                if (lineText.startsWith(prefix.trim()) && (suffix === '' || lineText.endsWith(suffix.trim()))) {
                     newText = lineText.substring(prefix.trim().length, lineText.length - suffix.trim().length);
                } else {
                     newText = prefix + lineText + suffix;
                }
            }
            mdInput.setRangeText(newText, currentLineStart, lineEnd, 'select');

        } else { // Inline elements
            if (selectedText && 
                mdInput.value.substring(start - prefix.length, start) === prefix &&
                mdInput.value.substring(end, end + suffix.length) === suffix) {
                // Unwrap if already wrapped
                newText = selectedText;
                mdInput.setRangeText(newText, start - prefix.length, end + suffix.length, 'select');
            } else {
                newText = prefix + textToInsert + suffix;
                mdInput.setRangeText(newText, start, end, 'select');
                 // Adjust selection to be around the placeholder if nothing was selected
                if (!selectedText) {
                    mdInput.selectionStart = start + prefix.length;
                    mdInput.selectionEnd = mdInput.selectionStart + placeholder.length;
                }
            }
        }
        updatePreview();
        mdInput.focus();
    }
    
    document.getElementById('btn-h1').addEventListener('click', () => applyFormatOnLine('# ', '', 'Heading Text'));
    document.getElementById('btn-h2').addEventListener('click', () => applyFormatOnLine('## ', '', 'Heading Text'));
    document.getElementById('btn-h3').addEventListener('click', () => applyFormatOnLine('### ', '', 'Heading Text'));
    document.getElementById('btn-h4').addEventListener('click', () => applyFormatOnLine('#### ', '', 'Heading Text'));
    document.getElementById('btn-bold').addEventListener('click', () => applyFormat('**', '**', false, 'bold text'));
    document.getElementById('btn-italic').addEventListener('click', () => applyFormat('*', '*', false, 'italic text'));
    document.getElementById('btn-ul').addEventListener('click', () => applyFormatOnLine('* ', '', 'List item'));
    document.getElementById('btn-ol').addEventListener('click', () => applyFormatOnLine('1. ', '', 'List item'));
    document.getElementById('btn-code').addEventListener('click', () => applyFormat('`', '`', false, 'code'));
    document.getElementById('btn-blockquote').addEventListener('click', () => applyFormatOnLine('> ', '', 'Quoted text'));
    document.getElementById('btn-strikethrough').addEventListener('click', () => applyFormat('~~', '~~', false, 'strikethrough text'));
    document.getElementById('btn-underline').addEventListener('click', () => applyFormat('++', '++', false, 'underlined text'));
    document.getElementById('btn-link').addEventListener('click', () => {
        const url = prompt('Enter link URL:', 'http://');
        if (url) {
            applyFormat('[', '](' + url + ')', false, 'link text');
        }
    });

    document.getElementById('btn-video').addEventListener('click', () => {
        const url = prompt('Enter Web Video URL:');
        if (url) {
            const videoId = getWebVideoId(url);
            if (videoId) {
                applyFormat(`@[web-video](${videoId})`, '', true);
            } else {
                alert('Could not extract video ID. Please use a valid video URL.');
            }
        }
    });

    const localVideoInput = document.getElementById('local-video-input');
    document.getElementById('btn-local-video').addEventListener('click', () => {
        localVideoInput.click();
    });

    localVideoInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            applyFormat(`@[local-video](${url})`, '', true);
        }
        // Reset file input to allow loading the same file again
        event.target.value = null;
    });

    function getWebVideoId(url) {
        let ID = '';
        url = url.replace(/(>|<)/gi,'').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
        if (url[2] !== undefined) {
            ID = url[2].split(/[^0-9a-z_\-]/i);
            ID = ID[0];
        }
        else {
            ID = url;
        }
        return ID;
    }

    function applyFormatOnLine(prefix, suffix = '', placeholder = 'text') {
        const { value, selectionStart, selectionEnd } = mdInput;
        let startLine = value.lastIndexOf('\n', selectionStart - 1) + 1;
        let endLineChars = value.indexOf('\n', selectionEnd);
        if (endLineChars === -1) endLineChars = value.length;
        
        const originalLine = value.substring(startLine, endLineChars);
        let textToInsert = originalLine.trim() ? originalLine : placeholder;
        let formattedText;

        // Basic toggle: if line starts with prefix, remove it. Otherwise, add it.
        if (originalLine.startsWith(prefix)) {
            formattedText = originalLine.substring(prefix.length);
        } else {
            formattedText = prefix + textToInsert + suffix;
        }

        mdInput.setRangeText(formattedText, startLine, endLineChars, 'select');
        updatePreview();
        mdInput.focus();
    }


    // Action Buttons
    const btnDownload = document.getElementById('btn-download');
    const btnLoadInput = document.getElementById('btn-load-input');
    const btnCopyHtml = document.getElementById('btn-copy-html');

    btnDownload.addEventListener('click', () => {
        const mdContent = mdInput.value;
        const blob = new Blob([mdContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'markdown.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    btnLoadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                mdInput.value = e.target.result;
                updatePreview();
            };
            reader.readAsText(file);
        }
         // Reset file input to allow loading the same file again
        event.target.value = null;
    });

    btnCopyHtml.addEventListener('click', () => {
        const htmlToCopy = rawHtmlView.textContent;
        navigator.clipboard.writeText(htmlToCopy).then(() => {
            // Optional: Show a success message
            alert('HTML copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy HTML: ', err);
            alert('Failed to copy HTML. See console for details.');
        });
    });
    
    // Initial preview update
    updatePreview();
}); 