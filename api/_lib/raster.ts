export interface RasterDimensions {
  type: 'png' | 'jpg' | 'gif' | 'webp';
  width: number;
  height: number;
  orientation?: number;
}

function requireHeader(valid: boolean): asserts valid {
  if (!valid) throw new TypeError('Invalid raster header');
}

// Offsets are relative to the current container, never to the underlying ArrayBuffer.
function range(bytes: Buffer, offset: number, length: number): void {
  requireHeader(offset >= 0 && length >= 0 && offset <= bytes.length - length);
}

function exifOrientation(bytes: Buffer): number | undefined {
  range(bytes, 0, 8);
  const order = bytes.toString('latin1', 0, 2);
  requireHeader(order === 'II' || order === 'MM');
  function short(offset: number): number {
    range(bytes, offset, 2);
    return order === 'II' ? bytes.readUInt16LE(offset) : bytes.readUInt16BE(offset);
  }
  function long(offset: number): number {
    range(bytes, offset, 4);
    return order === 'II' ? bytes.readUInt32LE(offset) : bytes.readUInt32BE(offset);
  }
  requireHeader(short(2) === 42);
  const ifd = long(4);
  requireHeader(ifd >= 8);
  const count = short(ifd);
  range(bytes, ifd + 2, count * 12 + 4);
  let orientation: number | undefined;
  // Only IFD0 carries the displayed image orientation. Do not follow thumbnail/IFD chains.
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (short(entry) !== 0x0112) continue;
    requireHeader(orientation === undefined && short(entry + 2) === 3 && long(entry + 4) === 1);
    orientation = short(entry + 8);
    requireHeader(orientation >= 1 && orientation <= 8);
  }
  return orientation;
}

function jpegDimensions(bytes: Buffer): RasterDimensions {
  let offset = 2;
  let dimensions: RasterDimensions | undefined;
  let orientation: number | undefined;
  while (offset < bytes.length) {
    requireHeader(bytes[offset++] === 0xff);
    while (bytes[offset] === 0xff) offset++;
    range(bytes, offset, 1);
    const marker = bytes[offset++];
    requireHeader(marker !== 0 && marker !== 0x01 && (marker < 0xd0 || marker > 0xd9));
    range(bytes, offset, 2);
    const length = bytes.readUInt16BE(offset);
    requireHeader(length >= 2);
    range(bytes, offset, length);
    const payload = bytes.subarray(offset + 2, offset + length);
    offset += length; // Every segment advances, including empty/unknown APP segments.
    if (marker === 0xe1 && payload.subarray(0, 6).equals(Buffer.from('Exif\0\0', 'latin1'))) {
      const value = exifOrientation(payload.subarray(6));
      requireHeader(orientation === undefined || value === undefined || orientation === value);
      if (value !== undefined) orientation = value;
    }
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      range(payload, 0, 6);
      requireHeader(!dimensions && payload[5] > 0 && payload.length === 6 + 3 * payload[5]);
      dimensions = { type: 'jpg', width: payload.readUInt16BE(3), height: payload.readUInt16BE(1) };
    }
    if (marker === 0xda) {
      // Stop before entropy-coded pixels; APP1 after SOF has already been inspected.
      requireHeader(!!dimensions && payload.length >= 4 && payload[0] > 0 && payload.length === 4 + 2 * payload[0]);
      return orientation === undefined ? dimensions : { ...dimensions, orientation };
    }
  }
  throw new TypeError('Missing JPEG frame or scan header');
}

function webpDimensions(bytes: Buffer): RasterDimensions {
  range(bytes, 0, 20);
  requireHeader(bytes.readUInt32LE(4) + 8 === bytes.length);
  let offset = 12;
  let canvas: RasterDimensions | undefined;
  let image: RasterDimensions | undefined;
  let animated = false;
  let animationHeader = false;
  let frames = 0;
  while (offset < bytes.length) {
    range(bytes, offset, 8);
    const tag = bytes.toString('latin1', offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    range(bytes, offset + 8, length + (length & 1));
    const payload = bytes.subarray(offset + 8, offset + 8 + length);
    if (length & 1) requireHeader(bytes[offset + 8 + length] === 0);
    if (tag === 'VP8X') {
      requireHeader(offset === 12 && length === 10 && (payload[0] & 0xc1) === 0 && payload.readUIntBE(1, 3) === 0);
      canvas = { type: 'webp', width: payload.readUIntLE(4, 3) + 1, height: payload.readUIntLE(7, 3) + 1 };
      requireHeader(canvas.width * canvas.height <= 0xffffffff);
      animated = (payload[0] & 2) !== 0;
    } else if (tag === 'VP8 ' || tag === 'VP8L') {
      requireHeader(!image && !animated && (canvas !== undefined || offset === 12));
      if (tag === 'VP8 ') {
        range(payload, 0, 10);
        requireHeader((payload[0] & 1) === 0 && payload.subarray(3, 6).equals(Buffer.from([0x9d, 1, 0x2a])));
        image = { type: 'webp', width: payload.readUInt16LE(6) & 0x3fff, height: payload.readUInt16LE(8) & 0x3fff };
      } else {
        range(payload, 0, 5);
        requireHeader(payload[0] === 0x2f);
        const bits = payload.readUInt32LE(1);
        requireHeader((bits >>> 29) === 0);
        image = { type: 'webp', width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
      }
      if (canvas) requireHeader(image.width === canvas.width && image.height === canvas.height);
    } else if (tag === 'ANIM') {
      requireHeader(animated && !animationHeader && !frames && length === 6);
      animationHeader = true;
    } else if (tag === 'ANMF') {
      requireHeader(!!canvas && animated && animationHeader && length >= 24);
      const x = payload.readUIntLE(0, 3) * 2, y = payload.readUIntLE(3, 3) * 2;
      const width = payload.readUIntLE(6, 3) + 1, height = payload.readUIntLE(9, 3) + 1;
      requireHeader(x + width <= canvas.width && y + height <= canvas.height && (payload[15] & 0xfc) === 0);
      // Frame subchunks are bounded too; pixels are decoded only by the browser.
      let frameOffset = 16;
      let frameImage = false;
      while (frameOffset < payload.length) {
        range(payload, frameOffset, 8);
        const frameTag = payload.toString('latin1', frameOffset, frameOffset + 4);
        const size = payload.readUInt32LE(frameOffset + 4);
        range(payload, frameOffset + 8, size + (size & 1));
        if (frameTag === 'VP8 ' || frameTag === 'VP8L') {
          requireHeader(!frameImage && size >= (frameTag === 'VP8 ' ? 10 : 5));
          frameImage = true;
        }
        frameOffset += 8 + size + (size & 1);
      }
      requireHeader(frameImage);
      frames++;
    }
    offset += 8 + length + (length & 1);
  }
  requireHeader(animated ? !!canvas && frames > 0 : !!image);
  const result = canvas ?? image;
  requireHeader(!!result);
  return result;
}

// A header inspector for our four supported raster formats, not a general image decoder.
export function rasterDimensions(bytes: Buffer): RasterDimensions {
  let dimensions: RasterDimensions;
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    range(bytes, 0, 33);
    requireHeader(bytes.readUInt32BE(8) === 13 && bytes.toString('latin1', 12, 16) === 'IHDR');
    dimensions = { type: 'png', width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    requireHeader(dimensions.width <= 0x7fffffff && dimensions.height <= 0x7fffffff);
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    dimensions = jpegDimensions(bytes);
  } else if (['GIF87a', 'GIF89a'].includes(bytes.toString('latin1', 0, 6))) {
    range(bytes, 0, 13);
    dimensions = { type: 'gif', width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
  } else if (bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP') {
    dimensions = webpDimensions(bytes);
  } else {
    throw new TypeError('Unsupported raster signature');
  }
  requireHeader(dimensions.width > 0 && dimensions.height > 0);
  return dimensions;
}
