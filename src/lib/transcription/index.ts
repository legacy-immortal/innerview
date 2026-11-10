/**
 * @file transcription/index.ts — Public entry point for the transcription module.
 * @module lib/transcription
 *
 * Public entry point for the transcription module. Re-exports the local
 * (browser/backend) provider, the transcription service dispatcher, and the
 * startup/test initialization routines so consumers can import from one path.
 */
export * from './local';
export * from './transcription-service';
export * from './transcription-init';
