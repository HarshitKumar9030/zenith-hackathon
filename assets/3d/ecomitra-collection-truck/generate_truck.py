"""Build the EcoMitra game truck. Run with Blender in background; see README."""
import bpy, math, os
from mathutils import Vector
from math import pi, sin, cos

OUT = os.path.dirname(os.path.abspath(__file__))
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for data in bpy.data.materials: bpy.data.materials.remove(data)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 1600; scene.render.resolution_y = 1200; scene.render.resolution_percentage = 100
scene.render.image_settings.file_format='PNG'; scene.render.film_transparent=False
scene.world.color = (0.72,0.72,0.72)
scene.view_settings.view_transform='AgX'

# Named collections make it simple to export the asset without the preview rig.
truck_collection=bpy.data.collections.new('ECOMITRA_TRUCK_EXPORT'); scene.collection.children.link(truck_collection)
studio=bpy.data.collections.new('STUDIO_PREVIEW_ONLY'); scene.collection.children.link(studio)
def move_collection(obj,collection=truck_collection):
 for c in list(obj.users_collection): c.objects.unlink(obj)
 collection.objects.link(obj)

def mat(name, color, roughness=.5, metallic=0, emission=None):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=roughness;p.inputs['Metallic'].default_value=metallic
 if emission: p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
 return m
forest=mat('01 Forest green',(.055,.19,.14),.46)
spruce=mat('02 Spruce green',(.095,.33,.23),.47)
cream=mat('03 Warm ivory',(.88,.91,.79),.55)
lime=mat('04 Leaf green',(.59,.76,.34),.5)
purple=mat('05 EcoMitra lilac',(.52,.42,.69),.5)
lightpurple=mat('06 Soft lilac',(.72,.66,.82),.45)
glass=mat('07 Opaque smoky violet glass',(.14,.21,.24),.26,.1)
glasslight=mat('08 Window glint',(.41,.58,.52),.36)
tire=mat('09 Rubber',(.044,.064,.058),.78)
tread=mat('10 Tire tread',(.075,.095,.085),.8)
metal=mat('11 Brushed metal',(.46,.57,.50),.38,.65)
hub=mat('12 Hub ivory',(.74,.81,.68),.4,.25)
dark=mat('13 Deep chassis',(.036,.085,.067),.6)
light=mat('14 Headlight',(.98,.91,.64),.28,0,1.6)
red=mat('15 Tail lights',(.75,.16,.15),.38,0,.35)
white=mat('16 Lettering',(.98,.98,.89),.55)
groundmat=mat('Studio backdrop',(.82,.86,.76),.8)

def empty(name,location=(0,0,0),parent=None):
 o=bpy.data.objects.new(name,None);truck_collection.objects.link(o);o.location=location
 if parent:o.parent=parent
 return o
root=empty('EcoMitra_Collection_Truck')
bodygroup=empty('Body',parent=root);cabgroup=empty('Cab',parent=root)

def assign(o,name,material,parent=None):
 o.name=name; move_collection(o); o.data.materials.append(material)
 if parent:o.parent=parent
 return o

def cube(name,location,scale,material,bevel=.05,parent=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=location);o=bpy.context.object;o.dimensions=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Soft moulded edges','BEVEL');mod.width=bevel;mod.segments=3
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
  mod=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');mod.keep_sharp=True
 assign(o,name,material,parent);return o

def cyl(name,location,radius,depth,material,axis='Y',vertices=32,parent=None):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=location);o=bpy.context.object
 if axis=='Y':o.rotation_euler[0]=pi/2
 elif axis=='X':o.rotation_euler[1]=pi/2
 bevel=o.modifiers.new('Soft edges','BEVEL');bevel.width=.025;bevel.segments=2
 bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=bevel.name)
 for p in o.data.polygons:p.use_smooth=True
 o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return assign(o,name,material,parent)

def rod(name,a,b,radius,material,parent=None):
 a,b=Vector(a),Vector(b);mid=(a+b)*.5
 o=cyl(name,mid,radius,(b-a).length,material,'Z',16,parent)
 o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o

def mesh(name,vertices,faces,material,parent=None,bevel=0):
 data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update();o=bpy.data.objects.new(name,data);truck_collection.objects.link(o);o.data.materials.append(material)
 if parent:o.parent=parent
 if bevel:
  mod=o.modifiers.new('Rounded body edges','BEVEL');mod.width=bevel;mod.segments=3
  o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o

def profile(name, points, halfwidth, material,parent=None,bevel=.06):
 verts=[(x,y,z) for y in (-halfwidth,halfwidth) for x,z in points];n=len(points)
 faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 return mesh(name,verts,faces,material,parent,bevel)

def side_surface(name,points,y,material,parent=None):
 return mesh(name,[(x,y,z) for x,z in points],[tuple(range(len(points)))],material,parent)

def txt(name,value,position,size,material,opposite=False,parent=None):
 curve=bpy.data.curves.new(name,'FONT');curve.body=value;curve.size=size;curve.resolution_u=4;curve.extrude=.0005;curve.bevel_depth=0
 o=bpy.data.objects.new(name,curve);truck_collection.objects.link(o);o.location=position;o.rotation_euler=(pi/2,0,pi if opposite else 0);o.data.materials.append(material)
 if parent:o.parent=parent
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return o

# Lower ladder chassis and battery / suspension details.
cube('Chassis_Main',(-.06,0,.68),(4.92,1.46,.34),dark,.08,bodygroup)
cube('Battery_Compartment',(-.14,-.77,.75),(1.0,.18,.42),forest,.035,bodygroup)
cube('Battery_Trim',(-.14,-.875,.75),(.70,.018,.09),lime,.01,bodygroup)
cube('Undercarriage',(-.55,0,.43),(2.8,1.0,.22),tire,.06,bodygroup)
for y in (-.73,.73):
 cube('Frame_Rail',(-.15,y,.59),(4.5,.12,.15),metal,.035,bodygroup)
for x in (-1.55,1.45):cyl('Axle', (x,0,.53), .13,2.07,metal,'Y',24,bodygroup)

# Waste compartment with moulded edges, accessible hatches and a bright brand panel.
cube('Collection_Body',(-.88,0,2.15),(3.15,2.04,2.42),spruce,.18,bodygroup)
cube('Ivory_Roof',(-.86,0,3.42),(3.05,2.08,.21),cream,.09,bodygroup)
cube('Roof_Inset',(-.82,0,3.54),(2.48,1.64,.08),forest,.035,bodygroup)
for y in (-.63,.63):
 cube('Roof_Track',(-.82,y,3.60),(2.35,.055,.055),metal,.02,bodygroup)
for y in (-1.038,1.038):
 cube('Body_Lower_Trim',(-.89,y,1.12),(2.93,.08,.14),forest,.025,bodygroup)
 cube('Body_Lilac_Stripe',(-.91,y,1.36),(2.85,.025,.045),lightpurple,.012,bodygroup)
 cube('Side_Brand_Panel',(-.90,y,2.42),(2.54,.035,1.28),cream,.10,bodygroup)
 cube('Panel_Lower_Rail',(-.90,y*1.025,1.68),(2.46,.035,.035),lime,.012,bodygroup)
 for x in (-2.13,.36):
  for z in (1.91,2.89):cyl('Panel_Rivet',(x,y*1.025,z),.025,.016,metal,'Y',12,bodygroup)
 # Leaf is a real mesh: no external textures or linked assets.
 sign=-1 if y<0 else 1
 leafx=-1.77 if y<0 else -.05
 side_surface('Eco_Leaf',[(leafx-.20,2.22),(leafx-.20,2.42),(leafx-.13,2.61),(leafx+.13,2.71),(leafx+.20,2.72),(leafx+.19,2.44),(leafx+.09,2.30)],y*1.045,lime,bodygroup)
 rod('Leaf_Vein',(leafx-.16,y*1.052,2.25),(leafx+.12,y*1.052,2.59),.018,forest,bodygroup)
 if y<0:
  txt('EcoMitra_Wordmark_L','EcoMitra',(-1.41,y*1.052,2.43),.36,forest,parent=bodygroup)
  txt('Side_Tagline_L','COLLECT  /  CARE  /  CIRCULAR',(-1.39,y*1.052,2.22),.083,purple,parent=bodygroup)
 else:
  txt('EcoMitra_Wordmark_R','EcoMitra',(-.38,y*1.052,2.43),.36,forest,True,bodygroup)
  txt('Side_Tagline_R','COLLECT  /  CARE  /  CIRCULAR',(-.40,y*1.052,2.22),.083,purple,True,bodygroup)

# Compact, recognisable cab with a sloped windscreen.
cab_profile=[(.66,.82),(2.47,.82),(2.47,1.68),(2.24,2.65),(2.02,2.94),(.83,2.94),(.66,2.78)]
profile('Cab_Shell',cab_profile,.91,forest,cabgroup,.09)
cube('Cab_Roof', (1.44,0,2.98),(1.44,1.87,.12),cream,.06,cabgroup)
for side in (-1,1):
 y=side*.927
 side_surface('Side_Window',[(.87,1.87),(1.91,1.87),(2.10,2.54),(1.94,2.75),(.92,2.75)],y,glass,cabgroup)
 side_surface('Window_Highlight',[(1.00,2.04),(1.10,2.04),(1.60,2.65),(1.50,2.65)],y*1.002,glasslight,cabgroup)
 rod('Window_Divider',(1.44,y*1.005,1.90),(1.44,y*1.005,2.73),.018,cream,cabgroup)
 rod('Door_Seam',(.83,y*1.004,1.00),(.83,y*1.004,1.80),.012,metal,cabgroup)
 cube('Door_Handle',(1.53,y*1.02,1.68),(.26,.04,.055),cream,.02,cabgroup)
 cube('Cab_Step',(1.16,side*.97,.77),(.7,.19,.12),metal,.035,cabgroup)
 rod('Mirror_Arm',(2.04,y,2.29),(2.20,side*1.18,2.27),.035,dark,cabgroup)
 cube('Mirror_Housing',(2.20,side*1.20,2.27),(.22,.15,.34),dark,.06,cabgroup)
 cube('Mirror_Face',(2.20,side*1.29,2.27),(.15,.02,.25),glasslight,.035,cabgroup)
 # Subtle side marker and rear chevron help the truck read clearly at game scale.
 cube('Cab_Side_Marker',(2.32,side*.93,1.26),(.20,.025,.09),lightpurple,.02,cabgroup)

mesh('Front_Windscreen',[(2.26,-.76,2.59),(2.26,.76,2.59),(2.44,.76,1.84),(2.44,-.76,1.84)],[(0,1,2,3)],glass,cabgroup)
rod('Windscreen_Divider',(2.265,0,2.57),(2.44,0,1.86),.018,cream,cabgroup)
for y in (-.37,.37):rod('Wiper',(2.442,y-.24,1.87),(2.442,y+.22,1.92),.014,dark,cabgroup)
cube('Front_Bumper',(2.51,0,.83),(.27,1.91,.23),cream,.055,cabgroup)
cube('Front_Grille',(2.52,0,1.30),(.09,1.17,.35),dark,.045,cabgroup)
for z in (1.19,1.29,1.39):cube('Grille_Slat',(2.572,0,z),(.025,1.00,.022),metal,.008,cabgroup)
for y in (-.72,.72):
 cube('Headlamp_Housing',(2.55,y,1.35),(.12,.31,.24),cream,.06,cabgroup)
 cube('Headlamp_Lens',(2.62,y,1.35),(.025,.23,.15),light,.035,cabgroup)
 cube('Indicator_Lens',(2.622,y,1.18),(.02,.22,.045),lightpurple,.012,cabgroup)
cube('Front_Badge',(2.59,0,1.64),(.04,.31,.20),lime,.05,cabgroup)

# Wheel pivots are centered on each axle; meshes are parented to these empties.
for x,axle in ((1.45,'Front'),(-1.55,'Rear')):
 for side,sideName in ((-1,'Left'),(1,'Right')):
  y=side*.96; z=.53
  pivot=empty(f'Wheel_{axle}_{sideName}',(x,y,z),root);bpy.context.view_layer.update()
  wheel=cyl(f'{axle}_{sideName}_Tire',(x,y,z),.53,.39,tire,'Y',40)
  wheel.parent=pivot;wheel.matrix_parent_inverse=pivot.matrix_world.inverted()
  for dy,r,depth,material,label in ((side*.22,.34,.06,hub,'Hub'),(side*.255,.21,.018,forest,'Hub_Inset'),(side*.27,.105,.022,metal,'Center')):
   o=cyl(f'{axle}_{sideName}_{label}',(x,y+dy,z),r,depth,material,'Y',32);o.parent=pivot;o.matrix_parent_inverse=pivot.matrix_world.inverted()
  for i in range(6):
   a=2*pi*i/6;o=cyl(f'{axle}_{sideName}_Bolt_{i+1}',(x+sin(a)*.245,y+side*.258,z+cos(a)*.245),.026,.02,metal,'Y',12);o.parent=pivot;o.matrix_parent_inverse=pivot.matrix_world.inverted()
  for i in range(12):
   a=2*pi*i/12;o=cube(f'{axle}_{sideName}_Tread_{i+1}',(x+sin(a)*.513,y,z+cos(a)*.513),(.15,.32,.037),tread,.012)
   o.rotation_euler[1]=a;o.parent=pivot;o.matrix_parent_inverse=pivot.matrix_world.inverted()

# Distinctive rear-loading equipment, separated for future game animation.
lift=empty('Rear_Lift_Pivot',(-2.55,0,.91),root);bpy.context.view_layer.update()
# parent inverses preserve the intended world positions when linked to the pivot.
def attach_lift(o):o.parent=lift;o.matrix_parent_inverse=lift.matrix_world.inverted();return o
cube('Rear_Compactor_Door',(-2.51,0,2.10),(.20,1.83,2.15),forest,.10,bodygroup)
cube('Rear_Compactor_Panel',(-2.63,0,2.12),(.06,1.42,1.72),spruce,.07,bodygroup)
for side in (-1,1):
 y=side*.73
 cube('Rear_Reflector',(-2.67,y,2.78),(.025,.18,.32),red,.025,bodygroup)
 cube('Rear_Reflector_Bottom',(-2.67,y,1.25),(.025,.20,.16),lightpurple,.02,bodygroup)
 cube('Rear_Lift_Rail',(-2.81,y,1.56),(.16,.16,1.95),metal,.04,bodygroup)
 attach_lift(cube('Lift_Arm',(-2.91,y,1.01),(.78,.13,.15),lime,.04))
 attach_lift(cube('Lift_Fork',(-3.23,y,.82),(.16,.18,.43),lime,.045))
for z in (1.48,2.05,2.62):cube('Rear_Door_Rib',(-2.67,0,z),(.07,1.26,.05),metal,.018,bodygroup)
attach_lift(cube('Lift_Crossbar',(-3.19,0,.98),(.14,1.64,.14),metal,.035))
cube('Rear_Step',(-2.83,0,.62),(.47,1.85,.15),cream,.04,bodygroup)
# Small beacons and aerial: a friendly, recognisable municipal vehicle.
for y in (-.64,.64):
 cyl('Roof_Beacon_Base',(1.54,y,3.065),.115,.06,dark,'Z',24,cabgroup)
 cyl('Roof_Beacon_Lens',(1.54,y,3.14),.085,.11,lightpurple,'Z',24,cabgroup)
rod('Aerial',(1.0,.60,3.01),(.86,.60,3.36),.015,dark,cabgroup)

# Apply world-preserving transforms for all animated pivot children before export.
bpy.context.view_layer.update()
# Named mesh components remain independently editable in the blend file.

# Preview studio (excluded from the GLB selection).
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.03));floor=bpy.context.object;floor.name='Studio_Ground';move_collection(floor,studio);floor.data.materials.append(groundmat)
def area(name,location,energy,size,target):
 data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size;o=bpy.data.objects.new(name,data);studio.objects.link(o);o.location=location;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();return o
area('Key softbox',(4,-6,9),1000,7,(0,0,1.5));area('Fill softbox',(-5,-1,6),650,6,(-.7,0,1.8));area('Rear rim',(0,6,7),950,5,(0,0,1.8))
camdata=bpy.data.cameras.new('Truck_Preview_Camera');cam=bpy.data.objects.new('Truck_Preview_Camera',camdata);studio.objects.link(cam);cam.location=(8,-11,7);target=Vector((-.15,0,1.65));cam.rotation_euler=(target-Vector(cam.location)).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=7.8;scene.camera=cam
scene.render.filepath=os.path.join(OUT,'ecomitra-truck-preview.png')
# Preserve a useful startup view and render, then export only the truck collection.
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'ecomitra-collection-truck.blend'))
bpy.ops.render.render(write_still=True)
bpy.ops.object.select_all(action='DESELECT')
for o in truck_collection.objects:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'ecomitra-collection-truck.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
# Make an additional game export with fewer draw calls. Keep the saved .blend
# and the detailed GLB intact; join only meshes sharing a parent and material.
groups={}
for obj in list(truck_collection.objects):
 if obj.type=='MESH' and obj.parent and len(obj.data.materials)==1:
  groups.setdefault((obj.parent.name,obj.data.materials[0].name),[]).append(obj)
for (parent_name,material_name),objects in groups.items():
 if len(objects)<2:continue
 bpy.ops.object.select_all(action='DESELECT')
 for obj in objects:
  bpy.context.view_layer.objects.active=obj;obj.select_set(True)
  for modifier in list(obj.modifiers):
   bpy.ops.object.modifier_apply(modifier=modifier.name)
  obj.select_set(False)
 for obj in objects:obj.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.object.join();bpy.context.object.name=f'{parent_name}__{material_name}'
bpy.ops.object.select_all(action='DESELECT')
for obj in truck_collection.objects:obj.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'ecomitra-collection-truck-game.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
print('ECOMITRA_EXPORT_COMPLETE',len(truck_collection.objects))
