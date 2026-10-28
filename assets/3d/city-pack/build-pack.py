"""Pack selected official Kenney CC0 models into one local glTF download.
Download/extract City Kit (Suburban), Nature Kit and Car Kit into the source root first.
Usage: blender -b --python build-pack.py -- /tmp/ecomitra-assets /absolute/output.glb
"""
import bpy,sys,pathlib
args=sys.argv[sys.argv.index('--')+1:]
source=pathlib.Path(args[0]);destination=pathlib.Path(args[1])
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
packs={
 'city-kit-suburban':('Models/GLB format',['building-type-a','building-type-b','building-type-f','building-type-i','building-type-p','tree-large','planter']),
 'nature-kit':('Models/GLTF format',['tree_oak','tree_oak_dark','tree_pineRoundA','plant_bushDetailed','flower_yellowA']),
 'car-kit':('Models/GLB format',['sedan','hatchback-sports','taxi','van']),
}
for pack,(folder,names) in packs.items():
 for name in names:
  before=set(bpy.data.objects)
  bpy.ops.import_scene.gltf(filepath=str(source/pack/folder/(name+'.glb')))
  created=set(bpy.data.objects)-before
  root=bpy.data.objects.new('asset_'+name,None);bpy.context.scene.collection.objects.link(root)
  for obj in created:
   if not obj.parent:obj.parent=root
destination.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(destination),export_format='GLB',export_yup=True,export_cameras=False,export_lights=False)
print('Packed selected CC0 assets:',destination)
# Preserve rigging and original animation clips in two small self-contained pedestrian files.
import struct,json,base64
for name in ['character-male-a','character-female-a']:
 path=source/'mini-characters'/'Models/GLB format'/(name+'.glb')
 data=path.read_bytes();length,kind=struct.unpack_from('<II',data,12);gltf=json.loads(data[20:20+length])
 for image in gltf.get('images',[]):
  if 'uri' in image and not image['uri'].startswith('data:'):
   image['uri']='data:image/png;base64,'+base64.b64encode((path.parent/image['uri']).read_bytes()).decode()
 chunk=json.dumps(gltf,separators=(',',':')).encode();chunk+=b' '*((-len(chunk))%4)
 tail=data[20+length:];output=struct.pack('<III',0x46546c67,2,20+len(chunk)+len(tail))+struct.pack('<II',len(chunk),kind)+chunk+tail
 (destination.parent/(name+'.glb')).write_bytes(output)
