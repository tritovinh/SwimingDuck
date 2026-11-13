# Swimming Duck

A small 3d swimming duck steer around for fun or just to kill time. Enjoy the chilling world and swim around with the duck. The 3d duck is the 3d model that I draw myself. Enjoy!!!

Play it at [swimmingduck.tovinhtri.com](https://swimmingduck.tovinhtri.com).

Built with Next.js, React Three Fiber, and Rapier.

## Run
If you want to run it yourself

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Controls

| Input | Action |
|-------|--------|
| W | Swim forward |
| A / D | Turn left / right |
| Drag | Orbit the camera (drag up to look from below the surface) |
| Scroll | Zoom |

## How it works

The world is defined by two functions in `lib/world.ts`: one for wave height and one for terrain height. The terrain is seeded noise, so it is the same on every visit, and only the area around the duck is built at any time. See `AGENTS.md` for the full breakdown.
