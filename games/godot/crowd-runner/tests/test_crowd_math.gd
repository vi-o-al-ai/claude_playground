extends GutTest
## Pure-math helpers for crowd count operations.
## No scene or node setup required.

# --- Gate operations: happy path ---

func test_add_gate_increases_count() -> void:
	assert_eq(CrowdMath.apply_op(10, "+", 20), 30, "+20 on 10 should be 30")

func test_multiply_gate_multiplies_count() -> void:
	assert_eq(CrowdMath.apply_op(10, "x", 10), 100, "x10 on 10 should be 100")

func test_subtract_gate_decreases_count() -> void:
	assert_eq(CrowdMath.apply_op(30, "-", 10), 20, "-10 on 30 should be 20")

func test_divide_gate_halves_count() -> void:
	assert_eq(CrowdMath.apply_op(100, "/", 2), 50, "/2 on 100 should be 50")

# --- Gate operations: edge cases ---

func test_subtract_clamps_at_zero() -> void:
	assert_eq(CrowdMath.apply_op(5, "-", 100), 0, "-100 on 5 should clamp to 0, not go negative")

func test_multiply_by_zero_returns_zero() -> void:
	assert_eq(CrowdMath.apply_op(50, "x", 0), 0, "x0 should wipe out the crowd")

func test_add_to_zero_starts_fresh() -> void:
	assert_eq(CrowdMath.apply_op(0, "+", 20), 20, "+20 on 0 should be 20")

# --- Gate operations: bad path ---

func test_unknown_op_returns_count_unchanged() -> void:
	assert_eq(CrowdMath.apply_op(42, "?", 5), 42, "Unknown op should be a no-op")

func test_divide_by_zero_returns_zero() -> void:
	assert_eq(CrowdMath.apply_op(100, "/", 0), 0, "Divide by zero should return 0, not crash")

# --- Battle tick: happy path ---

func test_battle_tick_subtracts_both_sides() -> void:
	var result: Array = CrowdMath.battle_tick(100, 80, 10.0, 1.0)
	assert_eq(result[0], 90, "Player should lose 10 in 1s at dps=10")
	assert_eq(result[1], 70, "Enemy should lose 10 in 1s at dps=10")

func test_battle_tick_scales_with_delta() -> void:
	var result: Array = CrowdMath.battle_tick(100, 100, 10.0, 0.5)
	assert_eq(result[0], 95, "Half a second at dps=10 should remove 5")
	assert_eq(result[1], 95, "Half a second at dps=10 should remove 5")

# --- Battle tick: edge cases ---

func test_battle_tick_clamps_at_zero() -> void:
	var result: Array = CrowdMath.battle_tick(5, 10, 100.0, 1.0)
	assert_eq(result[0], 0, "Player should clamp at 0, not go negative")
	assert_eq(result[1], 0, "Enemy should clamp at 0, not go negative")

func test_battle_tick_zero_delta_is_noop() -> void:
	var result: Array = CrowdMath.battle_tick(50, 50, 10.0, 0.0)
	assert_eq(result[0], 50, "Zero delta should not change counts")
	assert_eq(result[1], 50, "Zero delta should not change counts")

# --- Formation layout: happy path ---

func test_formation_cols_scales_with_count() -> void:
	assert_gt(
		CrowdMath.formation_cols(100),
		CrowdMath.formation_cols(10),
		"Larger crowd should have more columns (until cap)"
	)

func test_formation_cols_caps_at_max() -> void:
	assert_eq(CrowdMath.formation_cols(500, 10), 10, "Cols should cap at max_cols")

func test_formation_rows_covers_all_units() -> void:
	var count: int = 37
	var cols: int = CrowdMath.formation_cols(count)
	var rows: int = CrowdMath.formation_rows(count)
	assert_gte(rows * cols, count, "Grid should have enough slots for every unit")

# --- Formation layout: edge cases ---

func test_formation_zero_count_has_no_grid() -> void:
	assert_eq(CrowdMath.formation_cols(0), 0, "Empty crowd has 0 cols")
	assert_eq(CrowdMath.formation_rows(0), 0, "Empty crowd has 0 rows")

func test_formation_single_unit() -> void:
	assert_eq(CrowdMath.formation_cols(1), 1, "One unit needs 1 col")
	assert_eq(CrowdMath.formation_rows(1), 1, "One unit needs 1 row")
