// 第一章：一群人的约定（千人方阵 → 各自攒钱 → 资金池 → 核心逻辑 → 大数法则 → 保险公司）
import { W, H, C, E, P, env, inv, clamp, lerp, rgba, glow, dot, text, rich, chip, rr, fmtNum, TAU, rng, polyline, arrow } from '../engine.mjs';
import { S, END, cue, chapters } from '../timeline.mjs';
import { pool, icon, yuan } from './common.mjs';

const CX = 960, CY = 520;
// ---------- 千人：方阵与环形两种布局 ----------
const N = 1000, COLS = 40, ROWS = 25, SP = 25.5;
const GX0 = 740 - ((COLS - 1) * SP) / 2, GY0 = 520 - ((ROWS - 1) * SP) / 2;
const RADII = [300, 326, 352, 378];
const PEOPLE = (() => {
  const r = rng(21);
  const circ = RADII.map((x) => x), tot = circ.reduce((a, b) => a + b, 0);
  const counts = RADII.map((x) => Math.round((N * x) / tot)); counts[3] += N - counts.reduce((a, b) => a + b, 0);
  const ring = []; RADII.forEach((rad, k) => { for (let i = 0; i < counts[k]; i++) { const a = -Math.PI / 2 + ((i + (k % 2) * 0.5) / counts[k]) * TAU; ring.push({ rx: CX + Math.cos(a) * rad, ry: CY + Math.sin(a) * rad, ang: a, k }); } });
  // 方阵格子按角度分配到环上（减少交叉）
  const grid = []; for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) grid.push({ gx: GX0 + i * SP, gy: GY0 + j * SP });
  grid.forEach((g) => (g.ang = Math.atan2(g.gy - 520, g.gx - 740)));
  ring.sort((a, b) => a.ang - b.ang); grid.sort((a, b) => a.ang - b.ang);
  return grid.map((g, i) => ({ ...g, ...ring[i], ph: r() * 10, dl: r(), d: Math.hypot(g.gx - 740, g.gy - 520) }));
})();
const ONE = PEOPLE.reduce((b, p) => (Math.hypot(p.gx - 905, p.gy - 395) < Math.hypot(b.gx - 905, b.gy - 395) ? p : b));
const SICK = PEOPLE.reduce((b, p) => (p.k === 3 && Math.abs(p.ang - -0.55) < Math.abs(b.ang - -0.55) ? p : b), PEOPLE.find((p) => p.k === 3));
const SCAN = (() => { const r = rng(5); return Array.from({ length: 40 }, () => PEOPLE[Math.floor(r() * N)]); })();

// ---------- 大数法则模拟：14 条样本路径 ----------
const LLN = (() => {
  const r = rng(99), paths = [], ns = [];
  for (let k = 0; k <= 220; k++) ns.push(Math.round(10 * Math.pow(10, (k / 220) * 4)));
  for (let s = 0; s < 14; s++) {
    let hits = 0, n = 0; const pts = [];
    for (const target of ns) { while (n < target) { n++; if (r() < 0.001) hits++; } pts.push(hits / n); }
    paths.push(pts);
  }
  return { ns, paths };
})();

export default [
  // 镜头 1–3：千人（方阵 → 淡出 → 环形资金池）
  {
    from: S('a1') - 0.4, to: S('a9') + 0.6,
    draw(ctx, t) {
      const tBuild = S('a1') + 0.1, tOne = cue('a2', '一个人'), tScan = S('a3'), tDim = S('a4') - 0.1;
      const tMorph = S('a5') - 0.3, tEmit = cue('a5', '放进'), tFull = cue('a6', '三十万');
      const tSick = cue('a7', '病倒'), tPay = cue('a7', '拿到');
      const dimA4 = env(t, tDim, S('a5') + 0.2, 0.5, 0.6);
      const morph = (p) => E.inOutCubic(inv(tMorph + p.dl * 0.6, tMorph + p.dl * 0.6 + 1.5, t));
      const keyA = env(t, S('a8') - 0.3, S('a9') + 0.3, 0.6, 0.6);
      const outA = 1 - E.inOutCubic(inv(S('a9') - 0.3, S('a9') + 0.5, t));
      const base = (1 - 0.86 * dimA4) * (1 - 0.9 * keyA) * outA;
      const zoom = 1 + 0.04 * E.inOutSine(inv(tMorph, tFull + 2, t));
      ctx.translate(CX, CY); ctx.scale(zoom, zoom); ctx.translate(-CX, -CY);
      // 资金池
      const nArr = (t0) => { let c = 0; for (const p of PEOPLE) if (t0 >= tEmit + p.dl * (tFull - 0.85 - tEmit) + 0.85) c++; return c; };
      const arrived = t > tEmit ? nArr(t) : 0;
      const payK = E.inOutCubic(inv(tPay + 0.2, tPay + 1.8, t));
      const level = (arrived / N) * (1 - 0.94 * payK);
      const poolA = env(t, tMorph + 0.6, S('a9') + 0.4, 0.8, 0.8) * (1 - keyA);
      if (poolA > 0) {
        pool(ctx, CX, CY, 200, level * 0.92, t, poolA);
        const amt = arrived * 300 * (1 - payK);
        text(ctx, yuan(amt), CX, CY + 2, { size: 54, family: 'Serif', weight: 700, align: 'center', alpha: poolA * E.outCubic(inv(tEmit, tEmit + 0.4, t)), color: level > 0.55 ? C.paperInk : C.ink });
        chip(ctx, '资金池', CX, CY - 250, { size: 24, alpha: poolA * 0.9, color: C.gold2, stroke: rgba(C.gold, 0.4) });
        const eq = E.outCubic(inv(tFull - 0.1, tFull + 0.5, t)) * env(t, tFull - 0.2, tSick, 0.3, 0.4);
        text(ctx, '300 元 × 1,000 人', 1640, CY - 30, { size: 34, family: 'Serif', weight: 600, align: 'center', color: C.gold2, alpha: poolA * eq, p: eq });
        text(ctx, '= 300,000 元', 1640, CY + 30, { size: 34, family: 'Serif', weight: 600, align: 'center', color: C.gold2, alpha: poolA * eq, p: eq });
      }
      // 人
      for (const p of PEOPLE) {
        const a0 = E.outCubic(inv(tBuild + p.d / 900, tBuild + p.d / 900 + 0.5, t));
        if (a0 <= 0) continue;
        const m = morph(p);
        const x = lerp(p.gx, p.rx, m) + Math.sin(t * 0.8 + p.ph) * 1.2, y = lerp(p.gy, p.ry, m) + Math.cos(t * 0.7 + p.ph) * 1.2;
        let col = C.ink, rad = 3.4, a = a0 * (0.55 + 0.25 * Math.sin(t * 1.1 + p.ph)) * base;
        // 那一个人（方阵阶段）
        if (p === ONE) { const k = env(t, tOne, tScan + 0.2, 0.2, 0.4); if (k > 0) { col = C.coral; rad = lerp(3.4, 7, k); a = Math.max(a, k * base); glow(ctx, x, y, 60, C.coral, k * 0.7 * base); } }
        // 病倒的人（环形阶段）
        if (p === SICK && t > tSick) {
          const cure = E.inOutCubic(inv(tPay + 0.9, tPay + 1.9, t));
          col = cure > 0.5 ? C.teal2 : C.coral; rad = 7; a = base;
          glow(ctx, x, y, 90, cure > 0.5 ? C.teal : C.coral, 0.8 * base);
          if (cure > 0) { ctx.globalAlpha = cure * base; ctx.strokeStyle = C.teal; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 16, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
        }
        ctx.globalAlpha = clamp(a); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // 随机扫描：没人知道是谁
      if (t > tScan - 0.1 && t < tDim + 0.4) {
        const sa = env(t, tScan, tDim + 0.3, 0.2, 0.4) * base;
        const step = 0.13, k = Math.floor((t - tScan) / step);
        for (let j = 0; j < 4; j++) {
          const idx = k - j; if (idx < 0) continue;
          const p = SCAN[idx % SCAN.length], fa = (1 - j / 4) * sa;
          glow(ctx, p.gx, p.gy, 44, C.coral, fa * 0.8);
          ctx.globalAlpha = fa; ctx.fillStyle = C.coral; ctx.beginPath(); ctx.arc(p.gx, p.gy, 5, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
        }
      }
      // 注资粒子
      if (t > tEmit && t < tFull + 0.2) {
        for (const p of PEOPLE) {
          const t1 = tEmit + p.dl * (tFull - 0.85 - tEmit), q = inv(t1, t1 + 0.85, t);
          if (q <= 0 || q >= 1) continue;
          const e = E.inOutQuad(q), sw = 0.6 * (1 - e);
          const ang = p.ang + sw, rad = lerp(Math.hypot(p.rx - CX, p.ry - CY), 60, e);
          const x = CX + Math.cos(ang) * rad, y = CY + Math.sin(ang) * rad;
          glow(ctx, x, y, 14, C.gold, 0.9);
          ctx.fillStyle = C.gold2; ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
        }
      }
      // 赔付：池子 → 病倒的人
      if (t > tPay && t < tPay + 2.2) {
        for (let i = 0; i < 70; i++) {
          const q = inv(tPay + i * 0.018, tPay + i * 0.018 + 0.7, t); if (q <= 0 || q >= 1) continue;
          const e = E.inOutCubic(q), x = lerp(CX + Math.cos(SICK.ang) * 150, SICK.rx, e), y = lerp(CY + Math.sin(SICK.ang) * 150, SICK.ry, e) - Math.sin(e * Math.PI) * 30;
          glow(ctx, x, y, 22, C.gold, 0.9); ctx.fillStyle = C.gold2; ctx.fillRect(x - 2, y - 2, 4, 4);
        }
      }
      // 右侧注释（方阵阶段）
      const annA = env(t, cue('a2', '一千') - 0.1, tDim + 0.2, 0.5, 0.5);
      if (annA > 0) {
        const ax = 1340;
        const r1 = P(t, cue('a2', '一千') - 0.1, 0.6), r2 = P(t, tOne, 0.6), r3 = P(t, cue('a2', '三十万'), 0.6);
        text(ctx, '1,000', ax, 330, { size: 84, family: 'Serif', weight: 700, color: C.ink, alpha: annA * r1, p: r1 });
        text(ctx, '人', ax + 232, 342, { size: 32, color: C.ink2, alpha: annA * r1 });
        ctx.globalAlpha = annA * r2 * 0.4; ctx.fillStyle = C.ink2; ctx.fillRect(ax, 405, 380 * r2, 1.2); ctx.globalAlpha = 1;
        const scanA = env(t, tScan - 0.1, 99, 0.3, 0.1);
        text(ctx, '1', ax, 480, { size: 84, family: 'Serif', weight: 700, color: C.coral, alpha: annA * r2 * (1 - scanA) });
        text(ctx, '?', ax, 480, { size: 84, family: 'Serif', weight: 700, color: C.coral, alpha: annA * scanA });
        text(ctx, '人 / 每年 · 得大病', ax + 62, 492, { size: 30, color: C.ink2, alpha: annA * r2 });
        text(ctx, '¥300,000', ax, 610, { size: 64, family: 'Serif', weight: 700, color: C.coral2, alpha: annA * r3, p: r3 });
        text(ctx, '治疗费用', ax + 4, 668, { size: 28, color: C.ink2, alpha: annA * r3 });
      }
      // 每人 300 元/年
      const perA = env(t, cue('a5', '三百') - 0.1, tFull + 0.3, 0.4, 0.5) * outA;
      if (perA > 0) chip(ctx, '每人每年 300 元', CX + 470, CY - 360, { size: 28, color: C.gold2, alpha: perA, stroke: rgba(C.gold, 0.5), bg: rgba(C.gold, 0.08), p: inv(cue('a5', '三百') - 0.1, cue('a5', '三百') + 0.4, t) });
      const sickA = env(t, tSick, S('a8') + 0.2, 0.3, 0.5) * outA;
      if (sickA > 0) {
        const cure = inv(tPay + 0.9, tPay + 1.9, t);
        chip(ctx, cure > 0.5 ? '拿到 30 万' : '病倒', SICK.rx + 120, SICK.ry - 40, { size: 26, color: cure > 0.5 ? C.teal2 : C.coral2, alpha: sickA, stroke: rgba(cure > 0.5 ? C.teal : C.coral, 0.5), bg: 'rgba(8,12,24,0.7)' });
      }
    },
  },
  // 镜头 2：每个人自己攒 30 万
  {
    from: S('a4') - 0.4, to: S('a5') + 0.8,
    draw(ctx, t) {
      const a = env(t, S('a4') - 0.3, S('a5') + 0.6, 0.6, 0.7);
      const tSave = cue('a4', '攒下'), tFail = cue('a4', '攒不起');
      const n = 8, gap = 170, x0 = W / 2 - ((n - 1) * gap) / 2, yb = 800, hMax = 460;
      const fills = [0.12, 0.26, 0.08, 1.0, 0.18, 0.33, 0.15, 0.22];
      // 目标线
      const lp = P(t, S('a4') - 0.1, 0.9, E.inOutCubic);
      ctx.save(); ctx.globalAlpha = a * 0.7; ctx.strokeStyle = C.coral2; ctx.setLineDash([10, 10]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0 - 110, yb - hMax); ctx.lineTo(x0 - 110 + (n * gap + 60) * lp, yb - hMax); ctx.stroke(); ctx.restore();
      text(ctx, '每人需要 30 万', x0 - 110, yb - hMax - 40, { size: 30, color: C.coral2, alpha: a * lp });
      for (let i = 0; i < n; i++) {
        const x = x0 + i * gap, ap = P(t, S('a4') + i * 0.05, 0.5);
        ctx.save(); ctx.globalAlpha = a * ap * 0.5; ctx.strokeStyle = C.ink2; ctx.setLineDash([5, 7]); ctx.lineWidth = 1.5;
        rr(ctx, x - 34, yb - hMax, 68, hMax, 8); ctx.stroke(); ctx.restore();
        const g = E.outCubic(inv(tSave + i * 0.12, tSave + 1.8 + i * 0.12, t)) * fills[i];
        const fail = fills[i] < 1 ? E.outCubic(inv(tFail, tFail + 0.5, t)) : 0;
        const h = hMax * g;
        ctx.globalAlpha = a * ap; ctx.fillStyle = fail > 0 ? rgba(C.gold, 1 - fail * 0.55) : C.gold;
        rr(ctx, x - 34, yb - h, 68, h, 8); ctx.fill(); ctx.globalAlpha = 1;
        if (fills[i] >= 1 && g > 0.98) glow(ctx, x, yb - hMax, 80, C.gold, a * 0.5);
        dot(ctx, x, yb + 38, 8, fills[i] >= 1 ? C.gold2 : C.ink, a * ap, 3, 0.4);
        if (fail > 0) text(ctx, '不够', x, yb - h - 30, { size: 24, color: C.coral2, align: 'center', alpha: a * fail });
      }
    },
  },
  // 镜头 4：核心逻辑
  {
    from: S('a8') - 0.4, to: S('a9') + 0.6,
    draw(ctx, t) {
      const a = env(t, S('a8') - 0.2, S('a9') + 0.4, 0.5, 0.6);
      const t1 = cue('a8', '确定的小支出'), t2 = cue('a8', '换掉'), t3 = cue('a8', '不确定的大损失');
      const p0 = P(t, cue('a8', '用每个人') - 0.1, 0.6), p1 = inv(t1 - 0.05, t1 + 0.8, t), p2 = P(t, t2 - 0.05, 0.6), p3 = inv(t3 - 0.05, t3 + 0.9, t);
      text(ctx, '用每个人', W / 2, 300, { size: 34, color: C.ink2, align: 'center', alpha: a * p0, spacing: 8 });
      text(ctx, '确定的小支出', W / 2, 395, { size: 96, family: 'Serif', weight: 700, color: C.gold2, align: 'center', alpha: a, p: p1, spacing: 10, glowHex: C.gold, glowA: 0.3 });
      arrow(ctx, W / 2, 470, W / 2, 560, p2, { color: C.ink2, width: 2.5, alpha: a * 0.8 });
      text(ctx, '换掉', W / 2 + 34, 515, { size: 30, color: C.ink2, alpha: a * p2 });
      text(ctx, '不确定的大损失', W / 2, 640, { size: 96, family: 'Serif', weight: 700, color: C.coral, align: 'center', alpha: a, p: p3, spacing: 10, glowHex: C.coral, glowA: 0.25 });
    },
  },
  // 镜头 5：大数法则
  {
    from: S('a9') - 0.3, to: S('a10') + 0.8,
    draw(ctx, t) {
      const a = env(t, S('a9') - 0.2, S('a10') + 0.6, 0.6, 0.7);
      const x0 = 380, x1 = 1540, y0 = 250, y1 = 800, ymax = 0.005;
      const X = (n) => x0 + ((Math.log10(n) - 1) / 4) * (x1 - x0), Y = (v) => y1 - (Math.min(v, ymax * 1.08) / ymax) * (y1 - y0);
      const ax = P(t, S('a9') - 0.1, 0.8, E.inOutCubic);
      ctx.globalAlpha = a * 0.6; ctx.fillStyle = C.ink2;
      ctx.fillRect(x0, y1, (x1 - x0) * ax, 1.5); ctx.fillRect(x0, y1 - (y1 - y0) * ax, 1.5, (y1 - y0) * ax); ctx.globalAlpha = 1;
      [10, 100, 1000, 10000, 100000].forEach((n, i) => text(ctx, fmtNum(n), X(n), y1 + 32, { size: 22, color: C.mute, align: 'center', alpha: a * ax }));
      [0, 1, 2, 3, 4, 5].forEach((v) => text(ctx, `${v}‰`, x0 - 18, Y(v / 1000), { size: 22, color: C.mute, align: 'right', alpha: a * ax }));
      text(ctx, '参与人数', x1, y1 + 72, { size: 24, color: C.ink2, align: 'right', alpha: a * ax });
      text(ctx, '每年出事的比例', x0 - 60, y0 - 56, { size: 24, color: C.ink2, alpha: a * ax });
      // 真实概率线
      ctx.save(); ctx.globalAlpha = a * ax * 0.8; ctx.strokeStyle = C.teal; ctx.setLineDash([8, 8]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, Y(0.001)); ctx.lineTo(x1, Y(0.001)); ctx.stroke(); ctx.restore();
      text(ctx, '真实概率 1‰', x1 + 16, Y(0.001), { size: 24, color: C.teal2, alpha: a * ax });
      // 路径
      const dp = E.inOutSine(inv(S('a9') + 0.4, cue('a9', '靠得住', 0, 1) + 0.3, t));
      const nShow = Math.floor(LLN.ns.length * dp);
      // 置信带（人少时带宽超出图表，从左到右渐显）
      if (nShow > 1) {
        ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
        const bg = ctx.createLinearGradient(X(300), 0, X(3000), 0); bg.addColorStop(0, rgba(C.teal, 0)); bg.addColorStop(1, rgba(C.teal, 0.14));
        ctx.globalAlpha = a; ctx.fillStyle = bg; ctx.beginPath();
        for (let k = 0; k < nShow; k++) { const n = LLN.ns[k], sd = 2 * Math.sqrt(0.001 * 0.999 / n); k ? ctx.lineTo(X(n), Y(0.001 + sd)) : ctx.moveTo(X(n), Y(0.001 + sd)); }
        for (let k = nShow - 1; k >= 0; k--) { const n = LLN.ns[k], sd = 2 * Math.sqrt(0.001 * 0.999 / n); ctx.lineTo(X(n), Y(Math.max(0, 0.001 - sd))); }
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
      LLN.paths.forEach((pts, s) => {
        if (nShow < 2) return;
        ctx.save(); ctx.beginPath(); ctx.rect(x0, y0 - 20, x1 - x0 + 4, y1 - y0 + 20); ctx.clip();
        ctx.globalAlpha = a * (s === 0 ? 0.95 : 0.35); ctx.strokeStyle = s === 0 ? C.gold2 : C.gold; ctx.lineWidth = s === 0 ? 2.6 : 1.4; ctx.lineJoin = 'round';
        ctx.beginPath(); for (let k = 0; k < nShow; k++) { const x = X(LLN.ns[k]), y = Y(pts[k]); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.restore();
        if (s === 0) { const k = nShow - 1; dot(ctx, X(LLN.ns[k]), Y(pts[k]), 5, C.gold2, a, 4, 0.6); }
      });
      const lA = P(t, cue('a9', '越稳定'), 0.6);
      text(ctx, '人少：忽高忽低', X(55), Y(0.0036), { size: 26, color: C.ink2, align: 'center', alpha: a * P(t, cue('a9', '参与'), 0.6) * 0.9 });
      text(ctx, '人多：越来越稳', X(30000), Y(0.0026), { size: 26, color: C.teal2, align: 'center', alpha: a * lA });
      const tL = cue('a9', '大数法则');
      chip(ctx, '大数法则', W / 2 + 120, y0 - 40, { size: 32, color: C.gold2, stroke: rgba(C.gold, 0.6), bg: rgba(C.gold, 0.1), alpha: a * P(t, tL - 0.1, 0.5), p: inv(tL - 0.1, tL + 0.4, t), family: 'Serif', weight: 700 });
    },
  },
  // 镜头 6：保险公司经营资金池；保费构成
  {
    from: S('a10') - 0.4, to: chapters.ch2.cardStart + 0.6,
    draw(ctx, t) {
      const a = env(t, S('a10') - 0.3, chapters.ch2.cardStart - 0.05, 0.7, 0.9);
      const px = 620, py = 470;
      for (let i = 0; i < 90; i++) {
        const ang = (i / 90) * TAU + t * 0.06, rad = 232 + (i % 3) * 12;
        const q = P(t, S('a10') - 0.3 + (i / 90) * 0.8, 0.5);
        ctx.globalAlpha = a * q * (0.45 + 0.25 * Math.sin(t * 1.3 + i)); ctx.fillStyle = C.ink;
        ctx.beginPath(); ctx.arc(px + Math.cos(ang) * rad, py + Math.sin(ang) * rad, 2.6, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      pool(ctx, px, py, 170, 0.55, t, a);
      chip(ctx, '保险公司', px, py - 292, { size: 26, color: C.ink, alpha: a * P(t, S('a10'), 0.6), p: inv(S('a10'), S('a10') + 0.5, t) });
      const rows = [['chart', '算概率', cue('a10', '算概率')], ['in', '收保费', cue('a10', '收保费')], ['out', '做理赔', cue('a10', '做理赔')]];
      const tCost = cue('a10', '运营成本'), rowsOut = env(t, 0, tCost + 0.2, 0.01, 0.6);
      rows.forEach(([ic, s, tc], i) => {
        const q = P(t, tc - 0.1, 0.6), y = 330 + i * 120;
        if (q <= 0) return;
        ctx.globalAlpha = a * q * rowsOut * 0.35; ctx.strokeStyle = C.ink2; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(px + 190, py); ctx.bezierCurveTo(px + 300, py, 900, y, 1000, y); ctx.stroke(); ctx.globalAlpha = 1;
        icon(ctx, ic, 1060, y, 60, { color: C.gold2, alpha: a * rowsOut, p: q });
        text(ctx, s, 1130, y, { size: 46, family: 'Serif', weight: 600, alpha: a * rowsOut, p: q });
      });
      // 保费构成条
      const bA = a * env(t, tCost - 0.2, 999, 0.6, 0.1);
      if (bA > 0) {
        const bx = 960, by = 470, bw = 760, bh = 70;
        const segs = [['用于赔付', 0.72, C.gold, S('a10')], ['运营成本', 0.17, '#6F7FA8', tCost], ['利润', 0.11, C.violet, cue('a10', '利润')]];
        let x = bx;
        segs.forEach(([name, f, col, tc], i) => {
          const g = E.outCubic(inv(tc, tc + 0.7, t)) * (i === 0 ? E.outCubic(inv(tCost - 0.2, tCost + 0.4, t)) : 1);
          const w = bw * f * g;
          if (w > 1) { ctx.globalAlpha = bA; ctx.fillStyle = col; rr(ctx, x, by - bh / 2, w - 3, bh, 8); ctx.fill(); ctx.globalAlpha = 1; }
          text(ctx, name, x + (bw * f) / 2, by + 78, { size: 26, align: 'center', color: C.ink2, alpha: bA * g });
          x += bw * f;
        });
        // 300 元标记 与 总保费括号
        const m3 = E.outCubic(inv(tCost - 0.1, tCost + 0.5, t));
        const x300 = bx + bw * 0.72;
        ctx.globalAlpha = bA * m3; ctx.fillStyle = C.gold2; ctx.fillRect(x300 - 1, by - 70, 2, 36); ctx.globalAlpha = 1;
        text(ctx, '300 元', x300, by - 92, { size: 28, family: 'Serif', weight: 700, align: 'center', color: C.gold2, alpha: bA * m3 });
        const tMore = cue('a10', '多一些'), mp = E.inOutCubic(inv(tMore - 0.5, tMore + 0.4, t));
        polyline(ctx, [[bx, by - 130], [bx, by - 145], [bx + bw, by - 145], [bx + bw, by - 130]], mp, { color: C.ink, width: 2, alpha: bA * 0.8 });
        text(ctx, '实际保费：比 300 元多一些', bx + bw / 2, by - 185, { size: 30, align: 'center', color: C.ink, alpha: bA * mp, weight: 500 });
      }
    },
  },
];
