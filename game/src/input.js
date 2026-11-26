// Raw keyboard and mouse state. This file only listens and remembers; plane.js
// turns what it reports into flight controls.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0.5, y: 0.5, active: false, down: false };
    this.pressed = new Set();
    this.canvas = canvas;
    this.onKey = (event) => {
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)
      ) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(event.code);
      this.keys.add(event.code);
    };
    this.onKeyUp = (event) => {
      this.keys.delete(event.code);
    };
    this.onPointerMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = (event.clientX - rect.left) / Math.max(1, rect.width);
      this.mouse.y = (event.clientY - rect.top) / Math.max(1, rect.height);
      this.mouse.active = true;
    };
    this.onPointerDown = (event) => {
      this.onPointerMove(event);
      this.mouse.down = true;
    };
    this.onPointerUp = () => {
      this.mouse.down = false;
    };
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  isDown(code) {
    return this.keys.has(code);
  }

  /** True once for a key pressed since the last call to endFrame. */
  wasPressed(code) {
    return this.pressed.has(code);
  }

  endFrame() {
    this.pressed.clear();
  }

  destroy() {
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
  }
}
