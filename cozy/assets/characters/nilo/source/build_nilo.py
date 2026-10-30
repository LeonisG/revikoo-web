"""Nilo: independent porcelain creature, articulated hierarchy and four NLA clips."""
import bpy,sys,os,math,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from cozy_geometry import *
OUT=Path(__file__).resolve().parent.parent
S=bpy.data.scenes.new('NILO_CHARACTER');bpy.context.window.scene=S;S.render.fps=24;S.frame_start=0;S.frame_end=120
ivory=material('Nilo_Porcelain_Ivory',(.88,.75,.53),.28)
rose=material('Nilo_Cheek_Rose',(.84,.46,.30),.54)
eye=material('Nilo_Eye_Dark',(.032,.016,.009),.2)
vest=material('Nilo_Vest_Sage',(.055,.145,.095),.78)
gold=material('Nilo_Brass_Gold',(.63,.36,.085),.32,.68)
leather=material('Nilo_Leather_Brown',(.19,.065,.023),.6)
shirt=material('Nilo_Shirt_Cream',(.97,.88,.68),.66)
body=empty('Nilo_Body',(0,0,0));head=empty('Nilo_Upper',(0,0,1.18),body)
armL=empty('Nilo_Arm_L',(-.5,0,.77),body);armR=empty('Nilo_Arm_R',(.5,0,.77),body)
handL=empty('Nilo_Hand_L',(-.68,-.34,.75),armL);handR=empty('Nilo_Hand_R',(.68,-.34,.75),armR)
def own(parent,fn,*args,**kwargs):o=fn(*args,**kwargs);bind(o,parent);return o
own(body,ellipsoid,'PorcelainBody',(0,0,.64),(.56,.43,.63),ivory)
# Fitted shell: follows the porcelain torso, with a clean hem and no intersecting bands.
v=[]
for row in range(15):
    z=.18+row*.87/14;radius=math.sqrt(max(0,1-((z-.64)/.63)**2))
    for i in range(32):a=i*2*pi/32;v.append(((.56*radius+.016)*cos(a),(.43*radius+.016)*sin(a),z))
f=[tuple(reversed(range(32))),tuple(range(448,480))]+[(r*32+i,r*32+(i+1)%32,(r+1)*32+(i+1)%32,(r+1)*32+i) for r in range(14) for i in range(32)]
own(body,mesh,'TailoredVest',v,f,vest,True)
own(head,ellipsoid,'PorcelainUpper',(0,-.015,1.22),(.63,.49,.65),ivory,n=40,rings=24)
for x in [-.26,.26]:own(body,ellipsoid,'PorcelainFoot',(x,-.22,.12),(.21,.29,.14),ivory,n=24,rings=14)
# Sculpted lapels and collar follow the rounded torso, rather than a human jacket.
for side in [-1,1]:
    o=mesh('CreamCollar',[(side*.03,-.473,.93),(side*.40,-.38,.98),(side*.29,-.47,.77)],[(0,1,2)],shirt);sol=o.modifiers.new('CollarThickness','SOLIDIFY');sol.thickness=.045;bind(o,body)
    own(body,tube,'VestRolledLapel',[(side*.46,-.25,.91),(side*.37,-.42,.82),(side*.17,-.47,.62),(0,-.47,.52)],.043,vest,12)
own(body,ellipsoid,'TieKnot',(0,-.49,.82),(.075,.05,.08),vest,n=16,rings=10)
own(body,ellipsoid,'Tie',(0,-.46,.68),(.065,.045,.15),vest,n=16,rings=10)
for z in [.35,.49,.61]:own(body,ellipsoid,'BrassButton',(0,-.453,z),(.034,.026,.034),gold,n=16,rings=10)
before=set(S.objects);coin('VestBadge',(.31,-.405,.54),.115,gold)
for o in set(S.objects)-before:bind(o,body)
# Eyes have independent scale controls for true geometry blinks.
eyes=[]
for x in [-.25,.25]:
    b=empty('Nilo_Blink_L' if x<0 else 'Nilo_Blink_R',(x,-.459,1.30),head);eyes.append(b)
    own(b,ellipsoid,'ObsidianEye',(x,-.469,1.30),(.082,.045,.126),eye,n=24,rings=16)
    own(b,ellipsoid,'EyeCatchlight',(x-.024,-.511,1.35),(.018,.012,.024),shirt,n=12,rings=8)
    own(head,ellipsoid,'SoftCheek',(x*1.55,-.409,1.11),(.097,.022,.078),rose,n=24,rings=14)
own(head,ellipsoid,'PorcelainNose',(0,-.511,1.18),(.071,.055,.042),ivory,n=24,rings=14)
smile=empty('Nilo_Smile',(0,-.50,1.055),head)
own(smile,tube,'KindSmile',[(-.073,-.486,1.068),(-.045,-.499,1.045),(0,-.503,1.038),(.045,-.499,1.045),(.073,-.486,1.068)],.011,leather,8)
own(head,ring,'Monocle',(-.25,-.535,1.30),.191,.022,gold)
own(head,rod,'MonocleArm',(-.45,-.525,1.32),(-.59,-.18,1.32),.018,gold)
own(head,tube,'MonocleChain',[(-.43,-.52,1.22),(-.51,-.46,1.03),(-.49,-.43,.88)],.009,gold,8)
before=set(S.objects);coin('CrownMedallion',(0,.015,2.025),.205,gold)
for o in set(S.objects)-before:bind(o,head)
own(head,ellipsoid,'MedallionMount',(0,0,1.845),(.07,.065,.06),gold,n=16,rings=10)
for side,arm,hand in [(-1,armL,handL),(1,armR,handR)]:
    own(arm,ellipsoid,'RoundedSleeve',(side*.56,-.10,.71),(.19,.22,.24),vest,n=24,rings=14)
    own(hand,ellipsoid,'PorcelainHand',(side*.68,-.34,.75),(.19,.18,.17),ivory,n=28,rings=16)
    own(hand,ellipsoid,'SimplifiedThumb',(side*.55,-.44,.78),(.083,.095,.085),ivory,n=20,rings=12)
pen=empty('Nilo_Pen',(-.63,-.49,.76),handL)
own(pen,rod,'PenBarrel',(-.76,-.39,.98),(-.56,-.62,.62),.027,gold,16)
own(pen,rod,'PenGrip',(-.66,-.50,.80),(-.60,-.57,.69),.031,vest,16)
own(pen,tube,'PenNib',[(-.56,-.62,.62),(-.53,-.66,.57)],[.027,.002],gold,12)
stamp=empty('Nilo_Stamp',(.68,-.35,.73),handR)
own(stamp,box,'StampBase',(.68,-.35,.60),(.21,.18,.06),gold,.025)
own(stamp,ellipsoid,'StampHandle',(.68,-.35,.77),(.065,.065,.15),leather,n=20,rings=14)
forearms=[]
for side,arm in [(-1,armL),(1,armR)]:
    forearm=empty('Nilo_Forearm_L' if side<0 else 'Nilo_Forearm_R',(side*.5,0,.77),arm)
    own(forearm,ellipsoid,'PorcelainForearm',(side*.5,0,.77),(1,1,1),ivory,n=20,rings=12)
    forearms.append(forearm)
merge_static(S)
# Non-destructive visible-part rig. Every clip keys the same controller set.
controls=[body,head,armL,armR,handL,handR,*eyes,smile,*forearms]
rest={o:(o.location.copy(),o.rotation_euler.copy(),o.scale.copy()) for o in controls}
def pose(clip,t,duration):
    for o,(p,r,s) in rest.items():o.location=p;o.rotation_euler=r;o.scale=s
    phase=t/duration;wave=sin(phase*pi)**2
    if clip=='NILO_IDLE':
        body.location.z+=.009*sin(phase*2*pi);head.rotation_euler.z=.018*sin(phase*2*pi);handL.rotation_euler.x=.025*sin(phase*2*pi)
        blink=max(0,1-abs(t-1.65)/.13)+max(0,1-abs(t-4.25)/.13)
        for o in eyes:o.scale.z=max(.07,1-.93*min(1,blink))
    elif clip=='NILO_GREET':
        armL.rotation_euler.y+=.65*wave;handL.location.x-=.30*wave;handL.location.z+=.20*wave;handL.rotation_euler.y+=.18*sin(phase*6*pi)*wave;head.rotation_euler.y=-.07*wave;body.rotation_euler.x=.04*wave;smile.scale.x=1+.16*wave
    elif clip=='NILO_WRITE':
        head.rotation_euler.x=.11*wave;armL.rotation_euler.z=.08*sin(phase*10*pi)*wave;handL.location.y-=.12*wave;handL.location.z-=.06*wave
    elif clip=='NILO_STAMP':
        lift=sin(min(phase/.45,1)*pi/2)*.23 if phase<.45 else .23*(1-min((phase-.45)/.14,1))
        if phase>.65:lift=0
        press=max(0,1-abs(phase-.62)/.14)*.08
        handR.location.z+=lift-press;handR.location.y-=.12*wave;head.rotation_euler.x=.07*wave;body.location.z-=.018*wave
    # Short porcelain forearms follow each hand, so greetings never detach a hand.
    for side,hand,forearm in [(-1,handL,forearms[0]),(1,handR,forearms[1])]:
        elbow=Vector((side*.06,-.16,-.06));end=hand.location;direction=end-elbow
        forearm.location=(elbow+end)/2;forearm.rotation_euler=direction.to_track_quat('Z','Y').to_euler();forearm.scale=(.105,.105,direction.length/2+.055)
durations={'NILO_IDLE':5,'NILO_GREET':1.5,'NILO_WRITE':3,'NILO_STAMP':2}
for clip,duration in durations.items():
    for o in controls:o.animation_data_create();o.animation_data.action=None
    for frame in range(int(duration*24)+1):
        pose(clip,frame/24,duration)
        for o in controls:
            for prop in ['location','rotation_euler','scale']:o.keyframe_insert(data_path=prop,frame=frame)
    for o in controls:
        action=o.animation_data.action;action.name=clip+'__'+o.name
        track=o.animation_data.nla_tracks.new();track.name=clip;strip=track.strips.new(clip,0,action);strip.action_slot=action.slots[0];track.mute=True;o.animation_data.action=None
pose('NILO_IDLE',0,5);S.frame_set(0)
bpy.ops.object.select_all(action='DESELECT')
for o in S.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'nilo.glb'),export_format='GLB',use_active_scene=True,use_selection=True,export_extras=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False)
cam=setup_render(S,(0,-4,1.2),(0,0,1.12),2.65)
area('NiloKey',(-3,-4,5),(0,0,1),450,4,(1,.88,.70));area('NiloFill',(3,-1,3),(0,0,1),220,3,(.75,.87,1));area('NiloRim',(0,2,4),(0,0,1),400,3,(1,.83,.55))
save_scene(S,OUT/'source/nilo_master.blend')
json.dump({'up':'Z','origin':'ground between feet','height':2.24,'seatOffset':[0,1.04,1.01],'clips':durations,'rig':'Named transform hierarchy; separate body, upper body, arms, hands and blink controls'},open(OUT/'character.json','w'),indent=2)
bpy.app.driver_namespace['nilo_authoring']=globals()
if __name__=='__main__':render(S,OUT/'previews/front.png')
