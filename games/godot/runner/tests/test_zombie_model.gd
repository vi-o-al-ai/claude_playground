extends GutTest
## Tests for zombie enemy model and animations

var zombie: Node = null

func _create_zombie() -> Node:
	var z = load("res://scenes/zombie.tscn").instantiate()
	add_child_autofree(z)
	return z

func _create_bullet() -> Node:
	return load("res://scenes/bullet.tscn").instantiate()

func _get_animation_player(z: Node) -> AnimationPlayer:
	return z.animation_player

# =============================================================================
# Happy path
# =============================================================================

func test_zombie_has_model_node() -> void:
	zombie = _create_zombie()
	var model = zombie.get_node_or_null("Model")
	assert_not_null(model, "Zombie should have a Model child node")

func test_zombie_has_animation_player() -> void:
	zombie = _create_zombie()
	var anim_player = _get_animation_player(zombie)
	assert_not_null(anim_player, "Zombie should have an AnimationPlayer from the imported model")

func test_zombie_plays_walk_on_start() -> void:
	zombie = _create_zombie()
	var anim_player = _get_animation_player(zombie)
	assert_eq(anim_player.current_animation, "Walk", "Zombie should play Walk animation on start")

func test_walk_animation_loops() -> void:
	zombie = _create_zombie()
	var anim_player = _get_animation_player(zombie)
	var anim = anim_player.get_animation("Walk")
	assert_not_null(anim, "Walk animation should exist")
	assert_eq(anim.loop_mode, Animation.LOOP_LINEAR, "Walk animation should be set to loop")

func test_zombie_has_collision_shape() -> void:
	zombie = _create_zombie()
	var collision = zombie.get_node_or_null("CollisionShape3D")
	assert_not_null(collision, "Zombie should still have a CollisionShape3D")

func test_zombie_plays_death_on_hit() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(main_scene)
	zombie = load("res://scenes/zombie.tscn").instantiate()
	var bullet = _create_bullet()
	bullet.position = Vector3(0, 0, -5)
	zombie.position = Vector3(0, 0, -5)
	main_scene.add_child(zombie)
	main_scene.add_child(bullet)
	zombie._on_hit_by_bullet(bullet)
	var anim_player = _get_animation_player(zombie)
	assert_eq(anim_player.current_animation, "Death", "Zombie should play Death animation when hit")

# =============================================================================
# Edge cases
# =============================================================================

func test_zombie_stops_moving_when_dead() -> void:
	zombie = _create_zombie()
	zombie.position = Vector3(0, 0, -30)
	zombie.dead = true
	var z_before = zombie.position.z
	zombie._process(0.1)
	assert_eq(zombie.position.z, z_before, "Dead zombie should not move")

func test_zombie_dead_flag_set_on_hit() -> void:
	var main_scene = load("res://scenes/main.tscn").instantiate()
	add_child_autofree(main_scene)
	zombie = load("res://scenes/zombie.tscn").instantiate()
	var bullet = _create_bullet()
	bullet.position = Vector3(0, 0, -5)
	zombie.position = Vector3(0, 0, -5)
	main_scene.add_child(zombie)
	main_scene.add_child(bullet)
	zombie._on_hit_by_bullet(bullet)
	assert_true(zombie.dead, "Zombie should be marked dead after being hit")
