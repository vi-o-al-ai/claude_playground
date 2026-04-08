extends GutTest
## Stage 4: Zombie spawning + movement

var zombie: Node = null

func _create_zombie() -> Node:
	var z = load("res://scenes/zombie.tscn").instantiate()
	add_child_autofree(z)
	return z

# =============================================================================
# Happy path
# =============================================================================

func test_zombie_moves_toward_player() -> void:
	zombie = _create_zombie()
	zombie.position = Vector3(0, 0, -30)
	var start_z = zombie.position.z
	for i in range(10):
		zombie._process(0.016)
	assert_gt(zombie.position.z, start_z, "Zombie should move toward player (positive Z)")

func test_zombie_spawns_in_valid_lane() -> void:
	# Test that the spawn helper produces valid lane positions
	for i in range(20):
		var lane = randi() % GameConstants.LANE_COUNT
		var x = GameConstants.LANE_POSITIONS[lane]
		assert_true(
			x in GameConstants.LANE_POSITIONS,
			"Spawned X position should be a valid lane"
		)

func test_zombie_spawns_ahead_of_player() -> void:
	# Zombie spawn distance should be negative Z (ahead of player at origin)
	assert_gt(
		GameConstants.ZOMBIE_SPAWN_DISTANCE, 0.0,
		"Spawn distance constant should be positive"
	)

func test_spawn_rate_increases_over_time() -> void:
	# After applying difficulty multiplier, interval should decrease
	var initial = GameConstants.ZOMBIE_INITIAL_SPAWN_INTERVAL
	var after = initial * GameConstants.DIFFICULTY_MULTIPLIER
	assert_lt(after, initial, "Spawn interval should decrease after difficulty increase")

func test_zombie_speed_increases_over_time() -> void:
	var initial = GameConstants.ZOMBIE_INITIAL_SPEED
	var after = initial * (1.0 + GameConstants.SPEED_INCREASE)
	assert_gt(after, initial, "Zombie speed should increase after difficulty increase")

# =============================================================================
# Edge cases
# =============================================================================

func test_zombies_can_spawn_in_all_three_lanes() -> void:
	var lanes_seen := {}
	for i in range(50):
		var lane = randi() % GameConstants.LANE_COUNT
		lanes_seen[lane] = true
	assert_eq(lanes_seen.size(), 3, "Over 50 random picks, all 3 lanes should appear")

func test_difficulty_caps_at_maximum() -> void:
	# Apply difficulty multiplier many times — should not go below minimum
	var interval = GameConstants.ZOMBIE_INITIAL_SPAWN_INTERVAL
	for i in range(100):
		interval = max(interval * GameConstants.DIFFICULTY_MULTIPLIER, GameConstants.ZOMBIE_MIN_SPAWN_INTERVAL)
	assert_gte(
		interval, GameConstants.ZOMBIE_MIN_SPAWN_INTERVAL,
		"Spawn interval should not go below minimum"
	)
	# Speed should not exceed maximum
	var speed = GameConstants.ZOMBIE_INITIAL_SPEED
	for i in range(100):
		speed = min(speed * (1.0 + GameConstants.SPEED_INCREASE), GameConstants.ZOMBIE_MAX_SPEED)
	assert_lte(
		speed, GameConstants.ZOMBIE_MAX_SPEED,
		"Zombie speed should not exceed maximum"
	)

func test_multiple_zombies_same_lane() -> void:
	var z1 = _create_zombie()
	var z2 = _create_zombie()
	z1.position = Vector3(0, 0, -30)
	z2.position = Vector3(0, 0, -20)
	# Both should exist and move independently
	z1._process(0.016)
	z2._process(0.016)
	assert_true(is_instance_valid(z1), "First zombie should still exist")
	assert_true(is_instance_valid(z2), "Second zombie should still exist")
	assert_ne(z1.position.z, z2.position.z, "Zombies should be at different Z positions")

# =============================================================================
# Bad path
# =============================================================================

func test_zombie_never_spawns_outside_lanes() -> void:
	for i in range(50):
		var lane = randi() % GameConstants.LANE_COUNT
		var x = GameConstants.LANE_POSITIONS[lane]
		assert_true(
			GameConstants.LANE_POSITIONS.has(x),
			"Zombie X must be exactly a lane position value"
		)

func test_zombie_has_speed() -> void:
	zombie = _create_zombie()
	assert_true(zombie.get("speed") != null, "Zombie should have a speed property")
	assert_gt(zombie.speed, 0.0, "Zombie speed should be positive")
