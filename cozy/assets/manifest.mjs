import { SPRITES } from './sprites.mjs';
import { ROOM_CAMERAS } from '../logic/room-camera.mjs';
import { artDefinition } from './art-registry.mjs';
import { RELEASED } from './released.mjs';
const root = new URL('./', import.meta.url);
// The main game loads reviewed WebP frames. The optional studio loads GLB/Three.
const query = typeof location === 'undefined' ? null : new URLSearchParams(location.search);
export const ART_PILOT = query?.get('art-debug') === 'true' && query?.get('pilot') === 'tripo-desk';
const pilotFrames = ART_PILOT ? (await import('./candidates/tripo-desk/frames.mjs')).PILOT_FRAMES : null;

// The room's own layers come in one set per size, so choosing a bigger room
// swaps the shell, the window and the daylight together.
export const roomFrame = (size, light = 'day', weather = 'clear') => new URL(`room/oak/${size}-${light === 'morning' ? 'day' : light}-${weather === 'rain' ? 'rain' : 'clear'}.webp`, root).href;
export const roomAssets = size => ({
  shell: roomFrame(size),
  illustrated: true,
  modular: true,
  // Projected directly from the room kit at the same camera as the furniture.
  fit: ROOM_CAMERAS[size].fit,
  window: new URL('room/empty.svg', root).href,
  windowSunset: new URL('room/empty.svg', root).href,
  windowNight: new URL('room/empty.svg', root).href,
  windowRain: new URL('room/empty.svg', root).href,
  daylight: new URL('room/empty.svg', root).href,
  mask: roomFrame(size),
});

export const objectAsset = (id, rotation = 0, state = 'idle') => {
  const frames = pilotFrames && id === 'desk' ? pilotFrames : RELEASED[id]?.frames;
  if (frames) {
    const angle = frames[rotation] ? rotation : 0, frame = frames[angle];
    return { ...frame, type: 'image', src: new URL(frame.src, root).href,
      shadowSrc: frame.shadowSrc ? new URL(frame.shadowSrc, root).href : null, rotation: angle };
  }
  const definition = artDefinition(id);
  if (definition.representation !== 'webp') throw new Error(`Renderer not installed for ${definition.representation}: ${id}`);
  const sprite = SPRITES[id];
  if (!sprite?.src) throw new Error(`Missing production sprite: ${id}`);
  const view = sprite.orientations?.[rotation] || sprite;
  const frame = view.states?.[state] || view;
  return { ...frame, type: 'image', src: new URL(frame.src, root).href, rotation: view === sprite ? 0 : rotation };
};

export const availableOrientations = id => pilotFrames && id === 'desk' ? [0,90,180,270]
  : RELEASED[id] ? Object.keys(RELEASED[id].frames).map(Number)
  : SPRITES[id]?.src ? [0, ...Object.keys(SPRITES[id].orientations || {}).map(Number)] : [];
