# Image parsing security

## Known upstream advisories (reviewed 2026-09-14)

`image-size@2.0.2` is affected by two High-severity advisories. Both currently list no patched release:

- [GHSA-5p2g-fcmc-qvqq / CVE-2025-71329](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq): zero-sized JXL/HEIF boxes can prevent the parser offset from advancing.
- [GHSA-w3rx-r6r6-pgpr / CVE-2025-71330](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr): a zero-sized ICNS entry can cause the same synchronous infinite loop.

A network timeout cannot interrupt a synchronous parser loop. Checking the returned MIME type after calling `imageSize()` is too late.

## Application mitigation

All server-side dimension inspection goes through `api/_lib/raster.ts`. It checks PNG, JPEG, GIF or WebP magic bytes **before** calling the generic detector. All other formats, including JXL, HEIF and ICNS, are rejected. Unsupported image-size handlers are also explicitly disabled. Content-Type headers, URL extensions and browser MIME declarations do not grant admission. The returned parser type must match the admitted signature.

`tests/raster.test.ts` runs malformed unsupported samples in child processes with a parent-enforced timeout. This catches synchronous hangs rather than relying on a timer in the blocked event loop. Valid PNG/JPEG/GIF/WebP dimensions and JPEG orientation remain covered by the test suite. Existing byte, dimension, DNS, redirect and request-deadline limits are retained.

This is an application-level mitigation for these specific vulnerable parser paths, **not an upstream library fix or a claim of zero vulnerabilities**. `yarn audit` still reports the affected dependency. Do not suppress the advisories, enable additional formats or import `image-size` directly elsewhere without revisiting this boundary. A future maintained replacement or patched release should be assessed separately and verified against the existing image and compatibility tests.

## Image privacy

SVG output embeds the complete original raster, including hidden pixels and metadata. It is not a redaction tool. PNG exports rasterize the visible result. Public embeds are cached publicly; do not use private or signed URLs. Local files are processed in the browser and are never uploaded.
