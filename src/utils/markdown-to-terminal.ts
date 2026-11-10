/**
 * @file markdown-to-terminal.ts — Converts markdown to plain-text terminal output.
 * @module utils/markdown-to-terminal
 *
 * Converts markdown text to plain-text terminal output. Uses terminal-friendly
 * formatting (no ANSI codes, browser-compatible). Parses markdown to HTML via
 * `marked`, maps common HTML elements to text equivalents, decodes HTML
 * entities, and strips remaining markdown syntax.
 */
import { marked } from 'marked';

/**
 * Converts markdown text to plain text terminal output.
 * Parses markdown to HTML via `marked`, maps common HTML elements (headings,
 * code blocks, links, lists, blockquotes, etc.) to text equivalents, decodes
 * HTML entities, strips remaining markdown syntax, and collapses whitespace.
 * @param markdown - Raw markdown string.
 * @returns Plain-text terminal rendering of the markdown.
 * @example
 * ```ts
 * const plain = markdownToTerminal('# Hello\n\n**bold** and [link](https://example.com)');
 * // 'Hello\n\nbold and link (https://example.com)'
 * ```
 */
export const markdownToTerminal = (markdown: string): string => {
  if (!markdown) {
    return '';
  }

  // Ensure input is a string
  const markdownStr =
    typeof markdown === 'string' ? markdown : String(markdown);

  try {
    // Parse markdown to HTML first
    const html = marked.parse(markdownStr, {
      breaks: true,
      gfm: true,
    });

    // Ensure result is a string
    let output = typeof html === 'string' ? html : String(html);

    // Convert common HTML elements to terminal-friendly text
    // Headings: <h1> -> plain text with spacing (no # symbols)
    output = output.replace(/<h[1-6]>(.*?)<\/h[1-6]>/gi, (_, text) => {
      return `\n${text}\n`;
    });

    // Code blocks: <pre><code> -> box drawing
    output = output.replace(
      /<pre><code(?:\s+class="language-(\w+)")?>(.*?)<\/code><\/pre>/gis,
      (_, lang, code) => {
        const langStr = lang ? ` ${lang}` : '';
        return `\n┌─${langStr}─\n${code}\n└─\n`;
      }
    );

    // Inline code: <code> -> plain text (no backticks, just the code)
    output = output.replace(/<code>(.*?)<\/code>/gi, '$1');

    // Links: <a href="...">text</a> -> text (url)
    output = output.replace(
      /<a\s+href="([^"]*)"[^>]*>(.*?)<\/a>/gi,
      (_, href, text) => {
        return `${text} (${href})`;
      }
    );

    // Bold: <strong> or <b> -> plain text (no asterisks)
    output = output.replace(/<(strong|b)>(.*?)<\/\1>/gi, '$2');

    // Italic: <em> or <i> -> plain text (no asterisks)
    output = output.replace(/<(em|i)>(.*?)<\/\1>/gi, '$2');

    // Lists: <ul><li> -> bullet points
    output = output.replace(/<ul[^>]*>/gi, '\n');
    output = output.replace(/<\/ul>/gi, '\n');
    output = output.replace(/<li[^>]*>(.*?)<\/li>/gi, '  • $1\n');

    // Ordered lists: <ol><li> -> numbered
    output = output.replace(/<ol[^>]*>/gi, '\n');
    output = output.replace(/<\/ol>/gi, '\n');

    // Blockquotes: <blockquote> -> │ prefix
    output = output.replace(
      /<blockquote[^>]*>(.*?)<\/blockquote>/gis,
      (_, quote) => {
        return `\n│ ${quote}\n`;
      }
    );

    // Horizontal rules: <hr> -> dashes
    output = output.replace(/<hr[^>]*>/gi, `\n${'─'.repeat(50)}\n`);

    // Paragraphs: <p> -> newlines
    output = output.replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n');

    // Remove all remaining HTML tags
    output = output.replace(/<[^>]*>/g, '');

    // Decode HTML entities
    output = output
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');

    // Strip any remaining markdown syntax that might have slipped through
    // Remove bold markers (**text** -> text)
    output = output.replace(/\*\*(.*?)\*\*/g, '$1');
    // Remove italic markers (*text* -> text, but avoid list bullets by checking context)
    output = output.replace(/\*([^*\n]+?)\*/g, (match, content) => {
      // Don't replace if it looks like a list bullet (starts with space and newline before)
      if (match.startsWith('  •') || match.startsWith(' •')) {
        return match;
      }
      return content;
    });
    // Remove heading markers (### text -> text)
    output = output.replace(/^#{1,6}\s+/gm, '');
    // Remove inline code backticks (`code` -> code)
    output = output.replace(/`([^`]+)`/g, '$1');
    // Remove citation markers ([citation:X])
    output = output.replace(/\[citation:\d+\]/g, '');

    // Clean up extra whitespace
    output = output.replace(/\n{3,}/g, '\n\n');

    // Remove any remaining object references
    output = output.replace(/\[object Object\]/g, '');

    return output.trim();
  } catch (error) {
    // If markdown parsing fails, return plain text
    console.error('Markdown parsing error:', error);
    return markdownStr;
  }
};
