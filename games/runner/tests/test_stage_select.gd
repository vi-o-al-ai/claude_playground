extends GutTest
## Tests for the stage select screen

var stage_select: Control = null

func _create_stage_select() -> Control:
	var s = load("res://scenes/stage_select.tscn").instantiate()
	add_child_autofree(s)
	return s

# =============================================================================
# Happy path
# =============================================================================

func test_title_label_exists() -> void:
	stage_select = _create_stage_select()
	var title = stage_select.get_node("VBoxContainer/TitleLabel")
	assert_not_null(title, "Title label should exist")
	assert_true(title.text.contains("Zombie"), "Title should contain game name")

func test_stage1_button_exists_and_visible() -> void:
	stage_select = _create_stage_select()
	var btn = stage_select.get_node("VBoxContainer/Stage1Button")
	assert_not_null(btn, "Stage 1 button should exist")
	assert_true(btn.visible, "Stage 1 button should be visible")
	assert_true(btn.text.contains("Runner"), "Stage 1 button should mention Runner")

func test_stage2_button_exists_and_visible() -> void:
	stage_select = _create_stage_select()
	var btn = stage_select.get_node("VBoxContainer/Stage2Button")
	assert_not_null(btn, "Stage 2 button should exist")
	assert_true(btn.visible, "Stage 2 button should be visible")
	assert_true(btn.text.contains("Strafe"), "Stage 2 button should mention Strafe")

# =============================================================================
# Edge cases
# =============================================================================

func test_buttons_are_focusable() -> void:
	stage_select = _create_stage_select()
	var btn1 = stage_select.get_node("VBoxContainer/Stage1Button")
	var btn2 = stage_select.get_node("VBoxContainer/Stage2Button")
	assert_eq(btn1.focus_mode, Control.FOCUS_ALL, "Stage 1 button should be focusable")
	assert_eq(btn2.focus_mode, Control.FOCUS_ALL, "Stage 2 button should be focusable")
