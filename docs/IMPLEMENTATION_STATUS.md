# Implementation and verification status

## Implemented and verified

| Area | Evidence from the production build |
| --- | --- |
| Home and navigation | Chrome opened all five screens, advanced the guided demo, used the keyboard skip link, switched to an empty personal workspace, and reset the deterministic example. Personal records were exported and imported in the isolated test profile. |
| Innings and insights | Chrome added, edited and deleted innings, observed the dismissal denominator change, inspected supporting records and recorded a guided interpretation assessment. Unit tests cover empty logs, not-out treatment, repeat counts and evidence updates. |
| Video Lab | Chrome played a local WebM fixture, changed speed, captured a PNG frame, and prompted for reselection after a reload. The schematic accepted timestamped notes which were edited and included in a plan. |
| Bat Motion Explorer | Chrome rendered WebGL, changed the camera, orbited by dragging, switched sessions, toggled comparison and played the swing. A separate mobile browser test disabled WebGL and verified SVG playback and session switching. |
| Practice plan | Chrome verified evidence transfer, focus-dependent activities, editable objectives, completion, reflections and history after reload. |
| PWA | The production service worker controlled the page. Chrome validated the manifest, reported zero installability errors in an isolated persistent profile, and reopened the app and motion explorer after disconnecting. |
| Responsive presentation | Browser tests checked all five screens for overflow at 375 px and captured desktop and mobile previews. |

Reproduce checks with `npm test`, `npm run build` and, with Playwright and Chrome available, `npm run test:browser`. The six domain tests verify behaviour independent of the UI. The browser script uses synthetic media, demo records and an isolated profile.

## Implemented with narrower verification

- MP4 ingestion uses the browser decoder. The automated media fixture is WebM. Codec coverage on physical phones remains to be checked.
- Installation eligibility was checked by Chromium. Installing on a physical device and exercising standalone mode remain device checks.

## Simulated, proposed and excluded

Arjun’s records, the cricket storyboard and both bat-motion sessions are fictional or synthetic. A future bat-mounted IMU and its calibration and validation pipeline are design concepts. AI inference, physical sensor integration, cloud accounts, and cross-device synchronisation are outside this prototype. The [evaluation protocol](EVALUATION_PROTOCOL.md) describes a proposed participant study. Browser and unit tests establish behaviour of this build.
