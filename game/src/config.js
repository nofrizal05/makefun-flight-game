// Every tuning number and colour in one place for Merapi Run.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Projection: how strongly distance shrinks the world (pixels at 1 m ahead). */
export const FOCAL = 430;
/** Screen height of the horizon line in the logical playfield. */
export const HORIZON_Y = 330;
/** How far ahead, in metres, the world is drawn. */
export const DRAW_DISTANCE = 620;

/** The aircraft the player flies: the Elang-7, a light stunt plane. */
export const PLANE = {
  /** Cruise target speed at full throttle, m/s. */
  maxSpeed: 78,
  /** Speed at idle throttle, m/s. */
  minSpeed: 26,
  /** Below this speed the wing stalls and the nose drops. */
  stallSpeed: 30,
  /** Degrees of pitch the stick commands, up and down. */
  pitchLimit: 14,
  /** Degrees of bank the stick commands. */
  rollLimit: 42,
  /** How fast heading follows bank, per second per radian of bank. */
  turnRate: 0.75,
  /** Fuel units burned per second at idle, plus this times throttle. */
  fuelIdle: 0.22,
  fuelThrottle: 0.85,
  fuelStart: 100,
  /** Hard-landing vertical speed (m/s) that damages the airframe. */
  hardLandingVs: 4.5,
  /** Vertical speed (m/s) that wrecks the plane on touchdown. */
  crashVs: 8,
  /** Touchdown speed (m/s) above which the landing gear fails. */
  maxLandingSpeed: 52,
  /** Minimum speed that still counts as a controlled touchdown. */
  minLandingSpeed: 14,
};

/** The course: six rings over the valley, then a landing on runway 09. */
export const COURSE = {
  runwayX: 0,
  /** The strip the sortie ends on, beyond the last ring. */
  runwayStart: 1500,
  runwayEnd: 2400,
  runwayHalfWidth: 9,
  /** Rings: lateral offset, height above ground, distance along the course. */
  rings: [
    { x: -24, y: 62, z: 260 },
    { x: 28, y: 78, z: 460 },
    { x: -10, y: 55, z: 660 },
    { x: 30, y: 92, z: 860 },
    { x: -26, y: 70, z: 1060 },
    { x: 4, y: 48, z: 1260 },
  ],
  ringRadius: 16,
  ringNearBonus: 25,
  ringPoints: 100,
  landingPoints: 250,
  smoothLandingBonus: 150,
};

export const PALETTE = {
  skyTop: '#2f6fb2',
  skyMid: '#7fb2dd',
  skyHorizon: '#cfe4f2',
  sun: '#fff3c4',
  sunCore: '#fffbe8',
  mountainFar: '#7d94b5',
  mountainNear: '#5d7a52',
  mountainSnow: '#eef4f8',
  groundLow: '#5e8f4e',
  groundMid: '#6f9a55',
  groundHigh: '#8a7a55',
  groundRock: '#7a6a58',
  groundSnow: '#e8eef2',
  river: '#3f8fd2',
  riverDeep: '#2f6fb2',
  runway: '#3a3f46',
  runwayMark: '#f2f2e8',
  ring: '#ffb020',
  ringGlow: '#ffd97a',
  ringPassed: '#37d67a',
  planeBody: '#e8442e',
  planeAccent: '#f5f0e6',
  planeDark: '#7c1f12',
  planeGlass: '#bfe3f2',
  panel: 'rgba(10, 18, 28, 0.72)',
  panelEdge: 'rgba(255, 255, 255, 0.18)',
  text: '#f4f7fa',
  muted: '#b9c6d2',
  warn: '#ffb020',
  danger: '#ff5a4e',
  good: '#37d67a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'merapi-run.best';
