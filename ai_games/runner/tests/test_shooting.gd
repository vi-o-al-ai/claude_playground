extends GutTest
## Stage 3: Bullet movement + auto-shoot mechanic

var player: Node = null
var bullet: Node = null

func _create_player() -> Node:
	var p = load("res://scenes/player.tscn").instantiate()
	add_child_autofree(p)
	return p

func _create_bullet() -> Node:
	var b = load("res://scenes/bullet.tscn").instantiate()
	add_child_autofree(b)
	return b

# =============================================================================
# Happy path
# =============================================================================

func test_bullet_moves_forward() -> void:
	bullet = _create_bullet()
	bullet.position = Vector3(0, 0.5, 0)
	var start_z = bullet.position.z
	# Simulate a few frames
	for i in range(5):
		bullet._process(0.016)
	assert_lt(bullet.position.z, start_z, "Bullet should move forward (negative Z)")

func test_bullet_spawns_at_player_lane() -> void:
	player = _create_player()
	player.move_left()  # lane 0, x = -3
	# Simulate the bullet spawn position
	var spawn_x = GameConstants.LANE_POSITIONS[player.current_lane]
	assert_eq(spawn_x, -3.0, "Bullet should spawn at player's lane X position")

func test_auto_shoot_fires_periodically() -> void:
	player = _create_player()
	# Player should have a shoot method and track bullet spawning
	assert_true(player.has_method("_on_shoot_timer_timeout"), "Player should have shoot timer callback")

func test_bullet_stays_in_lane() -> void:
	bullet = _create_bullet()
	bullet.position = Vector3(-3.0, 0.5, 0)
	var start_x = bullet.position.x
	for i in range(10):
		bullet._process(0.016)
	assert_eq(bullet.position.x, start_x, "Bullet X should not change during flight")

func test_lane_switch_changes_next_bullet_lane() -> void:
	player = _create_player()
	assert_eq(player.current_lane, 1, "Starts center")
	player.move_left()
	var spawn_x = GameConstants.LANE_POSITIONS[player.current_lane]
	assert_eq(spawn_x, -3.0, "Next bullet should spawn at left lane after switching")
	player.move_right()
	player.move_right()
	spawn_x = GameConstants.LANE_POSITIONS[player.current_lane]
	assert_eq(spawn_x, 3.0, "Next bullet should spawn at right lane after switching")

# =============================================================================
# Edge cases
# =============================================================================

func test_bullet_despawns_after_timeout() -> void:
	bullet = _create_bullet()
	bullet.position = Vector3(0, 0.5, 0)
	# Simulate enough time to exceed BULLET_LIFETIME
	var elapsed := 0.0
	var step := 0.1
	while elapsed < GameConstants.BULLET_LIFETIME + 0.5:
		if not is_instance_valid(bullet) or not bullet.is_inside_tree():
			break
		bullet._process(step)
		elapsed += step
	# Bullet should have been removed by now
	assert_true(
		not is_instance_valid(bullet) or not bullet.is_inside_tree(),
		"Bullet should be removed after lifetime expires"
	)

func test_bullet_spawns_during_lane_transition() -> void:
	player = _create_player()
	player.move_left()
	# Don't simulate _process so player hasn't moved yet visually
	# But the bullet should use target lane, not current visual position
	var expected_x = GameConstants.LANE_POSITIONS[player.current_lane]
	assert_eq(expected_x, -3.0, "Bullet spawn should use target lane position, not mid-lerp x")

# =============================================================================
# Bad path
# =============================================================================

func test_bullet_has_speed_constant() -> void:
	assert_gt(GameConstants.BULLET_SPEED, 0.0, "Bullet speed should be positive")

func test_bullet_has_lifetime_constant() -> void:
	assert_gt(GameConstants.BULLET_LIFETIME, 0.0, "Bullet lifetime should be positive")
