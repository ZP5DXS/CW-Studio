# CW Studio v2.8 — Head Copy / Export Stability Audit

## Continuous Head Copy
Previous behavior built 5,000 items into one timeline. At 15 WPM this produced a timeline of roughly nine hours (the UI showed hundreds of minutes), thousands of events, and potentially multi-gigabyte OfflineAudioContext allocations if export was attempted.

v2.8 builds only a ~20 minute chunk and marks it `loopPlayback`. Playback automatically starts the chunk again when it reaches the end. The UI displays the duration as ∞. WAV, MP3 and VIDEO export are disabled for this infinite/live mode.

This keeps "continuous" behavior without a huge timeline or memory spike.

## Audio export
The apparent freeze at "rendering audio" was caused by `OfflineAudioContext.startRendering()` providing no intermediate progress. It was especially severe if a very long timeline was sent to it.

v2.8:
- refuses `noExport` infinite timelines;
- refuses finite timelines longer than two hours;
- uses OfflineAudioContext suspend/resume checkpoints when available to expose real timeline render progress;
- falls back to a moving heartbeat progress indicator when checkpoints are unavailable;
- remaps MP3 encoding progress to the remaining percentage after audio rendering.

## Audio clips
No voice files are regenerated in this build. English atomic-character repair and the requested Spanish TTS pronunciation change for "caracter" are intentionally deferred to the next voice-pack regeneration so audio changes can be validated separately from player/export stability.
