extends CanvasLayer

@onready var score_label: Label = $ScoreLabel
@onready var game_over_panel: PanelContainer = $GameOverPanel
@onready var final_score_label: Label = $GameOverPanel/FinalScoreLabel
@onready var power_up_label: Label = $PowerUpLabel

func _ready() -> void:
	game_over_panel.visible = false
	power_up_label.visible = false
	update_score(0)

func update_score(score: int) -> void:
	score_label.text = "Score: %d" % score

func show_game_over(final_score: int) -> void:
	game_over_panel.visible = true
	final_score_label.text = "Game Over! Score: %d\nPress Enter to Restart" % final_score

func hide_game_over() -> void:
	game_over_panel.visible = false

func show_power_up(power_up_name: String, time_remaining: float) -> void:
	power_up_label.visible = true
	power_up_label.text = "%s %.1fs" % [power_up_name, time_remaining]

func hide_power_up() -> void:
	power_up_label.visible = false
	power_up_label.text = ""
