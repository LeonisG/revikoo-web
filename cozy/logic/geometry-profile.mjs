// Geometry is separate from image styling and ownership. Candidate dimensions
// are opt-in for the isolated art-debug save; ordinary games retain their data.
const query = typeof location === 'undefined' ? null : new URLSearchParams(location.search);
const pilot = query?.get('art-debug') === 'true' && query?.get('pilot') === 'tripo-desk'
  ? (await import('../assets/candidates/tripo-desk/geometry.mjs')).PILOT_GEOMETRY : null;

export function geometryProfile(item) {
  return pilot && item.id === pilot.id ? { ...item, top: pilot.top } : item;
}
