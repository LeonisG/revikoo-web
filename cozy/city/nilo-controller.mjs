import * as THREE from 'three';

export class NiloController{
 constructor(root,clips){
  this.root=root;this.mixer=new THREE.AnimationMixer(root);this.actions=new Map(clips.map(c=>[c.name,this.mixer.clipAction(c)]));
  for(const name of ['NILO_IDLE','NILO_GREET','NILO_WRITE','NILO_STAMP'])if(!this.actions.has(name))throw new Error(`Missing Nilo clip: ${name}`);
  this.enabled=true;this.active=false;this.current='NILO_IDLE';this.idleTime=0;this.workIndex=0;this.greetings=0;
  this.finished=()=>{this.play('NILO_IDLE');this.idleTime=0;};this.mixer.addEventListener('finished',this.finished);this.play('NILO_IDLE');
 }
 play(name){
  const action=this.actions.get(name);if(!action)return false;
  const previous=this.actions.get(this.current);if(previous&&previous!==action)previous.fadeOut(.20);
  action.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).setLoop(name==='NILO_IDLE'?THREE.LoopRepeat:THREE.LoopOnce,Infinity);action.clampWhenFinished=name!=='NILO_IDLE';action.fadeIn(.20).play();this.current=name;return true;
 }
 greet(){this.active=true;this.idleTime=0;this.greetings++;if(this.enabled)this.play('NILO_GREET');else this.neutral();}
 neutral(){this.mixer.stopAllAction();this.current='NILO_IDLE';this.actions.get('NILO_IDLE').reset().setLoop(THREE.LoopRepeat,Infinity).play();this.mixer.update(0);}
 setMotion(enabled){this.enabled=enabled;if(!enabled)this.neutral();}
 update(dt){if(!this.active||!this.enabled)return;this.mixer.update(dt);if(this.current==='NILO_IDLE'){this.idleTime+=dt;if(this.idleTime>13){this.idleTime=0;this.play(this.workIndex++%2?'NILO_STAMP':'NILO_WRITE');}}}
 snapshot(){return {clip:this.current,enabled:this.enabled,active:this.active,greetings:this.greetings,time:this.mixer.time,clips:[...this.actions.keys()]};}
 dispose(){this.active=false;this.mixer.removeEventListener('finished',this.finished);this.mixer.stopAllAction();this.mixer.uncacheRoot(this.root);}
}
