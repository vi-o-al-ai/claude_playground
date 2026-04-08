extends Area3D

var speed: float = GameConstants.BULLET_SPEED
var lifetime: float = GameConstants.BULLET_LIFETIME
var age: float = 0.0
var expired: bool = false
var hit: bool = false

func _ready() -> void:
	add_to_group("bullets")

func _process(delta: float) -> void:
	if hit:
		return
	position.z -= speed * delta
	age += delta
	if age >= lifetime:
		expired = true
		queue_free()

func on_hit() -> void:
	hit = true
	queue_free()
