extends GutTest
## Touch/swipe input controls for mobile

var player: Node = null
var main_scene: Node = null

func _create_player() -> Node:
	var p = load("res://scenes/player.tscn").instantiate()
	add_child_autofree(p)
	return p

func _create_main() -> Node:
	var m = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(m)
	return m

# =============================================================================
# Player touch properties
# =============================================================================

func test_player_has_touch_start_position() -> void:
	player = _create_player()
	assert_eq(player.touch_start_position, Vector2.ZERO, "Touch start position should default to Vector2.ZERO")

func test_player_has_is_touching_flag() -> void:
	player = _create_player()
	assert_false(player.is_touching, "is_touching should default to false")

func test_player_has_swipe_threshold() -> void:
	player = _create_player()
	assert_eq(player.SWIPE_THRESHOLD, 50.0, "Swipe threshold should be 50 pixels")

# =============================================================================
# Swipe handling — happy path
# =============================================================================

func test_swipe_left_moves_player_left() -> void:
	player = _create_player()
	# Start at center lane (1)
	assert_eq(player.current_lane, 1)
	# Simulate swipe: start at 300, end at 200 (dx = -100, well past threshold)
	player.touch_start_position = Vector2(300, 200)
	player._handle_swipe(Vector2(200, 200))
	assert_eq(player.current_lane, 0, "Swipe left should move player to left lane")

func test_swipe_right_moves_player_right() -> void:
	player = _create_player()
	assert_eq(player.current_lane, 1)
	player.touch_start_position = Vector2(200, 200)
	player._handle_swipe(Vector2(350, 200))
	assert_eq(player.current_lane, 2, "Swipe right should move player to right lane")

func test_swipe_left_updates_target_x() -> void:
	player = _create_player()
	player.touch_start_position = Vector2(300, 200)
	player._handle_swipe(Vector2(200, 200))
	assert_eq(player.target_x, GameConstants.LANE_POSITIONS[0], "target_x should match left lane after swipe left")

func test_swipe_right_updates_target_x() -> void:
	player = _create_player()
	player.touch_start_position = Vector2(200, 200)
	player._handle_swipe(Vector2(350, 200))
	assert_eq(player.target_x, GameConstants.LANE_POSITIONS[2], "target_x should match right lane after swipe right")

# =============================================================================
# Swipe handling — edge cases
# =============================================================================

func test_swipe_below_threshold_ignored() -> void:
	player = _create_player()
	# Swipe only 30px — below 50px threshold
	player.touch_start_position = Vector2(200, 200)
	player._handle_swipe(Vector2(230, 200))
	assert_eq(player.current_lane, 1, "Small swipe should not change lane")

func test_swipe_exactly_at_threshold_ignored() -> void:
	player = _create_player()
	# Swipe exactly 50px — not greater than threshold
	player.touch_start_position = Vector2(200, 200)
	player._handle_swipe(Vector2(250, 200))
	assert_eq(player.current_lane, 1, "Swipe exactly at threshold should not change lane")

func test_swipe_just_above_threshold_triggers() -> void:
	player = _create_player()
	# Swipe 51px — just past threshold
	player.touch_start_position = Vector2(200, 200)
	player._handle_swipe(Vector2(251, 200))
	assert_eq(player.current_lane, 2, "Swipe just above threshold should change lane")

func test_vertical_swipe_ignored() -> void:
	player = _create_player()
	# Mostly vertical swipe (dx=30, dy=100)
	player.touch_start_position = Vector2(200, 200)
	player._handle_swipe(Vector2(230, 300))
	assert_eq(player.current_lane, 1, "Vertical swipe should not change lane")

func test_diagonal_swipe_with_more_vertical_ignored() -> void:
	player = _create_player()
	# Diagonal but more vertical (dx=60, dy=80)
	player.touch_start_position = Vector2(200, 200)
	player._handle_swipe(Vector2(260, 280))
	assert_eq(player.current_lane, 1, "Diagonal swipe with more vertical distance should be ignored")

func test_diagonal_swipe_with_more_horizontal_triggers() -> void:
	player = _create_player()
	# Diagonal but more horizontal (dx=80, dy=30)
	player.touch_start_position = Vector2(200, 200)
	player._handle_swipe(Vector2(280, 230))
	assert_eq(player.current_lane, 2, "Diagonal swipe with more horizontal distance should trigger")

func test_swipe_left_at_lane_0_stays() -> void:
	player = _create_player()
	player.move_left()  # go to lane 0
	assert_eq(player.current_lane, 0)
	player.touch_start_position = Vector2(300, 200)
	player._handle_swipe(Vector2(200, 200))
	assert_eq(player.current_lane, 0, "Swipe left at lane 0 should stay at lane 0")

func test_swipe_right_at_max_lane_stays() -> void:
	player = _create_player()
	player.move_right()  # go to lane 2
	assert_eq(player.current_lane, 2)
	player.touch_start_position = Vector2(200, 200)
	player._handle_swipe(Vector2(350, 200))
	assert_eq(player.current_lane, 2, "Swipe right at max lane should stay at max lane")

# =============================================================================
# Touch event state tracking
# =============================================================================

func test_touch_press_sets_start_position() -> void:
	player = _create_player()
	var touch = InputEventScreenTouch.new()
	touch.pressed = true
	touch.position = Vector2(400, 300)
	player._unhandled_input(touch)
	assert_eq(player.touch_start_position, Vector2(400, 300), "Touch press should record start position")
	assert_true(player.is_touching, "is_touching should be true after press")

func test_touch_release_clears_is_touching() -> void:
	player = _create_player()
	# Simulate press
	player.is_touching = true
	player.touch_start_position = Vector2(400, 300)
	# Simulate release at same position (no swipe)
	var touch = InputEventScreenTouch.new()
	touch.pressed = false
	touch.position = Vector2(400, 300)
	player._unhandled_input(touch)
	assert_false(player.is_touching, "is_touching should be false after release")

func test_touch_release_without_press_ignored() -> void:
	player = _create_player()
	# Release without prior press
	assert_false(player.is_touching)
	var touch = InputEventScreenTouch.new()
	touch.pressed = false
	touch.position = Vector2(300, 200)
	player._unhandled_input(touch)
	assert_eq(player.current_lane, 1, "Release without press should not change lane")

# =============================================================================
# Tap to restart (main.gd)
# =============================================================================

func test_tap_restarts_game_when_game_over() -> void:
	main_scene = _create_main()
	main_scene.score = 10
	main_scene._on_zombie_reached_player(null)
	assert_true(main_scene.game_over, "Game should be over")
	# Simulate tap release
	var touch = InputEventScreenTouch.new()
	touch.pressed = false
	touch.position = Vector2(400, 300)
	main_scene._unhandled_input(touch)
	assert_false(main_scene.game_over, "Game should restart after tap")
	assert_eq(main_scene.score, 0, "Score should reset after tap restart")

func test_tap_does_not_restart_during_gameplay() -> void:
	main_scene = _create_main()
	assert_false(main_scene.game_over)
	main_scene.score = 5
	# Tap during active game
	var touch = InputEventScreenTouch.new()
	touch.pressed = false
	touch.position = Vector2(400, 300)
	main_scene._unhandled_input(touch)
	assert_eq(main_scene.score, 5, "Score should not reset from tap during gameplay")
