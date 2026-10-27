const root = new URL('./', import.meta.url);

// The room's own layers come in one set per size, so choosing a bigger room
// swaps the shell, the window and the daylight together.
export const roomAssets = size => ({
  shell: new URL(`room/shell-${size}.svg`, root).href,
  window: new URL(`room/window-${size}.svg`, root).href,
  windowSunset: new URL(`room/window-${size}-sunset.svg`, root).href,
  windowNight: new URL(`room/window-${size}-night.svg`, root).href,
  windowRain: new URL(`room/window-${size}-rain.svg`, root).href,
  daylight: new URL(`room/light-${size}.svg`, root).href,
  mask: new URL(`room/mask-${size}.svg`, root).href,
});

export const OBJECTS = new URL('objects.svg', root).href;

// Optional per-object overrides, for swapping a drawn symbol for a bitmap later:
// mushroom: { type: 'image', src: new URL('mushroom-lamp.webp', root).href }
export const ITEM_ASSETS = {};
export const objectAsset = id => ITEM_ASSETS[id] || { type: 'symbol', src: `${OBJECTS}#${id}` };
