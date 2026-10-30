import * as THREE from 'three';

export const QUALITY={high:{dpr:1.75,shadow:2048,leaves:24,foam:48,fps:60},medium:{dpr:1.25,shadow:1024,leaves:12,foam:24,fps:45},low:{dpr:1,shadow:0,leaves:5,foam:12,fps:30}};
const states={day:{sky:0xe9e4d3,hemi:2.3,key:3.2,fill:1.3,sun:0xffe8b8,lamp:.08,window:.4},sunset:{sky:0xd9b5a0,hemi:1.3,key:3.0,fill:.8,sun:0xffb66a,lamp:1.8,window:1.4},night:{sky:0x182d40,hemi:.8,key:.5,fill:.7,sun:0x96bcff,lamp:4,window:2.7}};
export class AmbientAnimationManager{
  constructor(scene,world,lights){
    this.scene=scene;this.world=world;this.lights=lights;this.time=0;this.motion=true;this.quality='medium';this.mode='day';this.uniforms={time:{value:0},motion:{value:1}};this.luminous=[];this.waterCount=0;this.windCount=0;this.transition=1;this.current={...states.day,sky:new THREE.Color(states.day.sky),sun:new THREE.Color(states.day.sun)};
    for(const material of world.materials){const name=material.name;const water=name.includes('Water'),wind=/City_Leaf|City_Petal/.test(name);if(water||wind)this.decorate(material,water,wind);if(/Glow|Emission|Window_Glass/.test(name))this.luminous.push({material,window:name.includes('Window')});}
    this.leafGeometry=new THREE.SphereGeometry(.16,5,3);this.leafGeometry.scale(1,.45,.12);this.leafMaterial=new THREE.MeshStandardMaterial({color:0x8a9d43,roughness:.9,transparent:true,depthWrite:false,side:THREE.DoubleSide});
    this.leaves=new THREE.InstancedMesh(this.leafGeometry,this.leafMaterial,24);this.leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.leaves.frustumCulled=false;scene.add(this.leaves);
    this.leafAlpha=new THREE.InstancedBufferAttribute(new Float32Array(24),1);this.leafGeometry.setAttribute('leafAlpha',this.leafAlpha);
    this.leafMaterial.onBeforeCompile=s=>{s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nattribute float leafAlpha; varying float vLeafAlpha;').replace('#include <begin_vertex>','#include <begin_vertex>\nvLeafAlpha=leafAlpha;');s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying float vLeafAlpha;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a *= vLeafAlpha;');};
    this.drops=new THREE.InstancedMesh(new THREE.SphereGeometry(.1,5,4),new THREE.MeshStandardMaterial({color:0xd8f4e1,roughness:.25,transparent:true,opacity:.72}),96);this.drops.frustumCulled=false;scene.add(this.drops);this.dummy=new THREE.Object3D();
    this.ripples=new THREE.InstancedMesh(new THREE.RingGeometry(.36,.40,24),new THREE.MeshBasicMaterial({color:0xc9eee7,transparent:true,opacity:.38,depthWrite:false,side:THREE.DoubleSide}),8);this.ripples.frustumCulled=false;scene.add(this.ripples);
    this.glows=new THREE.InstancedMesh(new THREE.CircleGeometry(.8,20),new THREE.MeshBasicMaterial({color:0xffbc58,transparent:true,opacity:.12,depthWrite:false} ),world.lamps.length);scene.add(this.glows);world.lamps.forEach((p,i)=>{this.dummy.position.set(p.position[0],p.position[1],p.position[2]+.03);this.dummy.rotation.set(0,0,0);this.dummy.scale.setScalar(1.5);this.dummy.updateMatrix();this.glows.setMatrixAt(i,this.dummy.matrix);});
    this.setQuality('medium');this.setLighting('day',true);
  }
  decorate(material,water,wind){
    if(water){this.waterCount++;material.transparent=true;material.opacity=.9;material.roughness=.28;material.metalness=.12;material.side=THREE.DoubleSide;}if(wind)this.windCount++;
    const u=this.uniforms,cascade=material.name.includes('Cascade');
    material.onBeforeCompile=shader=>{
      shader.uniforms.cityTime=u.time;shader.uniforms.cityMotion=u.motion;
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float cityTime; uniform float cityMotion; varying vec3 vCityPosition;');
      if(wind)shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
        float cityPhase=0.0;
        #ifdef USE_INSTANCING
        cityPhase=instanceMatrix[3].x*.7+instanceMatrix[3].y*.31;
        #endif
        float cityWeight=clamp(position.z*.17,0.0,1.0);
        transformed.x += sin(cityTime*.72+cityPhase+position.z*.25)*.10*cityWeight*cityMotion;
        transformed.y += cos(cityTime*.53+cityPhase)*.065*cityWeight*cityMotion;`);
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vec4 cityWorld=vec4(transformed,1.0);
        #ifdef USE_INSTANCING
        cityWorld=instanceMatrix*cityWorld;
        #endif
        vCityPosition=(modelMatrix*cityWorld).xyz;
        #include <project_vertex>`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float cityTime; varying vec3 vCityPosition;');
      if(water)shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float wave=sin(vCityPosition.x*.8+vCityPosition.y*1.7-cityTime*.8+sin(vCityPosition.y*.6))*sin(vCityPosition.y*2.3+cityTime*.5);
        float shimmer=pow(max(0.0,wave),22.0);
        diffuseColor.rgb*=.96+wave*.035;
        diffuseColor.rgb+=vec3(.06,.10,.09)*shimmer;
        ${cascade?`float flow=sin(vCityPosition.z*5.0+cityTime*2.4+sin(vCityPosition.x*13.0));
        float streak=pow(max(0.0,sin(vCityPosition.x*17.0+sin(vCityPosition.z*.8+cityTime*.4))),6.0);
        diffuseColor.rgb+=vec3(.09,.15,.17)*streak*(.65+.35*flow);`:''}`);
    };
    material.customProgramCacheKey=()=>`cozy-city-${water}-${wind}-${cascade}`;material.needsUpdate=true;
  }
  setQuality(quality){this.quality=quality;this.leaves.count=QUALITY[quality].leaves;this.drops.count=QUALITY[quality].foam+24;}
  setMotion(enabled){this.motion=enabled;this.uniforms.motion.value=enabled?1:0;this.leaves.visible=enabled;}
  setLighting(mode,immediate=false){this.mode=mode;this.from={...this.current,sky:this.current.sky.clone(),sun:this.current.sun.clone()};this.to=states[mode];this.transition=immediate?1:0;if(immediate)this.applyLighting(1);}
  applyLighting(a){for(const key of ['hemi','key','fill','lamp','window'])this.current[key]=THREE.MathUtils.lerp(this.from[key],this.to[key],a);this.current.sky.lerpColors(this.from.sky,new THREE.Color(this.to.sky),a);this.current.sun.lerpColors(this.from.sun,new THREE.Color(this.to.sun),a);const c=this.current;this.scene.background=c.sky;this.lights.hemi.intensity=c.hemi;this.lights.key.intensity=c.key;this.lights.fill.intensity=c.fill;this.lights.key.color.copy(c.sun);for(const entry of this.luminous)entry.material.emissiveIntensity=entry.window?c.window:c.lamp;this.glows.material.opacity=c.lamp*.055;document.documentElement.dataset.light=this.mode;}
  update(dt){
    if(this.transition<1){this.transition=Math.min(1,this.transition+dt/1.6);this.applyLighting(this.transition*this.transition*(3-2*this.transition));}
    if(this.motion){this.time+=dt;this.uniforms.time.value=this.time;}
    const t=this.time,d=this.dummy;let active=0;
    for(let i=0;i<this.leaves.count;i++){const tree=this.world.trees[(i*7)%this.world.trees.length];const life=(t+i*2.93)%23,fall=life/7;const visible=life<7;this.leafAlpha.setX(i,visible?Math.min(1,life)*Math.max(0,1-fall):0);if(visible)active++;
      d.position.set(tree.position[0]+sin(t*.7+i)*.9+fall,tree.position[1]+cos(t*.5+i)*.65,tree.position[2]+(1-fall)*5*tree.scale);d.rotation.set(t*.8+i,t*.3,i);d.scale.setScalar(visible?1:0);d.updateMatrix();this.leaves.setMatrixAt(i,d.matrix);}
    this.leaves.instanceMatrix.needsUpdate=true;this.leafAlpha.needsUpdate=true;this.activeLeaves=active;
    // Fountain droplets describe small ballistic arcs, with separate cascade foam.
    for(let i=0;i<this.drops.count;i++){
      if(i<24){const a=(i%4)*Math.PI/2,p=(t*.72+Math.floor(i/4)/6)%1,r=(.94+.30*p)*1.15;d.position.set(1+cos(a)*r,-4+sin(a)*r,1.92+(1.99-1.36*p*p)*1.15);d.scale.set(.45,.45,1.5);}
      else{const j=i-24,p=(t*.38+j*.137)%1,upper=j%2===0,x=upper?-9.8:-9.88,y=upper?8.5:-28;d.position.set(x+sin(j*8)*1.25,y-p*.6,(upper?5.3:1.84)-p*(upper?3.5:6.7));d.scale.set(.5,.5,3.0);}
      d.rotation.set(0,0,0);d.updateMatrix();this.drops.setMatrixAt(i,d.matrix);
    }this.drops.instanceMatrix.needsUpdate=true;
    for(let i=0;i<8;i++){const p=(t*.45+i*.21)%1,a=i*Math.PI/2;if(i<4){d.position.set(1+cos(a)*1.24*1.15,-4+sin(a)*1.24*1.15,2.655);d.scale.setScalar(.35+p*.9);}else{const upper=i<6;d.position.set(upper?-9.8:-9.88,upper?7.5:-29.1,upper?1.90:-4.74);d.scale.set(1+p*2,.6+p,1);}d.rotation.set(0,0,0);d.updateMatrix();this.ripples.setMatrixAt(i,d.matrix);}this.ripples.instanceMatrix.needsUpdate=true;
  }
  snapshot(){return {time:this.time,motion:this.motion,quality:this.quality,lighting:this.mode,transition:this.transition,windMaterials:this.windCount,waterMaterials:this.waterCount,activeLeaves:this.activeLeaves,particleLimit:this.leaves.count};}
  dispose(){for(const o of [this.leaves,this.drops,this.glows,this.ripples]){this.scene.remove(o);o.geometry.dispose();o.material.dispose();}}
}
const sin=Math.sin,cos=Math.cos;
