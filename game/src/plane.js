// The pilot's controls: keyboard and mouse become the { turn, pitch, throttle,
// brake } vector the world steps with. Throttle is a lever — W/S (or Up/Down on
// the throttle keys) move it and it stays where it is left — while pitch and
// turn are momentary stick inputs that centre when released.
import { clamp } from './random.js';

export class Pilot {
  constructor() {
    this.throttle = 0.55;
    this.mouseSteer = false;
  }

  reset() {
    this.throttle = 0.55;
    this.mouseSteer = false;
  }

  /**
   * Build this frame's control vector from the raw input device.
   * Mouse steering: hold the left button and the plane banks and pitches
   * toward the pointer; otherwise the arrow keys / WASD fly it.
   */
  control(input, world, dt) {
    const p = world.plane;
    // Throttle lever: W / S, or ArrowUp/ArrowDown only while Shift is held
    // (plain arrows are pitch, so they never fight the throttle).
    if (input.isDown('KeyW')) this.throttle += 0.55 * dt;
    if (input.isDown('KeyS')) this.throttle -= 0.55 * dt;
    this.throttle = clamp(this.throttle, 0, 1);
    if (input.wasPressed('KeyM')) this.mouseSteer = !this.mouseSteer;

    let turn = 0;
    let pitch = 0;
    if (this.mouseSteer && input.mouse.down) {
      // Pointer right of centre banks right; pointer above centre climbs.
      turn = clamp((input.mouse.x - 0.5) * 2.4, -1, 1);
      pitch = clamp((0.42 - input.mouse.y) * 2.2, -1, 1);
    } else {
      if (input.isDown('ArrowLeft') || input.isDown('KeyA')) turn -= 1;
      if (input.isDown('ArrowRight') || input.isDown('KeyD')) turn += 1;
      if (input.isDown('ArrowUp')) pitch += 1;
      if (input.isDown('ArrowDown')) pitch -= 1;
    }

    const brake = input.isDown('KeyB') || input.isDown('Space');
    // On the ground the stick does nothing; the plane rolls straight.
    if (p.onGround) {
      turn = 0;
      pitch = 0;
    }
    return { turn, pitch, throttle: this.throttle, brake };
  }

  /** The throttle lever follows the plane's own throttle after a shot stages it. */
  sync(world) {
    this.throttle = world.plane.throttle;
  }
}
