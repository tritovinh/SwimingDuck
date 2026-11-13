# Swimming Duck

## Stack

- Next.js 16 App Router, React 19, TypeScript (strict)
- `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`, `three`, `simplex-noise`
- Tailwind CSS 4 in `app/globals.css` (full-viewport canvas; no UI shell yet)
- Path alias: `@/*` → repo root (`tsconfig.json`)

## Layout

| Area | File | Role |
|------|------|------|
| Entry | `app/page.tsx` | Renders `Scene` only |
| Scene shell | `components/scene.tsx` | `"use client"` Canvas, background, fog, `Physics`, camera |
| World shape | `lib/world.ts` | `getWaterHeight`, `getTerrainHeight`, `SPAWN_X`, shared constants |
| Duck | `components/Duck.tsx` | GLTF mesh, Rapier body, keyboard input, floating, shore check |
| Water | `components/Water.tsx` | Procedural plane mesh that follows the duck, vertex waves |
| Terrain | `components/Terrain.tsx` | Chunked island meshes around the duck (visual only) |
| Asset | `public/duck.glb` | Loaded via `useGLTF('/duck.glb')` |

`app/layout.tsx` sets metadata (“Swimming Duck”) and fonts; it does not mount the canvas.

## Scene graph

```
page.tsx → scene.tsx (Canvas)
  ├─ color background + fog (same colour, fog 15–60)
  ├─ Environment (drei preset "dawn")
  ├─ Physics (timeStep="vary")
  │    ├─ Terrain — follows duck via targetRef
  │    ├─ Water — follows duck via targetRef
  │    └─ Duck (Model) — owns the RigidBody, exposes it via rigidBodyRef
  └─ DuckOrbitCamera — must stay after Physics
```

One `duckBodyRef` in `scene.tsx` is shared by the duck, terrain, water, and camera.

## Critical invariants

**`lib/world.ts` is the single source of truth for world shape.** Water mesh, terrain mesh, duck floating, and the duck's shore check all call the same functions. Never copy a height formula into a component.

**World functions must stay pure and deterministic.** `getTerrainHeight(x, z)` depends only on its arguments and the noise table built once at module load from a fixed seed (`let seed = 1`). Chunks are discarded and rebuilt as the duck moves; they only match on return because the function gives the same answer for the same coordinates. Do not add time, state, or `Math.random()` to it.

**Frame order matters.** `Physics` uses `timeStep="vary"` so it steps once per rendered frame with no interpolation, and `DuckOrbitCamera` is mounted after `Physics` so its `useFrame` runs after the step. Changing either brings back camera/duck jitter.

**The duck is the only physics body.** Terrain and water have no colliders. Land is blocked by the scripted shore check in `Duck.tsx`, not by collision.

## World (`lib/world.ts`)

- `getWaterHeight(x, z, time)`: `Math.sin(x * 0.5 + time) * 0.2 + Math.sin(z * 0.3 + time) * 0.2`. `time` is `clock.getElapsedTime()`.
- `getTerrainHeight(x, z)`: three octaves of seeded simplex noise (frequencies `0.055`, `0.11`, `0.22`; weights `1`, `0.5`, `0.25`), then `Math.max(SEABED_HEIGHT, (noise / 1.75 - 0.2) * 5)`. `- 0.2` sets how much is land, `* 5` sets island height, `SEABED_HEIGHT` is `-1.5`.
- `SPAWN_X`: first point along +x where the seabed is flat 2 units in each direction. Computed once at module load.
- `CHUNK_SIZE = 32`, `SAND_HEIGHT = 0.5` (terrain below this is coloured sand).

## Duck (`components/Duck.tsx`)

- Export: `Model` (imported as `Duck` in `scene.tsx`). Types: `DuckColors`, optional `rigidBodyRef`.
- GLTF nodes: `body`, `head`, `eye_l`, `eye_r`, `beak`, `Torus` (scarf), `wing_l`, `wing_r`. Materials: `Mat_body`, `Mat_eye`, `Mat_beak`, `Mat_scarf`.
- `useGLTF.preload('/duck.glb')` at module load.
- `RigidBody`: `colliders="hull"`, `gravityScale={0}`, `linearDamping={3}`, `enabledRotations={[false, true, false]}`, initial `position={[SPAWN_X, 0.2, 0]}`. Inner group `rotation={[0, -Math.PI/2, 0]}` for model orientation.
- Controls: `window` `keydown` / `keyup` / `blur`; `KeyW` forward, `KeyA` / `KeyD` turn.
- Movement sets velocities directly each frame; it never applies impulses or forces (those are frame-rate dependent and caused shaking):
  - `KeyW`: horizontal velocity = facing direction × `FORWARD_SPEED`. Without it, `linearDamping` glides the duck to a stop.
  - Shore check: if `getTerrainHeight` half a unit ahead on x (then separately on z) is above `SHORE_HEIGHT` (`-0.5`), that velocity component is zeroed. Per-axis checks let the duck slide along coasts.
  - Floating: `velocity.y = (getWaterHeight(x, z, time) + 0.1 - y) * 10`.
  - Turning: angular velocity y = `±TURN_SPEED`, or 0 when neither key is held.
- Materials: clone GLTF materials; apply `colors` prop per part. Match existing clone/fallback pattern when adding parts.

## Water (`components/Water.tsx`)

- `PlaneGeometry(160, 160)` with a vertex every `STEP = 1.25`, rotated flat.
- Each frame the mesh moves to the duck's position snapped to `STEP` (unsnapped movement makes the flat-shaded facets shimmer), then every vertex `y` is set from `getWaterHeight` at its world position.
- No `computeVertexNormals()`; `flatShading` does not use vertex normals.
- `meshStandardMaterial`: color `#006994`, `flatShading`, opacity `0.8`, `DoubleSide` (visible from underwater).

## Terrain (`components/Terrain.tsx`)

- `TerrainChunk`: one `CHUNK_SIZE` square with one vertex per unit. Heights come from `getTerrainHeight` at world position (chunk offset + local vertex); vertex colour is sand below `SAND_HEIGHT`, grass above. Built once per chunk in `useMemo`.
- `Terrain`: keeps a `center` chunk in state and renders every chunk within `VIEW_RADIUS = 2` (5×5). Re-centres when the duck is more than `0.6` of a chunk away (the margin over `0.5` prevents reloading at a boundary).
- Chunk `key` is its coordinates, so React keeps unchanged chunks and only builds the new row.
- The loaded area ends 61–99 units from the duck; fog far (`60`) must stay below that or the edge shows.

## Camera (`DuckOrbitCamera` in `scene.tsx`)

- Tracks the duck's `RapierRigidBody`; look target `translation + LOOK_OFFSET_Y`.
- Pointer drag: yaw/pitch with pitch clamped to `MIN_PITCH` (`-0.25`, slightly underwater) … `MAX_PITCH`; wheel zoom between `MIN_DISTANCE` and `MAX_DISTANCE`; exponential smoothing on rotation.
- Camera height is floored at `MIN_CAMERA_Y` (`-1.2`) so it stays above the seabed. It has no terrain collision.
- Listeners on `gl.domElement`; `touchAction: "none"` is set on the `Canvas` style. Preserve pointer capture / lost-capture cleanup when changing input.

## Common tasks

**Tweak swim feel** — `FORWARD_SPEED`, `TURN_SPEED`, `linearDamping` (glide), the `* 10` float gain, or the `+ 0.1` float offset in `Duck.tsx`; re-test W/A/D.

**Change waves** — Edit `getWaterHeight` in `lib/world.ts` only.

**Change islands** — Edit `getTerrainHeight` in `lib/world.ts`: frequencies for island size, `- 0.2` for land amount, `* 5` for height. Change `seed` for a different world. Check the duck still spawns in open water.

**Change how close the duck gets to land** — `SHORE_HEIGHT` and the `0.5` probe distance in `Duck.tsx`.

**Change view distance** — `VIEW_RADIUS` in `Terrain.tsx`, `SIZE` in `Water.tsx`, and the fog range in `scene.tsx` together.

**Recolor duck** — Extend `DuckColors` and the `colors` object in `scene.tsx`; clone materials like existing parts.

**New GLTF part** — Update `GLTFResult` nodes/materials, add `<mesh>` with transforms from the asset; keep `dispose={null}` on the group unless disposal strategy changes.

**Add static scenery** — If it should block the duck, extend the shore check or add colliders deliberately; nothing collides today.

## Conventions

- R3F/Three code lives in client components (`"use client"` on `scene.tsx`; the other components rely on hooks).
- Reuse module-level `THREE.Vector3` / `Quaternion` scratch objects in hot `useFrame` paths instead of allocating each frame.
- Indentation is tabs; `scene.tsx` uses double quotes and semicolons, the other files single quotes without. Match the file you edit.
- Keep it minimal: fewest files and least code that works, and no explanatory comments in code.
- Avoid unrelated refactors, new markdown docs, or UI frameworks unless requested.
- `three-custom-shader-material` is in `package.json` but unused; prefer the current `meshStandardMaterial` + vertex displacement approach unless migrating water rendering.

## Verify

```bash
pnpm dev
```

- W/A/D: forward and turn; release keys and window blur clear input.
- Duck bobs with waves without shaking, including while holding W.
- Duck stops at shores and slides along them; it never climbs onto land.
- Swim away from an island and back: it is unchanged.
- Drag orbits camera, including slightly below the surface; wheel zooms; duck stays framed.
- No visible edge of water or terrain through the fog.

```bash
pnpm lint
pnpm build
```

## Out of scope unless asked

Multiplayer, scoring, HUD overlays, sound, mobile control schemes, physics colliders for terrain or water, and replacing `duck.glb` without updating `GLTFResult` types and mesh list.
