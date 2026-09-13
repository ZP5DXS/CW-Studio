# CW Studio v3.2 — Continuous Head Copy audio fix

## Root cause

Finite Head Copy sessions work because they schedule a manageable number of Web Audio
nodes. Continuous Head Copy used a logical ~20 minute loop and `Playback.play()` scheduled
the entire loop's CW audio graph at once.

A long CW stream can create thousands of oscillator/gain events before playback begins.
Some browsers continue advancing the AudioContext clock and visual timeline while the
oversized scheduled graph fails to produce reliable audible output. This matches the
observed symptom: visual Head Copy runs, but the continuous mode is silent.

## Fix

Continuous Head Copy still has a ~20 minute logical content loop, but audio is now scheduled
in 35-second windows. At the end of each window CW Studio immediately schedules the next
window. At the end of the logical loop it returns to zero.

Benefits:
- bounded Web Audio node count;
- intro/coaching voice clips are scheduled normally when their window arrives;
- CW starts immediately;
- infinite user experience remains unchanged;
- seek/stop logic remains bounded;
- no giant pre-scheduled audio graph.

Finite Head Copy, Course and Custom playback are unchanged.
