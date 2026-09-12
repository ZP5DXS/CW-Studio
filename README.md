# Morse Practice · CW Studio v0.8

Voice/live-playback and pacing build.

Changes:
- Voice buffers are fully preloaded before playback.
- AudioContext is resumed again after voice loading to avoid browser auto-suspend.
- Missing course-specific lesson intro/outro clips fall back to existing Core narration,
  so spoken audio still works while a Course path is unresolved.
- Status line reports fallback use and resolved roots.
- Courtesy tone returned to a soft two-note acknowledgement.
- Character cadence now includes a clear silence BEFORE and AFTER the courtesy tone:
  CW -> pause -> voice/reveal -> short pause -> CW confirmation -> 0.55 s -> check -> 0.78 s -> next.
- Existing `assets/voices/` folders remain untouched.

Replace only index.html, css/, js/, README.md.
