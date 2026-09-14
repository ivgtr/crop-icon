# Browser verification

The application, test implementation and Playwright configuration are TypeScript. Browser tests have a separate strict `tsconfig.e2e.json`; they are type-checked before Playwright runs them.

```sh
corepack enable
corepack prepare yarn@1.22.22 --activate
yarn install --frozen-lockfile --non-interactive --production=false
yarn run check
yarn run playwright install --with-deps chromium
yarn run test:e2e
```

The local run starts the already-built development adapter, which delegates to the same `api/index.ts` handler. It does not introduce another deployed entry point or serve source files. Public-image tests deliberately contact GitHub rather than mocking image retrieval, so these tests require network access.

To check a deployment, set `E2E_BASE_URL` to its public origin and run `yarn run test:e2e`. This disables the local server. The Browser verification workflow also accepts an optional `preview_url` when run manually. A PR workflow never silently tests a hard-coded preview belonging to a different branch. Deployment authentication is not bypassed.

## Coverage

The same five scenarios run in desktop (1440 x 1000) and mobile-emulated (390 x 844) Chromium contexts:

- The compiled inline script runs with the real CSP, all eleven shapes respond, reset works and the page has no horizontal overflow.
- PNG/JPEG/GIF/WebP files decode locally without network uploads. SVG and PNG downloads are read back; dimensions, embedded raster data, opaque center and transparent corner pixels are checked.
- Invalid dimensions and unsupported SVG input disable export; a valid file restores it.
- A real public GitHub avatar loads, the API returns a cached SVG, URL/Markdown/HTML copying works, and an edit link restores the source and settings before downloading again.
- Existing editor aliases respond while old public JavaScript paths and internal source/build paths return 404.

Screenshots and failure traces are retained as CI artifacts. Mobile emulation is not a real-device or Safari/Firefox test.

## Initial recorded run

[Run 34853807636](https://github.com/ivgtr/crop-icon/actions/runs/34853807636/job/104008086813), 2026-09-14, used Node 22.23.2, Yarn 1.22.22 and Playwright 1.58.2. Its log records 136/136 unit tests, 10/10 browser tests against the local handler and 10/10 against the PR's Vercel Preview, with no retries. The preview screenshots were also inspected.

This initial run generated the additional browser dependency lock entries. The generated lockfile was subsequently committed unchanged, and the permanent workflows use `--frozen-lockfile` plus a lockfile-diff check. Consult the latest workflow runs for the final commit's result; this historical record does not imply that every later commit has been tested against a deployment.

For the upstream dependency warnings and their application-level mitigation, see [SECURITY.md](../SECURITY.md).
