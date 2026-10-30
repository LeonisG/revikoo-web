"""Independent bank office. Z up, Nilo anchor [0,1.04,1.01], visitor looking +Y."""
import bpy,sys,math,random,json
from pathlib import Path
OUT=Path(__file__).resolve().parent.parent
COZY=OUT.parents[2]
sys.path.insert(0,str(COZY/'assets/characters/nilo/source'))
from cozy_geometry import *
S=bpy.data.scenes.new('BANK_OFFICE');bpy.context.window.scene=S
rng=random.Random(84)
cream=material('Office_Limestone',(.69,.57,.39),.82);trim=material('Office_Ivory',(.85,.74,.54),.7)
wood=material('Office_Walnut',(.20,.075,.027),.52);woodlight=material('Office_Walnut_Edge',(.30,.135,.052),.48)
wooddark=material('Office_Walnut_Shadow',(.09,.027,.012),.7)
green=material('Office_Leather_Green',(.045,.115,.073),.67);sage=material('Office_Sage',(.18,.27,.12),.85)
gold=material('Office_Brass',(.57,.31,.065),.35,.65);iron=material('Office_Vault_Metal',(.12,.145,.115),.53,.55)
paper=material('Office_Paper',(.89,.79,.57),.9);ink=material('Office_Ink',(.24,.31,.18),.88)
glow=material('Office_Lamp_Glow',(1,.71,.31),.5,0,1.7);glass=material('Office_Daylight',(.49,.70,.78),.38,0,.42)
leaves=[material('Office_Leaf_'+str(i),c) for i,c in enumerate([(.09,.21,.055),(.20,.32,.09),(.31,.40,.13)])]
bookmats=[green,woodlight,sage,paper]
# Flooring, ceiling and four walls give the room actual volume.
box('FloorBase',(0,-.4,-.10),(7.8,8.6,.2),wooddark)
for row in range(20):
    y=-4.45+row*.42
    for col in range(4):box('WalnutFloorboard',(-2.88+col*1.92,y,.012),(1.90,.405,.06),woodlight if (col+row)%4==0 else wood,.014)
box('RearWall',(0,3.7,2.35),(7.8,.3,4.7),cream,.03)
box('RightWall',(3.85,-.4,2.35),(.3,8.5,4.7),cream,.03)
box('FrontWall',(0,-4.65,2.35),(7.8,.2,4.7),cream,.03)
box('Ceiling',(0,-.4,4.73),(7.8,8.5,.15),trim,.02)
# True side-window opening, with a curved inner frame and external daylight pane.
for y,depth in [(-2.65,3.8),(3.05,1.3)]:box('LeftWallSide',(-3.85,y,2.35),(.3,depth,4.7),cream,.03)
box('WindowWallLower',(-3.85,.75,.55),(.3,2.7,1.1),cream,.03)
box('WindowWallUpper',(-3.85,.75,4.25),(.3,2.7,1),cream,.03)
win=empty('ArchedWindow',(-3.69,.75,0));win.rotation_euler.z=pi/2
def window_part(o):
    # Geometry authored in window-local XZ, rotate into left wall.
    bpy.context.view_layer.update();o.parent=win;return o
window_part(box('WindowGlass',(0,.04,2.35),(2.45,.055,2.5),glass,.02))
for x in [-1.3,1.3]:window_part(box('WindowStonePier',(x,0,2.0),(.20,.32,1.9),trim))
pts=[(1.3*cos(i*pi/32),0,2.9+1.0*sin(i*pi/32)) for i in range(33)]
window_part(tube('WindowArch',pts,.115,trim,12))
for x in [-.68,0,.68]:window_part(rod('WindowMullion',(x,-.08,1.1),(x,-.08,3.5),.04,woodlight,12))
window_part(rod('WindowCrossbar',(-1.2,-.08,2.45),(1.2,-.08,2.45),.05,woodlight))
window_part(box('WindowSill',(0,-.03,1.07),(2.9,.68,.15),trim))
# Large, readable masonry courses and soft mouldings.
for z in [.22,1.05,4.33]:
    box('BackMoulding',(0,3.49,z),(7.7,.21,.14),trim)
    box('SideMoulding',(3.64,-.45,z),(.21,8.1,.14),trim)
for row in range(5):
    z=1.42+row*.58
    for i in range(8):
        x=-3.4+i*.96+(.46 if row%2 else 0)
        if x<3.75:box('StoneFacing',(x,3.50,z),(.92,.095,.55),trim if (row+i)%7==0 else cream,.018)
for x in [-3.35,1.62,3.39]:
    box('Pilaster',(x,3.34,2.2),(.26,.30,4.1),trim)
    for z in [.22,3.85,4.1]:box('PilasterCap',(x,3.3,z),(.42,.42,.15),trim)
box('Carpet',(0,-1.1,.065),(4.7,4.2,.055),green,.10)
for x in [-2.21,2.21]:box('CarpetBorder',(x,-1.1,.098),(.035,3.9,.006),gold,.002)
for y in [-3.04,.84]:box('CarpetBorder',(0,y,.098),(4.45,.035,.006),gold,.002)
# Compact desk: drawer pedestals leave room for Nilo's body and legs.
desk=empty('Desk',(0,0,0))
for x in [-1.33,1.33]:
    box('DeskPedestal',(x,.05,.65),(.76,1.25,1.18),wood)
    box('DeskFoot',(x,.05,.10),(.84,1.34,.12),woodlight)
    for z in [.38,.72,1.05]:
        box('DrawerFront',(x,-.61,z),(.65,.09,.27),woodlight)
        rod('DrawerHandle',(x-.12,-.68,z),(x+.12,-.68,z),.025,gold)
box('DeskModestyPanel',(0,.45,.73),(2.1,.1,.91),wood)
box('DeskLowerEdge',(0,0,1.29),(3.8,1.63,.12),wooddark)
box('DeskTop',(0,0,1.40),(3.96,1.78,.18),woodlight,.065)
box('DeskInlay',(0,-.06,1.497),(2.35,1.24,.024),green,.08)
for x in [-1.07,1.07]:box('DeskMatGoldLine',(x,-.07,1.512),(.012,1.02,.008),gold,.002)
for y in [-.57,.44]:box('DeskMatGoldLine',(0,y,1.512),(2.14,.012,.008),gold,.002)
# Bookshelf at back, with independently readable books rather than texture cards.
box('BookcaseBack',(-.62,3.14,2.22),(3.05,.14,3.80),wooddark)
for x in [-2.18,.94]:box('BookcaseUpright',(x,2.98,2.2),(.14,.48,3.9),wood)
for z in [.32,1.12,1.88,2.62,3.40,4.14]:box('Shelf',(-.62,2.95,z),(3.3,.62,.13),woodlight)
for row,z in enumerate([1.19,1.95,2.69,3.47]):
    for i in range(12):
        x=-2.02+i*.237;h=.40+rng.random()*.23
        box('Book', (x,2.91,z+h/2),(.17,.31,h),bookmats[(i+row)%4],.018)
        for zz in [z+.08,z+h-.07]:box('BookGiltBand',(x,2.744,zz),(.15,.012,.014),gold,.002)
for x in [-1.38,.15]:
    box('CabinetDoor',(x,2.63,.73),(1.40,.10,.66),wood)
    box('CabinetInset',(x,2.56,.73),(1.20,.06,.48),woodlight)
    ellipsoid('CabinetKnob',(x+.42,2.51,.73),(.045,.04,.045),gold,n=16,rings=10)
# Vault door remains a separate parent for future interaction.
vault=empty('VaultDoor',(2.48,3.29,1.82))
before=set(S.objects)
box('VaultRecess',(2.48,3.36,1.82),(1.50,.24,2.94),wooddark,.15)
box('VaultPanel',(2.48,3.19,1.82),(1.33,.23,2.70),iron,.16)
for x in [1.86,3.10]:box('VaultBrassEdge',(x,3.055,1.82),(.045,.04,2.32),gold,.015)
for z in [.61,3.03]:box('VaultBrassEdge',(2.48,3.055,z),(1.22,.04,.045),gold,.015)
for z in [.8,1.3,1.8,2.3,2.8]:
    for x in [1.98,2.98]:ellipsoid('VaultRivet',(x,3.035,z),(.035,.025,.035),gold,n=12,rings=8)
ring('VaultWheel',(2.48,2.97,1.83),.32,.04,gold)
for a in [0,pi/2,pi,3*pi/2]:rod('VaultSpoke',(2.48,2.96,1.83),(2.48+.30*cos(a),2.96,1.83+.30*sin(a)),.025,gold)
for o in set(S.objects)-before:bind(o,vault)
# The green banner carries the same botanical language as the exterior.
box('Banner',(-2.83,3.38,2.8),(.67,.05,1.74),green,.035)
rod('BannerRail',(-3.25,3.29,3.75),(-2.40,3.29,3.75),.035,gold)
sprout('BannerEmblem',(-2.83,3.32,2.85),.5,gold)
# Nilo's own chair is separate from the character.
chair=empty('NiloChair',(0,1.19,0));before=set(S.objects)
box('ChairSeat',(0,1.17,.90),(1.45,1.1,.23),green,.10)
box('ChairBackWood',(0,1.64,1.53),(1.50,.16,1.65),woodlight,.12)
box('ChairBackCushion',(0,1.52,1.53),(1.30,.19,1.43),green,.13)
for x in [-.57,.57]:
    for y in [.80,1.55]:rod('ChairLeg',(x,y,.06),(x,y,.88),.075,wood,16)
    rod('ChairArmSupport',(x,.86,.84),(x,.86,1.20),.05,wood)
    box('ChairArm',(x,1.12,1.22),(.17,.74,.11),green,.05)
for x in [-.57,.57]:
    for z in [1.14,1.47,1.80,2.10]:ellipsoid('ChairStud',(x,1.41,z),(.026,.02,.026),gold,n=12,rings=8)
for o in set(S.objects)-before:bind(o,chair)
# Banker's lamp, curved shade and independent tabletop objects.
lamp=empty('DeskLamp',(-1.42,-.02,1.49));before=set(S.objects)
ellipsoid('LampBase',(-1.42,-.02,1.54),(.29,.23,.06),gold,n=32,rings=12)
rod('LampStem',(-1.42,.03,1.55),(-1.42,.03,2.16),.035,gold)
rod('LampArm',(-1.42,.03,2.16),(-1.42,-.15,2.16),.035,gold)
ellipsoid('GreenLampShade',(-1.42,-.16,2.19),(.39,.23,.17),green,n=32,rings=16)
ellipsoid('LampWarmUnderside',(-1.42,-.16,2.075),(.31,.17,.028),glow,n=24,rings=12)
for o in set(S.objects)-before:bind(o,lamp)
ledger=empty('Ledger',(-.2,.20,1.52));before=set(S.objects)
box('LedgerBinding',(-.20,.21,1.53),(1.10,.62,.06),wood)
for i in range(3):box('LedgerPages',(-.20,.20,1.57+i*.012),(1.04,.58,.012),paper,.012)
for x in [-.45,.05]:
    for i in range(5):box('LedgerLine',(x,.02+i*.075,1.61),(.36,.008,.003),ink,.001)
for o in set(S.objects)-before:bind(o,ledger)
box('StampDocument',(.68,.60,1.51),(.40,.40,.015),paper,.015)
tray=empty('DocumentTray',(1.31,.12,1.50));before=set(S.objects)
box('TrayBase',(1.31,.12,1.53),(.76,.62,.05),green)
for x in [.95,1.67]:box('TrayRim',(x,.12,1.61),(.035,.62,.14),gold,.01)
for i in range(5):box('Documents',(1.31,.13,1.58+i*.018),(.65,.49,.012),paper,.012)
for o in set(S.objects)-before:bind(o,tray)
for i in range(7):
    x=.9+(i%3)*.18;y=-.50+(i//3)*.14
    rod('DeskCoin',(x,y,1.52),(x,y,1.54+.015*(i%2)),.075,gold,24)
def plant(x,y,z,scale=1):
    ellipsoid('Planter',(x,y,z+.17*scale),(.23*scale,.23*scale,.20*scale),trim,n=24,rings=12)
    for i in range(12):
        a=i*2.399;r=(.10+(i%3)*.08)*scale;zz=z+(.36+(i%4)*.09)*scale
        o=leaf('PlantLeaf',(x+r*cos(a),y+r*sin(a),zz),.13*scale,.22*scale,leaves[i%3],angle=sin(a)*.8)
        o.rotation_euler.z=a
plant(-2.38,2.7,1.18,.9);plant(.88,2.86,3.52,.8);plant(-3.45,.65,1.17,1.15);plant(1.49,.55,1.50,.65)
# Wall lamps are simple emissive geometry; one shared fill light suffices on web.
for x in [-3.06,1.38]:
    rod('WallLampArm',(x,3.34,2.48),(x,3.0,2.48),.04,gold)
    ellipsoid('WallLampGlass',(x,2.95,2.80),(.17,.17,.29),glow,n=24,rings=16)
    for z in [2.52,3.07]:ellipsoid('WallLampCap',(x,2.95,z),(.18,.18,.05),gold,n=24,rings=10)
# Visitor seat edges are low enough to frame, never obscure, the POV.
for x in [-.82,.82]:box('VisitorChairArm',(x,-2.48,.85),(.18,1.2,.16),green,.08)
merge_static(S)
bpy.ops.object.select_all(action='DESELECT')
for o in S.objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'bank-office.glb'),export_format='GLB',use_active_scene=True,use_selection=True,export_extras=True,export_animations=False)
cam=setup_render(S,(0,-3.25,2.40),(0,1.04,2.12),res=(1440,1000));cam.data.lens=36/(2*math.tan(math.radians(46)/2)*(1440/1000))
area('WindowLight',(-3.1,.2,3.2),(0,.8,1.5),550,3,(.87,.94,1));area('OfficeKey',(-2,-2,4.0),(0,1,1.8),450,3,(1,.86,.65));area('OfficeFill',(2,-1,3.1),(0,1,1.8),220,3,(1,.93,.80))
save_scene(S,OUT/'source/bank_office_master.blend')
json.dump({'up':'Z','niloPosition':[0,1.04,1.01],'camera':{'desktop':{'position':[0,-3.25,2.40],'target':[0,1.04,2.12],'fov':46},'portrait':{'position':[0,-4.10,2.48],'target':[0,1.04,2.15],'fov':48}},'independentNodes':['NiloChair','VaultDoor','DeskLamp','Ledger','DocumentTray']},open(OUT/'office.json','w'),indent=2)
if __name__=='__main__':render(S,OUT/'previews/office_empty.png')
