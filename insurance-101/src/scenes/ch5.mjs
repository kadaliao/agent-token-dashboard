// 第五章：从哪里开始（顺序 / 预算 / 看清条款）
import { W, H, C, E, P, env, inv, clamp, lerp, rgba, glow, text, chip, rr, TAU, polyline } from '../engine.mjs';
import { S, END, cue, chapters } from '../timeline.mjs';
import { icon } from './common.mjs';

function nav(ctx, t, a) {
  const items = [['1', '顺序', S('e2')], ['2', '预算', S('e3')], ['3', '看清条款', S('e4')]];
  const appear = P(t, cue('e1', '三件事') - 0.1, 0.6);
  items.forEach(([n, s, t0], i) => {
    const x = 700 + i * 260, q = inv(cue('e1', '三件事') - 0.1 + i * 0.12, cue('e1', '三件事') + 0.4 + i * 0.12, t);
    const cur = env(t, t0 - 0.2, (items[i + 1]?.[2] ?? 999) - 0.2, 0.4, 0.4);
    const al = a * clamp(q * 2) * lerp(0.45, 1, cur);
    ctx.globalAlpha = al; ctx.strokeStyle = cur > 0.5 ? C.gold2 : C.ink2; ctx.lineWidth = 1.5; ctx.fillStyle = rgba(C.gold, 0.15 * cur);
    ctx.beginPath(); ctx.arc(x - 56, 160, 20, 0, TAU); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
    text(ctx, n, x - 56, 161, { size: 22, family: 'Serif', weight: 700, align: 'center', color: cur > 0.5 ? C.gold2 : C.ink2, alpha: al });
    text(ctx, s, x - 26, 160, { size: 30, weight: cur > 0.5 ? 700 : 400, color: cur > 0.5 ? C.ink : C.ink2, alpha: al });
  });
  // 首句：三件事预告（大号）
  const big = env(t, S('e1') - 0.1, S('e2') + 0.3, 0.5, 0.6);
  if (big > 0) text(ctx, '记住三件事', W / 2, 520, { size: 92, family: 'Serif', weight: 700, align: 'center', alpha: a * big, p: inv(S('e1'), cue('e1', '三件事') + 0.6, t), spacing: 12, glowHex: C.gold, glowA: 0.25 });
}

function order(ctx, t, a) {
  const layers = [
    { name: '医保 · 打底', w: 1000, y: 800, col: C.blue, col2: C.blue2, tc: cue('e2', '医保打底') },
    { name: '医疗险 + 意外险', w: 800, y: 672, col: C.teal, col2: C.teal2, tc: cue('e2', '先配医疗险') },
    { name: '重疾险 + 定期寿险', w: 600, y: 544, col: C.gold, col2: C.gold2, tc: cue('e2', '配重疾险') },
  ];
  layers.forEach((l, i) => {
    const q = E.outBack(inv(l.tc - 0.25, l.tc + 0.45, t), 1.1);
    if (q <= 0) return;
    const y = l.y - (1 - clamp(q)) * 120, h = 104;
    ctx.globalAlpha = a * clamp(q * 1.5); ctx.fillStyle = rgba(l.col, 0.2); ctx.strokeStyle = rgba(l.col, 0.8); ctx.lineWidth = 2;
    rr(ctx, W / 2 - l.w / 2, y - h / 2, l.w, h, 18); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
    text(ctx, l.name, W / 2, y, { size: 40, family: 'Serif', weight: 700, align: 'center', color: l.col2, alpha: a * clamp(q * 1.5) });
    text(ctx, `${i + 1}`, W / 2 - l.w / 2 - 50, y, { size: 40, family: 'Serif', weight: 700, align: 'center', color: l.col2, alpha: a * clamp(q * 1.5) * 0.8 });
  });
  const nq = P(t, cue('e2', '根据收入') - 0.1, 0.6);
  text(ctx, '← 根据收入和家庭责任来定', W / 2 + 330, 544, { size: 28, color: C.gold2, alpha: a * nq });
  const cq = P(t, cue('e2', '先配医疗险') + 0.8, 0.6);
  text(ctx, '← 便宜，先配', W / 2 + 430, 672, { size: 28, color: C.teal2, alpha: a * cq });
}

function budget(ctx, t, a) {
  const x0 = 360, bw = 1200, y = 560, h = 96;
  const q = E.inOutCubic(inv(S('e3') - 0.2, S('e3') + 0.9, t));
  text(ctx, '家庭年收入', x0, y - 90, { size: 30, color: C.ink2, alpha: a * q });
  ctx.globalAlpha = a * q; ctx.fillStyle = rgba(C.ink, 0.06); ctx.strokeStyle = rgba(C.ink, 0.35); ctx.lineWidth = 1.5;
  rr(ctx, x0, y - h / 2, bw * q, h, 14); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
  for (let k = 1; k < 10; k++) { ctx.globalAlpha = a * q * 0.18; ctx.fillStyle = C.ink; ctx.fillRect(x0 + (bw * k) / 10, y - h / 2 + 10, 1, h - 20); } ctx.globalAlpha = 1;
  const t5 = cue('e3', '百分之五'), t10 = cue('e3', '到十');
  const w5 = bw * 0.05 * E.outCubic(inv(t5 - 0.3, t5 + 0.5, t)), w10 = bw * 0.1 * E.outCubic(inv(t10 - 0.2, t10 + 0.6, t));
  if (w10 > 0) {
    const g = ctx.createLinearGradient(x0, 0, x0 + bw * 0.1, 0); g.addColorStop(0, rgba(C.gold, 0.9)); g.addColorStop(0.5, rgba(C.gold, 0.9)); g.addColorStop(1, rgba(C.gold, 0.25));
    ctx.globalAlpha = a; ctx.fillStyle = g; rr(ctx, x0, y - h / 2, w10, h, 14); ctx.fill(); ctx.globalAlpha = 1;
  }
  if (w5 > 0) { glow(ctx, x0 + w5 / 2, y, 140, C.gold, a * 0.4); ctx.globalAlpha = a; ctx.fillStyle = C.gold; rr(ctx, x0, y - h / 2, w5, h, 14); ctx.fill(); ctx.globalAlpha = 1; }
  const lq = P(t, t10 + 0.3, 0.6);
  polyline(ctx, [[x0, y + h / 2 + 18], [x0, y + h / 2 + 30], [x0 + bw * 0.1, y + h / 2 + 30], [x0 + bw * 0.1, y + h / 2 + 18]], lq, { color: C.gold2, width: 2.5, alpha: a });
  polyline(ctx, [[x0 + bw * 0.05, y + h / 2 + 30], [x0 + bw * 0.05, y + h / 2 + 100], [x0 + bw * 0.05 + 60, y + h / 2 + 100]], lq, { color: C.gold2, width: 1.5, alpha: a * 0.8 });
  text(ctx, '保障型保费 ≈ 5%~10%', x0 + bw * 0.05 + 80, y + h / 2 + 100, { size: 44, family: 'Serif', weight: 700, color: C.gold2, alpha: a * lq });
  chip(ctx, '常见经验，按家庭情况调整', x0 + bw, y - 90, { size: 26, color: C.ink2, alpha: a * P(t, cue('e3', '常见的经验') - 0.1, 0.6), align: 'right' });
}

function terms(ctx, t, a) {
  const cards = [
    { title: '保什么', sub: '保险责任', ic: 'check', col: C.teal, col2: C.teal2, tc: cue('e4', '保什么') },
    { title: '不保什么', sub: '责任免除', ic: 'cross', col: C.coral, col2: C.coral2, tc: cue('e4', '不保什么') },
    { title: '怎样才能赔', sub: '健康告知 · 等待期 · 免赔额', ic: 'doc', col: C.gold, col2: C.gold2, tc: cue('e4', '怎样才能赔') },
  ];
  const lift = E.inOutCubic(inv(cue('e4', '看不懂') - 0.2, cue('e4', '看不懂') + 0.7, t));
  cards.forEach((c, i) => {
    const q = E.outCubic(inv(c.tc - 0.2, c.tc + 0.5, t));
    if (q <= 0) return;
    const x = 520 + i * 440, y = lerp(520, 440, lift) + (1 - q) * 40, cw = 380, ch = lerp(320, 270, lift);
    ctx.globalAlpha = a * q; ctx.fillStyle = rgba(c.col, 0.07); ctx.strokeStyle = rgba(c.col, 0.55); ctx.lineWidth = 2;
    rr(ctx, x - cw / 2, y - ch / 2, cw, ch, 24); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
    icon(ctx, c.ic, x, y - ch / 2 + 70, 64, { color: c.col2, alpha: a * q, p: inv(c.tc, c.tc + 0.6, t), width: 5 });
    text(ctx, c.title, x, y + 20, { size: 50, family: 'Serif', weight: 700, align: 'center', alpha: a * q });
    text(ctx, c.sub, x, y + 88, { size: 24, align: 'center', color: c.col2, alpha: a * q });
  });
  // 先问清楚，再签字
  const aq = P(t, cue('e4', '先问清楚') - 0.1, 0.6);
  if (aq > 0) {
    chip(ctx, '看不懂？先问清楚', 700, 790, { size: 30, color: C.ink, alpha: a * aq, p: aq, dot: C.gold });
    const sq = inv(cue('e4', '再签字') - 0.1, END('e4') + 0.9, t);
    ctx.globalAlpha = a * aq * 0.6; ctx.fillStyle = C.ink2; ctx.fillRect(1000, 820, 520, 1.5); ctx.globalAlpha = 1;
    text(ctx, '签字', 1000, 790, { size: 24, color: C.mute, alpha: a * aq });
    if (sq > 0) {
      const pts = []; for (let k = 0; k <= 120; k++) { const u = k / 120; pts.push([1090 + u * 360, 800 - Math.sin(u * 22) * 18 * (1 - u * 0.5) - Math.sin(u * 7) * 10 + u * 8]); }
      const end = polyline(ctx, pts, E.inOutSine(sq), { color: C.gold2, width: 3.5, alpha: a });
      if (end && sq < 1) icon(ctx, 'pen', end[0] + 18, end[1] - 18, 50, { color: C.ink, alpha: a, width: 3 });
    }
  }
}

export default [
  { from: S('e1') - 0.4, to: chapters.end.start + 0.6, draw(ctx, t) { const a = env(t, S('e1') - 0.3, chapters.end.start - 0.1, 0.6, 0.9); nav(ctx, t, a); } },
  { from: S('e2') - 0.4, to: S('e3') + 0.6, draw(ctx, t) { order(ctx, t, env(t, S('e2') - 0.3, S('e3') + 0.4, 0.6, 0.6)); } },
  { from: S('e3') - 0.4, to: S('e4') + 0.6, draw(ctx, t) { budget(ctx, t, env(t, S('e3') - 0.3, S('e4') + 0.4, 0.6, 0.6)); } },
  { from: S('e4') - 0.4, to: chapters.end.start + 0.6, draw(ctx, t) { terms(ctx, t, env(t, S('e4') - 0.3, chapters.end.start - 0.1, 0.6, 0.9)); } },
];
