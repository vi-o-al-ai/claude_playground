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
