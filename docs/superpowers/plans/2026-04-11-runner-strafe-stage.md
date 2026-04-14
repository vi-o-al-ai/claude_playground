# Runner Strafe Stage & Stage Select Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a stage selection screen and a second "strafe" stage to the Zombie Lane Runner Godot game.

**Architecture:** New `stage_select.tscn` becomes the project entry point with two buttons that load either the existing `main.tscn` (runner) or a new `main_strafe.tscn` (static arena). The strafe stage reuses all existing sub-scenes (player, zombie, bullet, power_up) and HUD — only the main scene script differs (no road scrolling, static environment, zombies spawn ahead).

**Tech Stack:** Godot 4.6, GDScript, GUT testing framework

---

### File Map

| Action | File                         | Responsibility                                      |
| ------ | ---------------------------- | --------------------------------------------------- |
| Create | `scenes/stage_select.tscn`   | Stage selection UI scene                            |
| Create | `scripts/stage_select.gd`    | Button handlers for scene transitions               |
| Create | `scenes/main_strafe.tscn`    | Strafe stage scene (fork of main.tscn)              |
| Create | `scripts/main_strafe.gd`     | Strafe game logic (fork of main.gd, no road scroll) |
| Modify | `project.godot`              | Change `run/main_scene` to `stage_select.tscn`      |
| Create | `tests/test_stage_select.gd` | Tests for stage select screen                       |
| Create | `tests/test_strafe_stage.gd` | Tests for strafe stage behavior                     |

---

### Task 1: Stage Select Screen — Tests

**Files:**

- Create: `tests/test_stage_select.gd`

- [ ] **Step 1: Write the failing tests**

```gdscript
extends GutTest
## Tests for the stage select screen

var stage_select: Control = null

func _create_stage_select() -> Control:
	var s = load("res://scenes/stage_select.tscn").instantiate()
	add_child_autofree(s)
	return s

# =============================================================================
# Happy path
# =============================================================================

func test_title_label_exists() -> void:
	stage_select = _create_stage_select()
	var title = stage_select.get_node("VBoxContainer/TitleLabel")
	assert_not_null(title, "Title label should exist")
	assert_true(title.text.contains("Zombie"), "Title should contain game name")

func test_stage1_button_exists_and_visible() -> void:
	stage_select = _create_stage_select()
	var btn = stage_select.get_node("VBoxContainer/Stage1Button")
	assert_not_null(btn, "Stage 1 button should exist")
	assert_true(btn.visible, "Stage 1 button should be visible")
	assert_true(btn.text.contains("Runner"), "Stage 1 button should mention Runner")

func test_stage2_button_exists_and_visible() -> void:
	stage_select = _create_stage_select()
	var btn = stage_select.get_node("VBoxContainer/Stage2Button")
	assert_not_null(btn, "Stage 2 button should exist")
	assert_true(btn.visible, "Stage 2 button should be visible")
	assert_true(btn.text.contains("Strafe"), "Stage 2 button should mention Strafe")

# =============================================================================
# Edge cases
# =============================================================================

func test_buttons_are_focusable() -> void:
	stage_select = _create_stage_select()
	var btn1 = stage_select.get_node("VBoxContainer/Stage1Button")
	var btn2 = stage_select.get_node("VBoxContainer/Stage2Button")
	assert_eq(btn1.focus_mode, Control.FOCUS_ALL, "Stage 1 button should be focusable")
	assert_eq(btn2.focus_mode, Control.FOCUS_ALL, "Stage 2 button should be focusable")
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd games/runner
/Applications/Godot.app/Contents/MacOS/Godot --headless --script addons/gut/gut_cmdln.gd -gtest=res://tests/test_stage_select.gd
```

Expected: FAIL — `res://scenes/stage_select.tscn` does not exist

- [ ] **Step 3: Commit failing tests**

```bash
git add games/runner/tests/test_stage_select.gd
git commit -m "test: add failing tests for stage select screen"
```

---

### Task 2: Stage Select Screen — Implementation

**Files:**

- Create: `scripts/stage_select.gd`
- Create: `scenes/stage_select.tscn`

- [ ] **Step 1: Create `scripts/stage_select.gd`**

```gdscript
extends Control

@onready var stage1_button: Button = $VBoxContainer/Stage1Button
@onready var stage2_button: Button = $VBoxContainer/Stage2Button

func _ready() -> void:
	stage1_button.pressed.connect(_on_stage1_pressed)
	stage2_button.pressed.connect(_on_stage2_pressed)

func _on_stage1_pressed() -> void:
	get_tree().change_scene_to_file("res://scenes/main.tscn")

func _on_stage2_pressed() -> void:
	get_tree().change_scene_to_file("res://scenes/main_strafe.tscn")
```

- [ ] **Step 2: Create `scenes/stage_select.tscn`**

```
[gd_scene load_steps=2 format=3]

[ext_resource type="Script" path="res://scripts/stage_select.gd" id="1_script"]

[node name="StageSelect" type="Control"]
layout_mode = 3
anchors_preset = 15
anchor_left = 0.0
anchor_top = 0.0
anchor_right = 1.0
anchor_bottom = 1.0
script = ExtResource("1_script")

[node name="VBoxContainer" type="VBoxContainer" parent="."]
layout_mode = 1
anchors_preset = 8
anchor_left = 0.5
anchor_top = 0.5
anchor_right = 0.5
anchor_bottom = 0.5
offset_left = -150.0
offset_top = -80.0
offset_right = 150.0
offset_bottom = 80.0
grow_horizontal = 2
grow_vertical = 2
alignment = 1

[node name="TitleLabel" type="Label" parent="VBoxContainer"]
layout_mode = 2
text = "Zombie Lane Runner"
horizontal_alignment = 1

[node name="Stage1Button" type="Button" parent="VBoxContainer"]
layout_mode = 2
custom_minimum_size = Vector2(200, 50)
text = "Stage 1: Runner"

[node name="Stage2Button" type="Button" parent="VBoxContainer"]
layout_mode = 2
custom_minimum_size = Vector2(200, 50)
text = "Stage 2: Strafe"
```

- [ ] **Step 3: Run tests to verify they pass**

Run:

```bash
cd games/runner
/Applications/Godot.app/Contents/MacOS/Godot --headless --script addons/gut/gut_cmdln.gd -gtest=res://tests/test_stage_select.gd
```

Expected: All 4 tests PASS

- [ ] **Step 4: Commit**

```bash
git add games/runner/scripts/stage_select.gd games/runner/scenes/stage_select.tscn
git commit -m "feat: add stage select screen with runner and strafe buttons"
```

---

### Task 3: Strafe Stage — Tests

**Files:**

- Create: `tests/test_strafe_stage.gd`

- [ ] **Step 1: Write the failing tests**

```gdscript
extends GutTest
## Tests for the strafe stage (static arena, zombies from ahead)

var main_scene: Node = null

func _create_main() -> Node:
	var m = load("res://scenes/main_strafe.tscn").instantiate()
	add_child_autofree(m)
	return m

func _create_zombie() -> Node:
	return load("res://scenes/zombie.tscn").instantiate()

func _create_bullet() -> Node:
	return load("res://scenes/bullet.tscn").instantiate()

# =============================================================================
# Happy path — static road
# =============================================================================

func test_road_segments_do_not_move() -> void:
	main_scene = _create_main()
	var initial_positions: Array[float] = []
	for container in main_scene.road_containers:
		initial_positions.append(container.position.z)
	# Simulate several frames
	for i in range(10):
		main_scene._process(0.1)
	for i in range(main_scene.road_containers.size()):
		assert_eq(
			main_scene.road_containers[i].position.z,
			initial_positions[i],
			"Road segment %d should not move" % i
		)

func test_player_z_stays_at_zero() -> void:
	main_scene = _create_main()
	assert_eq(main_scene.player.position.z, 0.0, "Player Z should be 0")
	for i in range(10):
		main_scene._process(0.1)
	assert_eq(main_scene.player.position.z, 0.0, "Player Z should remain 0 after processing")

# =============================================================================
# Happy path — zombie spawning
# =============================================================================

func test_zombies_spawn_ahead_of_player() -> void:
	main_scene = _create_main()
	main_scene._on_spawn_timer_timeout()
	var zombie_found := false
	for child in main_scene.get_children():
		if child is Area3D and child.get("dead") != null:
			assert_lt(child.position.z, 0.0, "Zombie should spawn at negative Z (ahead)")
			zombie_found = true
	assert_true(zombie_found, "A zombie should have been spawned")

func test_zombies_move_toward_player() -> void:
	main_scene = _create_main()
	main_scene._on_spawn_timer_timeout()
	var zombie: Node = null
	for child in main_scene.get_children():
		if child is Area3D and child.get("dead") != null:
			zombie = child
			break
	assert_not_null(zombie, "Zombie should exist")
	var initial_z = zombie.position.z
	zombie._process(0.5)
	assert_gt(zombie.position.z, initial_z, "Zombie should move toward player (Z increasing)")

# =============================================================================
# Happy path — shared mechanics work
# =============================================================================

func test_score_starts_at_zero() -> void:
	main_scene = _create_main()
	assert_eq(main_scene.score, 0, "Score should start at 0")

func test_score_increments_on_kill() -> void:
	main_scene = _create_main()
	var zombie = _create_zombie()
	zombie.position = Vector3(0, 0.5, -5)
	main_scene.add_child(zombie)
	var bullet = _create_bullet()
	bullet.position = Vector3(0, 0.5, -5)
	main_scene.add_child(bullet)
	zombie._on_hit_by_bullet(bullet)
	assert_eq(main_scene.score, 1, "Score should be 1 after kill")

func test_game_over_when_zombie_reaches_player() -> void:
	main_scene = _create_main()
	main_scene._on_zombie_reached_player(null)
	assert_true(main_scene.game_over, "Game should be over")
	var hud = main_scene.get_node("HUD")
	var panel = hud.get_node("GameOverPanel")
	assert_true(panel.visible, "GameOverPanel should be visible")

func test_lane_switching_works() -> void:
	main_scene = _create_main()
	assert_eq(main_scene.player.current_lane, 1, "Player starts center")
	main_scene.player.move_left()
	assert_eq(main_scene.player.current_lane, 0, "Player should be in left lane")
	main_scene.player.move_right()
	assert_eq(main_scene.player.current_lane, 1, "Player should be back in center")

func test_restart_resets_state() -> void:
	main_scene = _create_main()
	main_scene.score = 10
	main_scene.game_over = true
	main_scene.restart_game()
	assert_eq(main_scene.score, 0, "Score should reset")
	assert_false(main_scene.game_over, "Game over should be false")

# =============================================================================
# Edge cases
# =============================================================================

func test_difficulty_increases_over_time() -> void:
	main_scene = _create_main()
	var initial_interval = main_scene.spawn_interval
	main_scene._on_difficulty_timer_timeout()
	assert_lt(main_scene.spawn_interval, initial_interval, "Spawn interval should decrease")

func test_no_road_scroll_method() -> void:
	main_scene = _create_main()
	# Strafe stage should not have scroll_road — verify road stays static
	assert_false(main_scene.has_method("scroll_road"), "Strafe stage should not have scroll_road method")
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd games/runner
/Applications/Godot.app/Contents/MacOS/Godot --headless --script addons/gut/gut_cmdln.gd -gtest=res://tests/test_strafe_stage.gd
```

Expected: FAIL — `res://scenes/main_strafe.tscn` does not exist

- [ ] **Step 3: Commit failing tests**

```bash
git add games/runner/tests/test_strafe_stage.gd
git commit -m "test: add failing tests for strafe stage"
```

---

### Task 4: Strafe Stage — Implementation

**Files:**

- Create: `scripts/main_strafe.gd`
- Create: `scenes/main_strafe.tscn`

- [ ] **Step 1: Create `scripts/main_strafe.gd`**

This is a fork of `main.gd` with road scrolling removed and zombie spawning adjusted. Key differences from `main.gd`:

- `_build_road()` places segments centered around Z=0 (static arena)
- No `scroll_road()` or `recycle_road_segments()` methods
- `_process()` does not scroll or recycle road
- Zombies spawn at negative Z (ahead of player) and walk toward Z=0

```gdscript
extends Node3D

@onready var camera: Camera3D = $Camera3D
@onready var road: Node3D = $Road
@onready var player: CharacterBody3D = $Player
@onready var hud: CanvasLayer = $HUD

var zombie_scene: PackedScene = preload("res://scenes/zombie.tscn")
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

var spawn_interval: float = GameConstants.ZOMBIE_INITIAL_SPAWN_INTERVAL
var zombie_speed: float = GameConstants.ZOMBIE_INITIAL_SPEED

var spawn_timer: Timer
var difficulty_timer: Timer
var power_up_spawn_timer: Timer

# Power-up state
var active_power_up_type: int = -1
var power_up_time_remaining: float = 0.0

# Road segment containers
var road_containers: Array[Node3D] = []

func _ready() -> void:
	_build_road()

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

	# Place segments centered around Z=0 (static arena)
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
	for child in get_children():
		if child is Area3D and child.get("dead") != null and not child.dead:
			if child.position.z >= player.position.z:
				_on_zombie_reached_player(child)
				return

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
	var zombie = zombie_scene.instantiate()
	var lane = randi() % GameConstants.LANE_COUNT
	zombie.position = Vector3(
		GameConstants.LANE_POSITIONS[lane],
		0,
		-GameConstants.ZOMBIE_SPAWN_DISTANCE
	)
	zombie.speed = zombie_speed
	add_child(zombie)

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
	spawn_timer.wait_time = spawn_interval

func _on_zombie_reached_player(_zombie: Node) -> void:
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

func add_score() -> void:
	score += 1
	if hud:
		hud.update_score(score)

func restart_game() -> void:
	for child in get_children():
		if child is Area3D and child.get("dead") != null:
			child.queue_free()
	for child in get_children():
		if child.is_in_group("power_ups"):
			child.queue_free()
	for child in get_tree().root.get_children():
		if child.is_in_group("bullets"):
			child.queue_free()

	score = 0
	game_over = false
	paused = false
	spawn_interval = GameConstants.ZOMBIE_INITIAL_SPAWN_INTERVAL
	zombie_speed = GameConstants.ZOMBIE_INITIAL_SPEED

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

- [ ] **Step 2: Create `scenes/main_strafe.tscn`**

Copy `main.tscn` but change the script reference from `main.gd` to `main_strafe.gd`:

```
[gd_scene load_steps=9 format=3 uid="uid://strafe_scene"]

[ext_resource type="Script" path="res://scripts/main_strafe.gd" id="1_main"]
[ext_resource type="PackedScene" uid="uid://player_scene" path="res://scenes/player.tscn" id="2_player"]
[ext_resource type="Script" path="res://scripts/hud.gd" id="3_hud"]

[sub_resource type="Gradient" id="Gradient_cog"]
colors = PackedColorArray(1, 1, 1, 0.8, 1, 1, 1, 0.8)

[sub_resource type="GradientTexture2D" id="GradientTexture2D_cog"]
width = 64
height = 64
fill_from = Vector2(0.5, 0.5)
fill_to = Vector2(0.5, 0)
fill = 1
gradient = SubResource("Gradient_cog")

[sub_resource type="StyleBoxFlat" id="StyleBoxFlat_pause_bg"]
bg_color = Color(0, 0, 0, 0.7)

[sub_resource type="ProceduralSkyMaterial" id="ProceduralSkyMaterial_sky"]
sky_top_color = Color(0.05, 0.05, 0.15, 1)
sky_horizon_color = Color(0.15, 0.1, 0.3, 1)
ground_bottom_color = Color(0.05, 0.05, 0.1, 1)
ground_horizon_color = Color(0.15, 0.1, 0.3, 1)

[sub_resource type="Sky" id="Sky_main"]
sky_material = SubResource("ProceduralSkyMaterial_sky")

[sub_resource type="Environment" id="Environment_main"]
background_mode = 2
sky = SubResource("Sky_main")
ambient_light_source = 2
ambient_light_color = Color(0.3, 0.3, 0.4, 1)
ambient_light_energy = 1.5

[node name="Main" type="Node3D"]
script = ExtResource("1_main")

[node name="Camera3D" type="Camera3D" parent="."]
transform = Transform3D(1, 0, 0, 0, 0.866025, 0.5, 0, -0.5, 0.866025, 0, 8, 8)
fov = 60.0

[node name="DirectionalLight3D" type="DirectionalLight3D" parent="."]
transform = Transform3D(1, 0, 0, 0, 0.707107, 0.707107, 0, -0.707107, 0.707107, 0, 10, 0)
light_energy = 2.5

[node name="WorldEnvironment" type="WorldEnvironment" parent="."]
environment = SubResource("Environment_main")

[node name="Road" type="Node3D" parent="."]

[node name="Player" parent="." instance=ExtResource("2_player")]

[node name="HUD" type="CanvasLayer" parent="."]
script = ExtResource("3_hud")

[node name="ScoreLabel" type="Label" parent="HUD"]
offset_left = 20.0
offset_top = 20.0
offset_right = 300.0
offset_bottom = 60.0
text = "Score: 0"

[node name="PowerUpLabel" type="Label" parent="HUD"]
visible = false
offset_left = 20.0
offset_top = 60.0
offset_right = 400.0
offset_bottom = 100.0
text = ""

[node name="GameOverPanel" type="PanelContainer" parent="HUD"]
visible = false
anchors_preset = 8
anchor_left = 0.5
anchor_top = 0.5
anchor_right = 0.5
anchor_bottom = 0.5
offset_left = -150.0
offset_top = -60.0
offset_right = 150.0
offset_bottom = 60.0
grow_horizontal = 2
grow_vertical = 2

[node name="FinalScoreLabel" type="Label" parent="HUD/GameOverPanel"]
layout_mode = 2
horizontal_alignment = 1
vertical_alignment = 1
text = "Game Over!"

[node name="PauseButton" type="TextureButton" parent="HUD"]
anchor_left = 1.0
anchor_right = 1.0
anchor_top = 0.0
anchor_bottom = 0.0
offset_left = -74.0
offset_top = 10.0
offset_right = -10.0
offset_bottom = 74.0
texture_normal = SubResource("GradientTexture2D_cog")
stretch_mode = 0

[node name="PauseButtonLabel" type="Label" parent="HUD/PauseButton"]
layout_mode = 1
anchors_preset = 15
anchor_left = 0.0
anchor_top = 0.0
anchor_right = 1.0
anchor_bottom = 1.0
horizontal_alignment = 1
vertical_alignment = 1
text = "⚙"

[node name="PausePanel" type="PanelContainer" parent="HUD"]
visible = false
anchors_preset = 15
anchor_left = 0.0
anchor_top = 0.0
anchor_right = 1.0
anchor_bottom = 1.0
theme_override_styles/panel = SubResource("StyleBoxFlat_pause_bg")

[node name="VBoxContainer" type="VBoxContainer" parent="HUD/PausePanel"]
layout_mode = 2
alignment = 1

[node name="PausedLabel" type="Label" parent="HUD/PausePanel/VBoxContainer"]
layout_mode = 2
horizontal_alignment = 1
text = "PAUSED"

[node name="ResumeButton" type="Button" parent="HUD/PausePanel/VBoxContainer"]
layout_mode = 2
custom_minimum_size = Vector2(200, 50)
size_flags_horizontal = 4
text = "Resume"

[node name="RestartButton" type="Button" parent="HUD/PausePanel/VBoxContainer"]
layout_mode = 2
custom_minimum_size = Vector2(200, 50)
size_flags_horizontal = 4
text = "Restart"
```

- [ ] **Step 3: Run tests to verify they pass**

Run:

```bash
cd games/runner
/Applications/Godot.app/Contents/MacOS/Godot --headless --script addons/gut/gut_cmdln.gd -gtest=res://tests/test_strafe_stage.gd
```

Expected: All 11 tests PASS

- [ ] **Step 4: Commit**

```bash
git add games/runner/scripts/main_strafe.gd games/runner/scenes/main_strafe.tscn
git commit -m "feat: add strafe stage with static arena and zombies from ahead"
```

---

### Task 5: Update Project Entry Point

**Files:**

- Modify: `project.godot:18`

- [ ] **Step 1: Change main scene in `project.godot`**

Change line 18 from:

```
run/main_scene="res://scenes/main.tscn"
```

to:

```
run/main_scene="res://scenes/stage_select.tscn"
```

- [ ] **Step 2: Run all tests to verify nothing is broken**

Run:

```bash
cd games/runner
/Applications/Godot.app/Contents/MacOS/Godot --headless --script addons/gut/gut_cmdln.gd
```

Expected: All tests PASS (existing + new)

- [ ] **Step 3: Commit**

```bash
git add games/runner/project.godot
git commit -m "feat: set stage select as project entry point"
```
