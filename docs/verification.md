# Verification and deployment

## Local checks

Use Node.js 24 (at least 24.15.0) and npm 12.0.2:

```sh
npm install --global npm@12.0.2
npm ci --include=dev
npm audit
npm run check
npm exec -- playwright install --with-deps chromium
npm run test:e2e
```

`check` strictly compiles the browser, build tools, API and unit tests, then runs the unit suite. Tests cover renderer/API behavior, network restrictions, raster headers, EXIF orientation, malformed lengths and timeout-enforced parser rejection. Build checks use esbuild metadata and script compilation, not TypeScript's removed Compiler API.

Browser checks run in desktop and mobile-emulated Chromium with no retries. They exercise the actual CSP, eleven shapes, local PNG/JPEG/GIF/WebP decoding and downloads, invalid input, public-image retrieval, copying and edit-link restoration. Public-image cases contact GitHub and require network access. Emulation is not a Safari/Firefox or physical-device test.

To verify a deployed commit, set `E2E_BASE_URL` to its public origin before running `npm run test:e2e`, or supply `preview_url` to the Browser verification workflow. This disables the local server; authentication is not bypassed. Consult the workflow for the particular commit rather than treating an older successful run as validation of new code.

## Vercel

`api/index.ts` remains the only public entry. The editor is compiled from `_lib` TypeScript and embedded by `html()`; no static JS directory is deployed.

The repository pins the Node builder, sets `engines.node` to `24.x`, installs npm 12.0.2 followed by `npm ci --include=dev`, and runs `npm run build` through `vercel-build`. npm is used without a Corepack dependency.

In Project Settings, use Node.js 24.x. Remove stale Yarn install/build overrides and any `static` / `build/static` Output Directory override; this project deploys a function, not a static output directory. Let `vercel.json` control installation and routing. Redeploy without the old build cache when switching the package manager. Dashboard settings are not changed by this repository.
