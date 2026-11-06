# System TTS Module Analysis

## Overview

Analysis of `tts/system.js` to identify patterns, techniques, and improvements applicable to our streaming-first TTS implementation.

---

## Key Insights & Recommendations

### 1. **Advanced Text Chunking Algorithm** ⭐⭐⭐⭐⭐

**Current Implementation (system.js):**

```javascript
var pattRegex = new RegExp(
  '^[\\s\\S]{' +
    Math.floor(chunkLength / 2) +
    ',' +
    chunkLength +
    '}[.!?,]{1}|^[\\s\\S]{1,' +
    chunkLength +
    '}$|^[\\s\\S]{1,' +
    chunkLength +
    '} '
);
```

**What It Does:**

- Prioritizes sentence boundaries (`[.!?,]`) within chunk length
- Falls back to word boundaries (` `) if no sentence boundary found
- Ensures minimum chunk size (half of target length)
- Handles edge cases (end of text, very short chunks)

**Our Current Implementation:**

```typescript
const separators = ['\n\n', '\n', '.', '?', '!', ',', ' ', ''];
// Simple lastIndexOf approach
```

**Recommendation:**

- ✅ **Adopt the regex-based chunking pattern** for better text splitting
- More intelligent sentence boundary detection
- Better handling of edge cases
- Maintains natural speech flow

**Implementation Priority:** High - Improves streaming quality

---

### 2. **Mobile User Interaction Handling** ⭐⭐⭐⭐⭐

**Current Implementation (system.js):**

```javascript
if (isMobile()) {
  let hasEnabledVoice = false;
  document.addEventListener('click', () => {
    if (hasEnabledVoice) return;
    const utterance = new SpeechSynthesisUtterance(' . ');
    utterance.volume = 0;
    speechSynthesis.speak(utterance);
    hasEnabledVoice = true;
  });
}
```

**What It Does:**

- iOS requires user interaction to enable speech synthesis
- Pre-emptively enables speech synthesis on first click
- Uses silent utterance to "unlock" the API

**Our Current Implementation:**

- ❌ **Missing mobile detection and user interaction handling**
- AudioContext may fail on iOS without user interaction

**Recommendation:**

- ✅ **Add mobile detection utility**
- ✅ **Pre-initialize AudioContext on user interaction** (click/touch)
- ✅ **Add silent utterance workaround for iOS**

**Implementation Priority:** High - Critical for mobile support

---

### 3. **Async Voice Loading Pattern** ⭐⭐⭐⭐

**Current Implementation (system.js):**

```javascript
return new Promise((resolve) => {
  setTimeout(() => {
    let voices = speechSynthesis.getVoices();
    // ... handle voices
  }, 50);
});
```

**What It Does:**

- Uses setTimeout to handle async nature of `getVoices()`
- Known workaround for browser voice loading timing issues

**Our Current Implementation:**

- ✅ Already handles async properly in Kokoro model
- ⚠️ Browser TTS model doesn't use this pattern

**Recommendation:**

- ✅ **Apply setTimeout pattern to browser TTS voice fetching**
- Ensures voices are loaded before use

**Implementation Priority:** Medium - Improves reliability

---

### 4. **Voice Fallback Strategy** ⭐⭐⭐⭐

**Current Implementation (system.js):**

```javascript
if (voices.length === 0) {
  const defaultVoice = {
    name: SystemTtsProvider.BROWSER_DEFAULT_VOICE_NAME,
    voice_id: SystemTtsProvider.BROWSER_DEFAULT_VOICE_ID,
    preview_url: false,
    lang: navigator.language || 'en-US',
  };
  resolve([defaultVoice]);
}
```

**What It Does:**

- Provides fallback when voices list is empty
- Uses browser default voice concept
- Handles Edge browser compatibility issues

**Our Current Implementation:**

- ⚠️ Browser TTS model may fail if voices aren't available

**Recommendation:**

- ✅ **Add default voice fallback** to BrowserTTSModel
- ✅ **Handle empty voice list gracefully**

**Implementation Priority:** Medium - Improves robustness

---

### 5. **Settings Validation Pattern** ⭐⭐⭐

**Current Implementation (system.js):**

```javascript
this.settings = this.defaultSettings;
for (const key in settings) {
  if (key in this.settings) {
    this.settings[key] = settings[key];
  } else {
    throw `Invalid setting passed to TTS Provider: ${key}`;
  }
}
```

**What It Does:**

- Only accepts keys defined in defaultSettings
- Prevents injection of unexpected settings
- Type-safe settings handling

**Our Current Implementation:**

- ✅ Uses TypeScript interfaces (type-safe)
- ⚠️ Could add runtime validation for extra safety

**Recommendation:**

- ✅ **Consider adding runtime validation** for settings
- Especially useful if settings come from external sources

**Implementation Priority:** Low - TypeScript already provides type safety

---

### 6. **Chunking with Offset Tracking** ⭐⭐⭐⭐

**Current Implementation (system.js):**

```javascript
settings.offset = settings.offset || 0;
settings.offset += chunk.length;
speechUtteranceChunker(utt, settings, callback);
```

**What It Does:**

- Recursively processes text with offset tracking
- Ensures no text is skipped or duplicated
- Handles long texts efficiently

**Our Current Implementation:**

- ✅ Already handles chunking correctly
- Uses async generator pattern (more modern)

**Recommendation:**

- ✅ **Current implementation is good** - async generator is cleaner
- No changes needed

---

### 7. **setTimeout for Speech Synthesis** ⭐⭐⭐

**Current Implementation (system.js):**

```javascript
console.log(newUtt); // IMPORTANT!! Do not remove
setTimeout(function () {
  speechSynthesis.speak(newUtt);
}, 0);
```

**What It Does:**

- Fixes ordering and `onend` firing issues
- Logging the object also helps (browser quirk)
- Ensures proper event loop handling

**Our Current Implementation:**

- ✅ Uses AudioWorklet (more modern approach)
- ⚠️ Browser TTS fallback doesn't use this pattern

**Recommendation:**

- ✅ **Apply setTimeout pattern to browser TTS** if we encounter event issues
- Monitor for `onend` event reliability

**Implementation Priority:** Low - Only if issues arise

---

### 8. **Voice Sorting & Organization** ⭐⭐⭐

**Current Implementation (system.js):**

```javascript
const mappedVoices = voices
  .sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name))
  .map((x) => ({
    name: x.name,
    voice_id: x.voiceURI,
    preview_url: false,
    lang: x.lang,
  }));
```

**What It Does:**

- Sorts voices by language, then by name
- Provides consistent voice ordering
- Maps to standardized format

**Our Current Implementation:**

- ⚠️ Browser TTS model doesn't fetch/sort voices

**Recommendation:**

- ✅ **Add voice fetching and sorting** to BrowserTTSModel
- Useful for voice selection UI

**Implementation Priority:** Low - Nice to have

---

## Summary of Action Items

### High Priority (Implement Soon)

1. ✅ **Improve text chunking algorithm** - Use regex-based pattern for better sentence boundary detection
2. ✅ **Add mobile user interaction handling** - Pre-initialize AudioContext on user click/touch
3. ✅ **Add voice fallback strategy** - Handle empty voice lists gracefully

### Medium Priority (Consider)

4. ✅ **Apply setTimeout pattern** to browser TTS voice fetching
5. ✅ **Add voice fetching/sorting** to BrowserTTSModel

### Low Priority (Monitor)

6. ⚠️ **Monitor for speech synthesis event issues** - Apply setTimeout pattern if needed
7. ⚠️ **Consider runtime settings validation** - If settings come from external sources

---

## Code Patterns to Adopt

### Pattern 1: Improved Text Chunking

```typescript
function chunkText(text: string, chunkSize: number): string[] {
  const regex = new RegExp(
    `^[\\s\\S]{${Math.floor(chunkSize / 2)},${chunkSize}}[.!?,]{1}|` +
      `^[\\s\\S]{1,${chunkSize}}$|` +
      `^[\\s\\S]{1,${chunkSize}} `
  );

  const chunks: string[] = [];
  let offset = 0;

  while (offset < text.length) {
    const remaining = text.substring(offset);
    const match = remaining.match(regex);

    if (match && match[0].length > 2) {
      chunks.push(match[0]);
      offset += match[0].length;
    } else {
      // Fallback: take remaining text
      chunks.push(remaining);
      break;
    }
  }

  return chunks;
}
```

### Pattern 2: Mobile User Interaction

```typescript
function initializeMobileTTS() {
  if (isMobile()) {
    let initialized = false;
    const handler = () => {
      if (initialized) return;

      // Pre-initialize AudioContext
      const ctx = new AudioContext();
      ctx.resume();

      // Enable speech synthesis (iOS workaround)
      const utterance = new SpeechSynthesisUtterance(' ');
      utterance.volume = 0;
      window.speechSynthesis.speak(utterance);

      initialized = true;
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
    };

    document.addEventListener('click', handler);
    document.addEventListener('touchstart', handler);
  }
}
```

### Pattern 3: Voice Fallback

```typescript
function getVoicesWithFallback(): Promise<Voice[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const voices = window.speechSynthesis.getVoices();

      if (voices.length === 0) {
        resolve([
          {
            name: 'Browser Default',
            voiceId: '__browser_default__',
            lang: navigator.language || 'en-US',
          },
        ]);
      } else {
        resolve(
          voices
            .map((v) => ({
              name: v.name,
              voiceId: v.voiceURI,
              lang: v.lang,
            }))
            .sort(
              (a, b) =>
                a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name)
            )
        );
      }
    }, 50);
  });
}
```

---

## Conclusion

The `system.js` module provides several valuable patterns that can improve our streaming-first TTS implementation:

1. **Better text chunking** - More intelligent sentence boundary detection
2. **Mobile support** - Critical user interaction handling for iOS
3. **Robustness** - Better error handling and fallback strategies
4. **Browser compatibility** - Workarounds for known browser quirks

The most critical improvements are:

- Mobile user interaction handling (High Priority)
- Improved text chunking algorithm (High Priority)
- Voice fallback strategy (High Priority)

These improvements will make our TTS service more robust, especially on mobile devices and with various browser implementations.
