export const TOPPING_PHOTO_DATA_URL_REGEX =
  /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

export function getToppingImageUrl(id: string, version: number): string {
  return `/api/toppings/${encodeURIComponent(id)}/foto?v=${version}`;
}

export function isValidToppingPhoto(dataUrl: string): boolean {
  const match = TOPPING_PHOTO_DATA_URL_REGEX.exec(dataUrl);
  if (!match) return false;

  const bytes = Buffer.from(match[2], 'base64');
  if (
    bytes.length === 0 ||
    bytes.length > 2 * 1024 * 1024 ||
    bytes.toString('base64') !== match[2]
  ) {
    return false;
  }

  if (match[1] === 'jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (match[1] === 'png') {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  return (
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  );
}
