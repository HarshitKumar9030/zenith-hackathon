"""Deterministic EcoMitra collection city. Execute with Blender --background --python."""
import bpy, math, os, json, random
from mathutils import Vector
from collections import defaultdict
R=random.Random(2741)
OUT=os.path.dirname(os.path.abspath(__file__))
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.render.engine='CYCLES'; scene.cycles.samples=16; scene.cycles.use_denoising=True
scene.render.resolution_x=2000;scene.render.resolution_y=1700;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.world.color=(.65,.72,.79)
scene.view_settings.view_transform='AgX'
col=bpy.data.collections.new('CITY_EXPORT');scene.collection.children.link(col)
rig=bpy.data.collections.new('PREVIEW_ONLY');scene.collection.children.link(rig)
collision=bpy.data.collections.new('COLLISION_PROXIES');scene.collection.children.link(collision);collision.hide_render=True
mats={}
def mat(n,c):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*c,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.82;mats[n]=m;return m
for n,c in {'grass':(.35,.55,.36),'park':(.48,.66,.40),'ground':(.61,.70,.48),'asphalt':(.17,.24,.26),'paving':(.78,.79,.68),'ivory':(.92,.89,.75),'green':(.12,.34,.26),'mint':(.46,.70,.57),'lilac':(.57,.49,.73),'blue':(.28,.52,.68),'sand':(.80,.65,.43),'coral':(.80,.40,.30),'roof':(.26,.35,.36),'window':(.26,.46,.49),'water':(.24,.59,.65),'trunk':(.39,.29,.20),'leaf':(.22,.43,.25),'leafLight':(.48,.63,.26),'line':(.93,.86,.58),'metal':(.48,.55,.57),'organic':(.56,.72,.25),'plastic':(.28,.60,.89),'paper':(.89,.71,.37),'glass':(.22,.72,.58),'ewaste':(.65,.44,.79)}.items():mat(n,c)
active='infrastructure'; groups={};colliders=[];pickups=[]
def empty(n,loc=(0,0,0)):
 o=bpy.data.objects.new(n,None);col.objects.link(o);o.location=loc;return o
world=empty('EcoMitra_City_800m')
def group(n):
 global active
 active=n
 if n not in groups:groups[n]=empty(n);groups[n].parent=world
 return groups[n]
group(active)
def link(o,n,m,collection=col):
 o.name=n
 for c in list(o.users_collection):c.objects.unlink(o)
 collection.objects.link(o)
 if collection==col:o.parent=groups[active]
 if m:o.data.materials.append(mats[m])
 return o
mesh_cache={}
def mesh_object(n,p,s,m,key,vertices,faces):
 cache_key=(key,m)
 if cache_key not in mesh_cache:
  mesh=bpy.data.meshes.new(key+'_'+m);mesh.from_pydata(vertices,[],faces);mesh.materials.append(mats[m]);mesh_cache[cache_key]=mesh
 o=bpy.data.objects.new(n,mesh_cache[cache_key]);col.objects.link(o);o.location=p;o.scale=s;o.parent=groups[active];return o
def box(n,p,s,m,solid=False):
 vertices=[(-.5,-.5,-.5),(.5,-.5,-.5),(.5,.5,-.5),(-.5,.5,-.5),(-.5,-.5,.5),(.5,-.5,.5),(.5,.5,.5),(-.5,.5,.5)]
 faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]
 o=mesh_object(n,p,s,m,'box',vertices,faces)
 if solid:colliders.append({'name':o.name,'center':list(p),'size':list(s),'district':active})
 return o
def round_object(n,p,r,d,m,verts,top):
 vertices=[(math.cos(i*2*math.pi/verts)*rad,math.sin(i*2*math.pi/verts)*rad,z) for z,rad in ((-.5,1),(.5,top)) for i in range(verts)]
 faces=[tuple(reversed(range(verts))),tuple(range(verts,2*verts))]+[(i,(i+1)%verts,(i+1)%verts+verts,i+verts) for i in range(verts)]
 return mesh_object(n,p,(r,r,d),m,f'round_{verts}_{top}',vertices,faces)
def cylinder(n,p,r,d,m,verts=10):return round_object(n,p,r,d,m,verts,1)
def cone(n,p,r,d,m):return round_object(n,p,r,d,m,7,.6)
def label(n,text,p,size=5,m='ivory',rotation=(0,0,0)):
 c=bpy.data.curves.new(n,'FONT');c.body=text;c.align_x='CENTER';c.size=size;c.extrude=.005;c.resolution_u=2
 o=bpy.data.objects.new(n,c);col.objects.link(o);o.location=p;o.rotation_euler=rotation;o.parent=groups[active];c.materials.append(mats[m]);return o
def tree(x,y,size=1):
 cylinder('Tree trunk',(x,y,2*size),.55*size,4*size,'trunk',7)
 cone('Tree canopy',(x,y,5*size),3.3*size,6*size,R.choice(['leaf','leafLight']))
def building(x,y,w,d,h,color,style='flat'):
 box('Building',(x,y,h/2+.4),(w,d,h),color,True)
 box('Roof',(x,y,h+.8),(w+1.5,d+1.5,1),'roof')
 if style=='solar':
  for sx in (-w/4,w/4):box('Solar panel',(x+sx,y,h+1.5),(w/3,d*.65,.4),'blue')
 for z in range(4,int(h)-1,5):
  for dx in (-w*.30,0,w*.30):
   box('Front window',(x+dx,y-d/2-.08,z),(2.2,.18,2.5),'window')
   box('Back window',(x+dx,y+d/2+.08,z),(2.2,.18,2.5),'window')
 box('Entrance',(x,y-d/2-.12,2.1),(3,.2,4),'green')
def bench(x,y):
 box('Bench seat',(x,y,1),(4,1.2,.35),'sand');box('Bench back',(x,y+.5,1.7),(4,.25,1.3),'sand')
 for dx in (-1.4,1.4):box('Bench leg',(x+dx,y,.5),(.25,.8,1),'green')
def waste(kind,x,y,idx,district):
 # Separate named pickup root is kept out of the static merge.
 p=empty(f'Pickup_{idx:03d}_{kind}',(x,y,.65));p.parent=groups[active];p['waste_type']=kind;p['pickup_id']=f'EM-{idx:03d}';p['collectible']=True
 before=set(col.objects)
 cylinder('Pickup halo',(x,y,.16),2.4,.08,kind,20)
 if kind=='organic':
  for dx,dy in ((-.45,0),(.45,.25)):cone('Organic sack',(x+dx,y+dy,.8),.65,1.2,kind)
 elif kind in ('plastic','glass'):
  for dx,dy in ((-.4,0),(.5,.3)):
   cylinder('Bottle',(x+dx,y+dy,.8),.34,1.15,kind,8);cylinder('Bottle neck',(x+dx,y+dy,1.48),.16,.3,'ivory',8)
 elif kind=='paper':
  for z in (.25,.53,.81):box('Paper bundle',(x,y,z),(1.7,1.25,.24),'paper')
 elif kind=='metal':
  for dx in (-.45,.45):cylinder('Metal can',(x+dx,y,.65),.40,.9,'metal',10)
 else:
  box('Discarded device',(x,y,.7),(1.8,.8,1.2),'roof');box('Device display',(x,y-.42,.8),(1.45,.08,.8),'ewaste')
 bpy.context.view_layer.update()
 for o in set(col.objects)-before:
  mw=o.matrix_world.copy();o.parent=p;o.matrix_world=mw
 pickups.append({'id':f'EM-{idx:03d}','node':p.name,'wasteType':kind,'district':district,'position':[x,.65,-y],'interactionRadiusMeters':3.5,'points':{'organic':10,'plastic':10,'paper':10,'metal':15,'glass':15,'ewaste':20}[kind],'requiresSpecialHandling':kind=='ewaste'})
# Land island, water edge and fully connected road network.
box('City foundation',(0,0,-4),(800,800,8),'ground')
box('Canal water',(389,0,.1),(20,780,.3),'water')
for x in range(-360,361,120):
 box('North south road',(x,0,.12),(18,738,.24),'asphalt')
 for y in range(-350,351,18):box('Lane dash',(x,y,.26),(.35,6,.035),'line')
for y in range(-360,361,120):
 box('East west road',(0,y,.13),(738,18,.26),'asphalt')
 for x in range(-350,351,18):box('Lane dash',(x,y,.28),(6,.35,.035),'line')
# Crosswalks make intersections readable at street level.
for x in range(-240,241,120):
 for y in range(-240,241,120):
  for dx in range(-6,7,3):box('Crosswalk',(x+dx,y+13,.29),(1.4,5,.04),'ivory')
ZONES=[('01 Willow Homes','homes',(-240,-240),'organic'),('02 Market Quarter','market',(0,-240),'plastic'),('03 Canal Walk','waterfront',(240,-240),'glass'),('04 Learning Campus','campus',(-240,0),'paper'),('05 Central Gardens','park',(0,0),'organic'),('06 Maker Works','industry',(240,0),'metal'),('07 Old Town','oldtown',(-240,240),'glass'),('08 Circular Hub','hub',(0,240),'ewaste'),('09 Solar Heights','towers',(240,240),'paper')]
kind_cycle=['organic','plastic','paper','metal','glass','ewaste'];zones=[];idx=0
for zi,(name,style,(zx,zy),primary) in enumerate(ZONES):
 group(name);zone_pickups=[]
 for bx in (-60,60):
  for by in (-60,60):
   x=zx+bx;y=zy+by
   box('District sidewalk',(x,y,.3),(101,101,.6),'paving')
   box('District ground',(x,y,.65),(91,91,.3),'park' if style=='park' else 'grass')
   if style=='park':
    box('Garden promenade',(x,y,.88),(9,88,.12),'sand');box('Garden promenade',(x,y,.89),(88,9,.12),'sand')
    cylinder('Garden pond',(x+20,y+18,.95),13,.25,'water',24)
    for tx,ty in ((-30,-25),(-25,25),(25,-28)):tree(x+tx,y+ty,1.8)
    for dx in (-15,15):bench(x+dx,y-12)
   elif style=='market':
    building(x,y+14,52,28,11,'ivory')
    for dx in (-30,-10,10,30):
     box('Market stall',(x+dx,y-15,2),(12,8,4),'sand',True)
     box('Market canopy',(x+dx,y-15,5),(14,10,1),R.choice(['coral','lilac','mint']))
   elif style=='industry':
    building(x,y+4,60,46,17,'sand','solar')
    for dx in (-27,-5,17):box('Freight container',(x+dx,y-33,3),(17,8,5.5),R.choice(['blue','coral','green']),True)
    cylinder('Storage silo',(x+35,y+25,13),6,25,'metal',12)
   elif style=='hub':
    building(x,y+17,62,28,16,'mint','solar')
    for bi,kind in enumerate(kind_cycle):
     xx=x-32+bi*13
     box('Sorting bay',(xx,y-15,2.5),(10,15,4),kind,True)
     label('Bay icon',kind.upper()[:3],(xx,y-15,4.6),1.8,'ivory')
    if bx<0: 
     for dx in (-23,0,23):cylinder('Compost vessel',(x+dx,y+2,4),6,6,'organic',12)
   elif style=='waterfront':
    building(x-16,y+8,34,32,15,'blue')
    box('Canal deck',(x+28,y,1.1),(18,82,.7),'sand')
    for dy in (-25,0,25):bench(x+27,y+dy)
   else:
    for dx in (-23,23):
     for dy in (-22,22):
      h=R.uniform(12,23) if style in ('homes','oldtown') else R.uniform(24,49)
      building(x+dx,y+dy,26,25,h,R.choice(['ivory','mint','lilac','sand','coral']), 'solar' if style in ('campus','towers') else 'flat')
   for tx,ty in ((-43,-42),(-43,42),(43,-42),(43,42)):tree(x+tx,y+ty,R.uniform(.8,1.3))
   # Roadside collection sites stay outside building footprints.
   for q,(dx,dy) in enumerate(((-37,-46),(37,-46),(-46,0),(46,0))):
    idx+=1;kind=primary if q<2 else kind_cycle[(zi+q)%6]
    waste(kind,x+dx,y+dy,idx,name);zone_pickups.append(f'EM-{idx:03d}')
 # District title is a ground sign at the main approach, not a floating UI label.
 box('District sign',(zx,zy-115,.5),(84,8,.7),'green')
 label('District name',name[3:].upper(),(zx,zy-116, .88),4.3)
 zones.append({'id':name,'center':[zx,0,-zy],'style':style,'primaryWaste':primary,'pickupIds':zone_pickups})
# A clear start plaza and shared delivery point.
group('10 Player Depot')
box('Depot plaza',(-385,-280,.6),(26,130,1),'paving')
box('Depot kiosk',(-382,-300,4),(14,20,7),'green',True)
label('Depot wordmark','ECOMITRA',(-382,-300,7.7),2)
cylinder('Return pad',(0,204,.30),7,.05,'green',24)
label('Return pad text','RETURN',(0,204,.34),2,'ivory')
start=empty('Player_Start',(-360,-330,1));delivery=empty('Delivery_All_Materials',(0,204,1));delivery['interactionRadiusMeters']=12
# Simple disabled proxies live in the blend; JSON provides portable box colliders.
for c in colliders:
 o=bpy.data.objects.new('Collision_'+c['name'],mesh_cache[('box','green')]);collision.objects.link(o);o.location=c['center'];o.scale=c['size'];o.display_type='WIRE';o.hide_set(True)
# Camera and sunlight are preview-only.
sun_data=bpy.data.lights.new('Warm daylight','SUN');sun_data.energy=2.2;sun_data.angle=.35
sun=bpy.data.objects.new('Warm daylight',sun_data);rig.objects.link(sun);sun.rotation_euler=(.5,-.4,-.6)
cam_data=bpy.data.cameras.new('City overview');cam=bpy.data.objects.new('City overview',cam_data);rig.objects.link(cam);cam.location=(880,-1120,1200);cam.rotation_euler=(Vector((0,0,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam_data.type='ORTHO';cam_data.ortho_scale=1140;cam_data.clip_end=5000;scene.camera=cam
# Export gameplay information in the same coordinate system as glTF: Y up.
def coord(p):return [p[0],p[2],-p[1]]
meta={'name':'EcoMitra Circular City','version':1,'seed':2741,'units':'meters','coordinateSystem':'glTF right-handed Y-up; Blender (x,y,z) becomes (x,z,-y)','sizeMeters':[800,800],'playerStart':coord(start.location),'deliveryPoint':coord(delivery.location),'deliveryRadiusMeters':12,'roads':{'axisCoordinates':list(range(-360,361,120)),'widthMeters':18,'note':'Connected orthogonal road grid; coordinates are X and Z in glTF.'},'districts':zones,'collectibles':pickups,'buildingBoxColliders':[{'name':c['name'],'district':c['district'],'center':coord(c['center']),'size':[c['size'][0],c['size'][2],c['size'][1]]} for c in colliders],'suggestedObjectives':[{'name':'First round','targets':{'organic':3,'plastic':2,'paper':2}},{'name':'Canal cleanup','targets':{'glass':4,'metal':2}},{'name':'Circular city','targets':dict.fromkeys(kind_cycle,3)}]}
with open(os.path.join(OUT,'city-gameplay.json'),'w') as f:json.dump(meta,f,indent=2)
# Convert ground signs before saving, preserving editability of all other pieces.
bpy.ops.object.select_all(action='DESELECT')
for o in list(col.objects):
 if o.type=='FONT':
  o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o.select_set(False)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'ecomitra-city.blend'))
scene.render.filepath=os.path.join(OUT,'ecomitra-city-preview.png');bpy.ops.render.render(write_still=True)
# Batch static scenery per district and material; preserve every pickup root.
batches=defaultdict(list)
for o in col.objects:
 if o.type=='MESH' and o.parent and o.parent.name in groups:
  batches[(o.parent.name,o.data.materials[0].name)].append(o)
for (district,material),objects in batches.items():
 vertices=[];faces=[]
 for o in objects:
  offset=len(vertices);vertices.extend([tuple(o.matrix_world@v.co) for v in o.data.vertices]);faces.extend([tuple(offset+i for i in p.vertices) for p in o.data.polygons])
 mesh=bpy.data.meshes.new(district+'_'+material);mesh.from_pydata(vertices,[],faces);mesh.materials.append(mats[material]);mesh.update()
 merged=bpy.data.objects.new(district+'__'+material,mesh);col.objects.link(merged);merged.parent=groups[district]
 for o in objects:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for o in col.objects:o.select_set(True)
bpy.context.view_layer.objects.active=world
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'ecomitra-city.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_extras=True)
print('CITY_COMPLETE',json.dumps({'districts':len(zones),'pickups':len(pickups),'colliders':len(colliders),'export_objects':len(col.objects)}),flush=True)
