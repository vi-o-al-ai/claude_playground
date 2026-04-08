extends Node3D

@onready var camera: Camera3D = $Camera3D
@onready var road: Node3D = $Road
@onready var player: CharacterBody3D = $Player
@onready var hud: CanvasLayer = $HUD

var zombie_scene: PackedScene = preload("res://scenes/zombie.tscn")

var score: int = 0
var game_over: bool = false

var spawn_interval: float = GameConstants.ZOMBIE_INITIAL_SPAWN_INTERVAL
var zombie_speed: float = GameConstants.ZOMBIE_INITIAL_SPEED

var spawn_timer: Timer
var difficulty_timer: Timer

func _ready() -> void:
	spawn_timer = Timer.new()
	spawn_timer.wait_time = spawn_interval
	spawn_timer.autostart = true
	spawn_timer.timeout.connect(_on_spawn_timer_timeout)
	add_child(spawn_timer)

	difficulty_timer = Timer.new()
	difficulty_timer.wait_time = GameConstants.DIFFICULTY_INCREASE_INTERVAL
	difficulty_timer.autostart = true
	difficulty_timer.timeout.connect(_on_difficulty_timer_timeout)
	add_child(difficulty_timer)

func _process(_delta: float) -> void:
	if game_over:
		return
	for child in get_children():
		if child is Area3D and child.get("dead") != null and not child.dead:
			if child.position.z >= player.position.z:
				_on_zombie_reached_player(child)
				return

func _unhandled_input(event: InputEvent) -> void:
	if game_over and event.is_action_pressed("restart"):
		restart_game()

func _on_spawn_timer_timeout() -> void:
	if game_over:
		return
	var zombie = zombie_scene.instantiate()
	var lane = randi() % GameConstants.LANE_COUNT
	zombie.position = Vector3(
		GameConstants.LANE_POSITIONS[lane],
		0,
		player.position.z - GameConstants.ZOMBIE_SPAWN_DISTANCE
	)
	zombie.speed = zombie_speed
	add_child(zombie)

func _on_difficulty_timer_timeout() -> void:
	if game_over:
		return
	spawn_interval = max(
		spawn_interval * GameConstants.DIFFICULTY_MULTIPLIER,
		GameConstants.ZOMBIE_MIN_SPAWN_INTERVAL
	)
	zombie_speed = min(
		zombie_speed * (1.0 + GameConstants.SPEED_INCREASE),
		GameConstants.ZOMBIE_MAX_SPEED
	)
	spawn_timer.wait_time = spawn_interval

func _on_zombie_reached_player(_zombie: Node) -> void:
	if game_over:
		return
	game_over = true
	spawn_timer.stop()
	difficulty_timer.stop()
	player.shoot_timer.stop()
	if hud:
		hud.show_game_over(score)

func add_score() -> void:
	score += 1
	if hud:
		hud.update_score(score)

func restart_game() -> void:
	# Clear zombies
	for child in get_children():
		if child is Area3D and child.get("dead") != null:
			child.queue_free()
	# Clear bullets from root
	for child in get_tree().root.get_children():
		if child.is_in_group("bullets"):
			child.queue_free()

	# Reset state
	score = 0
	game_over = false
	spawn_interval = GameConstants.ZOMBIE_INITIAL_SPAWN_INTERVAL
	zombie_speed = GameConstants.ZOMBIE_INITIAL_SPEED

	# Reset player
	player.current_lane = GameConstants.DEFAULT_LANE
	player.target_x = GameConstants.LANE_POSITIONS[GameConstants.DEFAULT_LANE]
	player.position.x = player.target_x

	# Restart timers
	spawn_timer.wait_time = spawn_interval
	spawn_timer.start()
	difficulty_timer.start()
	player.shoot_timer.start()

	# Reset HUD
	if hud:
		hud.hide_game_over()
		hud.update_score(0)
