// The chase view: sky, volcano and ridges on the horizon, the valley floor drawn
// as perspective strips, the runway and the rings ahead, and the Elang-7 in the
// foreground with its banking and pitch. Nothing here changes the simulation;
// it only shows it.
import { COURSE, DRAW_DISTANCE, FIELD, FOCAL, HORIZON_Y, PALETTE, PLANE } from './config.js';
import { clamp, lerp, makeNoise } from './random.js';
import { riverX, volcanoPeak } from './world.js';

const CX = FIELD.width / 2;
const ridgeNoise = makeNoise(4242);
const ridgeNoise2 = makeNoise(9911);

/**
 * Project a world point into screen space, relative to the camera at the plane.
 * Returns null when the point is behind the camera.
 */
export function project(world, wx, wy, wz) {
  const p = world.plane;
  // On the ground the chase camera rides a little above the plane, so the
  // runway ahead reads instead of filling the frame edge-on.
  const camAlt = p.alt + (p.onGround ? 9 : 0);
  const dx = wx - p.x;
  const dy = wy - camAlt;
  let dz = wz - p.z;
  // Rotate the world by the heading so forward is always up-screen.
  const cos = Math.cos(-p.heading);
  const sin = Math.sin(-p.heading);
  const rx = dx * cos - dz * sin;
  const rz = dx * sin + dz * cos;
  dz = rz;
  if (dz < 1.5) return null;
  const scale = FOCAL / dz;
  return {
    x: CX + rx * scale,
    y: HORIZON_Y - dy * scale - p.pitch * 320,
    scale,
    z: dz,
  };
}

function groundColour(world, x, z) {
  const h = world.terrainHeight(x, z);
  if (world.isWater(x, z)) return h < 0.4 ? PALETTE.riverDeep : PALETTE.river;
  if (h > 34) return PALETTE.groundSnow;
  if (h > 22) return PALETTE.groundRock;
  if (h > 12) return PALETTE.groundHigh;
  if (h > 5) return PALETTE.groundMid;
  return PALETTE.groundLow;
}

function drawSky(ctx, world) {
  const p = world.plane;
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON_Y + 40);
  g.addColorStop(0, PALETTE.skyTop);
  g.addColorStop(0.55, PALETTE.skyMid);
  g.addColorStop(1, PALETTE.skyHorizon);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FIELD.width, HORIZON_Y + 40);

  // Sun, fixed in the sky ahead-left so the light feels constant.
  const sunX = CX - 380 + p.heading * 120;
  const sunY = 96;
  const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 90);
  glow.addColorStop(0, PALETTE.sunCore);
  glow.addColorStop(0.35, PALETTE.sun);
  glow.addColorStop(1, 'rgba(255, 243, 196, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 90, sunY - 90, 180, 180);
  ctx.fillStyle = PALETTE.sunCore;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();

  // The volcano on the horizon, then two nearer ridges, all parallaxed by heading.
  drawRidge(ctx, p, -260, 150, ridgeNoise2, PALETTE.mountainFar, 0.16);
  drawRidge(ctx, p, -60, 210, ridgeNoise, PALETTE.mountainNear, 0.3);
  drawVolcano(ctx, p);
}

function drawRidge(ctx, p, baseY, amp, noise, colour, parallax) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(0, HORIZON_Y + 2);
  const offset = p.heading * 900 * parallax;
  for (let sx = 0; sx <= FIELD.width; sx += 16) {
    const n = noise((sx + offset) * 0.9);
    const y = HORIZON_Y - (baseY + n * amp) * 0.55;
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(FIELD.width, HORIZON_Y + 2);
  ctx.closePath();
  ctx.fill();
  // Snow caps on the far ridge.
  if (colour === PALETTE.mountainFar) {
    ctx.fillStyle = PALETTE.mountainSnow;
    for (let sx = 0; sx < FIELD.width; sx += 16) {
      const n = noise((sx + offset) * 0.9);
      if (n > 0.55) {
        const y = HORIZON_Y - (baseY + n * amp) * 0.55;
        ctx.fillRect(sx, y, 16, 5);
      }
    }
  }
}

function drawVolcano(ctx, p) {
  const peak = volcanoPeak();
  const proj = project({ plane: { ...p, pitch: 0 } }, peak.x, peak.height, peak.z);
  if (!proj) return;
  const w = peak.width * proj.scale * 1.15;
  const h = peak.height * proj.scale * 1.1;
  const baseY = HORIZON_Y + 4;
  const topY = baseY - h;
  ctx.fillStyle = '#6b5a52';
  ctx.beginPath();
  ctx.moveTo(proj.x - w / 2, baseY);
  ctx.lineTo(proj.x - w * 0.16, topY);
  ctx.lineTo(proj.x + w * 0.16, topY);
  ctx.lineTo(proj.x + w / 2, baseY);
  ctx.closePath();
  ctx.fill();
  // Snow cap and a thin smoke plume.
  ctx.fillStyle = PALETTE.mountainSnow;
  ctx.beginPath();
  ctx.moveTo(proj.x - w * 0.16, topY);
  ctx.lineTo(proj.x + w * 0.16, topY);
  ctx.lineTo(proj.x + w * 0.07, topY + h * 0.16);
  ctx.lineTo(proj.x - w * 0.07, topY + h * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(240, 240, 235, 0.55)';
  ctx.beginPath();
  ctx.ellipse(proj.x + w * 0.1, topY - h * 0.1, w * 0.05, h * 0.05, 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawGround(ctx, world) {
  const p = world.plane;
  // Perspective strips from far to near; each strip is a quad across the valley.
  const step = 14;
  const halfSpan = 170;
  const xStep = 14;
  for (let z = p.z + DRAW_DISTANCE; z > p.z + 6; z -= step) {
    const zNear = z - step;
    for (let x = -halfSpan; x < halfSpan; x += xStep) {
      const x2 = x + xStep;
      const a = project(world, x, world.terrainHeight(x, z), z);
      const b = project(world, x2, world.terrainHeight(x2, z), z);
      const c = project(world, x2, world.terrainHeight(x2, zNear), zNear);
      const d = project(world, x, world.terrainHeight(x, zNear), zNear);
      if (!a || !b || !c || !d) continue;
      // The runway is flat asphalt, not grass.
      const onRunway = world.isRunway((x + x2) / 2, (z + zNear) / 2);
      ctx.fillStyle = onRunway ? PALETTE.runway : groundColour(world, (x + x2) / 2, (z + zNear) / 2);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fill();
    }
  }
  drawRunwayMarkings(ctx, world);
}

function drawRunwayMarkings(ctx, world) {
  const p = world.plane;
  // Centreline dashes and edge lines down the runway, plus the "09" threshold.
  for (let z = Math.max(COURSE.runwayStart, Math.floor(p.z / 30) * 30); z < COURSE.runwayEnd; z += 30) {
    const a = project(world, 0, 0.05, z);
    const b = project(world, 0, 0.05, z + 15);
    if (!a || !b) continue;
    ctx.strokeStyle = PALETTE.runwayMark;
    ctx.lineWidth = Math.max(1, 3.2 * a.scale);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (const edge of [-COURSE.runwayHalfWidth + 0.8, COURSE.runwayHalfWidth - 0.8]) {
    const a = project(world, edge, 0.05, Math.max(COURSE.runwayStart, p.z));
    const b = project(world, edge, 0.05, COURSE.runwayEnd);
    if (!a || !b) continue;
    ctx.strokeStyle = 'rgba(242, 242, 232, 0.85)';
    ctx.lineWidth = Math.max(1, 2 * a.scale);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // Threshold bars at the runway start.
  for (const off of [-6, -2, 2, 6]) {
    const a = project(world, off - 1.4, 0.05, COURSE.runwayStart + 6);
    const b = project(world, off + 1.4, 0.05, COURSE.runwayStart + 6);
    const c = project(world, off + 1.4, 0.05, COURSE.runwayStart + 22);
    const d = project(world, off - 1.4, 0.05, COURSE.runwayStart + 22);
    if (!a || !b || !c || !d) continue;
    ctx.fillStyle = PALETTE.runwayMark;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawRings(ctx, world) {
  for (let i = 0; i < COURSE.rings.length; i += 1) {
    const ring = COURSE.rings[i];
    const state = world.ringStates[i];
    if (state === 'passed') continue;
    const proj = project(world, ring.x, ring.y, ring.z);
    if (!proj) continue;
    const r = COURSE.ringRadius * proj.scale;
    if (r < 2) continue;
    // A faint guide beam down to the ground so the ring reads from far away.
    const foot = project(world, ring.x, world.terrainHeight(ring.x, ring.z), ring.z);
    if (foot) {
      ctx.strokeStyle = 'rgba(255, 176, 32, 0.25)';
      ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.beginPath();
      ctx.moveTo(proj.x, proj.y);
      ctx.lineTo(foot.x, foot.y);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(proj.x, proj.y);
    ctx.strokeStyle = PALETTE.ringGlow;
    ctx.lineWidth = Math.max(2, r * 0.22);
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = state === 'missed' ? '#9aa5b1' : PALETTE.ring;
    ctx.lineWidth = Math.max(2, r * 0.1);
    ctx.setLineDash([Math.max(4, r * 0.22), Math.max(4, r * 0.14)]);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // Ring number, readable at a glance.
    if (r > 14) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(12, Math.min(30, r * 0.55))}px ${'system-ui, sans-serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), 0, 1);
    }
    ctx.restore();
  }
}

function drawClouds(ctx, world) {
  const p = world.plane;
  const sorted = [...world.clouds].sort((a, b) => b.z - a.z);
  for (const cloud of sorted) {
    const proj = project(world, cloud.x, cloud.y, cloud.z);
    if (!proj) continue;
    const s = cloud.size * proj.scale;
    if (s < 3) continue;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (const [ox, oy, os] of [[-0.9, 0.1, 0.55], [0, -0.25, 0.75], [0.9, 0.08, 0.6], [0.3, 0.25, 0.7]]) {
      ctx.beginPath();
      ctx.ellipse(proj.x + ox * s, proj.y + oy * s, os * s, os * s * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Birds: tiny flapping chevrons over the fields.
  ctx.strokeStyle = 'rgba(30, 40, 50, 0.8)';
  ctx.lineWidth = 2;
  for (const bird of world.birds) {
    const bx = bird.x + Math.sin(world.time * 0.4 + bird.phase) * 12;
    const proj = project(world, bx, bird.y + Math.sin(world.time * 1.3 + bird.phase) * 3, bird.z);
    if (!proj || proj.scale < 0.4) continue;
    const w = 9 * proj.scale;
    const flap = Math.sin(world.time * 6 + bird.phase) * 3 * proj.scale;
    ctx.beginPath();
    ctx.moveTo(proj.x - w, proj.y - flap);
    ctx.lineTo(proj.x, proj.y);
    ctx.lineTo(proj.x + w, proj.y - flap);
    ctx.stroke();
  }
}

/** The Elang-7 from behind and slightly above, banking with the roll. */
export function drawPlane(ctx, world) {
  const p = world.plane;
  const px = CX;
  const py = 512 + p.pitch * 260;
  const scale = 1 + clamp(30 - p.alt, 0, 20) * 0.004;
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(scale, scale);
  ctx.rotate(p.roll * 0.9);
  // Soft shadow on the ground below, when low.
  if (p.alt < 60 && !p.onGround) {
    const foot = project(world, p.x, world.terrainHeight(p.x, p.z), p.z);
    if (foot) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = `rgba(10, 20, 10, ${clamp(0.35 - p.alt * 0.005, 0.06, 0.35)})`;
      ctx.beginPath();
      ctx.ellipse(foot.x, foot.y, 46, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  // Wings.
  ctx.fillStyle = PALETTE.planeBody;
  ctx.beginPath();
  ctx.moveTo(-118, 6);
  ctx.lineTo(-14, -6);
  ctx.lineTo(14, -6);
  ctx.lineTo(118, 6);
  ctx.lineTo(112, 16);
  ctx.lineTo(0, 12);
  ctx.lineTo(-112, 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.planeAccent;
  ctx.fillRect(-118, 4, 236, 3);
  // Tailplane and fin.
  ctx.fillStyle = PALETTE.planeDark;
  ctx.beginPath();
  ctx.moveTo(-34, -34);
  ctx.lineTo(34, -34);
  ctx.lineTo(22, -18);
  ctx.lineTo(-22, -18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.planeBody;
  ctx.beginPath();
  ctx.moveTo(-6, -58);
  ctx.lineTo(6, -58);
  ctx.lineTo(10, -16);
  ctx.lineTo(-10, -16);
  ctx.closePath();
  ctx.fill();
  // Fuselage, tapering forward (away from the viewer).
  ctx.fillStyle = PALETTE.planeBody;
  ctx.beginPath();
  ctx.moveTo(-13, 14);
  ctx.lineTo(-9, -52);
  ctx.quadraticCurveTo(0, -62, 9, -52);
  ctx.lineTo(13, 14);
  ctx.quadraticCurveTo(0, 22, -13, 14);
  ctx.closePath();
  ctx.fill();
  // Canopy glass.
  ctx.fillStyle = PALETTE.planeGlass;
  ctx.beginPath();
  ctx.ellipse(0, -34, 7, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-2, -38, 2.4, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Engine glow and navigation lights.
  const glow = p.throttle > 0.05 && !p.onGround;
  if (glow) {
    ctx.fillStyle = `rgba(255, ${Math.floor(170 + p.throttle * 60)}, 60, ${0.5 + p.throttle * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(0, 20, 5 + p.throttle * 3, 8 + p.throttle * 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ff4d4d';
  ctx.beginPath();
  ctx.arc(-118, 8, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#37d67a';
  ctx.beginPath();
  ctx.arc(118, 8, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.planeAccent;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ELANG-7', 0, 8);
  ctx.restore();
}

export function render(ctx, world, screen) {
  ctx.clearRect(0, 0, FIELD.width, FIELD.height);
  drawSky(ctx, world);
  drawGround(ctx, world);
  drawRings(ctx, world);
  drawClouds(ctx, world);
  if (screen !== 'title-hidden') drawPlane(ctx, world);
}
