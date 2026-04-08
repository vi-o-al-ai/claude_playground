extends Area3D

var speed: float = GameConstants.BULLET_SPEED
var lifetime: float = GameConstants.BULLET_LIFETIME
var age: float = 0.0
var expired: bool = false

func _process(delta: float) -> void:
	position.z -= speed * delta
	age += delta
	if age >= lifetime:
		expired = true
		queue_free()
