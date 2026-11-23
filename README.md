# CreaseCoach

CreaseCoach helps developing cricket batters turn recorded outcomes and observations into one editable practice objective. It is a local-first Progressive Web App for ED5012 Advanced Applications of Human Factors at IIT Madras.

[Open the live app](https://praveen-ghostprotocol.github.io/CreaseCoach/)

## Run locally

Use Node.js 22 or later. The app has no third-party runtime dependencies.

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

Run `npm run test:browser` after building when Playwright and Chromium are available. If they are installed outside the repository, set `CREASE_BROWSER_PACKAGE` to the Playwright package path and `CREASE_BROWSER_EXE` to the Chrome executable. The smoke test starts its own loopback server and writes screenshots to `.browser-test/` by default. Its local playback fixture is a synthetic moving rectangle.

## Publish the static build

The [GitHub Pages workflow](.github/workflows/pages.yml) runs tests, builds the app and publishes `dist/` on pushes to `main`. For another HTTPS static host, run `npm run build` and publish the contents of `dist/`. Serve `sw.js` as JavaScript and keep the manifest and icons alongside `index.html`. Relative asset URLs and hash navigation support project subpaths such as `/CreaseCoach/`.

## The five screens

| Screen | What you can do |
| --- | --- |
| Home | See recorded totals, recent activity and the current practice focus. Switch workspaces or start the tour. |
| Performance Log | View, add, edit, delete and filter innings. Log runs, balls and outcome first, with shot and session context optional. |
| Performance Insights | See counts and denominators, inspect the underlying records, and record an assessment. Explore two simulated bat swings in 3D or the SVG fallback. |
| Video Lab | Open a local MP4 or WebM supported by the browser, pause, seek, capture a frame, and mark timestamped observations for practice. A schematic is available without a clip. |
| Next Session Plan | Choose a focus, review current evidence, adapt up to two activities, and save completion and reflection. |

App state uses versioned browser storage, with separate personal and demo workspaces. Export personal records as JSON from the workspace menu. Import replaces the personal workspace after confirmation. Video bytes stay in the browser session. Clip metadata and notes survive reload, and you can reopen the original file. Demo records, the SVG storyboard, and the bat sensor sequences are illustrative. AI analysis is unconfigured and review is manual.

## Project materials

- [Project brief](docs/PROJECT_BRIEF.md) and [4W1H analysis](docs/HUMAN_FACTORS_4W1H.md)
- [Requirement traceability](docs/REQUIREMENTS_TRACEABILITY.md) and [evaluation protocol](docs/EVALUATION_PROTOCOL.md)
- [Implementation status](docs/IMPLEMENTATION_STATUS.md) and [limitations](docs/LIMITATIONS.md)
- [Classroom demo](docs/DEMO_SCRIPT.md), [report outline](docs/REPORT_OUTLINE.md) and [presentation outline](docs/PRESENTATION_OUTLINE.md)
- [Design system and Stitch references](docs/DESIGN.md)
