# Morse Practice · CW Studio

**Learn CW. Build practice sessions. Train Head Copy. Export the result.**

[![Live Demo](https://img.shields.io/badge/LIVE-CW%20Studio-00c2b8?style=for-the-badge)](https://zp5dxs.github.io/CW-Studio/)
[![Morse Practice](https://img.shields.io/badge/MORSE%20PRACTICE-Open%20App-6c63ff?style=for-the-badge)](https://zp5dxs.github.io/morse-practice/)
[![GitHub](https://img.shields.io/badge/GITHUB-Repository-181717?style=for-the-badge&logo=github)](https://github.com/ZP5DXS/CW-Studio)

**English** · [Español](README_ES.md)

> Free, browser-based CW learning and practice studio. No account is required for the core experience, and progress is stored locally in the browser.

## Try it live

**CW Studio:** https://zp5dxs.github.io/CW-Studio/  
**Morse Practice ecosystem:** https://zp5dxs.github.io/morse-practice/  
**Source code:** https://github.com/ZP5DXS/CW-Studio

CW Studio is designed to work as a static GitHub Pages application. Open the live site, choose a language and voice, and start with **Learn CW**, **Create**, or **Head Copy**.

## What is CW Studio?

CW Studio is the guided-learning side of the Morse Practice ecosystem. It combines a fixed 20-lesson CW course with a flexible practice-session builder, post-course Head Copy challenges, reusable human narration, smooth sine-wave CW synthesis, 2D generative visuals, local progress tracking, and browser-side media export.

The central visual idea is the **Living Line**: one continuous luminous line changes role with the lesson. During narration it becomes a voice waveform; during Familiarization it becomes a correctly timed CW trace; during mnemonic moments it morphs into a visual association; and during Recognition, Marathon, QSO, and Head Copy it returns to a flowing listening-oriented line.

## Main features

- **20 guided Learn CW lessons** — lessons are freely selectable; the course is structured but not artificially locked.
- **Bilingual interface and course** — Spanish and English.
- **Four named voices** — AURA / NEXO in Spanish and NOVA / VECTOR in English.
- **Familiarization** — hear the character, associate it visually, hear the spoken answer, then hear the reference CW again.
- **Recognition** — progressively removes mnemonic assistance and asks the learner to identify what was heard.
- **Marathon listening** — longer continuous CW practice without constant interruption.
- **Custom practice builder** — choose modes, content, WPM, effective speed, answer delay, randomization, tone variation, courtesy tone, and duration.
- **Operational material** — letters, numbers, mixed alphanumeric material, punctuation, prosigns, abbreviations, DX prefixes, full callsigns, RST reports, radio words, QSO fragments, and custom text.
- **Head Copy** — 100 common words, 100 callsigns, 100 radio words, 100 numbers, 100 CW abbreviations, QSO Head Copy, and long-form continuous Head Copy.
- **Local progress** — lesson completion is stored in the browser; no account is required.
- **Seekable timeline** — playback behaves like a video timeline: play, pause, stop, seek, and fullscreen.
- **WAV / MP3 export** — rendered in the browser.
- **Fast video export** — primary path renders offline to MP4 with WebCodecs + Mediabunny; a real-time WebM compatibility path remains available when required.
- **No ads and no mandatory backend** for the core learning experience.

## Quick start

1. Open the **Live Demo**.
2. Select **ES / EN** and one of the available voices.
3. Choose one of the three main areas:
   - **Learn CW** for the complete guided course.
   - **Create** for a custom practice session.
   - **Head Copy** for post-course listening challenges.
4. Press **Play**. Use the timeline to move through the session, or use fullscreen for a cleaner training view.
5. When useful, export the current lesson/session as **WAV**, **MP3**, or **VIDEO**.

## Learn CW: how the course works

The course uses an original **Morse Practice Character Sequence** designed around acoustic contrast, language usability, and practical radio operation rather than copying another school's lesson order.

A typical new-character cycle is:

**CW → mnemonic association → spoken character → reference CW → transition → next character**

The visual CW trace follows actual Morse timing:

| Element | Duration |
|---|---:|
| Dit | 1 unit |
| Dah | 3 units |
| Gap between elements of one character | 1 unit |
| Gap between characters | 3 units |
| Gap between words | 7 units |

The course then moves from isolated recognition to groups, numbers, callsigns, operating abbreviations, RST, QSO fragments, complete exchanges, and finally Head Copy-oriented work.

For the detailed lesson logic, see [`COURSE_LOGIC.md`](COURSE_LOGIC.md). For the visual association system, see [`MNEMONICS.md`](MNEMONICS.md).

## Create: custom practice tutorial

**Create** is for building a session without changing the fixed Learn CW curriculum.

### 1. Choose the training mode

**Familiarization** keeps the learning scaffold. It is useful when material is still new. The optional courtesy tone between characters is available under Advanced settings and is off by default.

**Recognition** focuses on identifying what you hear. For single characters, the session can provide the spoken answer and a final reference transmission. Variable-speed recognition can expose the same character at multiple speeds before the answer.

**Marathon** is continuous listening practice with fewer interruptions. Multiple modes may be selected; CW Studio allocates the requested session time across the selected phases.

### 2. Choose the material

Use letters/numbers for basic copy, **DX Prefixes** to learn recognizable callsign beginnings, **Full Callsigns** for realistic complete callsign copy, or operational categories such as RST, prosigns, abbreviations, words, and QSO fragments.

**Custom text preserves the order you typed.** Random-order control is intended mainly for generated letter/number practice.

### 3. Set the sound

- **WPM** controls character speed.
- **Effective speed** controls spacing when applicable.
- **Answer delay** controls how long you have before the answer/reveal.
- **Variable recognition speed** adds speed variation.
- **Random order** is enabled by default for generated letters/numbers.
- **Courtesy tone** is optional in custom Familiarization.
- **Tone variation** introduces small pitch changes for less mechanical listening.

### 4. Choose a duration

Choose a short drill or a long listening session. The generated timeline includes a general spoken opening and closing so custom sessions do not begin or end abruptly.

## Head Copy

Head Copy is intentionally more listening-oriented and visually quieter than Familiarization. It does not use the CW ECG trace for long words/callsigns because dense pulse graphics become distracting.

The normal challenges include their own recorded introductions and closings. Coaching prompts are inserted during the 100-item challenges to encourage hearing complete units rather than mentally spelling every character.

**Continuous Head Copy** is designed as a long-running session that the operator stops manually. Video export is intentionally disabled for that mode to avoid accidental multi-hour renders.

## Exporting audio and video

### WAV / MP3

Audio is synthesized/rendered in the browser from the same lesson timeline used by playback. This keeps CW timing, narration, transition tones, and session structure aligned.

### VIDEO

CW Studio first attempts a **fast offline render**:

1. render the complete audio offline;
2. render the 2D canvas frames directly;
3. encode H.264 video + AAC audio;
4. mux the result into MP4.

If the browser cannot use the fast WebCodecs path, CW Studio falls back to the compatibility exporter that records the canvas/audio in real time to WebM.

For best results, use a current Chromium-based browser such as Chrome or Edge.

## The Living Line

CW Studio deliberately avoids stacking multiple visualizers. There is one continuous line:

- **Cover / idle:** flat baseline.
- **Narration:** voice-energy waveform.
- **Familiarization CW:** timed CW trace.
- **Mnemonic:** visual association silhouette.
- **Recognition / Marathon / QSO / Head Copy:** flowing listening line.

The goal is not to teach Morse as written dots and dashes. The trace is a timing visualization used during Familiarization; listening remains the primary skill.

## Voice packs

CW Studio uses two static voice-pack families generated for the Morse Practice project:

```text
assets/
└── voices/
    ├── core/
    │   ├── course_voice_index.json
    │   └── es|en/...
    └── course/
        ├── voice_index.json
        └── es|en/...
```

The application reads the generated JSON indexes and preserves the existing audio-pack layout. Do not rename or reorganize the MP3 files unless the indexes and loader are updated together.

## Running locally

Because the project uses ES modules and fetches JSON/audio assets, do **not** open `index.html` only as a `file://` URL. Serve the repository through a small local HTTP server.

With Python installed:

```bash
cd CW-Studio
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

On Windows, `py -m http.server 8000` also works if `python` is not the registered command.

## Deploying to GitHub Pages

1. Push the complete repository, including `assets/voices`, to GitHub.
2. Open **Settings → Pages** in the repository.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the production branch (normally `main`) and `/ (root)`.
5. Save and wait for GitHub Pages to publish.
6. Open the live site and hard-refresh after major asset/version changes if the browser still has an older cached build.

The production URL for this repository is:

**https://zp5dxs.github.io/CW-Studio/**

## Project structure

```text
CW-Studio/
├── index.html
├── css/
│   └── app.css
├── js/
│   ├── app.js
│   ├── audio-catalog.js
│   ├── course-engine.js
│   ├── export-engine.js
│   ├── headcopy-engine.js
│   ├── morse-engine.js
│   ├── playback.js
│   ├── session-builder.js
│   ├── timeline.js
│   ├── video-export.js
│   ├── visual-engine.js
│   └── voice-engine.js
├── data/
│   └── mnemonics.json
├── assets/
│   └── voices/...
├── COURSE_LOGIC.md
├── MNEMONICS.md
├── README.md
└── README_ES.md
```

## Privacy

Core CW Studio operation does not require an account or server-side user profile. Lesson completion is stored locally in the browser. Exported media is generated on the user's device.

## Contributing

Issues, bug reports, content corrections, accessibility improvements, browser-compatibility fixes, and CW-training ideas are welcome through the repository.

When changing course logic, keep narration and the actual exercise synchronized: if a voice clip announces a review, group exercise, new-character block, or challenge, the timeline must perform that action immediately afterward.

## Related project

**Morse Practice:** https://zp5dxs.github.io/morse-practice/

Morse Practice provides the broader practice ecosystem; CW Studio focuses on guided learning, custom sessions, Head Copy, and reusable media generation.

## Author

**ZP5DXS (Matt)**  
Amateur radio / CW project.

Facebook: https://www.facebook.com/ZP5DXS  
GitHub: https://github.com/ZP5DXS

## License

Free and open source. If you distribute or modify the project, keep the repository's license file and attribution with the source.

**73 de ZP5DXS**


<!-- UI cleanup v2.7: runtime debug/status text hidden from the public interface; About rebuilt as the project footer. -->


<!-- v2.8: Continuous Head Copy now uses a bounded auto-loop instead of a giant prebuilt timeline; exports are disabled for the infinite mode. Offline audio export now reports render progress and guards unsafe durations. -->
