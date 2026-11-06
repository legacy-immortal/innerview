# BackgroundControlPanel refactor plan

## Goal

Break the monolithic BackgroundControlPanel.tsx (~7600 lines) into smaller, maintainable components without changing behavior or public API.

## Done

- **backgroundControlUtils.ts** – `DEFAULT_COLORS`, `THEME_PRESETS`, `rgbToHex`, `hexToRgb`, `ThemePreset`.
- **BackgroundTypeSelector.tsx** – Background type dropdown + opacity slider.
- **SystemTextSection.tsx** – System text collapsible (Appear/Hold/Fade out).
- **SystemVisualizationSection.tsx** – System visualization collapsible (Source, Cycle, Duration, scale/color/offset, Clock show seconds).
- **Type panels (all):** HypnoticControls, DitherControls, WavesControls, PixelBlastControls, OrbControls, ThreadsControls, PulsarControls, SeeleControls, ColorControls, ImageDitherControls. Panel now composes all; remaining optional: WaveformSection.

## Constraints

- **Contract**: `BackgroundControlPanel` props and export stay unchanged. Re-export `WaveformLayer` and `WaveformSettings` from the panel (or from a shared types module) so existing imports (InterlocutorChat, CircularVisualization, useSystemDataSource, etc.) keep working.
- **State**: All settings state and update callbacks remain in the parent; section components receive them as props. Local UI state (collapsible open/closed) can live in parent (passed down) or in each section.
- **Blast radius**: No changes to InterlocutorChat, CircularVisualization, or other consumers except possibly updating imports if we move types to a shared file.

## Section map (by line comment)

| Section                                                     | Approx lines | File to create                   |
| ----------------------------------------------------------- | ------------ | -------------------------------- |
| Shared utils (constants, rgbToHex, hexToRgb, THEME_PRESETS) | ~270         | `backgroundControlUtils.ts`      |
| Background type + opacity                                   | ~90          | `BackgroundTypeSelector.tsx`     |
| System text                                                 | ~143         | `SystemTextSection.tsx`          |
| System visualization                                        | ~258         | `SystemVisualizationSection.tsx` |
| Waveform (enable + nested collapsibles)                     | ~1555        | `WaveformSection.tsx`            |
| Hypnotic                                                    | ~1038        | `HypnoticControls.tsx`           |
| Dither                                                      | ~331         | `DitherControls.tsx`             |
| Waves                                                       | ~421         | `WavesControls.tsx`              |
| PixelBlast                                                  | ~427         | `PixelBlastControls.tsx`         |
| Orb                                                         | ~158         | `OrbControls.tsx`                |
| Threads                                                     | ~231         | `ThreadsControls.tsx`            |
| Pulsar                                                      | ~1059        | `PulsarControls.tsx`             |
| SEELE                                                       | ~367         | `SeeleControls.tsx`              |
| Color                                                       | ~368         | `ColorControls.tsx`              |
| Image Dither                                                | ~544         | `ImageDitherControls.tsx`        |

## Implementation order

1. **Utils** – Extract constants and helpers to `backgroundControlUtils.ts`; main panel and Hypnotic (and others that use THEME_PRESETS/rgbToHex) import from it.
2. **Types** – Ensure `WaveformLayer` and `WaveformSettings` are imported from `@/lib/settings-types` in the panel and re-exported so existing imports from `BackgroundControlPanel` still work (or add a small `backgroundControlTypes.ts` that re-exports and defines section props).
3. **BackgroundTypeSelector** – Small, no type-specific state. Takes `settings`, `onSettingsChange`, `onBackgroundTypeChange` (or use onSettingsChange with full settings).
4. **SystemTextSection** – Collapsible + fields. Takes `settings`, `updateSystemTextSetting`, `open`, `onOpenChange`.
5. **SystemVisualizationSection** – Same pattern. Takes `settings`, update callbacks, open state.
6. **WaveformSection** – Large; single file first. Takes waveform props and all waveform callbacks.
7. **Type-specific panels** – Hypnotic, then Dither, Waves, PixelBlast, Orb, Threads, Pulsar, Seele, Color, ImageDither. Each receives `settings`, its typed updater, and open state.
8. **Wire** – Main panel imports all sections, passes props, renders in same order. Remove inlined JSX. Verify lint and runtime.

## Pitfalls

- **updateColorSetting** merges with default color object; ensure ColorControls still gets that behavior.
- **Image dither** uses a file input ref (`imageDitherFileInputRef`); pass ref or callback from parent.
- **Waveform layers** use `expandedLayers` state; keep in parent and pass down.
- Chakra `Field.Root` must wrap any `Field.Label`; keep that pattern in extracted components.

## Success criteria

- BackgroundControlPanel.tsx under ~1000 lines (or significantly reduced).
- No change to BackgroundControlPanelProps or export surface.
- All existing call sites (InterlocutorChat, etc.) work without modification or with minimal import path change.
- Lint clean; app runs and background controls work as before.
