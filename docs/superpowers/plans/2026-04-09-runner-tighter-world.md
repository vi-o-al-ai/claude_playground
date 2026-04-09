# Runner Tighter World Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shrink the runner's visible road and bring all spawns closer to create a more intense, immediate game feel.

**Architecture:** All dimension values live in `game_constants.gd`. Update constants there, then fix hardcoded values in `main.gd` that bypass the constants. Tests already reference constants, so they adapt automatically.

**Tech Stack:** Godot 4.6 / GDScript, GUT testing framework

---

### Task 1: Write failing tests for new world dimensions

**Files:**

- Create: `games/runner/tests/test_tighter_world.gd`

- [ ] **Step 1: Write tests for updated constants and road behavior**

```gdscript
extends GutTest

func test_road_segment_length_is_25():
	assert_eq(GameConstants.ROAD_SEGMENT_LENGTH, 25.0,
		"Road segment length should be 25 units")

func test_road_segment_count_is_4():
	assert_eq(GameConstants.ROAD_SEGMENT_COUNT, 4,
		"Road segment count should be 4")

func test_bullet_lifetime_is_1_5():
	assert_eq(GameConstants.BULLET_LIFETIME, 1.5,
		"Bullet lifetime should be 1.5 seconds")

func test_zombie_spawn_distance_is_30():
	assert_eq(GameConstants.ZOMBIE_SPAWN_DISTANCE, 30.0,
		"Zombie spawn distance should be 30 units")

func test_build_road_uses_segment_count_constant():
	# Verify _build_road creates exactly ROAD_SEGMENT_COUNT segments
	var main_scene = preload("res://scenes/main.tscn").instantiate()
	add_child_autoqfree(main_scene)
	assert_eq(main_scene.road_containers.size(), GameConstants.ROAD_SEGMENT_COUNT,
		"_build_road should create ROAD_SEGMENT_COUNT segments")

func test_recycle_threshold_matches_segment_length():
	# Road segments should recycle when they pass segment_length * 2 behind camera
	# We test this by placing a container past the threshold and calling recycle
	var main_scene = preload("res://scenes/main.tscn").instantiate()
	add_child_autoqfree(main_scene)
	# Move first container way past player
	var original_z = main_scene.road_containers[0].position.z
	main_scene.road_containers[0].position.z = GameConstants.ROAD_SEGMENT_LENGTH + 1.0
	main_scene.recycle_road_segments()
	# It should have been recycled (moved to back)
	assert_true(main_scene.road_containers[0].position.z < original_z,
		"Segment past threshold should be recycled to back")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/al/code/claude_playground/games/runner && /Applications/Godot.app/Contents/MacOS/Godot --headless --script addons/gut/gut_cmdln.gd -gdir=res://tests/ -ginclude_subdirs -gtest=test_tighter_world.gd`
Expected: FAIL — constants still have old values (50.0, 4, 3.0, 60.0)

- [ ] **Step 3: Commit failing tests**

```bash
git add games/runner/tests/test_tighter_world.gd
git commit -m "test: add failing tests for tighter world dimensions"
```

---

### Task 2: Update constants in game_constants.gd

**Files:**

- Modify: `games/runner/scripts/game_constants.gd:8-9,12,20`

- [ ] **Step 1: Update the four constants**

Change these values in `games/runner/scripts/game_constants.gd`:

```gdscript
const ROAD_SEGMENT_LENGTH: float = 25.0
```

```gdscript
const BULLET_LIFETIME: float = 1.5
```

```gdscript
const ZOMBIE_SPAWN_DISTANCE: float = 30.0
```

`ROAD_SEGMENT_COUNT` is already `4` — no change needed.

- [ ] **Step 2: Run the tighter world tests**

Run: `cd /Users/al/code/claude_playground/games/runner && /Applications/Godot.app/Contents/MacOS/Godot --headless --script addons/gut/gut_cmdln.gd -gdir=res://tests/ -ginclude_subdirs -gtest=test_tighter_world.gd`
Expected: First 4 constant-value tests PASS. Road segment count test and recycle test may still fail (hardcoded values in main.gd).

- [ ] **Step 3: Commit constants update**

```bash
git add games/runner/scripts/game_constants.gd
git commit -m "feat: tighten world dimensions — shorter road, closer spawns"
```

---

### Task 3: Fix hardcoded values in main.gd

**Files:**

- Modify: `games/runner/scripts/main.gd:86,93,196`

Three hardcoded values in `_build_road()` and `recycle_road_segments()` bypass the constants:

- [ ] **Step 1: Replace hardcoded seg_count with constant**

In `_build_road()`, line 86, change:

```gdscript
	var seg_count := 6
```

to:

```gdscript
	var seg_count := GameConstants.ROAD_SEGMENT_COUNT
```

- [ ] **Step 2: Fix road segment initial Z offset**

In `_build_road()`, line 93, the `25.0` offset should be derived from the segment length. Change:

```gdscript
		container.position.z = 25.0 - i * GameConstants.ROAD_SEGMENT_LENGTH
```

to:

```gdscript
		container.position.z = GameConstants.ROAD_SEGMENT_LENGTH / 2.0 - i * GameConstants.ROAD_SEGMENT_LENGTH
```

- [ ] **Step 3: Fix recycle threshold**

In `recycle_road_segments()`, line 196, the `50.0` threshold should use the segment length. Change:

```gdscript
		if c.position.z > 50.0:
```

to:

```gdscript
		if c.position.z > GameConstants.ROAD_SEGMENT_LENGTH:
```

- [ ] **Step 4: Run all tests**

Run: `cd /Users/al/code/claude_playground/games/runner && /Applications/Godot.app/Contents/MacOS/Godot --headless --script addons/gut/gut_cmdln.gd -gdir=res://tests/ -ginclude_subdirs`
Expected: ALL tests pass (tighter world tests + all existing tests)

- [ ] **Step 5: Commit main.gd fixes**

```bash
git add games/runner/scripts/main.gd
git commit -m "fix: replace hardcoded road dimensions with constants in main.gd"
```
