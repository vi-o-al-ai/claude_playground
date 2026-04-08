extends CanvasLayer

@onready var score_label: Label = $ScoreLabel
@onready var game_over_panel: PanelContainer = $GameOverPanel
@onready var final_score_label: Label = $GameOverPanel/FinalScoreLabel

func _ready() -> void:
	game_over_panel.visible = false
	update_score(0)

func update_score(score: int) -> void:
	score_label.text = "Score: %d" % score

func show_game_over(final_score: int) -> void:
	game_over_panel.visible = true
	final_score_label.text = "Game Over! Score: %d\nPress Enter to Restart" % final_score

func hide_game_over() -> void:
	game_over_panel.visible = false
