/**
 * @file ConversationListToolbar.tsx — Toolbar above the conversation list (search, import, clear).
 * @module components/chat/condensed/ConversationListToolbar
 *
 * Toolbar above the conversation list (search, import, clear). Renders the new-conversation
 * button, hidden file import input, search field, and sort-order toggle. Consumed by
 * `ConversationList`.
 */

import {
  Box,
  Button,
  HStack,
  IconButton,
  Input,
  VStack,
} from '@chakra-ui/react';
import {
  HiArrowDown,
  HiArrowUp,
  HiPlus,
  HiSearch,
  HiUpload,
} from 'react-icons/hi';
import type { JSX, RefObject } from 'react';

interface ConversationListToolbarProps {
  readonly headerBackgroundColor: string;
  readonly fileInputRef: RefObject<HTMLInputElement | null>;
  readonly searchTerm: string;
  readonly onSearchTermChange: (value: string) => void;
  readonly sortOrder: 'asc' | 'desc';
  readonly onSortOrderToggle: () => void;
  readonly onCreateConversation: () => void;
  readonly onFileImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onImportClick: () => void;
}

/**
 * Toolbar above the conversation list (search, import, clear).
 *
 * @param props - Conversation list toolbar props.
 * @returns The toolbar element.
 */
export const ConversationListToolbar = ({
  headerBackgroundColor,
  fileInputRef,
  searchTerm,
  onSearchTermChange,
  sortOrder,
  onSortOrderToggle,
  onCreateConversation,
  onFileImport,
  onImportClick,
}: ConversationListToolbarProps): JSX.Element => (
  <Box
    p={2}
    borderBottom="1px solid"
    borderColor="rgba(255, 255, 255, 0.08)"
    bg={headerBackgroundColor}
  >
    <VStack gap={2} align="stretch">
      <HStack gap={2} justify="space-between">
        <Button
          size="xs"
          variant="outline"
          colorPalette="gray"
          onClick={() => onCreateConversation()}
          flex={1}
        >
          <HiPlus />
          New
        </Button>
        <IconButton
          aria-label="Import conversations"
          title="Import conversations"
          size="xs"
          variant="outline"
          colorPalette="gray"
          onClick={onImportClick}
        >
          <HiUpload />
        </IconButton>
        <Input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={onFileImport}
          display="none"
        />
      </HStack>
      <HStack
        gap={2}
        align="center"
        flexWrap="wrap"
        minW={0}
        px={2}
        py={1}
        border="1px solid"
        borderColor="rgba(255, 255, 255, 0.1)"
        borderRadius="md"
        bg="rgba(255, 255, 255, 0.03)"
        _focusWithin={{
          borderColor: 'rgba(255, 255, 255, 0.2)',
          boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.1)',
        }}
      >
        <Box color="gray.400" fontSize="sm">
          <HiSearch />
        </Box>
        <Input
          placeholder="Search conversations..."
          size="md"
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          border="none"
          bg="transparent"
          _focus={{
            boxShadow: 'none',
            outline: 'none',
          }}
          flex={1}
        />
        <IconButton
          aria-label={
            sortOrder === 'desc'
              ? 'Sort ascending (oldest first)'
              : 'Sort descending (newest first)'
          }
          size="sm"
          variant="ghost"
          colorPalette="gray"
          onClick={onSortOrderToggle}
          title={
            sortOrder === 'desc'
              ? 'Sort ascending (oldest first)'
              : 'Sort descending (newest first)'
          }
        >
          {sortOrder === 'desc' ? <HiArrowDown /> : <HiArrowUp />}
        </IconButton>
      </HStack>
    </VStack>
  </Box>
);
