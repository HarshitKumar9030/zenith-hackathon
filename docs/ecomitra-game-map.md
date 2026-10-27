# EcoMitra Circular City

A standalone stylized 3D environment for the planned waste-collection game. The map is 800 × 800 metres (0.64 km²), with an interconnected street grid, nine districts and 144 individually named waste collection spots. This deliverable is an environment asset and gameplay data; driving, collection logic, UI and physics still need implementation in the game engine.

## Files

Under `assets/3d/ecomitra-city/`:

- `ecomitra-city.blend`: editable environment, preview camera and light, and a separate hidden collision-proxy collection.
- `ecomitra-city.glb`: portable environment with static scenery grouped by district and material; each pickup remains separate.
- `ecomitra-city-preview.png`: rendered overview.
- `city-gameplay.json`: collection locations, waste types, district assignments, spawn, delivery location, road grid, box colliders and example objectives.
- `generate_city.py`: reproducible Blender generator, random seed 2741.

The existing EcoMitra truck is a separate asset under `assets/3d/ecomitra-collection-truck/`; it is not duplicated into this environment.

## Districts

| District | Landmarks | Primary collection type |
| --- | --- | --- |
| Willow Homes | Low-rise homes and tree-lined corners | Organic |
| Market Quarter | Food halls and colourful stalls | Plastic |
| Canal Walk | Waterside decks and benches | Glass |
| Learning Campus | Taller academic buildings and solar roofs | Paper |
| Central Gardens | Ponds, walking paths and trees | Organic |
| Maker Works | Warehouses, silos and freight containers | Metal |
| Old Town | Compact colourful buildings | Glass |
| Circular Hub | Six sorting bays, compost vessels and processing buildings | E-waste |
| Solar Heights | Taller blocks with roof-mounted solar panels | Paper |

Each district has 16 collection locations, including secondary waste types. Collectibles are visible sacks, bottles, paper bundles, cans or discarded devices on coloured ground markers. Colours help wayfinding; the JSON `wasteType` is the authoritative category. E-waste is marked `requiresSpecialHandling` for the future game to route it to an appropriate specialist collection workflow.

## Connect to a game

1. Import the GLB using metre units and import the truck separately. glTF is right-handed with Y up. The Blender-to-glTF transform is `(x, y, z) → (x, z, -y)`. All JSON positions already use the GLB axes.
2. Spawn the player at `playerStart` and provide terrain ground collision. Roads are 18 metres wide, with centre lines at -360, -240, -120, 0, 120, 240 and 360 metres on each horizontal axis.
3. Load `buildingBoxColliders`. These are approximate axis-aligned boxes for buildings, stalls, containers and sorting bays. They do not cover every tree, silo, pond, bench or visual detail; add those if gameplay requires them. Add world-edge barriers and water boundaries in the engine.
4. Find collectibles by their stable `node` / `id`. Their mesh children are grouped under an individual pickup root. Hide the entire root when collected; award its JSON points only once. Pickup interaction radius is 3.5 metres, measured horizontally from the JSON position.
5. Keep organic, plastic, paper, metal, glass and e-waste as distinct inventory counters. Use `suggestedObjectives` for the first missions. These are proposed game rules, not a running scoring implementation.
6. Unload inventory near `deliveryPoint` (12-metre interaction radius) at Circular Hub. Each district also has a parent node for later streaming or visibility control.

Ground signs and window materials are opaque, and there are no external textures or services. Geometry is deliberately stylized. The environment has not been benchmarked inside a game engine; profile draw calls, lighting and frame time before mobile use. LODs, baked lightmaps, navigation meshes, occlusion data, road traffic, sounds and runtime collection behaviours are not included.

## Rebuild

From the repository root on this Mac:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python assets/3d/ecomitra-city/generate_city.py
```

The generator replaces its output artifacts. Keep local Blender `.blend1` backups out of commits. The preview camera and daylight are excluded from the GLB; collision proxy geometry is also excluded because portable collider definitions are supplied in JSON.
