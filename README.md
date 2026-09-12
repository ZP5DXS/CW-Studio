# Morse Practice · CW Studio v1.1

This build resolves the actual generated voice packs through their own JSON indexes.

It searches for:
- `voice_index.json` from `generate_voicepack.py`
- `course_voice_index.json` from `generate_course_voicepack.py`

The pack folders do not need to be renamed. Supported roots include the original Python output names:
- `assets/voices/morse_practice_voicepack/`
- `assets/voices/morse_practice_course_voicepack/`

as well as `assets/voices/core/` and `assets/voices/course/`.

Once an index is found, every MP3 path comes from the JSON itself. No category or filename is guessed.

The Play / Export controls remain disabled if a lesson fails to load, preventing the null-timeline startup error.
