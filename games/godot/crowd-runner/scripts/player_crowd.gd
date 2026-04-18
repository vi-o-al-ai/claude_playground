class_name PlayerCrowd
extends Area3D
## Steerable crowd that auto-runs forward (-Z). Count and formation are driven
## by CrowdMath; gates and enemies talk to this script via `count` and `set_active`.

signal count_changed(new_count: int)
signal died

@export var initial_count: int = 10
@export var max_cols: int = 10
@export var spacing: float = 0.55
@export var forward_speed: float = 8.0
@export var lateral_speed: float = 12.0
@export var road_half_width: float = 4.0
@export var drag_sensitivity: float = 0.015

@onready var multimesh_instance: MultiMeshInstance3D = $MultiMeshInstance3D
@onready var count_label: Label3D = $CountLabel

var count: int = 0: set = set_count
var _target_x: float = 0.0
var _is_active: bool = true

func _ready() -> void:
	set_count(initial_count)

func _process(delta: float) -> void:
	if not _is_active:
		return
	position.z -= forward_speed * delta
	var axis: float = 0.0
	if Input.is_action_pressed("move_left"):
		axis -= 1.0
	if Input.is_action_pressed("move_right"):
		axis += 1.0
	if axis != 0.0:
		_target_x = clamp(_target_x + axis * lateral_speed * delta, -road_half_width, road_half_width)
	position.x = lerp(position.x, _target_x, clamp(10.0 * delta, 0.0, 1.0))

func _input(event: InputEvent) -> void:
	if not _is_active:
		return
	if event is InputEventScreenDrag:
		_apply_drag(event.relative.x)
	elif event is InputEventMouseMotion and Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
		_apply_drag(event.relative.x)

func _apply_drag(dx: float) -> void:
	_target_x = clamp(_target_x + dx * drag_sensitivity, -road_half_width, road_half_width)

func set_count(value: int) -> void:
	var clamped: int = max(0, value)
	if clamped == count:
		return
	count = clamped
	_refresh_formation()
	count_changed.emit(count)
	if count == 0:
		_is_active = false
		died.emit()

func set_active(value: bool) -> void:
	_is_active = value

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
