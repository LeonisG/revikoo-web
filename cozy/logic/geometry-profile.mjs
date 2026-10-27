// Measured render heights are separate from prices, ownership and saved positions.
import { RELEASED } from '../assets/released.mjs';
const query = typeof location === 'undefined' ? null : new URLSearchParams(location.search);
const pilot = query?.get('art-debug') === 'true' && query?.get('pilot') === 'tripo-desk'
  ? (await import('../assets/candidates/tripo-desk/geometry.mjs')).PILOT_GEOMETRY : null;

export function geometryProfile(item) {
  const geometry = pilot && item.id === pilot.id ? pilot : RELEASED[item.id]?.geometry;
  if (!geometry || !item.top) return item;
  return { ...item, top: geometry.top, surfaces: geometry.surfaces || item.surfaces?.map(slot =>
    slot.z === undefined ? slot : { ...slot, z: slot.z * geometry.top / item.top }) };
}
