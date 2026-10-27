const root = new URL('./', import.meta.url);
export const ROOM_ASSETS = {
  background: new URL('room/shell.svg', root).href,
  window: new URL('room/window.svg', root).href,
  windowNight: new URL('room/window-night.svg', root).href,
  windowSunset: new URL('room/window-sunset.svg', root).href,
  windowRain: new URL('room/window-rain.svg', root).href,
  wallDecor: new URL('room/wall-decor.svg', root).href,
  bookshelf: new URL('furniture/bookshelf.svg', root).href,
  furniture: new URL('furniture/desk.svg', root).href,
  foreground: new URL('furniture/chair.svg', root).href,
  plant: new URL('plants/large-plant.svg', root).href,
  cat: new URL('furniture/cat.svg', root).href,
  rug: new URL('room/rug.svg', root).href,
  objects: new URL('objects.svg', root).href,
};
// Optional per-object overrides, e.g.:
// mushroom: { type: 'image', src: new URL('mushroom-lamp.webp', root).href }
export const ITEM_ASSETS = {};
export const objectAsset = id => ITEM_ASSETS[id] || { type: 'symbol', src: `${ROOM_ASSETS.objects}#${id}` };
