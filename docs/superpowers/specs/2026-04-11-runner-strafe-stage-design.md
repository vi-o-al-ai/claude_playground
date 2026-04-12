# Runner Game: Strafe Stage & Stage Select

**Date:** 2026-04-11
**Status:** Approved

## Summary

Add a second stage ("Strafe") to the Zombie Lane Runner game and a stage selection screen at game startup. In the strafe stage, the player stands in a static arena, strafing left and right between lanes while shooting zombies that approach from ahead. The core mechanics (lane system, auto-shooting, power-ups, difficulty scaling) remain identical to Stage 1.

## Stage Select Screen

### Scene: `stage_select.tscn`

- Becomes the project's main scene (replaces `main.tscn` in `project.godot`)
- Node tree:
  ```
  StageSelect (Control) [stage_select.gd]
  ├── VBoxContainer (centered)
  │   ├── TitleLabel — "Zombie Lane Runner"
  │   ├── Stage1Button — "Stage 1: Runner"
  │   └── Stage2Button — "Stage 2: Strafe"
  ```
- `stage_select.gd`:
  - Connects button `pressed` signals
  - Stage 1 button: `get_tree().change_scene_to_file("res://scenes/main.tscn")`
  - Stage 2 button: `get_tree().change_scene_to_file("res://scenes/main_strafe.tscn")`

## Stage 2: Strafe

### Scene: `main_strafe.tscn`

Forked from `main.tscn` with the following structural differences:

- Same node tree as `main.tscn` but uses `main_strafe.gd` as its script
- Road segments are static (placed once at startup, never moved)
- Environment props placed once at startup (no recycling)

### Script: `main_strafe.gd`

Forked from `main.gd` with these behavioral differences:

| Aspect              | Stage 1 (Runner)                                        | Stage 2 (Strafe)                                         |
| ------------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| Road scrolling      | Road segments scroll forward and recycle                | Road segments are static, placed once                    |
| Player Z position   | Stays at Z=0 while world moves                          | Stays at Z=0, world is also static                       |
| Zombie spawn origin | Spawned at Z = player.z - 30 (behind, scrolling toward) | Spawned at Z = -30 (ahead, walking toward player at Z=0) |
| Zombie movement     | Move toward player along Z                              | Move toward player along Z (toward Z=0)                  |
| Camera              | Follows road scroll                                     | Static, views arena                                      |
| Environment         | Procedurally recycled props                             | Static props placed once                                 |

### Unchanged Systems

All of these are reused without modification:

- `player.tscn` / `player.gd` — lane switching, auto-shooting
- `zombie.tscn` / `zombie.gd` — zombie AI and death
- `bullet.tscn` / `bullet.gd` — projectile behavior
- `power_up.tscn` / `power_up.gd` — power-up barrels
- `hud.gd` — score, power-up display, game over, pause
- `game_constants.gd` — all constants shared

### Game Over

Same as Stage 1: zombie reaches player Z position → game over → restart reloads `main_strafe.tscn`.

## Game Flow

```
project.godot main_scene = stage_select.tscn

stage_select.tscn
  ├── "Stage 1: Runner" → main.tscn (existing, unchanged)
  └── "Stage 2: Strafe" → main_strafe.tscn (new)
```

## Testing

### Stage Select Tests (`test_stage_select.gd`)

- Stage 1 button exists and is visible
- Stage 2 button exists and is visible
- Title label displays correctly

### Strafe Stage Tests (`test_strafe_stage.gd`)

- Road segments do not move over time (static)
- Player Z position remains at 0
- Zombies spawn at Z = -30 (ahead of player)
- Zombies move toward player (Z increases toward 0)
- Lane system works (player can switch lanes)
- Shooting works (bullets spawn and travel)
- Power-ups spawn and can be collected
- Game over triggers when zombie reaches player
- Difficulty increases over time (spawn rate, zombie speed)
