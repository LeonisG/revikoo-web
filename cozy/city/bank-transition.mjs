export const BANK_STATES=Object.freeze({CITY_IDLE:'CITY_IDLE',BANK_APPROACHING:'BANK_APPROACHING',BANK_DOORS_OPENING:'BANK_DOORS_OPENING',FADING_TO_OFFICE:'FADING_TO_OFFICE',OFFICE_LOADING:'OFFICE_LOADING',OFFICE_IDLE:'OFFICE_IDLE',RETURNING_TO_CITY:'RETURNING_TO_CITY'});
const smooth=t=>t*t*(3-2*t);
export function interpolateCamera(a,b,t){
 const angle=Math.atan2(Math.sin(b.azimuth-a.azimuth),Math.cos(b.azimuth-a.azimuth));
 return {target:a.target.map((v,i)=>v+(b.target[i]-v)*t),zoom:a.zoom+(b.zoom-a.zoom)*t,elevation:a.elevation+(b.elevation-a.elevation)*t,azimuth:a.azimuth+angle*t};
}

/** A single timeline, advanced exclusively by the application's RAF. */
export class BankTransition{
 constructor(hooks){this.h=hooks;this.state=BANK_STATES.CITY_IDLE;this.fade=0;this.officeActive=false;this.disposed=false;this.setState(this.state);}
 get busy(){return this.state!==BANK_STATES.CITY_IDLE&&this.state!==BANK_STATES.OFFICE_IDLE;}
 setState(state){this.state=state;this.h.stateChanged(state);this.h.requestFrame();}
 tween(duration,apply){
  if(this.disposed)return Promise.reject(new Error('disposed'));
  if(this.h.reduced())duration=0;
  if(!duration){apply(1);return Promise.resolve();}
  return new Promise((resolve,reject)=>{this.step={duration,time:0,apply,resolve,reject};apply(0);this.h.requestFrame();});
 }
 update(dt){const s=this.step;if(!s)return;s.time=this.h.reduced()?s.duration:Math.min(s.duration,s.time+dt);s.apply(smooth(s.time/s.duration));if(s.time>=s.duration){this.step=null;s.resolve();}}
 fadeTo(value,duration){const start=this.fade;return this.tween(duration,t=>{this.fade=start+(value-start)*t;this.h.fade(this.fade);});}
 async enter(){
  if(this.disposed||this.state!==BANK_STATES.CITY_IDLE||!this.h.canEnter())return false;
  this.saved=this.h.capture();this.h.lock(true);this.h.message('Acercándonos al banco…');this.setState(BANK_STATES.BANK_APPROACHING);
  // Observe rejection immediately, even if the network fails during the approach.
  const prepared=this.h.prepareOffice().then(value=>({value}),error=>({error}));
  try{
   const end=this.h.approach();await this.tween(1.05,t=>this.h.camera(interpolateCamera(this.saved,end,t)));
   this.setState(BANK_STATES.BANK_DOORS_OPENING);await this.h.openDoors();
   this.setState(BANK_STATES.FADING_TO_OFFICE);await this.fadeTo(1,.32);
   this.setState(BANK_STATES.OFFICE_LOADING);this.h.message('Preparando el despacho de Nilo…');
   const result=await prepared;if(result.error)throw result.error;if(this.disposed)return false;
   this.h.showOffice(result.value);this.officeActive=true;await this.fadeTo(0,.40);
   this.h.message('');this.setState(BANK_STATES.OFFICE_IDLE);this.h.lock(false);this.h.welcome();return true;
  }catch(error){
   if(this.disposed)return false;
   this.officeActive=false;this.h.restore(this.saved);this.h.showCity();await this.fadeTo(0,.18);
   this.setState(BANK_STATES.CITY_IDLE);this.h.lock(false);this.h.message('No se ha podido preparar el despacho. Sigues en la ciudad; puedes volver a intentarlo.');this.h.focusCity();return false;
  }
 }
 async leave(){
  if(this.disposed||this.state!==BANK_STATES.OFFICE_IDLE)return false;
  try{
  this.h.lock(true);this.setState(BANK_STATES.RETURNING_TO_CITY);
  await this.fadeTo(1,.28);if(this.disposed)return false;
  this.officeActive=false;this.h.showCity();this.h.restore(this.saved);await this.fadeTo(0,.35);
  this.setState(BANK_STATES.CITY_IDLE);this.h.lock(false);this.h.focusCity();return true;
  }catch(error){if(this.disposed)return false;throw error;}
 }
 dispose(){this.disposed=true;if(this.step){this.step.reject(new Error('disposed'));this.step=null;}}
}
