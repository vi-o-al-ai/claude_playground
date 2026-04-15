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
