# Security

## Image inspection

`api/_lib/raster.ts` reads dimensions from PNG IHDR, JPEG SOF and EXIF IFD0, GIF logical-screen descriptors, and WebP VP8/VP8L/VP8X headers. It is a bounded header inspector, not a pixel decoder or a complete file-integrity validator. EXIF orientation is used for JPEG display dimensions. WebP animation uses its canvas dimensions.

Every variable-length segment and container-relative offset is checked before reading. Marker/chunk loops advance on every iteration; EXIF pointers are not followed recursively. Malformed headers and unsupported formats are rejected rather than handed to another parser. The application has no production npm dependencies; `image-size` and its generic format handlers are removed.

Inputs are limited to 3 MiB, 40 megapixels and 16,384 pixels per side before rendering. Public HTTP(S) retrieval validates and pins DNS results, revalidates every redirect, blocks private/metadata networks, and bounds redirects, body size and total retrieval time. These restrictions apply to server retrieval; local images are decoded in the browser without upload.

## Output and privacy

SVG output embeds the original raster bytes, including metadata and pixels hidden by the shape. It must not be used to redact sensitive information. PNG export rasterizes the visible result and captures one frame of animated input. Public API responses are cached; do not use private or token-bearing source URLs.

## Dependency checks

CI runs `npm ci` and `npm audit` against the committed lockfile, including development dependencies. npm install scripts are permitted only for the pinned esbuild release; unreviewed scripts fail installation. Passing an audit checks known advisories at that time, not the absence of all vulnerabilities.
