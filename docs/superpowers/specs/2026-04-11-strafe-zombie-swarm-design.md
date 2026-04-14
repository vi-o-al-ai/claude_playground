# Strafe Stage: Zombie Swarm

## Goal

Transform the strafe stage from single-zombie trickle spawning into a dense swarm with 50-100 zombies on screen simultaneously, while maintaining playable frame rates. Add an "overrun" fail state where the game ends if 10 zombies get past the player.

## Object Pool

A `ZombiePool` node added as a child of `main_strafe`. Pre-instantiates 100 zombie scenes at `_ready()`, all hidden and inactive.

- `acquire() -> Zombie`: Returns an inactive zombie, resets state (position, `dead = false`, visible, collision enabled). Returns `null` if pool exhausted.
- `release(zombie)`: Hides zombie, disables processing and collision, marks available.
- Zombies are added to the scene tree once at pool creation and never `queue_free()`'d during gameplay.

## LOD System

Distance-based optimization in the zombie script, driven by distance from player (Z = 0):

| Distance          | Behavior                                               |
| ----------------- | ------------------------------------------------------ |
| Near (< 15 units) | Full animation playback, normal processing             |
| Far (15-30 units) | Animation paused on current frame, still moves forward |

**Staggered processing:** Each zombie is assigned a frame group (0, 1, or 2) at acquire time. Each frame, only one group runs its distance check and LOD update. Movement (`position.z += speed * delta`) runs every frame for all zombies. LOD transitions happen within 3 frames of crossing the threshold.

## Spawning & Difficulty

Replace single-zombie timer spawning with batch spawning:

- Batch size starts at 3, increases over time up to 8.
- Spawn interval starts at 2.0s, decreases to 0.5s (same `*= 0.9` scaling every 10 seconds).
- Each batch spawns across random lanes with slight Z offsets (-0.5 to -1.5 units between zombies in the batch) to prevent stacking.
- Speed scales with difficulty, same as current.
- `_on_spawn_timer_timeout` calls `pool.acquire()` in a loop for the batch size, skipping if pool exhausted.

At peak difficulty (~60s), batches of 8 every 0.5s with earlier batches still on screen reach the 50-100 target.

## Overrun Mechanic

- Track `zombies_passed: int` (starts at 0).
- When a zombie's Z > `ZOMBIE_OVERRUN_Z` (1.0), increment `zombies_passed`, release zombie back to pool.
- HUD displays overrun count: "Escaped: 3/10".
- At `MAX_OVERRUN` (10), trigger game over with "OVERRUN" message.
- `zombies_passed` resets to 0 on restart.

## Cleanup & Integration

- **`restart_game()`**: Call `pool.release()` on all active zombies instead of iterating children and calling `queue_free()`. No deferred deletion needed.
- **Bullet collision**: No changes. Bullets detect `Area3D` overlap and call `_on_hit_by_bullet()` as before.
- **Death animation release**: On hit, zombie plays "Death" animation. On animation finished, pool releases it. Death animation is not cut short.
- **Out-of-range safety**: Zombies past Z > 5.0 are released back to pool as a safety net.

## New Constants (game_constants.gd)

```gdscript
const ZOMBIE_POOL_SIZE: int = 100
const ZOMBIE_LOD_DISTANCE: float = 15.0
const ZOMBIE_BATCH_SIZE_INITIAL: int = 3
const ZOMBIE_BATCH_SIZE_MAX: int = 8
const ZOMBIE_OVERRUN_LIMIT: int = 10
const ZOMBIE_OVERRUN_Z: float = 1.0
```

## Files Modified

- `scripts/game_constants.gd` — new constants
- `scripts/zombie.gd` — LOD support, frame group, pool-friendly reset
- `scripts/zombie_pool.gd` — new file, pool manager
- `scripts/main_strafe.gd` — batch spawning, overrun mechanic, pool integration
- `scenes/main_strafe.tscn` — ZombiePool node added

## Out of Scope

- Multiple zombie models or behavioral variety
- MultiMesh rendering
- Wave-based spawning patterns
- Health/damage system for player
