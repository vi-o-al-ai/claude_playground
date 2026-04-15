extends GutTest
## Stage 5: Bullet-zombie and zombie-player collision

var main_scene: Node = null

func _create_main() -> Node:
	var m = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(m)
	return m

func _create_zombie() -> Node:
	var z = load("res://scenes/zombie.tscn").instantiate()
	return z

func _create_bullet() -> Node:
	var b = load("res://scenes/bullet.tscn").instantiate()
	return b

# =============================================================================
# Happy path
# =============================================================================

func test_bullet_destroys_zombie() -> void:
	main_scene = _create_main()
	var zombie = _create_zombie()
	zombie.position = Vector3(0, 0.5, -5)
	main_scene.add_child(zombie)
	var bullet = _create_bullet()
	bullet.position = Vector3(0, 0.5, -5)
	main_scene.add_child(bullet)
	# Bullet and zombie overlap — after physics processes, zombie should be hit
	# We call the collision handler directly since physics won't run in test
	zombie._on_hit_by_bullet(bullet)
	assert_true(zombie.dead, "Zombie should be marked dead after bullet hit")

func test_bullet_destroyed_on_hit() -> void:
	main_scene = _create_main()
	var zombie = _create_zombie()
	zombie.position = Vector3(0, 0.5, -5)
	main_scene.add_child(zombie)
	var bullet = _create_bullet()
	bullet.position = Vector3(0, 0.5, -5)
	main_scene.add_child(bullet)
	zombie._on_hit_by_bullet(bullet)
	assert_true(bullet.hit, "Bullet should be marked as hit after collision")

func test_zombie_reaching_player_emits_game_over() -> void:
	main_scene = _create_main()
	var zombie = _create_zombie()
	# Place zombie right at the player position
	zombie.position = Vector3(0, 0, main_scene.player.position.z)
	main_scene.add_child(zombie)
	main_scene._on_zombie_reached_player(zombie)
	assert_true(main_scene.game_over, "Game should be over when zombie reaches player")

# =============================================================================
# Edge cases
# =============================================================================

func test_bullet_misses_zombie_different_lane() -> void:
	# Bullet in lane 0 (x=-3), zombie in lane 2 (x=3): no collision
	# This is a logic check — lanes are 6 units apart, collision shapes are ~0.4 radius
	var separation = abs(GameConstants.LANE_POSITIONS[0] - GameConstants.LANE_POSITIONS[2])
	assert_gt(separation, 1.0, "Lanes 0 and 2 should be far enough apart to avoid cross-lane hits")

func test_bullet_misses_zombie_adjacent_lane() -> void:
	var separation = abs(GameConstants.LANE_POSITIONS[0] - GameConstants.LANE_POSITIONS[1])
	assert_gt(separation, 1.0, "Adjacent lanes should be far enough apart to avoid cross-lane hits")

func test_zombie_reaches_player_during_lane_switch() -> void:
	main_scene = _create_main()
	main_scene.player.move_left()
	# Player is mid-transition (current_lane changed but position.x hasn't lerped yet)
	var zombie = _create_zombie()
	zombie.position = Vector3(0, 0, main_scene.player.position.z)
	main_scene.add_child(zombie)
	# Game over should still trigger based on Z proximity, not lane matching
	main_scene._on_zombie_reached_player(zombie)
	assert_true(main_scene.game_over, "Game over should trigger regardless of lane transition state")

# =============================================================================
# Bad path
# =============================================================================

func test_dead_zombie_not_hit_again() -> void:
	main_scene = _create_main()
	var zombie = _create_zombie()
	zombie.position = Vector3(0, 0.5, -5)
	main_scene.add_child(zombie)
	var bullet1 = _create_bullet()
	bullet1.position = Vector3(0, 0.5, -5)
	main_scene.add_child(bullet1)
	zombie._on_hit_by_bullet(bullet1)
	var score_after_first = main_scene.score
	# Second bullet hits same zombie
	var bullet2 = _create_bullet()
	bullet2.position = Vector3(0, 0.5, -5)
	main_scene.add_child(bullet2)
	zombie._on_hit_by_bullet(bullet2)
	assert_eq(main_scene.score, score_after_first, "Score should not increment for already-dead zombie")

func test_game_over_only_fires_once() -> void:
	main_scene = _create_main()
	var z1 = _create_zombie()
	var z2 = _create_zombie()
	z1.position = Vector3(0, 0, main_scene.player.position.z)
	z2.position = Vector3(3, 0, main_scene.player.position.z)
	main_scene.add_child(z1)
	main_scene.add_child(z2)
	main_scene._on_zombie_reached_player(z1)
	main_scene._on_zombie_reached_player(z2)
	# game_over should be true but no crash or double-trigger
	assert_true(main_scene.game_over, "Game over should be set")

func test_no_collision_after_game_over() -> void:
	main_scene = _create_main()
	main_scene.game_over = true
	var zombie = _create_zombie()
	zombie.position = Vector3(0, 0.5, -5)
	main_scene.add_child(zombie)
	var bullet = _create_bullet()
	bullet.position = Vector3(0, 0.5, -5)
	main_scene.add_child(bullet)
	var score_before = main_scene.score
	zombie._on_hit_by_bullet(bullet)
	assert_eq(main_scene.score, score_before, "Score should not change after game over")
