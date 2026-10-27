const root = new URL('./', import.meta.url);
export const ROOM_ASSETS = {
  background: new URL('room.svg', root).href,
  furniture: new URL('furniture.svg', root).href,
  foreground: new URL('foreground.svg', root).href,
  rug: new URL('rug.svg', root).href,
  objects: new URL('objects.svg', root).href,
};
// Optional per-object overrides, e.g.:
// mushroom: { type: 'image', src: new URL('mushroom-lamp.webp', root).href }
export const ITEM_ASSETS = {};
export const objectAsset = id => ITEM_ASSETS[id] || { type: 'symbol', src: `${ROOM_ASSETS.objects}#${id}` };
