// 开场：一张账单 → 小概率大损失 → 人群连成网 → 片名
import { W, H, C, E, P, env, inv, clamp, lerp, rgba, glow, dot, text, rich, rr, fmtNum, TAU, rng, noise1, spring, polyline } from '../engine.mjs';
import { S, END, cue, chapters, META } from '../timeline.mjs';

const YOU = { x: 700, y: 706 };
const LINE_Y = 720;

// ---------- 账单 ----------
function bill(ctx, cx, cy, rot, sc, amount, alpha, stampP) {
  if (alpha <= 0.002) return;
  const w = 400, h = 500;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-w / 2, -h / 2);
  ctx.globalAlpha = alpha;
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24;
  // 锯齿底边的纸
  ctx.beginPath(); ctx.moveTo(0, 8); ctx.arcTo(0, 0, 8, 0, 8); ctx.lineTo(w - 8, 0); ctx.arcTo(w, 0, w, 8, 8);
  const teeth = 16; ctx.lineTo(w, h);
  for (let i = teeth; i > 0; i--) { const x = (w / teeth) * (i - 0.5); ctx.lineTo(x, h - 12); ctx.lineTo((w / teeth) * (i - 1), h); }
  ctx.closePath(); ctx.fillStyle = C.paper; ctx.fill();
  ctx.shadowColor = 'transparent';
  const ink = C.paperInk;
  text(ctx, '医疗费用清单', 36, 58, { size: 28, weight: 700, color: ink, alpha, spacing: 2 });
  ctx.fillStyle = rgba(ink, 0.25 * alpha); ctx.fillRect(36, 92, w - 72, 2);
  const items = [['住院费', 0.62], ['手术费', 0.8], ['药品费', 0.95], ['检查费', 0.45], ['护理费', 0.38]];
  items.forEach(([k, bw], i) => {
    const y = 130 + i * 46;
    text(ctx, k, 36, y, { size: 22, color: ink, alpha: alpha * 0.75 });
    ctx.fillStyle = rgba(ink, 0.12 * alpha); ctx.fillRect(130, y - 1, 120, 2);
    ctx.fillStyle = rgba(ink, 0.3 * alpha); rr(ctx, w - 36 - 90 * bw, y - 8, 90 * bw, 14, 4); ctx.fill();
  });
  ctx.strokeStyle = rgba(ink, 0.35 * alpha); ctx.setLineDash([6, 6]); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(36, 372); ctx.lineTo(w - 36, 372); ctx.stroke(); ctx.setLineDash([]);
  text(ctx, '合计', 36, 420, { size: 24, weight: 500, color: ink, alpha: alpha * 0.8 });
  text(ctx, '¥ ' + fmtNum(amount), w - 34, 418, { size: 50, family: 'Serif', weight: 700, color: '#C23B32', alpha, align: 'right' });
  // 待支付 印章
  if (stampP > 0) {
    const q = E.outBack(clamp(stampP), 2.2), s = lerp(1.8, 1, q);
    ctx.save(); ctx.translate(w - 120, 250); ctx.rotate(-0.22); ctx.scale(s, s);
    ctx.globalAlpha = alpha * clamp(stampP * 3) * 0.9;
    ctx.strokeStyle = '#D0443A'; ctx.lineWidth = 5; rr(ctx, -92, -40, 184, 80, 12); ctx.stroke();
    ctx.lineWidth = 2; rr(ctx, -84, -32, 168, 64, 8); ctx.stroke();
    text(ctx, '待支付', 0, 2, { size: 40, weight: 700, color: '#D0443A', align: 'center', alpha: alpha * clamp(stampP * 3) * 0.9, spacing: 8 });
    ctx.restore();
  }
  ctx.restore();
}

// ---------- 人群 ----------
const CROWD = (() => {
  const r = rng(11), pts = [];
  const cols = 18, rows = 9, x0 = 150, x1 = 1770, y0 = 170, y1 = 880;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = x0 + ((i + 0.5) / cols) * (x1 - x0) + (r() - 0.5) * 70, y = y0 + ((j + 0.5) / rows) * (y1 - y0) + (r() - 0.5) * 55;
    if (Math.hypot(x - YOU.x, y - YOU.y) < 60) continue;
    pts.push({ x, y, ph: r() * 10, s: 0.8 + r() * 0.5 });
  }
  pts.push({ x: YOU.x, y: YOU.y, ph: 0, s: 1.25, you: true });
  pts.forEach((p) => (p.d = Math.hypot(p.x - YOU.x, p.y - YOU.y)));
  return pts;
})();
const HIT = CROWD.reduce((b, p) => (Math.hypot(p.x - 1290, p.y - 470) < Math.hypot(b.x - 1290, b.y - 470) ? p : b));
// 最近邻连线
const EDGES = (() => {
  const set = new Map();
  CROWD.forEach((p, i) => {
    const nb = CROWD.map((q, j) => [j, Math.hypot(p.x - q.x, p.y - q.y)]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 3);
    nb.forEach(([j, d]) => { if (d < 190) { const k = i < j ? `${i}-${j}` : `${j}-${i}`; if (!set.has(k)) set.set(k, [Math.min(i, j), Math.max(i, j), d]); } });
  });
  return [...set.values()].map(([i, j]) => ({ a: CROWD[i], b: CROWD[j], d: (CROWD[i].d + CROWD[j].d) / 2 }));
})();

function shake(t, t0, amp = 10) {
  const k = t - t0; if (k < 0 || k > 0.6) return [0, 0];
  const a = amp * Math.exp(-k * 9);
  return [Math.sin(k * 90) * a, Math.cos(k * 71) * a * 0.7];
}

export default [
  {
    from: 0, to: S('o3') + 1.4,
    draw(ctx, t) {
      const tIn = cue('o1', '一张') - 0.2, tDrop = cue('o1', '突然'), tImp = cue('o1', '落到', 0, 0.6);
      const tNum = cue('o1', '三十万'), tStamp = cue('o2', '拿得');
      const out = E.inOutCubic(inv(S('o3') - 0.2, S('o3') + 1.0, t));
      const [sx, sy] = shake(t, tImp, 12);
      ctx.translate(sx, sy);
      // 缓慢推近
      const z = 1 + 0.05 * E.inOutSine(inv(tImp, S('o3'), t));
      ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
      // 生命线
      const lp = E.inOutCubic(inv(0.4, 2.4, t));
      const la = 0.5 * (1 - out);
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, rgba(C.ink, 0)); grad.addColorStop(0.3, rgba(C.ink, la)); grad.addColorStop(0.7, rgba(C.ink, la)); grad.addColorStop(1, rgba(C.ink, 0));
      ctx.fillStyle = grad; ctx.fillRect(YOU.x - 1400 * lp, LINE_Y, 2800 * lp, 1.5);
      // 冲击：地面波纹 + 尘
      const ik = t - tImp;
      if (ik > 0 && ik < 1.6) {
        for (let k = 0; k < 2; k++) {
          const q = inv(0, 1.1 + k * 0.4, ik), rx = 60 + q * (500 + k * 200);
          ctx.globalAlpha = (1 - q) * 0.5 * (1 - out); ctx.strokeStyle = C.ink2; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(1080, LINE_Y, rx, rx * 0.08, 0, 0, TAU); ctx.stroke();
        }
        const r = rng(3);
        for (let i = 0; i < 40; i++) {
          const dir = r() < 0.5 ? -1 : 1, v = 150 + r() * 420, x = 1080 + dir * (140 + r() * 60) + dir * v * ik, y = LINE_Y - (r() * 130) * Math.sin(Math.min(Math.PI, ik * 4)) ;
          ctx.globalAlpha = Math.max(0, 1 - ik / 1.2) * 0.5 * (1 - out); ctx.fillStyle = C.ink2;
          ctx.beginPath(); ctx.arc(x, y, 1.5 + r() * 2, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // 你：光点（被震到时轻微下沉）
      const jolt = ik > 0 ? Math.sin(Math.min(1, ik * 3) * Math.PI) * 8 * Math.exp(-ik * 3) : 0;
      const ya = E.outCubic(inv(0.2, 1.4, t));
      const br = 1 + 0.08 * Math.sin(t * 2.2);
      dot(ctx, YOU.x, YOU.y + jolt, 10 * br, C.gold2, ya * (1 - out * 0), 4, 0.6);
      text(ctx, '你', YOU.x, YOU.y + 46, { size: 26, align: 'center', color: C.ink2, alpha: ya * 0.85 * (1 - out) * (1 - inv(tImp - 0.3, tImp, t) * 0.4) });
      // 账单：悬停下降 → 砸落 → 印章
      if (t > tIn - 0.1) {
        const hover = E.outCubic(inv(tIn, tDrop, t));
        const yHover = lerp(-360, 250, hover) + Math.sin(t * 2.3) * 6;
        const drop = inv(tDrop, tImp, t);
        const yLand = LINE_Y - 250;
        let cy = drop <= 0 ? yHover : lerp(yHover, yLand, E.inCubic(drop));
        let rot = lerp(-0.2, -0.12, hover) + Math.sin(t * 1.7) * 0.02;
        if (t >= tImp) { const k = t - tImp; cy = yLand; rot = lerp(-0.12, -0.05, E.outBack(clamp(k * 3), 2)); }
        const sq = t >= tImp ? 1 + 0.03 * Math.exp(-(t - tImp) * 10) * Math.sin((t - tImp) * 40) : 1;
        const amount = 300000 * E.outExpo(inv(tNum, tNum + 1.0, t));
        const flyOut = E.inCubic(inv(S('o3') - 0.2, S('o3') + 0.7, t));
        if (t >= tImp - 0.05) glow(ctx, 1080, LINE_Y, 520, C.coral, 0.22 * Math.exp(-Math.max(0, t - tImp) * 1.2) + 0.08);
        bill(ctx, 1080, cy - flyOut * 900, rot - flyOut * 0.3, sq, amount, 1 - flyOut, inv(tStamp, tStamp + 0.28, t));
      }
    },
  },
  {
    // 人群、击中、积蓄被掏空、小概率/大损失、连成网、片名
    from: S('o3') - 0.4, to: chapters.ch1.cardStart + 0.6,
    draw(ctx, t) {
      const t0 = S('o3');
      const tHit = cue('o3', '一旦落下', 0, 0.3), tDrain = cue('o3', '掏空');
      const tSmall = cue('o4', '小概率'), tBig = cue('o4', '大损失'), tIdea = cue('o4', '人类');
      const tName = cue('o5', '保险');
      const tEnd = chapters.ch1.cardStart - 0.05;
      const fadeAll = 1 - E.inOutCubic(inv(tEnd - 1.2, tEnd, t));
      const netP = E.inOutSine(inv(tIdea - 0.2, tName + 0.6, t));
      const words = env(t, tSmall - 0.2, tIdea + 0.9, 0.3, 0.9);
      const dim = 1 - 0.65 * words;
      const titleA = env(t, tName, tEnd, 1.2, 1.0);
      // 连线网
      if (netP > 0) {
        for (const e of EDGES) {
          const q = E.outCubic(inv(e.d / 1500, e.d / 1500 + 0.35, netP));
          if (q <= 0) continue;
          const mx = lerp(e.a.x, e.b.x, q), my = lerp(e.a.y, e.b.y, q);
          ctx.globalAlpha = 0.22 * fadeAll * (1 - titleA * 0.7); ctx.strokeStyle = C.gold2; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(mx, my); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      // 人群
      for (const p of CROWD) {
        const a = p.you ? 1 : E.outCubic(inv(t0 + p.d / 1400, t0 + p.d / 1400 + 0.6, t));
        if (a <= 0) continue;
        const tw = 0.75 + 0.25 * Math.sin(t * 1.3 + p.ph);
        let col = C.ink, halo = 3;
        if (p === HIT && t > tHit) col = C.coral;
        if (p.you) col = C.gold2;
        const pulse = p === HIT && t > tHit ? Math.exp(-(t - tHit) * 3) : 0;
        const al = a * tw * fadeAll * (p === HIT ? 1 : dim) * (1 - titleA * 0.7);
        const big = p === HIT ? 1 + 0.9 * E.outBack(inv(tHit, tHit + 0.4, t)) : 1;
        if (p === HIT && t > tHit) { ctx.globalAlpha = al * 0.6; ctx.strokeStyle = C.coral; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, 20 + 3 * Math.sin(t * 3), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
        dot(ctx, p.x, p.y, 5.2 * p.s * big * (1 + pulse * 0.8), col, al, halo + pulse * 4, 0.5 + pulse);
      }
      // 击中光束
      const hk = t - tHit;
      if (hk > -0.35 && hk < 1.2) {
        const q = E.inCubic(inv(-0.35, 0, hk)), fade = 1 - inv(0.1, 1.2, hk);
        const y1 = lerp(-50, HIT.y, q);
        const g = ctx.createLinearGradient(0, -50, 0, HIT.y);
        g.addColorStop(0, rgba(C.coral, 0)); g.addColorStop(1, rgba(C.coral, 0.9 * fade));
        ctx.fillStyle = g; ctx.fillRect(HIT.x - 1.5, -50, 3, y1 + 50);
        if (hk > 0) {
          glow(ctx, HIT.x, HIT.y, 260 * (0.6 + hk), C.coral, 0.7 * fade);
          ctx.globalAlpha = fade * 0.8; ctx.strokeStyle = C.coral; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(HIT.x, HIT.y, 20 + hk * 180, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
        }
      }
      // 积蓄：6 块金砖，掏空时自上而下化为粒子落下
      const sA = env(t, tHit + 0.3, tSmall + 0.3, 0.5, 0.6) * fadeAll;
      if (sA > 0) {
        const bx = HIT.x + 60, by = HIT.y + 200;
        for (let i = 0; i < 6; i++) {
          const appear = E.outBack(inv(tHit + 0.35 + i * 0.09, tHit + 0.75 + i * 0.09, t));
          const di = 5 - i, dk = inv(tDrain + di * 0.18, tDrain + di * 0.18 + 0.55, t);
          const y = by - i * 38;
          if (dk < 1) {
            ctx.globalAlpha = sA * (1 - dk) * clamp(appear * 2); ctx.fillStyle = C.gold;
            rr(ctx, bx, y - 30 + (1 - appear) * 20, 150 * (1 - dk * 0.3), 32, 6); ctx.fill();
            ctx.fillStyle = rgba('#FFFFFF', 0.25); ctx.fillRect(bx + 8, y - 27, 150 * (1 - dk * 0.3) - 16, 3);
          }
          if (dk > 0 && dk <= 1) {
            const r = rng(40 + i);
            for (let k = 0; k < 18; k++) {
              const px = bx + r() * 150, py = y - 10 + (dk * dk) * (120 + r() * 220);
              ctx.globalAlpha = sA * (1 - dk) * 0.9; ctx.fillStyle = C.gold2;
              ctx.fillRect(px, py, 3, 3);
            }
          }
        }
        ctx.globalAlpha = 1;
        text(ctx, '积蓄', bx + 75, by + 34, { size: 24, align: 'center', color: C.gold2, alpha: sA * 0.9 });
      }
      // 小概率 · 大损失
      if (words > 0) {
        const sp = E.outCubic(inv(tSmall, tSmall + 0.5, t)), bp = inv(tBig - 0.05, tBig + 0.5, t);
        text(ctx, '小概率', 700, 470, { size: 46, family: 'Serif', weight: 400, color: C.ink2, align: 'center', alpha: words * sp, p: sp, spacing: 6 });
        const s = lerp(1.35, 1, E.outCubic(bp));
        ctx.save(); ctx.translate(1180, 480); ctx.scale(s, s);
        text(ctx, '大损失', 0, 0, { size: 170, family: 'Serif', weight: 900, color: C.coral, align: 'center', alpha: words * clamp(bp * 2), spacing: 8, glowHex: C.coral, glowA: 0.4 });
        ctx.restore();
        ctx.globalAlpha = words * sp * 0.5; ctx.fillStyle = C.ink2; ctx.beginPath(); ctx.arc(868, 472, 4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      }
      // 片名
      if (titleA > 0) {
        { const g = ctx.createRadialGradient(W / 2, 520, 0, W / 2, 520, 720); g.addColorStop(0, `rgba(5,8,16,${0.75 * titleA})`); g.addColorStop(1, 'rgba(5,8,16,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
        glow(ctx, W / 2, 470, 700, C.gold, 0.14 * titleA);
        const tp = inv(tName, tName + 1.4, t);
        text(ctx, META.title, W / 2, 452, { size: 104, family: 'Serif', weight: 700, align: 'center', alpha: titleA, p: tp, spacing: 10, spread: 0.55, glowHex: C.gold, glowA: 0.25 });
        const lw = 300 * E.inOutCubic(inv(tName + 0.6, tName + 1.6, t));
        ctx.globalAlpha = titleA * 0.85; ctx.fillStyle = C.gold2; ctx.fillRect(W / 2 - lw / 2, 548, lw, 1.5); ctx.globalAlpha = 1;
        text(ctx, META.subtitle, W / 2, 606, { size: 34, weight: 300, align: 'center', alpha: titleA * 0.9, p: inv(tName + 0.9, tName + 2.0, t), spacing: 14, color: C.ink2 });
      }
    },
  },
];
