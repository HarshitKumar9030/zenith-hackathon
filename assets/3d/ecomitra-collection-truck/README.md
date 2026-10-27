# EcoMitra collection truck

A standalone, stylized collection truck for a future game. The forest green, ivory and lilac body, opaque windows, branded side panels, headlights, wheels and rear lifting assembly are modeled as geometry; no external textures or files are required.

- `ecomitra-collection-truck.glb` — detailed portable glTF 2.0 binary, with individual editable components.
- `ecomitra-collection-truck-game.glb` — game-oriented export with parts sharing a parent and material merged to reduce draw calls while keeping wheel and lift pivots.
- `ecomitra-collection-truck.blend` — editable Blender scene, including the preview camera and lights.
- `ecomitra-truck-preview.png` — rendered three-quarter preview.
- `generate_truck.py` — reproducible Blender Python source.

## Game integration

The detailed GLB has about 40,400 triangles and 185 meshes. The game export keeps the same geometry but merges compatible meshes; profile it on your target device and add LODs if necessary.

The model uses approximately metre-sized units, with its origin on the ground, +X forward in Blender and four independently named wheel pivots (`Wheel_Front_Left`, `Wheel_Front_Right`, `Wheel_Rear_Left`, `Wheel_Rear_Right`). `Rear_Lift_Pivot` groups the rear forks. Animate these pivots after import; the asset does not include animation clips, collision shapes, a vehicle controller, or rigging. The GLB exporter converts Blender's Z-up coordinates to glTF's Y-up convention. Check forward axis and scale in your chosen engine before wiring up movement.

The Blender preview scene contains a floor, camera and lights in `STUDIO_PREVIEW_ONLY`; only `ECOMITRA_TRUCK_EXPORT` is exported to GLB. Materials are opaque PBR colors; the windows are solid tinted material for reliable game rendering.

Regenerate from this folder with Blender 5.x:

```sh
blender --background --python generate_truck.py
```

This script recreates the scene and overwrites the `.blend`, both `.glb` files and preview PNG in this folder. It uses Blender's built-in font converted to geometry, without a separate font dependency.
