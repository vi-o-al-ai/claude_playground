extends GutTest
## Tests for player model animations (soldier character)

var main_scene: Node = null

func _create_main() -> Node:
	var m = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(m)
	return m

func _get_animation_player(player: Node) -> AnimationPlayer:
	return player.animation_player

# =============================================================================
# Happy path
# =============================================================================

func test_player_has_animation_player() -> void:
	main_scene = _create_main()
	var anim_player = _get_animation_player(main_scene.player)
	assert_not_null(anim_player, "Player should have an AnimationPlayer from the imported model")

func test_player_plays_run_shoot_on_start() -> void:
	main_scene = _create_main()
	var anim_player = _get_animation_player(main_scene.player)
	assert_not_null(anim_player, "AnimationPlayer should exist")
	assert_eq(anim_player.current_animation, "Run_Shoot", "Player should play Run_Shoot animation on start")

func test_run_shoot_animation_loops() -> void:
	main_scene = _create_main()
	var anim_player = _get_animation_player(main_scene.player)
	assert_not_null(anim_player, "AnimationPlayer should exist")
	var anim = anim_player.get_animation("Run_Shoot")
	assert_not_null(anim, "Run_Shoot animation should exist")
	assert_eq(anim.loop_mode, Animation.LOOP_LINEAR, "Run_Shoot animation should be set to loop")

func test_player_plays_death_on_game_over() -> void:
	main_scene = _create_main()
	main_scene._on_zombie_reached_player(null)
	var anim_player = _get_animation_player(main_scene.player)
	assert_not_null(anim_player, "AnimationPlayer should exist")
	assert_eq(anim_player.current_animation, "Death", "Player should play Death animation on game over")

func test_player_resumes_run_shoot_after_restart() -> void:
	main_scene = _create_main()
	main_scene._on_zombie_reached_player(null)
	main_scene.restart_game()
	var anim_player = _get_animation_player(main_scene.player)
	assert_not_null(anim_player, "AnimationPlayer should exist")
	assert_eq(anim_player.current_animation, "Run_Shoot", "Player should play Run_Shoot after restart")

# =============================================================================
# Edge cases
# =============================================================================

func test_die_called_multiple_times_does_not_crash() -> void:
	main_scene = _create_main()
	main_scene.player.die()
	main_scene.player.die()
	var anim_player = _get_animation_player(main_scene.player)
	assert_eq(anim_player.current_animation, "Death", "Death animation should still be playing after multiple die calls")

func test_reset_animation_after_multiple_deaths() -> void:
	main_scene = _create_main()
	main_scene._on_zombie_reached_player(null)
	main_scene.restart_game()
	main_scene._on_zombie_reached_player(null)
	main_scene.restart_game()
	var anim_player = _get_animation_player(main_scene.player)
	assert_eq(anim_player.current_animation, "Run_Shoot", "Run_Shoot should play after multiple death/restart cycles")

# =============================================================================
# Bad path
# =============================================================================

func test_player_has_model_node() -> void:
	main_scene = _create_main()
	var model = main_scene.player.get_node_or_null("Model")
	assert_not_null(model, "Player should have a Model child node")

func test_player_has_collision_shape() -> void:
	main_scene = _create_main()
	var collision = main_scene.player.get_node_or_null("CollisionShape3D")
	assert_not_null(collision, "Player should still have a CollisionShape3D")
