/** Alpha occupancy in a 32 × 32 bitmap, independent of DOM and canvas reads. */
export function spriteHit(mask, x, y) {
  if (x < 0 || x >= 1 || y < 0 || y >= 1) return false;
  if (!mask) return true;
  const bit = Math.floor(y * 32) * 32 + Math.floor(x * 32);
  return Boolean(parseInt(mask[Math.floor(bit / 4)], 16) & (1 << (3 - bit % 4)));
}
