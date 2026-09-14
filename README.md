# crop-icon

**A new shape for your image.**

Turn a public image URL into an embeddable icon, or bring a local image and make an avatar, sticker or game token without uploading it.

[Open the studio](https://crop-icon.vercel.app) · [Source](https://github.com/ivgtr/crop-icon)

```md
[![icon](https://crop-icon.vercel.app/api?url=https://github.com/ivgtr.png)](https://github.com/ivgtr)
```

## Make a cut, then take it anywhere

Open the studio, load a public image URL or choose/drop a local file, then select a shape. Adjust the output size, image fit, zoom, horizontal/vertical position, inside border and background while comparing the original with the result.

The **Avatar**, **README sticker** and **Game token** presets are starting points, not separate rendering modes. On phones, the preview is placed above the controls in a single-column layout.

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

`npm run check` runs strict TypeScript/JSDoc checks on the API/shared core, the browser script syntax check, and the native Node test suite. Tests cover the original API contract and geometry, all shapes, image format/EXIF handling, query validation, response headers, stream limits, DNS pinning, private-address rejection, redirects, timeouts and HTTP GET/HEAD/304 behavior. The original `h()` / `s()` composition, generated HTML, editor hook IDs, stylesheet hash/CSP and no-JavaScript API examples are also covered. HTTP handler tests use a real local server with an injected image source; loader tests mock network IO while retaining the real validation policy.

CI runs these checks on Node 22 for PRs and pushes to `main`.

### Structure

The original server-generated HTML architecture is retained, rather than replaced by a static page or frontend framework:

```text
api/index.ts
  ├─ no image URL → html() → h() + s() → HTML with inline <style>
  └─ image URL    → parseRequest() → cropImage() → SVG
```

- `api/_lib/html.ts`: the single source of the editor HTML and inline styles, built with the original `h(tag, attributes, ...children)` and `s(selector, declarations, ...children)` helpers. Small section functions keep the page maintainable; shape buttons are rendered here using shared geometry.
- `api/_lib/utils/tag.ts`: the original tag-builder interface with attribute escaping, explicit text escaping and boolean-attribute support. Child strings remain **trusted markup**, as in the original; call `text()` for untrusted plain text.
- `api/_lib/utils/style.ts`: the original style helper, including camelCase conversion and child-rule composition for responsive media rules.
- `api/_lib/perser.ts`: retains the original filename and `parseRequest` entry point, delegating to shared validation.
- `api/_lib/cropImage/index.ts`: retains the image-generation entry point; combines the bounded loader with shared SVG rendering.
- `public/core.js`: platform-independent parser, shapes, URL serializer and renderer shared by the API and browser, with TypeScript-checked JSDoc. It replaces the separate legacy filter implementation, not the server's responsibility boundaries.
- `api/_lib/source.ts`: bounded remote image loading and metadata inspection, replacing the old unbounded fetch and hard-coded JPEG MIME type.
- `public/app.js`: attaches editor behavior to server-rendered controls and handles local files/downloads. It does not create a second copy of the shape buttons or page shell.
- `scripts/dev.mjs`: local HTTP server using the same API handler and the two public JavaScript files.

There is no `public/index.html` or external `style.css`. The handler computes a SHA-256 CSP hash from the same `inlineStyles` string used by `html()`. Inline styles are allowed only by this hash; `unsafe-inline` and inline event handlers are not used. Static content is never interpolated from request parameters. The Usage/Markdown examples and API links remain readable without JavaScript.

### Vercel

The project uses the Node 22 `/api` function and the JavaScript files in `public/`. `/` and `/index.html` rewrite to `/api`, so the editor routes use the generated HTML and the same CSP. The HTML module is a normal TypeScript import; no `readFileSync`, working-directory assumptions or `includeFiles` template configuration is required. The public output directory contains only browser modules, not a duplicate HTML page that could drift from the API response. No secrets or environment variables are required.

Before merging a deployment, verify a clean `npm ci`, the preview build, the existing README embed, remote GitHub-avatar redirects, and SVG/PNG downloads in the target browsers. External fetching and the Vercel deployment were not exercised in the offline implementation environment.

## License

MIT © [ivgtr](https://github.com/ivgtr). See [LICENSE](LICENSE).
