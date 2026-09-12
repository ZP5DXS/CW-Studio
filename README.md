# Morse Practice · CW Studio v1

Static GitHub Pages app. No backend.

## Design decisions
- **Learn CW is fixed and non-editable.** 20 curated lessons.
- **Create Session is separate.** Familiarization is limited to A–Z / 0–9; Recognition and Marathon support broader content.
- No dots/dashes are shown in the UI.
- CW is synthesized in-browser with a sine oscillator and smooth 7 ms raised-cosine style attack/release ramps to prevent clicks/harsh edges.
- Voice is static: Core Voice Pack + Course Voice Pack.
- Visuals and audio use the same timeline.

## Install voice packs
Copy the generated Core Voice Pack contents into:

`assets/voices/core/`

Copy the generated Course Voice Pack contents into:

`assets/voices/course/`

The app expects these index files:
- `assets/voices/core/voice_index.json`
- `assets/voices/course/course_voice_index.json`

## Run locally
Use a local HTTP server (ES modules and fetch do not work reliably via file://):

```powershell
py -m http.server 8000
```

Then open `http://localhost:8000`.

## Mnemonics
Reserved locations:
- `assets/mnemonics/es/`
- `assets/mnemonics/en/`

Mnemonics are shown only during familiarization of individual letters/numbers. They are not used for callsigns, words, abbreviations, or QSO sequences.

## Export
- WAV: offline render.
- MP3: offline render through lamejs loaded from CDN.
- WebM: visual/audio architecture is prepared; real-time capture exporter should be added next.

## Course v1 sequence
TEA → NIM → SOR → KDU → GWH → LPF → BVC → YXJ → QZ → consolidation → 1–0 → callsigns → operating vocabulary → QSO.
