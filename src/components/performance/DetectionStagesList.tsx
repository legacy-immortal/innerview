// Detection stage list (extracted from PerformanceDetectionView.tsx).
import { HStack, Text, VStack } from '@chakra-ui/react';
import type { DetectionStage } from '@/lib/performanceStartupUtils';

export function DetectionStagesList({
  stages,
  currentStage,
  tierColor,
}: {
  stages: DetectionStage[];
  currentStage: number;
  tierColor: string;
}) {
  return (
    <VStack gap={2} align="stretch" mt={2}>
      {stages.map((stage, index) => {
        const isActive = index <= currentStage;
        const isDetecting = stage.status === 'detecting';
        const isComplete = stage.status === 'complete';
        const isError = stage.status === 'error' || stage.isError;

        return (
          <HStack
            key={index}
            gap={3}
            fontSize="xs"
            color={
              isError
                ? 'red.400'
                : isComplete
                  ? `${tierColor}.400`
                  : isDetecting
                    ? 'yellow.400'
                    : 'gray.600'
            }
            letterSpacing="0.05em"
            css={{
              textShadow:
                isActive && !isDetecting
                  ? `0 0 4px rgba(${
                      isError
                        ? '239, 68, 68'
                        : tierColor === 'emerald'
                          ? '16, 185, 129'
                          : tierColor === 'cyan'
                            ? '6, 182, 212'
                            : '156, 163, 175'
                    }, 0.3)`
                  : 'none',
            }}
          >
            <Text w="12px" textAlign="right">
              {isError ? '✗' : isComplete ? '✓' : isDetecting ? '→' : '○'}
            </Text>
            <Text flex={1}>{stage.name}</Text>
            {stage.value && (
              <Text
                color={isError ? 'red.300' : `${tierColor}.300`}
                fontWeight={600}
                letterSpacing="0.1em"
              >
                {stage.value}
              </Text>
            )}
            {isDetecting && (
              <Text color="yellow.400" animation="pulse 1s infinite">
                ...
              </Text>
            )}
          </HStack>
        );
      })}
    </VStack>
  );
}
