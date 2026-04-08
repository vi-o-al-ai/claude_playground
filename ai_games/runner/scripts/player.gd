extends CharacterBody3D

var current_lane: int = GameConstants.DEFAULT_LANE
var target_x: float = GameConstants.LANE_POSITIONS[GameConstants.DEFAULT_LANE]

func _ready() -> void:
	position.x = target_x

func _process(delta: float) -> void:
	position.x = move_toward(position.x, target_x, GameConstants.LANE_SWITCH_SPEED * delta)

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("move_left"):
		move_left()
	elif event.is_action_pressed("move_right"):
		move_right()

func move_left() -> void:
	current_lane = max(current_lane - 1, 0)
	target_x = GameConstants.LANE_POSITIONS[current_lane]

func move_right() -> void:
	current_lane = min(current_lane + 1, GameConstants.LANE_COUNT - 1)
	target_x = GameConstants.LANE_POSITIONS[current_lane]
