# Morse Practice · CW Studio v2.5

CW Studio is a free, browser-based environment for learning CW, building custom Morse practice sessions, producing long-form training audio/video, and continuing into Head Copy.

It combines a structured Learn CW course, reusable human narration, smooth sine-wave CW synthesis, bilingual mnemonic familiarization, generative 2D visuals, local progress, and export tools. No account and no backend are required for the core experience.

## Main areas

- **Learn CW** — 20 guided lessons, freely selectable.
- **Create Session** — a guided builder for familiarization, recognition, marathon listening and custom material.
- **Head Copy** — dedicated post-course challenges using the bonus narration already included in the Course Voice Pack.
- **Audio export** — WAV and MP3 generated in the browser.
- **Video export** — synchronized WebM using the same timeline and visuals as playback.
- **Living Line** — one 2D luminous line morphs between narration, CW keying, instructional symbols and mnemonic silhouettes.

## Audio packs

CW Studio uses the two static voice packs generated for Morse Practice. The repository layout currently in use is intentionally preserved; the application reads the JSON indexes generated with the packs rather than renaming MP3 files.

## Mnemonics

`MNEMONICS.md` and `data/mnemonics.json` contain the complete original ES/EN A–Z + 0–9 association table. Mnemonics are used only in Familiarization; Recognition intentionally removes that assistance.

## Privacy and architecture

The project is designed for static hosting on GitHub Pages. Course progress is stored locally in the browser. Core operation does not require a server-side account.

## About

Created as part of the Morse Practice ecosystem by **ZP5DXS** to make CW practice easier to share, more engaging to watch, and useful both as an interactive lesson and as long-form audio/video training.

Free and open source. No ads.

**Courtesy of ZP5DXS · Facebook: ZP5DXS**

73.


## v2.5 visual rules

- The CW ECG/keying trace is intentionally used only during **Familiarization**.
- Recognition, Marathon, QSO and Head Copy use a flowing Living Line instead, avoiding compressed rows of keying pulses for long words and callsigns.
- Mnemonic silhouettes are limited to new-character familiarization.
- Narration uses a filled electric mouth: outer lips plus internal energy ribs.
- Covers are visually clean; no clock or other figure appears unless the narration calls for it.
- Production UI hides internal voice-pack/debug status after successful loading.


## v2.5 Familiarization timing

The visual timing is now explicit:

1. First CW transmission begins.
2. The mnemonic silhouette and mnemonic word appear immediately and remain visible.
3. The spoken character answer plays while the same mnemonic remains on screen.
4. The mnemonic disappears.
5. The character is transmitted once more as confirmation.
6. A short neutral visual gap clears the canvas.
7. Courtesy tone.
8. Next character.

Recognition begins only after a hard neutral visual boundary, so no Familiarization mnemonic can persist into Recognition.

The CW ECG is drawn over a full-width continuous baseline and is used only during Familiarization. Recognition / Marathon / QSO / Head Copy use the fluid Living Line.


## v2.5 — One Line

The visual system now follows one strict rule: **there is always one continuous luminous line**.

- idle / covers: flat living baseline
- narration: the same line becomes a voice waveform
- Familiarization CW: the same line becomes the dit/dah ECG trace
- Recognition / Marathon / QSO / Head Copy: the same line becomes a flowing waveform
- mnemonic: the line temporarily morphs into the mnemonic silhouette, then returns to baseline

No second mouth outline, no stacked visual traces and no overlapping visual systems.

The progress line is seekable like a video. Click/tap the lower timeline area to jump to a different point in the lesson or session. Spoken audio can resume from inside a voice clip; partial CW elements are skipped so Morse is never restarted in a malformed partial state.


## v2.5

- WAV / MP3 / Video exports now share the same control strip as Play / Stop / Fullscreen.
- Custom letters and numbers are randomized by default using the session seed.
- Advanced settings include **Random order** (enabled by default). Disable it for natural A→Z / 0→9 ordering.
- The single-line voice waveform has substantially more amplitude while preserving the Living Line concept.
- Multiple mnemonic silhouettes were redrawn as cleaner single-stroke pictograms.
- Learn CW lesson-specific outro narration is part of the normal lesson timeline, so it plays both on the website and in exported audio/video. It is not export-only.


## v2.5 course logic

See `COURSE_LOGIC.md`. Narrated review/new-character/group/marathon transitions now have matching exercises immediately after them. Lesson 14 uses real callsigns, and Lessons 15–20 now follow the operational curriculum rather than generic random-character drills.


## v2.5 — stable-candidate interaction cleanup

- Voice selector shows only the voice names: AURA / NEXO in Spanish and NOVA / VECTOR in English.
- Female voice control uses a subtle purple interior accent; male uses turquoise.
- Custom content labels are now **DX Prefixes** and **Full Callsigns**.
- Custom-session Familiarization keeps the useful CW → visual/voice → CW confirmation pattern, but it no longer blindly copies the course pacing.
- **Courtesy tone between characters** is an Advanced option and is OFF by default in custom sessions. The structured Learn CW course keeps its own mandatory transition chime.
- Video export is intentionally still the current MediaRecorder real-time path in this build; replacing it with an offline renderer is an encoder/muxer architecture change and is being kept separate from this stability cleanup.


## v2.5 audit

See `AUDIT_V24.md` for the full course/custom-session/Head-Copy/video audit. The primary video export path now renders offline to MP4 using WebCodecs + Mediabunny, with the old real-time WebM path retained as an automatic compatibility fallback.


## v2.5

- Familiarization ECG now follows Morse spacing literally:
  - dit = 1 unit
  - dah = 3 units
  - intra-character element gap = 1 unit
  - inter-character gap = 3 units
  - inter-word gap = 7 units
- Navigation label changed from **Crear sesión / Create Session** to **Crear / Create**.
- Added an About section with direct links to the CW Studio repository and ZP5DXS Facebook page.
