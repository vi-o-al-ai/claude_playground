extends Control

@onready var stage1_button: Button = $VBoxContainer/Stage1Button
@onready var stage2_button: Button = $VBoxContainer/Stage2Button

func _ready() -> void:
	stage1_button.pressed.connect(_on_stage1_pressed)
	stage2_button.pressed.connect(_on_stage2_pressed)

func _on_stage1_pressed() -> void:
	get_tree().change_scene_to_file("res://scenes/main.tscn")

func _on_stage2_pressed() -> void:
	get_tree().change_scene_to_file("res://scenes/main_strafe.tscn")
