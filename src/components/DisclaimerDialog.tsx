import { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  Field,
  HStack,
  Input,
  NativeSelect,
  Portal,
  Separator,
  Text,
  VStack,
} from '@chakra-ui/react';
import type {
  PerformanceMetrics,
  PerformanceTier,
} from '@/lib/performance-detector';

export interface DetectionStageDisplay {
  name: string;
  status: string;
  value?: string;
  isError?: boolean;
}

export interface ProviderConfig {
  baseURL: string;
  apiKey?: string;
}

const TIER_LABELS: Record<PerformanceTier, string> = {
  low: 'Low (Minimal animations)',
  medium: 'Medium (Balanced)',
  high: 'High (Full features)',
};

const REMOTE_VALUE = '__remote__';

interface DisclaimerDialogProps {
  metrics: PerformanceMetrics;
  stages: DetectionStageDisplay[];
  recommendedTier: PerformanceTier;
  detectedProviders: Array<{ name: string; baseURL: string }>;
  initialBaseURL?: string;
  initialApiKey?: string;
  onAccept: (
    selectedTier: PerformanceTier,
    providerConfig: ProviderConfig
  ) => void;
  onReject: () => void;
}

function isLocalBaseURL(baseURL: string): boolean {
  try {
    const u = new URL(baseURL);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function DisclaimerDialog({
  metrics,
  stages,
  recommendedTier,
  detectedProviders,
  initialBaseURL,
  initialApiKey,
  onAccept,
  onReject,
}: DisclaimerDialogProps) {
  const hasLocal = detectedProviders.length > 0;
  const initialIsLocal =
    !!initialBaseURL &&
    detectedProviders.some((p) => p.baseURL === initialBaseURL);

  const [selectedTier, setSelectedTier] =
    useState<PerformanceTier>(recommendedTier);
  const [readDisclaimer, setReadDisclaimer] = useState(false);
  const [useRemote, setUseRemote] = useState(!hasLocal || !initialIsLocal);
  const [selectedLocalBaseURL, setSelectedLocalBaseURL] = useState<string>(
    initialIsLocal
      ? initialBaseURL!
      : hasLocal
        ? detectedProviders[0].baseURL
        : ''
  );
  const [remoteBaseURL, setRemoteBaseURL] = useState(
    initialBaseURL && !isLocalBaseURL(initialBaseURL) ? initialBaseURL : ''
  );
  const [remoteApiKey, setRemoteApiKey] = useState(initialApiKey ?? '');

  const tierColor =
    metrics.tier === 'high'
      ? 'emerald'
      : metrics.tier === 'medium'
        ? 'cyan'
        : 'gray';

  return (
    <Dialog.Root
      open
      onOpenChange={(details) => {
        if (!details.open) return;
      }}
      closeOnEscape={false}
      closeOnInteractOutside={false}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            maxW="560px"
            bg="rgba(0, 0, 0, 0.95)"
            border="1px solid"
            borderColor="rgba(255, 255, 255, 0.1)"
            fontFamily="'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'Courier New', monospace"
          >
            <Dialog.Header>
              <Dialog.Title color="white" fontSize="md" letterSpacing="0.05em">
                System check complete
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} align="stretch">
                <Text color="gray.400" fontSize="xs" fontWeight={600}>
                  Detection breakdown
                </Text>
                <VStack gap={1} align="stretch">
                  {stages.map((stage, index) => {
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
                              : 'gray.600'
                        }
                        letterSpacing="0.05em"
                      >
                        <Text w="12px" textAlign="right">
                          {isError ? '✗' : isComplete ? '✓' : '○'}
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
                      </HStack>
                    );
                  })}
                </VStack>

                <Separator borderColor="rgba(255, 255, 255, 0.1)" />

                <Field.Root>
                  <Field.Label color="gray.300" fontSize="xs">
                    Performance preset
                  </Field.Label>
                  <Field.HelperText color="gray.500" fontSize="xs">
                    Recommended: {TIER_LABELS[recommendedTier]}
                  </Field.HelperText>
                  <NativeSelect.Root>
                    <NativeSelect.Field
                      value={selectedTier}
                      onChange={(e) =>
                        setSelectedTier(
                          e.currentTarget.value as PerformanceTier
                        )
                      }
                      bg="rgba(255, 255, 255, 0.05)"
                      borderColor="rgba(255, 255, 255, 0.1)"
                      color="white"
                      _focus={{ borderColor: 'emerald.400' }}
                    >
                      <option value="low">{TIER_LABELS.low}</option>
                      <option value="medium">{TIER_LABELS.medium}</option>
                      <option value="high">{TIER_LABELS.high}</option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>

                <Separator borderColor="rgba(255, 255, 255, 0.1)" />

                <Field.Root>
                  <Field.Label color="gray.300" fontSize="xs">
                    Model provider
                  </Field.Label>
                  <Field.HelperText color="gray.500" fontSize="xs">
                    {hasLocal
                      ? 'Select a detected local provider or use a remote endpoint'
                      : 'No local providers detected. Enter a remote API endpoint and key.'}
                  </Field.HelperText>
                  {hasLocal ? (
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={useRemote ? REMOTE_VALUE : selectedLocalBaseURL}
                        onChange={(e) => {
                          const v = e.currentTarget.value;
                          if (v === REMOTE_VALUE) {
                            setUseRemote(true);
                          } else {
                            setUseRemote(false);
                            setSelectedLocalBaseURL(v);
                          }
                        }}
                        bg="rgba(255, 255, 255, 0.05)"
                        borderColor="rgba(255, 255, 255, 0.1)"
                        color="white"
                        _focus={{ borderColor: 'emerald.400' }}
                      >
                        {detectedProviders.map((p) => (
                          <option key={p.baseURL} value={p.baseURL}>
                            {p.name} ({p.baseURL})
                          </option>
                        ))}
                        <option value={REMOTE_VALUE}>
                          Use remote provider
                        </option>
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  ) : null}
                  {(!hasLocal || useRemote) && (
                    <VStack gap={2} align="stretch" mt={2}>
                      <Input
                        value={remoteBaseURL}
                        onChange={(e) => setRemoteBaseURL(e.target.value)}
                        placeholder="https://api.openai.com/v1"
                        bg="rgba(255, 255, 255, 0.05)"
                        borderColor="rgba(255, 255, 255, 0.1)"
                        color="white"
                        _focus={{ borderColor: 'emerald.400' }}
                        fontSize="xs"
                      />
                      <Box>
                        <Field.Label color="gray.400" fontSize="xs">
                          API key (remote only)
                        </Field.Label>
                        <Input
                          type="password"
                          value={remoteApiKey}
                          onChange={(e) => setRemoteApiKey(e.target.value)}
                          placeholder="sk-..."
                          bg="rgba(255, 255, 255, 0.05)"
                          borderColor="rgba(255, 255, 255, 0.1)"
                          color="white"
                          _focus={{ borderColor: 'emerald.400' }}
                          fontSize="xs"
                          mt={1}
                        />
                      </Box>
                    </VStack>
                  )}
                </Field.Root>

                <Separator borderColor="rgba(255, 255, 255, 0.1)" />

                <Box>
                  <Text color="gray.300" fontSize="sm" fontWeight={600} mb={2}>
                    Disclaimer
                  </Text>
                  <Text color="gray.400" fontSize="xs" lineHeight="tall">
                    The assistant is an artificial intelligence. Its answers may
                    be incorrect or unreliable. Conversations are stored locally
                    and are ephemeral. This application is an experiment for
                    entertainment purposes only.
                  </Text>
                </Box>

                <Checkbox.Root
                  checked={readDisclaimer}
                  onCheckedChange={(e) => setReadDisclaimer(e.checked === true)}
                  colorPalette="emerald"
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label color="gray.300" fontSize="sm">
                    I have read the disclaimer
                  </Checkbox.Label>
                </Checkbox.Root>

                <HStack gap={3} justify="flex-end" w="full" pt={2}>
                  <Button
                    size="sm"
                    variant="outline"
                    colorPalette="red"
                    onClick={onReject}
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    colorPalette="emerald"
                    disabled={
                      !readDisclaimer ||
                      (useRemote || !hasLocal ? !remoteBaseURL.trim() : false)
                    }
                    onClick={() => {
                      const providerConfig: ProviderConfig =
                        useRemote || !hasLocal
                          ? {
                              baseURL: remoteBaseURL.trim(),
                              apiKey: remoteApiKey.trim() || undefined,
                            }
                          : { baseURL: selectedLocalBaseURL };
                      onAccept(selectedTier, providerConfig);
                    }}
                  >
                    Accept
                  </Button>
                </HStack>
              </VStack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
