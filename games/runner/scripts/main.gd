extends Node3D

@onready var camera: Camera3D = $Camera3D
@onready var road: Node3D = $Road
@onready var player: CharacterBody3D = $Player
@onready var hud: CanvasLayer = $HUD

var zombie_scene: PackedScene = preload("res://scenes/zombie.tscn")
var power_up_scene: PackedScene = preload("res://scenes/power_up.tscn")

var score: int = 0
var game_over: bool = false
var paused: bool = false
var road_speed: float = 15.0

var spawn_interval: float = GameConstants.ZOMBIE_INITIAL_SPAWN_INTERVAL
var zombie_speed: float = GameConstants.ZOMBIE_INITIAL_SPEED

var spawn_timer: Timer
var difficulty_timer: Timer
var power_up_spawn_timer: Timer

# Power-up state
var active_power_up_type: int = -1
var power_up_time_remaining: float = 0.0

# Road segment containers (Node3D holding mesh + dashes)
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
	# Remove existing road children placed in the scene
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

	var seg_count := 6
	var dash_spacing := 5.0
	var dashes_per_segment := int(GameConstants.ROAD_SEGMENT_LENGTH / dash_spacing)

	for i in range(seg_count):
		var container := Node3D.new()
		container.name = "RoadSegment%d" % i
		container.position.z = 25.0 - i * GameConstants.ROAD_SEGMENT_LENGTH
		road.add_child(container)

		# Road surface mesh
		var mesh_inst := MeshInstance3D.new()
		mesh_inst.name = "RoadMesh"
		mesh_inst.mesh = road_mesh
		mesh_inst.position.y = -0.05
		container.add_child(mesh_inst)

		# Dashed lane lines at x = -1.5 and 1.5
		for x in [-1.5, 1.5]:
			for d in range(dashes_per_segment):
				var dash := MeshInstance3D.new()
				dash.mesh = dash_mesh
				var local_z = (GameConstants.ROAD_SEGMENT_LENGTH / 2.0) - d * dash_spacing - dash_spacing / 2.0
				dash.position = Vector3(x, 0.06, local_z)
				container.add_child(dash)

		_add_props_to_segment(container)

		road_containers.append(container)

func _create_tree() -> Node3D:
	var tree := Node3D.new()
	tree.name = "Tree"
	tree.add_to_group("props")

	var trunk_mat := StandardMaterial3D.new()
	trunk_mat.albedo_color = Color(0.45, 0.3, 0.15)
	var trunk_mesh := CylinderMesh.new()
	trunk_mesh.top_radius = 0.15
	trunk_mesh.bottom_radius = 0.2
	trunk_mesh.height = 1.5
	trunk_mesh.material = trunk_mat
	var trunk := MeshInstance3D.new()
	trunk.mesh = trunk_mesh
	trunk.position.y = 0.75
	tree.add_child(trunk)

	var foliage_mat := StandardMaterial3D.new()
	foliage_mat.albedo_color = Color(0.15, 0.5, 0.15)
	var foliage_mesh := CylinderMesh.new()
	foliage_mesh.top_radius = 0.0
	foliage_mesh.bottom_radius = 1.0
	foliage_mesh.height = 2.5
	foliage_mesh.material = foliage_mat
	var foliage := MeshInstance3D.new()
	foliage.mesh = foliage_mesh
	foliage.position.y = 2.75
	tree.add_child(foliage)

	return tree

func _create_building() -> Node3D:
	var building := Node3D.new()
	building.name = "Building"
	building.add_to_group("props")

	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.5, 0.45, 0.4)
	var height := randf_range(3.0, 6.0)
	var width := randf_range(2.0, 4.0)
	var depth := randf_range(2.0, 4.0)
	var mesh := BoxMesh.new()
	mesh.size = Vector3(width, height, depth)
	mesh.material = mat
	var inst := MeshInstance3D.new()
	inst.mesh = mesh
	inst.position.y = height / 2.0
	building.add_child(inst)

	return building

func _create_fence(length: float) -> Node3D:
	var fence := Node3D.new()
	fence.name = "Fence"
	fence.add_to_group("props")

	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color(0.6, 0.5, 0.35)
	var mesh := BoxMesh.new()
	mesh.size = Vector3(0.15, 1.0, length)
	mesh.material = mat
	var inst := MeshInstance3D.new()
	inst.mesh = mesh
	inst.position.y = 0.5
	fence.add_child(inst)

	return fence

func _create_lamp_post() -> Node3D:
	var lamp := Node3D.new()
	lamp.name = "LampPost"
	lamp.add_to_group("props")

	var pole_mat := StandardMaterial3D.new()
	pole_mat.albedo_color = Color(0.3, 0.3, 0.3)
	var pole_mesh := CylinderMesh.new()
	pole_mesh.top_radius = 0.05
	pole_mesh.bottom_radius = 0.08
	pole_mesh.height = 4.0
	pole_mesh.material = pole_mat
	var pole := MeshInstance3D.new()
	pole.mesh = pole_mesh
	pole.position.y = 2.0
	lamp.add_child(pole)

	var light_mat := StandardMaterial3D.new()
	light_mat.albedo_color = Color(1.0, 0.95, 0.7)
	light_mat.emission_enabled = true
	light_mat.emission = Color(1.0, 0.95, 0.7)
	light_mat.emission_energy_multiplier = 0.5
	var light_mesh := BoxMesh.new()
	light_mesh.size = Vector3(0.4, 0.15, 0.4)
	light_mesh.material = light_mat
	var light_inst := MeshInstance3D.new()
	light_inst.mesh = light_mesh
	light_inst.position.y = 4.1
	lamp.add_child(light_inst)

	return lamp

func _add_props_to_segment(container: Node3D) -> void:
	var seg_half_z := GameConstants.ROAD_SEGMENT_LENGTH / 2.0
	var road_half_width := GameConstants.ROAD_WIDTH / 2.0

	for side in [-1.0, 1.0]:
		var base_x: float = side * (road_half_width + 2.0)
		var prop_count := randi_range(2, 5)

		for _p in range(prop_count):
			var prop: Node3D
			var prop_type := randi() % 4

			match prop_type:
				0:
					prop = _create_tree()
				1:
					prop = _create_building()
				2:
					prop = _create_fence(randf_range(3.0, 8.0))
				3:
					prop = _create_lamp_post()

			var x_offset: float = randf_range(0.0, 3.0) * side
			var z_pos := randf_range(-seg_half_z, seg_half_z)
			prop.position = Vector3(base_x + x_offset, 0.0, z_pos)
			container.add_child(prop)

func _process(delta: float) -> void:
	if not game_over:
		scroll_road(delta)
		recycle_road_segments()
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
	# Tap to restart on game over
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

func _get_road_segments() -> Array[MeshInstance3D]:
	# For test compatibility: return the RoadMesh children
	var segments: Array[MeshInstance3D] = []
	for container in road_containers:
		var mesh = container.get_node_or_null("RoadMesh")
		if mesh:
			segments.append(mesh)
	return segments

func scroll_road(delta: float) -> void:
	var offset := road_speed * delta
	for container in road_containers:
		container.position.z += offset

func recycle_road_segments() -> void:
	if road_containers.is_empty():
		return
	var min_z := INF
	for c in road_containers:
		if c.position.z < min_z:
			min_z = c.position.z
	for c in road_containers:
		if c.position.z > 50.0:
			c.position.z = min_z - GameConstants.ROAD_SEGMENT_LENGTH

func _on_spawn_timer_timeout() -> void:
	if game_over:
		return
	var zombie = zombie_scene.instantiate()
	var lane = randi() % GameConstants.LANE_COUNT
	zombie.position = Vector3(
		GameConstants.LANE_POSITIONS[lane],
		0,
		player.position.z - GameConstants.ZOMBIE_SPAWN_DISTANCE
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
	# Clear zombies
	for child in get_children():
		if child is Area3D and child.get("dead") != null:
			child.queue_free()
	# Clear power-up barrels
	for child in get_children():
		if child.is_in_group("power_ups"):
			child.queue_free()
	# Clear bullets from root
	for child in get_tree().root.get_children():
		if child.is_in_group("bullets"):
			child.queue_free()

	# Reset state
	score = 0
	game_over = false
	paused = false
	spawn_interval = GameConstants.ZOMBIE_INITIAL_SPAWN_INTERVAL
	zombie_speed = GameConstants.ZOMBIE_INITIAL_SPEED

	# Reset power-up state
	active_power_up_type = -1
	power_up_time_remaining = 0.0
	player.deactivate_power_up()

	# Reset player
	player.current_lane = GameConstants.DEFAULT_LANE
	player.target_x = GameConstants.LANE_POSITIONS[GameConstants.DEFAULT_LANE]
	player.position.x = player.target_x

	# Reset player animation
	player.reset_animation()

	# Restart timers
	spawn_timer.wait_time = spawn_interval
	spawn_timer.start()
	difficulty_timer.start()
	player.shoot_timer.start()
	power_up_spawn_timer.wait_time = randf_range(
		GameConstants.POWER_UP_SPAWN_MIN_INTERVAL,
		GameConstants.POWER_UP_SPAWN_MAX_INTERVAL
	)
	power_up_spawn_timer.start()

	# Reset HUD
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
		player.position.z - GameConstants.ZOMBIE_SPAWN_DISTANCE
	)
	# Randomly pick a power-up type
	power_up.power_up_type = randi() % 2
	add_child(power_up)
	# Schedule next power-up spawn
	power_up_spawn_timer.wait_time = randf_range(
		GameConstants.POWER_UP_SPAWN_MIN_INTERVAL,
		GameConstants.POWER_UP_SPAWN_MAX_INTERVAL
	)
	power_up_spawn_timer.start()

func activate_power_up(type: int) -> void:
	# Deactivate current power-up if any
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
