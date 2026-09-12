# Morse Practice · CW Studio v4

Static GitHub Pages app for Learn CW, custom CW audio/video sessions and head-copy practice.

## v4 fixes
- Voice assets are resolved lazily across the existing generated folder layouts; audio files do not need to be moved or renamed.
- Local JS modules include a v4 cache-buster so GitHub Pages/browser cache cannot keep an older voice-path detector alive.
- Learn CW character cadence is now: CW -> pause -> reveal + spoken character -> short pause -> CW confirmation -> polyphonic courtesy chime -> pause -> next character.
- Courtesy sound is a five-hit polyphonic `tuk-tuk / tu-ru-tu` chime, deliberately unlike Morse.
- Spoken character confirmation continues throughout character-learning recognition rounds.
- Course character speed remains 15 WPM.
- CW remains generated as smooth sine-wave keying with raised amplitude ramps.

## Voice packs
Keep the audio exactly where it already is. The app tries `core/course`, generated-folder names with underscores/hyphens/spaces, and direct `assets/voices` layouts automatically.
