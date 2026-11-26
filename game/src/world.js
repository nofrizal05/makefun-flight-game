// The world of Merapi Run: a green valley under a volcano, a winding river, six
// rings on a course down the valley, and runway 09 at its far end. The terrain is
// a pure function of position (seeded noise), so the same seed always builds the
// same valley, and the flight state lives here too.
import { COURSE, PLANE } from './config.js';
import { angleDelta, clamp, createRandom, makeNoise } from './random.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_PAUSED = 'paused';
export const PHASE_COMPLETE = 'complete';
export const PHASE_CRASHED = 'crashed';
export const PHASE_OUT_OF_FUEL = 'out-of-fuel';

export const EVENT_NONE = 0;
export const EVENT_RING = 1;
export const EVENT_NEAR_RING = 2;
export const EVENT_LANDED = 4;
export const EVENT_CRASHED = 8;
export const EVENT_OUT_OF_FUEL = 16;

/** Where the river bends across the valley, in metres, as a function of z. */
export function riverX(z) {
  return 55 * Math.sin(z * 0.0035) + 22 * Math.sin(z * 0.0011 + 1.7);
}

/** The volcano that watches over the valley, drawn far beyond the course. */
export function volcanoPeak() {
  return { x: -350, z: 3200, height: 420, width: 520 };
}

export class World {
  constructor(seed = 1) {
    this.seed = seed;
    this.noise = makeNoise(seed);
    this.noise2 = makeNoise(seed + 77);
    this.reset();
  }

  /** Ground height in metres at world position (x, z). */
  terrainHeight(x, z) {
    // The valley floor is gentle near the runway corridor and the river;
    // the sides rise into forested hills, higher the further out you go.
    const side = Math.abs(x) / 90;
    const hills = this.noise(x * 0.35 + z * 0.12) * 14 + this.noise2(x * 0.12 - z * 0.05) * 22;
    let h = 2 + hills * (0.25 + side * side * 1.6) + side * side * 26;
    // Flatten a corridor along the runway so landings are possible.
    const corridor = Math.max(0, 1 - Math.abs(x - COURSE.runwayX) / 26);
    h *= 1 - corridor * 0.92;
    // Carve the river bed.
    const riverDist = Math.abs(x - riverX(z));
    if (riverDist < 14) h -= (1 - riverDist / 14) * 3.5;
    // The volcano's skirt rises far down the course.
    const peak = volcanoPeak();
    const dz = z - peak.z;
    const dx = x - peak.x;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < peak.width) h += peak.height * (1 - dist / peak.width) * (1 - dist / peak.width);
    return Math.max(0, h);
  }

  /** True when the point is over water. */
  isWater(x, z) {
    return Math.abs(x - riverX(z)) < 6 && this.terrainHeight(x, z) < 1.2;
  }

  /** True when the point is on the runway strip. */
  isRunway(x, z) {
    return (
      Math.abs(x - COURSE.runwayX) <= COURSE.runwayHalfWidth &&
      z >= COURSE.runwayStart &&
      z <= COURSE.runwayEnd
    );
  }

  reset() {
    const rand = createRandom(this.seed * 1013 + 5);
    this.plane = {
      x: 0,
      z: -120,
      alt: 2,
      heading: 0,
      speed: 0,
      throttle: 0.55,
      pitch: 0,
      roll: 0,
      verticalSpeed: 0,
      fuel: PLANE.fuelStart,
      damage: 0,
      onGround: true,
    };
    this.score = 0;
    this.ringsPassed = 0;
    this.ringStates = COURSE.rings.map(() => 'pending');
    this.phase = PHASE_TITLE;
    this.time = 0;
    this.message = '';
    this.messageUntil = 0;
    this.lastRingAt = -99;
    this.landedSmooth = false;
    this.outOfFuel = false;
    this.events = EVENT_NONE;
    // Clouds: fixed, seeded positions so every render of a seed matches.
    this.clouds = [];
    for (let i = 0; i < 26; i += 1) {
      this.clouds.push({
        x: (rand() - 0.5) * 700,
        y: 150 + rand() * 130,
        z: rand() * 1400 - 100,
        size: 26 + rand() * 42,
      });
    }
    // Birds over the rice fields, for life in the sky.
    this.birds = [];
    for (let i = 0; i < 7; i += 1) {
      this.birds.push({
        x: (rand() - 0.5) * 160,
        y: 45 + rand() * 40,
        z: rand() * 900,
        phase: rand() * Math.PI * 2,
        speed: 6 + rand() * 4,
      });
    }
  }

  /** The next ring the pilot must fly through, or null when all are done. */
  nextRing() {
    for (let i = 0; i < COURSE.rings.length; i += 1) {
      if (this.ringStates[i] === 'pending') return { ...COURSE.rings[i], index: i };
    }
    return null;
  }

  showMessage(text, seconds = 2.5) {
    this.message = text;
    this.messageUntil = this.time + seconds;
  }

  /**
   * Advance the flight one fixed step. `input` is { turn, pitch, throttle, brake }
   * with turn/pitch in [-1, 1] and throttle in [0, 1]; `brake` slows on the ground.
   * Returns an event bitmask for what happened this step.
   */
  step(dt, input) {
    if (this.phase !== PHASE_PLAY) return EVENT_NONE;
    const p = this.plane;
    this.time += dt;
    let events = EVENT_NONE;

    // Throttle and speed: the engine spools toward its target speed.
    p.throttle = clamp(input.throttle, 0, 1);
    const targetSpeed = PLANE.minSpeed + p.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
    p.speed += (targetSpeed - p.speed) * Math.min(1, dt * 0.55);
    if (p.fuel <= 0) {
      p.speed += (12 - p.speed) * Math.min(1, dt * 0.4);
    }

    // Bank into the turn; heading follows the bank.
    const targetRoll = input.turn * PLANE.rollLimit * (Math.PI / 180);
    p.roll += (targetRoll - p.roll) * Math.min(1, dt * 3.2);
    p.heading += p.roll * PLANE.turnRate * dt * (p.speed / 60);

    // Pitch: the stick commands climb or descent; a stalled wing drops the nose.
    const stalled = p.speed < PLANE.stallSpeed && !p.onGround;
    const targetPitch = stalled
      ? -10
      : input.pitch * PLANE.pitchLimit;
    p.pitch += ((targetPitch * (Math.PI / 180)) - p.pitch) * Math.min(1, dt * 2.4);
    p.verticalSpeed = Math.sin(p.pitch) * p.speed;
    if (stalled) p.verticalSpeed -= 4;

    // Move along the heading.
    p.x += Math.sin(p.heading) * p.speed * dt;
    p.z += Math.cos(p.heading) * p.speed * dt;
    if (!p.onGround) p.alt += p.verticalSpeed * dt;

    // Fuel burns with throttle; empty tanks end powered flight, but the plane
    // keeps gliding — the pilot can still land it, or crash trying.
    p.fuel -= (PLANE.fuelIdle + p.throttle * PLANE.fuelThrottle) * dt;
    if (p.fuel <= 0 && !this.outOfFuel) {
      p.fuel = 0;
      this.outOfFuel = true;
      events |= EVENT_OUT_OF_FUEL;
      this.showMessage('OUT OF FUEL — glide her down!', 4);
    }

    // Ring checks: crossing a ring's plane close to its centre scores.
    const ring = this.nextRing();
    if (ring) {
      const prevZ = p.z - Math.cos(p.heading) * p.speed * dt;
      if (prevZ < ring.z && p.z >= ring.z) {
        const dx = p.x - ring.x;
        const dy = p.alt - ring.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= COURSE.ringRadius) {
          this.ringStates[ring.index] = 'passed';
          this.ringsPassed += 1;
          this.score += COURSE.ringPoints;
          this.lastRingAt = this.time;
          events |= EVENT_RING;
          this.showMessage(
            `RING ${this.ringsPassed}/${COURSE.rings.length}  +${COURSE.ringPoints}`,
            2,
          );
          if (this.ringsPassed === COURSE.rings.length) {
            this.showMessage('ALL RINGS CLEAR — land on runway 09!', 4);
          }
        } else if (dist <= COURSE.ringRadius * 2.2) {
          // Flown past the ring, close enough for a near-miss bonus — but the
          // ring is behind the plane now, so it is resolved, never chased back.
          this.ringStates[ring.index] = 'missed';
          this.score += COURSE.ringNearBonus;
          events |= EVENT_NEAR_RING;
          this.showMessage(`NEAR MISS  +${COURSE.ringNearBonus}`, 1.5);
        } else {
          this.ringStates[ring.index] = 'missed';
          this.showMessage(`Ring ${ring.index + 1} missed — keep flying`, 2);
        }
      }
    }

    // Ground contact.
    const ground = this.terrainHeight(p.x, p.z);
    if (p.alt <= ground + 0.4 && !p.onGround) {
      if (this.isRunway(p.x, p.z) && this.ringsPassed === COURSE.rings.length) {
        this.land(p);
        events |= EVENT_LANDED;
      } else if (this.isRunway(p.x, p.z) && p.alt <= 1.2) {
        // Touching the runway early is allowed: roll, then take off again.
        p.onGround = true;
        p.alt = 0.4;
        p.verticalSpeed = 0;
        p.pitch = 0;
        if (input.throttle > 0.4) {
          p.onGround = false;
          p.alt = 1.5;
        }
      } else {
        this.crash(p, ground);
        events |= EVENT_CRASHED;
      }
    }
    if (p.onGround) {
      p.alt = 0.4;
      // Rolling on the runway: brake or throttle decides the speed.
      if (input.brake) p.speed = Math.max(0, p.speed - 26 * dt);
      else if (p.speed < 8 && p.throttle < 0.3) p.speed = Math.max(0, p.speed - 6 * dt);
      if (p.speed > 34 && p.throttle > 0.5) {
        p.onGround = false;
        p.alt = 2;
        this.showMessage('ROTATE — wheels up!', 1.5);
      }
      p.x += Math.sin(p.heading) * p.speed * dt;
      p.z += Math.cos(p.heading) * p.speed * dt;
    }
    if (p.alt < 0.4 && !p.onGround) p.alt = 0.4;
    return events;
  }

  land(p) {
    const hard = Math.abs(p.verticalSpeed) > PLANE.hardLandingVs;
    const tooFast = p.speed > PLANE.maxLandingSpeed;
    const tooSlow = p.speed < PLANE.minLandingSpeed;
    if (Math.abs(p.verticalSpeed) > PLANE.crashVs || tooFast) {
      this.crash(p, 0);
      return;
    }
    p.onGround = true;
    p.alt = 0.4;
    p.verticalSpeed = 0;
    p.pitch = 0;
    p.roll = 0;
    this.landedSmooth = !hard && !tooSlow;
    this.score += COURSE.landingPoints + (this.landedSmooth ? COURSE.smoothLandingBonus : 0);
    this.phase = PHASE_COMPLETE;
    this.showMessage(
      this.landedSmooth
        ? `SMOOTH LANDING  +${COURSE.landingPoints + COURSE.smoothLandingBonus}`
        : `LANDED  +${COURSE.landingPoints}`,
      4,
    );
  }

  crash(p, ground) {
    p.alt = ground + 0.4;
    p.damage = 100;
    p.speed = 0;
    this.phase = PHASE_CRASHED;
    const reason =
      this.isWater(p.x, p.z) && ground < 1.2
        ? 'ditched in the river'
        : p.alt <= 2
          ? 'flew into the hillside'
          : 'hit the ground';
    this.showMessage(`CRASHED — ${reason}`, 4);
  }

  /** Bearing, in degrees, from the plane to a world point. */
  bearingTo(point) {
    return Math.atan2(point.x - this.plane.x, point.z - this.plane.z);
  }

  /** Distance in metres from the plane to a world point. */
  distanceTo(point) {
    const dx = point.x - this.plane.x;
    const dz = point.z - this.plane.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  /** Signed turn to steer toward a world point, in radians. */
  steerTo(point) {
    return angleDelta(this.plane.heading, this.bearingTo(point));
  }
}
