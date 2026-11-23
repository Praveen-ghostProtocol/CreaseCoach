# Implementation and verification status

## Implemented and verified

| Area | Evidence from the production build |
| --- | --- |
| Home and navigation | Chrome opened all five screens, advanced the guided demo, used the keyboard skip link, switched to an empty personal workspace, and reset the deterministic example. Personal records were exported and imported in the isolated test profile. |
| Innings and insights | Chrome added, edited and deleted innings, observed the dismissal denominator change, inspected supporting records and recorded a guided interpretation assessment. Unit tests cover empty logs, not-out treatment, repeat counts and evidence updates. |
| Video Lab | The demo opens on real footage. Chrome reopened an uploaded WebM with its phase markers after reload and jumped from a comparison frame into single-clip review. The schematic remains available from the clip selector. |
| Batting comparison | Desktop Chrome verified phase marker creation, editing, removal and persistence. Two real local MP4s were aligned at different source timestamps and played together at half speed. The shared marker and scrubber kept each clip within the overlapping time window. |
| One-click comparison | Chrome disconnected the network, opened the demo from Home, decoded both cached MP4s and used pre-set Downswing and Follow-through alignment. |
| Anthropometry | Chrome saved a self-reported profile dimension, a directly measured test entry for a clip and a separate frame projection. The test verified persistence and source labels. Repeatability and accuracy with a physical reference still require a participant study. |
| AI pose review | Chrome analyzed a real local MP4 at 390 px, accepted a confirmed overlay and saved a model-labeled note. Blocking the model download left manual observations available. Request tracing confirmed no media upload. |
| Bat Motion Explorer | Chrome rendered WebGL, changed the camera, orbited by dragging, switched sessions, toggled comparison and played the swing. A separate mobile browser test disabled WebGL and verified SVG playback and session switching. |
| Practice plan | Chrome followed an observation back to the exact source time, edited the original observation, and reopened the plan with its saved evidence intact. It also verified editable objectives, completion, reflections and history after reload. |
| PWA | The production service worker controlled the page. Chrome validated the manifest, reported zero installability errors in an isolated persistent profile, and reopened the app and motion explorer after disconnecting. |
| Cache updates | Chrome installed the new release with a legacy tab still open, then opened the demo and kept a saved innings record. A later release showed the reload notice without interrupting an open form. The demo reopened offline after the update. |
| Responsive presentation | Browser tests checked all five screens for overflow at 375 px and captured desktop and mobile previews. |

Reproduce checks with `npm test`, `npm run build` and, with Playwright and Chrome available, `npm run test:browser`. The domain tests verify behaviour independent of the UI. The browser script uses synthetic media, demo records and an isolated profile, with an optional local batting clip for a real pose test.

## Implemented with narrower verification

- MP4 ingestion uses the browser decoder. The automated media fixture is WebM. Codec coverage on physical phones remains to be checked.
- Installation eligibility was checked by Chromium. Installing on a physical device and exercising standalone mode remain device checks.

## Simulated, proposed and excluded

Arjun’s records, the cricket storyboard and both bat-motion sessions are fictional or synthetic. A future bat-mounted IMU and its calibration and validation pipeline are design concepts. Calibrated 3D reconstruction, physical sensor integration, cloud accounts and cross-device synchronisation are outside this prototype. The [evaluation protocol](EVALUATION_PROTOCOL.md) describes a proposed participant study. Browser and unit tests establish behaviour of this build.
