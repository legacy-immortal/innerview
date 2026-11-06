# PCM Processor Analysis

## Overview

Analysis of `tts/lib/pcm-processor.js` (AudioWorkletProcessor) and `src/lib/tts/utils/pcm-processor.ts` (TypeScript wrapper) to identify patterns, techniques, and improvements for our streaming-first TTS implementation.

---

## Key Insights & Recommendations

### 1. **Circular Buffer Implementation** ⭐⭐⭐⭐⭐

**Current Implementation (pcm-processor.js):**

```javascript
this.buffer = new Float32Array(24000 * 30); // Pre-allocate buffer for ~30 seconds at 24kHz
this.writeIndex = 0;
this.readIndex = 0;
```

**What It Does:**

- Pre-allocates buffer for ~30 seconds of audio at 24kHz
- Uses circular buffer pattern (writeIndex, readIndex)
- Efficient memory usage - reuses buffer space
- Handles overflow by expanding buffer dynamically

**Our Current Implementation:**

- ✅ **Already using circular buffer** - Good pattern
- ⚠️ **Hardcoded sample rate** - Assumes 24kHz
- ⚠️ **Hardcoded buffer size** - Fixed at 30 seconds

**Recommendation:**

- ✅ **Current implementation is good** - Circular buffer is efficient
- Consider making buffer size configurable
- Consider detecting sample rate dynamically

**Implementation Priority:** Low - Current implementation works well

---

### 2. **Incomplete Sample Handling** ⭐⭐⭐⭐⭐

**Current Implementation (pcm-processor.js):**

```javascript
this.pendingBytes = new Uint8Array(0); // Buffer for incomplete samples

// Combine any pending bytes with new data
const combined = new Uint8Array(this.pendingBytes.length + newData.length);
combined.set(this.pendingBytes);
combined.set(newData, this.pendingBytes.length);

// Calculate how many complete 16-bit samples we have
const completeSamples = Math.floor(combined.length / 2);
const bytesToProcess = completeSamples * 2;

// Store any remaining incomplete bytes
if (combined.length > bytesToProcess) {
  this.pendingBytes = combined.slice(bytesToProcess);
} else {
  this.pendingBytes = new Uint8Array(0);
}
```

**What It Does:**

- Buffers incomplete samples between chunks
- Ensures 16-bit samples are always complete
- Handles byte alignment correctly
- Prevents audio glitches from partial samples

**Our Current Implementation:**

- ✅ **Already implemented** - Handles incomplete samples correctly
- Good pattern to maintain

**Recommendation:**

- ✅ **Current implementation is excellent** - No changes needed
- This is a critical pattern for streaming audio

---

### 3. **Dynamic Buffer Expansion** ⭐⭐⭐⭐

**Current Implementation (pcm-processor.js):**

```javascript
if (this.writeIndex >= this.buffer.length) {
  const newBuffer = new Float32Array(this.buffer.length * 2);
  // Copy existing data maintaining order
  let sourceIndex = this.readIndex;
  let targetIndex = 0;
  while (sourceIndex !== this.writeIndex) {
    newBuffer[targetIndex++] = this.buffer[sourceIndex];
    sourceIndex = (sourceIndex + 1) % this.buffer.length;
  }
  this.buffer = newBuffer;
  this.readIndex = 0;
  this.writeIndex = targetIndex;
}
```

**What It Does:**

- Expands buffer when it fills up (doubles size)
- Maintains data order during expansion
- Handles circular buffer correctly during expansion
- Prevents buffer overflow

**Our Current Implementation:**

- ✅ **Already implemented** - Dynamic expansion works well
- Handles long audio streams gracefully

**Recommendation:**

- ✅ **Current implementation is good** - No changes needed
- Could add buffer size limit to prevent excessive memory usage

**Implementation Priority:** Low - Works well, could add safety limit

---

### 4. **Sample Rate Hardcoding** ⭐⭐⭐

**Current Implementation (pcm-processor.js):**

```javascript
this.buffer = new Float32Array(24000 * 30); // Pre-allocate buffer for ~30 seconds at 24kHz
```

**What It Does:**

- Assumes 24kHz sample rate
- Buffer size calculated for 24kHz

**Our Current Implementation:**

- ⚠️ **Hardcoded sample rate** - Assumes 24kHz
- ⚠️ **No sample rate detection** - Could fail with different rates

**Recommendation:**

- ✅ **Make sample rate configurable** or detect from audio
- Pass sample rate to processor via message
- Update buffer size calculation based on sample rate

**Implementation Priority:** Medium - Improves compatibility

---

### 5. **Volume Control** ⭐⭐⭐⭐

**Current Implementation (pcm-processor.js):**

```javascript
this.volume = 1.0; // Default volume (1.0 = 100%, 0.5 = 50%, etc.)

// In process():
channelData[i] = this.buffer[this.readIndex] * this.volume;

// In message handler:
else if (event.data.volume !== undefined) {
    this.volume = Math.max(0, event.data.volume);
}
```

**What It Does:**

- Real-time volume control via messages
- Applied during audio processing
- Supports values > 1.0 for amplification
- Prevents negative volume

**Our Current Implementation:**

- ✅ **Already implemented** - Volume control works
- ✅ **TypeScript wrapper** - `setProcessorVolume()` function

**Recommendation:**

- ✅ **Current implementation is good** - No changes needed
- Could add volume smoothing/ramping for smoother transitions

**Implementation Priority:** Low - Nice to have

---

### 6. **Error Handling** ⭐⭐⭐

**Current Implementation (pcm-processor.js):**

- ❌ **No error handling** - No try/catch blocks
- ❌ **No validation** - Doesn't validate input data
- ❌ **No error reporting** - Errors would be silent

**Our Current Implementation:**

- ⚠️ **Minimal error handling** - Errors in conversion are caught in streaming-service
- ⚠️ **No processor-level validation** - Could fail silently

**Recommendation:**

- ✅ **Add error handling** in processor
- Validate PCM data format
- Report errors back to main thread
- Handle edge cases (empty data, invalid formats)

**Implementation Priority:** Medium - Improves robustness

---

### 7. **Buffer Status/Management** ⭐⭐⭐

**Current Implementation (pcm-processor.js):**

- ❌ **No buffer status** - Can't check buffer fullness
- ❌ **No buffer clearing** - Can't reset buffer
- ❌ **No underrun detection** - Can't detect when buffer is empty

**Our Current Implementation:**

- ⚠️ **No buffer management** - Can't check or clear buffer
- ⚠️ **No status reporting** - Can't monitor buffer state

**Recommendation:**

- ✅ **Add buffer status messages** - Report buffer fullness
- ✅ **Add buffer clear command** - Reset buffer on stop
- ✅ **Add underrun detection** - Detect when buffer runs out
- Useful for debugging and monitoring

**Implementation Priority:** Medium - Improves debugging and control

---

### 8. **TypeScript Wrapper Improvements** ⭐⭐⭐

**Current Implementation (pcm-processor.ts):**

```typescript
export function streamPCMToProcessor(
  processorNode: PCMProcessorNode,
  pcmData: Int16Array
): void {
  processorNode.port.postMessage({
    pcmData: pcmData.buffer,
  });
}
```

**What It Does:**

- Simple wrapper for posting messages
- Type-safe interface
- Basic functionality

**Our Current Implementation:**

- ✅ **Basic wrapper** - Works but could be enhanced
- ⚠️ **No error handling** - Doesn't validate input
- ⚠️ **No status checking** - Can't check if processor is ready

**Recommendation:**

- ✅ **Add input validation** - Validate PCM data before sending
- ✅ **Add status checking** - Check if processor node is connected
- ✅ **Add helper methods** - Clear buffer, get status, etc.
- ✅ **Add error handling** - Handle postMessage errors

**Implementation Priority:** Medium - Improves robustness

---

### 9. **Sample Rate Mismatch Handling** ⭐⭐⭐⭐

**Current Implementation:**

- ❌ **No sample rate handling** - Assumes 24kHz
- ❌ **No resampling** - Can't handle different sample rates
- ❌ **No sample rate detection** - Doesn't detect from audio

**Our Current Implementation:**

- ⚠️ **Hardcoded 24kHz** - Could fail with different rates
- ⚠️ **No resampling** - Audio must match processor sample rate

**Recommendation:**

- ✅ **Detect sample rate** from WAV header
- ✅ **Pass sample rate** to processor
- ✅ **Add resampling** if needed (or use correct AudioContext sample rate)
- Critical for compatibility with different audio sources

**Implementation Priority:** High - Important for compatibility

---

### 10. **Buffer Underrun Handling** ⭐⭐⭐

**Current Implementation (pcm-processor.js):**

```javascript
process(inputs, outputs, parameters) {
    const output = outputs[0];
    if (output.length > 0 && this.readIndex !== this.writeIndex) {
        // Output audio
    }
    return true;
}
```

**What It Does:**

- Checks if buffer has data before outputting
- Returns silence if buffer is empty
- Continues running (returns true)

**Our Current Implementation:**

- ✅ **Basic underrun handling** - Returns silence when empty
- ⚠️ **No underrun detection** - Can't detect when it happens
- ⚠️ **No underrun reporting** - Can't notify main thread

**Recommendation:**

- ✅ **Add underrun detection** - Track when buffer runs out
- ✅ **Report underruns** - Notify main thread for debugging
- ✅ **Add underrun recovery** - Strategies for handling underruns

**Implementation Priority:** Low - Nice to have for debugging

---

## Summary of Action Items

### High Priority (Implement Soon)

1. ✅ **Add sample rate detection/handling** - Support different sample rates
2. ✅ **Add error handling** - Validate input and handle errors gracefully

### Medium Priority (Consider)

3. ✅ **Add buffer management** - Status, clearing, underrun detection
4. ✅ **Enhance TypeScript wrapper** - Validation, status checking, helper methods
5. ✅ **Add buffer size limit** - Prevent excessive memory usage

### Low Priority (Monitor)

6. ⚠️ **Add volume smoothing** - Smooth volume transitions
7. ⚠️ **Add underrun reporting** - Debugging and monitoring
8. ⚠️ **Make buffer size configurable** - Allow customization

---

## Code Patterns to Adopt

### Pattern 1: Sample Rate Detection

```typescript
// In audio-converter.ts
export function getWavSampleRate(wavData: Uint8Array): number {
  if (wavData.length < 44) {
    return 24000; // Default fallback
  }

  // Sample rate is at offset 24-27 (little-endian)
  const sampleRate = new DataView(wavData.buffer).getUint32(24, true);
  return sampleRate || 24000;
}

// Pass to processor
processorNode.port.postMessage({
  pcmData: pcmData.buffer,
  sampleRate: detectedSampleRate,
});
```

### Pattern 2: Buffer Status Reporting

```javascript
// In pcm-processor.js
case 'getStatus':
    const bufferUsed = (this.writeIndex - this.readIndex + this.buffer.length) % this.buffer.length;
    const bufferPercent = (bufferUsed / this.buffer.length) * 100;
    this.port.postMessage({
        action: 'status',
        bufferUsed,
        bufferTotal: this.buffer.length,
        bufferPercent,
        isUnderrun: bufferUsed === 0 && this.isPlaying,
    });
    break;
```

### Pattern 3: Buffer Clearing

```javascript
// In pcm-processor.js
case 'clear':
    this.readIndex = 0;
    this.writeIndex = 0;
    this.pendingBytes = new Uint8Array(0);
    this.port.postMessage({ action: 'cleared' });
    break;
```

### Pattern 4: Enhanced TypeScript Wrapper

```typescript
export function clearProcessorBuffer(
  processorNode: PCMProcessorNode
): Promise<void> {
  return new Promise((resolve) => {
    const handler = (event: MessageEvent) => {
      if (event.data.action === 'cleared') {
        processorNode.port.removeEventListener('message', handler);
        resolve();
      }
    };
    processorNode.port.addEventListener('message', handler);
    processorNode.port.postMessage({ action: 'clear' });
  });
}

export function getProcessorStatus(
  processorNode: PCMProcessorNode
): Promise<BufferStatus> {
  return new Promise((resolve) => {
    const handler = (event: MessageEvent) => {
      if (event.data.action === 'status') {
        processorNode.port.removeEventListener('message', handler);
        resolve(event.data);
      }
    };
    processorNode.port.addEventListener('message', handler);
    processorNode.port.postMessage({ action: 'getStatus' });
  });
}
```

### Pattern 5: Error Handling

```javascript
// In pcm-processor.js
this.port.onmessage = (event) => {
  try {
    if (event.data.pcmData) {
      // Validate data
      if (!(event.data.pcmData instanceof ArrayBuffer)) {
        throw new Error('Invalid PCM data format');
      }

      // Process data...
    } else if (event.data.volume !== undefined) {
      // Handle volume...
    }
  } catch (error) {
    this.port.postMessage({
      action: 'error',
      error: error.message,
    });
  }
};
```

---

## Conclusion

The PCM processor implementation is **solid and well-designed** with several excellent patterns:

1. **Circular buffer** - Efficient memory usage ✅
2. **Incomplete sample handling** - Prevents audio glitches ✅
3. **Dynamic buffer expansion** - Handles long streams ✅
4. **Volume control** - Real-time adjustment ✅

**Areas for improvement:**

1. **Sample rate handling** - Currently hardcoded, should be dynamic
2. **Error handling** - Add validation and error reporting
3. **Buffer management** - Add status, clearing, underrun detection
4. **TypeScript wrapper** - Enhance with validation and helper methods

The most critical improvements are:

- Sample rate detection/handling (High Priority)
- Error handling (High Priority)
- Buffer management (Medium Priority)

These improvements will make the PCM processor more robust, debuggable, and compatible with different audio sources.
