# Morse Practice · CW Studio v0.9

Course playback / loading UX build.

Key changes:
- Course-specific lesson intros/outros are now exact-only. Generic Core narration is no longer substituted.
- The lesson waits for the real narration duration, then leaves a 1.15 s breathing gap before CW starts.
- Selecting any lesson is always allowed; completion is only a local progress marker, never a lock.
- A visible `loading lesson XX…` state appears while narration durations are prepared.
- WAV and MP3 exports show preparation / voice loading / rendering / download status.
- Character cadence:
  CW -> pause -> spoken/reveal -> short pause -> CW confirmation -> 0.62 s -> courtesy check -> 0.82 s -> next.
- Version is visible as v0.9.
- Existing `assets/voices/` files do not need to be moved.

Replace only `index.html`, `css/`, `js/`, and optionally `README.md`.
