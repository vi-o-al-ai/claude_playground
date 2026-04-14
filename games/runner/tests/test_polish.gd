extends GutTest
## Stage 7: Polish tests

# =============================================================================
# 7a: Road scrolling illusion
# =============================================================================

func test_multiple_road_segments_exist() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(main_scene)
	var road = main_scene.get_node("Road")
	var segment_count := 0
	for child in road.get_children():
		if child.name.begins_with("RoadSegment"):
			segment_count += 1
	assert_gte(segment_count, GameConstants.ROAD_SEGMENT_COUNT, "Road should have at least %d segments" % GameConstants.ROAD_SEGMENT_COUNT)

func test_road_segments_are_contiguous() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(main_scene)
	var containers: Array[Node3D] = []
	for child in main_scene.get_node("Road").get_children():
		if child.name.begins_with("RoadSegment"):
			containers.append(child)
	containers.sort_custom(func(a, b): return a.position.z < b.position.z)
	for i in range(containers.size() - 1):
		var gap = abs(containers[i + 1].position.z - containers[i].position.z)
		assert_almost_eq(gap, GameConstants.ROAD_SEGMENT_LENGTH, 1.0, "Road segments should be spaced by segment length")

func test_road_has_scroll_speed() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(main_scene)
	assert_true(main_scene.get("road_speed") != null, "Main should have road_speed property")
	assert_gt(main_scene.road_speed, 0.0, "Road speed should be positive")

func test_road_segments_move_toward_player() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(main_scene)
	var first_container: Node3D = main_scene.road_containers[0]
	var start_z = first_container.position.z
	main_scene.scroll_road(0.1)
	assert_gt(first_container.position.z, start_z, "Road segment should move toward player (positive Z)")

func test_road_segment_recycles_when_behind_camera() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(main_scene)
	var container = main_scene.road_containers[0]
	container.position.z = 100.0
	main_scene.recycle_road_segments()
	assert_lt(container.position.z, 0.0, "Segment behind camera should recycle to front")

# =============================================================================
# 7b: Lane line markings (dashes are children of each road segment container)
# =============================================================================

func test_lane_dividers_exist() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(main_scene)
	# Each road segment container should have dash meshes as children
	var first_container = main_scene.road_containers[0]
	var dash_count := 0
	for child in first_container.get_children():
		if child is MeshInstance3D and child != first_container.get_node("RoadMesh"):
			dash_count += 1
	assert_gte(dash_count, 2, "Should have at least 2 lane divider dashes per segment")

# =============================================================================
# Green ground on both sides of road
# =============================================================================

func test_road_segments_have_ground_planes() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(main_scene)
	var container = main_scene.road_containers[0]
	var left_ground = container.get_node_or_null("GroundLeft")
	var right_ground = container.get_node_or_null("GroundRight")
	assert_not_null(left_ground, "Road segment should have left ground plane")
	assert_not_null(right_ground, "Road segment should have right ground plane")

func test_ground_planes_are_green() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(main_scene)
	var container = main_scene.road_containers[0]
	var left_ground: MeshInstance3D = container.get_node("GroundLeft")
	var mat: StandardMaterial3D = left_ground.mesh.material
	# Should be greenish (G component higher than R and B)
	assert_gt(mat.albedo_color.g, mat.albedo_color.r, "Ground should be green (G > R)")
	assert_gt(mat.albedo_color.g, mat.albedo_color.b, "Ground should be green (G > B)")

# =============================================================================
# 7c: Zombie bob animation
# =============================================================================

func test_zombie_has_walk_animation() -> void:
	var zombie = load("res://scenes/zombie.tscn").instantiate()
	add_child_autofree(zombie)
	assert_eq(zombie.animation_player.current_animation, "Walk", "Zombie should play Walk animation")

# =============================================================================
# 7d: Environment (sky gradient)
# =============================================================================

func test_world_environment_exists() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(main_scene)
	var env = main_scene.get_node_or_null("WorldEnvironment")
	assert_not_null(env, "WorldEnvironment node should exist")
