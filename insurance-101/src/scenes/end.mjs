// 尾声：一千个人连成一张网，接住坠落的人 → 片尾答案
import { W, H, C, E, P, env, inv, clamp, lerp, rgba, glow, dot, text, TAU, rng, spring } from '../engine.mjs';
import { S, END, cue, chapters, TOTAL, META } from '../timeline.mjs';

const CX = 960, CY = 480;
const DOTS = (() => {
  const r = rng(77), ga = Math.PI * (3 - Math.sqrt(5)), pts = [];
  for (let i = 0; i < 1000; i++) {
    const rad = Math.sqrt((i + 0.5) / 1000), th = i * ga;
    const x = CX + Math.cos(th) * rad * 900 + (r() - 0.5) * 22, y = CY + Math.sin(th) * rad * 470 + (r() - 0.5) * 18;
    pts.push({ x, y, ph: r() * 10, d: Math.hypot((x - CX) / 900, (y - CY) / 470) });
  }
  return pts;
})();
const FALL = DOTS.reduce((b, p) => (Math.hypot(p.x - CX, p.y - (CY - 10)) < Math.hypot(b.x - CX, b.y - (CY - 10)) ? p : b));
const EDGES = (() => {
  const out = [], seen = new Set();
  DOTS.forEach((p, i) => {
    const nb = [];
    DOTS.forEach((q, j) => { if (i !== j) { const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2; if (d < 70 * 70) nb.push([j, d]); } });
    nb.sort((a, b) => a[1] - b[1]).slice(0, 3).forEach(([j]) => { const k = i < j ? `${i}-${j}` : `${j}-${i}`; if (!seen.has(k)) { seen.add(k); out.push([p, DOTS[j]]); } });
  });
  return out;
})();
const FALL_NB = EDGES.filter(([a, b]) => a === FALL || b === FALL).map(([a, b]) => (a === FALL ? b : a));

export default [
  {
    from: S('f1') - 0.8, to: TOTAL,
    draw(ctx, t) {
      const tIn = S('f1') - 0.1, tKnown = cue('f2', '素不相识'), tPact = cue('f2', '彼此约好'), tFall = cue('f2', '难处'), tPull = cue('f2', '拉他一把');
      const tAns = END('f4') + 0.4;
      const endDim = 1 - 0.72 * E.inOutCubic(inv(S('f4') - 0.2, S('f4') + 1.2, t));
      const zoom = lerp(1.06, 0.92, E.inOutSine(inv(tIn, tAns + 4, t)));
      ctx.save(); ctx.translate(CX, CY); ctx.scale(zoom, zoom); ctx.translate(-CX, -CY);
      // 坠落与拉回
      const fall = E.inCubic(inv(tFall - 0.1, tFall + 0.55, t));
      const pull = spring(Math.max(0, t - tPull - 0.1), 6, 0.45);
      const fy = FALL.y + 170 * fall * (1 - clamp(pull));
      const pos = (p) => (p === FALL ? [p.x, fy] : [p.x + Math.sin(t * 0.5 + p.ph) * 2, p.y + Math.cos(t * 0.4 + p.ph) * 2]);
      // 网
      const net = E.inOutSine(inv(tPact - 0.2, tPact + 2.2, t));
      const focus = env(t, tFall - 0.3, tPull + 1.6, 0.4, 0.8);
      if (net > 0) {
        ctx.lineWidth = 1; ctx.strokeStyle = C.gold2;
        const glowK = E.inOutSine(inv(S('f3'), S('f3') + 3, t));
        for (const [a, b] of EDGES) {
          const q = inv(((a.d + b.d) / 2) * 0.85, ((a.d + b.d) / 2) * 0.85 + 0.2, net);
          if (q <= 0) continue;
          const [ax, ay] = pos(a), [bx, by] = pos(b);
          const hot = a === FALL || b === FALL;
          ctx.globalAlpha = (hot ? 0.9 : (0.16 + 0.1 * glowK) * (1 - 0.35 * focus)) * endDim; ctx.lineWidth = hot ? 2.2 : 1;
          ctx.strokeStyle = hot && t > tFall ? (t > tPull + 0.3 ? C.teal2 : C.coral2) : C.gold2;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(lerp(ax, bx, q), lerp(ay, by, q)); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      // 拉一把：邻居把光传过去
      if (t > tPull - 0.1 && t < tPull + 1.6) {
        FALL_NB.forEach((nb, k) => {
          const q = inv(tPull - 0.1 + k * 0.05, tPull + 0.6 + k * 0.05, t); if (q <= 0 || q >= 1) return;
          const [fx0, fy0] = pos(FALL);
          const x = lerp(nb.x, fx0, E.inOutQuad(q)), y = lerp(nb.y, fy0, E.inOutQuad(q));
          glow(ctx, x, y, 30, C.teal, 0.9 * endDim); ctx.fillStyle = C.teal2; ctx.fillRect(x - 2, y - 2, 4, 4);
        });
      }
      // 人
      for (const p of DOTS) {
        const a0 = E.outCubic(inv(tIn + p.d * 1.2, tIn + p.d * 1.2 + 0.7, t));
        if (a0 <= 0) continue;
        const tw = 0.55 + 0.35 * Math.sin(t * (1 + (p.ph % 1)) + p.ph) * P(t, tKnown - 0.3, 1);
        const [x, y] = pos(p);
        if (p === FALL && t > tFall - 0.1) {
          const saved = t > tPull + 0.3;
          glow(ctx, x, y, 120, saved ? C.teal : C.coral, 0.5 * a0 * endDim);
          dot(ctx, x, y, 9, saved ? C.teal2 : C.coral, a0 * endDim, 5, 0.9);
          continue;
        }
        ctx.globalAlpha = a0 * tw * endDim * (1 - 0.35 * focus); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (t > tPull + 0.3) glow(ctx, FALL.x, fy, 160, C.teal, 0.5 * Math.exp(-(t - tPull - 0.3) * 0.8) * endDim);
      ctx.restore();
      // 片尾
      const ea = E.outCubic(inv(S('f4') + 0.2, S('f4') + 1.2, t));
      if (ea > 0) {
        const g = ctx.createRadialGradient(W / 2, 470, 0, W / 2, 470, 760); g.addColorStop(0, `rgba(5,8,16,${0.7 * ea})`); g.addColorStop(1, 'rgba(5,8,16,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        text(ctx, `${META.title}？`, W / 2, 380, { size: 38, weight: 300, align: 'center', color: C.ink2, alpha: ea, spacing: 10, p: inv(S('f4') + 0.2, S('f4') + 1.4, t) });
        const aq = inv(tAns, tAns + 1.6, t);
        text(ctx, '最坏的那一天，家还在。', W / 2, 500, { size: 100, family: 'Serif', weight: 700, align: 'center', color: C.gold2, alpha: ea, p: aq, spacing: 10, spread: 0.5, glowHex: C.gold, glowA: 0.35 });
        const lw = 280 * E.inOutCubic(inv(tAns + 1.2, tAns + 2.2, t));
        ctx.globalAlpha = ea * 0.7; ctx.fillStyle = C.gold2; ctx.fillRect(W / 2 - lw / 2, 598, lw, 1.5); ctx.globalAlpha = 1;
        const dq = P(t, tAns + 2.2, 1.0);
        text(ctx, '本片为保险知识科普，不构成任何产品推荐或投资建议。', W / 2, 880, { size: 24, align: 'center', color: C.mute, alpha: dq });
        text(ctx, '文中金额与比例为示意或常见经验，具体以保险合同条款为准。', W / 2, 920, { size: 24, align: 'center', color: C.mute, alpha: dq });
      }
    },
  },
];
