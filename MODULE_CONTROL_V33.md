# CW Studio v3.3

- Course, Create and Head Copy now have exclusive playback ownership.
- Switching modules stops and closes the previous AudioContext immediately.
- Stale async builders are discarded if the user changes module while loading.
- Entering Create clears the previous timeline so a course cannot keep playing behind it.
- Noto mnemonic preload now uses 8 bounded concurrent workers.
- Voice preflight now uses 5 bounded concurrent workers.
- Voice MP3 content is intentionally unchanged in this code build.
