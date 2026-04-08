extends Area3D

var speed: float = GameConstants.ZOMBIE_INITIAL_SPEED

func _process(delta: float) -> void:
	position.z += speed * delta
