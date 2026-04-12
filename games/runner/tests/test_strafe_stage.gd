extends GutTest
## Tests for the strafe stage (static arena, zombies from ahead)

var main_scene: Node = null

func _create_main() -> Node:
	var m = load("res://scenes/main_strafe.tscn").instantiate()
	add_child_autofree(m)
	return m

func _create_zombie() -> Node:
	return load("res://scenes/zombie.tscn").instantiate()

func _create_bullet() -> Node:
	return load("res://scenes/bullet.tscn").instantiate()

# =============================================================================
# Happy path — static road
# =============================================================================

func test_road_segments_do_not_move() -> void:
	main_scene = _create_main()
	var initial_positions: Array[float] = []
	for container in main_scene.road_containers:
		initial_positions.append(container.position.z)
	# Simulate several frames
	for i in range(10):
		main_scene._process(0.1)
	for i in range(main_scene.road_containers.size()):
		assert_eq(
			main_scene.road_containers[i].position.z,
			initial_positions[i],
			"Road segment %d should not move" % i
		)

func test_player_z_stays_at_zero() -> void:
	main_scene = _create_main()
	assert_eq(main_scene.player.position.z, 0.0, "Player Z should be 0")
	for i in range(10):
		main_scene._process(0.1)
	assert_eq(main_scene.player.position.z, 0.0, "Player Z should remain 0 after processing")

# =============================================================================
# Happy path — zombie spawning
# =============================================================================

func test_zombies_spawn_ahead_of_player() -> void:
	main_scene = _create_main()
	main_scene._on_spawn_timer_timeout()
	var zombie_found := false
	for child in main_scene.get_children():
		if child is Area3D and child.get("dead") != null:
			assert_lt(child.position.z, 0.0, "Zombie should spawn at negative Z (ahead)")
			zombie_found = true
	assert_true(zombie_found, "A zombie should have been spawned")

func test_zombies_move_toward_player() -> void:
	main_scene = _create_main()
	main_scene._on_spawn_timer_timeout()
	var zombie: Node = null
	for child in main_scene.get_children():
		if child is Area3D and child.get("dead") != null:
			zombie = child
			break
	assert_not_null(zombie, "Zombie should exist")
	var initial_z = zombie.position.z
	zombie._process(0.5)
	assert_gt(zombie.position.z, initial_z, "Zombie should move toward player (Z increasing)")

# =============================================================================
# Happy path — shared mechanics work
# =============================================================================

func test_score_starts_at_zero() -> void:
	main_scene = _create_main()
	assert_eq(main_scene.score, 0, "Score should start at 0")

func test_score_increments_on_kill() -> void:
	main_scene = _create_main()
	var zombie = _create_zombie()
	zombie.position = Vector3(0, 0.5, -5)
	main_scene.add_child(zombie)
	var bullet = _create_bullet()
	bullet.position = Vector3(0, 0.5, -5)
	main_scene.add_child(bullet)
	zombie._on_hit_by_bullet(bullet)
	assert_eq(main_scene.score, 1, "Score should be 1 after kill")

func test_game_over_when_zombie_reaches_player() -> void:
	main_scene = _create_main()
	main_scene._on_zombie_reached_player(null)
	assert_true(main_scene.game_over, "Game should be over")
	var hud = main_scene.get_node("HUD")
	var panel = hud.get_node("GameOverPanel")
	assert_true(panel.visible, "GameOverPanel should be visible")

func test_lane_switching_works() -> void:
	main_scene = _create_main()
	assert_eq(main_scene.player.current_lane, 1, "Player starts center")
	main_scene.player.move_left()
	assert_eq(main_scene.player.current_lane, 0, "Player should be in left lane")
	main_scene.player.move_right()
	assert_eq(main_scene.player.current_lane, 1, "Player should be back in center")

func test_restart_resets_state() -> void:
	main_scene = _create_main()
	main_scene.score = 10
	main_scene.game_over = true
	main_scene.restart_game()
	assert_eq(main_scene.score, 0, "Score should reset")
	assert_false(main_scene.game_over, "Game over should be false")

# =============================================================================
# Edge cases
# =============================================================================

func test_difficulty_increases_over_time() -> void:
	main_scene = _create_main()
	var initial_interval = main_scene.spawn_interval
	main_scene._on_difficulty_timer_timeout()
	assert_lt(main_scene.spawn_interval, initial_interval, "Spawn interval should decrease")

func test_no_road_scroll_method() -> void:
	main_scene = _create_main()
	# Strafe stage should not have scroll_road — verify road stays static
	assert_false(main_scene.has_method("scroll_road"), "Strafe stage should not have scroll_road method")
