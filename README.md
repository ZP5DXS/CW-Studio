# CW Studio v1.5

Stability + layout rebuild.

- Rebuilt from the last stable v1.3 app logic.
- Fixed broken event handlers introduced in v1.4.
- Removed duplicate/stray Next buttons.
- Player is full-width and remains the dominant element.
- Export controls live in a separate row below playback.
- Lesson and Head Copy lists are horizontal carousels with arrows only; scrollbars are hidden.
- Create Session hides the player during configuration, then hides the wizard when a session is built.
- Voice selector is visual/iconic. Public aliases are provisional:
  ES: AURA / NEXO
  EN: NOVA / VECTOR
  Underlying Edge-TTS voice IDs are unchanged.
- ES/EN UI strings are normalized.
- The visualizer remains pure 2D and uses one luminous line that morphs between narration, CW, phase symbols and mnemonic silhouettes.
- Audio paths/voice-pack structure are unchanged from the working v1.2/v1.3 resolver.
