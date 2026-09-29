// 第三章：四类保险，各管一件事（家庭中枢图 + 账单拆解 + 收入补位 + 对比）
import { W, H, C, E, P, env, inv, clamp, lerp, rgba, glow, dot, text, chip, rr, TAU, polyline, arrow, person, check, cross } from '../engine.mjs';
import { S, END, cue, chapters } from '../timeline.mjs';
import { icon } from './common.mjs';

const HC = { x: 960, y: 500 }, RING = 190;
const RISKS = [
  { x: 520, y: 290, icon: 'plus', risk: '看病花钱', prod: '医疗险' },
  { x: 1400, y: 290, icon: 'wallet', risk: '收入中断', prod: '重疾险' },
  { x: 520, y: 720, icon: 'bolt', risk: '意外伤害', prod: '意外险' },
  { x: 1400, y: 720, icon: 'umbrella', risk: '身故风险', prod: '定期寿险' },
];
RISKS.forEach((r) => (r.ang = Math.atan2(r.y - HC.y, r.x - HC.x)));

// 各镜头时间窗
const T = () => ({
  hubIn: S('c1') - 0.3,
  d1a: S('c4') - 0.2, d1b: END('c6') + 0.45,
  d2a: cue('c7', '它不看') - 0.2, d2b: END('c8') + 0.45,
  cmp: S('c11') - 0.2, end: chapters.ch4.cardStart - 0.05,
});

function hubAlpha(t) {
  const w = T();
  return Math.max(env(t, w.hubIn, w.d1a + 0.3, 0.7, 0.6), env(t, w.d1b - 0.2, w.d2a + 0.3, 0.6, 0.6), env(t, w.d2b - 0.2, w.cmp + 0.35, 0.6, 0.6));
}
function shieldAt(k) {
  return [END('c6') + 0.35, END('c8') + 0.35, cue('c9', '意外险'), cue('c10', '定期寿险')][k];
}


const sideK = (t) => E.inOutCubic(env(t, cue('c9', '意外险') - 0.4, END('c10') + 0.7, 0.9, 0.9));
function sideCard(ctx, t, a) {
  if (a <= 0.002) return;
  const x = 80, y = 250, w = 520, h = 450;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = rgba(C.teal, 0.06); ctx.strokeStyle = rgba(C.teal, 0.4); ctx.lineWidth = 1.5;
  rr(ctx, x, y, w, h, 26); ctx.fill(); ctx.stroke(); ctx.restore();
  const aA = a * env(t, cue('c9', '意外险') - 0.4, S('c10') - 0.1, 0.6, 0.5);
  const aB = a * env(t, S('c10') - 0.2, END('c10') + 0.8, 0.6, 0.7);
  const L = (s, yy, al) => text(ctx, s, x + 44, yy, { size: 24, color: C.mute, alpha: al, spacing: 4 });
  if (aA > 0) {
    text(ctx, '意外险', x + 44, y + 72, { size: 54, family: 'Serif', weight: 700, alpha: aA });
    L('保什么', y + 160, aA);
    [['伤残', cue('c9', '伤残')], ['身故', cue('c9', '身故')], ['意外医疗', cue('c9', '医疗费用')]].forEach(([s, tc], i) => {
      const q = inv(tc - 0.1, tc + 0.4, t);
      chip(ctx, s, x + 44 + [0, 110, 220][i], y + 215, { size: 28, color: C.teal2, stroke: rgba(C.teal, 0.5), bg: rgba(C.teal, 0.1), alpha: aA * clamp(q * 2), p: q, align: 'left' });
    });
    L('多少钱', y + 300, aA);
    const tp = cue('c9', '一两百'), tb = cue('c9', '几十万');
    text(ctx, '一两百元 / 年', x + 44, y + 360, { size: 40, family: 'Serif', weight: 700, color: C.gold2, alpha: aA * P(t, tp - 0.1, 0.5) });
    text(ctx, '→ 保额几十万', x + 44, y + 424, { size: 40, family: 'Serif', weight: 700, color: C.teal2, alpha: aA * P(t, tb - 0.1, 0.5) });
  }
  if (aB > 0) {
    text(ctx, '定期寿险', x + 44, y + 72, { size: 54, family: 'Serif', weight: 700, alpha: aB });
    L('什么时候赔', y + 160, aB);
    text(ctx, '保障期内，顶梁柱不在了', x + 44, y + 212, { size: 32, weight: 500, color: C.ink, alpha: aB * P(t, cue('c10', '顶梁柱') - 0.1, 0.6) });
    L('这笔钱留给家人', y + 300, aB);
    [['还房贷', cue('c10', '还房贷')], ['养孩子', cue('c10', '养孩子')]].forEach(([s, tc], i) => {
      const q = inv(tc - 0.1, tc + 0.4, t);
      chip(ctx, s, x + 44 + i * 140, y + 360, { size: 30, color: C.teal2, stroke: rgba(C.teal, 0.5), bg: rgba(C.teal, 0.1), alpha: aB * clamp(q * 2), p: q, align: 'left' });
    });
  }
}

function hub(ctx, t, a) {
  const tFam = cue('c1', '普通人') - 0.2, tRing = cue('c1', '一个家庭');
  const tR = [cue('c2', '看病'), cue('c2', '大病'), cue('c2', '意外'), cue('c2', '顶梁柱')];
  const tBase = cue('c3', '医保');
  // 讲意外险 / 寿险时：中枢图右移，左侧留给说明卡
  const side = sideK(t);
  ctx.save(); ctx.translate(250 * side, 0);
  // 医保地基
  const bp = E.inOutCubic(inv(tBase - 0.2, tBase + 0.8, t));
  if (bp > 0) {
    const w = 460 * bp;
    ctx.globalAlpha = a; ctx.fillStyle = rgba(C.blue, 0.25); rr(ctx, HC.x - w / 2, HC.y + RING + 26, w, 44, 12); ctx.fill();
    ctx.strokeStyle = rgba(C.blue2, 0.7); ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1;
    text(ctx, '医保 · 地基', HC.x, HC.y + RING + 49, { size: 26, weight: 500, align: 'center', color: C.blue2, alpha: a * inv(0.5, 1, bp) });
    check(ctx, HC.x + 270, HC.y + RING + 48, 34, inv(cue('c3', '一定要有') - 0.1, cue('c3', '一定要有') + 0.5, t), { color: C.blue2, alpha: a, width: 4 });
  }
  // 风险与护盾
  RISKS.forEach((r, k) => {
    const ap = E.outCubic(inv(tR[k] - 0.15, tR[k] + 0.6, t));
    if (ap <= 0) return;
    const sh = E.inOutCubic(inv(shieldAt(k), shieldAt(k) + 0.9, t));
    const col = sh > 0.5 ? C.teal : C.coral, col2 = sh > 0.5 ? C.teal2 : C.coral2;
    // 从画面外飞入
    const fly = 1 - ap, ox = r.x + Math.cos(r.ang) * 500 * fly, oy = r.y + Math.sin(r.ang) * 500 * fly;
    // 连线（威胁流动 / 已防护）
    const ex = HC.x + Math.cos(r.ang) * (RING + 14), ey = HC.y + Math.sin(r.ang) * (RING + 14);
    const sx = ox - Math.cos(r.ang) * 66, sy = oy - Math.sin(r.ang) * 66;
    ctx.save(); ctx.globalAlpha = a * ap * 0.7; ctx.strokeStyle = col; ctx.lineWidth = 2;
    if (sh < 1) { ctx.setLineDash([8, 10]); ctx.lineDashOffset = -t * 40; }
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.restore();
    // 护盾弧
    if (sh > 0) {
      const span = 0.62 * sh;
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.teal; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.shadowColor = rgba(C.teal, 0.8); ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(HC.x, HC.y, RING, r.ang - span, r.ang + span); ctx.stroke(); ctx.restore();
    }
    // 风险令牌
    const pulse = sh < 0.5 ? 0.5 + 0.5 * Math.sin(t * 3 + k) : 0;
    glow(ctx, ox, oy, 150, col, a * ap * (0.35 + 0.15 * pulse));
    ctx.globalAlpha = a * ap; ctx.fillStyle = rgba(col, 0.14); ctx.strokeStyle = rgba(col, 0.85); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ox, oy, 58, 0, TAU); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
    icon(ctx, sh > 0.5 ? 'shield' : r.icon, ox, oy, 56, { color: col2, alpha: a * ap, width: 3.2 });
    const label = sh > 0.5 ? r.prod : r.risk;
    chip(ctx, label, ox, oy + (r.y > HC.y ? 96 : -96), { size: 28, color: col2, stroke: rgba(col, 0.6), bg: rgba(col, 0.1), alpha: a * ap, weight: 500 });
  });
  // 家庭圈
  const rp = E.inOutCubic(inv(tRing - 0.2, tRing + 1.0, t));
  ctx.save(); ctx.globalAlpha = a * 0.35; ctx.strokeStyle = C.ink2; ctx.lineWidth = 1.5; ctx.setLineDash([3, 7]);
  ctx.beginPath(); ctx.arc(HC.x, HC.y, RING, -Math.PI / 2, -Math.PI / 2 + TAU * rp); ctx.stroke(); ctx.restore();
  const allSh = E.outCubic(inv(shieldAt(3) + 0.8, shieldAt(3) + 1.8, t));
  if (allSh > 0) glow(ctx, HC.x, HC.y, RING * 2.2, C.teal, a * 0.25 * allSh);
  // 一家人
  const fp = P(t, tFam, 0.8);
  const gone = env(t, cue('c10', '顶梁柱'), END('c10') + 0.6, 0.6, 0.9); // 顶梁柱不在了（虚线）
  glow(ctx, HC.x, HC.y + 40, 260, C.gold, a * fp * 0.18);
  person(ctx, HC.x - 62, HC.y + 110, 1.0, { color: C.ink, alpha: a * fp * (1 - gone) });
  if (gone > 0) person(ctx, HC.x - 62, HC.y + 110, 1.0, { color: C.ink2, alpha: a * gone * 0.8, outline: true });
  person(ctx, HC.x + 62, HC.y + 110, 0.94, { color: C.ink, alpha: a * fp });
  person(ctx, HC.x, HC.y + 122, 0.6, { color: C.gold2, alpha: a * P(t, tFam + 0.2, 0.8) });
  // 寿险：留给家人一笔钱（伞）+ 用途
  const um = env(t, cue('c10', '留给家人') - 0.2, END('c10') + 0.8, 0.8, 0.9);
  if (um > 0) {
    ctx.save(); ctx.globalAlpha = a * um; ctx.strokeStyle = C.teal2; ctx.lineWidth = 3; ctx.fillStyle = rgba(C.teal, 0.12);
    const ux = HC.x + 30, uy = HC.y - 30, ur = 130 * E.outBack(clamp(um));
    ctx.beginPath(); ctx.arc(ux, uy, ur, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  ctx.restore();
  sideCard(ctx, t, a * side);
}

// ---------- 细节 1：一张大病账单 ----------
function billBar(ctx, t, a) {
  const x0 = 250, bw = 1420, y = 470, bh = 120;
  const tA = S('c4'), tQ = cue('c4', '起付线'), tR = cue('c4', '报销比例'), tF = cue('c4', '封顶线'), tO = cue('c4', '目录外');
  const tM = cue('c5', '医疗险'), tHow = cue('c5', '花多少'), tCap = cue('c5', '不会超过');
  const tD = cue('c6', '免赔额'), tPrice = cue('c6', '几百块');
  const segs = [
    { f: 0.07, name: '起付线以下' }, { f: 0.5, name: '医保范围内' }, { f: 0.13, name: '超过封顶线' }, { f: 0.3, name: '目录外' },
  ];
  let x = x0; segs.forEach((s) => { s.x = x; s.w = bw * s.f; x += s.w; });
  text(ctx, '一场大病的医疗账单（示意）', x0, 250, { size: 34, family: 'Serif', weight: 600, alpha: a * P(t, tA - 0.2, 0.6) });
  // 底：全部是自己掏的钱（珊瑚色），逐段出现
  const grow = E.inOutCubic(inv(tA - 0.1, tA + 1.0, t));
  ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); rr(ctx, x0, y, bw * grow, bh, 14); ctx.clip();
  ctx.fillStyle = rgba(C.coral, 0.8); ctx.fillRect(x0, y, bw, bh);
  // 医保报销：医保范围内的上部为蓝
  const rp = E.inOutCubic(inv(tR - 0.2, tR + 0.8, t));
  const s1 = segs[1];
  ctx.fillStyle = C.blue; ctx.fillRect(s1.x, y, s1.w, bh * 0.68 * rp);
  // 目录外斜纹
  const s3 = segs[3], op = P(t, tO - 0.1, 0.6);
  ctx.strokeStyle = rgba('#000000', 0.18 * op); ctx.lineWidth = 6;
  for (let k = -bh; k < s3.w; k += 22) { ctx.beginPath(); ctx.moveTo(s3.x + k, y + bh); ctx.lineTo(s3.x + k + bh, y); ctx.stroke(); }
  // 医疗险覆盖（青色，从左到右扫过，免赔额段不覆盖）
  const mp = E.inOutCubic(inv(tHow - 0.3, tHow + 1.6, t));
  if (mp > 0) {
    const cx0 = segs[0].x + segs[0].w, cx1 = lerp(cx0, x0 + bw, mp);
    ctx.fillStyle = rgba(C.teal, 0.92);
    ctx.fillRect(s1.x, y + bh * 0.68, Math.max(0, Math.min(cx1, s1.x + s1.w) - s1.x), bh * 0.32);
    if (cx1 > segs[2].x) ctx.fillRect(segs[2].x, y, cx1 - segs[2].x, bh);
  }
  ctx.restore();
  // 分界线与标注
  const mark = (xx, label, tc, up = true, col = C.ink) => {
    const q = P(t, tc - 0.15, 0.5);
    if (q <= 0) return;
    ctx.globalAlpha = a * q; ctx.fillStyle = col; ctx.fillRect(xx - 1.5, y - 40, 3, bh + 80); ctx.globalAlpha = 1;
    text(ctx, label, xx, up ? y - 64 : y + bh + 66, { size: 28, weight: 700, align: 'center', color: col, alpha: a * q });
  };
  mark(segs[1].x, '起付线', tQ);
  mark(segs[2].x, '封顶线', tF);
  const rpA = P(t, tR - 0.1, 0.6);
  text(ctx, `医保报销`, s1.x + s1.w / 2, y + bh * 0.34, { size: 30, weight: 700, align: 'center', color: '#fff', alpha: a * rpA });
  text(ctx, '按比例报销，剩下自付', s1.x + s1.w / 2, y - 40, { size: 24, align: 'center', color: C.blue2, alpha: a * rpA });
  text(ctx, '目录外：全自费', s3.x + s3.w / 2, y - 40, { size: 24, align: 'center', color: C.coral2, alpha: a * op });
  // 图例
  const lg = P(t, tR + 0.4, 0.6);
  [[C.blue, '医保报销'], [rgba(C.coral, 0.85), '自己掏钱'], [C.teal, '医疗险报销']].forEach(([col, s], i) => {
    const q = i === 2 ? P(t, tM, 0.6) : lg;
    const lx = x0 + i * 230, ly = y + bh + 150;
    ctx.globalAlpha = a * q; ctx.fillStyle = col; rr(ctx, lx, ly - 12, 36, 24, 6); ctx.fill(); ctx.globalAlpha = 1;
    text(ctx, s, lx + 50, ly, { size: 26, color: C.ink2, alpha: a * q });
  });
  // 医疗险
  chip(ctx, '医疗险 · 报销型', x0 + bw - 150, 250, { size: 30, color: C.teal2, stroke: rgba(C.teal, 0.6), bg: rgba(C.teal, 0.12), alpha: a * P(t, tM - 0.1, 0.5), p: inv(tM - 0.1, tM + 0.4, t), weight: 700 });
  const capA = P(t, tCap - 0.1, 0.6);
  if (capA > 0) {
    polyline(ctx, [[x0 + 60, y + bh + 30], [x0 + 60, y + bh + 44], [x0 + bw, y + bh + 44], [x0 + bw, y + bh + 30]], capA, { color: C.ink2, width: 2, alpha: a });
    text(ctx, '最多报到实际花费为止', x0 + bw, y + bh + 80, { size: 26, align: 'right', color: C.ink2, alpha: a * capA });
  }
  // 免赔额
  const dA = P(t, tD - 0.15, 0.6);
  if (dA > 0) {
    const s0 = segs[0];
    ctx.save(); ctx.globalAlpha = a * dA; ctx.strokeStyle = C.gold2; ctx.lineWidth = 3; ctx.setLineDash([6, 6]);
    rr(ctx, s0.x - 6, y - 8, s0.w + 12, bh + 16, 16); ctx.stroke(); ctx.restore();
    chip(ctx, '免赔额 ≈ 1 万元', s0.x + 60, y - 110, { size: 28, color: C.gold2, stroke: rgba(C.gold, 0.6), bg: 'rgba(8,12,24,0.8)', alpha: a * dA, p: inv(tD - 0.15, tD + 0.4, t), weight: 700 });
  }
  const pA = P(t, tPrice - 0.2, 0.6);
  chip(ctx, '年轻人：通常几百元 / 年', x0 + bw - 190, y + bh + 150, { size: 28, color: C.gold2, stroke: rgba(C.gold, 0.5), bg: rgba(C.gold, 0.08), alpha: a * pA, p: inv(tPrice - 0.2, tPrice + 0.3, t) });
}

// ---------- 细节 2：一次性一笔钱 → 补上收入 ----------
function lumpSum(ctx, t, a) {
  const tNo = cue('c7', '不看'), tCond = cue('c7', '合同约定'), tMeet = cue('c7', '达到'), tPay = cue('c7', '一次性赔');
  const tInc = S('c8'), tLost = cue('c8', '没法工作'), tFill = cue('c8', '那几年收入'), tCare = cue('c8', '康复'), tRule = cue('c8', '三到五年');
  const phase2 = E.inOutCubic(inv(tInc - 0.4, tInc + 0.8, t)); // 进入收入时间轴
  // 阶段 1：账单被划掉 + 条件 + 一笔钱落下
  const p1A = a * (1 - phase2);
  if (p1A > 0) {
    const bx = 520, by = 520;
    ctx.save(); ctx.globalAlpha = p1A * 0.55; ctx.translate(bx, by); ctx.rotate(-0.05);
    ctx.fillStyle = C.paper; rr(ctx, -120, -150, 240, 300, 10); ctx.fill(); ctx.restore();
    for (let i = 0; i < 5; i++) { ctx.globalAlpha = p1A * 0.35; ctx.fillStyle = C.paperInk; ctx.fillRect(bx - 80, by - 90 + i * 40, 160 - (i % 2) * 50, 10); } ctx.globalAlpha = 1;
    text(ctx, '花了多少', bx, by + 200, { size: 28, align: 'center', color: C.ink2, alpha: p1A });
    cross(ctx, bx, by, 220, P(t, tNo, 0.6), { color: C.coral, alpha: p1A, width: 8 });
    // 条件
    [['确诊合同约定的重病', tCond], ['达到赔付条件', tMeet]].forEach(([s, tc], i) => {
      const q = inv(tc - 0.1, tc + 0.4, t);
      chip(ctx, s, 960, 430 + i * 90, { size: 28, color: C.ink, alpha: p1A * clamp(q * 2), p: q, dot: C.gold });
    });
    arrow(ctx, 1110, 475, 1230, 475, P(t, tPay - 0.4, 0.5), { color: C.ink2, alpha: p1A * 0.7, width: 2.5 });
  }
  // 一笔钱（金块）：阶段 1 从上方砸落；阶段 2 移到时间轴上方并拆分
  const drop = inv(tPay - 0.15, tPay + 0.35, t);
  if (drop > 0) {
    const land = E.outBack(clamp(drop), 1.1);
    let bx = 1420, by = lerp(-150, 480, land), bwid = 300, bh = 180;
    bx = lerp(bx, 960, phase2); by = lerp(by, 270, phase2); bwid = lerp(bwid, 360, phase2); bh = lerp(bh, 110, phase2);
    const split = E.inOutCubic(inv(tFill - 0.2, tFill + 1.2, t));
    if (split < 1) {
      glow(ctx, bx, by, 300, C.gold, a * 0.35 * (1 - split));
      ctx.globalAlpha = a * (1 - split); ctx.fillStyle = C.gold; rr(ctx, bx - bwid / 2, by - bh / 2, bwid, bh, 16); ctx.fill();
      ctx.fillStyle = rgba('#FFFFFF', 0.3); ctx.fillRect(bx - bwid / 2 + 16, by - bh / 2 + 10, bwid - 32, 3); ctx.globalAlpha = 1;
      text(ctx, '一次性赔一笔钱', bx, by - 14 * (1 - phase2), { size: lerp(36, 32, phase2), family: 'Serif', weight: 700, align: 'center', color: C.paperInk, alpha: a * (1 - split) });
      text(ctx, '（保额）', bx, by + 36, { size: 26, align: 'center', color: C.paperInk, alpha: a * (1 - split) * (1 - phase2) });
    }
    if (t > tPay - 0.1 && t < tPay + 0.8 && phase2 < 0.1) {
      const k = t - tPay - 0.2; if (k > 0) { ctx.globalAlpha = a * Math.max(0, 1 - k * 1.6) * 0.7; ctx.strokeStyle = C.gold2; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(bx, by + bh / 2 + 6, 150 + k * 300, 16 + k * 30, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    }
  }
  // 阶段 2：收入时间轴
  if (phase2 > 0) {
    const n = 9, bw = 118, gap = 18, x0 = W / 2 - (n * (bw + gap) - gap) / 2, y = 600, h = 90;
    const lostSet = [3, 4, 5, 6];
    text(ctx, '每年的收入', x0, y - 84, { size: 26, color: C.ink2, alpha: a * phase2 });
    const tl = E.outCubic(inv(tLost - 0.1, tLost + 0.6, t));
    for (let i = 0; i < n; i++) {
      const bx = x0 + i * (bw + gap), q = E.outCubic(inv(tInc + i * 0.06, tInc + 0.5 + i * 0.06, t));
      const lost = lostSet.includes(i) ? tl : 0;
      ctx.globalAlpha = a * q * (1 - lost); ctx.fillStyle = rgba(C.gold, 0.8); rr(ctx, bx, y - h / 2, bw, h, 10); ctx.fill(); ctx.globalAlpha = 1;
      if (lost > 0) {
        ctx.save(); ctx.globalAlpha = a * lost * 0.8; ctx.strokeStyle = C.coral2; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; rr(ctx, bx, y - h / 2, bw, h, 10); ctx.stroke(); ctx.restore();
      }
      text(ctx, `第${i + 1}年`, bx + bw / 2, y + 80, { size: 22, align: 'center', color: C.mute, alpha: a * q });
    }
    // 生病标记
    const ex = x0 + 3 * (bw + gap) - gap / 2;
    ctx.globalAlpha = a * tl; ctx.fillStyle = C.coral; ctx.fillRect(ex - 1.5, y - 110, 3, 220); ctx.globalAlpha = 1;
    icon(ctx, 'bed', ex, y - 150, 60, { color: C.coral2, alpha: a * tl, width: 3 });
    text(ctx, '生病，没法工作', ex + 50, y - 150, { size: 26, color: C.coral2, alpha: a * tl });
    // 金块拆分填入
    const split = E.inOutCubic(inv(tFill - 0.2, tFill + 1.2, t));
    if (split > 0) {
      lostSet.forEach((i, j) => {
        const q = E.inOutCubic(inv(tFill - 0.2 + j * 0.12, tFill + 0.9 + j * 0.12, t));
        const tx = x0 + i * (bw + gap), sx = 960 - 180 + j * 90;
        const bx = lerp(sx, tx, q), by = lerp(270 - 55, y - h / 2, q), w = lerp(90, bw, q), hh = lerp(110, h, q);
        glow(ctx, bx + w / 2, by + hh / 2, 90, C.gold, a * 0.3 * q);
        ctx.globalAlpha = a; ctx.fillStyle = C.gold2; rr(ctx, bx, by, w, hh, 10); ctx.fill(); ctx.globalAlpha = 1;
      });
      const cq = E.outBack(inv(tCare - 0.1, tCare + 0.6, t));
      if (cq > 0) {
        const cx = x0 + 7 * (bw + gap) + bw / 2, cy = y - h / 2 - 76;
        ctx.globalAlpha = a * clamp(cq); ctx.fillStyle = C.teal; rr(ctx, cx - 70, cy - 26 * cq, 140, 52 * cq, 10); ctx.fill(); ctx.globalAlpha = 1;
        text(ctx, '康复 / 照护', cx, cy, { size: 24, weight: 700, align: 'center', color: C.paperInk, alpha: a * clamp(cq) });
      }
    }
    const rq = E.inOutCubic(inv(tRule - 0.2, tRule + 0.7, t));
    if (rq > 0) {
      const bx0 = x0 + 3 * (bw + gap), bx1 = x0 + 7 * (bw + gap) - gap;
      polyline(ctx, [[bx0, y + 118], [bx0, y + 132], [bx1, y + 132], [bx1, y + 118]], rq, { color: C.gold2, width: 2.5, alpha: a });
      text(ctx, '保额 ≈ 3~5 年收入', (bx0 + bx1) / 2, y + 172, { size: 32, family: 'Serif', weight: 700, align: 'center', color: C.gold2, alpha: a * rq });
    }
    chip(ctx, '重疾险 · 给付型', 960, 160, { size: 30, color: C.gold2, stroke: rgba(C.gold, 0.6), bg: rgba(C.gold, 0.1), alpha: a * phase2, weight: 700 });
  }
}

// ---------- 对比：报销型 vs 给付型 ----------
function compare(ctx, t, a) {
  const tL = cue('c11', '医疗险'), tL2 = cue('c11', '医院的账单'), tR = cue('c11', '重疾险'), tR2 = cue('c11', '少掉的');
  const cards = [
    { x: 620, name: '医疗险', type: '报销型', ic: 'doc', line: '报的是：医院的账单', col: C.teal, col2: C.teal2, t0: tL, t1: tL2 },
    { x: 1300, name: '重疾险', type: '给付型', ic: 'wallet', line: '补的是：家里少掉的收入', col: C.gold, col2: C.gold2, t0: tR, t1: tR2 },
  ];
  text(ctx, '记住一个区别', W / 2, 190, { size: 30, color: C.ink2, align: 'center', alpha: a * P(t, S('c11') - 0.1, 0.6), spacing: 6 });
  cards.forEach((c) => {
    const q = E.outCubic(inv(c.t0 - 0.2, c.t0 + 0.6, t));
    if (q <= 0) return;
    const cw = 560, ch = 520, y = 560 + (1 - q) * 40;
    ctx.save(); ctx.globalAlpha = a * q; ctx.fillStyle = rgba(c.col, 0.07); ctx.strokeStyle = rgba(c.col, 0.55); ctx.lineWidth = 2;
    rr(ctx, c.x - cw / 2, y - ch / 2, cw, ch, 28); ctx.fill(); ctx.stroke(); ctx.restore();
    icon(ctx, c.ic, c.x, y - 150, 100, { color: c.col2, alpha: a * q, p: inv(c.t0, c.t0 + 0.8, t), width: 4 });
    text(ctx, c.name, c.x, y - 30, { size: 64, family: 'Serif', weight: 700, align: 'center', color: C.ink, alpha: a * q });
    chip(ctx, c.type, c.x, y + 50, { size: 28, color: c.col2, stroke: rgba(c.col, 0.6), bg: rgba(c.col, 0.12), alpha: a * q, weight: 700 });
    text(ctx, c.line, c.x, y + 150, { size: 34, weight: 500, align: 'center', color: c.col2, alpha: a, p: inv(c.t1 - 0.3, c.t1 + 0.9, t) });
  });
}

export default [
  { from: S('c1') - 0.4, to: S('c11') + 0.6, draw(ctx, t) { const a = hubAlpha(t); if (a > 0) hub(ctx, t, a); } },
  { from: T().d1a - 0.1, to: T().d1b + 0.1, draw(ctx, t) { const w = T(); billBar(ctx, t, env(t, w.d1a, w.d1b, 0.6, 0.6)); } },
  { from: T().d2a - 0.1, to: T().d2b + 0.1, draw(ctx, t) { const w = T(); lumpSum(ctx, t, env(t, w.d2a, w.d2b, 0.6, 0.6)); } },
  { from: T().cmp - 0.1, to: T().end + 0.1, draw(ctx, t) { const w = T(); compare(ctx, t, env(t, w.cmp, w.end, 0.6, 0.9)); } },
];
