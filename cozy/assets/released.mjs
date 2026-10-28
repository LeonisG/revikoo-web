import { asset as desk } from './models/oak/desk/asset.mjs';
import { asset as chair } from './models/oak/chair/asset.mjs';
import { asset as bookshelf } from './models/oak/bookshelf/asset.mjs';
import { asset as wardrobe } from './models/oak/wardrobe-oak/asset.mjs';
import { asset as lamp } from './models/oak/floor-lamp/asset.mjs';
import { asset as laptop } from './models/finance/finance-laptop/asset.mjs';
import { asset as stationery } from './models/finance/finance-stationery/asset.mjs';
import { asset as piggy } from './models/finance/finance-piggy-bank/asset.mjs';
import { asset as calendar } from './models/finance/finance-desk-calendar/asset.mjs';
// Only reviewed, explicitly released assets belong here.
export const RELEASED = Object.freeze({ desk, chair, bookshelf, 'wardrobe-oak': wardrobe, 'floor-lamp': lamp,
  'finance-laptop':laptop,'finance-stationery':stationery,'finance-piggy-bank':piggy,'finance-desk-calendar':calendar });
