/* ============================================================
   第四章 · 醒 (100 – 122s)   第五章 · 涌 (122 – 156s)   终 (156 – 176s)
   ============================================================ */

/* ---------- S16 · 醒 + 1997 Deep Blue (100–106) ---------- */
(() => {
  const s = 100;
  cue(s, 'act', { n: 4 }); cue(s, 'crack'); flash(s, '#fff', 0.15, 1);
  yseg(100, 100.5, 1989, 1997);
  const ACT = {
    ch: '醒', num: '第 四 章', en: 'IV · The Awakening', years: '1997 — 2016', bg: '#F3F3F0', fg: '#0A0A0A', sub: '#6A6A6A', seed: 13,
    under: (c, lt) => { const a = 1 - prog(lt, 0.2, 1.2); if (a <= 0) return; c.save(); c.strokeStyle = `rgba(120,150,180,${0.6 * a})`; c.lineWidth = 3; const r = rng(97); for (let k = 0; k < 14; k++) { let x = 540, y = 1000, an = k / 14 * TAU + r() * 0.3; c.beginPath(); c.moveTo(x, y); for (let j = 0; j < 8; j++) { an += (r() - 0.5) * 0.6; x += Math.cos(an) * 90; y += Math.sin(an) * 90; c.lineTo(x, y); } c.stroke(); } c.restore(); },
  };
  const cam = makeCam(10, 9, 1180, 540, 1030), cam14 = makeCam(9, 10, 150, 850, 640);
  const POS = [['♚', 4, 8, 0], ['♛', 3, 5, 0], ['♜', 0, 8, 0], ['♝', 5, 6, 0], ['♞', 6, 6, 0], ['♟', 1, 7, 0], ['♟', 6, 7, 0], ['♟', 7, 6, 0],
    ['♚', 6, 1, 1], ['♛', 4, 3, 1], ['♜', 3, 1, 1], ['♜', 4, 4, 1], ['♝', 2, 4, 1], ['♞', 5, 3, 1], ['♟', 5, 2, 1], ['♟', 6, 2, 1], ['♟', 7, 2, 1]];
  const OUT = { '♚': '♔', '♛': '♕', '♜': '♖', '♝': '♗', '♞': '♘', '♟': '♙' };
  for (let k = 0; k < 18; k++) cue(s + 1.6 + k * 0.13, 'tick', { v: 0.2, hi: 1 });
  cue(s + 1.4 + 2.6, 'thunk'); cue(s + 1.4 + 2.6, 'hit', { v: 0.7 }); kick(s + 1.4 + 2.6, 12);
  scene({
    id: 'deepblue', s, e: 106, ink: '#111', hud: lt => lt > 1.4 ? 1 : 0,
    draw(c, lt, d, t) {
      if (lt < 1.4) return actCard(c, lt, ACT);
      const u = lt - 1.4; bg(c, '#F3F3F0');
      board(c, cam, '#E2E2DE', '#1E1E21', null, '#0A0A0A');
      // search: faint lines flickering between squares (200M positions / s)
      if (u > 0.2 && u < 2.6) {
        const f = Math.floor(t * 30); c.save(); c.strokeStyle = '#2F6BFF'; c.lineWidth = 2;
        for (let k = 0; k < 26; k++) { const a = sq(Math.floor(h2(f, k) * 8), 1 + Math.floor(h2(f, k + 50) * 8)), b = sq(Math.floor(h2(f, k + 99) * 8), 1 + Math.floor(h2(f, k + 150) * 8)); const p1 = cam(a[0], 0, a[1]), p2 = cam(b[0], 0, b[1]); c.globalAlpha = 0.15 + h2(f, k + 7) * 0.35; c.beginPath(); c.moveTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.stroke(); }
        c.restore();
      }
      const tp = prog(u, 2.6, 3.1);
      const items = POS.map(p => { const q = sq(p[1], p[2]); return [q, p]; }).sort((a, b) => a[0][1] - b[0][1]);
      for (const [q, p] of items) {
        const isBK = p[0] === '♚' && p[3] === 0;
        const rot = isBK ? E.outBack(tp) * 1.45 : 0;
        if (p[3]) piece(c, cam, q[0], q[1], [p[0], OUT[p[0]]], '#FAFAF7', '#111', 0, 0, 0.95);
        else piece(c, cam, q[0], q[1], [p[0], null], '#111', null, 0, rot, 0.95);
      }
      const cn = 200000000 * E.outExpo(prog(u, 0.2, 1.6));
      lin(c, u, 0.2, fmtInt(cn), 540, 1480, { size: 84, fam: F.wide, weight: 700, color: '#111', align: 'center', mode: 'fade', dur: 0.2 });
      lin(c, u, 0.4, '局面 / 秒', 540, 1540, { size: 34, weight: 700, color: '#666', align: 'center', ls: 6 });
      // picture-in-picture callback to 1914
      const pip = E.outExpo(prog(u, 1.0, 1.5)) * (1 - prog(u, 3.6, 3.9));
      if (pip > 0) {
        c.save(); c.translate(lerp(420, 0, pip), 0); c.globalAlpha = clamp(pip * 2);
        c.fillStyle = SEP.bg; c.fillRect(700, 540, 300, 210);
        c.save(); c.beginPath(); c.rect(700, 540, 300, 210); c.clip(); board(c, cam14, '#D6C6A2', '#6A5840', null, '#3A2E20'); c.restore();
        c.strokeStyle = '#111'; c.lineWidth = 3; c.strokeRect(700, 540, 300, 210);
        txt(c, '↩ 1914 · 「棋手」', 700, 790, { size: 30, weight: 700, color: '#111', mode: 'none' });
        c.restore();
      }
      lin(c, u, 0.0, '1997', 80, 380, { size: 220, fam: F.swiss, weight: 900, color: '#0A0A0A', spread: 0.3, ls: -6 });
      lin(c, u, 0.2, '深蓝 vs 卡斯帕罗夫', 88, 455, { size: 46, weight: 900, color: '#0A0A0A' });
      lin(c, u, 2.8, '世界冠军，', 88, 1680, { size: 76, weight: 900, color: '#0A0A0A' });
      lin(c, u, 3.1, '第一次输给了机器。', 88, 1780, { size: 76, weight: 900, color: '#0A0A0A' });
    },
  });
})();

/* ---------- S17 · 2009 ImageNet → 2012 AlexNet (106–114) ---------- */
const TAGS = ['猫', '狗', '蘑菇', '卡车', '草莓', '企鹅', '吉他', '火山', '钟表', '热气球', '柠檬', '斑马', '帆船', '台灯', '雨伞'];
function gpu(c, x, y, w, h, t, label) {
  c.fillStyle = '#1B1B1F'; rr(c, x, y, w, h, 14); c.fill(); c.strokeStyle = '#3A3A42'; c.lineWidth = 2; c.stroke();
  c.fillStyle = '#2A2A31'; rr(c, x + 16, y + 14, w - 32, h - 28, 10); c.fill();
  for (const fx of [x + w * 0.3, x + w * 0.62]) {
    c.fillStyle = '#101013'; c.beginPath(); c.arc(fx, y + h / 2, h * 0.36, 0, TAU); c.fill();
    c.save(); c.translate(fx, y + h / 2); c.rotate(t * 22); c.fillStyle = '#3F3F48';
    for (let k = 0; k < 7; k++) { c.rotate(TAU / 7); c.beginPath(); c.ellipse(h * 0.17, 0, h * 0.17, h * 0.06, 0.5, 0, TAU); c.fill(); }
    c.restore();
  }
  txt(c, label, x + w - 30, y + h / 2 + 12, { size: 30, fam: F.code, weight: 700, color: '#9BE564', align: 'right', mode: 'none' });
  c.fillStyle = '#C9A64B'; for (let k = 0; k < 14; k++) c.fillRect(x + 40 + k * 18, y + h, 11, 14);
}
(() => {
  const s = 106;
  yseg(106, 106.4, 1997, 2009); yseg(109.6, 110.0, 2009, 2012);
  for (let k = 0; k < 24; k++) cue(s + 0.1 + k * 0.06, 'tick', { v: 0.15, hi: 1 });
  cue(s + 3.6, 'hit', { v: 0.5 }); cue(s + 4.0, 'impact'); kick(s + 4.0, 24, 6); flash(s + 4.0, AMBER, 0.12, 0.35);
  cue(s + 6.0, 'hit', { v: 0.8 }); kick(s + 6.0, 10);
  scene({
    id: 'imagenet', s, e: 114, ink: '#EEE', hud: 1,
    draw(c, lt, d, t) {
      bg(c, '#0B0B0D');
      if (lt < 3.6) {
        const sc = lerp(1, 0.22, E.inOutCubic(prog(lt, 1.4, 3.3))), TS = 90;
        c.save(); c.translate(540, 960); c.scale(sc, sc); c.translate(-540, -960);
        const x0 = 540 - 540 / sc - TS, x1 = 540 + 540 / sc + TS, y0 = 960 - 960 / sc - TS, y1 = 960 + 960 / sc + TS;
        for (let gy = Math.floor(y0 / TS); gy < y1 / TS; gy++) for (let gx = Math.floor(x0 / TS); gx < x1 / TS; gx++) {
          const dist = Math.hypot(gx * TS + 45 - 540, gy * TS + 45 - 960) / 1100, at = 0.05 + dist * 1.3 + h2(gx, gy) * 0.35;
          const p = prog(lt, at, at + 0.2); if (p <= 0) continue;
          const hue = Math.floor(h2(gx + 3, gy) * 360), x = gx * TS + 4, y = gy * TS + 4, s2 = TS - 8;
          if (sc > 0.5) {
            const g = c.createLinearGradient(x, y, x, y + s2); g.addColorStop(0, `hsl(${hue},45%,${35 + h2(gx, gy + 9) * 25}%)`); g.addColorStop(1, `hsl(${(hue + 40) % 360},40%,18%)`);
            c.globalAlpha = p; c.fillStyle = g; c.fillRect(x, y, s2, s2);
            c.fillStyle = `hsla(${(hue + 180) % 360},60%,70%,0.8)`; const sh = Math.floor(h2(gx, gy + 5) * 3), cx = x + s2 / 2, cy = y + s2 * 0.55;
            c.beginPath(); if (sh === 0) c.arc(cx, cy, s2 * 0.22, 0, TAU); else if (sh === 1) { c.moveTo(cx, cy - s2 * 0.25); c.lineTo(cx + s2 * 0.25, cy + s2 * 0.2); c.lineTo(cx - s2 * 0.25, cy + s2 * 0.2); } else c.ellipse(cx, cy, s2 * 0.3, s2 * 0.14, 0.4, 0, TAU); c.fill();
            if (h2(gx, gy + 77) < 0.18) { const tg = TAGS[Math.floor(h2(gx + 1, gy) * TAGS.length)]; c.fillStyle = 'rgba(0,0,0,0.65)'; c.fillRect(x, y, s2, 24); txt(c, tg, x + 6, y + 19, { size: 18, weight: 700, color: '#fff', mode: 'none' }); }
          } else { c.globalAlpha = p; c.fillStyle = `hsl(${hue},40%,${30 + h2(gx, gy + 9) * 25}%)`; c.fillRect(x, y, s2, s2); }
        }
        c.restore(); c.globalAlpha = 1;
        const pa = E.outCubic(prog(lt, 0.3, 0.6));
        c.fillStyle = `rgba(11,11,13,${0.86 * pa})`; c.fillRect(0, 760, W, 400);
        txt(c, fmtInt(14197122 * E.outExpo(prog(lt, 0.3, 2.8))), 540, 960, { size: 120, fam: F.wide, weight: 700, color: '#fff', align: 'center', mode: 'none', alpha: pa });
        lin(c, lt, 0.5, '张人工标注的图片', 540, 1050, { size: 48, weight: 700, color: '#D0D0D6', align: 'center' });
        c.fillStyle = `rgba(11,11,13,${0.86 * pa})`; c.fillRect(0, 200, W, 300);
        lin(c, lt, 0.1, '2009', 80, 380, { size: 200, fam: F.swiss, weight: 900, color: '#fff', spread: 0.3, ls: -6 });
        lin(c, lt, 0.3, 'ImageNet · 李飞飞', 88, 455, { size: 46, weight: 900, color: '#D0D0D6' });
        return;
      }
      const u = lt - 3.6;
      const gp = E.outExpo(prog(u, 0, 0.35));
      gpu(c, lerp(-900, 90, gp), 520, 900, 150, t, 'GTX 580');
      gpu(c, lerp(1100, 90, gp), 700, 900, 150, t + 0.3, 'GTX 580');
      lin(c, u, 0.2, '两块游戏显卡', 90, 925, { size: 40, weight: 700, color: '#9BE564' });
      const base = 1560, k = 520 / 30;
      c.strokeStyle = '#3A3A42'; c.lineWidth = 2; c.beginPath(); c.moveTo(90, base); c.lineTo(990, base); c.stroke();
      for (const v of [10, 20, 30]) { c.globalAlpha = 0.5; c.setLineDash([6, 10]); c.beginPath(); c.moveTo(90, base - v * k); c.lineTo(990, base - v * k); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; txt(c, v + '%', 990, base - v * k - 10, { size: 24, fam: F.code, color: '#77777F', align: 'right', mode: 'none' }); }
      txt(c, 'ImageNet 竞赛 · Top-5 错误率', 90, 1000 - 10, { size: 32, weight: 500, color: '#A8A8B3', p: prog(u, 0.1, 0.4), mode: 'fade' });
      const bIn = E.outCubic(prog(u, 0.05, 0.3));
      const drop = prog(u, 0.4, 1.0), vA = lerp(26.2, 15.3, E.outElastic(drop));
      const bars = [[180, 26.2, '#55555E', '2012 第二名', '26.2%'], [600, vA, AMBER, 'AlexNet', drop > 0 ? '15.3%' : '26.2%']];
      for (const [x, v, col, lab, vl] of bars) {
        const hh = v * k * bIn; c.fillStyle = col; c.fillRect(x, base - hh, 300, hh);
        txt(c, vl, x + 150, base - hh - 24, { size: 64, fam: F.wide, weight: 700, color: col === AMBER ? AMBER : '#C8C8CE', align: 'center', mode: 'none', alpha: bIn });
        txt(c, lab, x + 150, base + 56, { size: 36, weight: 900, color: '#E6E6EA', align: 'center', mode: 'none', alpha: bIn });
      }
      lin(c, u, 0.05, '2012', 80, 380, { size: 200, fam: F.swiss, weight: 900, color: '#fff', spread: 0.3, ls: -6 });
      lin(c, u, 0.2, 'AlexNet · 多伦多大学', 88, 455, { size: 46, weight: 900, color: '#D0D0D6' });
      lin(c, u, 2.4, '深度学习，醒了。', 540, 1790, { size: 104, weight: 900, color: '#fff', align: 'center', mode: 'slam', dur: 0.35 });
    },
    post(c, lt, d, t, buf) { const g = prog(lt, 4.0, 4.3); if (g > 0 && g < 1) fxChroma(buf, 14 * (1 - g)); resetCtx(c); grain(c, t, 0.04); vignette(c, 0.35); },
  });
})();

/* ---------- S18 · 2016 AlphaGo, move 37 (114–122) ---------- */
let woodCv = null;
function wood() {
  if (woodCv) return woodCv;
  woodCv = mk(W, H); const c = woodCv.getContext('2d');
  for (let y = 0; y < H; y += 2) { const v = 0.5 + 0.5 * Math.sin(y * 0.035 + 4 * noise1(y * 0.004, 5)) * Math.sin(y * 0.011); c.fillStyle = mixHex('#C58F42', '#E4B56A', v); c.fillRect(0, y, W, 2); }
  c.globalAlpha = 0.08; for (let k = 0; k < 60; k++) { c.fillStyle = '#6B4415'; c.fillRect(0, h2(k, 1) * H, W, 1 + h2(k, 2) * 3); }
  return woodCv;
}
const GO = [[15, 3], [3, 15], [16, 15], [3, 3], [14, 16], [2, 5], [5, 2], [16, 9], [9, 15], [15, 12], [12, 15], [4, 16], [2, 13], [9, 3], [6, 3], [16, 5], [12, 3], [3, 9], [6, 15], [15, 7], [10, 16], [8, 2], [2, 2], [16, 11], [11, 4], [4, 5], [13, 4], [5, 4]];
(() => {
  const s = 114, G0 = 90, GS = 50, GY = 560, M37 = [13, 9];
  yseg(114, 114.4, 2012, 2016);
  GO.forEach((_, k) => cue(s + 0.3 + k * 0.125, 'tok', { v: 0.5 + h2(k, 1) * 0.3 }));
  cue(s + 4.0, 'stone37'); kick(s + 4.0, 6, 4);
  cue(s + 5.2, 'hit', { v: 0.7 }); cue(s + 5.6, 'swell', { dur: 2.4 });
  const gp = (i, j) => [G0 + i * GS, GY + j * GS];
  function stone(c, x, y, black, sc = 1, a = 1) {
    c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(sc, sc);
    c.fillStyle = 'rgba(40,20,0,0.35)'; c.beginPath(); c.arc(4, 5, 23, 0, TAU); c.fill();
    const g = c.createRadialGradient(-8, -9, 2, 0, 0, 24); g.addColorStop(0, black ? '#5A5A5A' : '#FFFFFF'); g.addColorStop(1, black ? '#0B0B0B' : '#C9C4BA');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 23, 0, TAU); c.fill(); c.restore();
  }
  scene({
    id: 'alphago', s, e: 122, ink: '#1C1206', hud: 1,
    draw(c, lt) {
      c.drawImage(wood(), 0, 0, W, H);
      const zoom = lerp(1, 1.05, prog(lt, 0, 3.8)) * lerp(1, 1.1, E.inOutCubic(prog(lt, 3.8, 4.4)));
      const [mx, my] = gp(...M37);
      c.save(); const fx = lerp(540, mx, prog(lt, 3.8, 4.4)), fy = lerp(1010, my, prog(lt, 3.8, 4.4)); c.translate(fx, fy); c.scale(zoom, zoom); c.translate(-fx, -fy);
      c.strokeStyle = '#2B1D0E'; c.lineWidth = 2; c.beginPath();
      for (let i = 0; i < 19; i++) { c.moveTo(G0 + i * GS, GY); c.lineTo(G0 + i * GS, GY + 18 * GS); c.moveTo(G0, GY + i * GS); c.lineTo(G0 + 18 * GS, GY + i * GS); } c.stroke();
      c.lineWidth = 4; c.strokeRect(G0, GY, 18 * GS, 18 * GS);
      c.fillStyle = '#2B1D0E'; for (const i of [3, 9, 15]) for (const j of [3, 9, 15]) { c.beginPath(); c.arc(G0 + i * GS, GY + j * GS, 7, 0, TAU); c.fill(); }
      GO.forEach(([i, j], k) => { const tt = 0.3 + k * 0.125, p = prog(lt, tt, tt + 0.1); if (p > 0) { const [x, y] = gp(i, j); stone(c, x, y, k % 2 === 0, lerp(1.35, 1, E.outCubic(p)), clamp(p * 3)); } });
      const dark = E.outCubic(prog(lt, 3.8, 4.0));
      if (dark > 0) { c.save(); c.fillStyle = `rgba(10,6,2,${0.6 * dark})`; c.beginPath(); c.rect(-200, -200, W + 400, H + 400); c.arc(mx, my, 120, 0, TAU, true); c.fill('evenodd'); c.restore(); }
      const p37 = prog(lt, 4.0, 4.12);
      if (p37 > 0) {
        stone(c, mx, my, true, lerp(1.6, 1, E.outCubic(p37)), clamp(p37 * 3));
        const rp = prog(lt, 4.05, 5.2); c.strokeStyle = hexA(AMBER, 1 - rp); c.lineWidth = 5; c.beginPath(); c.arc(mx, my, 30 + rp * 140, 0, TAU); c.stroke();
        c.fillStyle = AMBER; c.beginPath(); c.arc(mx, my, 9, 0, TAU); c.fill();
      }
      c.restore();
      lin(c, lt, 0.05, '2016', 80, 380, { size: 200, fam: F.swiss, weight: 900, color: '#1C1206', spread: 0.3, ls: -6, t1: 3.8 });
      lin(c, lt, 0.25, '首尔 · AlphaGo 4 : 1 李世石', 88, 455, { size: 46, weight: 900, color: '#1C1206', t1: 3.8 });
      const pb = E.outCubic(prog(lt, 4.3, 4.6));
      if (pb > 0) { c.fillStyle = `rgba(20,12,4,${0.82 * pb})`; c.fillRect(0, 1500, W, 420); }
      lin(c, lt, 4.35, '第 37 手', 88, 1640, { size: 110, weight: 900, color: '#FFF3DE', mode: 'slam', dur: 0.35 });
      lin(c, lt, 5.0, 'AlphaGo 估算：人类下出这一步的概率', 90, 1730, { size: 40, weight: 500, color: '#E6D2B0' });
      const l3 = lin(c, lt, 5.4, '只有', 90, 1830, { size: 60, weight: 900, color: '#FFF3DE' });
      if (l3) lin(c, lt, 5.6, '万分之一', 90 + l3.width + 16, 1830, { size: 60, weight: 900, color: AMBER, mode: 'pop' });
    },
    post(c, lt, d, t) { grain(c, t, 0.05); vignette(c, 0.35 + prog(lt, 3.8, 4.0) * 0.3); },
  });
})();

/* ---------- S19 · 涌 + 2017 Transformer (122–128) ---------- */
(() => {
  const s = 122;
  cue(s, 'act', { n: 5 }); cue(s, 'impact'); kick(s, 20, 6); yseg(122, 122.4, 2016, 2017);
  cue(s + 1.4 + 2.0, 'whoosh'); cue(s + 1.4 + 2.8, 'sparkle');
  const ACT = { ch: '涌', num: '第 五 章', en: 'V · The Surge', years: '2017 — 2026', bg: '#0A0912', fg: '#fff', sub: '#A59FC0', seed: 17,
    fill: c => { const g = c.createLinearGradient(-400, -600, 400, 400); g.addColorStop(0, AMBER); g.addColorStop(0.5, '#FF4F9A'); g.addColorStop(1, '#7B5CFF'); return g; } };
  const HEADS = [AMBER, '#FF4F9A', '#53D8FB', '#B6F36A'];
  const EN = ['Attention', 'Is', 'All', 'You', 'Need'];
  const ZH = Array.from('让每一个词，同时看见所有的词。');
  function arcs(c, ys, xr, p, seed, thr, mul) {
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    for (let i = 0; i < ys.length; i++) for (let j = i + 1; j < ys.length; j++) for (let h = 0; h < 4; h++) {
      let w = h2(seed + i * 31 + j, h + 1); if ((i === 4 && j === 13) && seed > 100) w = 1; if (w < thr) continue;
      const k = clamp(p * 1.6 - h2(i, j + h) * 0.6); if (k <= 0) continue;
      const cy = (ys[i] + ys[j]) / 2, ry = (ys[j] - ys[i]) / 2, rx = ry * (0.55 + h * 0.22);
      c.strokeStyle = HEADS[h]; c.globalAlpha = (0.15 + w * 0.55) * mul; c.lineWidth = 1 + (w - thr) / (1 - thr) * 6;
      c.beginPath(); c.ellipse(xr, cy, Math.min(rx, 560), ry, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * k); c.stroke();
    }
    c.restore();
  }
  scene({
    id: 'transformer', s, e: 128, ink: '#E8E4F6', hud: lt => lt > 1.4 ? 1 : 0,
    draw(c, lt) {
      if (lt < 1.4) return actCard(c, lt, ACT);
      const u = lt - 1.4; bg(c, '#0A0912');
      const out = prog(u, 1.8, 2.1);
      const ysE = EN.map((_, i) => 640 + i * 150);
      if (out < 1) {
        arcs(c, ysE, 470, prog(u, 0.3, 1.5) * (1 - out), 7, 0.35, 1 - out);
        EN.forEach((w, i) => txt(c, w, 440, ysE[i] + 22, { size: 60, fam: F.wide, weight: 400, color: '#fff', align: 'right', p: prog(u, i * 0.08, i * 0.08 + 0.4), out, spread: 0.3 }));
      }
      // the caption flies up and becomes the diagram
      const cap = { size: 54, weight: 900 }, capStr = ZH.join(''), L = layout((fnt(scratch, cap), scratch), capStr, 0), cx0 = 540 - L.width / 2;
      const ysZ = ZH.map((_, k) => 400 + k * 76);
      const capIn = prog(u, 0.9, 1.4);
      lin(c, u, 0.7, '注意力机制：', 540, 1600, { size: 40, weight: 500, color: '#A59FC0', align: 'center', t1: 1.9 });
      ZH.forEach((ch, k) => {
        const fl = E.inOutCubic(prog(u, 2.0 + k * 0.03, 2.6 + k * 0.03));
        const x = lerp(cx0 + L.xs[k], 430 - L.ws[k] / 2, fl), y = lerp(1690, ysZ[k] + 20, fl), sz = lerp(54, 46, fl);
        txt(c, ch, x, y, { size: sz, weight: 900, color: (k === 4 || k === 13) && fl > 0.9 ? AMBER : '#fff', p: capIn, mode: 'fade' });
      });
      if (u > 2.5) arcs(c, ysZ.map(y => y + 4), 470, prog(u, 2.7, 4.2), 300, 0.62, 1);
      lin(c, u, 0.0, '2017', 80, 330, { size: 170, fam: F.wide, weight: 900, color: '#fff', spread: 0.3, t1: 1.9 });
      lin(c, u, 0.2, 'Transformer', 88, 410, { size: 52, fam: F.wide, weight: 400, color: '#A59FC0', t1: 1.9 });
      lin(c, u, 0.35, '《Attention Is All You Need》', 88, 470, { size: 34, fam: F.serif, weight: 700, color: '#7F79A0', t1: 1.9 });
      lin(c, u, 3.0, '一个词，', 620, 1640, { size: 56, weight: 900, color: '#fff' });
      lin(c, u, 3.3, '看见全部。', 620, 1720, { size: 56, weight: 900, color: AMBER });
    },
    post(c, lt, d, t) { if (lt > 1.4) { grain(c, t, 0.04); vignette(c, 0.4); } },
  });
})();

/* ---------- S20 · 2018–2020 scale: the vertical frame runs out (128–136) ---------- */
(() => {
  const s = 128, K = 26, BASE = 1650, H3 = 175 * K;
  yseg(128, 128.3, 2017, 2018); yseg(129.6, 129.9, 2018, 2019); yseg(131.2, 131.5, 2019, 2020);
  cue(s + 1.6, 'blip', { p: 2 }); cue(s + 3.2, 'blip', { p: 4 }); cue(s + 3.2, 'riser', { dur: 3.8 }); cue(s + 7.0, 'impact'); kick(s + 7.0, 28, 5); flash(s + 7.0, '#fff', 0.14, 0.9);
  const hAt = lt => H3 * E.inCubic(prog(lt, 3.2, 7.0));
  const fmtB = b => (b < 1 ? (b * 10).toFixed(2) : Math.round(b * 10)) + ' 亿';
  scene({
    id: 'scale', s, e: 136, ink: '#EDE8FF', hud: 1,
    draw(c, lt, d, t) {
      const h3 = hAt(lt), cam = Math.max(0, h3 - 1130), heat = clamp(cam / 3500);
      vgrad(c, mixHex('#0A0912', '#1A0F2A', heat), mixHex('#0A0912', '#2A1330', heat));
      const spd = (hAt(lt) - hAt(lt - 0.03)) / 0.03;
      if (spd > 300) { c.save(); c.strokeStyle = '#fff'; c.lineCap = 'round'; for (let k = 0; k < 40; k++) { const x = h2(k, 1) * W, len = 80 + spd * 0.08 * h2(k, 2), y = ((h2(k, 3) * H + t * spd * 0.9) % (H + len)) - len; c.globalAlpha = 0.08 + 0.2 * h2(k, 4) * clamp(spd / 3000); c.lineWidth = 2 + h2(k, 5) * 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + len); c.stroke(); } c.restore(); }
      c.save(); c.translate(0, cam);
      for (let v = 250; v <= 1750; v += 250) {
        const y = BASE - v / 10 * K; if (y + cam < -40 || y + cam > H + 40) continue;
        c.strokeStyle = 'rgba(237,232,255,0.2)'; c.lineWidth = 2; c.setLineDash([10, 12]); c.beginPath(); c.moveTo(60, y); c.lineTo(1020, y); c.stroke(); c.setLineDash([]);
        txt(c, v + ' 亿', 1020, y - 12, { size: 30, fam: F.wide, weight: 400, color: 'rgba(237,232,255,0.6)', align: 'right', mode: 'none' });
      }
      c.fillStyle = '#EDE8FF'; c.fillRect(60, BASE, 960 * E.outExpo(prog(lt, 0, 0.5)), 4);
      const bar = (x, h, col, name, yr, val, t0) => {
        const p = prog(lt, t0, t0 + 0.4); if (p <= 0) return;
        const hh = typeof h === 'number' ? h * E.outCubic(p) : h;
        if (typeof col === 'string') c.fillStyle = col; else { const g = c.createLinearGradient(0, BASE, 0, BASE - Math.max(hh, 1)); g.addColorStop(0, col[0]); g.addColorStop(1, col[1]); c.fillStyle = g; }
        c.fillRect(x, BASE - hh, 200, Math.max(3, hh));
        txt(c, name, x + 100, BASE + 60, { size: 40, fam: F.wide, weight: 700, color: '#EDE8FF', align: 'center', p, mode: 'fade' });
        txt(c, yr, x + 100, BASE + 106, { size: 30, fam: F.wide, weight: 400, color: '#A59FC0', align: 'center', p, mode: 'fade' });
        if (val) txt(c, val, x + 100, BASE - Math.max(hh, 3) - 22, { size: 44, fam: F.wide, weight: 700, color: '#EDE8FF', align: 'center', p, mode: 'pop' });
      };
      bar(130, 1.17 * K / 10, '#77718F', 'GPT-1', '2018', '1.17 亿', 0.2);
      bar(440, 15 * K / 10, '#77718F', 'GPT-2', '2019', '15 亿', 1.6);
      if (lt > 3.2) {
        const g = c.createLinearGradient(0, BASE, 0, BASE - Math.max(h3, 10)); g.addColorStop(0, AMBER); g.addColorStop(0.7, '#FF7AB8'); g.addColorStop(1, '#FFFFFF');
        c.fillStyle = g; c.fillRect(750, BASE - h3, 200, h3);
        glow(c, 850, BASE - h3, 220, '#FFFFFF', 0.4 + clamp(spd / 2000) * 0.5);
        txt(c, 'GPT-3', 850, BASE + 60, { size: 40, fam: F.wide, weight: 700, color: '#EDE8FF', align: 'center', mode: 'none' });
        txt(c, '2020', 850, BASE + 106, { size: 30, fam: F.wide, weight: 400, color: '#A59FC0', align: 'center', mode: 'none' });
      }
      c.restore();
      // screen-space counter
      const cv = lt < 1.6 ? 0.117 : lt < 3.2 ? 1.5 : Math.max(1.5, 175 * E.inCubic(prog(lt, 3.2, 7.0)));
      c.fillStyle = 'rgba(10,9,18,0.72)'; c.fillRect(0, 200, W, 300);
      lin(c, lt, 0.0, '参数量', 88, 290, { size: 44, weight: 900, color: '#A59FC0', ls: 6 });
      txt(c, fmtB(cv), 80, 440, { size: lt > 7 ? lerp(170, 150, E.outExpo(prog(lt, 7, 7.3))) : 150, fam: F.wide, weight: 900, color: lt > 7 ? AMBER : '#fff', mode: 'none', alpha: E.outCubic(prog(lt, 0.1, 0.4)) });
      const pb = E.outCubic(prog(lt, 6.4, 6.7));
      if (pb > 0) { c.fillStyle = `rgba(10,9,18,${0.6 * pb})`; c.fillRect(0, 1460, W, 300); }
      lin(c, lt, 6.45, '竖屏，', 88, 1580, { size: 100, weight: 900, color: '#fff' });
      lin(c, lt, 6.7, '已经装不下了。', 88, 1700, { size: 100, weight: 900, color: '#fff' });
    },
    post(c, lt, d, t, buf) { const sp = prog(lt, 5.5, 7.0) * (1 - prog(lt, 7.0, 7.6)); if (sp > 0.02) { fxChroma(buf, 12 * sp); resetCtx(c); } grain(c, t, 0.04); },
  });
})();

/* ---------- S21 · 2022 ChatGPT: two months, a hundred million (136–144) ---------- */
const HELLO = ['你好', 'Hello', 'Bonjour', 'Hola', 'こんにちは', '안녕하세요', 'Ciao', 'Hallo', 'Olá', 'Привет', 'Hej', 'Salut', 'Merhaba', 'Xin chào', 'Namaste', 'Ahoj', '帮我写首诗', '解释量子力学', '这段代码为什么报错？', '给我起个名字', '今晚吃什么？', 'Write a haiku', 'Fix my SQL', '怎么跟老板提加薪', 'Explain like I\'m five', '翻译成法语'];
(() => {
  const s = 136, NB = 240;
  yseg(136, 136.4, 2020, 2022);
  const RT = [['你好！', 0.75], ['有什么', 0.9], ['可以', 1.02], ['帮你的', 1.12], ['吗？', 1.25]];
  cue(s + 0.25, 'send'); RT.forEach(([, x]) => cue(s + x, 'key', { soft: 1 }));
  const BT = []; for (let b = 0; b < NB; b++) BT.push(1.8 + 3.6 * Math.pow(b / NB, 0.42));
  let last = -1; BT.forEach((x, b) => { if (x - last > 0.035) { cue(s + x, 'pop', { p: b % 7 }); last = x; } });
  cue(s + 5.6, 'hit', { v: 0.9 }); kick(s + 5.6, 10);
  const BUB = BT.map((tt, b) => { const r = rng(900 + b); return { tt, x: 70 + r() * 940, y: 520 + r() * 1400, txt: HELLO[Math.floor(r() * HELLO.length)], size: 30 + r() * 20, col: r() }; });
  scene({
    id: 'chatgpt', s, e: 144, ink: '#EDEDF2', hud: 1,
    draw(c, lt, d, t) {
      bg(c, '#0D0D10');
      const fade = 1 - prog(lt, 2.0, 2.6);
      if (fade > 0) {
        c.save(); c.globalAlpha = fade;
        const ub = E.outBack(prog(lt, 0.2, 0.5)), uw = tw('你好', { size: 52, weight: 500 }) + 72;
        c.save(); c.translate(990 - uw / 2, 760); c.scale(ub, ub); c.fillStyle = '#2A2A31'; rr(c, -uw / 2, -52, uw, 104, 40); c.fill(); txt(c, '你好', 0, 18, { size: 52, weight: 500, color: '#fff', align: 'center', mode: 'none' }); c.restore();
        let x = 90; for (const [tok, tt] of RT) { const p = prog(lt, tt, tt + 0.12), w = tw(tok, { size: 52, weight: 500 }); if (p > 0) txt(c, tok, x, 920, { size: 52, weight: 500, color: '#fff', mode: 'none', alpha: p }); x += w; }
        c.restore();
      }
      const z = lerp(1, 0.78, E.inOutCubic(prog(lt, 2.4, 5.4)));
      c.save(); c.translate(540, 1200); c.scale(z, z); c.translate(-540, -1200);
      for (const b of BUB) {
        const p = prog(lt, b.tt, b.tt + 0.2); if (p <= 0) continue;
        const sc = E.outBack(p), o = { size: b.size, weight: 700, fam: /[가-힣]/.test(b.txt) ? F.kr : F.sans }, w = tw(b.txt, o) + b.size * 1.2, hh = b.size * 1.9;
        const amber = b.col > 0.86, light = b.col > 0.72 && !amber;
        c.save(); c.translate(b.x, b.y); c.scale(sc, sc);
        c.fillStyle = amber ? AMBER : light ? '#ECECF1' : ['#23232A', '#2B2B34', '#32323C'][Math.floor(b.col * 3) % 3]; rr(c, -w / 2, -hh / 2, w, hh, hh * 0.42); c.fill();
        txt(c, b.txt, 0, b.size * 0.36, Object.assign({}, o, { color: amber || light ? '#141418' : '#F0F0F4', align: 'center', mode: 'none' }));
        c.restore();
      }
      c.restore();
      const n = lt < 1.8 ? 0 : Math.pow(10, 8 * E.inCubic(prog(lt, 1.8, 5.3)));
      c.fillStyle = 'rgba(13,13,16,0.85)'; c.fillRect(0, 190, W, 330);
      lin(c, lt, 0.0, '2022.11.30', 80, 330, { size: 110, fam: F.wide, weight: 900, color: '#fff', spread: 0.3 });
      lin(c, lt, 0.2, 'ChatGPT 上线', 88, 410, { size: 48, weight: 900, color: '#A8A8B3' });
      if (lt > 1.8) {
        const day = Math.floor(62 * E.inCubic(prog(lt, 1.8, 5.3))), dt = new Date(Date.UTC(2022, 10, 30 + day));
        txt(c, fmtInt(n) + ' 用户', 88, 490, { size: 48, fam: F.wide, weight: 700, color: AMBER, mode: 'none' });
        txt(c, `${dt.getUTCFullYear()}.${String(dt.getUTCMonth() + 1).padStart(2, '0')}.${String(dt.getUTCDate()).padStart(2, '0')}`, 990, 490, { size: 34, fam: F.wide, weight: 400, color: '#A8A8B3', align: 'right', mode: 'none' });
      }
      const pb = E.outCubic(prog(lt, 5.55, 5.8));
      if (pb > 0) { c.fillStyle = `rgba(13,13,16,${0.8 * pb})`; c.fillRect(0, 760, W, 560); }
      lin(c, lt, 5.6, '两个月，', 540, 940, { size: 130, weight: 900, color: '#fff', align: 'center', mode: 'slam', dur: 0.3 });
      lin(c, lt, 5.8, '一亿用户。', 540, 1100, { size: 130, weight: 900, color: AMBER, align: 'center', mode: 'slam', dur: 0.3 });
      lin(c, lt, 6.4, '全世界，开始和机器说话。', 540, 1240, { size: 52, weight: 700, color: '#D0D0D8', align: 'center' });
    },
    post(c, lt, d, t) { grain(c, t, 0.035); vignette(c, 0.3); },
  });
})();

/* ---------- S22 · 2024 Nobel prizes (144–150) ---------- */
function medal(c, x, y, r, spin, shine) {
  const sx = Math.max(0.02, Math.abs(Math.cos(spin)));
  c.save(); c.translate(x, y); c.scale(sx, 1);
  glow(c, 0, 0, r * 2.1, '#E7C66B', 0.25);
  const g = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r); g.addColorStop(0, '#FFF0B3'); g.addColorStop(0.55, '#E2B64E'); g.addColorStop(1, '#8F6420');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
  c.strokeStyle = '#7A5418'; c.lineWidth = r * 0.05; c.beginPath(); c.arc(0, 0, r * 0.86, 0, TAU); c.stroke();
  c.fillStyle = 'rgba(122,84,24,0.55)'; c.beginPath(); c.arc(r * 0.04, -r * 0.12, r * 0.3, 0, TAU); c.fill(); c.beginPath(); c.ellipse(r * 0.04, r * 0.38, r * 0.42, r * 0.24, 0, Math.PI, TAU); c.fill();
  txt(c, 'MMXXIV', 0, r * 0.7, { size: r * 0.14, fam: F.bodoni, weight: 700, color: '#6B4812', align: 'center', mode: 'none', ls: r * 0.03 });
  if (shine > 0 && shine < 1) { c.save(); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.clip(); c.globalCompositeOperation = 'lighter'; const sx2 = lerp(-r * 1.6, r * 1.6, shine); const sg = c.createLinearGradient(sx2 - r * 0.3, 0, sx2 + r * 0.3, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,250,220,0.8)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = sg; c.fillRect(-r, -r, 2 * r, 2 * r); c.restore(); }
  c.restore();
}
function chip(c, x, y, str, p, col = AMBER) {
  if (p <= 0) return; const o = { size: 30, weight: 700 }, w = tw(str, o) + 40;
  c.save(); c.globalAlpha = clamp(p * 2); c.translate(x, y); c.scale(E.outBack(p), E.outBack(p)); c.strokeStyle = col; c.lineWidth = 2.5; rr(c, 0, -34, w, 50, 25); c.stroke(); txt(c, str, 20, 2, Object.assign({}, o, { color: col, mode: 'none' })); c.restore();
}
(() => {
  const s = 144;
  yseg(144, 144.4, 2022, 2024);
  cue(s + 0.25, 'bell'); cue(s + 1.05, 'bell', { v: 0.8, p: 1 }); cue(s + 0.9, 'blip', { p: 5 }); cue(s + 1.9, 'blip', { p: 6 });
  scene({
    id: 'nobel', s, e: 150, ink: '#F2E6C4', hud: 1,
    draw(c, lt) {
      bg(c, '#0B0906');
      const GOLD = '#E7C66B';
      const m1 = prog(lt, 0.15, 0.9), m2 = prog(lt, 0.95, 1.7);
      if (m1 > 0) medal(c, 230, 760, 150 * E.outBack(clamp(m1 * 2)), (1 - E.outCubic(m1)) * Math.PI * 3, prog(lt, 0.9, 1.6));
      if (m2 > 0) medal(c, 230, 1230, 150 * E.outBack(clamp(m2 * 2)), (1 - E.outCubic(m2)) * Math.PI * 3, prog(lt, 1.7, 2.4));
      lin(c, lt, 0.3, '物理学奖', 420, 690, { size: 40, weight: 700, color: GOLD, ls: 6 });
      lin(c, lt, 0.45, '霍普菲尔德 · 辛顿', 420, 770, { size: 58, weight: 900, color: '#fff' });
      chip(c, 420, 860, '↩ 1986 · 反向传播', prog(lt, 0.9, 1.2));
      lin(c, lt, 1.1, '化学奖', 420, 1150, { size: 40, weight: 700, color: GOLD, ls: 6 });
      lin(c, lt, 1.25, '哈萨比斯 · 江珀', 420, 1230, { size: 58, weight: 900, color: '#fff' });
      lin(c, lt, 1.45, 'AlphaFold · 与大卫·贝克共同获奖', 420, 1285, { size: 28, weight: 500, color: '#A89A7A' });
      chip(c, 420, 1370, '↩ 2016 · AlphaGo 团队', prog(lt, 1.9, 2.2));
      lin(c, lt, 0.0, '2024', 80, 360, { size: 180, fam: F.wide, weight: 900, color: GOLD, spread: 0.3 });
      lin(c, lt, 0.2, '诺贝尔奖', 88, 450, { size: 60, fam: F.serif, weight: 900, color: '#F2E6C4', ls: 8 });
      lin(c, lt, 2.7, '38 年前写反向传播的人，', 88, 1620, { size: 64, weight: 900, color: '#fff' });
      lin(c, lt, 3.1, '站上了领奖台。', 88, 1720, { size: 64, weight: 900, color: GOLD });
    },
    post(c, lt, d, t) { grain(c, t, 0.05); vignette(c, 0.45); },
  });
})();

/* ---------- S23 · 2025–2026 agents: then, today (150–156) ---------- */
const AGENT_LINES = ['● Read src/pay/checkout.ts', '  const total = items.reduce((s, i) => s + i.price * i.qty, 0);', '● Edit src/pay/checkout.ts  (+42 −17)', '● Bash npm test', '✓ 128 passed · 0 failed', '● Grep "TODO" --type ts', '  if (!user.verified) return redirect("/verify");', '● Write tests/round.test.ts', '● Browser open localhost:3000/cart', '✓ 截图比对通过，无回归', '● git commit -m "fix: 金额四舍五入"', '  export async function sync(db, since) {', '● Bash python bench.py', '✓ p95 延迟 212ms → 48ms', '● Read docs/zh/README.md', '● Edit 翻译 37 处术语', '  for (const f of files) await lint(f);', '✓ 构建成功 · 用时 41s'];
const AGENT_TASKS = ['修复结算 bug', '写单元测试', '重构登录', '翻译文档', '优化慢查询', '升级依赖', '审查 PR #412', '画数据看板', '清理日志', '补全类型', '迁移数据库', '写发布说明', '压测接口', '修复无障碍', '整理 issue', '生成周报'];
(() => {
  const s = 150, PH = [[0, 1], [1.0, 2], [1.8, 4], [2.5, 8], [3.2, 16]];
  yseg(150, 150.4, 2024, 2025); yseg(154.0, 154.25, 2025, 2026);
  PH.forEach(([x], k) => cue(s + x, 'blip', { p: 3 + k, v: 0.6 }));
  cue(s + 3.75, 'whoosh', { rev: 1 }); cue(s + 4.0, 'impact'); kick(s + 4.0, 26, 5); flash(s + 4.0, '#fff', 0.12, 0.8);
  function rects(n) {
    const X = 60, Y = 560, Wd = 960, Hd = 1200, g = 12, cols = n <= 2 ? 1 : n <= 8 ? 2 : 4, rows = Math.ceil(n / cols);
    return Array.from({ length: 16 }, (_, i) => { const k = Math.min(i, n - 1), cx = k % cols, cy = Math.floor(k / cols); return [X + cx * (Wd + g) / cols, Y + cy * (Hd + g) / rows, (Wd + g) / cols - g, (Hd + g) / rows - g, i < n]; });
  }
  scene({
    id: 'agents', s, e: 156, ink: '#E6E8EE', hud: 1,
    draw(c, lt, d, t) {
      bg(c, '#0B0C10');
      let ph = 0; while (ph < PH.length - 1 && lt >= PH[ph + 1][0]) ph++;
      const k = E.outExpo(prog(lt, PH[ph][0], PH[ph][0] + 0.25)), A = rects(PH[Math.max(0, ph - 1)][1]), B = rects(PH[ph][1]);
      const col = E.inExpo(prog(lt, 3.75, 4.0));
      if (lt < 4.0) {
        c.save(); c.translate(540, 1160); c.scale(1 - col, 1 - col); c.translate(-540, -1160);
        for (let i = 0; i < 16; i++) {
          const [x, y, w, h, on] = B[i], [ax, ay, aw, ah, aon] = A[i];
          if (!on) continue;
          const wx = aon ? lerp(ax, x, k) : x, wy = aon ? lerp(ay, y, k) : y, ww = aon ? lerp(aw, w, k) : w * k, wh = aon ? lerp(ah, h, k) : h * k;
          if (ww < 4 || wh < 4) continue;
          c.fillStyle = '#12141A'; rr(c, wx, wy, ww, wh, 10); c.fill(); c.strokeStyle = '#262A35'; c.lineWidth = 2; c.stroke();
          const ch = Math.min(40, wh * 0.14); c.fillStyle = '#1A1D25'; rr(c, wx, wy, ww, ch, [10, 10, 0, 0]); c.fill();
          for (let dd = 0; dd < 3; dd++) { c.fillStyle = ['#FF5F57', '#FEBC2E', '#28C840'][dd]; c.beginPath(); c.arc(wx + ch * 0.5 + dd * ch * 0.55, wy + ch / 2, ch * 0.16, 0, TAU); c.fill(); }
          const fs = Math.max(9, Math.min(26, ww / 36));
          txt(c, `agent-${String(i + 1).padStart(2, '0')} · ${AGENT_TASKS[i]}`, wx + ch * 2.2, wy + ch * 0.68, { size: fs * 0.95, fam: F.code, weight: 700, color: '#9AA0AE', mode: 'none' });
          c.save(); c.beginPath(); c.rect(wx + 8, wy + ch + 6, ww - 16, wh - ch - 12); c.clip();
          const born = PH.find(p => p[1] > i)[0], nLines = Math.floor((lt - born) * (9 + (i % 5) * 3)), lh = fs * 1.5, maxL = Math.floor((wh - ch - 12) / lh);
          for (let j = Math.max(0, nLines - maxL); j < nLines; j++) {
            const line = AGENT_LINES[(j * 7 + i * 5) % AGENT_LINES.length], row = j - Math.max(0, nLines - maxL);
            const colr = line[0] === '✓' ? '#7CF2A6' : line[0] === '●' ? AMBER : '#C9CDD8';
            txt(c, line, wx + 16, wy + ch + 6 + lh * (row + 1) - fs * 0.3, { size: fs, fam: F.code, color: colr, mode: 'none' });
          }
          c.restore();
        }
        c.restore();
        lin(c, lt, 0.0, '2025', 80, 340, { size: 180, fam: F.wide, weight: 900, color: '#fff', spread: 0.3, t1: 3.7 });
        lin(c, lt, 0.2, '智能体', 88, 425, { size: 58, weight: 900, color: AMBER, t1: 3.7 });
        lin(c, lt, 0.4, '自己写代码、调用工具、操作电脑。', 88, 495, { size: 40, weight: 500, color: '#B9BCC8', t1: 3.7 });
        if (col > 0) { c.fillStyle = AMBER; c.fillRect(540 - 20, 1100 - 40, 40, 80); }
        return;
      }
      const u = lt - 4.0;
      txt(c, '2026', 540, 1100, { size: 236, fam: F.wide, weight: 900, color: '#fff', align: 'center', mode: 'slam', p: prog(u, 0, 0.25), spread: 0.2 });
      lin(c, u, 0.15, '今天', 540, 1300, { size: 120, weight: 900, color: AMBER, align: 'center', mode: 'pop', dur: 0.3 });
    },
    post(c, lt, d, t, buf) { const g = prog(lt, 4.0, 4.4); if (g > 0 && g < 1) { fxChroma(buf, 16 * (1 - g)); resetCtx(c); } grain(c, t, 0.035); vignette(c, 0.35); },
  });
})();

/* ---------- S24 · the reveal (156–164) ---------- */
let SRC_LINES = null;
function srcLines() { if (!SRC_LINES) SRC_LINES = SCENES.map(sc => sc.draw.toString()).join('\n').split('\n').map(l => l.trim()).filter(l => l.length > 4).map(l => l.length > 90 ? l.slice(0, 90) : l); return SRC_LINES; }
function codeBg(c, t, a) {
  const L = srcLines(), lh = 30, off = t * 38;
  c.save(); c.globalAlpha = a; fnt(c, { size: 20, fam: F.code }); c.fillStyle = '#FFFFFF'; c.textAlign = 'left';
  const i0 = Math.floor(off / lh);
  for (let k = 0; k < H / lh + 2; k++) { const i = i0 + k; c.fillText(L[i % L.length], 40, k * lh - (off % lh) + 20); }
  c.restore();
}
function stream(c, lt, toks, x, y, o, seedT) {
  let xx = x, last = null;
  for (const [tok, tt] of toks) { const p = prog(lt, tt, tt + 0.12), w = tw(tok, o); if (p > 0) { txt(c, tok, xx, y, Object.assign({}, o, { mode: 'none', alpha: p, color: o.pick ? o.pick(tok) : o.color })); last = xx + w; } xx += w; }
  return last;
}
(() => {
  const s = 156;
  const T1 = [['对了。', 0.7]];
  const T2 = [['这支', 1.6], ['片子的', 1.72], ['分镜、', 1.88]];
  const T3 = [['每一帧的', 2.3], ['代码、', 2.48], ['配乐，', 2.64]];
  const T4 = [['都是', 3.3], ['我', 3.45], ['写的。', 3.58]];
  const T5 = [['包括你', 4.6], ['正在读的', 4.72], ['这一行。', 4.88]];
  [T1, T2, T3, T4, T5].forEach(T => T.forEach(([, x]) => cue(s + x, 'key', { soft: 1 })));
  scene({
    id: 'reveal', s, e: 164, hud: null,
    draw(c, lt, d, t) {
      bg(c, '#050507');
      codeBg(c, t, lerp(0.035, 0.09, prog(lt, 3.3, 5.0)));
      const o = { size: 66, weight: 500, color: '#F2F2F4' };
      const ends = [stream(c, lt, T1, 90, 760, o), stream(c, lt, T2, 90, 900, o), stream(c, lt, T3, 90, 1000, o),
        stream(c, lt, T4, 90, 1140, { size: 88, weight: 900, color: '#fff', pick: tk => tk === '我' ? AMBER : '#fff' }), stream(c, lt, T5, 90, 1250, { size: 40, weight: 400, color: '#80838C' })];
      let li = -1; ends.forEach((e, i) => { if (e) li = i; });
      const ys = [760, 900, 1000, 1140, 1250], hs = [66, 66, 66, 88, 40];
      if (li >= 0 && (Math.floor(lt * 2.4) % 2 === 0 || lt < 5)) { c.fillStyle = AMBER; c.fillRect(ends[li] + 10, ys[li] - hs[li] * 0.82, hs[li] * 0.42, hs[li] * 0.98); }
      if (li < 0 && Math.floor(lt * 2.4) % 2 === 0) { c.fillStyle = AMBER; c.fillRect(90, 760 - 54, 28, 64); }
    },
    post(c, lt, d, t) { grain(c, t, 0.03); },
  });
})();

/* ---------- S25 · your prompt, and the next question (164–176) ---------- */
(() => {
  const s = 164;
  cue(s + 0.25, 'send');
  const R1 = [['你给了', 1.6], ['我', 1.75], ['一句话。', 1.85]], R2 = [['我还你', 2.7], ['126', 2.9], ['年。', 3.05]];
  [...R1, ...R2].forEach(([, x]) => cue(s + x, 'key', { soft: 1 }));
  cue(s + 5.2, 'swell', { dur: 1.2 }); cue(s + 6.6, 'ding', { soft: 1 });
  const PROMPT = ['讲述【人工智能】从【1900】', '一直发展到今天的历史。', '给我一些意料之外的设计。'];
  scene({
    id: 'finale', s, e: 176, tin: 0.4, trans: 'fade', hud: null,
    draw(c, lt, d, t) {
      bg(c, '#050507');
      const fadeAll = 1 - E.inOutCubic(prog(lt, 4.3, 5.0));
      codeBg(c, t, 0.05 * fadeAll);
      if (fadeAll > 0) {
        c.save(); c.globalAlpha = fadeAll;
        const bp = E.outExpo(prog(lt, 0.2, 0.6)), o = { size: 44, weight: 500 }, bw = Math.max(...PROMPT.map(l => tw(l, o))) + 72, bh = PROMPT.length * 66 + 50;
        txt(c, '你', 990, 540, { size: 30, weight: 500, color: '#80838C', align: 'right', p: bp, mode: 'fade' });
        c.save(); c.translate(lerp(400, 0, bp), 0); c.globalAlpha *= clamp(bp * 2);
        c.fillStyle = '#1E1F25'; rr(c, 990 - bw, 570, bw, bh, 36); c.fill(); c.strokeStyle = '#2E3038'; c.lineWidth = 2; c.stroke();
        PROMPT.forEach((l, i) => txt(c, l, 990 - bw + 36, 570 + 70 + i * 66, Object.assign({}, o, { color: '#ECECF1', mode: 'none' })));
        c.restore();
        const o1 = { size: 66, weight: 500, color: '#F2F2F4' };
        const e1 = stream(c, lt, R1, 90, 1080, o1), e2 = stream(c, lt, R2, 90, 1200, { size: 88, weight: 900, color: '#fff', pick: tk => tk === '126' ? AMBER : '#fff' });
        if (e1 || e2) { const on = Math.floor(lt * 2.4) % 2 === 0 || lt < 3.3; if (on) { c.fillStyle = AMBER; if (e2) c.fillRect(e2 + 10, 1200 - 72, 36, 86); else c.fillRect(e1 + 10, 1080 - 54, 28, 64); } }
        c.restore();
      }
      const qa = E.outCubic(prog(lt, 5.2, 6.2)), morph = E.inOutCubic(prog(lt, 6.5, 7.1));
      if (qa > 0) {
        c.save(); c.translate(540, 1150); const sc = lerp(0.9, 1, qa) * (1 - morph * 0.9); c.scale(sc, sc); question(c, 0, 0, 720, qa * (1 - morph)); c.restore();
        if (morph > 0) { const blink = lt < 7.3 || Math.floor(lt * 2) % 2 === 0; if (blink) { c.fillStyle = AMBER; const cw2 = lerp(8, 44, morph), chh = lerp(20, 100, morph); c.globalAlpha = morph; c.fillRect(540 - cw2 / 2, 1100 - chh / 2, cw2, chh); glow(c, 540, 1100, 140, AMBER, 0.3 * morph); c.globalAlpha = 1; } }
      }
      lin(c, lt, 7.1, '下一个问题，', 540, 1380, { size: 88, weight: 900, color: '#F2F2F4', align: 'center' });
      lin(c, lt, 7.5, '由你来问。', 540, 1500, { size: 88, weight: 900, color: '#F2F2F4', align: 'center' });
      lin(c, lt, 8.6, '一个问题的一百二十六年', 540, 1700, { size: 40, fam: F.serif, weight: 900, color: '#CFC6B8', align: 'center', ls: 6, mode: 'fade', dur: 0.8 });
      lin(c, lt, 8.9, '人工智能简史 · 1900—2026', 540, 1756, { size: 28, weight: 500, color: '#80838C', align: 'center', ls: 4, mode: 'fade', dur: 0.8 });
      lin(c, lt, 9.2, '分镜 · 代码 · 配乐 —— Claude', 540, 1808, { size: 26, weight: 500, color: '#62656E', align: 'center', ls: 3, mode: 'fade', dur: 0.8 });
      const end = prog(lt, 11.4, 12);
      if (end > 0) { c.fillStyle = `rgba(0,0,0,${end})`; c.fillRect(0, 0, W, H); }
    },
    post(c, lt, d, t) { grain(c, t, 0.03); },
  });
})();
