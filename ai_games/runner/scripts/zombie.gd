extends Area3D

var speed: float = GameConstants.ZOMBIE_INITIAL_SPEED
var dead: bool = false

func _ready() -> void:
	area_entered.connect(_on_area_entered)

func _process(delta: float) -> void:
	if dead:
		return
	position.z += speed * delta

func _on_area_entered(area: Area3D) -> void:
	if area.is_in_group("bullets"):
		_on_hit_by_bullet(area)

func _on_hit_by_bullet(bullet: Node) -> void:
	if dead:
		return
	dead = true
	bullet.on_hit()
	var main = _get_main()
	if main and not main.game_over:
		if main.has_method("add_score"):
			main.add_score()
		else:
			main.score += 1
	queue_free()

func _get_main() -> Node:
	var node = get_tree().root.get_node_or_null("Main")
	if node:
		return node
	# In test scenes, walk up to find a node with a score property
	var parent = get_parent()
	while parent:
		if parent.get("score") != null:
			return parent
		parent = parent.get_parent()
	return null
