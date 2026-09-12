# Morse Practice · CW Studio v3

Static GitHub Pages application for the Learn CW course, custom CW audio/video sessions and head-copy practice.

## Voice packs

CW Studio v3 auto-detects the existing generated voice-pack folders. You do **not** need to move or rename the audio files. Supported layouts include:

```text
assets/voices/core/...
assets/voices/course/...

assets/voices/morse_practice_voicepack/...
assets/voices/morse_practice_course_voicepack/...
```

The app probes a known MP3 inside each pack and then uses that detected root for JSON indexes and direct fallbacks.

## Main v3 changes

- Learn CW course is fixed and non-editable, starts at 15 WPM.
- Actual voice-file duration is measured before building a lesson, keeping CW, narration and visuals aligned.
- Course progress and current lesson are stored in `localStorage`.
- Previous/Next lesson navigation.
- Custom Session rebuilt as a 4-step guided wizard.
- Familiarization stays limited to letters/numbers and uses mnemonic visual slots; no dots/dashes are shown.
- Metadata is embedded in WAV/MP3 exports; no separate metadata download button.
- Video export records the canvas + generated audio into `.webm` in real time.
- CW remains pure sine-wave audio with smooth amplitude ramps to avoid clicks and harsh keying artifacts.
