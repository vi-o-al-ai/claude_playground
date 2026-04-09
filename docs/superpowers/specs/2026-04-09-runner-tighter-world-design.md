# Runner Polish: Tighter World & Spawn Distances

## Goal

Make the zombie runner feel more immediate and intense by shrinking the visible road and bringing all spawns closer. Currently, zombies, power-ups, and scenery spawn far away and appear tiny/distant. The fix is to uniformly tighten the world dimensions.

## Changes

### Road & World Dimensions

| Parameter           | Current          | Proposed           |
| ------------------- | ---------------- | ------------------ |
| Road segment length | 50 units         | 25 units           |
| Total segments      | 4-6              | 3-4                |
| Road scroll speed   | 15 u/s           | 15 u/s (unchanged) |
| Prop spawn Z range  | 0-50 per segment | 0-25 per segment   |

### Zombie & Power-Up Spawning

| Parameter        | Current               | Proposed             |
| ---------------- | --------------------- | -------------------- |
| Zombie spawn Z   | ~-50 or further       | ~-25 to -30          |
| Power-up spawn Z | far end of road       | matches shorter road |
| Zombie speed     | 5 u/s base, scales up | unchanged            |
| Spawn intervals  | 2s base, scales down  | unchanged            |
| Bullet lifetime  | 3s                    | 1.5s                 |

Zombies spawn closer with the same speed, so they reach the player faster. This increases intensity without changing the difficulty scaling system.

### Scenery/Props

| Parameter              | Current  | Proposed        |
| ---------------------- | -------- | --------------- |
| Props per segment side | 3-6      | 3-6 (unchanged) |
| Prop placement Z range | 50 units | 25 units        |

Same prop count in half the segment length = roughly 2x visual density. Denser, less empty roadside.

## Files to Modify

- `games/runner/scripts/game_constants.gd` — road segment length, segment count, bullet lifetime, spawn Z values
- `games/runner/scripts/main.gd` — any hardcoded spawn positions or road construction logic that references old dimensions

## Out of Scope

- Camera angle/position changes
- Spawn interval or speed changes
- New visual effects, audio, or UI changes
- Prop model or scale changes
