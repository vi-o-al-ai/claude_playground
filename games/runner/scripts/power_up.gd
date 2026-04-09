extends Area3D

var power_up_type: int = GameConstants.POWER_UP_RAPID_FIRE
var hits_remaining: int = GameConstants.POWER_UP_BARREL_HITS
var speed: float = GameConstants.POWER_UP_SPEED
var collected: bool = false

func _ready() -> void:
	add_to_group("power_ups")
	area_entered.connect(_on_area_entered)
	_update_label()

func _process(delta: float) -> void:
	if collected:
		return
	position.z += speed * delta
	var barrel_model = get_node_or_null("BarrelModel")
	if barrel_model:
		barrel_model.rotation.y += speed * delta * 2.0

func _on_area_entered(area: Area3D) -> void:
	if area.is_in_group("bullets"):
		_on_hit_by_bullet(area)

func _on_hit_by_bullet(bullet: Node) -> void:
	if collected:
		return
	bullet.on_hit()
	hits_remaining -= 1
	_update_label()
	if hits_remaining <= 0:
		collected = true
		var main = _get_main()
		if main and not main.game_over:
			main.activate_power_up(power_up_type)
		queue_free()

func _update_label() -> void:
	var label = get_node_or_null("Label3D")
	if label:
		label.text = str(hits_remaining)

func _get_main() -> Node:
	var node = get_tree().root.get_node_or_null("Main")
	if node:
		return node
	var parent = get_parent()
	while parent:
		if parent.get("score") != null:
			return parent
		parent = parent.get_parent()
	return null
