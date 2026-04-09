extends GutTest

func test_road_segment_length_is_25():
	assert_eq(GameConstants.ROAD_SEGMENT_LENGTH, 25.0,
		"Road segment length should be 25 units")

func test_road_segment_count_is_4():
	assert_eq(GameConstants.ROAD_SEGMENT_COUNT, 4,
		"Road segment count should be 4")

func test_bullet_lifetime_is_1_5():
	assert_eq(GameConstants.BULLET_LIFETIME, 1.5,
		"Bullet lifetime should be 1.5 seconds")

func test_zombie_spawn_distance_is_30():
	assert_eq(GameConstants.ZOMBIE_SPAWN_DISTANCE, 30.0,
		"Zombie spawn distance should be 30 units")
