# Morse Practice · CW Studio v0.7

Voice playback stability build.

What changed:
- Voice clips are preloaded and decoded before live playback starts.
- The live timeline base is created only after voice loading completes.
- AudioContext is explicitly resumed from the Play button path.
- The generated Core/Course JSON indexes are loaded lazily and preferred when found.
- The status line shows how many spoken clips loaded or are missing.
- Export behavior is unchanged.
- Existing audio folders do not need to be moved.

Replace only `index.html`, `css/`, and `js/`. Keep `assets/voices/` exactly as it is.
