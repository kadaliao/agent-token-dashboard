'use strict';
/* ============================================================
   一个问题的一百二十六年 — film engine
   Everything is a pure function of time t (seconds), so any
   frame can be rendered in any order (live player or offline).
   ============================================================ */
const W = 1080, H = 1920, BEAT = 0.5, BAR = 2;
const DURATION = 176;
const TAU = Math.PI * 2;
const AMBER = '#FFB547';

/* ---------- math ---------- */
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  lin: t => t,
  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  inCubic: t => t * t * t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  inOutQuad: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  outQuart: t => 1 - Math.pow(1 - t, 4),
  inQuart: t => t * t * t * t,
  inExpo: t => t <= 0 ? 0 : Math.pow(2, 10 * t - 10),
  outExpo: t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t),
  inOutExpo: t => t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outBackBig: t => { const c1 = 3.2, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: t => t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * TAU / 3) + 1,
};
function hash(i) {
  i = i | 0; i = (i ^ 61) ^ (i >>> 16); i = i + (i << 3); i = i ^ (i >>> 4);
  i = Math.imul(i, 0x27d4eb2d); i = i ^ (i >>> 15); return (i >>> 0) / 4294967296;
}
const h2 = (a, b) => hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663));
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function noise1(x, seed = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(h2(i, seed), h2(i + 1, seed), u); }
const nz = (x, seed) => noise1(x, seed) * 2 - 1;
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
function mixHex(a, b, t) {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  const r = Math.round(lerp(x >> 16 & 255, y >> 16 & 255, t)), g = Math.round(lerp(x >> 8 & 255, y >> 8 & 255, t)), bl = Math.round(lerp(x & 255, y & 255, t));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
const fmtInt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/* ---------- fonts ---------- */
const F = {
  brush: '"Ma Shan Zheng", "Noto Serif SC", serif',
  serif: '"Noto Serif SC", serif',
  sans: '"Noto Sans SC", sans-serif',
  bodoni: '"Bodoni Moda", "Noto Serif SC", serif',
  type: '"Special Elite", "Noto Serif SC", monospace',
  mono: '"IBM Plex Mono", "Noto Sans SC", monospace',
  crt: '"VT323", "Noto Sans SC", monospace',
  pixel: '"Silkscreen", "Noto Sans SC", monospace',
  swiss: '"Archivo", "Noto Sans SC", sans-serif',
  anton: '"Anton", "ZCOOL QingKe HuangYou", sans-serif',
  block: '"ZCOOL QingKe HuangYou", "Noto Sans SC", sans-serif',
  wide: '"Unbounded", "Noto Sans SC", sans-serif',
  code: '"JetBrains Mono", "Noto Sans SC", monospace',
  sym: '"Noto Sans Symbols 2", "Noto Sans SC", sans-serif',
  goth: '"UnifrakturMaguntia", "Bodoni Moda", serif',
  kr: '"Noto Sans KR", "Noto Sans SC", sans-serif',
};

/* ---------- canvases ---------- */
let S = 1;                       // device pixels per film pixel
let main, ctx, bufA, bufB, fxA, fxB, scratch;
function mk(w = W * S, h = H * S) { const c = document.createElement('canvas'); c.width = Math.round(w); c.height = Math.round(h); return c; }
function initCanvases(canvas, scale) {
  S = scale; main = canvas; main.width = Math.round(W * S); main.height = Math.round(H * S);
  ctx = main.getContext('2d');
  bufA = mk(); bufB = mk(); fxA = mk(); fxB = mk();
  scratch = mk(8, 8).getContext('2d');
}
function resetCtx(c) {
  c.setTransform(S, 0, 0, S, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.shadowBlur = 0; c.shadowColor = 'transparent'; c.filter = 'none'; c.lineCap = 'butt'; c.lineJoin = 'miter'; c.setLineDash([]);
}

/* ---------- text ---------- */
const wCache = new Map();
function cw(c, ch) { const k = c.font + '\u0001' + ch; let w = wCache.get(k); if (w === undefined) { w = c.measureText(ch).width; wCache.set(k, w); } return w; }
function fnt(c, o) { c.font = `${o.style || ''} ${o.weight || 400} ${o.size || 48}px ${o.fam || F.sans}`; }
function layout(c, str, ls) {
  const chars = Array.from(str), n = chars.length, xs = new Array(n), ws = new Array(n); let x = 0;
  for (let i = 0; i < n; i++) { const w = cw(c, chars[i]); xs[i] = x; ws[i] = w; x += w + ls; }
  return { chars, xs, ws, width: n ? x - ls : 0 };
}
function tw(str, o) { fnt(scratch, o); return layout(scratch, str, o.ls || 0).width; }
const SCR = '01#%&@$ABCDEFGHJKLMNPQRSTUVWXYZ<>/*+=';
/* txt: kinetic text. o = {size, fam, weight, style, color, align, ls, p (0..1 in), out (0..1 out),
   mode: rise|drop|pop|fade|slam|scramble|type|none, spread, alpha, glow, stroke, t} */
function txt(c, str, x, y, o = {}) {
  fnt(c, o);
  const ls = o.ls || 0, L = layout(c, str, ls), n = L.chars.length;
  let x0 = x; if (o.align === 'center') x0 = x - L.width / 2; else if (o.align === 'right') x0 = x - L.width;
  L.x0 = x0;
  const p = o.p === undefined ? 1 : o.p, out = o.out || 0, mode = o.mode || 'rise';
  const A = o.alpha === undefined ? 1 : o.alpha, size = o.size || 48;
  const spread = o.spread === undefined ? 0.55 : o.spread;
  if (p <= 0 || out >= 1 || A <= 0) return L;
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillStyle = o.color || '#fff';
  if (o.glow) { c.shadowColor = o.glowColor || o.color || '#fff'; c.shadowBlur = o.glow * S; }
  const base = c.globalAlpha;
  const visible = mode === 'type' ? Math.floor(p * n + 1e-6) : n;
  for (let i = 0; i < n; i++) {
    let ch = L.chars[i]; if (ch === ' ') continue;
    if (mode === 'type' && i >= visible) break;
    const k = n <= 1 ? 0 : i / (n - 1);
    const pi = mode === 'type' ? 1 : clamp((p - k * spread) / (1 - spread));
    const po = out > 0 ? clamp((out - k * spread) / (1 - spread)) : 0;
    let a = A, dy = 0, sc = 1;
    if (mode === 'rise') { a *= E.outCubic(pi); dy = (1 - E.outExpo(pi)) * size * 0.6; }
    else if (mode === 'drop') { a *= clamp(pi * 3); dy = -(1 - E.outBack(pi)) * size * 1.1; }
    else if (mode === 'pop') { sc = E.outBack(pi); a *= clamp(pi * 4); }
    else if (mode === 'fade') { a *= pi; }
    else if (mode === 'slam') { sc = lerp(2.4, 1, E.outExpo(pi)); a *= clamp(pi * 4); }
    else if (mode === 'scramble') { if (pi <= 0) continue; if (pi < 1) ch = SCR[(h2(i, Math.floor((o.t || 0) * 24)) * SCR.length) | 0]; }
    if (po > 0) { a *= 1 - E.inCubic(po); dy -= E.inCubic(po) * size * 0.45; }
    if (a <= 0.004 || sc <= 0.001) continue;
    c.globalAlpha = base * a;
    const cx = x0 + L.xs[i];
    if (sc !== 1) {
      c.save(); c.translate(cx + L.ws[i] / 2, y - size * 0.36 + dy); c.scale(sc, sc);
      if (o.stroke) { c.strokeStyle = o.stroke; c.lineWidth = o.strokeW || 2; c.strokeText(ch, -L.ws[i] / 2, size * 0.36); }
      if (!o.strokeOnly) c.fillText(ch, -L.ws[i] / 2, size * 0.36); c.restore();
    } else {
      if (o.stroke) { c.strokeStyle = o.stroke; c.lineWidth = o.strokeW || 2; c.strokeText(ch, cx, y + dy); }
      if (!o.strokeOnly) c.fillText(ch, cx, y + dy);
    }
  }
  if (o.cursor && mode === 'type') {
    const on = o.cursorSolid || Math.floor((o.t || 0) * 2.2) % 2 === 0;
    if (on) { c.globalAlpha = base * A; c.fillStyle = o.cursorColor || o.color || '#fff'; const cxp = x0 + (visible < n ? L.xs[visible] : L.width + ls + 4); c.fillRect(cxp, y - size * 0.82, size * 0.5, size * 0.98); }
  }
  c.globalAlpha = base; c.shadowBlur = 0; c.shadowColor = 'transparent';
  return L;
}
/* line that animates in at t0 (scene-local) and optionally out at o.t1 */
function lin(c, lt, t0, str, x, y, o = {}) {
  const p = prog(lt, t0, t0 + (o.dur || 0.55));
  if (p <= 0) return null;
  const out = o.t1 !== undefined ? prog(lt, o.t1, o.t1 + (o.odur || 0.35)) : 0;
  if (out >= 1) return null;
  return txt(c, str, x, y, Object.assign({}, o, { p, out, t: lt }));
}
/* typed text driven by explicit per-char times */
function typed(c, lt, times, str, x, y, o = {}) {
  let v = 0; while (v < times.length && times[v] <= lt) v++;
  if (v === 0 && !o.cursorBefore) return null;
  const n = Array.from(str).length;
  return txt(c, str, x, y, Object.assign({}, o, { mode: 'type', p: v / n, t: lt, cursor: o.cursor && (v < n || o.cursorAfter) }));
}
function typeTimes(str, t0, cps, seed = 1, jitter = 0.35) {
  const out = []; let t = t0; const chars = Array.from(str);
  for (let i = 0; i < chars.length; i++) { out.push(t); t += (1 / cps) * (1 + (hash(seed * 997 + i) - 0.5) * 2 * jitter) * (chars[i] === ' ' ? 0.8 : 1); }
  return out;
}

/* pixel text: rendered small, thresholded, blown up with nearest-neighbour */
const pixCache = new Map();
function pixelSprite(str, size, fam, weight, color, px) {
  const key = [str, size, fam, weight, color, px].join('|');
  let s = pixCache.get(key); if (s) return s;
  const fs = Math.max(6, Math.round(size / px));
  const o = { size: fs, fam, weight }; const w = Math.ceil(tw(str, o)) + 4, h = Math.ceil(fs * 1.5);
  const cv = mk(w, h), x = cv.getContext('2d');
  fnt(x, o); x.fillStyle = color; x.textBaseline = 'alphabetic'; x.fillText(str, 2, Math.round(fs * 1.1));
  const id = x.getImageData(0, 0, w, h), d = id.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 110 ? 255 : 0;
  x.putImageData(id, 0, 0);
  s = { cv, w: w * px, h: h * px, base: Math.round(fs * 1.1) * px, px };
  pixCache.set(key, s); return s;
}
function ptxt(c, str, x, y, o = {}) {
  const sp = pixelSprite(str, o.size || 48, o.fam || F.sans, o.weight || 700, o.color || '#fff', o.px || 5);
  let x0 = x; if (o.align === 'center') x0 = x - sp.w / 2; else if (o.align === 'right') x0 = x - sp.w;
  const p = o.p === undefined ? 1 : o.p; if (p <= 0) return sp;
  const prevS = c.imageSmoothingEnabled; c.imageSmoothingEnabled = false;
  const a0 = c.globalAlpha; c.globalAlpha = a0 * (o.alpha === undefined ? 1 : o.alpha);
  if (o.glow) { c.shadowColor = o.color; c.shadowBlur = o.glow * S; }
  const vis = o.typeP === undefined ? 1 : o.typeP;
  const sw = sp.cv.width * vis;
  if (sw > 0) c.drawImage(sp.cv, 0, 0, sw, sp.cv.height, x0, y - sp.base, sw * sp.px, sp.h);
  c.shadowBlur = 0; c.shadowColor = 'transparent';
  c.globalAlpha = a0; c.imageSmoothingEnabled = prevS; return sp;
}

/* ---------- drawing helpers ---------- */
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
const glowCache = {};
function glowSprite(col) {
  if (glowCache[col]) return glowCache[col];
  const g = mk(256, 256), x = g.getContext('2d'), gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, hexA(col, 1)); gr.addColorStop(0.18, hexA(col, 0.6)); gr.addColorStop(0.5, hexA(col, 0.16)); gr.addColorStop(1, hexA(col, 0));
  x.fillStyle = gr; x.fillRect(0, 0, 256, 256); return glowCache[col] = g;
}
function glow(c, x, y, r, col, a = 1) {
  if (a <= 0) return; const g = c.globalCompositeOperation, a0 = c.globalAlpha;
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = a0 * a; c.drawImage(glowSprite(col), x - r, y - r, 2 * r, 2 * r);
  c.globalCompositeOperation = g; c.globalAlpha = a0;
}
function bg(c, col) { c.fillStyle = col; c.fillRect(-60, -60, W + 120, H + 120); }
function vgrad(c, a, b) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(-60, -60, W + 120, H + 120); }
/* the protagonist: the amber question mark */
function question(c, x, y, size, a = 1, col = AMBER) {
  if (a <= 0) return;
  glow(c, x, y - size * 0.36, size * 0.9, col, 0.35 * a);
  txt(c, '?', x, y, { size, fam: F.bodoni, weight: 900, color: col, align: 'center', alpha: a, mode: 'none' });
}

/* ---------- post fx ---------- */
let grainTiles = null, vigCv = null, scanPat = null;
function initFX() {
  grainTiles = [];
  for (let k = 0; k < 6; k++) {
    const g = mk(256, 256), x = g.getContext('2d'), id = x.createImageData(256, 256), d = id.data, r = rng(1000 + k);
    for (let i = 0; i < d.length; i += 4) { const v = r() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    x.putImageData(id, 0, 0); grainTiles.push(g);
  }
  vigCv = mk(W / 2, H / 2); const v = vigCv.getContext('2d');
  const gr = v.createRadialGradient(W / 4, H / 4, H * 0.18, W / 4, H / 4, H * 0.62);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); v.fillStyle = gr; v.fillRect(0, 0, W / 2, H / 2);
  const sp = mk(4, 4), sx = sp.getContext('2d'); sx.fillStyle = 'rgba(0,0,0,0.55)'; sx.fillRect(0, 0, 4, 2);
  scanPat = sp;
}
function grain(c, t, amt, scale = 1.6, op = 'overlay') {
  const f = Math.floor(t * 24), tile = grainTiles[f % 6];
  const pat = c.createPattern(tile, 'repeat');
  pat.setTransform(new DOMMatrix().translate(h2(f, 3) * 256, h2(f, 4) * 256).scale(scale));
  c.save(); c.globalCompositeOperation = op; c.globalAlpha = amt; c.fillStyle = pat; c.fillRect(0, 0, W, H); c.restore();
}
function vignette(c, a) { c.save(); c.globalAlpha = a; c.drawImage(vigCv, 0, 0, W, H); c.restore(); }
function scanlines(c, a) { const pat = c.createPattern(scanPat, 'repeat'); c.save(); c.globalAlpha = a; c.fillStyle = pat; c.fillRect(0, 0, W, H); c.restore(); }
/* silent film: grain, scratches, dust, flicker */
function filmFX(c, t, k = 1) {
  const f = Math.floor(t * 24);
  grain(c, t, 0.22 * k, 1.4);
  c.save();
  for (let i = 0; i < 3; i++) {
    if (h2(f, 10 + i) > 0.55) continue;
    const x = h2(f, 20 + i) * W, dark = h2(f, 30 + i) > 0.5;
    c.globalAlpha = (0.12 + h2(f, 40 + i) * 0.25) * k; c.fillStyle = dark ? '#000' : '#fff';
    c.fillRect(x, 0, 1.5 + h2(f, 50 + i) * 2, H);
  }
  for (let i = 0; i < 6; i++) {
    if (h2(f, 60 + i) > 0.35) continue;
    c.globalAlpha = 0.5 * k; c.fillStyle = h2(f, 70 + i) > 0.5 ? '#000' : '#eee';
    c.beginPath(); c.ellipse(h2(f, 80 + i) * W, h2(f, 90 + i) * H, 2 + h2(f, 95 + i) * 6, 1.5 + h2(f, 99 + i) * 4, h2(f, 7 + i) * 3, 0, TAU); c.fill();
  }
  c.globalAlpha = (0.05 + h2(f, 5) * 0.09) * k; c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  c.restore();
  vignette(c, 0.55 * k);
}
function fxChroma(cv, dx) {
  const w = cv.width, h = cv.height, a = fxA.getContext('2d'), b = fxB.getContext('2d'), x = cv.getContext('2d');
  for (const [cx, col] of [[a, '#ff0000'], [b, '#00ffff']]) {
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalAlpha = 1; cx.globalCompositeOperation = 'copy'; cx.drawImage(cv, 0, 0);
    cx.globalCompositeOperation = 'multiply'; cx.fillStyle = col; cx.fillRect(0, 0, w, h); cx.globalCompositeOperation = 'source-over';
  }
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'lighter'; x.drawImage(fxA, -dx * S, 0); x.drawImage(fxB, dx * S, 0); x.restore();
}
function fxSlices(cv, t, n, amp, seed = 0) {
  const a = fxA.getContext('2d'), x = cv.getContext('2d'), w = cv.width, h = cv.height, f = Math.floor(t * 30);
  a.setTransform(1, 0, 0, 1, 0, 0); a.globalCompositeOperation = 'copy'; a.drawImage(cv, 0, 0); a.globalCompositeOperation = 'source-over';
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < n; i++) {
    const y = Math.floor(h2(f + seed, i * 3) * h), hh = Math.max(2, Math.floor(h2(f + seed, i * 3 + 1) * h * 0.08));
    const dx = (h2(f + seed, i * 3 + 2) - 0.5) * 2 * amp * S;
    x.drawImage(fxA, 0, y, w, hh, dx, y, w, hh);
  }
  x.restore();
}

/* ---------- snow & frost ---------- */
function snow(c, t, n = 260, speed = 1, a = 1, wind = 0) {
  c.save(); c.fillStyle = '#EAF4FF';
  for (let i = 0; i < n; i++) {
    const layer = h2(i, 1), sz = 1.5 + layer * layer * 7, sp = (50 + layer * 170) * speed;
    const y = ((h2(i, 2) * (H + 80) + t * sp) % (H + 80)) - 40;
    const x = ((h2(i, 3) * W + Math.sin(t * (0.6 + h2(i, 4)) + i) * 26 * layer + t * wind * sp * 0.4) % (W + 40) + W + 40) % (W + 40) - 20;
    c.globalAlpha = a * (0.35 + layer * 0.6);
    c.beginPath(); c.arc(x, y, sz, 0, TAU); c.fill();
  }
  c.restore();
}
let FROST = null;
function buildFrost() {
  const r = rng(4242), buckets = Array.from({ length: 12 }, () => new Path2D());
  function seg(x1, y1, x2, y2, reach) { const b = buckets[Math.min(11, Math.floor(reach * 12))]; b.moveTo(x1, y1); b.lineTo(x2, y2); }
  function arm(x, y, ang, len, reach0, depth) {
    let px = x, py = y, reach = reach0;
    const steps = Math.floor(len / 18);
    for (let s = 0; s < steps; s++) {
      const nx = px + Math.cos(ang) * 18, ny = py + Math.sin(ang) * 18; reach += 18 / 520;
      seg(px, py, nx, ny, reach);
      if (depth < 2 && r() < 0.45) { const side = r() < 0.5 ? 1 : -1; arm(nx, ny, ang + side * Math.PI / 3, len * (0.3 + r() * 0.3) * (1 - s / steps), reach, depth + 1); }
      px = nx; py = ny; ang += (r() - 0.5) * 0.12;
    }
  }
  for (let k = 0; k < 90; k++) {
    const e = Math.floor(r() * 4); let x, y, ang;
    if (e === 0) { x = r() * W; y = 0; ang = Math.PI / 2; } else if (e === 1) { x = r() * W; y = H; ang = -Math.PI / 2; }
    else if (e === 2) { x = 0; y = r() * H; ang = 0; } else { x = W; y = r() * H; ang = Math.PI; }
    arm(x, y, ang + (r() - 0.5) * 1.3, 140 + r() * 360, 0, 0);
  }
  FROST = buckets;
}
function frost(c, p, a = 1) {
  if (p <= 0) return;
  c.save();
  const g = c.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.7);
  g.addColorStop(0, 'rgba(220,238,255,0)'); g.addColorStop(1, `rgba(220,238,255,${0.5 * p * a})`);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.strokeStyle = `rgba(235,246,255,${0.55 * a})`; c.lineWidth = 2; c.lineCap = 'round';
  const nb = Math.floor(p * 12);
  for (let i = 0; i < nb; i++) c.stroke(FROST[i]);
  c.restore();
}

/* ---------- act cards (brush-ink chapter marks) ---------- */
function actCard(c, lt, o) {
  bg(c, o.bg);
  if (o.under) o.under(c, lt);
  const p = prog(lt, 0.02, 0.5), sc = lerp(1.1, 1.0, E.outExpo(prog(lt, 0, 1.4)));
  c.save(); c.translate(540, 1000); c.scale(sc, sc);
  const th = lerp(-1400, 1600, E.outCubic(p));
  c.beginPath(); c.moveTo(-2000, -2000); c.lineTo(th + 1000, -2000); c.lineTo(th - 1000, 2000); c.lineTo(-2000, 2000); c.closePath(); c.clip();
  if (o.fill) c.fillStyle = o.fill(c); else c.fillStyle = o.fg;
  if (o.glowCol) glow(c, 0, -300, 700, o.glowCol, 0.35);
  fnt(c, { size: 860, fam: F.brush }); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  if (!o.fill) c.fillStyle = o.fg;
  c.fillText(o.ch, 0, 290);
  // ink splatter
  const r = rng(o.seed || 9);
  for (let i = 0; i < 26; i++) {
    const ang = r() * TAU, d = 330 + r() * 260, x = Math.cos(ang) * d * 0.9, y = Math.sin(ang) * d - 60, rad = 3 + r() * r() * 22;
    c.beginPath(); c.arc(x, y, rad, 0, TAU); c.fill();
  }
  c.restore();
  lin(c, lt, 0.25, o.num, 540, 330, { size: 42, fam: F.serif, weight: 700, color: o.sub, align: 'center', ls: 18 });
  lin(c, lt, 0.4, o.en, 540, 1500, { size: 46, fam: F.bodoni, style: 'italic', color: o.sub, align: 'center', ls: 8 });
  lin(c, lt, 0.55, o.years, 540, 1575, { size: 30, fam: F.mono, color: o.sub, align: 'center', ls: 10, alpha: 0.75 });
  if (o.over) o.over(c, lt);
}

/* ---------- registries: scenes, cues, impulses ---------- */
const SCENES = [], CUES = [], KICKS = [], FLASHES = [];
function scene(o) { o.tin = o.tin || 0; SCENES.push(o); return o; }
function cue(t, type, extra) { CUES.push(Object.assign({ t: +t.toFixed(4), type }, extra || {})); }
function kick(t, amp = 14, decay = 9) { KICKS.push({ t, amp, decay }); }
function flash(t, color = '#fff', dur = 0.12, a = 0.8) { FLASHES.push({ t, color, dur, a }); }

/* year program for the time ruler */
const YSEG = [];
function yseg(t0, t1, y0, y1, ease = 'outExpo') { YSEG.push({ t0, t1, y0, y1, ease }); }
function yearAt(t) {
  let y = 2026;
  for (const s of YSEG) {
    if (t >= s.t1) y = s.y1;
    else if (t >= s.t0) { const k = (t - s.t0) / (s.t1 - s.t0); y = s.ease === 'step' ? s.y0 + Math.floor(k * (s.y1 - s.y0 + 0.999)) : lerp(s.y0, s.y1, E[s.ease](k)); break; }
    else break;
  }
  return y;
}
function drawRuler(c, t, ink, a) {
  if (a <= 0) return;
  const yr = yearAt(t), cy = 960, ppy = 15;
  c.save(); c.fillStyle = ink;
  const lo = Math.floor(yr - cy / ppy) - 1, hi = Math.ceil(yr + (H - cy) / ppy) + 1;
  for (let y = Math.max(1896, lo); y <= Math.min(2030, hi); y++) {
    const sy = cy + (y - yr) * ppy, dec = y % 10 === 0, five = y % 5 === 0;
    const len = dec ? 30 : five ? 18 : 9;
    c.globalAlpha = a * (dec ? 0.85 : 0.4) * (1 - clamp(Math.abs(sy - cy) / 1000) * 0.75);
    c.fillRect(0, sy - 1, len, 2);
  }
  c.globalAlpha = a; c.fillStyle = AMBER;
  c.beginPath(); c.moveTo(0, cy - 11); c.lineTo(16, cy); c.lineTo(0, cy + 11); c.closePath(); c.fill();
  c.fillRect(0, cy - 1.5, 44, 3);
  c.translate(36, cy - 24); c.rotate(-Math.PI / 2);
  txt(c, String(Math.round(yr)), 0, 0, { size: 26, fam: F.mono, weight: 600, color: AMBER, mode: 'none', ls: 2 });
  c.restore();
}

/* ---------- transitions ---------- */
const TRANS = {
  cut(c, A, B, k) { c.drawImage(B, 0, 0, W, H); },
  fade(c, A, B, k) { c.drawImage(A, 0, 0, W, H); c.globalAlpha = E.inOutQuad(k); c.drawImage(B, 0, 0, W, H); c.globalAlpha = 1; },
  whipUp(c, A, B, k) {
    const e = E.inOutExpo(k), off = e * H;
    c.drawImage(A, 0, -off, W, H); c.drawImage(B, 0, H - off, W, H);
    const blur = Math.sin(k * Math.PI);
    if (blur > 0.05) { c.globalAlpha = 0.35 * blur; for (let i = 1; i <= 3; i++) { c.drawImage(A, 0, -off + i * 40 * blur, W, H); c.drawImage(B, 0, H - off + i * 40 * blur, W, H); } c.globalAlpha = 1; }
  },
  iris(c, A, B, k) {
    c.drawImage(A, 0, 0, W, H);
    c.save(); c.beginPath(); c.arc(W / 2, H / 2, E.inOutCubic(k) * 1150, 0, TAU); c.clip(); c.drawImage(B, 0, 0, W, H); c.restore();
  },
  tear(c, A, B, k) {
    c.drawImage(B, 0, 0, W, H);
    const e = E.inOutCubic(k), y = lerp(-80, H + 200, e);
    c.save(); c.beginPath(); c.moveTo(0, H + 400);
    for (let x = 0; x <= W; x += 30) c.lineTo(x, y + (h2(x, 7) - 0.5) * 70 + Math.sin(x * 0.02) * 30);
    c.lineTo(W, H + 400); c.closePath(); c.clip();
    c.drawImage(A, 0, 0, W, H); c.restore();
    c.save(); c.strokeStyle = 'rgba(255,250,240,0.9)'; c.lineWidth = 7; c.beginPath();
    for (let x = 0; x <= W; x += 30) { const yy = y + (h2(x, 7) - 0.5) * 70 + Math.sin(x * 0.02) * 30; x ? c.lineTo(x, yy) : c.moveTo(x, yy); }
    c.stroke(); c.restore();
  },
  zoom(c, A, B, k) {
    const e = E.inExpo(k);
    c.save(); c.translate(W / 2, H / 2); c.scale(1 + e * 3, 1 + e * 3); c.globalAlpha = 1 - e; c.drawImage(A, -W / 2, -H / 2, W, H); c.restore();
    c.save(); c.globalAlpha = E.outCubic(k); c.translate(W / 2, H / 2); const s2 = lerp(0.85, 1, E.outCubic(k)); c.scale(s2, s2); c.drawImage(B, -W / 2, -H / 2, W, H); c.restore();
  },
  glitch(c, A, B, k) {
    const f = Math.floor(k * 12);
    c.drawImage(h2(f, 1) < k ? B : A, 0, 0, W, H);
    for (let i = 0; i < 14; i++) {
      const y = h2(f, i + 5) * H, hh = 20 + h2(f, i + 40) * 140, src = h2(f, i + 80) < 0.5 ? A : B;
      c.drawImage(src, 0, y * S, W * S, hh * S, (h2(f, i + 120) - 0.5) * 160, y, W, hh);
    }
  },
  crtOff(c, A, B, k) {
    c.drawImage(B, 0, 0, W, H);
    if (k > 0.7) return;
    const e = k / 0.7, sy = Math.max(0.004, 1 - E.outExpo(e * 1.4)), sx = e > 0.6 ? 1 - E.inExpo((e - 0.6) / 0.4) : 1;
    c.save(); c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    c.translate(W / 2, H / 2); c.scale(sx, sy); c.drawImage(A, -W / 2, -H / 2, W, H);
    c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(200,255,220,${e})`; c.fillRect(-W / 2, -H / 2, W, H); c.restore();
  },
};

/* ---------- main render ---------- */
function sceneIndex(t) { for (let i = SCENES.length - 1; i >= 0; i--) if (t >= SCENES[i].s) return i; return 0; }
function shakeAt(t) {
  let x = 0, y = 0;
  for (const k of KICKS) { const d = t - k.t; if (d < 0 || d > 1.2) continue; const m = k.amp * Math.exp(-d * k.decay); x += nz(t * 40, k.t * 10) * m; y += nz(t * 40, k.t * 10 + 5) * m; }
  return [x, y];
}
function drawScene(buf, sc, t) {
  const c = buf.getContext('2d'); resetCtx(c);
  const lt = t - sc.s, d = sc.e - sc.s;
  const [sx, sy] = shakeAt(t);
  c.save();
  if (sx || sy) c.translate(sx, sy);
  if (sc.weave) c.translate(nz(t * 3.1, 2) * 3, nz(t * 2.3, 3) * 4);
  sc.draw(c, lt, d, t);
  c.restore(); resetCtx(c);
  if (sc.post) { sc.post(c, lt, d, t, buf); resetCtx(c); }
}
function render(t) {
  t = clamp(t, 0, DURATION - 1e-4);
  const i = sceneIndex(t), cur = SCENES[i];
  drawScene(bufA, cur, t);
  resetCtx(ctx); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, main.width, main.height);
  resetCtx(ctx);
  const inT = cur.tin && i > 0 && t < cur.s + cur.tin;
  if (inT) {
    const prev = SCENES[i - 1]; drawScene(bufB, prev, t);
    TRANS[cur.trans || 'cut'](ctx, bufB, bufA, (t - cur.s) / cur.tin);
  } else ctx.drawImage(bufA, 0, 0, W, H);
  resetCtx(ctx);
  // time ruler
  const hudSc = inT ? SCENES[i - 1] : cur;
  const ha = hudSc.hud ? (typeof hudSc.hud === 'function' ? hudSc.hud(t - hudSc.s) : 1) : 0;
  if (ha > 0) drawRuler(ctx, t, hudSc.ink || '#fff', ha * 0.9);
  // flashes
  for (const f of FLASHES) { const d = t - f.t; if (d >= 0 && d < f.dur) { ctx.globalAlpha = f.a * (1 - d / f.dur); ctx.fillStyle = f.color; ctx.fillRect(0, 0, W, H); } }
  ctx.globalAlpha = 1;
}
