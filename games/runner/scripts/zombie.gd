extends Area3D

var speed: float = GameConstants.ZOMBIE_INITIAL_SPEED
var dead: bool = false
var frame_group: int = 0

@onready var animation_player: AnimationPlayer = $Model/AnimationPlayer
@onready var collision_shape: CollisionShape3D = $CollisionShape3D

var _anim_playing_walk: bool = false

func _ready() -> void:
	area_entered.connect(_on_area_entered)
	_start_walk_animation()

func _start_walk_animation() -> void:
	var anim = animation_player.get_animation("Walk")
	if anim:
		anim.loop_mode = Animation.LOOP_LINEAR
	animation_player.play("Walk")
	_anim_playing_walk = true

func _process(delta: float) -> void:
	if dead:
		return
	position.z += speed * delta
	# LOD: only update animation state on our frame group
	if Engine.get_process_frames() % 3 == frame_group:
		_update_lod()

func _update_lod() -> void:
	var dist = abs(position.z)
	if dist > GameConstants.ZOMBIE_LOD_DISTANCE:
		if _anim_playing_walk:
			animation_player.pause()
			_anim_playing_walk = false
	else:
		if not _anim_playing_walk and not dead:
			animation_player.play("Walk")
			_anim_playing_walk = true

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
	animation_player.play("Death")
	animation_player.animation_finished.connect(_on_death_finished, CONNECT_ONE_SHOT)

func _on_death_finished(_anim: String) -> void:
	var main = _get_main()
	if main and main.has_method("release_zombie"):
		main.release_zombie(self)
	else:
		queue_free()

func reset() -> void:
	dead = false
	visible = true
	set_process(true)
	collision_shape.disabled = false
	_start_walk_animation()

func deactivate() -> void:
	visible = false
	set_process(false)
	collision_shape.disabled = true
	animation_player.stop()
	_anim_playing_walk = false

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
