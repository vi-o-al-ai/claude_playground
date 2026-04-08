extends GutTest
## Stage 1: Lane system constants + road/camera setup
## Stage 2: Player lane switching

var player: Node = null

func _create_player() -> Node:
	var p = load("res://scenes/player.tscn").instantiate()
	add_child_autofree(p)
	return p

# --- Stage 1: Happy path ---

func test_lane_positions_are_correct() -> void:
	assert_eq(
		GameConstants.LANE_POSITIONS,
		[-3.0, 0.0, 3.0] as Array[float],
		"Lane positions should be [-3, 0, 3]"
	)

func test_three_lanes_defined() -> void:
	assert_eq(
		GameConstants.LANE_COUNT, 3,
		"There should be exactly 3 lanes"
	)
	assert_eq(
		GameConstants.LANE_POSITIONS.size(), 3,
		"LANE_POSITIONS array should have 3 entries"
	)

func test_road_segment_exists() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child(main_scene)
	var road = main_scene.get_node("Road")
	assert_not_null(road, "Road node should exist")
	# Road segments are now Node3D containers with a RoadMesh child
	var segment: MeshInstance3D = null
	for child in road.get_children():
		if child.name.begins_with("RoadSegment"):
			var mesh = child.get_node_or_null("RoadMesh")
			if mesh is MeshInstance3D:
				segment = mesh
				break
	assert_not_null(segment, "RoadSegment should exist under Road")
	assert_true(segment is MeshInstance3D, "RoadSegment should be a MeshInstance3D")
	assert_true(segment.visible, "RoadSegment should be visible")
	main_scene.queue_free()

func test_camera_positioned_behind_player() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child(main_scene)
	var camera = main_scene.get_node("Camera3D")
	assert_not_null(camera, "Camera3D should exist")
	# Camera should be behind (positive Z) and above (positive Y) the origin
	assert_gt(camera.position.z, 0.0, "Camera Z should be positive (behind player at origin)")
	assert_gt(camera.position.y, 0.0, "Camera Y should be positive (above the road)")
	main_scene.queue_free()

# --- Stage 1: Edge cases ---

func test_lane_positions_are_symmetric() -> void:
	var left = GameConstants.LANE_POSITIONS[0]
	var right = GameConstants.LANE_POSITIONS[2]
	assert_eq(left, -right, "Left lane should be the negative of right lane (symmetric)")

func test_center_lane_is_zero() -> void:
	assert_eq(
		GameConstants.LANE_POSITIONS[1], 0.0,
		"Center lane position should be 0"
	)

# --- Stage 1: Bad path ---

func test_lane_positions_not_empty() -> void:
	assert_gt(
		GameConstants.LANE_POSITIONS.size(), 0,
		"LANE_POSITIONS should not be empty"
	)

func test_lane_positions_sorted() -> void:
	var positions = GameConstants.LANE_POSITIONS
	for i in range(positions.size() - 1):
		assert_lt(
			positions[i], positions[i + 1],
			"LANE_POSITIONS should be sorted ascending: index %d (%f) < index %d (%f)" % [
				i, positions[i], i + 1, positions[i + 1]
			]
		)

# =============================================================================
# Stage 2: Player lane switching
# =============================================================================

# --- Happy path ---

func test_player_starts_center_lane() -> void:
	player = _create_player()
	assert_eq(player.current_lane, 1, "Player should start in center lane (index 1)")
	assert_eq(player.position.x, 0.0, "Player X should be 0 (center lane)")

func test_move_left_decrements_lane() -> void:
	player = _create_player()
	player.move_left()
	assert_eq(player.current_lane, 0, "After move_left from center, lane should be 0")

func test_move_right_increments_lane() -> void:
	player = _create_player()
	player.move_right()
	assert_eq(player.current_lane, 2, "After move_right from center, lane should be 2")

func test_target_x_matches_lane_position() -> void:
	player = _create_player()
	assert_eq(player.target_x, GameConstants.LANE_POSITIONS[1], "Initial target_x should match center lane")
	player.move_left()
	assert_eq(player.target_x, GameConstants.LANE_POSITIONS[0], "After move_left, target_x should match left lane")
	player.move_right()
	player.move_right()
	assert_eq(player.target_x, GameConstants.LANE_POSITIONS[2], "After move to right, target_x should match right lane")

func test_move_left_then_right_returns_center() -> void:
	player = _create_player()
	player.move_left()
	assert_eq(player.current_lane, 0, "Should be in left lane")
	player.move_right()
	assert_eq(player.current_lane, 1, "Should return to center lane")

# --- Edge cases ---

func test_cannot_move_left_past_lane_0() -> void:
	player = _create_player()
	player.move_left()  # lane 0
	player.move_left()  # should stay at 0
	assert_eq(player.current_lane, 0, "Should not go below lane 0")
	assert_eq(player.target_x, GameConstants.LANE_POSITIONS[0], "target_x should stay at left lane")

func test_cannot_move_right_past_lane_2() -> void:
	player = _create_player()
	player.move_right()  # lane 2
	player.move_right()  # should stay at 2
	assert_eq(player.current_lane, 2, "Should not go above lane 2")
	assert_eq(player.target_x, GameConstants.LANE_POSITIONS[2], "target_x should stay at right lane")

func test_rapid_left_right_input() -> void:
	player = _create_player()
	# Rapidly alternate: should end up back at center without glitching
	player.move_left()
	player.move_right()
	player.move_left()
	player.move_right()
	assert_eq(player.current_lane, 1, "Rapid L-R-L-R should end at center")
	assert_eq(player.target_x, GameConstants.LANE_POSITIONS[1], "target_x should be center after rapid input")

func test_lane_switch_during_transition() -> void:
	player = _create_player()
	player.move_left()
	# Simulate a partial frame — position hasn't caught up yet
	# Input during transition should update target, not snap
	player.move_right()
	assert_eq(player.current_lane, 1, "Lane index should update immediately on second input")
	assert_eq(player.target_x, GameConstants.LANE_POSITIONS[1], "target_x should update to new lane")

# --- Bad path ---

func test_lane_index_never_negative() -> void:
	player = _create_player()
	for i in range(10):
		player.move_left()
	assert_gte(player.current_lane, 0, "Lane index should never go negative after 10x move_left")

func test_lane_index_never_exceeds_max() -> void:
	player = _create_player()
	for i in range(10):
		player.move_right()
	assert_lte(player.current_lane, 2, "Lane index should never exceed 2 after 10x move_right")
