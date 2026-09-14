# crop-icon

**A new shape for your image.**

Turn a public image URL into an embeddable icon, or bring a local image and make an avatar, sticker or game token without uploading it.

[Open the studio](https://crop-icon.vercel.app) · [Source](https://github.com/ivgtr/crop-icon)

```md
[![icon](https://crop-icon.vercel.app/api?url=https://github.com/ivgtr.png)](https://github.com/ivgtr)
```

## Make a cut, then take it anywhere

Load a public image URL or choose/drop a local file, then select a shape. Adjust output size, fit, zoom, position, inside border and background while comparing the original with the result. Avatar, README sticker and Game token presets are starting points, not separate renderers. On phones the preview is above the controls.

Download SVG / PNG creates a self-contained snapshot. Copy URL / Markdown / HTML creates a live image embed backed by the existing API. Edit link recreates a public-source edit. Local files and the built-in demo are never uploaded and cannot produce a public embed URL. Remote images are fetched once; subsequent edits run locally. Nothing is stored in localStorage or a database.

## Existing URLs still work

```text
/api?url=https://github.com/ivgtr.png
/api?p=hart&url=https://github.com/ivgtr.png
/api?p=star&width=256&height=256&url=https://github.com/ivgtr.png
```

`hart` is deliberately not renamed; `heart` is an alias. The original circle, star and heart geometry is retained, including non-square behavior. Masks changed to clipping paths, so antialiased boundary pixels are not guaranteed identical. Without new options, output uses natural source dimensions, centered contain fit, no border and transparency. Width and height independently override corresponding source dimensions. The editor starts at 512 × 512 with cover fit and explicitly includes those settings in URLs, without changing API defaults.

Actual MIME detection fixes the former JPEG-only declaration. JPEG EXIF rotation is recognized when measuring displayed dimensions. `GET /api` without `url` returns HTML. Failed image requests keep an empty 404; malformed or unsafe inputs are now rejected. SVGs retain a 24-hour public cache. HEAD and conditional If-None-Match requests are supported.

## Shapes and optional controls

`circle` · `hart` / `heart` · `star` · `square` · `rounded` · `squircle` · `hexagon` · `diamond` · `shield` · `ticket` · `flower`

Use a square canvas for conventional avatars, a wider ticket for a banner or a hexagon/shield for a game token.

| Parameter | Accepted value | API default |
| --- | --- | --- |
| `url` | Public HTTP(S) raster URL | No image: show studio |
| `p` | Shape above | `circle` |
| `width`, `height` | Whole pixels, 1–4096 | Corresponding source dimension |
| `fit` | `contain`, `cover` | `contain` |
| `x`, `y` | 0–100 alignment | `50` |
| `zoom` | 1–4 | `1` |
| `border` | Inside stroke, 0–64 pixels | `0` |
| `color` | 3/6/8-digit hex | `ffffff` |
| `bg` | 3/6/8-digit hex or `transparent` | `transparent` |

```text
/api?url=https%3A%2F%2Fgithub.com%2Fivgtr.png&p=hexagon&width=256&height=256&fit=cover&border=8&color=e95432
```

Use URLSearchParams to compose URLs, especially for sources with queries. Omit the # in colors or encode it as %23. Position moves an image only when space or overflow exists; increase zoom for an exact-fit square source. Background and border fill only inside the shape and do not change dimensions.

## Formats, limits and privacy

Input: PNG, JPEG, GIF or WebP; at most 3 MiB, 40 megapixels and 16,384 pixels per side. Output: at most 4,096 per side. Specify smaller output dimensions for large sources. SVG/HTML inputs are rejected.

**SVG embeds the original raster bytes, including hidden pixels and metadata. Do not use it to redact sensitive information.** PNG rasterizes the visible result and captures one frame of animated input. Keep original files separately. Live embeds are publicly cached; avoid private or signed/token-bearing URLs. Source changes can take at least the API's 24-hour cache lifetime to appear, and embedding services cache independently. Downloads are snapshots. No uploaded-file hosting or source-metadata erasure is provided.

Retrieval allows HTTP(S) default ports without URL credentials. It rejects non-public destinations, checks every DNS answer, pins the connection to the validated address, revalidates at most three redirects, and enforces an eight-second deadline and streamed byte limit. Compressed upstream bodies are rejected. Unsafe URLs, unsupported formats, excessive images and malformed queries may now return 404 rather than reaching the old unchecked loader.

The loader has no persistent source cache: loading and embedding later may use different source versions. Shared rendering does not remove browser decoding or color-management differences. Non-JPEG orientation metadata is not comprehensively verified.

## Development

Use Node.js 22 and **Yarn Classic 1.22.22**, preserving the project's original Yarn toolchain. Every authored executable file (application, tooling and tests) is TypeScript.

```sh
corepack enable
corepack prepare yarn@1.22.22 --activate
yarn install --frozen-lockfile --non-interactive --production=false
yarn run dev
yarn run check
```

`packageManager` pins Yarn; `yarn.lock` is the only dependency lockfile. Update dependencies with Yarn and commit its generated lockfile. Do not introduce another package manager or lockfile. CI and Vercel use the same frozen installation command, including build-time dependencies.

`yarn run check` builds both environments with strict TypeScript checks and then runs the emitted test suite. Use **`yarn run check`**, not Yarn Classic's built-in `yarn check`. It fails on type errors; there is no JavaScript-only syntax-check path. Browser sources use DOM types without Node ambient types. Server, tooling and tests use Node types.

### One public entry point

```text
api/
  index.ts                         # the only deployed HTTP entry point
  _lib/
    html.ts                        # original h()/s() HTML and inline styles
    core.ts                        # typed shapes, options and SVG rendering
    perser.ts                      # original query parsing entry
    cropImage/index.ts             # original image generation entry
    source.ts                      # bounded image retrieval
    editor/index.ts                # typed browser behavior
    editor/elements.ts             # checked, typed DOM hooks
    utils/{tag,style}.ts            # original composition helpers
    generated/editor.ts            # ignored build output, never hand-written
scripts/{build,dev}.ts              # TypeScript build tools, not deployed routes
tests/*.test.ts                     # TypeScript tests, compiled before execution
```

There is **no public directory, hand-written .js/.mjs/.cjs source, static HTML template or public JavaScript asset endpoint**. Tests protect this boundary and the existing API contract.

The build checks `_lib/editor/*.ts` and `_lib/core.ts` with tsc, compiles the TypeScript build tool, bundles browser code with esbuild, and places the result in an ignored TypeScript string module. The final tsc pass compiles the API, tools and tests. `html()` uses `h()` / `s()` and embeds the compiled script at the end of the document. JavaScript generated for Node or the browser is an internal build artifact, never an authored source or directly served file. No eval, function-stringification or hand-maintained JavaScript strings are used.

The API hashes exactly the script and style strings it embeds for CSP. It does not use unsafe-inline, inline events, runtime compilation or runtime file reads. SVG keeps its separate restrictive policy. Original Usage/Markdown examples remain available without JavaScript.

### Vercel

`vercel.json` explicitly builds **only `api/index.ts` with `@vercel/node`**. It has no static builder or static output directory. The existing `/api` endpoint and the editor aliases rewrite to that single function. No browser asset endpoints or source-file routes are added. The development server delegates to the same handler and has no file-serving logic.

The `vercel-build` hook runs the same `yarn run build` pipeline before the Node function is traced, so the generated editor module exists when the handler is compiled. The ordinary API-folder builder does not execute a plain `build` script by itself. Do not replace this with an empty static output directory: Vercel's static builder rejects empty directories. No placeholder public files are needed.

The explicit `builds` property is a supported legacy configuration chosen here to allowlist one function and prevent automatic static-file publishing. It must not be combined with `functions`. This tradeoff and the single-entry configuration are covered by tests. Dependency detection is based on the Yarn lockfile; the explicit installation command also uses Yarn rather than relying on an old dashboard override.

Restart `yarn run dev` after source changes to rebuild. Before merging, verify Vercel preview, remote GitHub avatars, the original README embed, downloads and target browsers. Unit tests and a successful build are not a substitute for deployment verification.

## License

MIT © [ivgtr](https://github.com/ivgtr). See [LICENSE](LICENSE).
