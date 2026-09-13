# CW Studio v2.9 — Export audit

## Root cause found in v2.8
The audio exporter inserted multiple `OfflineAudioContext.suspend()` checkpoints to make
the progress bar appear granular. `suspend()` is not uniformly supported and is not needed
to render the export. On custom/head-copy timelines this added a browser-dependent failure/
stall point that the normal course export did not reliably expose.

v2.9 removes all suspend/resume checkpoints.

## Unified audio path
Course, Custom and finite Head Copy now use exactly the same `renderOffline()` pipeline:
1. validate finite duration;
2. create one mono 44.1 kHz OfflineAudioContext;
3. collect UNIQUE voice IDs;
4. fetch/decode every unique clip once;
5. schedule all CW/check/voice events;
6. call startRendering() once;
7. encode WAV or MP3.

Repeated character voices in Custom sessions therefore reuse the same decoded AudioBuffer.

The progress shown while startRendering() runs is intentionally a UI heartbeat, not fake
timeline completion. Web Audio does not expose granular standard render progress.

## Continuous Head Copy
Still intentionally non-exportable because it is an infinite loop. Finite Head Copy
challenges use the same audio exporter as Course and Custom.

## Video
The preferred path remains offline MP4 (WebCodecs + Mediabunny). If it fails, v2.9 still
falls back to MediaRecorder/WebM in real time for compatibility. If export duration is close
to playback duration, that means the fast path failed and the compatibility path was used.
The browser console now retains the exact fast-path error for diagnosis.
