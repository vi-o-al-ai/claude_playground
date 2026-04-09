extends GutTest
## Power-ups: rapid fire and multi-lane shot barrels

var main_scene: Node = null

func _create_main() -> Node:
	var m = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(m)
	return m

func _create_bullet() -> Node:
	var b = load("res://scenes/bullet.tscn").instantiate()
	return b

func _create_power_up(type: int = GameConstants.POWER_UP_RAPID_FIRE) -> Node:
	var p = load("res://scenes/power_up.tscn").instantiate()
	p.power_up_type = type
	return p

# =============================================================================
# Constants
# =============================================================================

func test_power_up_constants_exist() -> void:
	assert_true(GameConstants.POWER_UP_RAPID_FIRE >= 0, "POWER_UP_RAPID_FIRE constant should exist")
	assert_true(GameConstants.POWER_UP_MULTI_LANE >= 0, "POWER_UP_MULTI_LANE constant should exist")

func test_power_up_duration_is_five_seconds() -> void:
	assert_eq(GameConstants.POWER_UP_DURATION, 5.0, "Power-up duration should be 5 seconds")

func test_power_up_spawn_interval_range() -> void:
	assert_gte(GameConstants.POWER_UP_SPAWN_MIN_INTERVAL, 15.0, "Min spawn interval should be >= 15s")
	assert_lte(GameConstants.POWER_UP_SPAWN_MAX_INTERVAL, 20.0, "Max spawn interval should be <= 20s")

func test_rapid_fire_rate_is_double() -> void:
	assert_eq(
		GameConstants.RAPID_FIRE_INTERVAL,
		GameConstants.SHOOT_INTERVAL / 2.0,
		"Rapid fire should halve shoot interval"
	)

func test_barrel_hit_count_is_positive() -> void:
	assert_gt(GameConstants.POWER_UP_BARREL_HITS, 0, "Barrel hit count should be positive")

# =============================================================================
# Barrel movement and spawning
# =============================================================================

func test_power_up_moves_toward_player() -> void:
	main_scene = _create_main()
	var power_up = _create_power_up()
	power_up.position = Vector3(0, 0, -30)
	main_scene.add_child(power_up)
	var start_z = power_up.position.z
	for i in range(10):
		power_up._process(0.016)
	assert_gt(power_up.position.z, start_z, "Power-up barrel should move toward player (positive Z)")

func test_power_up_spawns_in_valid_lane() -> void:
	main_scene = _create_main()
	var power_up = _create_power_up()
	var lane = randi() % GameConstants.LANE_COUNT
	power_up.position.x = GameConstants.LANE_POSITIONS[lane]
	main_scene.add_child(power_up)
	assert_true(
		GameConstants.LANE_POSITIONS.has(power_up.position.x),
		"Power-up should spawn in a valid lane"
	)

func test_power_up_has_type_property() -> void:
	main_scene = _create_main()
	var power_up = _create_power_up(GameConstants.POWER_UP_MULTI_LANE)
	main_scene.add_child(power_up)
	assert_eq(power_up.power_up_type, GameConstants.POWER_UP_MULTI_LANE, "Should store the power-up type")

func test_power_up_has_hits_remaining() -> void:
	main_scene = _create_main()
	var power_up = _create_power_up()
	main_scene.add_child(power_up)
	assert_eq(power_up.hits_remaining, GameConstants.POWER_UP_BARREL_HITS, "Should start with full hit count")

# =============================================================================
# Barrel hit mechanics
# =============================================================================

func test_bullet_decrements_barrel_counter() -> void:
	main_scene = _create_main()
	var power_up = _create_power_up()
	power_up.position = Vector3(0, 0.5, -5)
	main_scene.add_child(power_up)
	var initial_hits = power_up.hits_remaining
	var bullet = _create_bullet()
	bullet.position = Vector3(0, 0.5, -5)
	main_scene.add_child(bullet)
	power_up._on_hit_by_bullet(bullet)
	assert_eq(power_up.hits_remaining, initial_hits - 1, "Hit should decrement barrel counter")

func test_bullet_destroyed_on_barrel_hit() -> void:
	main_scene = _create_main()
	var power_up = _create_power_up()
	power_up.position = Vector3(0, 0.5, -5)
	main_scene.add_child(power_up)
	var bullet = _create_bullet()
	bullet.position = Vector3(0, 0.5, -5)
	main_scene.add_child(bullet)
	power_up._on_hit_by_bullet(bullet)
	assert_true(bullet.hit, "Bullet should be marked as hit after hitting barrel")

func test_barrel_collected_when_hits_reach_zero() -> void:
	main_scene = _create_main()
	var power_up = _create_power_up()
	power_up.position = Vector3(0, 0.5, -5)
	main_scene.add_child(power_up)
	# Hit the barrel until counter reaches zero
	for i in range(GameConstants.POWER_UP_BARREL_HITS):
		var bullet = _create_bullet()
		bullet.position = Vector3(0, 0.5, -5)
		main_scene.add_child(bullet)
		power_up._on_hit_by_bullet(bullet)
	assert_true(power_up.collected, "Barrel should be collected when hits reach zero")

func test_barrel_not_collected_with_hits_remaining() -> void:
	main_scene = _create_main()
	var power_up = _create_power_up()
	power_up.position = Vector3(0, 0.5, -5)
	main_scene.add_child(power_up)
	# Hit once (not enough to collect)
	var bullet = _create_bullet()
	bullet.position = Vector3(0, 0.5, -5)
	main_scene.add_child(bullet)
	power_up._on_hit_by_bullet(bullet)
	assert_false(power_up.collected, "Barrel should not be collected with hits remaining")

# =============================================================================
# Rapid fire power-up
# =============================================================================

func test_rapid_fire_halves_shoot_interval() -> void:
	main_scene = _create_main()
	main_scene.player.activate_rapid_fire()
	assert_eq(
		main_scene.player.shoot_timer.wait_time,
		GameConstants.RAPID_FIRE_INTERVAL,
		"Rapid fire should halve the shoot timer interval"
	)

func test_rapid_fire_deactivation_restores_interval() -> void:
	main_scene = _create_main()
	main_scene.player.activate_rapid_fire()
	main_scene.player.deactivate_power_up()
	assert_eq(
		main_scene.player.shoot_timer.wait_time,
		GameConstants.SHOOT_INTERVAL,
		"Deactivating should restore normal shoot interval"
	)

# =============================================================================
# Multi-lane shot power-up
# =============================================================================

func test_multi_lane_flag_set_on_activation() -> void:
	main_scene = _create_main()
	main_scene.player.activate_multi_lane()
	assert_true(main_scene.player.multi_lane_active, "Multi-lane flag should be set")

func test_multi_lane_deactivation_clears_flag() -> void:
	main_scene = _create_main()
	main_scene.player.activate_multi_lane()
	main_scene.player.deactivate_power_up()
	assert_false(main_scene.player.multi_lane_active, "Multi-lane flag should be cleared on deactivation")

func test_multi_lane_fires_three_bullets() -> void:
	main_scene = _create_main()
	main_scene.player.activate_multi_lane()
	# Count bullets before and after a shot
	var bullets_before := 0
	for child in get_tree().root.get_children():
		if child.is_in_group("bullets"):
			bullets_before += 1
	main_scene.player._on_shoot_timer_timeout()
	var bullets_after := 0
	for child in get_tree().root.get_children():
		if child.is_in_group("bullets"):
			bullets_after += 1
	assert_eq(bullets_after - bullets_before, 3, "Multi-lane should fire 3 bullets (one per lane)")

func test_normal_shot_fires_one_bullet() -> void:
	main_scene = _create_main()
	var bullets_before := 0
	for child in get_tree().root.get_children():
		if child.is_in_group("bullets"):
			bullets_before += 1
	main_scene.player._on_shoot_timer_timeout()
	var bullets_after := 0
	for child in get_tree().root.get_children():
		if child.is_in_group("bullets"):
			bullets_after += 1
	assert_eq(bullets_after - bullets_before, 1, "Normal shot should fire 1 bullet")

# =============================================================================
# Power-up state management (main.gd)
# =============================================================================

func test_active_power_up_starts_null() -> void:
	main_scene = _create_main()
	assert_eq(main_scene.active_power_up_type, -1, "No power-up should be active at start")

func test_activate_power_up_sets_state() -> void:
	main_scene = _create_main()
	main_scene.activate_power_up(GameConstants.POWER_UP_RAPID_FIRE)
	assert_eq(main_scene.active_power_up_type, GameConstants.POWER_UP_RAPID_FIRE, "Active power-up type should be set")
	assert_gt(main_scene.power_up_time_remaining, 0.0, "Power-up time remaining should be positive")

func test_power_up_duration_counts_down() -> void:
	main_scene = _create_main()
	main_scene.activate_power_up(GameConstants.POWER_UP_RAPID_FIRE)
	var initial_time = main_scene.power_up_time_remaining
	main_scene._process_power_up_timer(1.0)
	assert_lt(main_scene.power_up_time_remaining, initial_time, "Time remaining should decrease")

func test_power_up_expires_after_duration() -> void:
	main_scene = _create_main()
	main_scene.activate_power_up(GameConstants.POWER_UP_RAPID_FIRE)
	# Fast-forward past duration
	main_scene._process_power_up_timer(GameConstants.POWER_UP_DURATION + 0.1)
	assert_eq(main_scene.active_power_up_type, -1, "Power-up should expire after duration")

func test_new_power_up_replaces_current() -> void:
	main_scene = _create_main()
	main_scene.activate_power_up(GameConstants.POWER_UP_RAPID_FIRE)
	main_scene.activate_power_up(GameConstants.POWER_UP_MULTI_LANE)
	assert_eq(
		main_scene.active_power_up_type,
		GameConstants.POWER_UP_MULTI_LANE,
		"New power-up should replace current"
	)

func test_replacing_power_up_resets_timer() -> void:
	main_scene = _create_main()
	main_scene.activate_power_up(GameConstants.POWER_UP_RAPID_FIRE)
	main_scene._process_power_up_timer(3.0)  # 3s into first power-up
	main_scene.activate_power_up(GameConstants.POWER_UP_MULTI_LANE)
	assert_eq(
		main_scene.power_up_time_remaining,
		GameConstants.POWER_UP_DURATION,
		"Replacing power-up should reset timer to full duration"
	)

# =============================================================================
# HUD display
# =============================================================================

func test_hud_shows_active_power_up() -> void:
	main_scene = _create_main()
	main_scene.activate_power_up(GameConstants.POWER_UP_RAPID_FIRE)
	var label = main_scene.hud.get_node_or_null("PowerUpLabel")
	assert_not_null(label, "HUD should have a PowerUpLabel")
	assert_true(label.visible, "PowerUpLabel should be visible when power-up is active")

func test_hud_hides_power_up_when_inactive() -> void:
	main_scene = _create_main()
	var label = main_scene.hud.get_node_or_null("PowerUpLabel")
	assert_not_null(label, "HUD should have a PowerUpLabel")
	assert_false(label.visible, "PowerUpLabel should be hidden when no power-up is active")

func test_hud_power_up_label_shows_name() -> void:
	main_scene = _create_main()
	main_scene.activate_power_up(GameConstants.POWER_UP_RAPID_FIRE)
	var label = main_scene.hud.get_node_or_null("PowerUpLabel")
	assert_string_contains(label.text, "Rapid Fire", "Label should show power-up name")

# =============================================================================
# Game flow integration
# =============================================================================

func test_restart_clears_active_power_up() -> void:
	main_scene = _create_main()
	main_scene.activate_power_up(GameConstants.POWER_UP_RAPID_FIRE)
	main_scene.restart_game()
	assert_eq(main_scene.active_power_up_type, -1, "Restart should clear active power-up")
	assert_false(main_scene.player.multi_lane_active, "Restart should clear multi-lane flag")
	assert_eq(
		main_scene.player.shoot_timer.wait_time,
		GameConstants.SHOOT_INTERVAL,
		"Restart should restore normal shoot interval"
	)

func test_game_over_stops_power_up_timer() -> void:
	main_scene = _create_main()
	main_scene.activate_power_up(GameConstants.POWER_UP_RAPID_FIRE)
	var zombie = load("res://scenes/zombie.tscn").instantiate()
	zombie.position = Vector3(0, 0, main_scene.player.position.z)
	main_scene.add_child(zombie)
	main_scene._on_zombie_reached_player(zombie)
	# Power-up timer should not keep counting down after game over
	var time_at_game_over = main_scene.power_up_time_remaining
	main_scene._process_power_up_timer(1.0)
	assert_eq(
		main_scene.power_up_time_remaining,
		time_at_game_over,
		"Power-up timer should not count down after game over"
	)

func test_power_up_barrel_cleaned_on_restart() -> void:
	main_scene = _create_main()
	var power_up = _create_power_up()
	power_up.position = Vector3(0, 0, -20)
	main_scene.add_child(power_up)
	main_scene.restart_game()
	# Power-ups should be queued for deletion (check group)
	var power_ups_remaining := 0
	for child in main_scene.get_children():
		if child.is_in_group("power_ups"):
			if not child.is_queued_for_deletion():
				power_ups_remaining += 1
	assert_eq(power_ups_remaining, 0, "All power-up barrels should be cleaned up on restart")
