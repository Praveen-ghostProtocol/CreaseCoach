# CreaseCoach design system

The Stitch desktop overview and mobile practice-plan concepts informed the split forest hero, the pinned workspace navigation, the high-contrast practice action, and the five-item mobile bottom bar. The implemented charts and evidence text use the application’s saved records and source categories. [Stitch design project](https://stitch.withgoogle.com/projects/8820922550090782637)

- **Palette.** Warm ivory `#f6f7f2` is the work surface, white panels group related tasks, forest charcoal `#19231a` provides text contrast, and leaf lime `#d6f779` signals primary actions. Muted green-gray lines define groups and table rows.
- **Type.** Geist and local sans-serif fallbacks form a compact, track-tight display stack. Score values use tabular numerals and playback uses a monospaced timecode. The app runs with system fonts when Geist is unavailable.
- **Controls.** Primary buttons use lime fill, secondary buttons use an outline, and labels sit above inputs. Navigation, focus rings and provenance tags pair visible styling with text. Dialogs use the browser’s modal keyboard behaviour.
- **Reflow.** The desktop sidebar gives way to a fixed five-item bottom bar and a compact workspace switch on mobile. The innings table reflows to cards and evidence and practice panels stack.
- **Motion.** Swing and storyboard animation begin on demand, with pause and scrubbing. The 3D canvas is lazy-loaded when selected and falls back to an SVG rendering. The rest of the interface uses restrained transitions and honours reduced-motion preferences.
