// 基础：数学、缓动、颜色、随机、字体、绘图原语。所有画面只由时间 t 决定。
import { Canvas, FontLibrary } from 'skia-canvas';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const W = 1920, H = 1080, FPS = 60;

const f = (n) => path.join(ROOT, 'fonts', n);
FontLibrary.use('Serif', [f('NotoSerifSC-Regular.otf'), f('NotoSerifSC-SemiBold.otf'), f('NotoSerifSC-Bold.otf'), f('NotoSerifSC-Black.otf')]);
FontLibrary.use('Sans', [f('NotoSansSC-Light.otf'), f('NotoSansSC-Regular.otf'), f('NotoSansSC-Medium.otf'), f('NotoSansSC-Bold.otf')]);

// ---------- math ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const inv = (a, b, x) => (b === a ? (x >= b ? 1 : 0) : clamp((x - a) / (b - a)));
export const TAU = Math.PI * 2;
export const E = {
  lin: (x) => x,
  inQuad: (x) => x * x,
  outQuad: (x) => 1 - (1 - x) * (1 - x),
  inOutQuad: (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  inCubic: (x) => x * x * x,
  outCubic: (x) => 1 - Math.pow(1 - x, 3),
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outQuart: (x) => 1 - Math.pow(1 - x, 4),
  inOutQuart: (x) => (x < 0.5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2),
  outExpo: (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOutExpo: (x) => (x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
  inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  outBack: (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
  outElastic: (x) => (x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (TAU / 3)) + 1),
};
// 从 start 起、历时 dur 的进度（已缓动）
export const P = (t, start, dur, ease = E.outCubic) => ease(inv(start, start + dur, t));
// 进出场包络：a 处淡入 din 秒，b 处淡出 dout 秒
export const env = (t, a, b, din = 0.5, dout = 0.5) => Math.min(E.outCubic(inv(a, a + din, t)), 1 - E.inOutCubic(inv(b - dout, b, t)));
// 阻尼弹簧（0→1），用于落下、弹出
export const spring = (x, k = 7, z = 0.55) => (x <= 0 ? 0 : 1 - Math.exp(-z * k * x) * Math.cos(k * Math.sqrt(1 - z * z) * x * 1.35));

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// 平滑一维噪声（确定性），用于有机漂移
export function noise1(x, seed = 0) {
  const h = (n) => { const s = Math.sin((n + seed * 131.7) * 127.1) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), fr = x - i, u = fr * fr * (3 - 2 * fr);
  return lerp(h(i), h(i + 1), u) * 2 - 1;
}

// ---------- color ----------
export const C = {
  bg0: '#060A14', bg1: '#0B1224', bg2: '#131C36',
  ink: '#F4EFE6', ink2: '#C9C4BA', mute: '#7D879F', faint: '#3A4460',
  gold: '#F5B942', gold2: '#FFD98A', amber: '#E88F3A',
  coral: '#FF6259', coral2: '#FF9A8B',
  teal: '#3FD6C3', teal2: '#9BF2E6',
  blue: '#5C8DFF', blue2: '#A9C2FF', violet: '#9D7CFF',
  paper: '#F3ECDF', paperInk: '#1B2236',
};
const hexCache = new Map();
export function rgba(hex, a = 1) {
  let v = hexCache.get(hex);
  if (!v) { const h = hex.replace('#', ''); v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; hexCache.set(hex, v); }
  return `rgba(${v[0]},${v[1]},${v[2]},${clamp(a)})`;
}
export function mix(h1, h2, t) {
  const a = rgba(h1).match(/\d+/g).map(Number), b = rgba(h2).match(/\d+/g).map(Number);
  const c = [0, 1, 2].map((i) => Math.round(lerp(a[i], b[i], clamp(t))));
  return '#' + c.map((x) => x.toString(16).padStart(2, '0')).join('');
}

// ---------- sprites（预渲染，快速加色发光） ----------
const spriteCache = new Map();
export function glowSprite(hex, r = 64, core = 0.0) {
  const k = `${hex}|${r}|${core}`;
  if (spriteCache.has(k)) return spriteCache.get(k);
  const cv = new Canvas(r * 2, r * 2), g = cv.getContext('2d');
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, rgba(hex, 1)); gr.addColorStop(Math.max(0.01, core), rgba(hex, 0.55));
  gr.addColorStop(0.35, rgba(hex, 0.16)); gr.addColorStop(0.7, rgba(hex, 0.04)); gr.addColorStop(1, rgba(hex, 0));
  g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
  spriteCache.set(k, cv); return cv;
}
export function glow(ctx, x, y, radius, hex, alpha = 1) {
  if (alpha <= 0.002 || radius <= 0) return;
  const s = glowSprite(hex);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(alpha);
  ctx.drawImage(s, x - radius, y - radius, radius * 2, radius * 2); ctx.restore();
}
// 光点：实心核 + 光晕
export function dot(ctx, x, y, r, hex, alpha = 1, halo = 3.2, haloA = 0.55) {
  if (alpha <= 0.002) return;
  glow(ctx, x, y, r * halo, hex, alpha * haloA);
  ctx.globalAlpha = clamp(alpha); ctx.fillStyle = hex;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
}

// ---------- text ----------
export function font(ctx, size, family = 'Sans', weight = 400) { ctx.font = `${weight} ${size}px ${family}`; }
export function measure(ctx, s, size, family = 'Sans', weight = 400, spacing = 0) {
  font(ctx, size, family, weight);
  let w = 0; for (const ch of s) w += ctx.measureText(ch).width + spacing;
  return w - spacing;
}
/** 文本：可逐字出现（p=0..1），每个字上浮+淡入。align: left|center|right；返回宽度 */
export function text(ctx, s, x, y, o = {}) {
  const { size = 44, family = 'Sans', weight = 400, color = C.ink, align = 'left', alpha = 1, p = 1,
    spacing = 0, rise = 0.35, spread = 0.45, shadow = 0, glowHex = null, glowA = 0.35, baseline = 'middle' } = o;
  if (alpha <= 0.002 || p <= 0) return 0;
  font(ctx, size, family, weight);
  const chars = [...s], ws = chars.map((c) => ctx.measureText(c).width);
  const total = ws.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.textBaseline = baseline; ctx.textAlign = 'left';
  const n = chars.length;
  if (shadow) { ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = shadow; ctx.shadowOffsetY = shadow * 0.15; }
  for (let i = 0; i < n; i++) {
    // 逐字：第 i 个字在 [i/n*(1-spread), i/n*(1-spread)+spread] 区间内完成
    const a0 = n <= 1 ? 0 : (i / (n - 1)) * (1 - spread);
    const q = p >= 1 ? 1 : E.outCubic(inv(a0, a0 + spread, p));
    if (q > 0) {
      ctx.globalAlpha = clamp(alpha * q);
      ctx.fillStyle = color;
      const dy = (1 - q) * size * rise;
      if (glowHex && q > 0.5) { ctx.save(); ctx.shadowColor = rgba(glowHex, glowA * alpha); ctx.shadowBlur = size * 0.5; ctx.fillText(chars[i], cx, y + dy); ctx.restore(); }
      else ctx.fillText(chars[i], cx, y + dy);
    }
    cx += ws[i] + spacing;
  }
  ctx.globalAlpha = 1; ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  return total;
}
/** 多段不同样式拼成一行：parts=[{s, color, size, family, weight}]，整体对齐 */
export function rich(ctx, parts, x, y, o = {}) {
  const { align = 'center', alpha = 1, p = 1, spacing = 0 } = o;
  const widths = parts.map((q) => measure(ctx, q.s, q.size || o.size || 44, q.family || o.family || 'Sans', q.weight || o.weight || 400, spacing));
  const gap = o.gap ?? 0;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (parts.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const n = parts.length;
  parts.forEach((q, i) => {
    const a0 = n <= 1 ? 0 : (i / (n - 1)) * 0.5;
    const pp = p >= 1 ? 1 : inv(a0, a0 + 0.5, p);
    text(ctx, q.s, cx, y + (q.dy || 0), { ...o, ...q, align: 'left', p: pp, alpha: alpha * (q.alpha ?? 1) });
    cx += widths[i] + gap;
  });
  return total;
}
export function fmtNum(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

// ---------- shapes ----------
export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
/** 胶囊标签 */
export function chip(ctx, s, x, y, o = {}) {
  const { size = 26, color = C.ink, bg = 'rgba(255,255,255,0.06)', stroke = 'rgba(255,255,255,0.16)', alpha = 1, align = 'center',
    padX = size * 0.75, h = size * 1.75, weight = 500, family = 'Sans', dot: dotHex = null, p = 1 } = o;
  if (alpha <= 0.002) return;
  const tw = measure(ctx, s, size, family, weight) + (dotHex ? size * 0.9 : 0);
  const w = tw + padX * 2;
  const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const q = E.outBack(clamp(p), 1.4);
  ctx.save(); ctx.globalAlpha = clamp(alpha * clamp(p * 2));
  ctx.translate(x0 + w / 2, y); ctx.scale(lerp(0.85, 1, q), lerp(0.85, 1, q)); ctx.translate(-(x0 + w / 2), -y);
  rr(ctx, x0, y - h / 2, w, h, h / 2);
  ctx.fillStyle = bg; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  let tx = x0 + padX;
  if (dotHex) { ctx.fillStyle = dotHex; ctx.beginPath(); ctx.arc(tx + size * 0.28, y, size * 0.22, 0, TAU); ctx.fill(); tx += size * 0.9; }
  ctx.restore();
  text(ctx, s, tx, y + 1, { size, color, weight, family, alpha: alpha * clamp(p * 2) });
  return w;
}
/** 沿折线/路径按比例描出：pts=[[x,y],...] */
export function polyline(ctx, pts, p = 1, o = {}) {
  const { color = C.ink, width = 2, alpha = 1, cap = 'round', dash = null, join = 'round' } = o;
  if (p <= 0 || alpha <= 0.002 || pts.length < 2) return null;
  let L = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  let rem = L * clamp(p);
  ctx.save(); ctx.globalAlpha = clamp(alpha); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = cap; ctx.lineJoin = join;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  let end = pts[0];
  for (let i = 1; i < pts.length && rem > 0; i++) {
    const d = seg[i - 1];
    if (rem >= d) { ctx.lineTo(pts[i][0], pts[i][1]); end = pts[i]; rem -= d; }
    else { const k = rem / d; end = [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]; ctx.lineTo(end[0], end[1]); rem = 0; }
  }
  ctx.stroke(); ctx.restore();
  return end;
}
/** Path2D 描边动画（用虚线偏移），len 为路径估计长度 */
export function strokeDraw(ctx, path2d, len, p, o = {}) {
  const { color = C.ink, width = 3, alpha = 1 } = o;
  if (p <= 0 || alpha <= 0.002) return;
  ctx.save(); ctx.globalAlpha = clamp(alpha); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (p < 1) { ctx.setLineDash([len, len + 10]); ctx.lineDashOffset = len * (1 - p); }
  ctx.stroke(path2d); ctx.restore();
}
export function arrow(ctx, x1, y1, x2, y2, p = 1, o = {}) {
  const { color = C.ink, width = 3, head = 16, alpha = 1, dash = null } = o;
  if (p <= 0) return;
  const end = polyline(ctx, [[x1, y1], [x2, y2]], p, { color, width, alpha, dash });
  if (!end || p < 0.15) return;
  const a = Math.atan2(y2 - y1, x2 - x1), hp = clamp((p - 0.15) / 0.3);
  ctx.save(); ctx.globalAlpha = clamp(alpha * hp); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(end[0] - head * Math.cos(a - 0.5), end[1] - head * Math.sin(a - 0.5));
  ctx.lineTo(end[0], end[1]); ctx.lineTo(end[0] - head * Math.cos(a + 0.5), end[1] - head * Math.sin(a + 0.5)); ctx.stroke(); ctx.restore();
}
/** 对勾 */
export function check(ctx, x, y, s, p, o = {}) {
  polyline(ctx, [[x - s * 0.5, y], [x - s * 0.15, y + s * 0.35], [x + s * 0.55, y - s * 0.4]], p, { width: o.width || s * 0.12, color: o.color || C.teal, alpha: o.alpha ?? 1 });
}
/** 叉 */
export function cross(ctx, x, y, s, p, o = {}) {
  const w = o.width || s * 0.12, c = o.color || C.coral, a = o.alpha ?? 1;
  polyline(ctx, [[x - s / 2, y - s / 2], [x + s / 2, y + s / 2]], clamp(p * 2), { width: w, color: c, alpha: a });
  polyline(ctx, [[x + s / 2, y - s / 2], [x - s / 2, y + s / 2]], clamp(p * 2 - 1), { width: w, color: c, alpha: a });
}
/** 小人：头 + 圆角身体。s=身高比例（1≈成年人 160px 高）。outline=虚线轮廓 */
export function person(ctx, x, y, s = 1, o = {}) {
  const { color = C.ink, alpha = 1, outline = false, glowHex = null, glowA = 0.3 } = o;
  if (alpha <= 0.002) return;
  const hr = 20 * s, bw = 56 * s, bh = 72 * s, top = y - bh - hr * 2 - 8 * s;
  if (glowHex) glow(ctx, x, y - bh * 0.7, 120 * s, glowHex, glowA * alpha);
  ctx.save(); ctx.globalAlpha = clamp(alpha);
  ctx.beginPath(); ctx.arc(x, top + hr, hr, 0, TAU);
  rr(ctx, x - bw / 2, y - bh, bw, bh, Math.min(26 * s, bw / 2));
  if (outline) { ctx.setLineDash([6 * s, 7 * s]); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, top + hr, hr, 0, TAU); ctx.stroke(); rr(ctx, x - bw / 2, y - bh, bw, bh, Math.min(26 * s, bw / 2)); ctx.stroke(); }
  else { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, top + hr, hr, 0, TAU); ctx.fill(); rr(ctx, x - bw / 2, y - bh, bw, bh, Math.min(26 * s, bw / 2)); ctx.fill(); }
  ctx.restore();
}

// ---------- 画布工具 ----------
export function makeCanvas(w = W, h = H) { return new Canvas(w, h); }
export function withAlpha(ctx, a, fn) { if (a <= 0.002) return; const g = ctx.globalAlpha; ctx.globalAlpha = g * clamp(a); fn(); ctx.globalAlpha = g; }
export function zoomAt(ctx, cx, cy, s, fn) { ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); fn(); ctx.restore(); }
