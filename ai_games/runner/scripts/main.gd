extends Node3D

@onready var camera: Camera3D = $Camera3D
@onready var road: Node3D = $Road

var score: int = 0
var game_over: bool = false

func _ready() -> void:
	pass
