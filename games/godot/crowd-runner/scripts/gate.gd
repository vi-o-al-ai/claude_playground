class_name Gate
extends Area3D
## Lane-width trigger arch. On first overlap with a PlayerCrowd, applies
## CrowdMath.apply_op(op, value) to the player's count, then disables.

@export_enum("+", "-", "x", "/") var op: String = "+"
@export var value: int = 20

@onready var label: Label3D = $Label

var _triggered: bool = false

func _ready() -> void:
	area_entered.connect(_on_area_entered)
	_update_label()

func _update_label() -> void:
	if label != null:
		label.text = _display_string()

func _display_string() -> String:
	match op:
		"+":
			return "+%d" % value
		"-":
			return "-%d" % value
		"x", "*":
			return "x%d" % value
		"/":
			return "/%d" % value
		_:
			return "?"

func _on_area_entered(area: Area3D) -> void:
	if _triggered:
		return
	if area is PlayerCrowd:
		_triggered = true
		area.count = CrowdMath.apply_op(area.count, op, value)
