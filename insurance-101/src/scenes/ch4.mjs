// 第四章：四个常见误区（误区引语 → 划掉上移成页眉 → 正解画面）
import { W, H, C, E, P, env, inv, clamp, lerp, rgba, glow, dot, text, chip, rr, TAU, rng, polyline, arrow, person, check, cross } from '../engine.mjs';
import { S, END, cue, chapters } from '../timeline.mjs';
import { icon } from './common.mjs';

/** 误区卡：念完划掉，下一句开始时缩成页眉 */
function myth(ctx, t, a, label, quote, m, next) {
  const intro = P(t, S(m) - 0.2, 0.5);
  const up = E.inOutCubic(inv(S(next) - 0.1, S(next) + 0.8, t));
  const strike = E.inOutCubic(inv(END(m) - 0.1, END(m) + 0.4, t));
  const y = lerp(470, 150, up), size = lerp(66, 34, up);
  chip(ctx, label, W / 2, lerp(340, 92, up), { size: lerp(30, 22, up), color: C.coral2, stroke: rgba(C.coral, 0.6), bg: rgba(C.coral, 0.12), alpha: a * intro * (1 - up * 0.3), p: intro, weight: 700 });
  const q = `“${quote}”`;
  const tw = text(ctx, q, W / 2, y, { size, family: 'Serif', weight: 700, align: 'center', alpha: a * (1 - up * 0.45), p: inv(S(m) + 0.1, END(m) - 0.2, t), spacing: lerp(4, 2, up), color: C.ink });
  if (strike > 0) {
    const x0 = W / 2 - tw / 2 - 10;
    polyline(ctx, [[x0, y + 2], [x0 + (tw + 20) * strike, y - 2]], 1, { color: C.coral, width: lerp(6, 3, up), alpha: a });
  }
}

// ---------- 1：先保大人 ----------
function adultsFirst(ctx, t, a) {
  const tA = cue('d2', '先保大人'), tTop = cue('d2', '收入最高'), tKid = cue('d2', '孩子最大的保障');
  const y = 800, ax = [800, 1120], kx = 960;
  const fam = P(t, S('d1') + 0.4, 0.8);
  const famA = a * fam * lerp(0.35, 1, P(t, S('d2') - 0.2, 0.6));
  // 误区状态：只有孩子有保护
  const kidOnly = env(t, S('d1') + 0.8, tA + 0.3, 0.6, 0.6);
  if (kidOnly > 0) {
    ctx.save(); ctx.globalAlpha = a * kidOnly * 0.9; ctx.strokeStyle = C.teal2; ctx.lineWidth = 3; ctx.fillStyle = rgba(C.teal, 0.12);
    ctx.beginPath(); ctx.arc(kx, y - 70, 90, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  // 正解：大人各自有护盾
  ax.forEach((x, i) => {
    const q = E.outBack(inv(tA + i * 0.15, tA + 0.6 + i * 0.15, t));
    person(ctx, x, y, 1.45, { color: C.ink, alpha: famA, glowHex: i === 0 && t > tTop ? C.gold : null, glowA: 0.5 * P(t, tTop, 0.6) });
    if (q > 0) {
      ctx.save(); ctx.globalAlpha = a * clamp(q); ctx.strokeStyle = C.teal; ctx.lineWidth = 3; ctx.shadowColor = rgba(C.teal, 0.8); ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(x, y - 110, 125 * clamp(q), 0, TAU); ctx.stroke(); ctx.restore();
    }
  });
  person(ctx, kx, y + 6, 0.8, { color: C.gold2, alpha: famA });
  const tq = P(t, tTop - 0.1, 0.6) * (1 - P(t, tKid - 0.3, 0.5));
  chip(ctx, '收入最高 · 最先保', ax[0], y - 300, { size: 28, color: C.gold2, stroke: rgba(C.gold, 0.6), bg: rgba(C.gold, 0.1), alpha: a * tq, p: tq, weight: 700 });
  // 父母撑起的伞
  const kq = E.inOutCubic(inv(tKid - 0.2, tKid + 1.0, t));
  if (kq > 0) {
    ctx.save(); ctx.globalAlpha = a * kq; ctx.strokeStyle = C.teal2; ctx.lineWidth = 4; ctx.fillStyle = rgba(C.teal, 0.08);
    ctx.shadowColor = rgba(C.teal, 0.7); ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(kx, y - 30, 330, Math.PI + (1 - kq) * 1.4, TAU - (1 - kq) * 1.4); ctx.stroke(); ctx.restore();
    chip(ctx, '父母不倒下，就是孩子最大的保障', kx, 300, { size: 30, color: C.teal2, stroke: rgba(C.teal, 0.5), bg: rgba(C.teal, 0.1), alpha: a * kq, p: kq });
  }
}

// ---------- 2：医保报不了的部分 ----------
function notEnough(ctx, t, a) {
  const tIn = S('d4') - 0.2, tNo = cue('d4', '报不了'), tBig = cue('d4', '远超');
  const q = E.inOutCubic(inv(tIn, tIn + 0.9, t)), g = E.inOutCubic(inv(tBig - 0.2, tBig + 1.4, t));
  const blueW = 560, redW = lerp(260, 820, g), total = blueW + redW;
  const x0 = W / 2 - total / 2, y = 520, h = 120;
  ctx.save(); ctx.globalAlpha = a * q;
  ctx.fillStyle = C.blue; rr(ctx, x0, y, blueW * q, h, 14); ctx.fill();
  const rq = P(t, tNo - 0.2, 0.6);
  ctx.fillStyle = rgba(C.coral, 0.85); rr(ctx, x0 + blueW + 6, y, (redW - 6) * rq, h, 14); ctx.fill();
  ctx.restore();
  text(ctx, '医保报销', x0 + blueW / 2, y + h / 2, { size: 34, weight: 700, align: 'center', color: '#fff', alpha: a * q });
  text(ctx, '医保报不了的', x0 + blueW + 6 + (redW - 6) / 2, y + h / 2, { size: 34, weight: 700, align: 'center', color: '#fff', alpha: a * rq });
  if (g > 0) {
    arrow(ctx, x0 + blueW + 30, y + h + 50, x0 + total - 10, y + h + 50, g, { color: C.coral2, width: 3, alpha: a });
    text(ctx, '可能远超你的预期', x0 + total, y + h + 100, { size: 32, align: 'right', color: C.coral2, alpha: a * g, weight: 500 });
  }
  text(ctx, '一场大病的花费', x0, y - 50, { size: 28, color: C.ink2, alpha: a * q });
}

// ---------- 3：如实告知 + 等待期 ----------
function disclose(ctx, t, a) {
  const tBad = cue('d6', '没有如实告知'), tAsk = S('d7'), tTrue = cue('d7', '如实回答'), tWait = cue('d7', '等待期'), tRange = cue('d7', '三十天'), tNo = cue('d7', '因病出险');
  const shrink = E.inOutCubic(inv(cue('d7', '另外') - 0.2, cue('d7', '另外') + 0.8, t));
  const fq = P(t, S('d6') - 0.1, 0.7);
  const fx = 620, fy = lerp(520, 400, shrink), sc = lerp(1, 0.7, shrink);
  ctx.save(); ctx.translate(fx, fy); ctx.scale(sc, sc);
  ctx.globalAlpha = a * fq; ctx.fillStyle = C.paper; ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
  rr(ctx, -210, -250, 420, 500, 16); ctx.fill(); ctx.shadowColor = 'transparent'; ctx.globalAlpha = 1;
  text(ctx, '健康告知', -170, -190, { size: 40, family: 'Serif', weight: 700, color: C.paperInk, alpha: a * fq });
  const qs = ['近两年是否住院？', '是否患有下列疾病？', '近期检查是否异常？', '是否正在服药？'];
  qs.forEach((s, i) => {
    const yy = -100 + i * 88;
    text(ctx, s, -170, yy, { size: 26, color: C.paperInk, alpha: a * fq * 0.85 });
    ctx.globalAlpha = a * fq; ctx.strokeStyle = rgba(C.paperInk, 0.5); ctx.lineWidth = 2; rr(ctx, 130, yy - 18, 36, 36, 6); ctx.stroke(); ctx.globalAlpha = 1;
    // 第 2 题没如实填（闪红）→ 如实回答后变青色对勾
    const truth = inv(tTrue - 0.3 + i * 0.15, tTrue + 0.2 + i * 0.15, t);
    if (i === 1) {
      const bad = env(t, tBad - 0.1, tTrue, 0.2, 0.3);
      if (bad > 0) { glow(ctx, 148, yy, 70, C.coral, a * bad * 0.8); ctx.globalAlpha = a * bad; ctx.strokeStyle = C.coral; ctx.lineWidth = 3; rr(ctx, 130, yy - 18, 36, 36, 6); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    check(ctx, 148, yy, 30, truth, { color: '#138A7C', alpha: a, width: 4.5 });
  });
  // 如实告知 印章
  const st = inv(tTrue + 0.5, tTrue + 0.8, t);
  if (st > 0) {
    ctx.save(); ctx.translate(40, 200); ctx.rotate(-0.15); const s2 = lerp(1.6, 1, E.outBack(clamp(st), 2)); ctx.scale(s2, s2);
    ctx.globalAlpha = a * clamp(st * 3) * 0.9; ctx.strokeStyle = '#138A7C'; ctx.lineWidth = 4; rr(ctx, -110, -32, 220, 64, 10); ctx.stroke();
    text(ctx, '如实告知', 0, 1, { size: 34, weight: 700, align: 'center', color: '#138A7C', alpha: a * clamp(st * 3) * 0.9, spacing: 6 }); ctx.restore();
  }
  ctx.restore();
  // 裂痕 → 理赔
  const nx = 1360, ny = fy;
  const crack = E.inOutCubic(inv(tBad, tBad + 0.9, t)), heal = E.inOutCubic(inv(tTrue + 0.2, tTrue + 1.2, t));
  const nodeA = a * P(t, S('d6') + 0.2, 0.6);
  const pts = [[fx + 210 * sc + 10, fy], [980, fy - 30], [1040, fy + 26], [1110, fy - 20], [1180, fy + 18], [1250, fy - 10], [nx - 70, fy]];
  const straight = pts.map(([x, y], i) => [x, lerp(y, fy, heal)]);
  polyline(ctx, straight, heal > 0 ? 1 : crack, { color: heal > 0.5 ? C.teal : C.coral, width: 3, alpha: nodeA });
  ctx.globalAlpha = nodeA; ctx.fillStyle = rgba(heal > 0.5 ? C.teal : C.coral, 0.12); ctx.strokeStyle = heal > 0.5 ? C.teal : C.coral; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(nx, ny, 64, 0, TAU); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
  text(ctx, '理赔', nx, ny - 100, { size: 30, align: 'center', color: C.ink2, alpha: nodeA });
  text(ctx, '投保', fx, fy - 280 * sc, { size: 30, align: 'center', color: C.ink2, alpha: nodeA });
  if (heal < 0.5) cross(ctx, nx, ny, 50, P(t, tBad + 0.6, 0.5), { color: C.coral, alpha: nodeA, width: 6 });
  else check(ctx, nx, ny, 64, inv(0.5, 1, heal), { color: C.teal, alpha: nodeA, width: 6 });
  text(ctx, '纠纷在投保时就埋下了', (fx + nx) / 2 + 70, fy + 90, { size: 28, align: 'center', color: C.coral2, alpha: a * env(t, tBad + 0.4, tTrue + 0.2, 0.5, 0.4) });
  // 等待期时间轴
  const wq = E.inOutCubic(inv(tWait - 0.3, tWait + 0.8, t));
  if (wq > 0) {
    const x0 = 360, x1 = 1560, y = 810, wx = 360 + 380;
    ctx.globalAlpha = a * wq * 0.6; ctx.fillStyle = C.ink2; ctx.fillRect(x0, y, (x1 - x0) * wq, 2); ctx.globalAlpha = 1;
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y - 34, (wx - x0) * wq, 68); ctx.clip();
    ctx.globalAlpha = a; ctx.fillStyle = rgba(C.gold, 0.16); ctx.fillRect(x0, y - 34, wx - x0, 68);
    ctx.strokeStyle = rgba(C.gold, 0.5); ctx.lineWidth = 4; for (let k = x0 - 80; k < wx; k += 20) { ctx.beginPath(); ctx.moveTo(k, y + 34); ctx.lineTo(k + 68, y - 34); ctx.stroke(); }
    ctx.restore();
    const gq = P(t, tRange + 0.6, 0.6);
    ctx.globalAlpha = a * gq; ctx.fillStyle = rgba(C.teal, 0.35); rr(ctx, wx + 4, y - 20, (x1 - wx - 4) * gq, 40, 10); ctx.fill(); ctx.globalAlpha = 1;
    text(ctx, '正常保障', wx + (x1 - wx) / 2, y, { size: 28, weight: 700, align: 'center', color: C.teal2, alpha: a * gq });
    text(ctx, '投保日', x0, y + 58, { size: 24, color: C.mute, alpha: a * wq });
    text(ctx, '等待期', (x0 + wx) / 2, y - 62, { size: 30, weight: 700, align: 'center', color: C.gold2, alpha: a * wq });
    text(ctx, '30~180 天', (x0 + wx) / 2, y + 58, { size: 26, align: 'center', color: C.gold2, alpha: a * P(t, tRange - 0.1, 0.5) });
    const nq = P(t, tNo - 0.2, 0.5);
    if (nq > 0) {
      const mx = x0 + 230;
      glow(ctx, mx, y, 80, C.coral, a * nq * 0.8);
      dot(ctx, mx, y, 9, C.coral, a * nq, 3, 0.6);
      chip(ctx, '期间因病出险：通常不赔', mx + 330, y - 96, { size: 26, color: C.coral2, stroke: rgba(C.coral, 0.5), bg: 'rgba(8,12,24,.8)', alpha: a * nq, p: nq });
      polyline(ctx, [[mx + 8, y - 12], [mx + 60, y - 96], [mx + 170, y - 96]], nq, { color: C.coral2, width: 1.5, alpha: a * 0.7 });
    }
  }
}

// ---------- 4：份数 vs 保额 ----------
function amountMatters(ctx, t, a) {
  const tCnt = cue('d9', '份数'), tAmt = cue('d9', '保额够不够'), tWhat = cue('d9', '保什么'), tNot = cue('d9', '不保什么'), tOne = cue('d9', '一份保额充足'), tBits = cue('d9', '零零碎碎');
  const small = [[330, 520, 0.8], [470, 430, 0.62], [560, 600, 0.7], [690, 480, 0.55], [410, 690, 0.58], [640, 700, 0.66]];
  const sp = E.outCubic(inv(S('d9') - 0.2, S('d9') + 0.8, t));
  small.forEach(([x, y, s], i) => {
    const q = E.outBack(inv(S('d9') - 0.2 + i * 0.07, S('d9') + 0.3 + i * 0.07, t));
    if (q <= 0) return;
    icon(ctx, 'shield', x, y, 110 * s * clamp(q), { color: C.ink2, alpha: a * 0.8 * (1 - 0.4 * P(t, tOne, 0.6)), width: 3 });
  });
  text(ctx, '好几份零零碎碎', 510, 830, { size: 30, align: 'center', color: C.ink2, alpha: a * P(t, tBits - 0.2, 0.6) });
  const cq = P(t, tCnt - 0.1, 0.5);
  chip(ctx, '份数多', 510, 330, { size: 28, color: C.ink2, alpha: a * cq, p: cq });
  if (cq > 0) cross(ctx, 580, 330, 26, P(t, tAmt - 0.3, 0.4), { color: C.coral, alpha: a, width: 4 });
  // 三个真正的关键
  [['保额够不够', tAmt], ['保什么', tWhat], ['不保什么', tNot]].forEach(([s, tc], i) => {
    const q = inv(tc - 0.1, tc + 0.4, t);
    chip(ctx, s, 1100 + i * 190 - (i === 0 ? 30 : 0), 300, { size: 30, color: C.teal2, stroke: rgba(C.teal, 0.6), bg: rgba(C.teal, 0.1), alpha: a * clamp(q * 2), p: q, weight: 700, dot: C.teal });
  });
  const bq = E.inOutCubic(inv(tOne - 0.2, tOne + 1.0, t));
  if (bq > 0) {
    glow(ctx, 1320, 600, 380, C.teal, a * 0.3 * bq);
    icon(ctx, 'shield', 1320, 600, 330, { color: C.teal2, alpha: a, p: bq, width: 6 });
    text(ctx, '保额充足', 1320, 610, { size: 44, family: 'Serif', weight: 700, align: 'center', color: C.teal2, alpha: a * P(t, tOne + 0.5, 0.6) });
  }
  const gq = P(t, tBits + 0.2, 0.6);
  text(ctx, '>', 930, 590, { size: 110, family: 'Serif', align: 'center', color: C.ink, alpha: a * gq * 0.8 });
}

const blk = (a0, b0) => (t) => env(t, a0, b0, 0.5, 0.6);
export default [
  { from: S('d1') - 0.4, to: S('d3'), draw(ctx, t) { const a = blk(S('d1') - 0.3, S('d3') - 0.15)(t); myth(ctx, t, a, '误区一', '先给孩子买，大人不着急', 'd1', 'd2'); adultsFirst(ctx, t, a); } },
  { from: S('d3') - 0.4, to: S('d5'), draw(ctx, t) { const a = blk(S('d3') - 0.3, S('d5') - 0.15)(t); myth(ctx, t, a, '误区二', '有医保就够了', 'd3', 'd4'); notEnough(ctx, t, a); } },
  { from: S('d5') - 0.4, to: S('d8'), draw(ctx, t) { const a = blk(S('d5') - 0.3, S('d8') - 0.15)(t); myth(ctx, t, a, '误区三', '保险都是骗人的，出了事也不赔', 'd5', 'd6'); if (t > S('d6') - 0.5) disclose(ctx, t, a); } },
  { from: S('d8') - 0.4, to: chapters.ch5.cardStart + 0.6, draw(ctx, t) { const a = env(t, S('d8') - 0.3, chapters.ch5.cardStart - 0.05, 0.5, 0.9); myth(ctx, t, a, '误区四', '买得越贵、越多，就越好', 'd8', 'd9'); if (t > S('d9') - 0.5) amountMatters(ctx, t, a); } },
];
