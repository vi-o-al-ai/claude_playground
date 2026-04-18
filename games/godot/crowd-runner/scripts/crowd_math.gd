class_name CrowdMath
extends RefCounted
## Pure-function helpers for crowd-runner gameplay math.
## Kept free of node/scene dependencies so it can be unit-tested directly.

const MAX_COLS_DEFAULT: int = 10

static func apply_op(count: int, op: String, value: int) -> int:
	match op:
		"+":
			return count + value
		"-":
			return max(0, count - value)
		"x", "*":
			return count * value
		"/":
			if value == 0:
				return 0
			return int(count / value)
		_:
			return count

static func battle_tick(player: int, enemy: int, dps: float, delta: float) -> Array:
	var damage: int = int(dps * delta)
	return [max(0, player - damage), max(0, enemy - damage)]

static func formation_cols(count: int, max_cols: int = MAX_COLS_DEFAULT) -> int:
	if count <= 0:
		return 0
	return min(max_cols, int(ceil(sqrt(float(count)))))

static func formation_rows(count: int, max_cols: int = MAX_COLS_DEFAULT) -> int:
	if count <= 0:
		return 0
	var cols: int = formation_cols(count, max_cols)
	return int(ceil(float(count) / float(cols)))
