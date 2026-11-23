# CreaseCoach

CreaseCoach helps developing cricket batters turn recorded outcomes and observations into one editable practice objective. It is a local-first Progressive Web App for ED5012 Advanced Applications of Human Factors at IIT Madras.

[Open the live app](https://praveen-ghostprotocol.github.io/CreaseCoach/)

[Launch the one-click comparison demo](https://praveen-ghostprotocol.github.io/CreaseCoach/?demo=1#video-demo)

## Run locally

Use Node.js 22 or later. The core app builds without third-party npm dependencies. Optional AI pose review loads a pinned MediaPipe runtime and model in the browser when requested.

```sh
npm install
npm run dev
```

Open `http://localhost:5173`. Start with the fictional Arjun Mehta workspace or select **Demo workspace** and **Start with my own records**. The guided demo is available from the top bar.

## Test and build

```sh
npm test
npm run build
npm run preview
```

The preview runs at `http://localhost:4173`. After the first successful load, the production service worker can serve the five screens, their assets, and the Bat Motion Explorer offline. In Chromium DevTools, use **Application → Service Workers** to confirm control, then set **Network → Offline** and reload. Check the browser's install menu on the production URL. Browser storage belongs to an origin, so `localhost`, `127.0.0.1`, the development port, and the preview port each have separate records.

When a new release is ready, an open app displays a **Reload** button. Save any open form before using it. If a browser still displays a version from before the update notice was added, hard-refresh the live page once while online. A hard refresh preserves saved records.

Run `npm run test:browser` after building when Playwright and Chromium are available. If they are installed outside the repository, set `CREASE_BROWSER_PACKAGE` to the Playwright package path and `CREASE_BROWSER_EXE` to the Chrome executable. The smoke test starts its own loopback server and writes screenshots to `.browser-test/` by default. Its local playback fixture is a synthetic moving rectangle. To also exercise the pose model, set `CREASE_POSE_CLIP` to the path of a local batting clip and `CREASE_POSE_TIME` to a time in seconds with the batter visible.

## Publish the static build

The [GitHub Pages workflow](.github/workflows/pages.yml) runs tests, builds the app and publishes `dist/` on pushes to `main`. For another HTTPS static host, run `npm run build` and publish the contents of `dist/`. Serve `sw.js` as JavaScript and keep the manifest and icons alongside `index.html`. Relative asset URLs and hash navigation support project subpaths such as `/CreaseCoach/`.

## The five screens

| Screen | What you can do |
| --- | --- |
| Home | See recorded totals, recent activity and the current practice focus. Switch workspaces or start the tour. |
| Performance Log | View, add, edit, delete and filter innings. Log runs, balls and outcome first, with shot and session context optional. |
| Performance Insights | See counts and denominators, inspect the underlying records, and record an assessment. Explore two simulated bat swings in 3D or the SVG fallback. |
| Video Lab | Review a local MP4 or WebM, set and edit batting-phase markers, and compare two clips at the same marker. Capture frames, record timestamped observations, or use optional AI pose review. |
| Next Session Plan | Choose a focus, review current evidence, adapt up to two activities, and save completion and reflection. |

App state uses versioned browser storage, with separate personal and demo workspaces. Export personal records as JSON from the workspace menu. Import replaces the personal workspace after confirmation. Video bytes stay in the browser session. Clip metadata and notes survive reload, and you can reopen the original file. Demo records, the SVG storyboard, and the bat sensor sequences are illustrative.

### AI pose review

Open a real clip in Video Lab, pause near a batting moment, and select **Analyze around playhead**. The browser fetches MediaPipe Tasks Vision and Pose Landmarker Lite on demand. Frame decoding and inference run on the device, and pose stills stay in the current browser session. The highlighted body landmarks and elbow or knee angles are image-plane estimates. Select a timestamp and use **Add pose note** to review or edit the estimate before saving it. Saving a note for practice retains its AI provenance. The model works best with one prominent batter and visible limbs, and the core manual workflow remains available when model assets are unavailable.

### Compare batting clips on a laptop

Select **Load comparison demo** for two bundled practice excerpts with pre-set, editable phase markers. The app opens them at Downswing and sets half-speed playback. The production service worker caches the clips with the app. [Demo footage and credits](docs/DEMO_MEDIA.md)

1. Open a local clip in **Video Lab → Review clip**. Pause at the start of backlift, downswing or follow-through and save a marker from the playhead. Use the time chip to revisit it or the edit control to change the timestamp.
2. Repeat with a second clip. You only need one shared marker to start a comparison. If you mark several phases, enter them in batting order.
3. Open **Compare clips**, choose **Clip A**, **Clip B**, and **Align at marker**. The chosen phase is zero for both clips. Use **Play both**, the shared scrubber, slow playback, or **Go to marker**.

Markers are saved with the clip record on this browser. Keep both source files available to reopen after a reload. Alignment uses the timestamps you chose and playback covers the time available in both clips.

### Anthropometry

Record centimetre values for the player profile and for each batter in a clip, with a measured or self-reported source per value. **Measure on frame** captures a still and uses a known reference span to estimate a 2D projected body dimension. The result stays separate from the directly entered body dimensions. [Anthropometry workflow and evaluation](docs/ANTHROPOMETRY.md)

## Project materials

- [Project brief](docs/PROJECT_BRIEF.md) and [4W1H analysis](docs/HUMAN_FACTORS_4W1H.md)
- [Requirement traceability](docs/REQUIREMENTS_TRACEABILITY.md) and [evaluation protocol](docs/EVALUATION_PROTOCOL.md)
- [Implementation status](docs/IMPLEMENTATION_STATUS.md) and [limitations](docs/LIMITATIONS.md)
- [Classroom demo](docs/DEMO_SCRIPT.md), [report outline](docs/REPORT_OUTLINE.md) and [presentation outline](docs/PRESENTATION_OUTLINE.md)
- [Design system and Stitch references](docs/DESIGN.md)
