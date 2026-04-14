# Strafe Zombie Swarm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the strafe stage into a dense zombie swarm (50-100 on screen) with object pooling, LOD, batch spawning, and an overrun fail state.

**Architecture:** A `ZombiePool` node pre-instantiates 100 zombie scenes and recycles them via acquire/release. The zombie script gains LOD support (animation pause beyond 15 units) with staggered frame processing. Spawning changes from single zombies to batches that scale with difficulty. Game ends when 10 zombies pass the player.

**Tech Stack:** Godot 4.6, GDScript, GUT testing framework

**Spec:** `docs/superpowers/specs/2026-04-11-strafe-zombie-swarm-design.md`

---

### Task 1: Add New Constants

**Files:**

- Modify: `games/runner/scripts/game_constants.gd:33-36`

- [ ] **Step 1: Add swarm constants to game_constants.gd**

Add after line 36 (after `RAPID_FIRE_INTERVAL`):

```gdscript
# Zombie pool & swarm
const ZOMBIE_POOL_SIZE: int = 100
const ZOMBIE_LOD_DISTANCE: float = 15.0
const ZOMBIE_BATCH_SIZE_INITIAL: int = 3
const ZOMBIE_BATCH_SIZE_MAX: int = 8
const ZOMBIE_BATCH_SIZE_INCREASE: float = 0.5  # added per difficulty tick
const ZOMBIE_OVERRUN_LIMIT: int = 10
const ZOMBIE_OVERRUN_Z: float = 1.0
```

- [ ] **Step 2: Commit**

```bash
git add games/runner/scripts/game_constants.gd
git commit -m "feat(runner): add zombie swarm constants"
```

---

### Task 2: Add Pool Support to Zombie Script

**Files:**

- Modify: `games/runner/scripts/zombie.gd`
- Test: `games/runner/tests/test_zombie_pool.gd`

- [ ] **Step 1: Write failing tests for zombie pool support**

Create `games/runner/tests/test_zombie_pool.gd`:

```gdscript
extends GutTest
## Tests for zombie pool-friendly reset and LOD behavior

var zombie_scene: PackedScene = preload("res://scenes/zombie.tscn")

func _create_zombie() -> Node:
	var z = zombie_scene.instantiate()
	add_child_autofree(z)
	return z

# =============================================================================
# Pool reset
# =============================================================================

func test_reset_clears_dead_flag() -> void:
	var z = _create_zombie()
	z.dead = true
	z.reset()
	assert_false(z.dead, "dead should be false after reset")

func test_reset_makes_visible() -> void:
	var z = _create_zombie()
	z.visible = false
	z.reset()
	assert_true(z.visible, "should be visible after reset")

func test_reset_enables_processing() -> void:
	var z = _create_zombie()
	z.set_process(false)
	z.reset()
	assert_true(z.is_processing(), "processing should be enabled after reset")

func test_reset_re_enables_collision() -> void:
	var z = _create_zombie()
	var col = z.get_node("CollisionShape3D")
	col.disabled = true
	z.reset()
	assert_false(col.disabled, "collision should be enabled after reset")

func test_deactivate_hides_and_stops() -> void:
	var z = _create_zombie()
	z.deactivate()
	assert_false(z.visible, "should be hidden after deactivate")
	assert_false(z.is_processing(), "processing should stop after deactivate")

func test_deactivate_disables_collision() -> void:
	var z = _create_zombie()
	z.deactivate()
	var col = z.get_node("CollisionShape3D")
	assert_true(col.disabled, "collision should be disabled after deactivate")

# =============================================================================
# LOD
# =============================================================================

func test_frame_group_assignment() -> void:
	var z = _create_zombie()
	z.frame_group = 1
	assert_eq(z.frame_group, 1, "frame_group should be settable")

func test_zombie_moves_every_frame_regardless_of_lod() -> void:
	var z = _create_zombie()
	z.speed = 10.0
	z.dead = false
	var start_z = z.position.z
	z._process(0.1)
	assert_gt(z.position.z, start_z, "zombie should move even without LOD update")
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd games/runner && /Applications/Godot.app/Contents/MacOS/Godot --headless --script addons/gut/gut_cmdln.gd -gtest=res://tests/test_zombie_pool.gd
```

Expected: FAIL — `reset`, `deactivate`, `frame_group` don't exist yet.

- [ ] **Step 3: Implement pool support in zombie.gd**

Replace the entire contents of `games/runner/scripts/zombie.gd`:

```gdscript
extends Area3D

var speed: float = GameConstants.ZOMBIE_INITIAL_SPEED
var dead: bool = false
var frame_group: int = 0

@onready var animation_player: AnimationPlayer = $Model/AnimationPlayer
@onready var collision_shape: CollisionShape3D = $CollisionShape3D

var _anim_playing_walk: bool = false

func _ready() -> void:
	area_entered.connect(_on_area_entered)
	_start_walk_animation()

func _start_walk_animation() -> void:
	var anim = animation_player.get_animation("Walk")
	if anim:
		anim.loop_mode = Animation.LOOP_LINEAR
	animation_player.play("Walk")
	_anim_playing_walk = true

func _process(delta: float) -> void:
	if dead:
		return
	position.z += speed * delta
	# LOD: only update animation state on our frame group
	if Engine.get_process_frames() % 3 == frame_group:
		_update_lod()

func _update_lod() -> void:
	var dist = abs(position.z)
	if dist > GameConstants.ZOMBIE_LOD_DISTANCE:
		if _anim_playing_walk:
			animation_player.pause()
			_anim_playing_walk = false
	else:
		if not _anim_playing_walk and not dead:
			animation_player.play("Walk")
			_anim_playing_walk = true

func _on_area_entered(area: Area3D) -> void:
	if area.is_in_group("bullets"):
		_on_hit_by_bullet(area)

func _on_hit_by_bullet(bullet: Node) -> void:
	if dead:
		return
	dead = true
	bullet.on_hit()
	var main = _get_main()
	if main and not main.game_over:
		if main.has_method("add_score"):
			main.add_score()
		else:
			main.score += 1
	animation_player.play("Death")
	animation_player.animation_finished.connect(_on_death_finished, CONNECT_ONE_SHOT)

func _on_death_finished(_anim: String) -> void:
	var main = _get_main()
	if main and main.has_method("release_zombie"):
		main.release_zombie(self)
	else:
		queue_free()

func reset() -> void:
	dead = false
	visible = true
	set_process(true)
	collision_shape.disabled = false
	_start_walk_animation()

func deactivate() -> void:
	visible = false
	set_process(false)
	collision_shape.disabled = true
	animation_player.stop()
	_anim_playing_walk = false

func _get_main() -> Node:
	var node = get_tree().root.get_node_or_null("Main")
	if node:
		return node
	var parent = get_parent()
	while parent:
		if parent.get("score") != null:
			return parent
		parent = parent.get_parent()
	return null
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd games/runner && /Applications/Godot.app/Contents/MacOS/Godot --headless --script addons/gut/gut_cmdln.gd -gtest=res://tests/test_zombie_pool.gd
```

Expected: All PASS.

- [ ] **Step 5: Run existing zombie tests to check no regressions**

```bash
cd games/runner && /Applications/Godot.app/Contents/MacOS/Godot --headless --script addons/gut/gut_cmdln.gd -gtest=res://tests/test_zombie.gd
```

Expected: All PASS.

- [ ] **Step 6: Commit**

```bash
git add games/runner/scripts/zombie.gd games/runner/tests/test_zombie_pool.gd
git commit -m "feat(runner): add pool reset/deactivate and LOD to zombie"
```

---

### Task 3: Create ZombiePool

**Files:**

- Create: `games/runner/scripts/zombie_pool.gd`
- Test: `games/runner/tests/test_zombie_pool.gd` (append)

- [ ] **Step 1: Write failing tests for ZombiePool**

Append to `games/runner/tests/test_zombie_pool.gd`:

```gdscript
# =============================================================================
# ZombiePool
# =============================================================================

var pool_script = preload("res://scripts/zombie_pool.gd")

func _create_pool(size: int = 5) -> Node:
	var pool = Node.new()
	pool.set_script(pool_script)
	pool.pool_size = size
	add_child_autofree(pool)
	# Pool calls _ready() which instantiates zombies
	return pool

func test_pool_creates_zombies_on_ready() -> void:
	var pool = _create_pool(5)
	assert_eq(pool.get_child_count(), 5, "pool should have 5 children")

func test_pool_zombies_start_deactivated() -> void:
	var pool = _create_pool(3)
	for child in pool.get_children():
		assert_false(child.visible, "pooled zombie should be hidden")

func test_acquire_returns_zombie() -> void:
	var pool = _create_pool(3)
	var z = pool.acquire()
	assert_not_null(z, "acquire should return a zombie")
	assert_true(z.visible, "acquired zombie should be visible")

func test_acquire_returns_null_when_exhausted() -> void:
	var pool = _create_pool(2)
	pool.acquire()
	pool.acquire()
	var z = pool.acquire()
	assert_null(z, "acquire should return null when pool exhausted")

func test_release_makes_zombie_available_again() -> void:
	var pool = _create_pool(1)
	var z = pool.acquire()
	assert_not_null(z, "first acquire should work")
	pool.release(z)
	var z2 = pool.acquire()
	assert_not_null(z2, "should be able to acquire after release")
	assert_eq(z, z2, "should get the same zombie back")

func test_release_all_returns_all_active() -> void:
	var pool = _create_pool(3)
	pool.acquire()
	pool.acquire()
	pool.acquire()
	assert_null(pool.acquire(), "pool should be exhausted")
	pool.release_all()
	assert_not_null(pool.acquire(), "pool should have zombies after release_all")

func test_acquire_assigns_frame_group() -> void:
	var pool = _create_pool(6)
	var groups: Array[int] = []
	for i in range(6):
		var z = pool.acquire()
		groups.append(z.frame_group)
	# Should cycle 0, 1, 2, 0, 1, 2
	assert_eq(groups, [0, 1, 2, 0, 1, 2], "frame groups should cycle 0-2")

func test_get_active_count() -> void:
	var pool = _create_pool(5)
	assert_eq(pool.get_active_count(), 0, "no active zombies initially")
	pool.acquire()
	pool.acquire()
	assert_eq(pool.get_active_count(), 2, "two active after two acquires")
	pool.release_all()
	assert_eq(pool.get_active_count(), 0, "none active after release_all")
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd games/runner && /Applications/Godot.app/Contents/MacOS/Godot --headless --script addons/gut/gut_cmdln.gd -gtest=res://tests/test_zombie_pool.gd
```

Expected: FAIL — `zombie_pool.gd` doesn't exist.

- [ ] **Step 3: Implement ZombiePool**

Create `games/runner/scripts/zombie_pool.gd`:

```gdscript
extends Node

var zombie_scene: PackedScene = preload("res://scenes/zombie.tscn")
var pool_size: int = GameConstants.ZOMBIE_POOL_SIZE

var _inactive: Array[Area3D] = []
var _active: Array[Area3D] = []
var _next_frame_group: int = 0

func _ready() -> void:
	for i in range(pool_size):
		var zombie = zombie_scene.instantiate()
		add_child(zombie)
		zombie.deactivate()
		_inactive.append(zombie)

func acquire() -> Area3D:
	if _inactive.is_empty():
		return null
	var zombie = _inactive.pop_back()
	zombie.frame_group = _next_frame_group
	_next_frame_group = (_next_frame_group + 1) % 3
	zombie.reset()
	_active.append(zombie)
	return zombie

func release(zombie: Area3D) -> void:
	zombie.deactivate()
	_active.erase(zombie)
	if zombie not in _inactive:
		_inactive.append(zombie)

func release_all() -> void:
	for zombie in _active.duplicate():
		release(zombie)

func get_active_count() -> int:
	return _active.size()

func get_active_zombies() -> Array[Area3D]:
	return _active
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd games/runner && /Applications/Godot.app/Contents/MacOS/Godot --headless --script addons/gut/gut_cmdln.gd -gtest=res://tests/test_zombie_pool.gd
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add games/runner/scripts/zombie_pool.gd games/runner/tests/test_zombie_pool.gd
git commit -m "feat(runner): add ZombiePool with acquire/release"
```

---

### Task 4: Integrate Pool, Batch Spawning, and Overrun into main_strafe.gd

**Files:**

- Modify: `games/runner/scripts/main_strafe.gd`
- Modify: `games/runner/scripts/hud.gd`
- Modify: `games/runner/scenes/main_strafe.tscn`
- Test: `games/runner/tests/test_strafe_stage.gd` (append new tests)

- [ ] **Step 1: Write failing tests for swarm behavior**

Append to `games/runner/tests/test_strafe_stage.gd`:

```gdscript
# =============================================================================
# Zombie swarm — batch spawning
# =============================================================================

func test_spawn_creates_batch() -> void:
	main_scene = _create_main()
	main_scene._on_spawn_timer_timeout()
	var pool = main_scene.zombie_pool
	assert_gte(
		pool.get_active_count(),
		GameConstants.ZOMBIE_BATCH_SIZE_INITIAL,
		"Should spawn a batch of zombies"
	)

func test_batch_zombies_have_z_offsets() -> void:
	main_scene = _create_main()
	main_scene._on_spawn_timer_timeout()
	var positions: Array[float] = []
	for z in main_scene.zombie_pool.get_active_zombies():
		positions.append(z.position.z)
	positions.sort()
	# At least two distinct Z values (batch has offsets)
	var unique_z := 1
	for i in range(1, positions.size()):
		if not is_equal_approx(positions[i], positions[i - 1]):
			unique_z += 1
	assert_gte(unique_z, 2, "Batch should have varied Z positions")

# =============================================================================
# Zombie swarm — overrun mechanic
# =============================================================================

func test_overrun_counter_starts_at_zero() -> void:
	main_scene = _create_main()
	assert_eq(main_scene.zombies_passed, 0, "Overrun count starts at 0")

func test_zombie_passing_player_increments_overrun() -> void:
	main_scene = _create_main()
	main_scene._on_spawn_timer_timeout()
	var zombie = main_scene.zombie_pool.get_active_zombies()[0]
	# Move zombie past overrun threshold
	zombie.position.z = GameConstants.ZOMBIE_OVERRUN_Z + 1.0
	main_scene._process(0.016)
	assert_eq(main_scene.zombies_passed, 1, "Overrun should increment")

func test_game_over_at_overrun_limit() -> void:
	main_scene = _create_main()
	main_scene.zombies_passed = GameConstants.ZOMBIE_OVERRUN_LIMIT - 1
	main_scene._on_spawn_timer_timeout()
	var zombie = main_scene.zombie_pool.get_active_zombies()[0]
	zombie.position.z = GameConstants.ZOMBIE_OVERRUN_Z + 1.0
	main_scene._process(0.016)
	assert_true(main_scene.game_over, "Game should be over at overrun limit")

func test_restart_resets_overrun() -> void:
	main_scene = _create_main()
	main_scene.zombies_passed = 5
	main_scene.game_over = true
	main_scene.restart_game()
	assert_eq(main_scene.zombies_passed, 0, "Overrun should reset on restart")

func test_batch_size_increases_with_difficulty() -> void:
	main_scene = _create_main()
	var initial_batch = main_scene.batch_size
	main_scene._on_difficulty_timer_timeout()
	assert_gt(main_scene.batch_size, initial_batch, "Batch size should increase")

func test_batch_size_capped_at_max() -> void:
	main_scene = _create_main()
	for i in range(50):
		main_scene._on_difficulty_timer_timeout()
	assert_le(
		main_scene.batch_size,
		GameConstants.ZOMBIE_BATCH_SIZE_MAX,
		"Batch size should not exceed max"
	)

# =============================================================================
# Pool integration
# =============================================================================

func test_restart_releases_all_pooled_zombies() -> void:
	main_scene = _create_main()
	main_scene._on_spawn_timer_timeout()
	assert_gt(main_scene.zombie_pool.get_active_count(), 0, "Should have active zombies")
	main_scene.game_over = true
	main_scene.restart_game()
	assert_eq(main_scene.zombie_pool.get_active_count(), 0, "All zombies released on restart")

func test_release_zombie_method_exists() -> void:
	main_scene = _create_main()
	assert_true(main_scene.has_method("release_zombie"), "main_strafe should have release_zombie")
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd games/runner && /Applications/Godot.app/Contents/MacOS/Godot --headless --script addons/gut/gut_cmdln.gd -gtest=res://tests/test_strafe_stage.gd
```

Expected: FAIL — `zombie_pool`, `zombies_passed`, `batch_size`, `release_zombie` don't exist.

- [ ] **Step 3: Add overrun label to HUD**

Add to `games/runner/scripts/hud.gd` — add the `overrun_label` variable after `pause_button` (line 10):

```gdscript
var overrun_label: Label = null
```

Add `update_overrun` and `hide_overrun` methods at the end of the file:

```gdscript
func update_overrun(passed: int, limit: int) -> void:
	if not overrun_label:
		return
	overrun_label.visible = true
	overrun_label.text = "Escaped: %d/%d" % [passed, limit]

func hide_overrun() -> void:
	if overrun_label:
		overrun_label.visible = false
```

- [ ] **Step 4: Add OverrunLabel node to main_strafe.tscn**

Add the following node at the end of `games/runner/scenes/main_strafe.tscn`, before the closing (as a child of HUD):

```
[node name="OverrunLabel" type="Label" parent="HUD"]
offset_left = 20.0
offset_top = 100.0
offset_right = 300.0
offset_bottom = 140.0
text = "Escaped: 0/10"
```

Update `hud.gd` `_ready()` to find the label. Add after `restart_button.pressed.connect(...)`:

```gdscript
overrun_label = get_node_or_null("OverrunLabel")
if overrun_label:
	overrun_label.visible = false
```

- [ ] **Step 5: Rewrite main_strafe.gd with pool, batch spawning, and overrun**

Replace the entire contents of `games/runner/scripts/main_strafe.gd`:

```gdscript
extends Node3D

@onready var camera: Camera3D = $Camera3D
@onready var road: Node3D = $Road
@onready var player: CharacterBody3D = $Player
@onready var hud: CanvasLayer = $HUD

var power_up_scene: PackedScene = preload("res://scenes/power_up.tscn")

var prop_scenes: Array[PackedScene] = [
	preload("res://assets/tree-pine.glb"),
	preload("res://assets/tree.glb"),
	preload("res://assets/hedge.glb"),
	preload("res://assets/fence-straight.glb"),
	preload("res://assets/plant.glb"),
	preload("res://assets/rocks.glb"),
	preload("res://assets/poles.glb"),
	preload("res://assets/sign.glb"),
	preload("res://assets/barrel.glb"),
]

var score: int = 0
var game_over: bool = false
var paused: bool = false
var zombies_passed: int = 0

var spawn_interval: float = GameConstants.ZOMBIE_INITIAL_SPAWN_INTERVAL
var zombie_speed: float = GameConstants.ZOMBIE_INITIAL_SPEED
var batch_size: float = GameConstants.ZOMBIE_BATCH_SIZE_INITIAL

var spawn_timer: Timer
var difficulty_timer: Timer
var power_up_spawn_timer: Timer

# Power-up state
var active_power_up_type: int = -1
var power_up_time_remaining: float = 0.0

# Road segment containers
var road_containers: Array[Node3D] = []

# Zombie pool
var zombie_pool: Node = null
var _pool_script: GDScript = preload("res://scripts/zombie_pool.gd")

func _ready() -> void:
	player.set_default_animation("Idle_Shoot")
	_build_road()

	# Create zombie pool
	zombie_pool = Node.new()
	zombie_pool.set_script(_pool_script)
	zombie_pool.name = "ZombiePool"
	add_child(zombie_pool)

	spawn_timer = Timer.new()
	spawn_timer.wait_time = spawn_interval
	spawn_timer.autostart = true
	spawn_timer.timeout.connect(_on_spawn_timer_timeout)
	add_child(spawn_timer)

	difficulty_timer = Timer.new()
	difficulty_timer.wait_time = GameConstants.DIFFICULTY_INCREASE_INTERVAL
	difficulty_timer.autostart = true
	difficulty_timer.timeout.connect(_on_difficulty_timer_timeout)
	add_child(difficulty_timer)

	power_up_spawn_timer = Timer.new()
	power_up_spawn_timer.wait_time = randf_range(
		GameConstants.POWER_UP_SPAWN_MIN_INTERVAL,
		GameConstants.POWER_UP_SPAWN_MAX_INTERVAL
	)
	power_up_spawn_timer.autostart = true
	power_up_spawn_timer.one_shot = true
	power_up_spawn_timer.timeout.connect(_on_power_up_spawn_timer_timeout)
	add_child(power_up_spawn_timer)

func _build_road() -> void:
	for child in road.get_children():
		child.queue_free()

	var road_mat := StandardMaterial3D.new()
	road_mat.albedo_color = Color(0.2, 0.2, 0.22, 1)

	var road_mesh := BoxMesh.new()
	road_mesh.size = Vector3(10, 0.1, GameConstants.ROAD_SEGMENT_LENGTH)
	road_mesh.material = road_mat

	var dash_mat := StandardMaterial3D.new()
	dash_mat.albedo_color = Color(1, 1, 1, 0.7)

	var dash_mesh := BoxMesh.new()
	dash_mesh.size = Vector3(0.1, 0.12, 2.0)
	dash_mesh.material = dash_mat

	var grass_mat := StandardMaterial3D.new()
	grass_mat.albedo_color = Color(0.15, 0.35, 0.1, 1)

	var grass_mesh := BoxMesh.new()
	grass_mesh.size = Vector3(50, 0.1, GameConstants.ROAD_SEGMENT_LENGTH)
	grass_mesh.material = grass_mat

	var seg_count := GameConstants.ROAD_SEGMENT_COUNT
	var dash_spacing := 5.0
	var dashes_per_segment := int(GameConstants.ROAD_SEGMENT_LENGTH / dash_spacing)

	var total_length := seg_count * GameConstants.ROAD_SEGMENT_LENGTH
	var start_z := total_length / 2.0

	for i in range(seg_count):
		var container := Node3D.new()
		container.name = "RoadSegment%d" % i
		container.position.z = start_z - i * GameConstants.ROAD_SEGMENT_LENGTH - GameConstants.ROAD_SEGMENT_LENGTH / 2.0
		road.add_child(container)

		var mesh_inst := MeshInstance3D.new()
		mesh_inst.name = "RoadMesh"
		mesh_inst.mesh = road_mesh
		mesh_inst.position.y = -0.05
		container.add_child(mesh_inst)

		var ground_left := MeshInstance3D.new()
		ground_left.name = "GroundLeft"
		ground_left.mesh = grass_mesh
		ground_left.position = Vector3(-30.0, -0.05, 0)
		container.add_child(ground_left)

		var ground_right := MeshInstance3D.new()
		ground_right.name = "GroundRight"
		ground_right.mesh = grass_mesh
		ground_right.position = Vector3(30.0, -0.05, 0)
		container.add_child(ground_right)

		for x in [-1.5, 1.5]:
			for d in range(dashes_per_segment):
				var dash := MeshInstance3D.new()
				dash.mesh = dash_mesh
				var local_z = (GameConstants.ROAD_SEGMENT_LENGTH / 2.0) - d * dash_spacing - dash_spacing / 2.0
				dash.position = Vector3(x, 0.06, local_z)
				container.add_child(dash)

		_add_props_to_segment(container)
		road_containers.append(container)

func _add_props_to_segment(container: Node3D) -> void:
	var seg_half_z := GameConstants.ROAD_SEGMENT_LENGTH / 2.0
	var road_half_width := GameConstants.ROAD_WIDTH / 2.0

	for side in [-1.0, 1.0]:
		var base_x: float = side * (road_half_width + 2.0)
		var prop_count := randi_range(3, 6)

		for _p in range(prop_count):
			var scene: PackedScene = prop_scenes[randi() % prop_scenes.size()]
			var prop: Node3D = scene.instantiate()
			prop.add_to_group("props")

			var x_offset: float = randf_range(0.0, 3.0) * side
			var z_pos := randf_range(-seg_half_z, seg_half_z)
			prop.position = Vector3(base_x + x_offset, 0.0, z_pos)

			prop.rotation.y = randf() * TAU
			prop.scale = Vector3(2.5, 2.5, 2.5)

			container.add_child(prop)

func _process(delta: float) -> void:
	if not game_over:
		_process_power_up_timer(delta)
	if game_over:
		return
	_check_overrun()

func _check_overrun() -> void:
	for zombie in zombie_pool.get_active_zombies():
		if zombie.dead:
			continue
		if zombie.position.z >= GameConstants.ZOMBIE_OVERRUN_Z:
			zombies_passed += 1
			zombie_pool.release(zombie)
			if hud:
				hud.update_overrun(zombies_passed, GameConstants.ZOMBIE_OVERRUN_LIMIT)
			if zombies_passed >= GameConstants.ZOMBIE_OVERRUN_LIMIT:
				_on_overrun()
				return

func _on_overrun() -> void:
	if game_over:
		return
	game_over = true
	spawn_timer.stop()
	difficulty_timer.stop()
	power_up_spawn_timer.stop()
	player.shoot_timer.stop()
	player.die()
	if hud:
		hud.show_game_over(score)

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause") and not game_over:
		toggle_pause()
		return
	if game_over and event.is_action_pressed("restart"):
		restart_game()
	if game_over and event is InputEventScreenTouch and not event.pressed:
		restart_game()

func toggle_pause() -> void:
	if game_over:
		return
	paused = not paused
	get_tree().paused = paused
	if hud:
		if paused:
			hud.show_pause()
		else:
			hud.hide_pause()

func _on_spawn_timer_timeout() -> void:
	if game_over:
		return
	var count := int(batch_size)
	for i in range(count):
		var zombie = zombie_pool.acquire()
		if zombie == null:
			break
		var lane = randi() % GameConstants.LANE_COUNT
		var z_offset = -float(i) * randf_range(0.5, 1.5)
		zombie.position = Vector3(
			GameConstants.LANE_POSITIONS[lane],
			0,
			-GameConstants.ZOMBIE_SPAWN_DISTANCE + z_offset
		)
		zombie.speed = zombie_speed

func _on_difficulty_timer_timeout() -> void:
	if game_over:
		return
	spawn_interval = max(
		spawn_interval * GameConstants.DIFFICULTY_MULTIPLIER,
		GameConstants.ZOMBIE_MIN_SPAWN_INTERVAL
	)
	zombie_speed = min(
		zombie_speed * (1.0 + GameConstants.SPEED_INCREASE),
		GameConstants.ZOMBIE_MAX_SPEED
	)
	batch_size = min(
		batch_size + GameConstants.ZOMBIE_BATCH_SIZE_INCREASE,
		GameConstants.ZOMBIE_BATCH_SIZE_MAX
	)
	spawn_timer.wait_time = spawn_interval

func release_zombie(zombie: Area3D) -> void:
	zombie_pool.release(zombie)

func add_score() -> void:
	score += 1
	if hud:
		hud.update_score(score)

func restart_game() -> void:
	zombie_pool.release_all()

	for child in get_children():
		if child.is_in_group("power_ups"):
			child.queue_free()
	for child in get_tree().root.get_children():
		if child.is_in_group("bullets"):
			child.queue_free()

	score = 0
	game_over = false
	paused = false
	zombies_passed = 0
	spawn_interval = GameConstants.ZOMBIE_INITIAL_SPAWN_INTERVAL
	zombie_speed = GameConstants.ZOMBIE_INITIAL_SPEED
	batch_size = GameConstants.ZOMBIE_BATCH_SIZE_INITIAL

	active_power_up_type = -1
	power_up_time_remaining = 0.0
	player.deactivate_power_up()

	player.current_lane = GameConstants.DEFAULT_LANE
	player.target_x = GameConstants.LANE_POSITIONS[GameConstants.DEFAULT_LANE]
	player.position.x = player.target_x

	player.reset_animation()

	spawn_timer.wait_time = spawn_interval
	spawn_timer.start()
	difficulty_timer.start()
	player.shoot_timer.start()
	power_up_spawn_timer.wait_time = randf_range(
		GameConstants.POWER_UP_SPAWN_MIN_INTERVAL,
		GameConstants.POWER_UP_SPAWN_MAX_INTERVAL
	)
	power_up_spawn_timer.start()

	if hud:
		hud.hide_game_over()
		hud.update_score(0)
		hud.hide_power_up()
		hud.hide_pause()
		hud.hide_overrun()

func _on_power_up_spawn_timer_timeout() -> void:
	if game_over:
		return
	var power_up = power_up_scene.instantiate()
	var lane = randi() % GameConstants.LANE_COUNT
	power_up.position = Vector3(
		GameConstants.LANE_POSITIONS[lane],
		0,
		-GameConstants.ZOMBIE_SPAWN_DISTANCE
	)
	power_up.power_up_type = randi() % 2
	add_child(power_up)
	power_up_spawn_timer.wait_time = randf_range(
		GameConstants.POWER_UP_SPAWN_MIN_INTERVAL,
		GameConstants.POWER_UP_SPAWN_MAX_INTERVAL
	)
	power_up_spawn_timer.start()

func activate_power_up(type: int) -> void:
	if active_power_up_type != -1:
		player.deactivate_power_up()
	active_power_up_type = type
	power_up_time_remaining = GameConstants.POWER_UP_DURATION
	match type:
		GameConstants.POWER_UP_RAPID_FIRE:
			player.activate_rapid_fire()
			if hud:
				hud.show_power_up("Rapid Fire", power_up_time_remaining)
		GameConstants.POWER_UP_MULTI_LANE:
			player.activate_multi_lane()
			if hud:
				hud.show_power_up("Multi-Lane", power_up_time_remaining)

func _process_power_up_timer(delta: float) -> void:
	if game_over:
		return
	if active_power_up_type == -1:
		return
	power_up_time_remaining -= delta
	if power_up_time_remaining <= 0.0:
		power_up_time_remaining = 0.0
		player.deactivate_power_up()
		active_power_up_type = -1
		if hud:
			hud.hide_power_up()
	elif hud:
		var name = "Rapid Fire" if active_power_up_type == GameConstants.POWER_UP_RAPID_FIRE else "Multi-Lane"
		hud.show_power_up(name, power_up_time_remaining)
```

- [ ] **Step 6: Run all strafe tests**

```bash
cd games/runner && /Applications/Godot.app/Contents/MacOS/Godot --headless --script addons/gut/gut_cmdln.gd -gtest=res://tests/test_strafe_stage.gd
```

Expected: All PASS.

- [ ] **Step 7: Run full test suite for regressions**

```bash
cd games/runner && /Applications/Godot.app/Contents/MacOS/Godot --headless --script addons/gut/gut_cmdln.gd
```

Expected: All PASS.

- [ ] **Step 8: Commit**

```bash
git add games/runner/scripts/main_strafe.gd games/runner/scripts/hud.gd games/runner/scenes/main_strafe.tscn games/runner/tests/test_strafe_stage.gd
git commit -m "feat(runner): integrate zombie swarm with pool, batch spawning, and overrun"
```

---

### Task 5: Manual Validation

- [ ] **Step 1: Run the game and play strafe stage**

```bash
cd games/runner && /Applications/Godot.app/Contents/MacOS/Godot
```

Verify:

- Zombies spawn in batches of 3+
- Zombie count on screen grows over time toward 50-100
- Distant zombies have paused animations (subtle — they stop walking)
- "Escaped: X/10" counter appears when zombies get past
- Game over triggers at 10 escaped with "OVERRUN" or game over message
- Restart clears all zombies instantly (no lag from queue_free)
- No visible frame drops at 50+ zombies
- Bullet kills still work, score increments, death animation plays
- Power-ups still spawn and function

- [ ] **Step 2: Commit any fixes from manual testing**
