# Browser TTS Implementation Comparison

## Overview

Comparison between `tts/system.js` (legacy implementation) and `src/lib/tts/browser/browser-model.ts` (current implementation).

---

## Key Differences

### 1. **Text Chunking** ⭐⭐⭐⭐⭐

**`system.js` - HAS sophisticated chunking:**

```javascript
var speechUtteranceChunker = function (utt, settings, callback) {
  var chunkLength = (settings && settings.chunkLength) || 160;
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
  // Recursively chunks long text at sentence boundaries
  // Fixes Chrome inconsistencies with long texts
};
```

**`browser-model.ts` - MISSING chunking:**

- No text chunking implementation
- May have issues with long texts in Chrome
- Direct `SpeechSynthesisUtterance` usage

**Impact:** ⚠️ **High** - Long texts may fail or behave inconsistently in Chrome

---

### 2. **Mobile/iOS Support** ⭐⭐⭐⭐

**`system.js` - HAS mobile initialization:**

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

**`browser-model.ts` - MISSING mobile initialization:**

- No iOS user interaction workaround
- May fail on iOS devices due to autoplay restrictions

**Impact:** ⚠️ **High** - iOS users may experience TTS failures

---

### 3. **Pitch Support** ⭐⭐⭐

**`system.js` - HAS pitch control:**

```javascript
defaultSettings = {
  rate: 1,
  pitch: 1, // ✅ Pitch support
};
utterance.pitch = this.settings.pitch || 1;
```

**`browser-model.ts` - MISSING pitch control:**

```typescript
utterance.rate = options.speed || 1.0;
// ❌ No pitch property
```

**Impact:** ⚠️ **Medium** - Less voice customization

---

### 4. **Voice Fetching Pattern** ⭐⭐⭐

**Both implementations use similar patterns:**

- ✅ `setTimeout` pattern (50ms delay)
- ✅ Empty voice list fallback
- ✅ Default voice when no voices available
- ✅ Sorting by language and name

**Differences:**

- `system.js`: Returns `voice_id` field
- `browser-model.ts`: Returns `voiceId` field (camelCase)
- `system.js`: Includes `preview_url: false` field
- `browser-model.ts`: Caches voices (`voicesCache`)

**Impact:** ✅ **Low** - Both work, minor API differences

---

### 5. **Error Handling** ⭐⭐⭐

**`system.js` - More comprehensive:**

```javascript
utterance.onerror = (event) => {
  console.error(`SystemTTS Preview Error: ${event.error}`, event);
};
// Error handling in previewTtsVoice
// Error handling in generateTts
```

**`browser-model.ts` - Basic:**

- No explicit error handlers on utterances
- Relies on default browser behavior

**Impact:** ⚠️ **Medium** - Less visibility into failures

---

### 6. **Architecture** ⭐⭐

**`system.js` - Legacy provider pattern:**

- Class-based provider
- UI settings management (`settingsHtml`, `onSettingsChange`)
- jQuery dependencies (`$('#system_tts_rate')`)
- Returns silence MP3 on completion

**`browser-model.ts` - Modern interface pattern:**

- Implements `StreamingTTSModel` interface
- TypeScript with proper types
- No UI dependencies
- Returns `SpeechSynthesisUtterance` directly

**Impact:** ✅ **Low** - Architectural preference, both work

---

### 7. **Settings Management** ⭐⭐

**`system.js` - HAS UI settings:**

```javascript
get settingsHtml() {
    return '<label>Rate: <span id="system_tts_rate_output"></span></label>...';
}
onSettingsChange() {
    this.settings.rate = Number($('#system_tts_rate').val());
    // Updates UI and saves settings
}
```

**`browser-model.ts` - NO UI settings:**

- Settings managed externally
- No built-in UI components

**Impact:** ✅ **Low** - UI is handled elsewhere in our app

---

### 8. **Voice Lookup** ⭐⭐⭐

**`system.js` - Multiple lookup methods:**

```javascript
async getVoice(voiceName) {
    // Looks up by name
    const match = voices.find(x => x.name == voiceName);
}
// Also has previewTtsVoice(voiceId)
```

**`browser-model.ts` - Single lookup method:**

```typescript
private async getVoiceById(voiceId?: string) {
    // Looks up by voiceURI or name
    voices.find((v) => v.voiceURI === voiceId) ||
    voices.find((v) => v.name === voiceId)
}
```

**Impact:** ✅ **Low** - Both support voice lookup, different approaches

---

### 9. **Console Logging Fix** ⭐⭐⭐⭐

**`system.js` - HAS workaround:**

```javascript
console.log(newUtt); //IMPORTANT!! Do not remove: Logging the object out fixes some onend firing issues.
```

**`browser-model.ts` - MISSING workaround:**

- No console.log workaround
- May experience `onend` firing issues

**Impact:** ⚠️ **Medium** - Known Chrome bug workaround missing

---

### 10. **Return Values** ⭐⭐

**`system.js` - Returns silence MP3:**

```javascript
const silence = await fetch('/sounds/silence.mp3');
utterance.onend = () => resolve(silence);
// Returns Response object
```

**`browser-model.ts` - Returns utterance:**

```typescript
return utterance; // Returns SpeechSynthesisUtterance
```

**Impact:** ✅ **Low** - Different return types, both valid

---

## Missing Features in Our Implementation

### High Priority ⚠️

1. **Text Chunking** - Critical for long texts in Chrome
   - Implement `speechUtteranceChunker` pattern
   - Handle recursive chunking at sentence boundaries
   - Fix Chrome inconsistencies

2. **Mobile/iOS Initialization** - Critical for iOS compatibility
   - Pre-initialize Speech Synthesis on user interaction
   - Handle iOS autoplay restrictions

3. **Console.log Workaround** - Important for Chrome compatibility
   - Add `console.log(utterance)` before speaking
   - Fixes `onend` event firing issues

### Medium Priority

4. **Pitch Support** - Voice customization
   - Add `pitch` parameter to `TTSOptions`
   - Set `utterance.pitch` property

5. **Error Handling** - Better debugging
   - Add `onerror` handlers to utterances
   - Log errors with context

### Low Priority

6. **Voice Preview** - User experience
   - Implement `previewTtsVoice` method
   - Allow users to test voices before use

---

## Recommendations

### Immediate Actions

1. ✅ **Add text chunking** - Port `speechUtteranceChunker` function
2. ✅ **Add mobile initialization** - Port iOS workaround
3. ✅ **Add console.log workaround** - Fix Chrome `onend` issues

### Future Enhancements

4. ⚠️ **Add pitch support** - Extend `TTSOptions` interface
5. ⚠️ **Improve error handling** - Add comprehensive error handlers
6. ⚠️ **Add voice preview** - Implement preview functionality

---

## Code Patterns to Port

### 1. Text Chunking Function

```typescript
function speechUtteranceChunker(
  utterance: SpeechSynthesisUtterance,
  settings: { chunkLength?: number; offset?: number },
  callback?: () => void
): void {
  // Port the chunking logic from system.js
}
```

### 2. Mobile Initialization

```typescript
private initializeMobileSupport(): void {
  if (isMobile()) {
    // Port iOS workaround
  }
}
```

### 3. Enhanced Speak Method

```typescript
async speak(options: TTSOptions): Promise<SpeechSynthesisUtterance> {
  const utterance = new SpeechSynthesisUtterance(options.text);
  // ... existing code ...

  // Add chunking for long texts
  if (options.text.length > 200) {
    return this.speakChunked(utterance, options);
  }

  // Add console.log workaround
  console.log(utterance);

  // Add error handling
  utterance.onerror = (event) => {
    console.error('Browser TTS error:', event);
  };

  setTimeout(() => {
    window.speechSynthesis.speak(utterance);
  }, 0);

  return utterance;
}
```

---

## Conclusion

Our `browser-model.ts` implementation is **simpler and more modern**, but **missing critical features** from `system.js`:

- ❌ Text chunking (critical for Chrome)
- ❌ Mobile/iOS initialization (critical for iOS)
- ❌ Console.log workaround (important for Chrome)
- ❌ Pitch support (nice to have)
- ❌ Comprehensive error handling (nice to have)

**Recommendation:** Port the high-priority features (chunking, mobile init, console.log) to ensure compatibility and reliability.
