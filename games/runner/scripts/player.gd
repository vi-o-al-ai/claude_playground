extends CharacterBody3D

var current_lane: int = GameConstants.DEFAULT_LANE
var target_x: float = GameConstants.LANE_POSITIONS[GameConstants.DEFAULT_LANE]

var bullet_scene: PackedScene = preload("res://scenes/bullet.tscn")
var shoot_timer: Timer
var multi_lane_active: bool = false

@onready var animation_player: AnimationPlayer = $Model/AnimationPlayer

# Touch input tracking
var touch_start_position: Vector2 = Vector2.ZERO
var is_touching: bool = false
const SWIPE_THRESHOLD: float = 50.0

func _ready() -> void:
	position.x = target_x
	shoot_timer = Timer.new()
	shoot_timer.wait_time = GameConstants.SHOOT_INTERVAL
	shoot_timer.autostart = true
	shoot_timer.timeout.connect(_on_shoot_timer_timeout)
	add_child(shoot_timer)

	var anim = animation_player.get_animation(default_animation)
	if anim:
		anim.loop_mode = Animation.LOOP_LINEAR
	animation_player.play(default_animation)

func _process(delta: float) -> void:
	var was_at_target := is_equal_approx(position.x, target_x)
	position.x = move_toward(position.x, target_x, GameConstants.LANE_SWITCH_SPEED * delta)
	var at_target := is_equal_approx(position.x, target_x)

	if strafe_mode:
		var model = get_node_or_null("Model")
		if not was_at_target and not at_target:
			# Still moving — play walk and lean slightly toward movement direction
			if not _strafe_moving:
				_strafe_moving = true
				_play_looping("Walk_Shoot")
			if model:
				var dir := 1.0 if target_x > position.x else -1.0
				model.rotation.y = dir * 0.4
		elif _strafe_moving and at_target:
			# Just arrived — return to idle facing forward
			_strafe_moving = false
			_play_looping(default_animation)
			if model:
				model.rotation.y = 0.0

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("move_left"):
		move_left()
	elif event.is_action_pressed("move_right"):
		move_right()

	# Touch/swipe input
	if event is InputEventScreenTouch:
		if event.pressed:
			touch_start_position = event.position
			is_touching = true
		else:
			if is_touching:
				_handle_swipe(event.position)
			is_touching = false

func _handle_swipe(end_position: Vector2) -> void:
	var swipe := end_position - touch_start_position
	if absf(swipe.x) > SWIPE_THRESHOLD and absf(swipe.x) > absf(swipe.y):
		if swipe.x < 0:
			move_left()
		else:
			move_right()

func move_left() -> void:
	current_lane = max(current_lane - 1, 0)
	target_x = GameConstants.LANE_POSITIONS[current_lane]

func move_right() -> void:
	current_lane = min(current_lane + 1, GameConstants.LANE_COUNT - 1)
	target_x = GameConstants.LANE_POSITIONS[current_lane]

func activate_rapid_fire() -> void:
	shoot_timer.wait_time = GameConstants.RAPID_FIRE_INTERVAL

func activate_multi_lane() -> void:
	multi_lane_active = true

func deactivate_power_up() -> void:
	shoot_timer.wait_time = GameConstants.SHOOT_INTERVAL
	multi_lane_active = false

func die() -> void:
	if animation_player:
		animation_player.play("Death")

var default_animation: String = "Run_Shoot"
var strafe_mode: bool = false
var _strafe_moving: bool = false

func set_default_animation(anim_name: String) -> void:
	default_animation = anim_name
	strafe_mode = true
	reset_animation()

func reset_animation() -> void:
	_strafe_moving = false
	_play_looping(default_animation)
	var model = get_node_or_null("Model")
	if model:
		model.rotation.y = 0.0

func _play_looping(anim_name: String) -> void:
	if animation_player:
		var anim = animation_player.get_animation(anim_name)
		if anim:
			anim.loop_mode = Animation.LOOP_LINEAR
		animation_player.play(anim_name)

func _on_shoot_timer_timeout() -> void:
	if multi_lane_active:
		for lane_x in GameConstants.LANE_POSITIONS:
			var bullet = bullet_scene.instantiate()
			bullet.position = Vector3(lane_x, 0.8, position.z - 1.0)
			get_tree().root.add_child(bullet)
	else:
		var bullet = bullet_scene.instantiate()
		bullet.position = Vector3(target_x, 0.8, position.z - 1.0)
		get_tree().root.add_child(bullet)
