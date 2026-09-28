/* ============================================================
   序 + 第一章 · 梦 (0 – 44s)
   ============================================================ */

/* ---------- S0 · cold open: a question, then rewind (0–8) ---------- */
(() => {
  const s = 0;
  const L1 = [['我', 0.45], ['从', 0.62], ['哪里', 0.8], ['来', 1.02], ['？', 1.2]];
  const L2 = [['让我', 1.7], ['倒回去', 1.9], ['看看。', 2.15]];
  L1.forEach(([, t]) => cue(s + t, 'key'));
  L2.forEach(([, t]) => cue(s + t, 'key', { soft: 1 }));
  cue(2.9, 'rewind', { dur: 5.1 });
  cue(8.0, 'clack');
  yseg(2.9, 8.0, 2026, 1900, 'inOutCubic');

  const GL = [
    [2022, (c, a) => { c.strokeStyle = hexA('#FFFFFF', a); c.lineWidth = 10; rr(c, 240, 640, 600, 330, 60); c.stroke(); txt(c, '你好', 540, 850, { size: 150, weight: 900, color: '#fff', align: 'center', alpha: a, mode: 'none' }); }],
    [2016, (c, a) => { for (let i = 0; i < 9; i++) { const x = 300 + (i % 3) * 240, y = 560 + Math.floor(i / 3) * 240; const g = c.createRadialGradient(x - 30, y - 30, 10, x, y, 110); const b = (i * 7) % 3 === 0; g.addColorStop(0, b ? '#555' : '#fff'); g.addColorStop(1, b ? '#050505' : '#bbb'); c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.arc(x, y, 105, 0, TAU); c.fill(); } c.globalAlpha = 1; }],
    [2012, (c, a) => { c.globalAlpha = a; c.fillStyle = '#888'; c.fillRect(260, 380, 220, 900); c.fillStyle = AMBER; c.fillRect(600, 760, 220, 520); c.globalAlpha = 1; }],
    [1997, (c, a) => txt(c, '♚', 540, 1150, { size: 700, fam: F.sym, color: '#fff', align: 'center', alpha: a, mode: 'none' })],
    [1986, (c, a) => { c.globalAlpha = a; c.strokeStyle = '#5CE1FF'; c.lineWidth = 5; const P = [[300, 500], [540, 500], [780, 500], [400, 900], [680, 900], [540, 1300]]; for (const [i, j] of [[0, 3], [1, 3], [1, 4], [2, 4], [3, 5], [4, 5], [0, 4], [2, 3]]) { c.beginPath(); c.moveTo(...P[i]); c.lineTo(...P[j]); c.stroke(); } c.fillStyle = '#fff'; for (const p of P) { c.beginPath(); c.arc(p[0], p[1], 40, 0, TAU); c.fill(); } c.globalAlpha = 1; }],
    [1974, (c, a) => { c.globalAlpha = a; c.strokeStyle = '#DDEEFF'; c.lineWidth = 16; c.lineCap = 'round'; for (let k = 0; k < 6; k++) { const an = k * Math.PI / 3; c.beginPath(); c.moveTo(540, 900); c.lineTo(540 + Math.cos(an) * 420, 900 + Math.sin(an) * 420); c.stroke(); for (const d of [200, 300]) { const bx = 540 + Math.cos(an) * d, by = 900 + Math.sin(an) * d; for (const s2 of [-1, 1]) { c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + Math.cos(an + s2 * 0.8) * 100, by + Math.sin(an + s2 * 0.8) * 100); c.stroke(); } } } c.globalAlpha = 1; }],
    [1966, (c, a) => txt(c, 'IN WHAT WAY?', 540, 960, { size: 170, fam: F.crt, color: '#41FF7A', align: 'center', alpha: a, mode: 'none', glow: 30 })],
    [1958, (c, a) => { c.globalAlpha = a; for (let i = 0; i < 100; i++) { const on = h2(i, 5) > 0.55; c.fillStyle = on ? AMBER : '#3a2a10'; c.beginPath(); c.arc(270 + (i % 10) * 60, 630 + Math.floor(i / 10) * 60, 20, 0, TAU); c.fill(); } c.globalAlpha = 1; }],
    [1956, (c, a) => { c.globalAlpha = a; c.fillStyle = '#EE4B2B'; c.beginPath(); c.arc(540, 900, 380, 0, TAU); c.fill(); c.globalAlpha = 1; }],
    [1950, (c, a) => question(c, 540, 1250, 900, a)],
    [1946, (c, a) => { glow(c, 540, 900, 520, AMBER, a); c.globalAlpha = a; c.strokeStyle = '#EADFC6'; c.lineWidth = 8; rr(c, 400, 560, 280, 620, 140); c.stroke(); c.globalAlpha = 1; }],
    [1936, (c, a) => { for (let i = 0; i < 7; i++) { c.globalAlpha = a; c.strokeStyle = '#9CC9F0'; c.lineWidth = 6; c.strokeRect(420, 300 + i * 190, 240, 190); txt(c, '0110101'[i], 540, 440 + i * 190, { size: 130, fam: F.mono, color: '#fff', align: 'center', alpha: a, mode: 'none' }); } c.globalAlpha = 1; }],
    [1920, (c, a) => txt(c, 'ROBOT', 540, 1050, { size: 380, fam: F.anton, color: '#C8231B', align: 'center', alpha: a, mode: 'none' })],
    [1914, (c, a) => txt(c, '♞', 540, 1180, { size: 760, fam: F.sym, color: '#EADFC6', align: 'center', alpha: a, mode: 'none' })],
  ];
  // one blip per glimpse, at the moment the counter passes its year
  for (const [gy] of GL) { for (let t = 2.9; t < 8; t += 0.005) if (yearAt(t) <= gy + 0.5) { cue(t, 'blip'); break; } }

  function famFor(y) { return y >= 2017 ? [F.wide, 900] : y >= 1990 ? [F.swiss, 900] : y >= 1974 ? [F.pixel, 700] : y >= 1950 ? [F.crt, 400] : y >= 1936 ? [F.mono, 600] : [F.bodoni, 900]; }

  scene({
    id: 'open', s, e: 8, hud: null,
    draw(c, lt, d, t) {
      bg(c, '#050507');
      if (lt < 2.9) {
        // modern chat: token stream
        const full = L1.map(x => x[0]).join(''), o = { size: 104, weight: 700, fam: F.sans };
        const wAll = tw(full, o); let x = 540 - wAll / 2, lastX = x;
        for (const [tok, tt] of L1) {
          const p = prog(lt, tt, tt + 0.16), w = tw(tok, o);
          if (p > 0) { txt(c, tok, x, 930, Object.assign({}, o, { color: '#F2F2F4', mode: 'none', alpha: E.outCubic(p) })); lastX = x + w; }
          x += w;
        }
        const o2 = { size: 46, weight: 400, fam: F.sans };
        const full2 = L2.map(x => x[0]).join(''); let x2 = 540 - tw(full2, o2) / 2, last2 = null;
        for (const [tok, tt] of L2) { const p = prog(lt, tt, tt + 0.16), w = tw(tok, o2); if (p > 0) { txt(c, tok, x2, 1030, Object.assign({}, o2, { color: '#8C9099', mode: 'none', alpha: E.outCubic(p) })); last2 = x2 + w; } x2 += w; }
        const streaming = lt < 2.3, blink = streaming || Math.floor(lt * 2.4) % 2 === 0;
        if (blink && lt > 0.1) { c.fillStyle = AMBER; if (last2) c.fillRect(last2 + 8, 992, 22, 48); else c.fillRect(lastX + 12, 846, 40, 100); }
      } else {
        const yr = yearAt(t), spd = Math.abs(yearAt(t - 0.03) - yr) / 0.03;
        for (const [gy, fn] of GL) { const dd = Math.abs(yr - gy), win = 1.4 + spd * 0.02; if (dd < win) { c.save(); fn(c, 0.95 * Math.pow(1 - dd / win, 0.6)); c.restore(); } }
        c.fillStyle = 'rgba(5,5,7,0.22)'; c.fillRect(0, 0, W, H);
        const [fam, wt] = famFor(yr), str = String(Math.round(yr)), sz = 300;
        const blurN = Math.min(5, Math.floor(spd / 8));
        for (let j = -blurN; j <= blurN; j++) if (j) txt(c, str, 540, 1060 + j * Math.min(60, spd * 0.9) / Math.max(1, blurN), { size: sz, fam, weight: wt, color: '#fff', align: 'center', alpha: 0.13, mode: 'none' });
        txt(c, str, 540, 1060, { size: sz, fam, weight: wt, color: '#fff', align: 'center', mode: 'none' });
        // VHS OSD
        if (Math.floor(lt * 2.5) % 2 === 0) {
          c.fillStyle = '#fff';
          for (const ox of [0, 44]) { c.beginPath(); c.moveTo(130 + ox, 176); c.lineTo(90 + ox, 200); c.lineTo(130 + ox, 224); c.closePath(); c.fill(); }
        }
        txt(c, 'REW', 200, 224, { size: 84, fam: F.crt, color: '#fff', mode: 'none' });
        const tc = Math.max(0, (yr - 1900) / 126 * 5423);
        txt(c, 'SP  -' + String(Math.floor(tc / 3600)).padStart(2, '0') + ':' + String(Math.floor(tc / 60) % 60).padStart(2, '0') + ':' + String(Math.floor(tc) % 60).padStart(2, '0'), 90, 1800, { size: 64, fam: F.crt, color: '#fff', mode: 'none', alpha: 0.85 });
      }
    },
    post(c, lt, d, t, buf) {
      if (lt < 2.9) {
        const g = prog(lt, 2.45, 2.9);
        if (g > 0) { fxSlices(buf, t, Math.floor(4 + g * 10), 30 + g * 90); fxChroma(buf, 3 + g * 10); }
        return;
      }
      const yr = yearAt(t), spd = Math.abs(yearAt(t - 0.03) - yr) / 0.03, sn = clamp(spd / 60);
      fxSlices(buf, t, 6 + Math.floor(sn * 12), 18 + sn * 70, 7);
      fxChroma(buf, 4 + sn * 12);
      resetCtx(c);
      // tracking-noise bands
      for (let k = 0; k < 2; k++) {
        const by = ((lt * (700 + k * 380) + k * 900) % (H + 300)) - 150, bh = 40 + k * 50;
        c.save(); c.beginPath(); c.rect(0, by, W, bh); c.clip(); grain(c, t + k, 0.55, 1, 'screen'); c.restore();
      }
      scanlines(c, 0.35); vignette(c, 0.5);
    },
  });
})();

/* ---------- title card: silent-film intertitle (8–12) ---------- */
function ornate(c, x, y, w, h, col, p = 1) {
  c.save(); c.strokeStyle = col; c.fillStyle = col; c.globalAlpha *= p;
  c.lineWidth = 3; c.strokeRect(x, y, w, h); c.lineWidth = 1.5; c.strokeRect(x + 16, y + 16, w - 32, h - 32);
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    c.save(); c.translate(cx, cy); c.scale(sx, sy); c.lineWidth = 2;
    c.beginPath(); c.arc(16, 16, 64, 0, Math.PI / 2); c.stroke();
    c.beginPath(); c.moveTo(16, 118); c.bezierCurveTo(60, 110, 44, 60, 70, 46); c.bezierCurveTo(90, 34, 110, 58, 118, 16); c.stroke();
    c.beginPath(); c.arc(40, 40, 9, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(16, 150); c.lineTo(26, 162); c.lineTo(16, 174); c.lineTo(6, 162); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(150, 16); c.lineTo(162, 26); c.lineTo(174, 16); c.lineTo(162, 6); c.closePath(); c.fill();
    c.restore();
  }
  for (const yy of [y, y + h]) {
    c.beginPath(); c.moveTo(x + w / 2, yy - 16); c.lineTo(x + w / 2 + 16, yy); c.lineTo(x + w / 2, yy + 16); c.lineTo(x + w / 2 - 16, yy); c.closePath(); c.fill();
  }
  c.restore();
}
function rule(c, x, y, w, col, a = 1) {
  c.save(); c.globalAlpha *= a; c.fillStyle = col; c.fillRect(x - w / 2, y - 1, w / 2 - 22, 2); c.fillRect(x + 22, y - 1, w / 2 - 22, 2);
  c.beginPath(); c.moveTo(x, y - 10); c.lineTo(x + 10, y); c.lineTo(x, y + 10); c.lineTo(x - 10, y); c.closePath(); c.fill(); c.restore();
}
function iris(c, r) { c.save(); c.fillStyle = '#000'; c.beginPath(); c.rect(-100, -100, W + 200, H + 200); c.arc(W / 2, H / 2, Math.max(0.1, r), 0, TAU, true); c.fill('evenodd'); c.restore(); }

scene({
  id: 'title', s: 8, e: 12, weave: true, hud: null,
  draw(c, lt) {
    bg(c, '#0D0A07');
    const INK = '#E6DAC0';
    ornate(c, 100, 250, W - 200, H - 500, INK, E.outCubic(prog(lt, 0.2, 0.9)));
    lin(c, lt, 0.5, '一个问题的', 540, 800, { size: 70, fam: F.serif, weight: 400, color: INK, align: 'center', ls: 16, mode: 'fade' });
    lin(c, lt, 0.85, '一百二十六年', 540, 990, { size: 136, fam: F.serif, weight: 900, color: '#F1E7D0', align: 'center', ls: 6, mode: 'fade', spread: 0.7, dur: 0.9 });
    if (lt > 1.4) rule(c, 540, 1090, 560, INK, E.outCubic(prog(lt, 1.4, 1.9)));
    lin(c, lt, 1.6, '人工智能简史  ·  1900 — 2026', 540, 1190, { size: 40, fam: F.serif, color: INK, align: 'center', ls: 5, mode: 'fade' });
    lin(c, lt, 1.9, 'A HISTORY OF ARTIFICIAL INTELLIGENCE', 540, 1262, { size: 26, fam: F.bodoni, color: '#A8987A', align: 'center', ls: 7, mode: 'fade' });
  },
  post(c, lt, d, t) {
    filmFX(c, t, 1);
    if (lt < 1.0) iris(c, E.outCubic(lt / 1.0) * 1150);
    if (lt > 3.45) iris(c, (1 - E.inCubic(prog(lt, 3.45, 4.0))) * 1150);
  },
});

/* ---------- S1 · 1900 Hilbert (12–18) ---------- */
const SEP = { bg: '#15110C', ink: '#EADFC6', dim: '#8F8068', sub: '#BFAE8C', hi: '#E7C27F' };
const ACT_DREAM = { ch: '梦', num: '第 一 章', en: 'I · The Dream', years: '1900 — 1949', bg: SEP.bg, fg: SEP.ink, sub: SEP.sub, seed: 3 };
(() => {
  const s = 12; cue(s, 'act', { n: 1 });
  for (let i = 0; i < 23; i++) cue(s + 1.5 + 0.2 + i * 0.05, 'tick', { v: 0.35 });
  cue(s + 1.5 + 1.7, 'chime');
  scene({
    id: 'hilbert', s, e: 18, weave: true, ink: SEP.ink, hud: lt => lt > 1.5 ? 1 : 0,
    draw(c, lt) {
      if (lt < 1.5) return actCard(c, lt, ACT_DREAM);
      const u = lt - 1.5; bg(c, SEP.bg);
      lin(c, u, 0.0, '1900', 96, 400, { size: 230, fam: F.bodoni, weight: 900, color: SEP.ink, spread: 0.3 });
      lin(c, u, 0.2, '巴黎 · 国际数学家大会', 104, 478, { size: 40, fam: F.serif, color: SEP.sub, ls: 4 });
      const hi = prog(u, 1.7, 2.2);
      for (let i = 0; i < 23; i++) {
        const col = i % 4, row = Math.floor(i / 4), x = 140 + col * 200, y = 560 + row * 118;
        const p = prog(u, 0.2 + i * 0.05, 0.5 + i * 0.05); if (p <= 0) continue;
        const is10 = i === 9, a = (is10 ? 1 : lerp(1, 0.2, hi)) * E.outCubic(p);
        c.globalAlpha = a; c.strokeStyle = '#5E5140'; c.lineWidth = 1.5; c.strokeRect(x + 10, y + 8, 180, 102);
        txt(c, String(i + 1), x + 100, y + 86 + (1 - E.outExpo(p)) * 30, { size: 78, fam: F.bodoni, weight: is10 && hi > 0 ? 900 : 400, color: is10 && hi > 0 ? '#F6E6C2' : SEP.ink, align: 'center', mode: 'none' });
        c.globalAlpha = 1;
      }
      if (hi > 0) { // hand-drawn ring around No.10
        const cx = 440, cy = 858, pp = E.outCubic(prog(u, 1.7, 2.3));
        c.save(); c.strokeStyle = SEP.hi; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath();
        for (let k = 0; k <= 60 * pp; k++) { const a = -2.2 + k / 60 * TAU * 1.08, r = 1 + Math.sin(k * 0.3) * 0.03; const x = cx + Math.cos(a) * 120 * r, y = cy + Math.sin(a) * 76 * r; k ? c.lineTo(x, y) : c.moveTo(x, y); }
        c.stroke(); c.restore();
        glow(c, cx, cy, 260, SEP.hi, 0.25 * pp);
      }
      lin(c, u, 0.55, '希尔伯特提出 23 个问题', 540, 1420, { size: 66, fam: F.serif, weight: 900, color: SEP.ink, align: 'center', t1: 1.9 });
      lin(c, u, 2.05, '第 10 题问：', 540, 1385, { size: 48, fam: F.serif, weight: 700, color: SEP.hi, align: 'center', ls: 4 });
      lin(c, u, 2.3, '能否用有限的机械步骤，', 540, 1480, { size: 62, fam: F.serif, weight: 900, color: SEP.ink, align: 'center' });
      lin(c, u, 2.7, '判定一个方程有没有解？', 540, 1570, { size: 62, fam: F.serif, weight: 900, color: SEP.ink, align: 'center' });
    },
    post(c, lt, d, t) { filmFX(c, t, 1); },
  });
})();

/* ---------- S2 · 1914 El Ajedrecista (18–24) ---------- */
function makeCam(h, D, Fl, cx, cy) {
  const n = Math.hypot(h, D), fy = -h / n, fz = -D / n, uy = D / n, uz = -h / n;
  return (X, Y, Z) => { const vx = X, vy = Y - h, vz = Z - D; const zc = vy * fy + vz * fz, yc = vy * uy + vz * uz; return [cx + Fl * vx / zc, cy - Fl * yc / zc, Fl / zc]; };
}
const sq = (f, r) => [-4 + f + 0.5, 4 - (r - 1) - 0.5];
function gear(c, x, y, r, teeth, ang, col, a) {
  c.save(); c.translate(x, y); c.rotate(ang); c.globalAlpha *= a; c.fillStyle = col; c.beginPath();
  for (let i = 0; i < teeth * 2; i++) { const a0 = i / (teeth * 2) * TAU, a1 = (i + 1) / (teeth * 2) * TAU, rr2 = i % 2 ? r : r * 1.14; c.arc(0, 0, rr2, a0, a1); }
  c.closePath(); c.arc(0, 0, r * 0.35, 0, TAU, true); c.fill('evenodd');
  c.restore();
}
function board(c, cam, light, dark, hatch, line) {
  for (let f = 0; f < 8; f++) for (let r = 1; r <= 8; r++) {
    const [x, z] = sq(f, r), P = [cam(x - .5, 0, z - .5), cam(x + .5, 0, z - .5), cam(x + .5, 0, z + .5), cam(x - .5, 0, z + .5)];
    c.beginPath(); c.moveTo(P[0][0], P[0][1]); for (let k = 1; k < 4; k++) c.lineTo(P[k][0], P[k][1]); c.closePath();
    const isDark = (f + r) % 2 === 1;
    c.fillStyle = isDark ? dark : light; c.fill();
    if (isDark && hatch) { c.save(); c.clip(); c.strokeStyle = hatch; c.lineWidth = 1.4; c.beginPath(); for (let k = -30; k < 30; k++) { const a = cam(x - .5 + k * 0.09, 0, z - .5), b = cam(x - .5 + k * 0.09 + 1, 0, z + .5); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); } c.stroke(); c.restore(); }
  }
  const C = [cam(-4, 0, -4), cam(4, 0, -4), cam(4, 0, 4), cam(-4, 0, 4)];
  c.strokeStyle = line; c.lineWidth = 4; c.beginPath(); c.moveTo(C[0][0], C[0][1]); for (let k = 1; k < 4; k++) c.lineTo(C[k][0], C[k][1]); c.closePath(); c.stroke();
}
function piece(c, cam, X, Z, glyph, fill, outline, lift = 0, rot = 0, scale = 1) {
  const [x, y, s] = cam(X, 0, Z), size = s * 2.0 * scale;
  c.save(); c.translate(x, y - lift); if (rot) c.rotate(rot);
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(0, lift, size * 0.3, size * 0.1, 0, 0, TAU); c.fill();
  fnt(c, { size, fam: F.sym }); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillStyle = fill; c.fillText(glyph[0], 0, size * 0.02);
  if (outline) { c.fillStyle = outline; c.fillText(glyph[1], 0, size * 0.02); }
  c.restore();
}
(() => {
  const s = 18;
  cue(s + 0.9, 'mech'); cue(s + 1.35, 'thunk'); cue(s + 1.8, 'slide'); cue(s + 2.15, 'thunk', { v: 0.6 }); cue(s + 2.6, 'mech'); cue(s + 3.15, 'hit', { v: 0.8 }); cue(s + 3.25, 'stamp');
  kick(s + 3.15, 16); kick(s + 3.25, 10);
  yseg(18, 18.4, 1900, 1914);
  const cam = makeCam(9, 10, 1250, 540, 1000);
  const lerpSq = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  scene({
    id: 'ajedrecista', s, e: 24, weave: true, ink: SEP.ink, hud: 1,
    draw(c, lt) {
      bg(c, SEP.bg);
      gear(c, 960, 240, 150, 16, lt * 0.5, SEP.ink, 0.08); gear(c, 800, 330, 80, 10, -lt * 0.95, SEP.ink, 0.08);
      gear(c, 120, 1780, 170, 18, -lt * 0.4, SEP.ink, 0.07);
      lin(c, lt, 0.05, '1914', 96, 400, { size: 230, fam: F.bodoni, weight: 900, color: SEP.ink, spread: 0.3 });
      lin(c, lt, 0.25, '托雷斯·克韦多的「棋手」', 104, 478, { size: 40, fam: F.serif, color: SEP.sub, ls: 3 });
      board(c, cam, '#D6C6A2', '#6A5840', 'rgba(30,22,14,0.45)', '#3A2E20');
      // moves
      const mK = E.inOutCubic(prog(lt, 0.9, 1.35)), mB = E.inOutCubic(prog(lt, 1.8, 2.15)), mR = E.inOutCubic(prog(lt, 2.6, 3.15));
      const wk = lerpSq(sq(5, 6), sq(6, 6), mK), bk = lerpSq(sq(7, 8), sq(6, 8), mB), wr = lerpSq(sq(1, 1), sq(1, 8), mR);
      const liftK = Math.sin(mK * Math.PI) * 40, liftR = Math.sin(mR * Math.PI) * 50, liftB = Math.sin(mB * Math.PI) * 30;
      const items = [[wk, ['♚', '♔'], '#F1E6CC', '#20180F', liftK], [bk, ['♚', null], '#1E170F', null, liftB], [wr, ['♜', '♖'], '#F1E6CC', '#20180F', liftR]];
      items.sort((a, b) => a[0][1] - b[0][1]);
      const mated = prog(lt, 3.15, 3.35);
      for (const it of items) piece(c, cam, it[0][0], it[0][1], it[1], it[2], it[3], it[4]);
      // mechanical arm (IK), end effector follows the white piece in play
      const top = p => { const q = cam(p[0], 0, p[1]); return [q[0], q[1] - q[2] * 1.55]; };
      const rest = [860, 1330];
      let T;
      if (lt < 0.6) T = rest;
      else if (lt < 0.9) T = lerpSq(rest, top(wk), E.inOutCubic(prog(lt, 0.6, 0.9)));
      else if (lt < 1.35) { const q = top(wk); T = [q[0], q[1] - liftK]; }
      else if (lt < 2.2) T = lerpSq(top(wk), rest, E.inOutCubic(prog(lt, 1.35, 1.9)));
      else if (lt < 2.6) T = lerpSq(rest, top(sq(1, 1)), E.inOutCubic(prog(lt, 2.2, 2.6)));
      else if (lt < 3.15) { const q = top(wr); T = [q[0], q[1] - liftR]; }
      else T = lerpSq(top(wr), rest, E.inOutCubic(prog(lt, 3.3, 3.9)));
      const B = [990, 1760], L1 = 470, L2 = 430; let dx = T[0] - B[0], dy = T[1] - B[1], dd = Math.min(Math.hypot(dx, dy), L1 + L2 - 2);
      const an = Math.atan2(dy, dx), off = Math.acos(clamp((L1 * L1 + dd * dd - L2 * L2) / (2 * L1 * dd), -1, 1));
      const J = [B[0] + Math.cos(an + off) * L1, B[1] + Math.sin(an + off) * L1];
      const Tt = [B[0] + Math.cos(an) * dd, B[1] + Math.sin(an) * dd];
      c.save(); c.lineCap = 'round';
      for (const [w, col] of [[62, '#1E170F'], [48, '#4A3C2A'], [14, '#6B5A40']]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(B[0], B[1]); c.lineTo(J[0], J[1]); c.lineTo(Tt[0], Tt[1]); c.stroke(); }
      c.fillStyle = '#2A2117'; rr(c, 820, 1700, 320, 260, 18); c.fill(); c.strokeStyle = '#6B5A40'; c.lineWidth = 3; c.stroke();
      c.fillStyle = '#8A7556'; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(850 + k * 50, 1728, 6, 0, TAU); c.fill(); }
      gear(c, B[0], B[1], 60, 12, -lt * 2, '#6E5B40', 1);
      c.fillStyle = '#1D160F'; for (const p of [J, Tt]) { c.beginPath(); c.arc(p[0], p[1], 34, 0, TAU); c.fill(); }
      c.fillStyle = SEP.sub; for (const p of [J, Tt]) { c.beginPath(); c.arc(p[0], p[1], 7, 0, TAU); c.fill(); }
      gear(c, J[0], J[1], 34, 9, lt * 3, '#6E5B40', 1);
      c.strokeStyle = '#2A2117'; c.lineWidth = 10; c.beginPath(); c.moveTo(Tt[0] - 22, Tt[1] + 8); c.lineTo(Tt[0] - 16, Tt[1] + 40); c.moveTo(Tt[0] + 22, Tt[1] + 8); c.lineTo(Tt[0] + 16, Tt[1] + 40); c.stroke();
      c.restore();
      if (mated > 0) { // stamp
        const sc = lerp(1.8, 1, E.outExpo(mated));
        c.save(); c.translate(540, 700); c.rotate(-0.12); c.scale(sc, sc); c.globalAlpha = clamp(mated * 3);
        c.strokeStyle = '#EBDDBB'; c.lineWidth = 8; c.strokeRect(-190, -95, 380, 170); c.lineWidth = 2; c.strokeRect(-176, -81, 352, 142);
        txt(c, '将 死', 0, 36, { size: 110, fam: F.serif, weight: 900, color: '#EBDDBB', align: 'center', mode: 'none' });
        c.restore();
      }
      lin(c, lt, 1.0, '一台机器，自己下完了一盘残局。', 540, 1520, { size: 54, fam: F.serif, weight: 900, color: SEP.ink, align: 'center' });
      lin(c, lt, 3.45, '而且，每一局都赢。', 540, 1615, { size: 54, fam: F.serif, weight: 900, color: SEP.hi, align: 'center' });
    },
    post(c, lt, d, t) { filmFX(c, t, 1); },
  });
})();

/* ---------- S3 · 1920 ROBOT, constructivist poster (24–28) ---------- */
let halftoneCv = null;
function halftone() {
  if (halftoneCv) return halftoneCv;
  halftoneCv = mk(W, H); const x = halftoneCv.getContext('2d'); x.fillStyle = '#121010';
  for (let yy = 0; yy < H; yy += 22) for (let xx = 0; xx < W; xx += 22) {
    const k = clamp((xx - yy * 0.55 + 300) / 900); const r = k * 9; if (r < 0.6) continue;
    x.beginPath(); x.arc(xx + (yy / 22 % 2) * 11, yy, r, 0, TAU); x.fill();
  }
  return halftoneCv;
}
(() => {
  const s = 24;
  yseg(24, 24.4, 1914, 1920);
  cue(s, 'whoosh'); for (let i = 0; i < 5; i++) { cue(s + 0.35 + i * 0.25, 'slam', { i }); kick(s + 0.35 + i * 0.25, 12 + i * 2); }
  cue(s + 1.6, 'tick'); flash(s, '#fff', 0.08, 0.6);
  scene({
    id: 'robot', s, e: 28, ink: '#121010', hud: 1,
    draw(c, lt) {
      bg(c, '#E6D7BA');
      c.save(); c.globalAlpha = 0.16 * E.outCubic(prog(lt, 0, 0.4)); c.drawImage(halftone(), 0, 0); c.restore();
      const cp = E.outBack(prog(lt, 0.05, 0.45));
      c.fillStyle = '#121010'; c.beginPath(); c.arc(820, 590, 240 * cp, 0, TAU); c.fill();
      c.fillStyle = '#C8231B'; c.beginPath(); c.arc(820, 590, 70 * cp, 0, TAU); c.fill();
      c.save(); c.translate(560, 880); c.rotate(-0.56);
      const bx = lerp(-2200, 0, E.outExpo(prog(lt, 0, 0.35)));
      c.fillStyle = '#C8231B'; c.fillRect(bx - 1400, -175, 2800, 350);
      c.fillStyle = '#121010'; c.fillRect(bx - 1400, 196, 2800, 22);
      const word = 'ROBOT', o = { size: 290, fam: F.anton }, ws = Array.from(word).map(ch => tw(ch, o)), total = ws.reduce((a, b) => a + b, 0) + 20 * 4;
      let x = -total / 2;
      for (let i = 0; i < 5; i++) {
        const p = prog(lt, 0.35 + i * 0.25, 0.47 + i * 0.25);
        if (p > 0) { const sc = lerp(2.6, 1, E.outExpo(p)); c.save(); c.translate(x + ws[i] / 2, 0); c.scale(sc, sc); c.globalAlpha = clamp(p * 4); txt(c, word[i], 0, 104, Object.assign({}, o, { color: '#121010', align: 'center', mode: 'none' })); c.restore(); }
        x += ws[i] + 20;
      }
      c.restore();
      lin(c, lt, 0.1, '1920', 88, 390, { size: 250, fam: F.anton, color: '#121010', mode: 'slam', spread: 0.4, dur: 0.4 });
      lin(c, lt, 0.3, '剧本《R.U.R.》', 94, 476, { size: 54, weight: 900, color: '#121010' });
      lin(c, lt, 1.6, '诞生了一个新词', 94, 1590, { size: 66, weight: 900, color: '#121010' });
      lin(c, lt, 1.9, '机器人', 88, 1760, { size: 170, fam: F.block, color: '#C8231B', mode: 'slam', dur: 0.35 });
      lin(c, lt, 2.3, '源自捷克语 robota · 意为「苦役」', 94, 1835, { size: 38, weight: 500, color: '#121010' });
    },
    post(c, lt, d, t) { grain(c, t, 0.14, 1.2); vignette(c, 0.22); },
  });
})();

/* ---------- S4 · 1936 Turing machine, blueprint (28–34) ---------- */
const BP = { bg: '#0B2A4C', line: '#9CC9F0', ink: '#E4F2FF', dim: '#5E86AE' };
function blueprint(c) {
  bg(c, BP.bg);
  c.save(); c.strokeStyle = BP.line;
  c.globalAlpha = 0.07; c.lineWidth = 1; c.beginPath(); for (let x = 0; x <= W; x += 40) { c.moveTo(x, 0); c.lineTo(x, H); } for (let y = 0; y <= H; y += 40) { c.moveTo(0, y); c.lineTo(W, y); } c.stroke();
  c.globalAlpha = 0.15; c.beginPath(); for (let x = 0; x <= W; x += 200) { c.moveTo(x, 0); c.lineTo(x, H); } for (let y = 0; y <= H; y += 200) { c.moveTo(0, y); c.lineTo(W, y); } c.stroke();
  c.restore();
}
const BB4 = (() => {
  const R = { A: [[1, 1, 'B'], [1, -1, 'B']], B: [[1, -1, 'A'], [0, -1, 'C']], C: [[1, 1, 'H'], [1, -1, 'D']], D: [[1, 1, 'D'], [0, 1, 'A']] };
  const tape = new Map(), steps = []; let pos = 0, st = 'A';
  while (st !== 'H' && steps.length < 120) { const r = tape.get(pos) || 0, [w, mv, ns] = R[st][r]; steps.push({ pos, write: w, move: mv, state: st, next: ns }); tape.set(pos, w); pos += mv; st = ns; }
  return steps;
})();
(() => {
  const s = 28;
  yseg(28, 28.4, 1920, 1936);
  // beat-synced step schedule: 8ths, then 16ths, then 32nds
  const T = []; let t = 0.4;
  for (let i = 0; i < 8; i++) { T.push(t); t += 0.25; } for (let i = 0; i < 16; i++) { T.push(t); t += 0.125; } for (let i = 0; i < 26; i++) { T.push(t); t += 0.0625; }
  T.forEach((tt, i) => cue(s + tt, 'step', { v: i < 24 ? 0.8 : 0.5 }));
  const HY = 1000, CH = 150;
  function stateAt(lt) {
    let k = 0; while (k < T.length && T[k] <= lt) k++;
    const tape = new Map(); for (let i = 0; i < k; i++) tape.set(BB4[i].pos, BB4[i].write);
    let head = 0, lastW = -1, lastT = -9;
    if (k > 0) {
      const st = BB4[k - 1], dt = (k < T.length ? T[k] : T[k - 1] + 0.06) - T[k - 1];
      const e = E.outExpo(clamp((lt - T[k - 1]) / (dt * 0.7)));
      head = lerp(st.pos, st.pos + st.move, e); lastW = st.pos; lastT = T[k - 1];
    }
    return { k, tape, head, lastW, lastT, state: k > 0 ? BB4[k - 1].next : 'A' };
  }
  scene({
    id: 'turing', s, e: 34, tin: 0.5, trans: 'tear', ink: BP.ink, hud: 1,
    draw(c, lt) {
      blueprint(c);
      const S0 = stateAt(lt);
      // tape
      c.save();
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.2, 'rgba(0,0,0,1)'); g.addColorStop(0.8, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      const x0 = 500, tw2 = 200;
      c.fillStyle = 'rgba(228,242,255,0.07)'; c.fillRect(x0, -20, tw2, H + 40);
      c.strokeStyle = BP.line; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0, H); c.moveTo(x0 + tw2, 0); c.lineTo(x0 + tw2, H); c.stroke();
      const j0 = Math.floor(S0.head - HY / CH) - 1, j1 = Math.ceil(S0.head + (H - HY) / CH) + 1;
      for (let j = j0; j <= j1; j++) {
        const y = HY + (j - S0.head) * CH;
        c.strokeStyle = BP.line; c.lineWidth = 1.5; c.globalAlpha = 0.8; c.beginPath(); c.moveTo(x0, y - CH / 2); c.lineTo(x0 + tw2, y - CH / 2); c.stroke();
        c.globalAlpha = 0.6; c.fillStyle = BP.line; c.beginPath(); c.arc(x0 + 18, y, 6, 0, TAU); c.fill();
        const v = S0.tape.get(j) || 0, fl = j === S0.lastW ? 1 - prog(lt, S0.lastT, S0.lastT + 0.25) : 0;
        if (fl > 0) { c.globalAlpha = 0.5 * fl; c.fillStyle = AMBER; c.fillRect(x0 + 2, y - CH / 2 + 2, tw2 - 4, CH - 4); }
        c.globalAlpha = 1;
        txt(c, String(v), x0 + tw2 / 2 + 10, y + 34, { size: 100, fam: F.mono, weight: 600, color: v ? '#FFFFFF' : BP.dim, align: 'center', mode: 'none' });
      }
      c.restore();
      // head
      const hp = E.outBack(prog(lt, 0.15, 0.5));
      c.save(); c.translate(600, HY); c.scale(hp, hp); c.strokeStyle = AMBER; c.lineWidth = 7;
      const hw = 150, hh = 92, k = 36;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { c.beginPath(); c.moveTo(sx * hw, sy * (hh - k)); c.lineTo(sx * hw, sy * hh); c.lineTo(sx * (hw - k), sy * hh); c.stroke(); }
      c.fillStyle = AMBER; c.beginPath(); c.moveTo(hw + 16, 0); c.lineTo(hw + 44, -20); c.lineTo(hw + 44, 20); c.closePath(); c.fill();
      c.restore();
      if (lt > 0.4) {
        txt(c, 'q = ' + S0.state, 800, HY - 6, { size: 50, fam: F.mono, weight: 600, color: AMBER, mode: 'none' });
        txt(c, 'STEP ' + String(S0.k).padStart(3, '0'), 800, HY + 50, { size: 30, fam: F.mono, color: BP.line, mode: 'none', ls: 3 });
      }
      // callouts
      const co = (t0, x1, y1, x2, y2) => { const p = E.outCubic(prog(lt, t0, t0 + 0.4)); if (p <= 0) return; c.strokeStyle = BP.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(x1, y1); c.lineTo(lerp(x1, x2, p), lerp(y1, y2, p)); c.stroke(); c.fillStyle = BP.ink; c.beginPath(); c.arc(x2, y2, 6 * p, 0, TAU); c.fill(); };
      c.fillStyle = hexA(BP.bg, 0.85); c.fillRect(0, 240, 470, 260);
      lin(c, lt, 0.0, '1936', 90, 390, { size: 170, fam: F.mono, weight: 600, color: '#D6ECFF', spread: 0.3 });
      lin(c, lt, 0.2, '图灵 ·《论可计算数》', 96, 460, { size: 40, color: BP.line, weight: 500 });
      lin(c, lt, 0.7, '一条无限长的纸带', 90, 680, { size: 46, weight: 700, color: BP.ink }); co(0.9, 90, 705, 490, 760);
      lin(c, lt, 1.3, '一个读写头', 90, 990, { size: 46, weight: 700, color: BP.ink }); co(1.5, 90, 1015, 440, 1000);
      lin(c, lt, 1.9, '几条简单规则', 90, 1240, { size: 46, weight: 700, color: BP.ink }); co(2.1, 90, 1265, 790, 1060);
      // title block
      c.save(); c.globalAlpha = E.outCubic(prog(lt, 0.5, 1)); c.strokeStyle = BP.line; c.lineWidth = 2; c.strokeRect(660, 1690, 360, 150); c.beginPath(); c.moveTo(660, 1740); c.lineTo(1020, 1740); c.moveTo(660, 1790); c.lineTo(1020, 1790); c.moveTo(840, 1740); c.lineTo(840, 1840); c.stroke();
      txt(c, 'DWG · 1936-TM', 676, 1728, { size: 26, fam: F.mono, color: BP.line, mode: 'none', ls: 2 });
      txt(c, 'SCALE ∞ : 1', 676, 1776, { size: 24, fam: F.mono, color: BP.line, mode: 'none' });
      txt(c, 'A. M. TURING', 856, 1776, { size: 24, fam: F.mono, color: BP.line, mode: 'none' });
      txt(c, 'BUSY BEAVER · 4', 676, 1826, { size: 22, fam: F.mono, color: BP.dim, mode: 'none' });
      c.restore();
      const bp2 = E.outCubic(prog(lt, 2.6, 3.0));
      if (bp2 > 0) { c.fillStyle = hexA(BP.bg, 0.9 * bp2); c.fillRect(0, 1380, W, 270); }
      lin(c, lt, 2.7, '理论上，它能计算', 90, 1480, { size: 66, weight: 900, color: '#fff' });
      lin(c, lt, 3.0, '一切可以计算的东西。', 90, 1580, { size: 66, weight: 900, color: '#fff' });
    },
  });
})();

/* ---------- S5 · 1943 the neuron as math (34–38) ---------- */
const NEURON = (() => {
  const r = rng(1943), segs = [], leaves = [], SX = 580, SY = 900;
  function br(x, y, ang, len, depth, path) {
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len; segs.push({ x, y, x2, y2, depth });
    const p2 = path.concat([[x2, y2]]);
    if (depth < 3) { const sp = 0.35 + r() * 0.3; br(x2, y2, ang - sp, len * (0.62 + r() * 0.12), depth + 1, p2); br(x2, y2, ang + sp, len * (0.62 + r() * 0.12), depth + 1, p2); }
    else leaves.push(p2.slice().reverse());
  }
  const angs = [Math.PI * 0.62, Math.PI * 0.86, Math.PI * 1.1, Math.PI * 1.34, Math.PI * 1.55];
  angs.forEach((a, i) => { const x = SX + Math.cos(a) * 70, y = SY + Math.sin(a) * 70; br(x, y, a + (r() - 0.5) * 0.2, 150 + r() * 40, 0, [[SX, SY], [x, y]]); });
  const axon = [[SX + 70, SY + 10], [760, 960], [860, 1080], [900, 1210]];
  const terms = [[[900, 1210], [850, 1300]], [[900, 1210], [930, 1320]], [[900, 1210], [1000, 1270]]];
  return { segs, leaves, axon, terms, SX, SY };
})();
function pathPt(path, k) {
  let total = 0; const L = []; for (let i = 1; i < path.length; i++) { const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); L.push(d); total += d; }
  let d = k * total; for (let i = 0; i < L.length; i++) { if (d <= L[i]) { const f = d / L[i]; return [lerp(path[i][0], path[i + 1][0], f), lerp(path[i][1], path[i + 1][1], f)]; } d -= L[i]; }
  return path[path.length - 1];
}
(() => {
  const s = 34;
  yseg(34, 34.4, 1936, 1943);
  cue(s, 'whoosh'); cue(s + 2.3, 'fire'); kick(s + 2.3, 8);
  for (let i = 0; i < 6; i++) cue(s + 1.4 + i * 0.12, 'blip', { v: 0.4, p: i });
  scene({
    id: 'neuron', s, e: 38, tin: 0.35, trans: 'whipUp', ink: BP.ink, hud: 1,
    draw(c, lt) {
      blueprint(c);
      const N = NEURON, grow = prog(lt, 0.1, 1.2);
      c.save(); c.lineCap = 'round'; c.strokeStyle = '#CFE8FF';
      for (const sg of N.segs) {
        const k = clamp(grow * 4.2 - sg.depth); if (k <= 0) continue;
        c.lineWidth = 7 - sg.depth * 1.5; c.beginPath(); c.moveTo(sg.x, sg.y); c.lineTo(lerp(sg.x, sg.x2, k), lerp(sg.y, sg.y2, k)); c.stroke();
      }
      const ax = clamp(grow * 1.6 - 0.4);
      if (ax > 0) {
        c.lineWidth = 7; c.beginPath(); for (let i = 0; i <= 40 * ax; i++) { const p = pathPt(N.axon, i / 40); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke();
        if (ax > 0.6) {
          for (const k of [0.3, 0.52, 0.74]) { const p = pathPt(N.axon, k), q = pathPt(N.axon, k + 0.12); c.save(); c.lineWidth = 26; c.strokeStyle = hexA('#CFE8FF', 0.35); c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.stroke(); c.restore(); }
          c.lineWidth = 4; for (const tt of N.terms) { c.beginPath(); c.moveTo(...tt[0]); c.lineTo(...tt[1]); c.stroke(); c.beginPath(); c.arc(tt[1][0], tt[1][1], 9, 0, TAU); c.fillStyle = '#CFE8FF'; c.fill(); }
        }
      }
      const fire = prog(lt, 2.3, 2.5);
      c.fillStyle = BP.bg; c.lineWidth = 6; c.beginPath(); c.arc(N.SX, N.SY, 72 * E.outBack(prog(lt, 0.05, 0.4)), 0, TAU); c.fill(); c.stroke();
      c.restore();
      // signals travelling in
      N.leaves.forEach((path, i) => {
        if (i % 3) return; const t0 = 1.4 + (i % 7) * 0.08, k = prog(lt, t0, t0 + 0.75);
        if (k > 0 && k < 1) { const p = pathPt(path, E.inQuad(k)); glow(c, p[0], p[1], 40, AMBER, 0.9); c.fillStyle = '#FFE2A8'; c.beginPath(); c.arc(p[0], p[1], 7, 0, TAU); c.fill(); }
      });
      if (fire > 0) glow(c, N.SX, N.SY, 260 * (1 - prog(lt, 2.5, 3.4) * 0.6), AMBER, 1 - prog(lt, 2.8, 3.6) * 0.7);
      const ap = prog(lt, 2.35, 2.95);
      if (ap > 0 && ap < 1) { const p = pathPt(N.axon, ap); glow(c, p[0], p[1], 70, AMBER, 1); }
      txt(c, 'Σ', N.SX, N.SY + 22, { size: 64, fam: F.mono, weight: 600, color: fire > 0 ? '#FFE2A8' : '#CFE8FF', align: 'center', p: prog(lt, 1.0, 1.4), mode: 'pop' });
      const lab = (t0, s2, x, y, col = BP.ink) => lin(c, lt, t0, s2, x, y, { size: 36, fam: F.mono, color: col, mode: 'pop', dur: 0.3 });
      N.leaves.forEach((path, i) => { if (i % 8 === 2) { const p = path[0]; lab(1.0 + i * 0.02, 'x' + (Math.floor(i / 8) + 1), p[0] - 50, p[1] + 10); } });
      lab(1.3, '≥ θ', 700, 890, AMBER);
      lab(2.9, 'y = 1', 940, 1380, AMBER);
      c.fillStyle = hexA(BP.bg, 0.85); c.fillRect(0, 240, 560, 260);
      lin(c, lt, 0.0, '1943', 90, 390, { size: 200, fam: F.mono, weight: 600, color: '#D6ECFF', spread: 0.3 });
      lin(c, lt, 0.2, '麦卡洛克 & 皮茨', 96, 460, { size: 40, color: BP.line, weight: 500 });
      lin(c, lt, 1.2, 'Σ wᵢ·xᵢ ≥ θ  →  y = 1', 540, 1500, { size: 54, fam: F.mono, color: BP.ink, align: 'center', mode: 'scramble', dur: 0.6 });
      lin(c, lt, 1.9, '神经元，被写成了数学。', 540, 1640, { size: 68, weight: 900, color: '#fff', align: 'center' });
    },
  });
})();

/* ---------- S6 · 1946 ENIAC, the first light (38–44) ---------- */
(() => {
  const s = 38, COLS = 13, ROWS = 24, KEEP = 11 * COLS + 6;
  yseg(38, 38.4, 1943, 1946);
  cue(s + 0.25, 'hum', { dur: 4.6 }); cue(s + 4.4, 'powerdown'); cue(s + 5.4, 'whoosh', { rev: 1 });
  for (let i = 0; i < 26; i++) cue(s + 0.3 + i * 0.06, 'relay', { v: 0.5 });
  cue(s + 2.9, 'hit', { v: 0.4 }); cue(s + 3.6, 'hit', { v: 0.55 });
  const pos = i => [84 + (i % COLS) * 76, 110 + Math.floor(i / COLS) * 74];
  scene({
    id: 'eniac', s, e: 44, ink: '#EADFC6', hud: lt => 1 - prog(lt, 5.2, 5.6),
    draw(c, lt, d, t) {
      bg(c, '#0A0806');
      const z = E.inExpo(prog(lt, 5.3, 6.0)), [kx, ky] = pos(KEEP);
      c.save(); c.translate(kx, ky); c.scale(1 + z * 5, 1 + z * 5); c.translate(-kx, -ky);
      for (let i = 0; i < COLS * ROWS; i++) {
        const [x, y] = pos(i), dist = Math.hypot(x, H - y) / Math.hypot(W, H);
        let b = clamp((lt - 0.25 - dist * 1.5) / 0.2);
        const off = 4.4 + h2(i, 9) * 1.0; if (i !== KEEP) b *= 1 - clamp((lt - off) / 0.08);
        b *= 0.78 + 0.22 * noise1(t * 14 + i * 3.1, i);
        c.strokeStyle = '#3A2E22'; c.lineWidth = 2; c.fillStyle = '#140F0A';
        rr(c, x - 15, y - 28, 30, 54, 14); c.fill(); c.stroke();
        if (b > 0.02) { glow(c, x, y, 44, AMBER, b * 0.9); c.globalAlpha = b; c.fillStyle = '#FFE7B8'; c.fillRect(x - 3, y - 10, 6, 18); c.globalAlpha = 1; }
      }
      c.restore();
      const g = c.createLinearGradient(0, 180, 0, 560); g.addColorStop(0, 'rgba(10,8,6,0.95)'); g.addColorStop(1, 'rgba(10,8,6,0)');
      c.globalAlpha = 1 - z; c.fillStyle = g; c.fillRect(0, 0, W, 560);
      lin(c, lt, 0.1, '1946', 90, 390, { size: 200, fam: F.mono, weight: 600, color: '#F4E6CC', spread: 0.3, t1: 5.0 });
      lin(c, lt, 0.3, 'ENIAC · 宾夕法尼亚大学', 96, 460, { size: 40, weight: 500, color: '#CDBB98', t1: 5.0 });
      const pa = E.outCubic(prog(lt, 0.3, 0.6)) * (1 - prog(lt, 4.4, 4.8));
      if (pa > 0) {
        c.globalAlpha = pa; c.fillStyle = 'rgba(10,8,6,0.86)'; c.fillRect(90, 760, 900, 340); c.strokeStyle = hexA(AMBER, 0.6); c.lineWidth = 2; c.strokeRect(90, 760, 900, 340); c.globalAlpha = 1;
        const n = 17468 * E.outCubic(prog(lt, 0.35, 1.9));
        txt(c, fmtInt(n), 540, 960, { size: 170, fam: F.mono, weight: 600, color: AMBER, align: 'center', mode: 'none', alpha: pa * (1 - prog(lt, 2.7, 2.9)), glow: 24 });
        lin(c, lt, 0.8, '根真空管，同时亮起。', 540, 1050, { size: 50, weight: 500, color: '#EADFC6', align: 'center', t1: 2.7, alpha: pa });
        lin(c, lt, 2.9, '它算得很快。', 540, 920, { size: 84, weight: 900, color: '#F4E6CC', align: 'center', alpha: pa });
        lin(c, lt, 3.6, '但它不会思考。', 540, 1040, { size: 84, weight: 900, color: AMBER, align: 'center', alpha: pa });
      }
    },
    post(c, lt, d, t) { grain(c, t, 0.08); vignette(c, 0.5); },
  });
})();
