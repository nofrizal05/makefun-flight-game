// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot (aim at the next ring or the runway, hold a sensible speed),
// so the frame is what a short game really looks like and the same seed always
// gives the same frame.
import { COURSE, STEP } from './config.js';
import { clamp } from './random.js';
import { PHASE_COMPLETE, PHASE_CRASHED, PHASE_OUT_OF_FUEL, PHASE_PLAY, PHASE_TITLE } from './world.js';

const START_SECONDS = 9;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 300;

/** Steer toward a world point: turn, pitch and throttle to get there. */
function autopilot(world) {
  const p = world.plane;
  const ring = world.nextRing();
  let target;
  let targetAlt;
  if (ring) {
    // Aim at the ring, but start bending toward the next one while still
    // 150 m out, so the course flows instead of slaloming ring to ring.
    target = ring;
    targetAlt = ring.y;
    const dist = world.distanceTo(ring);
    const following = COURSE.rings[ring.index + 1];
    if (following && dist < 60) {
      const blend = (1 - dist / 60) * 0.4;
      target = {
        x: ring.x + (following.x - ring.x) * blend,
        z: ring.z + (following.z - ring.z) * blend,
      };
      targetAlt = ring.y + (following.y - ring.y) * blend;
    }
  } else {
    // Final approach: line up with the centreline FIRST, holding altitude,
    // then ride a gentle glide slope down to the threshold. A low, off-centre
    // approach climbs away for another try instead of scraping the grass.
    // The aim point is 150 m ahead on the centreline, so a lateral error
    // reads as a real bearing to correct, and it is always ahead of the plane.
    const thresholdZ = COURSE.runwayStart + 60;
    const dist = thresholdZ - p.z;
    target = { x: COURSE.runwayX, z: p.z + 150 };
    const offCentre = Math.abs(p.x - COURSE.runwayX);
    targetAlt = offCentre > 12 ? Math.max(45, p.alt) : clamp(dist * 0.05, 0, 90);
  }
  const steer = world.steerTo(target);
  // Strong heading gain with light bank damping: converge on the ring early
  // instead of still turning as it crosses the ring's plane.
  const turn = clamp(steer * 2.5 - world.plane.roll * 0.4, -1, 1);
  const altError = targetAlt - p.alt;
  const pitch = clamp(altError * 0.06, -1, 1);
  // Ease off the throttle on final so the touchdown is gentle.
  const throttle = ring ? 0.62 : clamp(0.55 - (p.z > 300 ? 0.2 : 0), 0.3, 0.8);
  return { turn, pitch, throttle, brake: false };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    world.phase = PHASE_PLAY;
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, autopilot(world));
    }
    world.phase = PHASE_TITLE;
    return { screen: PHASE_TITLE, best: 0 };
  }
  world.phase = PHASE_PLAY;
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  for (let index = 0; index < limit / STEP; index += 1) {
    world.step(STEP, autopilot(world));
    if (world.phase !== PHASE_PLAY) break;
  }
  if (name === 'end' && world.phase === PHASE_PLAY) {
    // The autopilot ran out of time without landing: park it on the runway
    // for the end frame rather than showing a mid-air shot.
    const p = world.plane;
    p.x = COURSE.runwayX;
    p.z = COURSE.runwayStart + 120;
    p.alt = 0.4;
    p.speed = 0;
    p.onGround = true;
    p.heading = 0;
    p.pitch = 0;
    p.roll = 0;
    if (world.ringsPassed < COURSE.rings.length) {
      world.ringsPassed = COURSE.rings.length;
      world.ringStates = world.ringStates.map(() => 'passed');
      world.score += COURSE.landingPoints;
    }
    world.phase = PHASE_COMPLETE;
    world.landedSmooth = true;
  }
  const over = world.phase === PHASE_CRASHED || world.phase === PHASE_OUT_OF_FUEL;
  return {
    screen: over ? world.phase : world.phase,
    best: world.score,
  };
}
