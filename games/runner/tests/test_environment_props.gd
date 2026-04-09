extends GutTest
## Issue #42: Environment props (trees, buildings, fences, lamp posts)

# =============================================================================
# Props exist on road segments
# =============================================================================

func test_road_segments_have_props() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(main_scene)
	for container in main_scene.road_containers:
		var prop_count := _count_props(container)
		assert_gt(prop_count, 0, "Each road segment should have environment props")

func test_props_are_outside_road_bounds() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(main_scene)
	var road_half_width := GameConstants.ROAD_WIDTH / 2.0
	for container in main_scene.road_containers:
		for child in container.get_children():
			if child.is_in_group("props"):
				assert_gt(abs(child.position.x), road_half_width,
					"Prop should be outside road bounds (|x| > %f), got x=%f" % [road_half_width, child.position.x])

func test_props_on_both_sides_of_road() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(main_scene)
	var left_count := 0
	var right_count := 0
	for container in main_scene.road_containers:
		for child in container.get_children():
			if child.is_in_group("props"):
				if child.position.x < 0:
					left_count += 1
				else:
					right_count += 1
	assert_gt(left_count, 0, "Should have props on left side of road")
	assert_gt(right_count, 0, "Should have props on right side of road")

# =============================================================================
# Prop types
# =============================================================================

func test_multiple_prop_types_exist() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(main_scene)
	var types := {}
	for container in main_scene.road_containers:
		for child in container.get_children():
			if child.is_in_group("props"):
				types[child.name.get_slice("_", 0)] = true
	assert_gte(types.size(), 2, "Should have at least 2 different prop types, got: %s" % str(types.keys()))

func test_tree_prop_has_trunk_and_foliage() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(main_scene)
	var tree := _find_first_prop_by_prefix(main_scene, "Tree")
	assert_not_null(tree, "Should have at least one Tree prop")
	if tree:
		assert_gte(tree.get_child_count(), 2, "Tree should have at least trunk and foliage meshes")

func test_lamp_post_has_emissive_light() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(main_scene)
	var lamp := _find_first_prop_by_prefix(main_scene, "LampPost")
	assert_not_null(lamp, "Should have at least one LampPost prop")
	if lamp:
		var found_emissive := false
		for child in lamp.get_children():
			if child is MeshInstance3D and child.mesh and child.mesh.material:
				var mat = child.mesh.material
				if mat is StandardMaterial3D and mat.emission_enabled:
					found_emissive = true
					break
		assert_true(found_emissive, "Lamp post should have an emissive light mesh")

# =============================================================================
# Props recycle with road segments
# =============================================================================

func test_props_stay_with_segment_during_scroll() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(main_scene)
	var container = main_scene.road_containers[0]
	var prop := _find_first_prop_in_container(container)
	assert_not_null(prop, "Segment should have a prop")
	if prop:
		var rel_pos_before = prop.position
		main_scene.scroll_road(0.1)
		assert_eq(prop.position, rel_pos_before, "Prop local position should not change during scroll (moves with parent)")

func test_props_survive_segment_recycle() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(main_scene)
	var container = main_scene.road_containers[0]
	var prop_count_before := _count_props(container)
	container.position.z = 100.0
	main_scene.recycle_road_segments()
	var prop_count_after := _count_props(container)
	assert_eq(prop_count_after, prop_count_before, "Props should survive segment recycling")

# =============================================================================
# Props within segment Z bounds
# =============================================================================

func test_props_within_segment_z_bounds() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(main_scene)
	var seg_half_z := GameConstants.ROAD_SEGMENT_LENGTH / 2.0
	for container in main_scene.road_containers:
		for child in container.get_children():
			if child.is_in_group("props"):
				assert_lte(abs(child.position.z), seg_half_z,
					"Prop Z position should be within segment bounds")

# =============================================================================
# Helpers
# =============================================================================

func _count_props(container: Node3D) -> int:
	var count := 0
	for child in container.get_children():
		if child.is_in_group("props"):
			count += 1
	return count

func _find_first_prop_by_prefix(main_scene: Node3D, prefix: String) -> Node3D:
	for container in main_scene.road_containers:
		for child in container.get_children():
			if child.is_in_group("props") and child.name.begins_with(prefix):
				return child
	return null

func _find_first_prop_in_container(container: Node3D) -> Node3D:
	for child in container.get_children():
		if child.is_in_group("props"):
			return child
	return null
