extends GutTest
## Pause menu: toggle, overlay, buttons, game freeze, cog wheel for touch

var main_scene: Node = null

func _create_main() -> Node:
	var m = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(m)
	return m

# =============================================================================
# Pause toggle via keyboard
# =============================================================================

func test_pause_input_action_exists() -> void:
	assert_true(InputMap.has_action("pause"), "pause input action should exist")

func test_escape_toggles_pause() -> void:
	main_scene = _create_main()
	assert_false(main_scene.paused, "Game should not start paused")
	main_scene.toggle_pause()
	assert_true(main_scene.paused, "Game should be paused after toggle")
	main_scene.toggle_pause()
	assert_false(main_scene.paused, "Game should be unpaused after second toggle")

func test_pause_sets_tree_paused() -> void:
	main_scene = _create_main()
	main_scene.toggle_pause()
	assert_true(main_scene.get_tree().paused, "SceneTree should be paused")
	main_scene.toggle_pause()
	assert_false(main_scene.get_tree().paused, "SceneTree should be unpaused")

# =============================================================================
# Pause overlay UI
# =============================================================================

func test_pause_panel_exists() -> void:
	main_scene = _create_main()
	var pause_panel = main_scene.hud.get_node_or_null("PausePanel")
	assert_not_null(pause_panel, "HUD should have a PausePanel node")

func test_pause_panel_hidden_by_default() -> void:
	main_scene = _create_main()
	var pause_panel = main_scene.hud.get_node("PausePanel")
	assert_false(pause_panel.visible, "PausePanel should be hidden by default")

func test_pause_panel_visible_when_paused() -> void:
	main_scene = _create_main()
	main_scene.toggle_pause()
	var pause_panel = main_scene.hud.get_node("PausePanel")
	assert_true(pause_panel.visible, "PausePanel should be visible when paused")

func test_pause_panel_hidden_when_resumed() -> void:
	main_scene = _create_main()
	main_scene.toggle_pause()
	main_scene.toggle_pause()
	var pause_panel = main_scene.hud.get_node("PausePanel")
	assert_false(pause_panel.visible, "PausePanel should be hidden after resume")

func test_pause_panel_has_paused_label() -> void:
	main_scene = _create_main()
	var label = main_scene.hud.get_node_or_null("PausePanel/VBoxContainer/PausedLabel")
	assert_not_null(label, "PausePanel should have a PausedLabel")
	assert_eq(label.text, "PAUSED", "Label should say PAUSED")

func test_pause_panel_has_resume_button() -> void:
	main_scene = _create_main()
	var btn = main_scene.hud.get_node_or_null("PausePanel/VBoxContainer/ResumeButton")
	assert_not_null(btn, "PausePanel should have a ResumeButton")

func test_pause_panel_has_restart_button() -> void:
	main_scene = _create_main()
	var btn = main_scene.hud.get_node_or_null("PausePanel/VBoxContainer/RestartButton")
	assert_not_null(btn, "PausePanel should have a RestartButton")

# =============================================================================
# Resume and Restart buttons
# =============================================================================

func test_resume_button_unpauses() -> void:
	main_scene = _create_main()
	main_scene.toggle_pause()
	assert_true(main_scene.paused)
	main_scene.hud._on_resume_pressed()
	assert_false(main_scene.paused, "Resume should unpause the game")
	assert_false(main_scene.get_tree().paused, "SceneTree should be unpaused after resume")

func test_restart_button_restarts_game() -> void:
	main_scene = _create_main()
	main_scene.score = 42
	main_scene.toggle_pause()
	main_scene.hud._on_restart_pressed()
	assert_false(main_scene.paused, "Game should not be paused after restart")
	assert_eq(main_scene.score, 0, "Score should reset after restart")
	assert_false(main_scene.game_over, "Game over should be false after restart")

# =============================================================================
# Pause not available during game over
# =============================================================================

func test_cannot_pause_during_game_over() -> void:
	main_scene = _create_main()
	main_scene._on_zombie_reached_player(null)
	assert_true(main_scene.game_over)
	main_scene.toggle_pause()
	assert_false(main_scene.paused, "Should not be able to pause during game over")

# =============================================================================
# Cog wheel button for touch devices
# =============================================================================

func test_pause_button_exists() -> void:
	main_scene = _create_main()
	var btn = main_scene.hud.get_node_or_null("PauseButton")
	assert_not_null(btn, "HUD should have a PauseButton (cog wheel)")

func test_pause_button_positioned_top_right() -> void:
	main_scene = _create_main()
	var btn: TextureButton = main_scene.hud.get_node("PauseButton")
	# Anchors should place it in top-right
	assert_eq(btn.anchor_right, 1.0, "PauseButton should be anchored to right")
	assert_eq(btn.anchor_top, 0.0, "PauseButton should be anchored to top")

func test_pause_button_toggles_pause() -> void:
	main_scene = _create_main()
	assert_false(main_scene.paused)
	main_scene.hud._on_pause_button_pressed()
	assert_true(main_scene.paused, "Pause button should toggle pause on")
	main_scene.hud._on_pause_button_pressed()
	assert_false(main_scene.paused, "Pause button should toggle pause off")

func test_pause_button_hidden_during_game_over() -> void:
	main_scene = _create_main()
	main_scene._on_zombie_reached_player(null)
	var btn = main_scene.hud.get_node("PauseButton")
	assert_false(btn.visible, "Pause button should be hidden during game over")

func test_pause_button_visible_during_gameplay() -> void:
	main_scene = _create_main()
	var btn = main_scene.hud.get_node("PauseButton")
	assert_true(btn.visible, "Pause button should be visible during gameplay")

func test_pause_button_visible_after_restart() -> void:
	main_scene = _create_main()
	main_scene._on_zombie_reached_player(null)
	main_scene.restart_game()
	var btn = main_scene.hud.get_node("PauseButton")
	assert_true(btn.visible, "Pause button should be visible after restart")

# =============================================================================
# HUD process mode (must work while paused)
# =============================================================================

func test_hud_process_mode_always() -> void:
	main_scene = _create_main()
	assert_eq(main_scene.hud.process_mode, Node.PROCESS_MODE_ALWAYS, "HUD should have process_mode ALWAYS to work during pause")
