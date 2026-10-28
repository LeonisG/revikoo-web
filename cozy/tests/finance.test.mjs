import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CATALOG, ITEMS, EDITOR_ITEMS, STARTER_ITEMS } from '../logic/catalog.mjs';
import { RELEASED } from '../assets/released.mjs';
import { initialLayout, validLayout, pose } from '../studio/layout.mjs';
import { geometryProfile } from '../logic/geometry-profile.mjs';
import { createEngine } from '../logic/engine.mjs';
import { createStorage } from '../logic/storage.mjs';
test('finance assets are packed, rotatable native decor outside the economy',()=>{
 const data=new Map(),engine=createEngine(createStorage({backend:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},key:'finance-test'}),{debug:true});
 const before=engine.state.coins;
 for(const item of EDITOR_ITEMS){
  assert.ok(!ITEMS.includes(item)&&!STARTER_ITEMS.includes(item.id));assert.equal(item.opens,undefined);
  assert.equal(item.placement,'surface');assert.equal(item.rotatable,true);assert.equal(item.price,0);
  assert.throws(()=>engine.buyItem(item.id));engine.debug('add',item.id);assert.throws(()=>engine.sellItem(item.id));
  const asset=RELEASED[item.id],bytes=fs.readFileSync(new URL('../assets/'+asset.model,import.meta.url));
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.deepEqual(Object.keys(asset.frames),['0','90','180','270']);
  for(const frame of Object.values(asset.frames))assert.ok(fs.existsSync(new URL('../assets/'+frame.src,import.meta.url)));
 }
 assert.equal(engine.state.coins,before);assert.equal(geometryProfile(CATALOG['side-table']).top,58);
});
test('surface children follow continuous host transforms; invalid parents and overlaps are rejected',()=>{
 const l=initialLayout(),child={key:'laptop',id:'finance-laptop',x:0,y:0,angle:0,parentSurfaceId:'first-desk',surfaceSlot:0};l.items.push(child);
 assert.ok(validLayout(l,RELEASED));const old=pose(child,l,RELEASED);l.items[0].x+=20;l.items[0].angle=90;
 const next=pose(child,l,RELEASED);assert.ok(validLayout(l,RELEASED));assert.equal(next.z,old.z);assert.equal(next.angle,90);assert.equal(next.x,230);assert.equal(next.y,112.8);
 for(const bad of [{parentSurfaceId:'missing'},{parentSurfaceId:child.key},{surfaceSlot:-1},{surfaceSlot:99},{parentSurfaceId:null}]){
  assert.equal(validLayout({...l,items:[l.items[0],{...child,...bad}]},RELEASED),false);
 }
 assert.equal(validLayout({...l,items:[...l.items,{...child,key:'duplicate-slot'}]},RELEASED),false);
});
