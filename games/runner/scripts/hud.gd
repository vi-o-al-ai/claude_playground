extends CanvasLayer

@onready var score_label: Label = $ScoreLabel
@onready var game_over_panel: PanelContainer = $GameOverPanel
@onready var final_score_label: Label = $GameOverPanel/FinalScoreLabel
@onready var power_up_label: Label = $PowerUpLabel
@onready var pause_panel: PanelContainer = $PausePanel
@onready var pause_button: TextureButton = $PauseButton
@onready var resume_button: Button = $PausePanel/VBoxContainer/ResumeButton
@onready var restart_button: Button = $PausePanel/VBoxContainer/RestartButton

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	game_over_panel.visible = false
	power_up_label.visible = false
	pause_panel.visible = false
	pause_button.visible = true
	update_score(0)
	pause_button.pressed.connect(_on_pause_button_pressed)
	resume_button.pressed.connect(_on_resume_pressed)
	restart_button.pressed.connect(_on_restart_pressed)

func update_score(score: int) -> void:
	score_label.text = "Score: %d" % score

func show_game_over(final_score: int) -> void:
	game_over_panel.visible = true
	final_score_label.text = "Game Over! Score: %d\nPress Enter to Restart" % final_score
	pause_button.visible = false

func hide_game_over() -> void:
	game_over_panel.visible = false
	pause_button.visible = true

func show_power_up(power_up_name: String, time_remaining: float) -> void:
	power_up_label.visible = true
	power_up_label.text = "%s %.1fs" % [power_up_name, time_remaining]

func hide_power_up() -> void:
	power_up_label.visible = false
	power_up_label.text = ""

func show_pause() -> void:
	pause_panel.visible = true

func hide_pause() -> void:
	pause_panel.visible = false

func _on_pause_button_pressed() -> void:
	var main = get_parent()
	if main.has_method("toggle_pause"):
		main.toggle_pause()

func _on_resume_pressed() -> void:
	var main = get_parent()
	if main.has_method("toggle_pause") and main.paused:
		main.toggle_pause()

func _on_restart_pressed() -> void:
	var main = get_parent()
	if main.paused:
		main.toggle_pause()
	if main.has_method("restart_game"):
		main.restart_game()
