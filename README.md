# Morse Practice · CW Studio v2

Static GitHub Pages application for the Learn CW course, custom CW audio/video sessions and head-copy practice.

## Voice packs

Do **not** reorganize the generated voice folders. Copy the generated pack contents directly into these folders:

```text
assets/voices/core/
  es/
  en/
  voice_index.json
  manifest.json            (optional for the app)

assets/voices/course/
  es/
  en/
  course_voice_index.json
  course_voice_manifest.json   (optional for the app)
  curriculum_course.json       (optional for the app)
```

The app also contains a path fallback for the critical course clips and A-Z/0-9, so Learn CW can still find them if an index JSON was renamed or omitted.

## Main v2 changes

- Learn CW course is fixed and non-editable, starts at 15 WPM.
- Actual voice-file duration is measured before building a lesson, keeping CW, narration and visuals aligned.
- Course progress and current lesson are stored in `localStorage`.
- Previous/Next lesson navigation.
- Custom Session rebuilt as a 4-step guided wizard.
- Familiarization stays limited to letters/numbers and uses mnemonic visual slots; no dots/dashes are shown.
- Metadata is embedded in WAV/MP3 exports; no separate metadata download button.
- Video export records the canvas + generated audio into `.webm` in real time.
- CW remains pure sine-wave audio with smooth amplitude ramps to avoid clicks and harsh keying artifacts.
