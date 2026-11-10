/**
 * @file MarkdownRenderer.tsx — Markdown rendering with Chakra-styled typographic components.
 * @module components/chat/shared/MarkdownRenderer
 *
 * Markdown rendering with Chakra-styled typographic components. Wraps `react-markdown` with
 * GFM plugins and Chakra-mapped components (headings, code blocks, lists, links, tables).
 * Memoized by content/fontSize/color. Consumed by message part renderers.
 */

import { Box, Code, Heading, Text } from '@chakra-ui/react';
import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  readonly content: string;
  readonly fontSize?: string;
  readonly color?: string;
}

// Move remarkPlugins outside component to ensure stable reference
const remarkPlugins = [remarkGfm];

// Move components object outside component to ensure stable reference
// This prevents react-markdown from seeing it as changed on every render
const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <Text as="p" mb={4}>
      {children}
    </Text>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <Heading as="h1" size="xl" mb={3} mt={6}>
      {children}
    </Heading>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <Heading as="h2" size="lg" mb={3} mt={5}>
      {children}
    </Heading>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <Heading as="h3" size="md" mb={2} mt={4}>
      {children}
    </Heading>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <Heading as="h4" size="sm" mb={2} mt={4}>
      {children}
    </Heading>
  ),
  h5: ({ children }: { children?: React.ReactNode }) => (
    <Heading as="h5" size="xs" mb={2} mt={3}>
      {children}
    </Heading>
  ),
  h6: ({ children }: { children?: React.ReactNode }) => (
    <Heading as="h6" size="xs" mb={2} mt={3}>
      {children}
    </Heading>
  ),
  code: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => {
    const isInline = !className?.includes('language-');
    if (isInline) {
      return (
        <Code
          px={1}
          py={0.5}
          borderRadius="md"
          fontSize="0.9em"
          bg="rgba(255, 255, 255, 0.1)"
          color="cyan.300"
        >
          {children}
        </Code>
      );
    }
    return (
      <Box
        as="pre"
        p={4}
        borderRadius="md"
        bg="rgba(0, 0, 0, 0.3)"
        overflow="auto"
        overflowX="auto"
        my={4}
        maxW="100%"
        w="100%"
        minW={0}
        boxSizing="border-box"
      >
        <Code
          display="block"
          whiteSpace="pre"
          fontSize="0.9em"
          bg="transparent"
          p={0}
          wordBreak="break-all"
          overflowWrap="anywhere"
          overflowX="auto"
          maxW="100%"
          minW={0}
        >
          {children}
        </Code>
      </Box>
    );
  },
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <Box
      as="blockquote"
      borderLeft="3px solid"
      borderColor="rgba(255, 255, 255, 0.3)"
      pl={4}
      ml={0}
      my={4}
      fontStyle="italic"
      color="rgba(255, 255, 255, 0.8)"
    >
      {children}
    </Box>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <Box as="ul" mb={3} mt={2} pl={6}>
      {children}
    </Box>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <Box as="ol" mb={3} mt={2} pl={6}>
      {children}
    </Box>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <Box as="li" mb={1}>
      {children}
    </Box>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: '#38bdf8',
        textDecoration: 'underline',
        display: 'inline',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = '#7dd3fc';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = '#38bdf8';
      }}
    >
      {children}
    </a>
  ),
  hr: () => (
    <Box
      as="hr"
      my={4}
      borderTop="1px solid"
      borderColor="rgba(255, 255, 255, 0.2)"
    />
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <Text as="strong" fontWeight={600}>
      {children}
    </Text>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <Text as="em" fontStyle="italic">
      {children}
    </Text>
  ),
};

// Move CSS object outside component to ensure stable reference
// This prevents expensive style recalculations on every render
const markdownStyles = {
  textShadow:
    '0 0 2px rgba(173, 255, 168, 0.03), 0 0 4px rgba(173, 255, 168, 0.02), 0 0 8px rgba(173, 255, 168, 0.01), 0 0 1px rgba(255, 255, 255, 0.05)',
  '& *': {
    textShadow: 'inherit',
    maxWidth: '100%',
    minWidth: 0,
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    boxSizing: 'border-box',
  },
  '& > *:first-of-type': {
    marginTop: 0,
  },
  '& > *:last-child': {
    marginBottom: 0,
  },
  '& p': {
    marginBottom: '0.5em',
    marginTop: 0,
  },
  '& h1, & h2, & h3, & h4, & h5, & h6': {
    marginTop: '1em',
    marginBottom: '0.5em',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  '& h1': {
    fontSize: '2em',
    fontWeight: 700,
  },
  '& h2': {
    fontSize: '1.75em',
  },
  '& h3': {
    fontSize: '1.5em',
  },
  '& h4': {
    fontSize: '1.25em',
  },
  '& ul, & ol': {
    marginTop: '0.5em',
    marginBottom: '0.5em',
    paddingLeft: '1.5em',
  },
  '& li': {
    marginBottom: '0.25em',
  },
  '& code': {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: '0.2em 0.4em',
    borderRadius: '0.25em',
    fontSize: '0.9em',
    fontFamily:
      "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace",
  },
  '& pre': {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: '1em',
    borderRadius: '0.5em',
    overflow: 'auto',
    overflowX: 'auto',
    marginTop: '1em',
    marginBottom: '1em',
    maxWidth: '100%',
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    '& code': {
      backgroundColor: 'transparent',
      padding: 0,
      whiteSpace: 'pre',
      wordBreak: 'break-all',
      overflowWrap: 'anywhere',
      display: 'block',
      overflowX: 'auto',
      maxWidth: '100%',
      minWidth: 0,
    },
  },
  '& blockquote': {
    borderLeft: '3px solid rgba(255, 255, 255, 0.3)',
    paddingLeft: '1em',
    marginLeft: 0,
    marginTop: '1em',
    marginBottom: '1em',
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  '& a': {
    color: 'cyan.400',
    textDecoration: 'underline',
    '&:hover': {
      color: 'cyan.300',
    },
  },
  '& strong': {
    fontWeight: 600,
  },
  '& em': {
    fontStyle: 'italic',
  },
  '& hr': {
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: '1.5em',
    marginBottom: '1.5em',
  },
  '& table': {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    borderCollapse: 'collapse',
    marginTop: '1em',
    marginBottom: '1em',
    display: 'block',
    overflowX: 'auto',
    boxSizing: 'border-box',
  },
  '& th, & td': {
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '0.5em',
    textAlign: 'left',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    maxWidth: '100%',
    minWidth: 0,
  },
  '& th': {
    fontWeight: 600,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
};

const MarkdownRendererComponent: React.FC<MarkdownRendererProps> = ({
  content,
  fontSize = 'lg',
  color = 'white',
}) => {
  return (
    <Box
      fontSize={fontSize}
      color={color}
      fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
      lineHeight="1.6"
      w="100%"
      maxW="100%"
      minW={0}
      boxSizing="border-box"
      overflowWrap="anywhere"
      wordBreak="break-word"
      overflowX="hidden"
      textWrap="wrap"
      css={markdownStyles}
    >
      <Markdown remarkPlugins={remarkPlugins} components={markdownComponents}>
        {content}
      </Markdown>
    </Box>
  );
};

/**
 * Memoized markdown renderer; re-renders only when content, font size, or color change.
 *
 * @param props - Markdown renderer props.
 * @returns The memoized markdown renderer element.
 */
export const MarkdownRenderer = React.memo(
  MarkdownRendererComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.content === nextProps.content &&
      prevProps.fontSize === nextProps.fontSize &&
      prevProps.color === nextProps.color
    );
  }
);
