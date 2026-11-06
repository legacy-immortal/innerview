# Custom Kokoro Implementation Analysis

## Question: Can we use `@huggingface/transformers` for a custom Kokoro implementation?

## Current State

### Existing Dependencies

**Frontend:**

- ✅ `@built-in-ai/transformers-js@^0.1.0` - Already installed
- Used for transcription (Whisper models)

**Backend:**

- ✅ `@huggingface/transformers@^3.7.6` - Already installed
- Used for embeddings and transcription

### Current Kokoro Implementation

- Uses bundled `kokoro.web.js` (~2MB)
- Contains ONNX Runtime Web + Kokoro TTS model
- Model: `onnx-community/Kokoro-82M-v1.0-ONNX`

## Key Technical Consideration

### ⚠️ **Critical Issue: Model Type Mismatch**

**Kokoro TTS is NOT a Transformers Model**

1. **Kokoro TTS**:
   - Pure ONNX model
   - Designed for ONNX Runtime Web
   - Not part of HuggingFace Transformers ecosystem
   - Model ID: `onnx-community/Kokoro-82M-v1.0-ONNX`

2. **`@huggingface/transformers`**:
   - Designed for **HuggingFace Transformers models**
   - Uses ONNX Runtime internally, but expects transformers model architecture
   - Supports tasks like: text-to-speech, but only for transformers-based TTS models
   - Cannot directly load arbitrary ONNX models

### What `@huggingface/transformers` Supports

✅ **Supported Tasks:**

- Text-to-speech (TTS) - but only transformers-based models
- Automatic speech recognition (ASR)
- Text classification
- Image classification
- And other transformers tasks

❌ **NOT Supported:**

- Arbitrary ONNX models
- Non-transformers architecture models
- Direct ONNX Runtime Web integration

## Options for Custom Implementation

### Option 1: Use `@huggingface/transformers` with a Transformers TTS Model

**Feasibility**: ✅ Possible, but requires model change

**Approach:**

```typescript
import { pipeline } from '@huggingface/transformers';

// Use a transformers-based TTS model instead of Kokoro
const tts = await pipeline('text-to-speech', 'microsoft/speecht5_tts', {
  device: 'wasm',
});
```

**Pros:**

- ✅ Uses existing dependency
- ✅ Unified API with other transformers models
- ✅ Official HuggingFace support

**Cons:**

- ❌ **Different model** - Not Kokoro (different voices, quality, size)
- ❌ **Different API** - Would need to rewrite Kokoro integration
- ❌ **Larger models** - Transformers TTS models are typically larger
- ❌ **Different voice system** - Would lose Kokoro's 48 voices

### Option 2: Use ONNX Runtime Web Directly

**Feasibility**: ✅ Possible, but complex

**Approach:**

```typescript
import * as ort from 'onnxruntime-web';

// Load ONNX model directly
const session = await ort.InferenceSession.create('kokoro-model.onnx');
// Implement tokenizer, preprocessing, postprocessing manually
```

**Pros:**

- ✅ Direct control over model execution
- ✅ Can use Kokoro model exactly as-is
- ✅ No dependency on transformers.js

**Cons:**

- ❌ **High complexity** - Need to implement:
  - Tokenizer (Jinja templates)
  - Text preprocessing
  - Voice embedding loading
  - Audio postprocessing
  - Model input/output handling
- ❌ **More code to maintain**
- ❌ **Reinventing the wheel** - `kokoro-js` already does this

### Option 3: Use Official `kokoro-js` Package

**Feasibility**: ✅ Recommended

**Approach:**

```typescript
import { KokoroTTS } from 'kokoro-js';

const tts = await KokoroTTS.from_pretrained(
  'onnx-community/Kokoro-82M-v1.0-ONNX',
  {
    dtype: 'q8',
    device: 'wasm',
  }
);
```

**Pros:**

- ✅ **Official package** - Maintained and updated
- ✅ **Same model** - Exact Kokoro TTS
- ✅ **Same API** - Drop-in replacement
- ✅ **Well-tested** - Community support
- ✅ **Proper dependencies** - ONNX Runtime Web managed correctly
- ✅ **TypeScript support** - Likely has types

**Cons:**

- ❌ Adds new dependency (but replaces bundled file)

## Recommendation

### ❌ **Do NOT use `@huggingface/transformers` for Kokoro**

**Reasons:**

1. **Architecture Mismatch**: Kokoro is not a transformers model
2. **Model Incompatibility**: `@huggingface/transformers` cannot load Kokoro's ONNX model
3. **Unnecessary Complexity**: Would require significant custom implementation
4. **Better Alternatives Exist**: `kokoro-js` is the official solution

### ✅ **Recommended Approach: Use `kokoro-js`**

**Why:**

- Designed specifically for Kokoro TTS
- Handles all the complexity (tokenizer, preprocessing, ONNX Runtime)
- Official support and maintenance
- Drop-in replacement for current bundled file
- Smaller bundle size (tree-shaking)

### Alternative: If You Want Transformers Integration

If you want to use `@huggingface/transformers` for TTS, consider:

1. **Switch to a Transformers TTS Model**:
   - `microsoft/speecht5_tts`
   - `facebook/mms-tts`
   - Other HuggingFace TTS models

2. **Trade-offs**:
   - Different voices (lose Kokoro's 48 voices)
   - Different quality characteristics
   - Potentially larger models
   - Unified API with other transformers models

## Conclusion

**Answer: No, `@huggingface/transformers` cannot be used for Kokoro TTS** because:

1. Kokoro is an ONNX model, not a transformers model
2. `@huggingface/transformers` expects transformers architecture
3. Would require significant custom implementation
4. Better alternatives exist (`kokoro-js`)

**Best Path Forward:**

- Use official `kokoro-js` npm package
- Keep `@huggingface/transformers` for other tasks (transcription, embeddings)
- Remove bundled `kokoro.web.js` file
