import { SPRITES } from './sprites.mjs';
import { ROOM_CAMERAS } from '../logic/room-camera.mjs';
import { artDefinition } from './art-registry.mjs';
const root = new URL('./', import.meta.url);

// The room's own layers come in one set per size, so choosing a bigger room
// swaps the shell, the window and the daylight together.
export const roomAssets = size => ({
  shell: new URL(`room/illustrated-${size}.webp`, root).href,
  illustrated: true,
  // Measured, not eyeballed: see tools/measure-room.py.
  fit: ROOM_CAMERAS[size].fit,
  window: new URL(`room/window-${size}.svg`, root).href,
  windowSunset: new URL(`room/window-${size}-sunset.svg`, root).href,
  windowNight: new URL(`room/window-${size}-night.svg`, root).href,
  windowRain: new URL(`room/window-${size}-rain.svg`, root).href,
  daylight: new URL(`room/light-${size}.svg`, root).href,
  mask: new URL(`room/illustrated-${size}.webp`, root).href,
});

export const objectAsset = (id, rotation = 0, state = 'idle') => {
  const definition = artDefinition(id);
  if (definition.representation !== 'webp') throw new Error(`Renderer not installed for ${definition.representation}: ${id}`);
  const sprite = SPRITES[id];
  if (!sprite?.src) throw new Error(`Missing production sprite: ${id}`);
  const view = sprite.orientations?.[rotation] || sprite;
  const frame = view.states?.[state] || view;
  return { ...frame, type: 'image', src: new URL(frame.src, root).href, rotation: view === sprite ? 0 : rotation };
};

export const availableOrientations = id => SPRITES[id]?.src ? [0, ...Object.keys(SPRITES[id].orientations || {}).map(Number)] : [];
