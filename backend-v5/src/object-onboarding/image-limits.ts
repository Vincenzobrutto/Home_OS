import { ProviderFailure } from '../review/provider';

export function checkImageDimensions(bytes: Buffer, mime: 'image/png' | 'image/jpeg') {
  let width = 0, height = 0;
  if (mime === 'image/png' && bytes.length >= 24) { width = bytes.readUInt32BE(16); height = bytes.readUInt32BE(20); }
  else if (mime === 'image/jpeg') {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) throw new ProviderFailure('object_onboarding_invalid_image');
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || marker >= 208 && marker <= 215) continue;
      if (offset + 2 > bytes.length) break;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker) && length >= 7) { height = bytes.readUInt16BE(offset + 3); width = bytes.readUInt16BE(offset + 5); break; }
      offset += length;
    }
  }
  if (!width || !height) throw new ProviderFailure('object_onboarding_invalid_image');
  if (width > 8000 || height > 8000 || width * height > 32000000) throw new ProviderFailure('analysis_limits_exceeded');
  return { width, height };
}
