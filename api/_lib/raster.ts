import { imageSize, disableTypes, types } from 'image-size';

const supported = new Set(['png', 'jpg', 'gif', 'webp']);
// Defense in depth: never invoke parsers for formats this application cannot serve.
// image-size <=2.0.2 has unpatched infinite loops in its JXL, HEIF and ICNS parsers.
disableTypes(types.filter(type => !supported.has(type)));

export function rasterDimensions(bytes: Buffer): ReturnType<typeof imageSize> {
  let type: string;
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) type = 'png';
  else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) type = 'jpg';
  else if (bytes.length >= 10 && ['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6))) type = 'gif';
  else if (bytes.length >= 16 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') type = 'webp';
  else throw new TypeError('Unsupported raster signature');

  // Check magic bytes BEFORE the generic detector, not after the parser returns.
  const dimensions = imageSize(bytes);
  if (dimensions.type !== type) throw new TypeError('Mismatched raster type');
  return dimensions;
}
