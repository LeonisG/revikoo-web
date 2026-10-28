// Measured render heights are separate from prices, ownership and saved positions.
import { RELEASED } from '../assets/released.mjs';
const query = typeof location === 'undefined' ? null : new URLSearchParams(location.search);
const pilot = query?.get('art-debug') === 'true' && query?.get('pilot') === 'tripo-desk'
  ? (await import('../assets/candidates/tripo-desk/geometry.mjs')).PILOT_GEOMETRY : null;

export function geometryProfile(item) {
  // Legacy side-table master: tabletop centre (630,430) on 1280²,
  // base pivot (.5,.6836), delivered width 184.412 / axisFix 1.10646.
  // Its old 92-unit placeholder left native accessories floating above it.
  if(item.id==='side-table')return {...item,top:58};
  const geometry = pilot && item.id === pilot.id ? pilot : RELEASED[item.id]?.geometry;
  if (!geometry || !item.top) return item;
  return { ...item, top: geometry.top, surfaces: geometry.surfaces || item.surfaces?.map(slot =>
    slot.z === undefined ? slot : { ...slot, z: slot.z * geometry.top / item.top }) };
}
