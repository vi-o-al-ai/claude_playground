extends Node3D
## Wires the hand-authored MVP stage: follows the player with the camera rig,
## routes win/lose signals to the HUD, and handles restart.

@onready var player: PlayerCrowd = $Player
@onready var enemy: EnemyCrowd = $Enemy
@onready var camera_rig: Node3D = $CameraRig
@onready var game_over_panel: Control = $HUD/GameOverPanel
@onready var result_label: Label = $HUD/GameOverPanel/VBoxContainer/ResultLabel
@onready var restart_button: Button = $HUD/GameOverPanel/VBoxContainer/RestartButton

func _ready() -> void:
	enemy.resolved.connect(_on_resolved)
	player.died.connect(_on_player_died)
	restart_button.pressed.connect(_on_restart)
	game_over_panel.visible = false

func _process(_delta: float) -> void:
	camera_rig.position.z = player.position.z

func _input(event: InputEvent) -> void:
	if event.is_action_pressed("restart"):
		_on_restart()

func _on_resolved(player_won: bool) -> void:
	player.set_active(false)
	_show_game_over("Victory!" if player_won else "Defeat")

func _on_player_died() -> void:
	_show_game_over("Defeat")

func _show_game_over(text: String) -> void:
	if game_over_panel.visible:
		return
	result_label.text = text
	game_over_panel.visible = true

func _on_restart() -> void:
	get_tree().reload_current_scene()
