# crop-icon

**A new shape for your image.**

Turn a public image URL into an embeddable icon, or bring a local image and make an avatar, sticker or game token without uploading it.

[Open the studio](https://crop-icon.vercel.app) · [Source](https://github.com/ivgtr/crop-icon)

```md
[![icon](https://crop-icon.vercel.app/api?url=https://github.com/ivgtr.png)](https://github.com/ivgtr)
```

## Make a cut, then take it anywhere

Open the studio, load a public image URL or choose/drop a local file, then select a shape. Adjust the output size, image fit, zoom, horizontal/vertical position, inside border and background while comparing the original with the result.

The **Avatar**, **README sticker** and **Game token** presets are starting points, not separate rendering modes. On phones, the preview stays visible while scrolling through the controls.

**Download SVG / PNG** creates a self-contained snapshot. **Copy URL / Markdown / HTML** creates a live image embed backed by the existing API. **Edit link** recreates a public-source edit, including its controls.

Local files and the built-in demo are never uploaded and cannot produce a public embed URL. They can be downloaded. A remote image is fetched once when loaded; subsequent edits run in the browser. Nothing is stored in localStorage or a database.

## Existing URLs still work

The endpoint, original query names, SVG response and documented shape names are retained:

```text
/api?url=https://github.com/ivgtr.png
/api?p=hart&url=https://github.com/ivgtr.png
/api?p=star&width=256&height=256&url=https://github.com/ivgtr.png
```

`hart` is deliberately **not renamed**. `heart` is an additional alias. The original circle, star and heart geometry is retained, including its behavior on non-square canvases. The renderer has changed from masks to clipping paths, so antialiased boundary pixels are not guaranteed to be byte-identical.

Without new options, the API uses the source's natural dimensions, a centered contain fit, no border and a transparent background. Width and height independently override their corresponding source dimension. The studio starts at 512 × 512 with cover fit and explicitly includes those settings in generated URLs; it does not change the API defaults.

Correct MIME detection replaces the former hard-coded JPEG declaration. JPEG EXIF rotation is recognized when measuring the displayed image, which corrects dimensions for rotated camera photos.

`GET /api` without `url` still returns HTML. Failed image requests retain an empty `404` response; malformed or unsafe inputs are now rejected rather than passed through unchecked. Successful SVGs retain a 24-hour public cache. `HEAD` and conditional `If-None-Match` requests are supported.

## Shapes

`circle` · `hart` / `heart` · `star` · `square` · `rounded` · `squircle` · `hexagon` · `diamond` · `shield` · `ticket` · `flower`

Use a square canvas for conventional avatar shapes. Try a wider ticket for a banner or a hexagon/shield for a game token.

## Optional controls

All new controls are additive. Old URLs do not need migration.

| Parameter | Accepted value | API default |
| --- | --- | --- |
| `url` | Public HTTP(S) raster image URL | No image: show studio |
| `p` | A shape listed above | `circle` |
| `width`, `height` | Whole pixels, 1–4096 | Corresponding source dimension |
| `fit` | `contain` or `cover` | `contain` |
| `x`, `y` | 0–100, alignment within unused/overflow space | `50` |
| `zoom` | 1–4 | `1` |
| `border` | Inside stroke width, 0–64 output pixels | `0` |
| `color` | Border color, 3/6/8-digit hexadecimal | `ffffff` |
| `bg` | Background color, 3/6/8-digit hex or `transparent` | `transparent` |

```text
/api?url=https%3A%2F%2Fgithub.com%2Fivgtr.png&p=hexagon&width=256&height=256&fit=cover&border=8&color=e95432
```

Use `URLSearchParams` when composing URLs, especially when a source URL has its own query string. Omit `#` from hexadecimal colors or encode it as `%23`.

Position controls move the image only when there is unused space or overflow. For example, an exact-fit square source will not move at zoom 1; increase zoom first. The background fills the shape behind the image, not the transparent area outside it. Borders are clipped inside the shape and do not change output dimensions.

## Formats, limits and privacy

Input is **PNG, JPEG, GIF or WebP**, up to **3 MiB**, **40 megapixels**, and 16,384 pixels per source side. Output dimensions are limited to 4,096 per side. For large sources, specify smaller output dimensions. SVG and HTML inputs are intentionally rejected rather than sanitized.

SVG output embeds the original raster bytes; cropping does **not** remove hidden source pixels or metadata. Do not use it to redact sensitive content. PNG output rasterizes the visible result into new pixels and captures a single frame of animated input. Preserve your original file separately.

Live embeds use a public cache and are not an appropriate place for private or signed/token-bearing URLs. A changed source may take at least the API's 24-hour cache lifetime to refresh; embedding services can cache it independently. Downloads are snapshots, not live links. This service does not host uploaded files or erase metadata from embedded SVG sources.

Source requests permit HTTP(S) on default ports only, without URL credentials. The loader rejects non-public IP destinations, checks every DNS answer, pins the connection to a validated address, revalidates redirects, allows at most three redirects, and applies an eight-second total deadline and a streamed byte limit. Compressed upstream bodies are not accepted. These intentional restrictions mean unsafe URLs, unsupported formats, oversized images and malformed parameters that previously reached the loader may now return `404`.

The loader has no persistent source cache, so the editor's load step and an embed requested later can see different upstream versions. The renderer itself is shared, but source changes, browser color management and platform image decoding can still affect appearance. Metadata orientation in non-JPEG formats has not been comprehensively verified.

## Development

Use Node.js 22:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. No global Vercel CLI is required for local development. Restart the dev command after server changes; frontend assets are read directly from `public/`.

```sh
npm run typecheck
npm test
npm run check
```

`npm run check` runs strict TypeScript/JSDoc checks on the API/shared core, the browser script syntax check, and native Node tests. Tests cover the original API contract and geometry, all shapes, image format/EXIF handling, query validation, response headers, stream limits, DNS pinning, private-address rejection, redirects, timeouts and HTTP GET/HEAD/304 behavior. HTTP handler tests use a real local server with an injected image source; loader tests mock network IO while retaining the real validation policy.

CI runs these checks on Node 22 for PRs and pushes to `main`.

### Structure

- `public/core.js`: platform-independent parser, shape definitions, URL serializer and SVG renderer; JSDoc checked by TypeScript. This is the exact same module imported by the browser and API.
- `api/_lib/source.ts`: bounded remote image loading and image metadata inspection.
- `api/index.ts`: backwards-compatible HTTP entry point, HTML shell and cache/error headers.
- `public/index.html`: editor markup and its embedded `<style id="studio-style">`; no external CSS request.
- `public/app.js`: dependency-free editing interactions and browser exports.
- `scripts/dev.mjs`: a small local server; not a production application entry point.

### Vercel

The project uses the Node 22 `/api` function and static files in `public/`. `vercel.json` specifies the build command, static output directory, function duration and HTML file inclusion. No secrets or environment variables are required. `/` and `/index.html` rewrite to the same `/api` editor response. Image requests to `/api?url=...` are unchanged.

The editor has its complete responsive stylesheet in `public/index.html`. The API normalizes HTML line endings and computes a SHA-256 hash from that exact style block for the `Content-Security-Policy` header. Updating the stylesheet does not require a manually maintained hash or `unsafe-inline`. Arbitrary inline styles and inline scripts remain disallowed. The SVG response keeps its separate restrictive policy. Keep the `studio-style` ID when editing the template; HTTP tests verify the hash and the absence of missing local stylesheet references.

Before merging a deployment, verify a clean `npm ci`, the preview build, the existing README embed, remote GitHub-avatar redirects, and SVG/PNG downloads in the target browsers. External fetching and the Vercel deployment were not exercised in the offline implementation environment.

## License

MIT © [ivgtr](https://github.com/ivgtr). See [LICENSE](LICENSE).
