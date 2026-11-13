---
name: swimming-duck
description: >-
  Guides work on the Swimming Duck Next.js 3D scene (React Three Fiber, Rapier,
  procedural water, GLTF duck, orbit camera). Use when editing duck movement,
  buoyancy, water waves, camera controls, scene composition, or 3D assets in
  this repository.
---

# Swimming Duck

## Stack

- Next.js 16 App Router, React 19, TypeScript (strict)
- `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`, `three`
- Tailwind CSS 4 in `app/globals.css` (full-viewport canvas; no UI shell yet)
- Path alias: `@/*` → repo root (`tsconfig.json`)

## Layout

| Area | File | Role |
|------|------|------|
| Entry | `app/page.tsx` | Renders `Scene` only |
| Scene shell | `components/scene.tsx` | `"use client"` Canvas, lighting, fog, `Physics`, camera |
| Duck | `components/Duck.tsx` | GLTF mesh, Rapier body, keyboard input, buoyancy |
| Water | `components/Water.tsx` | Procedural plane mesh, vertex waves |
| Asset | `public/duck.glb` | Loaded via `useGLTF('/duck.glb')` |

`app/layout.tsx` sets metadata (“Swimming Duck”) and fonts; it does not mount the canvas.

## Scene graph

```
page.tsx → scene.tsx (Canvas)
  ├─ DuckOrbitCamera (follows duck RigidBody)
  ├─ Environment (drei preset "dawn")
  └─ Physics (gravity [0, -10, 0])
       ├─ Water
       └─ Duck (Model) — rigidBodyRef shared with camera
```

New world objects belong under `<Physics>` in `scene.tsx` unless they are purely visual and need no simulation.

## Critical invariant: shared wave height

Buoyancy in `Duck.tsx` uses `getWaterHeight(x, z, time)`. `Water.tsx` displaces vertices with the same formula in `useFrame`. Any change to amplitude, frequency, or phase must update **both** places (or extract one shared helper used by both).

Current shape:

```ts
Math.sin(x * 0.5 + time) * 0.2 + Math.sin(z * 0.3 + time) * 0.2
```

`time` is `clock.getElapsedTime()` from R3F in both files.

## Duck (`components/Duck.tsx`)

- Export: `Model` (imported as `Duck` in `scene.tsx`). Types: `DuckColors`, optional `rigidBodyRef`.
- GLTF nodes: `body`, `head`, `eye_l`, `eye_r`, `beak`, `Torus` (scarf), `wing_l`, `wing_r`. Materials: `Mat_body`, `Mat_eye`, `Mat_beak`, `Mat_scarf`.
- `useGLTF.preload('/duck.glb')` at module load.
- `RigidBody`: `colliders="hull"`, `enabledRotations={[false, true, false]}`, damping `linearDamping={0.5}`, `angularDamping={5}`, initial `position={[0, 0.2, 0]}`. Inner group `rotation={[0, -Math.PI/2, 0]}` for model orientation.
- Controls: `window` `keydown` / `keyup` / `blur`; `KeyW` forward (`FORWARD_SPEED`), `KeyA` / `KeyD` yaw torque (`TURN_IMPULSE_Y`). Forward uses body quaternion → horizontal `-Z`, preserves `y` velocity.
- Buoyancy: each frame, target `y = getWaterHeight(x, z, time) + 0.1`, impulse from height error, then damp linear velocity (`x/z * 0.95`, `y * 0.9`).
- Materials: clone GLTF materials; apply `colors` prop per part. Match existing clone/fallback pattern when adding parts.

## Water (`components/Water.tsx`)

- `PlaneGeometry(100, 100, 80, 80)`, rotated flat (`rotateX(-Math.PI / 2)`).
- Per-vertex `y` in `useFrame`; `positions.needsUpdate = true`; `computeVertexNormals()` after displacement.
- `meshStandardMaterial`: color `#006994`, `flatShading`, partial transparency. No Rapier collider — duck floats via scripted height, not mesh collision.

## Camera (`DuckOrbitCamera` in `scene.tsx`)

- Tracks `RapierRigidBody` from duck via `rigidBodyRef`; look target `translation + LOOK_OFFSET_Y`.
- Pointer drag: yaw/pitch with clamped pitch; wheel zoom between `MIN_DISTANCE` and `MAX_DISTANCE`; exponential smoothing on rotation.
- Listeners on `gl.domElement`; `touchAction: "none"`. Preserve pointer capture / lost-capture cleanup when changing input.

## Common tasks

**Tweak swim feel** — Adjust `FORWARD_SPEED`, `TURN_IMPULSE_Y`, damping, buoyancy gain (`diff * 50`, impulse scale `0.01`), or `+ 0.1` float offset in `Duck.tsx`; re-test W/A/D.

**Change water** — Edit wave formula in both `Water.tsx` and `getWaterHeight` in `Duck.tsx` together.

**Recolor duck** — Extend `DuckColors` and the `colors` object in `scene.tsx`; clone materials like existing parts.

**New GLTF part** — Update `GLTFResult` nodes/materials, add `<mesh>` with transforms from the asset; keep `dispose={null}` on the group unless disposal strategy changes.

**Add static scenery** — Meshes inside or outside `Physics` depending on collision needs; prefer drei helpers already in use (`Environment`).

## Conventions

- R3F/Three code lives in client components (`"use client"` on `scene.tsx`; `Duck.tsx` / `Water.tsx` rely on hooks).
- Reuse module-level `THREE.Vector3` / `Quaternion` scratch objects in hot `useFrame` paths instead of allocating each frame.
- Indentation is mixed (tabs in `Duck.tsx`, spaces in `scene.tsx`); match the file you edit.
- Avoid unrelated refactors, new markdown docs, or UI frameworks unless requested.
- `three-custom-shader-material` is in `package.json` but unused; prefer the current `meshStandardMaterial` + vertex displacement approach unless migrating water rendering.

## Verify

```bash
pnpm dev
# or: npm run dev
```

- W/A/D: forward and turn; release keys and window blur clear input.
- Duck bobs with waves; no long-term sink or runaway launch.
- Drag orbits camera; wheel zooms; duck stays framed.
- After wave edits, water surface and duck height stay aligned.

```bash
pnpm lint
pnpm build
```

## Out of scope unless asked

Multiplayer, scoring, HUD overlays, sound, mobile control schemes, Rapier water colliders, and replacing `duck.glb` without updating `GLTFResult` types and mesh list.
