extends Node

var zombie_scene: PackedScene = preload("res://scenes/zombie.tscn")
var pool_size: int = GameConstants.ZOMBIE_POOL_SIZE

var _inactive: Array[Area3D] = []
var _active: Array[Area3D] = []
var _next_frame_group: int = 0

func _ready() -> void:
	for i in range(pool_size):
		var zombie = zombie_scene.instantiate()
		add_child(zombie)
		zombie.deactivate()
		_inactive.append(zombie)

func acquire() -> Area3D:
	if _inactive.is_empty():
		return null
	var zombie = _inactive.pop_back()
	zombie.frame_group = _next_frame_group
	_next_frame_group = (_next_frame_group + 1) % 3
	zombie.reset()
	_active.append(zombie)
	return zombie

func release(zombie: Area3D) -> void:
	zombie.deactivate()
	_active.erase(zombie)
	if zombie not in _inactive:
		_inactive.append(zombie)

func release_all() -> void:
	for zombie in _active.duplicate():
		release(zombie)

func get_active_count() -> int:
	return _active.size()

func get_active_zombies() -> Array[Area3D]:
	return _active
