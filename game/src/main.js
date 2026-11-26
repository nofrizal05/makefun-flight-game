// Merapi Run — the game loop. Wires the world, the pilot's controls, the
// renderer and the HUD together; runs on a fixed 60 Hz step so the flight
// feels the same on any display, and stages a deterministic screenshot scene
// when the page is opened with ?shot=start|play|end&seed=N.
import { BEST_KEY, FIELD, STEP } from './config.js';
import { drawHud, drawScreen } from './hud.js';
import { Input } from './input.js';
import { Pilot } from './plane.js';
import { render } from './render.js';
import { stageShot } from './shots.js';
import { Sound } from './sound.js';
import { EVENT_CRASHED, EVENT_LANDED, EVENT_OUT_OF_FUEL, EVENT_RING, PHASE_COMPLETE, PHASE_CRASHED, PHASE_PAUSED, PHASE_PLAY, PHASE_TITLE, World } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? '1') || 1;
const isShot = shotName !== null;

const world = new World(seed);
const input = new Input(canvas);
const pilot = new Pilot();
const sound = new Sound();

let best = 0;
try {
  best = Number(window.localStorage.getItem(BEST_KEY) ?? '0') || 0;
} catch {
  best = 0;
}

let shotScreen = null;
if (isShot) {
  const staged = stageShot(shotName, world);
  shotScreen = staged.screen;
  best = staged.best;
  pilot.sync(world);
}

function resize() {
  const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
  canvas.width = Math.round(FIELD.width * scale * window.devicePixelRatio);
  canvas.height = Math.round(FIELD.height * scale * window.devicePixelRatio);
  canvas.style.width = `${Math.round(FIELD.width * scale)}px`;
  canvas.style.height = `${Math.round(FIELD.height * scale)}px`;
  ctx.setTransform(canvas.width / FIELD.width, 0, 0, canvas.height / FIELD.height, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function announce(text) {
  status.textContent = text;
}

function startGame() {
  world.reset();
  pilot.reset();
  world.phase = PHASE_PLAY;
  sound.unlock();
  announce('Takeoff! Fly through ring 1, then land on runway 09.');
}

function togglePause() {
  if (world.phase === PHASE_PLAY) {
    world.phase = PHASE_PAUSED;
    announce('Paused.');
  } else if (world.phase === PHASE_PAUSED) {
    world.phase = PHASE_PLAY;
    announce('Flying.');
  }
}

function handleKeys() {
  if (input.wasPressed('Enter') || input.wasPressed('Space')) {
    if (world.phase === PHASE_TITLE) startGame();
  }
  if (input.wasPressed('KeyP')) togglePause();
  if (input.wasPressed('KeyR')) {
    if (world.phase !== PHASE_TITLE && world.phase !== PHASE_PLAY) startGame();
    else if (world.phase === PHASE_PAUSED) startGame();
  }
  if (input.mouse.down && world.phase === PHASE_TITLE) startGame();
}

function frame() {
  handleKeys();
  let events = 0;
  if (world.phase === PHASE_PLAY) {
    const control = pilot.control(input, world, STEP);
    events = world.step(STEP, control);
    if (events & EVENT_RING) sound.ring();
    if (events & EVENT_CRASHED) sound.thud();
    if (events & EVENT_LANDED) sound.beep(660, 0.2);
    if (events & EVENT_OUT_OF_FUEL) sound.beep(440, 0.3, 'square');
  }
  if (world.phase === PHASE_COMPLETE || world.phase === PHASE_CRASHED) {
    if (world.score > best) {
      best = world.score;
      try {
        window.localStorage.setItem(BEST_KEY, String(best));
      } catch {
        // Private browsing may refuse storage; the score still shows.
      }
    }
  }
  sound.engineHum(world.plane.throttle, world.plane.speed, world.plane.onGround);
  render(ctx, world, shotScreen ?? world.phase);
  drawHud(ctx, world);
  drawScreen(ctx, world, best);
  input.endFrame();
  if (!isShot) requestAnimationFrame(frame);
}

if (isShot) {
  frame();
} else {
  requestAnimationFrame(frame);
}
