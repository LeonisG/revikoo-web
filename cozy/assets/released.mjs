import { asset as desk } from './models/oak/desk/asset.mjs';
import { asset as chair } from './models/oak/chair/asset.mjs';
import { asset as bookshelf } from './models/oak/bookshelf/asset.mjs';
import { asset as wardrobe } from './models/oak/wardrobe-oak/asset.mjs';
import { asset as lamp } from './models/oak/floor-lamp/asset.mjs';
// Only reviewed, explicitly released assets belong here.
export const RELEASED = Object.freeze({ desk, chair, bookshelf, 'wardrobe-oak': wardrobe, 'floor-lamp': lamp });
