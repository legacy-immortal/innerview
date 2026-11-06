import { Box, Text } from '@chakra-ui/react';

export function SystemOfflineView() {
  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="black"
      zIndex={9999}
      fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
    >
      <Text
        fontSize="lg"
        color="red.400"
        fontWeight={600}
        letterSpacing="0.15em"
        css={{
          textShadow:
            '0 0 8px rgba(239, 68, 68, 0.5), 0 0 16px rgba(239, 68, 68, 0.3)',
        }}
      >
        [SYSTEM OFFLINE]
      </Text>
    </Box>
  );
}
