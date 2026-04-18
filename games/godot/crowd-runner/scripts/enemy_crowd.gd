class_name EnemyCrowd
extends Area3D
## Stationary enemy crowd. On overlap with a PlayerCrowd, ticks a battle that
## subtracts from both sides using CrowdMath.battle_tick until one reaches 0.

signal resolved(player_won: bool)

@export var initial_count: int = 30
@export var max_cols: int = 10
@export var spacing: float = 0.55
@export var dps: float = 25.0

@onready var multimesh_instance: MultiMeshInstance3D = $MultiMeshInstance3D
@onready var count_label: Label3D = $CountLabel

var count: int = 0
var _player: PlayerCrowd = null
var _done: bool = false

func _ready() -> void:
	area_entered.connect(_on_area_entered)
	set_count(initial_count)

func set_count(value: int) -> void:
	count = max(0, value)
	_refresh_formation()

func _on_area_entered(area: Area3D) -> void:
	if _done or _player != null:
		return
	if area is PlayerCrowd:
		_player = area
		_player.set_active(false)

func _physics_process(delta: float) -> void:
	if _done or _player == null:
		return
	var result: Array = CrowdMath.battle_tick(_player.count, count, dps, delta)
	var new_player_count: int = result[0]
	var new_enemy_count: int = result[1]
	if new_player_count != _player.count:
		_player.count = new_player_count
	if new_enemy_count != count:
		set_count(new_enemy_count)
	if _player.count == 0 or count == 0:
		_done = true
		var won: bool = count == 0 and _player.count > 0
		resolved.emit(won)

func _refresh_formation() -> void:
	if multimesh_instance == null or multimesh_instance.multimesh == null:
		return
	var mm: MultiMesh = multimesh_instance.multimesh
	mm.instance_count = count
	if count_label != null:
		count_label.text = str(count)
	if count == 0:
		return
	var cols: int = CrowdMath.formation_cols(count, max_cols)
	for i in range(count):
		var row: int = i / cols
		var col: int = i % cols
		var x: float = (float(col) - float(cols - 1) * 0.5) * spacing
		var z: float = float(row) * spacing
		mm.set_instance_transform(i, Transform3D(Basis(), Vector3(x, 0.0, z)))
