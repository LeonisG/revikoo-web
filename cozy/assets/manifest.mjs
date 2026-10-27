import { SPRITES } from './sprites.mjs';
const root = new URL('./', import.meta.url);

// The room's own layers come in one set per size, so choosing a bigger room
// swaps the shell, the window and the daylight together.
export const roomAssets = size => ({
  shell: new URL(`room/illustrated-${size}.webp`, root).href,
  illustrated: true,
  fit: ({ small:{x:-.9,y:7.4,w:101.8,h:86.4}, medium:{x:-1.2,y:2,w:102.4,h:96.7}, large:{x:1,y:11.2,w:98,h:88.6} })[size],
  window: new URL(`room/window-${size}.svg`, root).href,
  windowSunset: new URL(`room/window-${size}-sunset.svg`, root).href,
  windowNight: new URL(`room/window-${size}-night.svg`, root).href,
  windowRain: new URL(`room/window-${size}-rain.svg`, root).href,
  daylight: new URL(`room/light-${size}.svg`, root).href,
  mask: new URL(`room/illustrated-${size}.webp`, root).href,
});

export const objectAsset = (id, rotation = 0, state = 'idle') => {
  const sprite = SPRITES[id];
  if (!sprite?.src) throw new Error(`Missing production sprite: ${id}`);
  const view = sprite.orientations?.[rotation] || sprite;
  const frame = view.states?.[state] || view;
  return { ...frame, type: 'image', src: new URL(frame.src, root).href, rotation: view === sprite ? 0 : rotation };
};

export const availableOrientations = id => SPRITES[id]?.src ? [0, ...Object.keys(SPRITES[id].orientations || {}).map(Number)] : [];
