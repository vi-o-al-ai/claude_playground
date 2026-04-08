class_name GameConstants

const LANE_POSITIONS: Array[float] = [-3.0, 0.0, 3.0]
const DEFAULT_LANE: int = 1
const LANE_COUNT: int = 3

const ROAD_WIDTH: float = 10.0
const ROAD_SEGMENT_LENGTH: float = 50.0
const ROAD_SEGMENT_COUNT: int = 4

const BULLET_SPEED: float = 30.0
const BULLET_LIFETIME: float = 3.0
const SHOOT_INTERVAL: float = 0.4
const MAX_ACTIVE_BULLETS: int = 20

const ZOMBIE_INITIAL_SPEED: float = 5.0
const ZOMBIE_INITIAL_SPAWN_INTERVAL: float = 2.0
const ZOMBIE_MIN_SPAWN_INTERVAL: float = 0.4
const ZOMBIE_MAX_SPEED: float = 15.0
const ZOMBIE_SPAWN_DISTANCE: float = 60.0
const DIFFICULTY_INCREASE_INTERVAL: float = 10.0
const DIFFICULTY_MULTIPLIER: float = 0.9  # spawn interval multiplied by this
const SPEED_INCREASE: float = 0.05  # 5% speed increase

const LANE_SWITCH_SPEED: float = 10.0  # lerp speed for lane transitions
