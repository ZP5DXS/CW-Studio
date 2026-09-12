# Morse Practice · CW Studio v1.0

This build is aligned directly with the two Python audio generators.

## Exact generated audio inventory

- Core Voice Pack: 168 logical clips × 4 voices = 672 MP3 files.
- Course Voice Pack: 79 logical clips × 4 voices = 316 MP3 files.
- Total: 988 MP3 files.

The application no longer guesses voice paths. It uses exactly:

`assets/voices/core/<lang>/<gender>/<category>/<id>.mp3`

`assets/voices/course/<lang>/<gender>/<category>/<id>.mp3`

The categories and IDs are generated into `js/audio-catalog.js` directly from
`generate_voicepack.py` and `generate_course_voicepack.py`.

## Course narration usage

Lesson 1 uses the general course welcome + daily guidance + the specific Lesson 1 intro.
Later lessons use their own specific intros/outros and relevant Core transitions.
Operational lessons use the full nomenclature clips and the Course operational explanations.

No generic lesson narration is substituted for a missing specific clip.

## Timing

Character familiarization:
CW → pause → spoken/reveal → short pause → CW confirmation → 0.62 s → courtesy check → 0.82 s → next.

All lessons remain freely selectable. Completion is local progress only.
