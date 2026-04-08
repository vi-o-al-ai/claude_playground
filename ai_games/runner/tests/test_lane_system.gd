extends GutTest
## Stage 1: Lane system constants + road/camera setup
## Stage 2: Player lane switching (added later)

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
	var segment = road.get_node("RoadSegment")
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
