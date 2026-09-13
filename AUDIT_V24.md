# CW Studio v2.4 — Logic & Content Audit

## Status
Stable-candidate architecture. This audit focuses on whether UI labels, narration, timelines and exported media actually do what they promise.

## Learn CW (20 lessons)
- Lessons 2–9: narrated review is followed by an actual review before new characters.
- Lessons 3–13: grouped-practice narration is now included in required preflight IDs where those lessons use it.
- Lesson 10: consolidation → individual recognition → groups → continuous listening.
- Lessons 11–13: number progression includes familiarization, mixed alphanumeric recognition and groups.
- Lesson 14: real callsign list, not random fake five-character strings.
- Lessons 15–18: operational concepts are explained and then practiced.
- Lesson 19: QSO fragments are assembled into complete exchanges.
- Lesson 20: guided QSO → final Head Copy challenge → transcript → course close.
- Every lesson has its recorded lesson-specific intro and outro.

## Create Session
Previous issues found:
1. There was no spoken welcome/intro or spoken closing.
2. Selecting Recognition + Marathon silently ignored Marathon.
3. Variable-speed recognition did not perform the originally defined "three speeds → spoken answer → final base-speed CW" pattern.
4. Single-character recognition showed the answer visually but did not speak it.
5. "Random order" affected content types beyond letters/numbers and could scramble custom text.
6. Familiarization could consume the whole requested duration before later selected modes began.
7. Content pools for callsigns, prefixes, words, RST, punctuation and QSO were too small.

v2.4:
- General spoken opening: `welcome_relaxed` + `session_begins`.
- A narrated content transition is selected from the existing core voice pack.
- Familiarization, Recognition and Marathon are independent phases; all selected phases actually run.
- Total requested duration is budgeted across selected phases.
- Single-character Recognition uses audible answers and final reference CW.
- Variable speed follows: slow/base/fast CW → response → spoken answer → CW at configured base speed.
- Courtesy chime remains optional and off by default in custom sessions.
- Natural-order option applies to letter/number content; custom text keeps the user's written order.
- Expanded content pools include 100 callsigns, 80+ DX prefixes, 100 radio words, 100 abbreviations, broader punctuation, prosigns, RST and QSO fragments.
- General spoken closing uses `session_complete_general`.

## Head Copy
Previous issues found:
1. Several "100" challenges did not actually contain 100 unique items:
   - common words: 99
   - callsigns: 96
   - abbreviations: 87 unique
   - numbers: 83 unique
2. Several recorded Head Copy coaching clips were unused.
3. "Endless Head Copy" actually stopped after a small finite set.
4. Spanish "100 common words" still used the English common-word list.

v2.4:
- All five "100" challenges contain exactly 100 items.
- Common-word challenge is language-specific (ES/EN).
- Coaching uses no-spelling, less-time, halfway, remember-meaning, final-ten and challenge-complete clips.
- Endless Head Copy builds a multi-hour practical continuous timeline and is meant to be manually stopped.
- Video export is disabled for the continuous Head Copy timeline to avoid accidental multi-hour renders.
- Each normal Head Copy challenge already has its own recorded intro and outro; no redundant generic welcome is added.

## Video export
Previous implementation:
- `MediaRecorder + canvas.captureStream()`
- guaranteed wall-clock export: a 15-minute lesson took about 15 minutes.

v2.4:
- Primary path uses WebCodecs through Mediabunny 1.56.1.
- Audio is rendered offline first.
- Canvas frames are generated directly at 1280×720 / 24 fps.
- H.264/AAC are muxed to MP4 in memory.
- The exported narration waveform uses the offline rendered audio as its visual source.
- Progress is split across audio render, frame render and final mux.
- If WebCodecs/CDN/codec support is unavailable, CW Studio automatically falls back to the existing real-time WebM exporter.

## Performance
- Timeline lookup changed from filtering the entire event list on every frame to binary-search + bounded overlap scanning.
- This matters for long Head Copy sessions and offline video rendering.

## Remaining QA before calling it v1.0 stable
1. Play all 20 lessons once in ES and once in EN.
2. Spot-check both voices per language.
3. Export one short lesson to WAV, MP3 and fast MP4 in Edge/Chrome.
4. Test Create Session combinations:
   - Familiarization only
   - Recognition only
   - Familiarization + Recognition
   - Recognition + Marathon
   - all three
5. Test each content type once.
6. Test Head Copy normal challenge and continuous mode.
7. Test seek/pause/resume after jumping into narration and CW.
8. Verify GitHub Pages cache uses `?v=24`.
