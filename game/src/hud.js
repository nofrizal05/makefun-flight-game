// The HUD and the screens: instruments, mission text, warnings, and the title,
// pause, complete and crashed overlays. Everything is drawn on the same canvas
// so the screenshots always show the game exactly as the player sees it.
import { BEST_KEY, COURSE, FIELD, FONT, PALETTE, PLANE } from './config.js';
import { clamp } from './random.js';
import { PHASE_COMPLETE, PHASE_CRASHED, PHASE_OUT_OF_FUEL, PHASE_PAUSED, PHASE_PLAY, PHASE_TITLE } from './world.js';

const CX = FIELD.width / 2;

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
}

function label(ctx, text, x, y, size = 11) {
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function value(ctx, text, x, y, size = 24, colour = PALETTE.text) {
  ctx.fillStyle = colour;
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function headingText(heading) {
  const deg = ((heading * 180) / Math.PI % 360 + 360) % 360;
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const name = points[Math.round(deg / 45) % 8];
  return `${String(Math.round(deg)).padStart(3, '0')}° ${name}`;
}

function compassStrip(ctx, world) {
  const deg = ((world.plane.heading * 180) / Math.PI % 360 + 360) % 360;
  panel(ctx, CX - 190, 14, 380, 34);
  ctx.save();
  ctx.beginPath();
  ctx.rect(CX - 190, 14, 380, 34);
  ctx.clip();
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = 'center';
  for (let d = -90; d <= 90; d += 15) {
    const tickDeg = Math.round((deg + d) / 15) * 15;
    const norm = ((tickDeg % 360) + 360) % 360;
    const x = CX + d * 1.5;
    const isCard = norm % 90 === 0;
    ctx.fillStyle = isCard ? PALETTE.text : PALETTE.muted;
    ctx.font = isCard ? `bold 13px ${FONT}` : `12px ${FONT}`;
    ctx.fillText(isCard ? ['N', 'E', 'S', 'W'][norm / 90] : String(norm), x, 36);
    ctx.fillRect(x - 0.5, 18, 1, isCard ? 8 : 5);
  }
  ctx.restore();
  ctx.fillStyle = PALETTE.warn;
  ctx.beginPath();
  ctx.moveTo(CX - 6, 14);
  ctx.lineTo(CX + 6, 14);
  ctx.lineTo(CX, 24);
  ctx.closePath();
  ctx.fill();
}

function artificialHorizon(ctx, world, x, y, r) {
  const p = world.plane;
  panel(ctx, x - r - 12, y - r - 12, r * 2 + 24, r * 2 + 24);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(-p.roll);
  ctx.translate(0, p.pitch * 260);
  ctx.fillStyle = '#3f8fd2';
  ctx.fillRect(-r - 4, -r * 2 - 4, r * 2 + 8, r * 2 + 4);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-r - 4, 0, r * 2 + 8, r * 2 + 4);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.stroke();
  ctx.restore();
  // Fixed wings marker.
  ctx.strokeStyle = PALETTE.warn;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - r + 6, y);
  ctx.lineTo(x - 8, y);
  ctx.moveTo(x + 8, y);
  ctx.lineTo(x + r - 6, y);
  ctx.stroke();
  ctx.fillStyle = PALETTE.text;
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
  label(ctx, 'ATTITUDE', x - r - 4, y + r + 26);
}

export function drawHud(ctx, world) {
  const p = world.plane;
  // Top-left: altitude, speed, heading.
  panel(ctx, 16, 14, 292, 108);
  label(ctx, 'ALTITUDE', 28, 34);
  value(ctx, `${Math.max(0, Math.round(p.alt))} m`, 28, 62, 26,
    p.alt < 12 && !p.onGround ? PALETTE.warn : PALETTE.text);
  label(ctx, 'SPEED', 162, 34);
  value(ctx, `${Math.round(p.speed * 3.6)} km/h`, 162, 62, 26,
    p.speed < PLANE.stallSpeed && !p.onGround ? PALETTE.danger : PALETTE.text);
  label(ctx, 'HEADING', 28, 92);
  value(ctx, headingText(p.heading), 28, 114, 18);
  label(ctx, 'VERT SPEED', 162, 92);
  const vs = p.verticalSpeed;
  value(ctx, `${vs >= 0 ? '+' : ''}${vs.toFixed(1)} m/s`, 162, 114, 18,
    vs < -6 ? PALETTE.danger : PALETTE.text);

  compassStrip(ctx, world);

  // Top-right: score, rings, fuel, throttle.
  panel(ctx, FIELD.width - 266, 14, 250, 108);
  label(ctx, 'SCORE', FIELD.width - 254, 34);
  value(ctx, String(world.score), FIELD.width - 254, 62, 26);
  label(ctx, 'RINGS', FIELD.width - 154, 34);
  value(ctx, `${world.ringsPassed}/${COURSE.rings.length}`, FIELD.width - 154, 62, 26,
    world.ringsPassed === COURSE.rings.length ? PALETTE.good : PALETTE.text);
  label(ctx, 'FUEL', FIELD.width - 254, 92);
  const fuelW = 108;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(FIELD.width - 254, 98, fuelW, 10);
  ctx.fillStyle = p.fuel < 20 ? PALETTE.danger : p.fuel < 45 ? PALETTE.warn : PALETTE.good;
  ctx.fillRect(FIELD.width - 254, 98, fuelW * clamp(p.fuel / 100, 0, 1), 10);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.ceil(p.fuel)}%`, FIELD.width - 140, 108);
  label(ctx, 'THROTTLE', FIELD.width - 104, 92);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(FIELD.width - 104, 98, 76, 10);
  ctx.fillStyle = '#4fc3f7';
  ctx.fillRect(FIELD.width - 104, 98, 76 * clamp(p.throttle, 0, 1), 10);

  // Bottom-left: attitude indicator. Bottom-right: next target.
  artificialHorizon(ctx, world, 78, FIELD.height - 92, 46);
  const next = world.nextRing();
  panel(ctx, FIELD.width - 316, FIELD.height - 118, 300, 60);
  if (next) {
    const dist = Math.round(world.distanceTo(next));
    const steer = world.steerTo(next);
    const arrow = steer > 0.12 ? '▶ turn right' : steer < -0.12 ? '◀ turn left' : '▲ straight on';
    label(ctx, `NEXT: RING ${next.index + 1}`, FIELD.width - 304, FIELD.height - 94);
    value(ctx, `${dist} m  ·  ${arrow}`, FIELD.width - 304, FIELD.height - 70, 16);
  } else {
    label(ctx, 'NEXT: RUNWAY 09', FIELD.width - 304, FIELD.height - 94);
    const dist = Math.round(world.distanceTo({ x: COURSE.runwayX, z: COURSE.runwayStart + 200 }));
    value(ctx, `${dist} m  ·  line up and land`, FIELD.width - 304, FIELD.height - 70, 16);
  }

  // Mission line under the compass.
  const mission = next
    ? `MISSION — fly through ring ${next.index + 1} of ${COURSE.rings.length}, then land on runway 09`
    : 'MISSION — all rings clear: land on runway 09';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(mission, CX, 74);

  // Warnings and transient messages, only while flying — the end screens
  // already say what happened, and the overlay would cover the message.
  const warnings = [];
  if (p.speed < PLANE.stallSpeed && !p.onGround && world.phase === PHASE_PLAY) warnings.push('STALL — lower the nose, add throttle');
  if (p.alt < 15 && !p.onGround && world.phase === PHASE_PLAY) warnings.push('TERRAIN — PULL UP');
  if (p.fuel < 20 && world.phase === PHASE_PLAY) warnings.push('LOW FUEL');
  if (world.phase === PHASE_PLAY && world.time < world.messageUntil && world.message) {
    ctx.fillStyle = PALETTE.warn;
    ctx.font = `bold 26px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(world.message, CX, 130);
  } else if (warnings.length > 0) {
    ctx.fillStyle = PALETTE.danger;
    ctx.font = `bold 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(warnings[0], CX, 130);
  }
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8, 14, 22, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  panel(ctx, CX - 330, 118, 660, 330);
  ctx.fillStyle = accent;
  ctx.font = `bold 44px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(title, CX, 192);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `20px ${FONT}`;
  let y = 236;
  for (const line of lines) {
    ctx.fillText(line, CX, y);
    y += 34;
  }
}

export function drawScreen(ctx, world, best) {
  const phase = world.phase;
  if (phase === PHASE_TITLE) {
    overlay(ctx, 'MERAPI RUN', [
      'Fly the Elang-7 down the valley, thread six rings,',
      'then land her smooth on runway 09 at Minang Airfield.',
      '',
      '← → bank & turn    ↑ ↓ pitch    W / S throttle    B brake',
      'Hold the mouse button to steer with the pointer.  P pauses.',
      '',
      'Press ENTER or click to take off',
    ], PALETTE.warn);
    if (best > 0) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `16px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(`Best score: ${best}`, CX, 486);
    }
    return;
  }
  if (phase === PHASE_PAUSED) {
    overlay(ctx, 'PAUSED', [
      'The Elang-7 is holding steady.',
      '',
      'Press P to keep flying, or R to restart the sortie.',
    ], PALETTE.text);
    return;
  }
  if (phase === PHASE_COMPLETE) {
    overlay(ctx, 'MISSION COMPLETE', [
      `Score ${world.score}  ·  rings ${world.ringsPassed}/${COURSE.rings.length}` +
        (world.landedSmooth ? '  ·  smooth landing' : ''),
      world.landedSmooth
        ? 'A textbook landing — the tower is applauding.'
        : 'Down safe on runway 09. The tower is applauding.',
      '',
      `Best score: ${Math.max(best, world.score)}`,
      'Press R to fly again',
    ], PALETTE.good);
    return;
  }
  if (phase === PHASE_CRASHED) {
    overlay(ctx, 'CRASHED', [
      world.message || 'The Elang-7 is down.',
      `Score ${world.score}  ·  rings ${world.ringsPassed}/${COURSE.rings.length}`,
      '',
      'Press R to try the valley again',
    ], PALETTE.danger);
    return;
  }
  if (phase === PHASE_OUT_OF_FUEL) {
    overlay(ctx, 'OUT OF FUEL', [
      'The tanks are dry — glide her down to the runway',
      'or any flat field, and mind the river.',
      '',
      `Score ${world.score}  ·  rings ${world.ringsPassed}/${COURSE.rings.length}`,
    ], PALETTE.warn);
  }
}
