import test from 'node:test';
import assert from 'node:assert/strict';
import { initialLayout, validLayout, fits } from '../studio/layout.mjs';
import { RELEASED } from '../assets/released.mjs';
test('continuous layout rejects rotated wall crossings, overlaps, invalid data and duplicate instance IDs',()=>{
  const l=initialLayout();assert.ok(validLayout(l,RELEASED));
  assert.ok(fits({...l.items[0],x:210.25,angle:15},l,RELEASED));
  assert.equal(fits({...l.items[0],x:25,angle:45},l,RELEASED),false);
  const overlap={...l.items[0],key:'overlap',x:225,angle:90};assert.equal(fits(overlap,l,RELEASED),false);
  assert.equal(validLayout({...l,items:[...l.items,overlap]},RELEASED),false);
  assert.equal(validLayout({...l,items:[...l.items,...l.items]},RELEASED),false);
  assert.equal(validLayout({...l,items:[{...l.items[0],x:NaN}]},RELEASED),false);
  assert.equal(validLayout({...l,items:[{...l.items[0],id:'unknown'}]},RELEASED),false);
  assert.equal(validLayout({...l,width:10},RELEASED),false);
});
