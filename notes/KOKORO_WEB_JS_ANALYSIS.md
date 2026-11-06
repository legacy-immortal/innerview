# Kokoro Web.js Analysis

## What is `kokoro.web.js`?

The `kokoro.web.js` file is a **bundled JavaScript module** (~2MB) that contains:

1. **Kokoro TTS Model Implementation** - The actual TTS engine
2. **ONNX Runtime Web** - WebAssembly-based inference engine (`onnxruntime-web`)
3. **HuggingFace Jinja** - Template processing library (`@huggingface/jinja`)
4. **Other dependencies** - Various supporting libraries bundled together

### File Characteristics

- **Size**: ~2.02 MB (very large for a source file)
- **Format**: Webpack/bundled JavaScript module
- **Location**: `src/lib/tts/kokoro/kokoro.web.js`
- **Type**: Bundled/minified JavaScript (not source code)

### What It Does

The file exports a `KokoroTTS` class that:

- Loads the Kokoro-82M-v1.0-ONNX model from HuggingFace
- Runs inference using ONNX Runtime WebAssembly
- Generates speech audio from text input
- Supports multiple voices (48 built-in voices)
- Supports streaming generation

## Where Did It Come From?

Based on the code structure and imports, this appears to be:

1. **A bundled version** of the official Kokoro TTS library
2. **Possibly from**:
   - A custom webpack build of `kokoro-js` npm package
   - An older version of the library
   - A custom bundle created for a specific use case

The file contains references to:

- `onnxruntime-web` (ONNX Runtime for Web)
- `@huggingface/jinja` (Jinja template engine)
- Model ID: `onnx-community/Kokoro-82M-v1.0-ONNX`

## Official Implementation Available

✅ **Yes, there is an official npm package**: `kokoro-js`

### Package Details

- **Package Name**: `kokoro-js`
- **NPM**: https://www.npmjs.com/package/kokoro-js
- **Model**: `onnx-community/Kokoro-82M-v1.0-ONNX` (same as current)
- **Features**:
  - Same API (`KokoroTTS.from_pretrained()`)
  - Same voices
  - Same model support
  - Official maintenance and updates

### Benefits of Using Official Package

1. **Maintenance**: Regularly updated with bug fixes and improvements
2. **Type Safety**: Likely has TypeScript definitions
3. **Smaller Bundle**: Only includes what you need (tree-shaking)
4. **Community Support**: Official documentation and community
5. **Version Management**: Easy to update via npm/yarn
6. **Dependency Management**: Proper dependency resolution

## Recommendation: Replace with Official Package

### Migration Steps

1. **Install the official package**:

   ```bash
   yarn add kokoro-js
   ```

2. **Update `kokoro-worker.ts`**:

   ```typescript
   // Replace this:
   const kokoroModule = await import('./kokoro.web.js');

   // With this:
   import { KokoroTTS } from 'kokoro-js';
   ```

3. **Update initialization**:

   ```typescript
   // The API should be identical:
   tts = await KokoroTTS.from_pretrained(settings.modelId, {
     dtype: settings.dtype,
     device: settings.device,
   });
   ```

4. **Remove the bundled file**:
   - Delete `src/lib/tts/kokoro/kokoro.web.js`
   - Update `.gitignore` if needed

### Potential Issues to Watch For

1. **API Compatibility**: Verify the API matches exactly
2. **Bundle Size**: Check if the npm package increases bundle size
3. **Worker Context**: Ensure it works in Web Worker context
4. **Import Paths**: May need to adjust import paths

### Testing Checklist

- [ ] Verify `KokoroTTS.from_pretrained()` works
- [ ] Test voice generation
- [ ] Test streaming generation
- [ ] Verify Web Worker compatibility
- [ ] Check bundle size impact
- [ ] Test all voice options

## Current Status

- ✅ **Official package exists**: `kokoro-js`
- ✅ **Same model**: `onnx-community/Kokoro-82M-v1.0-ONNX`
- ✅ **Same API**: `KokoroTTS.from_pretrained()`
- ⚠️ **Migration needed**: Replace bundled file with npm package

## Conclusion

The `kokoro.web.js` file is a bundled version of the Kokoro TTS library. **You should replace it with the official `kokoro-js` npm package** for better maintainability, updates, and proper dependency management. The migration should be straightforward since the API appears to be identical.
