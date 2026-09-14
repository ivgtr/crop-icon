<div align="center">
  <h3>
    <img width="200" alt="crop icon" src="https://crop-icon.vercel.app/api?url=https://github.com/ivgtr.png">
  </h3>
  <p>Copy-paste this into your markdown content, and that's it. Simple!</p>
</div>

Square icons are outdated, try transforming them!

[Open the studio](https://crop-icon.vercel.app) to edit an image and download SVG or PNG. Local files stay in your browser.

## API

Set `url` to a public image URL:

```md
[![icon](https://crop-icon.vercel.app/api?p=heart&url=https://github.com/ivgtr.png)](https://github.com/ivgtr)
```

Shapes: `circle` · `heart` · `star` · `square` · `rounded` · `squircle` · `hexagon` · `diamond` · `shield` · `ticket` · `flower`.

| Parameter | Value | Default |
| --- | --- | --- |
| `url` | Public HTTP(S) image URL | Show the studio |
| `p` | Shape above | `circle` |
| `width`, `height` | Whole pixels, 1–4096 | Each source dimension |
| `fit` | `contain`, `cover` | `contain` |
| `x`, `y` | Alignment, 0–100 | `50` |
| `zoom` | Scale, 1–4 | `1` |
| `border` | Inside stroke, 0–64 px | `0` |
| `color` | 3/6/8-digit hex | `ffffff` |
| `bg` | Hex or `transparent` | `transparent` |

Compose queries with `URLSearchParams`; omit `#` in colors. The old `hart` spelling is no longer accepted.

Input: PNG, JPEG, GIF or WebP, up to 3 MiB, 40 megapixels and 16,384 px per side. Responses are SVG, publicly cached for 24 hours; invalid requests return an empty 404.

**SVG retains the original image bytes, including hidden pixels and metadata. It is not a redaction tool.** Avoid private or token-bearing source URLs.

## Development

Node.js 24 and npm 12.0.2:

```sh
npm install --global npm@12.0.2
npm ci
npm start
```

[Verification and deployment](docs/verification.md) · [Security](SECURITY.md)

## License

[MIT](LICENSE)
