extends Node3D

@onready var camera: Camera3D = $Camera3D
@onready var road: Node3D = $Road
@onready var player: CharacterBody3D = $Player

var zombie_scene: PackedScene = preload("res://scenes/zombie.tscn")

var score: int = 0
var game_over: bool = false

var spawn_interval: float = GameConstants.ZOMBIE_INITIAL_SPAWN_INTERVAL
var zombie_speed: float = GameConstants.ZOMBIE_INITIAL_SPEED
var elapsed_time: float = 0.0
var time_since_last_difficulty: float = 0.0

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
