// 全局图层：背景氛围、章节卡、章节角标、字幕、后期（暗角、颗粒、黑场）
import { Canvas } from 'skia-canvas';
import { W, H, C, E, P, env, inv, clamp, lerp, rgba, mix, glow, text, noise1, rng, TAU, rr, measure } from './engine.mjs';
import { chapters, SUBS, TOTAL } from './timeline.mjs';

// ---------- 背景 ----------
// 每章的氛围色：三团光斑 [颜色, 强度]
const MOOD = {
  open: [['#3B5BDB', 0.20], ['#C2410C', 0.10], ['#1E3A8A', 0.16]],
  ch1: [['#B7791F', 0.14], ['#2B4C9B', 0.20], ['#1D6F6A', 0.10]],
  ch2: [['#6D4AC7', 0.16], ['#2B4C9B', 0.18], ['#B7791F', 0.08]],
  ch3: [['#157A70', 0.18], ['#2B4C9B', 0.18], ['#5B45B0', 0.10]],
  ch4: [['#B4382F', 0.13], ['#2B4C9B', 0.18], ['#6D4AC7', 0.10]],
  ch5: [['#B7791F', 0.15], ['#1D6F6A', 0.14], ['#2B4C9B', 0.18]],
  end: [['#1D6F6A', 0.16], ['#B7791F', 0.14], ['#2B4C9B', 0.20]],
};
const CH_IDS = Object.keys(chapters);
function moodAt(t) {
  let cur = CH_IDS[0];
  for (const id of CH_IDS) if (t >= chapters[id].start - 1.5) cur = id;
  const i = CH_IDS.indexOf(cur), prev = CH_IDS[Math.max(0, i - 1)];
  const k = E.inOutSine(inv(chapters[cur].start - 1.5, chapters[cur].start + 1.5, t));
  return MOOD[cur].map((m, j) => [mix(MOOD[prev][j][0], m[0], k), lerp(MOOD[prev][j][1], m[1], k)]);
}
const base = new Canvas(W, H);
{
  const g = base.getContext('2d');
  const lg = g.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, '#0A1122'); lg.addColorStop(0.55, '#080E1C'); lg.addColorStop(1, '#05080F');
  g.fillStyle = lg; g.fillRect(0, 0, W, H);
}
const DUST = (() => { const r = rng(7); return Array.from({ length: 110 }, () => ({ x: r() * W, y: r() * H, z: 0.3 + r() * 0.7, ph: r() * 100, sp: 4 + r() * 10 })); })();

export function background(ctx, t) {
  ctx.drawImage(base, 0, 0);
  const m = moodAt(t);
  const blobs = [[0.28, 0.32, 0.55], [0.74, 0.62, 0.62], [0.5, 1.05, 0.7]];
  blobs.forEach(([bx, by, br], i) => {
    const x = W * bx + noise1(t * 0.05, i * 3) * 160, y = H * by + noise1(t * 0.04, i * 3 + 1) * 110;
    const r = W * br * (1 + 0.08 * noise1(t * 0.07, i * 3 + 2));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(m[i][0], m[i][1])); g.addColorStop(0.5, rgba(m[i][0], m[i][1] * 0.35)); g.addColorStop(1, rgba(m[i][0], 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
  });
  // 浮尘（视差）
  for (const d of DUST) {
    const y = ((d.y - t * d.sp * d.z) % H + H) % H, x = d.x + Math.sin(t * 0.2 + d.ph) * 20 * d.z;
    const a = (0.08 + 0.18 * d.z) * (0.6 + 0.4 * Math.sin(t * 0.9 + d.ph));
    ctx.globalAlpha = a; ctx.fillStyle = '#E8E2D6';
    ctx.beginPath(); ctx.arc(x, y, 0.8 + d.z * 1.4, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------- 章节卡 ----------
export function chapterCard(ctx, t) {
  for (const id of CH_IDS) {
    const c = chapters[id]; if (!c.card) continue;
    const a = c.cardStart, b = c.cardEnd;
    if (t < a - 0.1 || t > b + 0.2) continue;
    const lt = t - a, D = b - a;
    const out = E.inOutCubic(inv(D - 0.8, D + 0.1, lt));
    const vis = Math.min(E.outCubic(inv(0.25, 1.0, lt)), 1 - out);
    if (vis <= 0) continue;
    const cy = 470 - out * 40;
    glow(ctx, W / 2, cy, 520, C.gold, 0.18 * vis);
    // 大号章节数字：描边 → 渐填
    const nP = E.outCubic(inv(0.15, 1.2, lt));
    ctx.save();
    ctx.font = `400 250px Serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const sp = lerp(60, 14, nP); ctx.letterSpacing = `${sp}px`;
    ctx.globalAlpha = vis * nP; ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(C.gold2, 0.95);
    ctx.strokeText(c.card.num, W / 2 + sp / 2, cy + (1 - nP) * 40);
    ctx.globalAlpha = vis * 0.16 * E.inOutSine(inv(0.8, 2.2, lt)); ctx.fillStyle = C.gold;
    ctx.fillText(c.card.num, W / 2 + sp / 2, cy + (1 - nP) * 40);
    ctx.restore();
    // 细线从中间展开
    const lp = E.inOutCubic(inv(0.5, 1.4, lt)), lw = 420 * lp;
    ctx.globalAlpha = vis; ctx.fillStyle = rgba(C.gold2, 0.8); ctx.fillRect(W / 2 - lw / 2, cy + 150, lw, 1.5); ctx.globalAlpha = 1;
    text(ctx, c.card.title, W / 2, cy + 225, { size: 70, family: 'Serif', weight: 600, align: 'center', p: inv(0.8, 1.9, lt), alpha: vis, spacing: 6, spread: 0.5 });
  }
}

// ---------- 章节角标（章节正文期间左上角常驻） ----------
export function kicker(ctx, t) {
  for (const id of CH_IDS) {
    const c = chapters[id]; if (!c.card) continue;
    const a = env(t, c.cardEnd + 0.2, chapters[id].end - 0.2, 0.8, 0.6);
    if (a <= 0) continue;
    text(ctx, c.card.num, 86, 78, { size: 26, family: 'Serif', weight: 600, color: C.gold, alpha: a, spacing: 2 });
    ctx.globalAlpha = a * 0.5; ctx.fillStyle = C.ink2; ctx.fillRect(128, 78, 26, 1.2); ctx.globalAlpha = 1;
    text(ctx, c.card.title, 168, 78, { size: 24, weight: 400, color: C.ink2, alpha: a * 0.85, spacing: 2 });
  }
}

// ---------- 字幕 ----------
export function subtitles(ctx, t) {
  let band = 0;
  for (const s of SUBS) band = Math.max(band, env(t, s.start - 0.1, s.end + 0.35, 0.3, 0.45));
  if (band > 0) {
    const g = ctx.createLinearGradient(0, H - 230, 0, H);
    g.addColorStop(0, 'rgba(4,6,12,0)'); g.addColorStop(0.55, `rgba(4,6,12,${0.42 * band})`); g.addColorStop(1, `rgba(4,6,12,${0.62 * band})`);
    ctx.fillStyle = g; ctx.fillRect(0, H - 230, W, 230);
  }
  for (const s of SUBS) {
    if (t < s.start - 0.02 || t > s.end) continue;
    const a = Math.min(E.outCubic(inv(s.start, s.start + 0.12, t)), 1 - E.inCubic(inv(s.end - 0.12, s.end, t)));
    if (a <= 0) continue;
    const dy = (1 - E.outCubic(inv(s.start, s.start + 0.22, t))) * 8;
    text(ctx, s.text, W / 2, H - 92 + dy, { size: 42, weight: 500, align: 'center', alpha: a, spacing: 1.5, shadow: 10, color: '#F7F3EC' });
  }
}

// ---------- 后期 ----------
const vignette = new Canvas(W, H);
{
  const g = vignette.getContext('2d');
  const rg = g.createRadialGradient(W / 2, H * 0.46, H * 0.35, W / 2, H * 0.5, H * 1.05);
  rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(0.7, 'rgba(0,0,0,0.28)'); rg.addColorStop(1, 'rgba(0,0,0,0.62)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
}
const GRAIN = Array.from({ length: 6 }, (_, k) => {
  const cv = new Canvas(W, H), g = cv.getContext('2d');
  const img = g.createImageData(W, H), d = img.data, r = rng(100 + k);
  for (let i = 0; i < d.length; i += 4) { const v = (r() * 255) | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  g.putImageData(img, 0, 0); return cv;
});
export function post(ctx, t) {
  ctx.drawImage(vignette, 0, 0);
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.07;
  ctx.drawImage(GRAIN[Math.floor(t * 30) % GRAIN.length], 0, 0); ctx.restore();
  const fade = Math.max(1 - inv(0, 1.4, t), inv(TOTAL - 1.8, TOTAL - 0.1, t));
  if (fade > 0) { ctx.fillStyle = `rgba(0,0,0,${E.inOutSine(fade)})`; ctx.fillRect(0, 0, W, H); }
}
