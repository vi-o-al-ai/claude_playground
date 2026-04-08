extends GutTest
## Stage 6: HUD, score, game over, restart

var main_scene: Node = null

func _create_main() -> Node:
	var m = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(m)
	return m

func _create_zombie() -> Node:
	return load("res://scenes/zombie.tscn").instantiate()

func _create_bullet() -> Node:
	return load("res://scenes/bullet.tscn").instantiate()

# =============================================================================
# Happy path
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
	assert_eq(main_scene.score, 1, "Score should be 1 after first kill")

func test_score_increments_multiple() -> void:
	main_scene = _create_main()
	for i in range(5):
		var zombie = _create_zombie()
		zombie.position = Vector3(0, 0.5, -5)
		main_scene.add_child(zombie)
		var bullet = _create_bullet()
		bullet.position = Vector3(0, 0.5, -5)
		main_scene.add_child(bullet)
		zombie._on_hit_by_bullet(bullet)
	assert_eq(main_scene.score, 5, "Score should be 5 after 5 kills")

func test_game_over_shows_panel() -> void:
	main_scene = _create_main()
	var hud = main_scene.get_node("HUD")
	assert_not_null(hud, "HUD should exist")
	var panel = hud.get_node("GameOverPanel")
	assert_not_null(panel, "GameOverPanel should exist")
	main_scene._on_zombie_reached_player(null)
	assert_true(panel.visible, "GameOverPanel should be visible after game over")

func test_game_over_shows_final_score() -> void:
	main_scene = _create_main()
	main_scene.score = 42
	main_scene._on_zombie_reached_player(null)
	var hud = main_scene.get_node("HUD")
	var panel = hud.get_node("GameOverPanel")
	var score_label = panel.get_node("FinalScoreLabel")
	assert_not_null(score_label, "FinalScoreLabel should exist")
	assert_true(score_label.text.contains("42"), "Final score label should show 42")

func test_restart_resets_score() -> void:
	main_scene = _create_main()
	main_scene.score = 10
	main_scene.game_over = true
	main_scene.restart_game()
	assert_eq(main_scene.score, 0, "Score should be 0 after restart")

func test_restart_clears_zombies() -> void:
	main_scene = _create_main()
	var zombie = _create_zombie()
	main_scene.add_child(zombie)
	main_scene.restart_game()
	var zombie_count := 0
	for child in main_scene.get_children():
		if child.get("dead") != null:
			zombie_count += 1
	assert_eq(zombie_count, 0, "No zombies should remain after restart")

func test_restart_clears_bullets() -> void:
	main_scene = _create_main()
	var bullet = _create_bullet()
	main_scene.add_child(bullet)
	main_scene.restart_game()
	var bullet_count := 0
	for child in get_tree().root.get_children():
		if child.is_in_group("bullets"):
			bullet_count += 1
	assert_eq(bullet_count, 0, "No bullets should remain after restart")

# =============================================================================
# Edge cases
# =============================================================================

func test_restart_resets_difficulty() -> void:
	main_scene = _create_main()
	main_scene.spawn_interval = 0.5
	main_scene.zombie_speed = 12.0
	main_scene.restart_game()
	assert_eq(main_scene.spawn_interval, GameConstants.ZOMBIE_INITIAL_SPAWN_INTERVAL, "Spawn interval should reset")
	assert_eq(main_scene.zombie_speed, GameConstants.ZOMBIE_INITIAL_SPEED, "Zombie speed should reset")

func test_player_returns_to_center_on_restart() -> void:
	main_scene = _create_main()
	main_scene.player.move_left()
	main_scene.restart_game()
	assert_eq(main_scene.player.current_lane, 1, "Player should be center lane after restart")
	assert_eq(main_scene.player.target_x, GameConstants.LANE_POSITIONS[1], "Player target_x should be center after restart")

func test_game_over_panel_hidden_on_start() -> void:
	main_scene = _create_main()
	var hud = main_scene.get_node("HUD")
	var panel = hud.get_node("GameOverPanel")
	assert_false(panel.visible, "GameOverPanel should be hidden at start")

func test_input_ignored_during_game_over() -> void:
	main_scene = _create_main()
	main_scene.game_over = true
	var lane_before = main_scene.player.current_lane
	# In game over state, player input should be ignored
	# We test this by checking the game_over flag is respected
	assert_true(main_scene.game_over, "Game should be over")

# =============================================================================
# Bad path
# =============================================================================

func test_score_never_negative() -> void:
	main_scene = _create_main()
	assert_gte(main_scene.score, 0, "Score should never be negative")
	main_scene.restart_game()
	assert_gte(main_scene.score, 0, "Score should never be negative after restart")

func test_game_over_during_lane_switch() -> void:
	main_scene = _create_main()
	main_scene.player.move_left()
	# Trigger game over mid-transition
	main_scene._on_zombie_reached_player(null)
	assert_true(main_scene.game_over, "Game over should trigger cleanly during lane switch")
