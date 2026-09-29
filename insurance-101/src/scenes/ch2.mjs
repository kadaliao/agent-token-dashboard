// 第二章：没出事，就亏了吗（白交了？→ 灭火器 → 财富曲线 → 返还型拆解 → 分开想）
import { Path2D } from 'skia-canvas';
import { W, H, C, E, P, env, inv, clamp, lerp, rgba, glow, dot, text, chip, rr, TAU, rng, polyline, arrow, strokeDraw, person, check } from '../engine.mjs';
import { S, END, cue, chapters } from '../timeline.mjs';
import { icon } from './common.mjs';

// 灭火器与房子（线稿）
const EXT = new Path2D('M -70 -60 Q -70 -112 0 -116 Q 70 -112 70 -60 L 70 190 Q 70 212 48 212 L -48 212 Q -70 212 -70 190 Z M -22 -116 L -22 -140 L 22 -140 L 22 -116 M -44 -140 L 44 -140 L 44 -168 L -44 -168 Z M -30 -168 L -78 -206 M 12 -168 L 86 -192 M 44 -156 C 112 -150 124 -80 118 0 C 112 80 112 120 108 158 M 94 158 L 122 158 L 126 204 L 90 204 Z M -70 22 L 70 22 M -70 112 L 70 112');
const EXT_BODY = new Path2D('M -70 -60 Q -70 -112 0 -116 Q 70 -112 70 -60 L 70 190 Q 70 212 48 212 L -48 212 Q -70 212 -70 190 Z');
const HOUSE = new Path2D('M -170 -20 L 0 -170 L 170 -20 M -130 -55 L -130 160 L 130 160 L 130 -55 M -40 160 L -40 60 L 40 60 L 40 160 M 55 0 L 105 0 L 105 45 L 55 45 Z M 80 0 L 80 45 M 55 22 L 105 22');

// 财富曲线（0..1 的时间 → 财富）
const EV = 0.46;
const nx = (x, s) => { const r = Math.sin(x * 43.1 + s) * 0.012 + Math.sin(x * 17.3 + s * 2) * 0.01; return r; };
const wealthNo = (x, crash = 1) => {
  const up = 0.08 + x * 0.95 + nx(x, 1);
  if (x < EV) return up;
  const k = x - EV;
  const hit = crash * (0.62 * Math.min(1, k / 0.012));
  const rec = crash * Math.min(0.62, k * 0.55);
  return up - hit + rec * 0.35 + (1 - crash) * 0;
};
const wealthYes = (x, crash = 1) => {
  const up = 0.08 + x * 0.82 + nx(x, 3);
  if (x < EV) return up;
  const k = x - EV;
  return up - crash * 0.05 * Math.min(1, k / 0.012) * Math.exp(-k * 6);
};

export default [
  // 镜头 A：几年都没用上 → 白交了？
  {
    from: S('b1') - 0.5, to: S('b2') + 1.2,
    draw(ctx, t) {
      const a = env(t, S('b1') - 0.4, S('b2') + 1.0, 0.6, 0.8);
      const shift = E.inOutCubic(inv(S('b2') - 0.2, S('b2') + 0.9, t));
      ctx.translate(-shift * 300, 0);
      const px = 560, py = 760;
      person(ctx, px, py, 1.3, { color: C.ink, alpha: a * P(t, S('b1') - 0.3, 0.6), glowHex: C.gold, glowA: 0.25 });
      // 时间轴
      const x0 = 720, x1 = 1520, y = 760;
      const ap = P(t, S('b1'), 0.9, E.inOutCubic);
      ctx.globalAlpha = a * 0.5; ctx.fillStyle = C.ink2; ctx.fillRect(x0, y, (x1 - x0) * ap, 1.5); ctx.globalAlpha = 1;
      const tY0 = cue('b1', '几年'), tY1 = cue('b1', '犯嘀咕');
      for (let i = 0; i < 5; i++) {
        const x = x0 + 80 + i * 170, tc = lerp(tY0 - 0.3, tY1 - 0.3, i / 4);
        text(ctx, `第 ${i + 1} 年`, x, y + 38, { size: 24, align: 'center', color: C.mute, alpha: a * ap });
        // 金币从人飞向这一年
        const q = inv(tc, tc + 0.6, t);
        if (q > 0) {
          const e = E.inOutCubic(q), cx = lerp(px + 30, x, e), cy = lerp(py - 150, y - 44, e) - Math.sin(e * Math.PI) * 120;
          glow(ctx, cx, cy, 40, C.gold, a * 0.5);
          ctx.globalAlpha = a; ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(cx, cy, 24, 0, TAU); ctx.fill();
          ctx.strokeStyle = C.gold2; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 17, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
          text(ctx, '保费', cx, cy + 1, { size: 15, weight: 700, align: 'center', color: C.paperInk, alpha: a * clamp(e * 3) });
        }
      }
      // 问号泡泡
      const qa = P(t, tY1 - 0.1, 0.6, E.outBack);
      if (qa > 0) {
        const bx = px + 110, by = py - 290;
        ctx.globalAlpha = a * clamp(qa) * 0.9; ctx.fillStyle = 'rgba(244,239,230,0.07)'; ctx.strokeStyle = rgba(C.ink, 0.35); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(bx, by, 150 * qa, 70 * qa, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(px + 40, py - 205, 9 * qa, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(px + 20, py - 182, 5 * qa, 0, TAU); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
        text(ctx, '白交了？', bx, by + 2, { size: 40, family: 'Serif', weight: 700, align: 'center', color: C.ink, alpha: a * clamp(qa), p: inv(cue('b1', '白交') - 0.2, cue('b1', '白交') + 0.5, t) });
      }
    },
  },
  // 镜头 B：房子没着火 / 灭火器
  {
    from: S('b2') - 0.4, to: S('b3') + 0.8,
    draw(ctx, t) {
      const a = env(t, S('b2') - 0.2, S('b3') + 0.6, 0.6, 0.7);
      const th = cue('b2', '家里'), te = cue('b2', '灭火器');
      const hp = E.inOutSine(inv(th - 0.3, th + 1.2, t));
      ctx.save(); ctx.translate(800, 560);
      glow(ctx, 0, 0, 380, C.gold, 0.12 * a * hp);
      strokeDraw(ctx, HOUSE, 1600, hp, { color: C.gold2, width: 3, alpha: a });
      ctx.restore();
      text(ctx, '没着火', 800, 780, { size: 30, align: 'center', color: C.ink2, alpha: a * P(t, th + 0.6, 0.6) });
      const ep = E.inOutSine(inv(te - 0.2, te + 1.3, t));
      ctx.save(); ctx.translate(1200, 540); ctx.scale(0.95, 0.95);
      const fillA = P(t, te + 0.9, 0.8);
      if (fillA > 0) { ctx.globalAlpha = a * fillA * 0.35; ctx.fillStyle = C.coral; ctx.fill(EXT_BODY); ctx.globalAlpha = 1; }
      strokeDraw(ctx, EXT, 2600, ep, { color: C.coral2, width: 3, alpha: a });
      ctx.restore();
      text(ctx, '灭火器', 1200, 790, { size: 30, align: 'center', color: C.ink2, alpha: a * P(t, te + 0.8, 0.6) });
      const kp = P(t, cue('b2', '买亏'), 0.6);
      text(ctx, '买亏了？', 1200, 300, { size: 40, family: 'Serif', weight: 700, align: 'center', color: C.ink, alpha: a * kp * 0.9 });
    },
  },
  // 镜头 C：财富曲线（出事 vs 没出事）
  {
    from: S('b3') - 0.4, to: S('b5') + 0.6,
    draw(ctx, t) {
      const a = env(t, S('b3') - 0.3, S('b5') + 0.4, 0.6, 0.7);
      const x0 = 330, x1 = 1480, y0 = 230, y1 = 800;
      const X = (u) => x0 + u * (x1 - x0), Y = (v) => y1 - v * (y1 - y0) * 0.85;
      const tEv = cue('b3', '最坏的事'), tEnd = END('b3') + 0.3;
      const prog = t < tEv ? lerp(0, EV, E.inOutSine(inv(S('b3') + 0.2, tEv, t))) : lerp(EV, 1, E.outCubic(inv(tEv, tEnd, t)));
      const calm = E.inOutCubic(inv(S('b4') - 0.1, S('b4') + 1.4, t)); // 没用上：撤回事故
      const crash = 1 - calm;
      const ax = P(t, S('b3') - 0.2, 0.8, E.inOutCubic);
      ctx.globalAlpha = a * 0.55; ctx.fillStyle = C.ink2;
      ctx.fillRect(x0, y1, (x1 - x0) * ax, 1.5); ctx.fillRect(x0, y1 - (y1 - y0) * ax, 1.5, (y1 - y0) * ax); ctx.globalAlpha = 1;
      text(ctx, '家庭财富', x0 - 20, y0 - 40, { size: 26, color: C.ink2, alpha: a * ax });
      text(ctx, '时间', x1, y1 + 36, { size: 24, color: C.mute, align: 'right', alpha: a * ax });
      const ptsNo = [], ptsYes = [];
      for (let k = 0; k <= 300; k++) { const u = (k / 300) * prog; ptsNo.push([X(u), Y(wealthNo(u, crash))]); ptsYes.push([X(u), Y(wealthYes(u, crash))]); }
      // 保险守住的部分
      const tGap = cue('b3', '不会被'), ga = P(t, tGap - 0.2, 0.8) * crash;
      if (prog > EV && ga > 0) {
        ctx.save(); ctx.globalAlpha = a * ga * 0.2; ctx.fillStyle = C.teal; ctx.beginPath();
        const ks = ptsNo.map((p, k) => k).filter((k) => (k / 300) * prog >= EV);
        ks.forEach((k, i) => (i ? ctx.lineTo(...ptsYes[k]) : ctx.moveTo(...ptsYes[k])));
        [...ks].reverse().forEach((k) => ctx.lineTo(...ptsNo[k]));
        ctx.closePath(); ctx.fill(); ctx.restore();
        text(ctx, '保险守住的', X(0.74), Y(0.5), { size: 28, color: C.teal2, align: 'center', alpha: a * ga });
      }
      polyline(ctx, ptsNo, 1, { color: C.coral, width: 3.5, alpha: a });
      polyline(ctx, ptsYes, 1, { color: C.teal, width: 3.5, alpha: a });
      const eNo = ptsNo[ptsNo.length - 1], eYes = ptsYes[ptsYes.length - 1];
      dot(ctx, eNo[0], eNo[1], 6, C.coral, a, 4, 0.6); dot(ctx, eYes[0], eYes[1], 6, C.teal, a, 4, 0.6);
      if (prog > 0.9) {
        const la = a * inv(0.9, 1, prog);
        text(ctx, '没有保险', eNo[0] + 22, eNo[1], { size: 28, color: C.coral2, alpha: la });
        text(ctx, '有保险', eYes[0] + 22, eYes[1], { size: 28, color: C.teal2, alpha: la });
      }
      // 事故标记
      const ea = env(t, tEv - 0.2, S('b4') + 0.8, 0.2, 0.7);
      if (ea > 0) {
        const ex = X(EV);
        ctx.save(); ctx.globalAlpha = a * ea * 0.6; ctx.strokeStyle = C.coral; ctx.setLineDash([6, 8]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ex, y0 + 10); ctx.lineTo(ex, y1); ctx.stroke(); ctx.restore();
        icon(ctx, 'bolt', ex, y0 - 10, 70, { color: C.coral, alpha: a * ea, p: P(t, tEv - 0.1, 0.4), width: 3 });
        text(ctx, '大病 / 意外', ex + 42, y0 - 10, { size: 26, color: C.coral2, alpha: a * ea * P(t, tEv, 0.5) });
        glow(ctx, ex, Y(wealthNo(EV + 0.01, crash)), 200, C.coral, a * ea * 0.4 * Math.exp(-Math.max(0, t - tEv) * 1.5));
      }
      // 没出事：两线只差一点保费
      if (calm > 0.3) {
        const k = a * inv(0.3, 1, calm);
        const u = 0.93, yA = Y(wealthNo(u, 0)), yB = Y(wealthYes(u, 0));
        polyline(ctx, [[X(u) - 20, yA], [X(u) - 34, yA], [X(u) - 34, yB], [X(u) - 20, yB]], inv(0.3, 1, calm), { color: C.ink2, width: 2, alpha: k });
        text(ctx, '没出事：只差一点保费', X(u) - 30, yA - 48, { size: 26, align: 'right', color: C.ink, alpha: k });
        check(ctx, X(0.06), Y(0.95), 64, E.outCubic(inv(S('b4') + 0.6, S('b4') + 1.3, t)), { color: C.teal, alpha: a, width: 6 });
        text(ctx, '平安，就是最好的结果', X(0.06) + 56, Y(0.95), { size: 32, family: 'Serif', weight: 600, color: C.teal2, alpha: a * P(t, S('b4') + 0.9, 0.7) });
      }
    },
  },
  // 镜头 D：返还型 vs 消费型 → 分开想
  {
    from: S('b5') - 0.4, to: chapters.ch3.cardStart + 0.6,
    draw(ctx, t) {
      const a = env(t, S('b5') - 0.3, chapters.ch3.cardStart - 0.05, 0.6, 0.9);
      const tRet = cue('b5', '返还型'), tBack = cue('b5', '保费退给你');
      const tCmp = cue('b6', '同样的保障'), tMore = cue('b6', '贵上'), tSave = cue('b6', '多交的'), tLong = cue('b6', '期限很长'), tLow = cue('b6', '收益不高');
      const tSplit = S('b7') - 0.1;
      const split = E.inOutCubic(inv(tSplit, tSplit + 1.4, t));
      const cmp = E.inOutCubic(inv(tCmp - 0.3, tCmp + 0.9, t));
      const n = 15, bw = 26, gap = 12, gw = n * (bw + gap) - gap, yb = 760;
      const hP = 50, hS = 150; // 保障部分 / 储蓄部分 高度
      const groups = [
        { name: '返还型', x: lerp(W / 2 - gw / 2, 1090, cmp), a: 1, save: true, t0: tRet - 0.3 },
        { name: '消费型', x: 830 - gw, a: cmp, save: false, t0: tCmp - 0.3 },
      ];
      const barsA = 1 - split;
      for (const g of groups) {
        if (g.a <= 0) continue;
        const ga = a * g.a * barsA;
        text(ctx, g.name, g.x + gw / 2, 330, { size: 44, family: 'Serif', weight: 700, align: 'center', color: g.save ? C.ink : C.ink, alpha: ga });
        ctx.globalAlpha = ga * 0.5; ctx.fillStyle = C.ink2; ctx.fillRect(g.x - 10, yb, gw + 20, 1.5); ctx.globalAlpha = 1;
        text(ctx, '每年保费', g.x - 16, yb + 36, { size: 22, color: C.mute, alpha: ga });
        const blue = g.save ? E.inOutCubic(inv(tSave, tSave + 0.8, t)) : 0;
        for (let i = 0; i < n; i++) {
          const q = E.outCubic(inv(g.t0 + i * 0.04, g.t0 + i * 0.04 + 0.5, t));
          const x = g.x + i * (bw + gap);
          const h1 = hP * q, h2 = g.save ? hS * q : 0;
          ctx.globalAlpha = ga; ctx.fillStyle = C.gold; rr(ctx, x, yb - h1, bw, h1, 4); ctx.fill();
          if (h2 > 0) { ctx.fillStyle = blue > 0 ? mixHex(C.gold, C.blue, blue) : C.gold; rr(ctx, x, yb - h1 - h2 - 3, bw, h2, 4); ctx.fill(); }
          ctx.globalAlpha = 1;
        }
        if (g.save) {
          // 到期返还
          const bp = E.inOutCubic(inv(tBack - 0.3, tBack + 0.9, t)) * (1 - cmp * 0.0);
          const endX = g.x + gw + 70;
          if (bp > 0) {
            const retA = ga * env(t, tBack - 0.3, tCmp + 0.3, 0.3, 0.5);
            arrow(ctx, endX, yb - 180, endX, yb - 180 + 0.01, 0, {});
            ctx.save(); ctx.globalAlpha = retA; ctx.strokeStyle = C.gold2; ctx.lineWidth = 3; ctx.setLineDash([2, 10]); ctx.lineCap = 'round';
            ctx.beginPath(); ctx.arc(g.x + gw / 2, yb - 200, gw / 2 + 50, Math.PI * 1.02, Math.PI * (1.02 + 0.96 * bp)); ctx.stroke(); ctx.restore();
            text(ctx, '到期退还保费', g.x + gw / 2, yb - 200 - gw / 2 - 90, { size: 30, align: 'center', color: C.gold2, alpha: retA * bp });
          }
          // 贵上一大截：括号
          const mp = E.outCubic(inv(tMore - 0.2, tMore + 0.6, t));
          if (mp > 0) {
            const bx = g.x + gw + 28;
            polyline(ctx, [[bx - 10, yb - hP - hS - 3], [bx, yb - hP - hS - 3], [bx, yb - hP], [bx - 10, yb - hP]], mp, { color: C.coral2, width: 2.5, alpha: ga });
            text(ctx, '贵出的这一截', bx + 18, yb - hP - hS / 2, { size: 28, color: C.coral2, alpha: ga * mp });
          }
          const sp = P(t, tSave + 0.3, 0.6);
          text(ctx, '储蓄', g.x - 22, yb - hP - hS / 2 - 3, { size: 28, weight: 500, align: 'right', color: C.blue2, alpha: ga * sp });
          text(ctx, '保障', g.x - 22, yb - hP / 2, { size: 28, weight: 500, align: 'right', color: C.gold2, alpha: ga * sp });
          const lp = P(t, tLong - 0.1, 0.6), lw = P(t, tLow - 0.1, 0.6);
          chip(ctx, '期限很长', g.x + gw / 2 - 110, 420, { size: 26, color: C.blue2, stroke: rgba(C.blue, 0.5), alpha: ga * lp, p: lp });
          chip(ctx, '收益不高', g.x + gw / 2 + 110, 420, { size: 26, color: C.blue2, stroke: rgba(C.blue, 0.5), alpha: ga * lw, p: lw });
        } else {
          text(ctx, '保障', g.x + gw / 2, yb - hP - 30, { size: 26, weight: 500, align: 'center', color: C.gold2, alpha: ga * P(t, tCmp + 0.4, 0.6) });
        }
      }
      // 分开想：两只盒子
      if (split > 0) {
        const bxL = 560, bxR = 1360, by = 540, bwid = 420, bh = 300;
        const dp = E.inOutCubic(inv(tSplit + 0.5, tSplit + 1.6, t));
        ctx.save(); ctx.globalAlpha = a * dp * 0.6; ctx.strokeStyle = C.ink2; ctx.setLineDash([4, 10]); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(W / 2, by - 200 * dp); ctx.lineTo(W / 2, by + 200 * dp); ctx.stroke(); ctx.restore();
        [[bxL, '保障', 'shield', C.gold, cue('b7', '保障归保障')], [bxR, '理财', 'chart', C.blue, cue('b7', '理财归理财')]].forEach(([x, name, ic, col, tc], i) => {
          const q = E.outBack(inv(tc - 0.3, tc + 0.5, t), 1.2);
          if (q <= 0) return;
          const from = [1090 + gw / 2, 600], k = E.inOutCubic(inv(tSplit, tc + 0.3, t));
          const cx = lerp(from[0], x, k), cy = lerp(from[1], by, k);
          ctx.save(); ctx.globalAlpha = a * clamp(q); ctx.translate(cx, cy); ctx.scale(lerp(0.6, 1, clamp(q)), lerp(0.6, 1, clamp(q)));
          ctx.fillStyle = rgba(col, 0.1); ctx.strokeStyle = rgba(col, 0.7); ctx.lineWidth = 2;
          rr(ctx, -bwid / 2, -bh / 2, bwid, bh, 24); ctx.fill(); ctx.stroke(); ctx.restore();
          icon(ctx, ic, cx, cy - 40, 90, { color: i ? C.blue2 : C.gold2, alpha: a * clamp(q), p: inv(tc, tc + 0.8, t), width: 4 });
          text(ctx, name, cx, cy + 70, { size: 48, family: 'Serif', weight: 700, align: 'center', color: i ? C.blue2 : C.gold2, alpha: a * clamp(q) });
        });
      }
    },
  },
];

function mixHex(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], t))).join(',')})`;
}
