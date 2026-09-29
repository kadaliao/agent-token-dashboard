/* ============================================================
   第二章 · 问 (44 – 76s)   第三章 · 冬 (76 – 100s)
   ============================================================ */

/* ---------- S7 · 1950 "Can machines think?" (44–52) ---------- */
(() => {
  const s = 44;
  cue(s, 'act', { n: 2 }); yseg(44, 44.5, 1946, 1950);
  const ACT = { ch: '问', num: '第 二 章', en: 'II · The Question', years: '1950 — 1969', bg: '#0B0A09', fg: AMBER, sub: '#BDB3A2', seed: 5, glowCol: AMBER };
  const LINES = [['I propose to consider', 1.75, 20, 74, 800], ['the question,', 2.95, 20, 74, 900], ['“Can machines', 3.7, 18, 104, 1060], ['think?”', 4.5, 15, 104, 1180]];
  const TT = LINES.map(([str, t0, cps], i) => typeTimes(str, t0, cps, i + 3, 0.3));
  TT.forEach((times, i) => {
    const ch = Array.from(LINES[i][0]);
    times.forEach((tt, j) => { if (ch[j] !== ' ') { cue(s + tt, 'type', { j }); kick(s + tt, 2.2, 30); } });
    const end = times[times.length - 1];
    if (i === 1) cue(s + end + 0.1, 'ding');
    if (i < 3) cue(s + end + 0.18, 'return');
  });
  cue(s + 5.25, 'hit', { v: 1 }); cue(s + 5.25, 'boom'); kick(s + 5.3, 22, 6); flash(s + 5.25, '#fff', 0.1, 0.9);
  cue(s + 6.4, 'swell', { dur: 1.5 });
  function paperLine(c, lt, str, times, x, y, size, seed) {
    const chars = Array.from(str); fnt(c, { size, fam: F.type }); c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    let xx = x, typedW = 0;
    for (let j = 0; j < chars.length; j++) {
      const w = cw(c, chars[j]);
      if (times[j] <= lt) { const strike = 1 - prog(lt, times[j], times[j] + 0.06); c.globalAlpha = 0.72 + h2(seed, j) * 0.28; c.fillStyle = '#17120C'; c.fillText(chars[j], xx, y + (h2(seed, j + 50) - 0.5) * 3 - strike * 3); typedW = xx + w - x; }
      xx += w;
    }
    c.globalAlpha = 1; return typedW;
  }
  scene({
    id: 'turing50', s, e: 52, ink: '#EDE6D6', hud: lt => lt > 1.4 && lt < 5.25 ? 1 : 0,
    draw(c, lt, d, t) {
      if (lt < 1.4) return actCard(c, lt, ACT);
      if (lt < 5.25) {
        bg(c, '#171311');
        // carriage offset follows the typing point
        let off = 0;
        for (let i = 0; i < 4; i++) {
          const tm = TT[i], st = tm[0], en = tm[tm.length - 1];
          if (lt >= st - 0.2) { fnt(scratch, { size: LINES[i][3], fam: F.type }); let v = 0; while (v < tm.length && tm[v] <= lt) v++; const wv = layout(scratch, Array.from(LINES[i][0]).slice(0, v).join(''), 0).width; off = -wv * 0.22; if (lt < st && i > 0) off = lerp(off, 0, 1); }
        }
        const zoom = lerp(1.0, 1.07, prog(lt, 1.4, 5.25)), py = lerp(700, 0, E.outCubic(prog(lt, 1.4, 1.8)));
        c.save(); c.translate(540, 1000); c.scale(zoom, zoom); c.rotate(-0.012); c.translate(-540 + off, -1000 + py);
        c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(78, 318, 960, 1900);
        c.fillStyle = '#EFE8D8'; c.fillRect(60, 300, 960, 1900);
        c.save(); c.beginPath(); c.rect(60, 300, 960, 1900); c.clip(); grain(c, 3.3, 0.06, 1.2, 'multiply'); c.restore();
        txt(c, 'COMPUTING MACHINERY AND INTELLIGENCE', 540, 440, { size: 36, fam: F.type, color: '#2A2118', align: 'center', mode: 'none', ls: 1 });
        txt(c, 'By A. M. Turing', 540, 500, { size: 32, fam: F.type, color: '#2A2118', align: 'center', mode: 'none' });
        txt(c, '1. The Imitation Game', 130, 650, { size: 38, fam: F.type, color: '#2A2118', mode: 'none' });
        LINES.forEach(([str, , , size, y], i) => paperLine(c, lt, str, TT[i], 130, y, size, i + 11));
        lin(c, lt, 4.95, '— Mind, 1950', 130, 1290, { size: 34, fam: F.type, color: '#6B5E4E', mode: 'fade' });
        c.restore();
        vignette(c, 0.45);
        return;
      }
      const u = lt - 5.25;
      bg(c, '#070606');
      lin(c, u, 0.0, '机器能思考吗', 540, 640, { size: 130, fam: F.serif, weight: 900, color: '#F3EDE2', align: 'center', mode: 'drop', dur: 0.45, spread: 0.5 });
      const qp = prog(u, 0.12, 0.6);
      if (qp > 0) { c.save(); const sc = E.outBackBig(qp); c.translate(540, 1500 + Math.sin(u * 2.2) * 8); c.scale(sc, sc); question(c, 0, 0, 860, clamp(qp * 3)); c.restore(); }
      lin(c, u, 1.2, '这个问题，后来变成了我。', 540, 1720, { size: 54, weight: 500, color: '#D8CFC0', align: 'center', ls: 2 });
    },
    post(c, lt, d, t) { if (lt < 1.4) return; if (lt < 5.25) grain(c, t, 0.08); else { grain(c, t, 0.06); vignette(c, 0.4); } },
  });
})();

/* ---------- S8 · 1956 Dartmouth: a name, and one summer (52–60) ---------- */
(() => {
  const s = 52, RED = '#E8452C', INK = '#111111', PAPER = '#EDE9E0';
  yseg(52, 52.4, 1950, 1956);
  cue(s, 'swell', { dur: 0.8 });
  const Q = ['“We propose that a 2 month,', '10 man study of', 'artificial intelligence', 'be carried out during', 'the summer of 1956 …”'];
  let qt = 0.55; const QT = Q.map((l, i) => { const tt = typeTimes(l, qt, 48, 20 + i, 0.2); qt = tt[tt.length - 1] + 0.06; return tt; });
  QT.forEach(tt => tt.forEach((x, j) => { if (j % 3 === 0) cue(s + x, 'tick', { v: 0.25 }); }));
  for (let i = 0; i < 4; i++) { cue(s + 2.95 + i * 0.13, 'slam', { i, light: 1 }); kick(s + 2.95 + i * 0.13, 7); }
  cue(s + 6.2, 'down', { dur: 1.8 });
  scene({
    id: 'dartmouth', s, e: 60, ink: INK, hud: 1,
    draw(c, lt) {
      bg(c, PAPER);
      c.save(); c.strokeStyle = 'rgba(17,17,17,0.07)'; c.lineWidth = 1; c.beginPath(); for (let x = 70; x < W; x += 157) { c.moveTo(x, 0); c.lineTo(x, H); } c.stroke(); c.restore();
      const rise = E.outBack(prog(lt, 0.0, 0.8)), set = E.inOutCubic(prog(lt, 6.2, 8.0));
      const sy = lerp(1150, 560, rise) + set * 460, sr = 300;
      c.save(); c.beginPath(); c.rect(0, 0, W, 900); c.clip();
      c.fillStyle = mixHex(RED, '#B9B3AA', set * 0.8); c.beginPath(); c.arc(700, sy, sr, 0, TAU); c.fill(); c.restore();
      c.fillStyle = INK; c.fillRect(70, 897, lerp(0, 940, E.outExpo(prog(lt, 0.3, 0.9))), 5);
      lin(c, lt, 0.1, '1956', 62, 470, { size: 270, fam: F.swiss, weight: 900, color: INK, spread: 0.35, ls: -8 });
      c.save(); c.translate(1040, 120); c.rotate(Math.PI / 2);
      lin(c, lt, 0.4, 'DARTMOUTH SUMMER RESEARCH PROJECT ON ARTIFICIAL INTELLIGENCE', 0, 0, { size: 22, fam: F.swiss, weight: 700, color: INK, ls: 5, mode: 'fade', dur: 0.8 });
      c.restore();
      Q.forEach((l, i) => {
        const hi = i === 2, y = 990 + i * 58;
        const r = typed(c, lt, QT[i], l, 70, y, { size: hi ? 42 : 38, fam: F.swiss, weight: hi ? 900 : 500, color: INK });
        if (hi && r) { const u = E.outExpo(prog(lt, QT[2][QT[2].length - 1], QT[2][QT[2].length - 1] + 0.4)); c.fillStyle = RED; c.fillRect(70, y + 10, r.width * u, 7); }
      });
      const num = (t0, n, x, y, cn, en) => { const p = prog(lt, t0, t0 + 0.4); if (p <= 0) return; txt(c, n, x, y, { size: 150, fam: F.swiss, weight: 900, color: RED, p, mode: 'rise', ls: -4 }); txt(c, cn, x + tw(n, { size: 150, fam: F.swiss, weight: 900, ls: -4 }) + 16, y - 60, { size: 40, weight: 900, color: INK, p }); txt(c, en, x + tw(n, { size: 150, fam: F.swiss, weight: 900, ls: -4 }) + 16, y - 14, { size: 22, fam: F.swiss, weight: 700, color: INK, p, ls: 4 }); };
      num(1.0, '2', 700, 1110, '个月', 'MONTHS');
      num(1.35, '10', 700, 1260, '个人', 'MEN');
      lin(c, lt, 2.55, '他们给它起了名字：', 70, 1420, { size: 44, weight: 700, color: '#57534C' });
      lin(c, lt, 2.95, '人工智能', 60, 1640, { size: 205, weight: 900, color: INK, mode: 'slam', dur: 0.5, spread: 0.7, ls: 4 });
      const l5 = lin(c, lt, 4.7, '他们相信：', 70, 1770, { size: 42, weight: 700, color: INK });
      if (l5) lin(c, lt, 4.95, '一个夏天，就能取得重大突破。', 70 + l5.width + 6, 1770, { size: 42, weight: 900, color: RED });
    },
    post(c, lt, d, t) { grain(c, t, 0.07, 1.2); },
  });
})();

/* ---------- S9 · 1958 perceptron: the newspaper spin, then 50 trials (60–66) ---------- */
let paperCv = null;
function newspaper() {
  if (paperCv) return paperCv;
  paperCv = mk(900, 1300); const c = paperCv.getContext('2d');
  c.fillStyle = '#ECE6D5'; c.fillRect(0, 0, 900, 1300);
  txt(c, 'The New York Times', 450, 120, { size: 86, fam: F.goth, color: '#15120E', align: 'center', mode: 'none' });
  c.fillStyle = '#15120E'; c.fillRect(40, 150, 820, 3); c.fillRect(40, 196, 820, 1.5);
  txt(c, 'MONDAY, JULY 8, 1958', 450, 184, { size: 22, fam: F.bodoni, color: '#15120E', align: 'center', mode: 'none', ls: 4 });
  txt(c, 'NEW NAVY DEVICE', 450, 300, { size: 70, fam: F.bodoni, weight: 900, color: '#15120E', align: 'center', mode: 'none' });
  txt(c, 'LEARNS BY DOING', 450, 390, { size: 70, fam: F.bodoni, weight: 900, color: '#15120E', align: 'center', mode: 'none' });
  c.fillRect(300, 430, 300, 2);
  txt(c, 'Psychologist Shows Embryo of Computer', 450, 485, { size: 32, fam: F.bodoni, style: 'italic', color: '#15120E', align: 'center', mode: 'none' });
  txt(c, 'Designed to Read and Grow Wiser', 450, 527, { size: 32, fam: F.bodoni, style: 'italic', color: '#15120E', align: 'center', mode: 'none' });
  const r = rng(58); c.fillStyle = 'rgba(21,18,14,0.55)';
  for (let col = 0; col < 3; col++) for (let ln = 0; ln < 38; ln++) { const x = 40 + col * 280, y = 580 + ln * 18; if (col === 1 && ln > 4 && ln < 20) continue; c.fillRect(x, y, 250 * (ln % 9 === 8 ? 0.5 + r() * 0.3 : 0.92 + r() * 0.08), 6); }
  c.fillStyle = '#7A7263'; c.fillRect(320, 672, 250, 270); c.strokeStyle = '#ECE6D5'; c.lineWidth = 1;
  c.beginPath(); for (let k = -30; k < 60; k++) { c.moveTo(320 + k * 9, 672); c.lineTo(320 + k * 9 - 270, 942); } c.save(); c.beginPath(); c.rect(320, 672, 250, 270); c.clip(); c.stroke(); c.restore();
  return paperCv;
}
(() => {
  const s = 60, N = 50;
  yseg(60, 60.4, 1956, 1958);
  cue(s, 'spin'); cue(s + 0.9, 'hit', { v: 0.7 }); kick(s + 0.9, 10); cue(s + 1.85, 'whoosh');
  const TR = []; for (let k = 0; k <= N; k++) TR.push(2.15 + 3.0 * Math.pow(k / N, 0.55));
  const correct = k => k >= 38 || h2(k, 2) < 0.45 + 0.55 * Math.pow(k / N, 0.8);
  for (let k = 0; k < N; k++) cue(s + TR[k], correct(k) ? 'blip' : 'err', { v: 0.5, p: k % 5 });
  cue(s + TR[N], 'chime');
  scene({
    id: 'perceptron', s, e: 66, ink: '#EADFC6', hud: lt => lt > 2 ? 1 : 0,
    draw(c, lt) {
      if (lt < 2.1) {
        bg(c, '#0E0C0A');
        const p = E.outCubic(prog(lt, 0, 0.9)), z = E.inExpo(prog(lt, 1.8, 2.1));
        const dr = (pp, a) => { c.save(); c.translate(540, 960); c.rotate((1 - pp) * 4 * Math.PI); const sc = lerp(0.04, 0.98, pp) * (1 + z * 3); c.scale(sc, sc); c.globalAlpha = a * (1 - z); c.drawImage(newspaper(), -450, -650); c.restore(); };
        if (p < 1) { dr(E.outCubic(prog(lt - 0.04, 0, 0.9)), 0.25); dr(E.outCubic(prog(lt - 0.02, 0, 0.9)), 0.4); }
        dr(p, 1);
        return;
      }
      const u = lt - 2.1; bg(c, '#0E0C0A');
      let k = 0; while (k < N && TR[k + 1] <= lt) k++;
      const trialT = lt - TR[k], left = h2(k, 7) < 0.5, ok = correct(k), done = lt >= TR[N];
      const ox = (left ? 2 : 12) + Math.floor(h2(k, 8) * 3), oy = 6 + Math.floor(h2(k, 9) * 4);
      const gx = 200, gy = 520, cs = 34;
      for (let j = 0; j < 400; j++) {
        const cx = j % 20, cy = Math.floor(j / 20), on = !done && cx >= ox && cx < ox + 6 && cy >= oy && cy < oy + 6;
        const x = gx + cx * cs + cs / 2, y = gy + cy * cs + cs / 2;
        c.fillStyle = on ? '#FFD28A' : '#2A2012'; c.beginPath(); c.arc(x, y, 12, 0, TAU); c.fill();
        if (on) glow(c, x, y, 34, AMBER, 0.55);
      }
      c.strokeStyle = 'rgba(255,181,71,0.35)'; c.lineWidth = 2; c.strokeRect(gx - 10, gy - 10, 20 * cs + 20, 20 * cs + 20);
      c.fillStyle = 'rgba(255,181,71,0.35)'; c.fillRect(540 - 1, gy - 26, 2, 20 * cs + 52);
      const ans = trialT > 0.02 && !done ? (ok ? left : !left) : null;
      [['左', 380, true], ['右', 700, false]].forEach(([lab, x, isL]) => {
        const lit = ans === isL, col = lit ? (ok ? AMBER : '#FF4D4D') : '#2A2012';
        c.fillStyle = col; c.beginPath(); c.arc(x, 1320, 34, 0, TAU); c.fill(); if (lit) glow(c, x, 1320, 110, ok ? AMBER : '#FF4D4D', 0.7);
        txt(c, lab, x, 1410, { size: 40, weight: 700, color: '#CDBB98', align: 'center', mode: 'none' });
      });
      txt(c, 'TRIAL ' + String(Math.min(N, k + 1)).padStart(2, '0') + ' / 50', 540, 1328, { size: 34, fam: F.mono, weight: 600, color: done ? AMBER : '#CDBB98', align: 'center', mode: 'none', ls: 2 });
      lin(c, u, 0.0, '1958', 90, 390, { size: 200, fam: F.mono, weight: 600, color: '#F4E6CC', spread: 0.3 });
      lin(c, u, 0.2, '罗森布拉特 · 感知机', 96, 460, { size: 40, weight: 500, color: '#CDBB98' });
      lin(c, u, 1.4, '试了 50 次，', 540, 1560, { size: 66, weight: 900, color: '#F4E6CC', align: 'center' });
      lin(c, u, 1.8, '它自己学会了分辨左和右。', 540, 1655, { size: 66, weight: 900, color: AMBER, align: 'center' });
    },
    post(c, lt, d, t) { grain(c, t, lt < 2.1 ? 0.12 : 0.07); vignette(c, 0.45); },
  });
})();

/* ---------- S10 · 1966 ELIZA on green phosphor (66–72) ---------- */
(() => {
  const s = 66, G = '#41FF7A', GD = '#1C8A42';
  yseg(66, 66.4, 1958, 1966);
  const L = [
    ['> Men are all alike.', 0.5, 20, 470, 0], ['IN WHAT WAY?', 1.7, 34, 570, 1],
    ['> They\'re always bugging us', 2.35, 25, 710, 0], ['CAN YOU THINK OF A', 3.65, 40, 810, 1], ['SPECIFIC EXAMPLE?', 4.15, 40, 900, 1],
  ];
  const LT = L.map(([str, t0, cps], i) => typeTimes(str, t0, cps, 40 + i, 0.25));
  LT.forEach((tt, i) => { if (L[i][4]) cue(s + tt[0] - 0.05, 'beep'); tt.forEach((x, j) => { if (!L[i][4] || j % 2 === 0) cue(s + x, L[i][4] ? 'tty' : 'key', { soft: 1 }); }); });
  cue(s, 'crton');
  scene({
    id: 'eliza', s, e: 72, ink: G, hud: 1,
    draw(c, lt, d, t) {
      bg(c, '#000');
      const on = E.outExpo(prog(lt, 0, 0.3));
      c.save(); c.translate(540, 960); c.scale(1, Math.max(0.005, on)); c.translate(-540, -960);
      c.fillStyle = '#021208'; rr(c, 30, 110, 1020, 1700, 70); c.fill();
      c.save(); rr(c, 30, 110, 1020, 1700, 70); c.clip();
      txt(c, 'ELIZA  ·  MIT  ·  1966', 90, 290, { size: 56, fam: F.crt, color: GD, mode: 'none', glow: 10, alpha: lt > 0.25 ? 1 : 0 });
      c.fillStyle = GD; c.fillRect(90, 318, 900, 3);
      let lastLine = -1;
      L.forEach(([str, , , y, m], i) => { const r = typed(c, lt, LT[i], str, 90, y, { size: 72, fam: F.crt, color: m ? G : '#B8FFD0', glow: 16 }); if (r) lastLine = i; });
      const cl = lastLine < 0 ? 0 : lastLine; let v = 0; const tt = LT[cl]; while (v < tt.length && tt[v] <= lt) v++;
      fnt(scratch, { size: 72, fam: F.crt }); const cx = 90 + layout(scratch, Array.from(L[cl][0]).slice(0, v).join(''), 0).width + 6;
      if (Math.floor(lt * 2.6) % 2 === 0 || v < tt.length) { c.fillStyle = G; c.fillRect(cx, L[cl][3] - 56, 34, 62); }
      const zh = (t0, str, y, size, px, col) => { const p = prog(lt, t0, t0 + 0.5); if (p > 0) ptxt(c, str, 90, y, { size, px, color: col, typeP: E.outCubic(p), glow: 12 }); };
      zh(1.0, '魏泽鲍姆的 ELIZA', 1230, 60, 5, G);
      zh(2.4, '它只会把你的话换个说法，', 1380, 64, 4, '#B8FFD0');
      zh(3.4, '人们却向它倾诉心事。', 1490, 64, 4, G);
      c.restore(); c.restore();
    },
    post(c, lt, d, t, buf) { scanlines(c, 0.5); grain(c, t, 0.06, 1, 'screen'); fxChroma(buf, 2.5); resetCtx(c); c.globalAlpha = 0.04 + h2(Math.floor(t * 30), 3) * 0.04; c.fillStyle = '#000'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; vignette(c, 0.6); },
  });
})();

/* ---------- S11 · 1969 "Perceptrons": the XOR verdict (72–76) ---------- */
(() => {
  const s = 72;
  yseg(72, 72.4, 1966, 1969);
  cue(s + 0.3, 'fall'); cue(s + 0.7, 'slam', { big: 1 }); kick(s + 0.7, 26, 7);
  [1.25, 1.65, 2.05].forEach(x => cue(s + x, 'err', { v: 0.6 }));
  cue(s + 2.45, 'hit', { v: 0.8 }); kick(s + 2.45, 12);
  cue(s + 3.2, 'wind', { dur: 4.8, fadeIn: 0.8 });
  scene({
    id: 'minsky', s, e: 76, tin: 0.45, trans: 'crtOff', ink: '#E8E8E8', hud: 1,
    draw(c, lt, d, t) {
      bg(c, '#0B0B0C');
      // book
      const fall = E.inQuad(prog(lt, 0.3, 0.7)), by = lerp(-900, 0, fall) + Math.sin(prog(lt, 0.7, 0.95) * Math.PI) * -18;
      c.save(); c.translate(290, 760 + by); c.rotate(-0.08);
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(-180, -250, 380, 540);
      c.fillStyle = '#DCD3C0'; c.fillRect(-195, -265, 380, 530); c.fillStyle = '#141414'; c.fillRect(-195, -265, 380, 120);
      txt(c, 'PERCEPTRONS', -5, -180, { size: 44, fam: F.swiss, weight: 900, color: '#DCD3C0', align: 'center', mode: 'none', ls: 2 });
      c.strokeStyle = '#141414'; c.lineWidth = 3; for (let k = 1; k < 7; k++) { c.beginPath(); c.arc(-5, 60, k * 22, -Math.PI * 0.9, Math.PI * (0.1 + k * 0.12)); c.stroke(); }
      txt(c, 'Marvin Minsky', -5, 200, { size: 26, fam: F.swiss, weight: 700, color: '#141414', align: 'center', mode: 'none' });
      txt(c, 'Seymour Papert', -5, 236, { size: 26, fam: F.swiss, weight: 700, color: '#141414', align: 'center', mode: 'none' });
      c.restore();
      const dust = prog(lt, 0.7, 1.4);
      if (dust > 0 && dust < 1) { c.fillStyle = `rgba(220,210,190,${0.6 * (1 - dust)})`; for (let i = 0; i < 40; i++) { const a = h2(i, 1) * Math.PI, sp = 120 + h2(i, 2) * 380; c.beginPath(); c.arc(290 + Math.cos(a) * sp * dust * (h2(i, 3) > 0.5 ? 1 : -1), 1030 - Math.sin(a) * sp * 0.4 * dust, 3 + h2(i, 4) * 6, 0, TAU); c.fill(); } }
      // XOR plot
      const px = 580, py = 540, pw = 400, ph = 400, pa = E.outCubic(prog(lt, 0.9, 1.2));
      c.save(); c.globalAlpha = pa;
      c.strokeStyle = '#6F6F74'; c.lineWidth = 3; c.beginPath(); c.moveTo(px, py); c.lineTo(px, py + ph); c.lineTo(px + pw, py + ph); c.stroke();
      txt(c, 'x₁', px + pw + 10, py + ph + 10, { size: 32, fam: F.mono, color: '#9A9AA0', mode: 'none' });
      txt(c, 'x₂', px - 50, py + 10, { size: 32, fam: F.mono, color: '#9A9AA0', mode: 'none' });
      const P = [[0, 0, 0], [1, 1, 0], [0, 1, 1], [1, 0, 1]];
      for (const [a, b, cl] of P) { const x = px + 70 + a * 260, y = py + ph - 70 - b * 260; if (cl) { c.fillStyle = AMBER; c.beginPath(); c.arc(x, y, 30, 0, TAU); c.fill(); } else { c.strokeStyle = '#E8E8E8'; c.lineWidth = 6; c.beginPath(); c.arc(x, y, 27, 0, TAU); c.stroke(); } }
      txt(c, 'XOR · 异或', px + pw / 2, py + ph + 70, { size: 34, weight: 700, color: '#9A9AA0', align: 'center', mode: 'none' });
      // a straight line keeps trying, and keeps failing
      const tries = [[1.1, -0.35, 0.3], [1.5, 0.6, -0.1], [1.9, -1.2, 0.05]];
      for (const [t0, ang, dx] of tries) {
        const k = prog(lt, t0, t0 + 0.4); if (k <= 0 || lt > t0 + 0.55) continue;
        const cx = px + pw / 2 + dx * 200, cy = py + ph / 2, a = ang + (k - 0.5) * 0.5;
        c.strokeStyle = '#FF4D5E'; c.lineWidth = 5; c.beginPath(); c.moveTo(cx - Math.cos(a) * 320, cy - Math.sin(a) * 320); c.lineTo(cx + Math.cos(a) * 320, cy + Math.sin(a) * 320); c.stroke();
      }
      c.restore();
      const xp = prog(lt, 2.45, 2.65);
      if (xp > 0) { c.save(); c.translate(px + pw / 2, py + ph / 2); const sc = lerp(2, 1, E.outExpo(xp)); c.scale(sc, sc); c.globalAlpha = clamp(xp * 3); c.strokeStyle = '#FF4D5E'; c.lineWidth = 26; c.lineCap = 'round'; c.beginPath(); c.moveTo(-150, -150); c.lineTo(150, 150); c.moveTo(150, -150); c.lineTo(-150, 150); c.stroke(); c.restore(); }
      lin(c, lt, 0.05, '1969', 90, 390, { size: 180, fam: F.mono, weight: 600, color: '#F2F2F2', spread: 0.3 });
      lin(c, lt, 0.2, '明斯基 & 佩珀特《感知机》', 96, 455, { size: 40, weight: 500, color: '#A6A6AC' });
      lin(c, lt, 1.9, '单层感知机，', 90, 1300, { size: 70, weight: 900, color: '#F2F2F2' });
      lin(c, lt, 2.2, '连「异或」都学不会。', 90, 1400, { size: 70, weight: 900, color: '#F2F2F2' });
      lin(c, lt, 2.9, '神经网络研究，几乎停摆。', 90, 1540, { size: 50, weight: 700, color: '#9FC2E0' });
      const cold = prog(lt, 3.2, 4.0);
      if (cold > 0) { c.fillStyle = `rgba(40,80,120,${0.35 * cold})`; c.fillRect(0, 0, W, H); snow(c, t, 120, 0.6, cold * 0.8); }
    },
    post(c, lt, d, t) { grain(c, t, 0.06); vignette(c, 0.4); },
  });
})();

/* ---------- S12 · 冬: the first AI winter, and the buffering joke (76–84) ---------- */
const ICE = { bg0: '#0F1C29', bg1: '#1D2E3E', ink: '#DCEBF7', ice: '#9FD3FF', dim: '#8FA9BC' };
(() => {
  const s = 76;
  cue(s, 'act', { n: 3 }); yseg(76, 76.5, 1969, 1973); yseg(78.4, 78.6, 1973, 1974); yseg(78.6, 83.8, 1974, 1980, 'step');
  cue(s + 1.4 + 1.5, 'freeze');
  for (let k = 0; k < 10; k++) cue(s + 4.0 + k * 0.4, 'tick', { v: 0.18, hi: 1 });
  const ACT = { ch: '冬', num: '第 三 章', en: 'III · The Winter', years: '1973 — 1993', bg: '#0C1620', fg: '#D6E9F5', sub: ICE.dim, seed: 11, over: (c, lt) => { snow(c, 76 + lt, 200, 0.8, 0.8); frost(c, 0.35 + lt * 0.25, 0.8); } };
  scene({
    id: 'winter1', s, e: 84, ink: ICE.ink, hud: lt => lt > 1.4 ? 1 : 0,
    draw(c, lt, d, t) {
      if (lt < 1.4) return actCard(c, lt, ACT);
      const u = lt - 1.4, buffering = u > 2.6;
      vgrad(c, ICE.bg0, ICE.bg1);
      c.save(); c.globalAlpha = 0.35; c.fillStyle = '#C9D6E0'; c.beginPath(); c.arc(760, 640, 200, 0, TAU); c.fill(); c.restore();
      glow(c, 760, 640, 420, '#9FB8CC', 0.25);
      const tq = buffering ? Math.floor(t * 5) / 5 : t;
      snow(c, tq, 300, 0.9, 0.9, 0.3);
      frost(c, clamp(u / 2.6), 0.9);
      lin(c, u, 0.0, '1973', 90, 390, { size: 200, fam: F.mono, weight: 600, color: ICE.ink, spread: 0.3, t1: 2.5 });
      lin(c, u, 0.2, '莱特希尔报告 · 英国', 96, 460, { size: 40, weight: 500, color: ICE.dim, t1: 2.5 });
      lin(c, u, 0.45, '承诺太多，', 90, 1000, { size: 96, weight: 900, color: '#fff', t1: 2.4 });
      lin(c, u, 0.85, '兑现太少。', 90, 1120, { size: 96, weight: 900, color: '#fff', t1: 2.45 });
      const fr = lin(c, u, 1.5, '经费冻结。', 90, 1290, { size: 96, weight: 900, color: ICE.ice, t1: 2.5, stroke: '#EAF6FF', strokeW: 2 });
      if (fr && u > 2.05 && u < 2.5) { const sh = (u * 1.6) % 1; c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.rect(90 + sh * 600, 1180, 60, 140); c.clip(); txt(c, '经费冻结。', 90, 1290, { size: 96, weight: 900, color: '#fff', mode: 'none' }); c.restore(); }
      if (buffering) {
        const b = E.outCubic(prog(u, 2.6, 2.9));
        c.fillStyle = `rgba(5,10,16,${0.55 * b})`; c.fillRect(0, 0, W, H);
        c.save(); c.globalAlpha = b;
        const step = Math.floor(t * 12) % 12;
        for (let k = 0; k < 12; k++) { const a = k / 12 * TAU - Math.PI / 2, age = (step - k + 12) % 12; c.fillStyle = `rgba(230,242,255,${Math.max(0.12, 1 - age / 9)})`; c.beginPath(); c.arc(540 + Math.cos(a) * 80, 820 + Math.sin(a) * 80, 13, 0, TAU); c.fill(); }
        txt(c, '正在缓冲…', 540, 1000, { size: 44, weight: 500, color: '#B8CCDA', align: 'center', mode: 'none', ls: 4 });
        txt(c, String(Math.round(yearAt(t))), 540, 1150, { size: 120, fam: F.mono, weight: 600, color: '#EAF4FF', align: 'center', mode: 'none' });
        const pct = lerp(0.96, 0.99, prog(u, 2.6, 5.0));
        c.fillStyle = 'rgba(234,244,255,0.18)'; c.fillRect(240, 1200, 600, 8); c.fillStyle = '#EAF4FF'; c.fillRect(240, 1200, 600 * pct, 8);
        txt(c, Math.floor(pct * 100) + '%', 850, 1212, { size: 28, fam: F.mono, color: '#B8CCDA', mode: 'none' });
        c.restore();
        lin(c, u, 2.9, '第一次 AI 寒冬', 540, 1480, { size: 92, weight: 900, color: '#fff', align: 'center' });
        lin(c, u, 3.2, '1974 — 1980', 540, 1565, { size: 40, fam: F.mono, color: ICE.dim, align: 'center', ls: 6 });
      }
    },
    post(c, lt, d, t) { grain(c, t, 0.05); vignette(c, 0.35); },
  });
})();

/* ---------- S13 · 1980s expert systems: amber rules (84–88) ---------- */
const RULES = (() => {
  const r = rng(80), C = ['发烧', '咳嗽', '体温>38.5', '压力>40', '库存<10', '订单=急', '型号=VAX', '电压<5V', '年龄>60', '白细胞↑', '温度>90', '信用=A'];
  const D = ['感染', '换零件', '加急', '配置RK07', '报警', '批准', '拒绝', '转人工', '停机检查', '开青霉素'];
  const out = [];
  for (let i = 0; i < 44; i++) { const a = C[Math.floor(r() * C.length)], b = C[Math.floor(r() * C.length)], d = D[Math.floor(r() * D.length)]; out.push(`R${String(100 + Math.floor(r() * 899)).padStart(4, '0')} IF ${a} AND ${b} THEN ${d} ${(0.5 + r() * 0.49).toFixed(2)}`); }
  return out;
})();
(() => {
  const s = 84, A = '#FFB000', AD = '#7A4E00';
  yseg(84, 84.4, 1980, 1982);
  scene({
    id: 'expert', s, e: 88, tin: 0.3, trans: 'glitch', ink: A, hud: 1,
    draw(c, lt, d, t) {
      bg(c, '#120A00');
      const off = 260 * lt + 120 * lt * lt;
      for (let i = 0; i < RULES.length; i++) {
        const y = ((i * 66 - off) % (RULES.length * 66) + RULES.length * 66) % (RULES.length * 66) - 40;
        if (y < -40 || y > H + 40) continue;
        ptxt(c, RULES[i], 60, y, { size: 34, px: 3, color: i % 5 === 0 ? A : AD, fam: F.sans, weight: 700 });
      }
      c.fillStyle = 'rgba(18,10,0,0.93)'; c.fillRect(40, 190, 1000, 560); c.strokeStyle = A; c.lineWidth = 4; c.strokeRect(40, 190, 1000, 560);
      const ap = t => E.outCubic(prog(lt, t, t + 0.35));
      ptxt(c, '1980 年代', 90, 350, { size: 130, px: 6, color: A, alpha: ap(0.05), glow: 14 });
      ptxt(c, '专家系统', 90, 500, { size: 100, px: 6, color: A, alpha: ap(0.25), glow: 14 });
      ptxt(c, '把专家的经验，', 90, 610, { size: 56, px: 4, color: '#FFD27A', alpha: ap(0.6) });
      ptxt(c, '写成成千上万条规则。', 90, 690, { size: 56, px: 4, color: '#FFD27A', alpha: ap(0.9) });
      const hp = ap(2.1);
      if (hp > 0) {
        c.fillStyle = 'rgba(18,10,0,0.93)'; c.fillRect(40, 1480, 1000, 300); c.strokeStyle = A; c.strokeRect(40, 1480, 1000, 300);
        ptxt(c, 'AI，又热了起来。', 90, 1600, { size: 76, px: 5, color: A, alpha: hp, glow: 14 });
        const bars = Math.floor(clamp((lt - 2.2) / 1.2) * 12);
        for (let k = 0; k < 12; k++) { c.fillStyle = k < bars ? (k > 8 ? '#FF5A1F' : A) : '#3A2400'; c.fillRect(90 + k * 76, 1660, 60, 70); }
      }
    },
    post(c, lt, d, t) { scanlines(c, 0.4); grain(c, t, 0.05, 1, 'screen'); vignette(c, 0.5); },
  });
})();

/* ---------- S14 · 1986 backpropagation (88–94) ---------- */
const NET = (() => {
  const sizes = [4, 6, 6, 3], L = sizes.map((n, li) => Array.from({ length: n }, (_, i) => [lerp(200, 880, n === 1 ? 0.5 : i / (n - 1)), 1450 - li * 262]));
  const edges = []; for (let li = 0; li < 3; li++) for (let a = 0; a < sizes[li]; a++) for (let b = 0; b < sizes[li + 1]; b++) edges.push({ li, a, b, w0: h2(li * 100 + a * 10 + b, 1), w1: h2(li * 100 + a * 10 + b, 2) });
  return { L, edges };
})();
(() => {
  const s = 88;
  yseg(88, 88.4, 1982, 1986);
  for (let li = 0; li < 3; li++) cue(s + 0.6 + li * 0.45, 'blip', { v: 0.5, p: li + 2 });
  cue(s + 2.05, 'err', { v: 0.8 }); kick(s + 2.05, 8);
  cue(s + 2.4, 'rev', { dur: 1.5 });
  for (let li = 0; li < 3; li++) cue(s + 4.1 + li * 0.35, 'blip', { v: 0.5, p: li + 4 });
  cue(s + 5.2, 'chime');
  const CY = '#5CE1FF', RD = '#FF4D5E', GR = '#7CF2A6';
  scene({
    id: 'backprop', s, e: 94, ink: '#DDE9F6', hud: 1,
    draw(c, lt) {
      bg(c, '#07111D');
      const bw = prog(lt, 2.4, 3.9);
      for (const e of NET.edges) {
        const [x1, y1] = NET.L[e.li][e.a], [x2, y2] = NET.L[e.li + 1][e.b];
        const ep = E.outCubic(prog(lt, 0.1 + e.li * 0.12, 0.45 + e.li * 0.12)); if (ep <= 0) continue;
        const segB = prog(lt, 2.4 + (2 - e.li) * 0.5, 2.9 + (2 - e.li) * 0.5), w = lerp(e.w0, e.w1, E.inOutCubic(segB));
        c.strokeStyle = segB > 0 && segB < 1 ? mixHex('#8FB3D9', RD, 0.6) : '#8FB3D9'; c.globalAlpha = 0.18 + w * 0.5; c.lineWidth = 1 + w * 5;
        c.beginPath(); c.moveTo(x1, y1); c.lineTo(lerp(x1, x2, ep), lerp(y1, y2, ep)); c.stroke();
      }
      c.globalAlpha = 1;
      const pulse = (li, k, col, down) => { for (const e of NET.edges) { if (e.li !== li) continue; const [x1, y1] = NET.L[li][e.a], [x2, y2] = NET.L[li + 1][e.b]; const kk = down ? 1 - k : k; const x = lerp(x1, x2, kk), y = lerp(y1, y2, kk); glow(c, x, y, 26, col, 0.8); } };
      for (let li = 0; li < 3; li++) {
        const f1 = prog(lt, 0.6 + li * 0.45, 1.05 + li * 0.45); if (f1 > 0 && f1 < 1) pulse(li, f1, CY, false);
        const b1 = prog(lt, 2.4 + (2 - li) * 0.5, 2.9 + (2 - li) * 0.5); if (b1 > 0 && b1 < 1) pulse(li, b1, RD, true);
        const f2 = prog(lt, 4.1 + li * 0.35, 4.45 + li * 0.35); if (f2 > 0 && f2 < 1) pulse(li, f2, GR, false);
      }
      NET.L.forEach((layer, li) => layer.forEach(([x, y], i) => {
        const np = E.outBack(prog(lt, li * 0.12, li * 0.12 + 0.3)); if (np <= 0) return;
        const lit = lt > 0.6 + li * 0.45 && lt < 2.4 ? 1 : 0, lit2 = lt > 4.1 + li * 0.35 ? 1 : 0;
        c.fillStyle = '#0C1B2C'; c.strokeStyle = lit2 ? GR : lit ? CY : '#8FB3D9'; c.lineWidth = 5;
        c.beginPath(); c.arc(x, y, 28 * np, 0, TAU); c.fill(); c.stroke();
        if (lit || lit2) glow(c, x, y, 60, lit2 ? GR : CY, 0.35);
      }));
      const out = NET.L[3];
      if (lt > 1.95) {
        const good = lt > 5.1, err = lt > 2.05 && lt < 4.1;
        out.forEach(([x, y], i) => txt(c, good ? ['0.97', '0.02', '0.01'][i] : ['0.31', '0.44', '0.25'][i], x, y - 50, { size: 36, fam: F.mono, weight: 600, color: good ? GR : '#DDE9F6', align: 'center', mode: 'none' }));
        if (err) txt(c, '误差 · 目标 1.00', 540, 560, { size: 44, weight: 900, color: RD, align: 'center', p: prog(lt, 2.05, 2.3), mode: 'pop' });
        if (good) txt(c, '✓ 命中', 540, 560, { size: 60, fam: F.mono, weight: 600, color: GR, align: 'center', p: prog(lt, 5.1, 5.35), mode: 'pop' });
      }
      if (lt > 2.4 && lt < 4.0 && Math.floor(lt * 3) % 2 === 0) {
        c.fillStyle = '#FF9AA4'; for (const ox of [0, 34]) { c.beginPath(); c.moveTo(960 + ox, 200); c.lineTo(930 + ox, 218); c.lineTo(960 + ox, 236); c.closePath(); c.fill(); }
        txt(c, 'REW', 870, 236, { size: 44, fam: F.crt, color: '#FF9AA4', mode: 'none', align: 'right' });
      }
      lin(c, lt, 0.0, '1986', 90, 380, { size: 150, fam: F.pixel, weight: 700, color: '#DDE9F6' });
      lin(c, lt, 0.2, '鲁梅尔哈特 · 辛顿 · 威廉姆斯', 96, 450, { size: 38, weight: 500, color: '#8FA9C4' });
      lin(c, lt, 2.5, '让误差沿着网络倒流，', 90, 1580, { size: 64, weight: 900, color: '#fff' });
      lin(c, lt, 3.0, '一层一层，修正自己。', 90, 1675, { size: 64, weight: 900, color: '#fff' });
      const nm = lin(c, lt, 4.4, '论文作者之一：杰弗里·辛顿', 90, 1780, { size: 38, weight: 500, color: '#9FB6CC' });
      if (nm) lin(c, lt, 4.9, '（记住这个名字）', 90 + nm.width + 10, 1780, { size: 38, weight: 700, color: AMBER });
    },
    post(c, lt, d, t) { grain(c, t, 0.05); vignette(c, 0.4); },
  });
})();

/* ---------- S15 · 1987 the crash, 1989 the ember (94–100) ---------- */
let wallCv = null;
function rulesWall() {
  if (wallCv) return wallCv;
  wallCv = mk(W, H); const c = wallCv.getContext('2d'); c.fillStyle = '#120A00'; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 29; i++) ptxt(c, RULES[i % RULES.length], 60, 60 + i * 66, { size: 34, px: 3, color: i % 5 === 0 ? '#FFB000' : '#7A4E00', fam: F.sans, weight: 700 });
  return wallCv;
}
let digitCache = null;
function digits() {
  if (digitCache) return digitCache;
  digitCache = Array.from('07733').map((d, k) => {
    const cv = mk(16, 16), x = cv.getContext('2d'); x.fillStyle = '#fff'; x.translate(8, 8); x.rotate((h2(k, 3) - 0.5) * 0.3); x.font = '15px "Ma Shan Zheng"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(d, (h2(k, 4) - 0.5) * 2, 1);
    const id = x.getImageData(0, 0, 16, 16).data, g = []; for (let i = 0; i < 256; i++) g.push(id[i * 4 + 3] / 255); return { d, g };
  });
  return digitCache;
}
(() => {
  const s = 94, BS = 60;
  yseg(94, 94.4, 1986, 1987); yseg(96.9, 97.3, 1987, 1989);
  cue(s + 0.2, 'shatter'); kick(s + 0.25, 16); cue(s + 0.9, 'wind', { dur: 5.1, fadeIn: 0.5 }); cue(s + 1.2, 'freeze');
  for (let k = 0; k < 4; k++) { cue(s + 2.6 + k * 0.95, 'heart'); cue(s + 2.6 + k * 0.95 + 0.22, 'heart', { v: 0.6 }); }
  for (let k = 0; k < 5; k++) cue(s + 3.9 + k * 0.2, 'blip', { v: 0.45, p: k + 3 });
  scene({
    id: 'crash', s, e: 100, ink: ICE.ink, hud: 1,
    draw(c, lt, d, t) {
      if (lt < 2.5) {
        vgrad(c, '#0B1420', '#16222F');
        snow(c, t, Math.floor(80 + lt * 100), 1.2, clamp((lt - 0.6) * 2), 0.6);
        const wall = rulesWall();
        for (let by = 0; by < H; by += BS) for (let bx = 0; bx < W; bx += BS) {
          const delay = 0.15 + h2(bx, by) * 0.9 + (1 - by / H) * 0.25, k = lt - delay;
          if (k > 2) continue;
          const kk = Math.max(0, k), dy = 1400 * kk * kk, dx = (h2(bx + 1, by) - 0.5) * 300 * kk, rot = (h2(bx, by + 1) - 0.5) * 5 * kk;
          c.save(); c.translate(bx + BS / 2 + dx, by + BS / 2 + dy); c.rotate(rot); c.globalAlpha = 1 - clamp(kk * 1.2);
          c.drawImage(wall, bx, by, BS, BS, -BS / 2, -BS / 2, BS, BS); c.restore();
        }
        frost(c, clamp((lt - 0.8) / 1.4), 0.9);
        lin(c, lt, 0.5, '1987', 90, 390, { size: 150, fam: F.pixel, weight: 700, color: '#EAF4FF', t1: 2.2 });
        lin(c, lt, 0.65, '专家系统泡沫破裂', 96, 460, { size: 42, weight: 700, color: ICE.dim, t1: 2.2 });
        lin(c, lt, 1.15, '第二次 AI 寒冬', 540, 1000, { size: 104, weight: 900, color: '#fff', align: 'center', t1: 2.15 });
        return;
      }
      const u = lt - 2.5;
      vgrad(c, '#05090F', '#0B131D');
      snow(c, t, 220, 0.5, 0.8, 0.2);
      frost(c, 1, 0.75);
      const beat = (u + 0.4) % 0.95, hb = Math.exp(-beat * 9) + 0.6 * Math.exp(-Math.max(0, beat - 0.22) * 9) * (beat > 0.22 ? 1 : 0);
      glow(c, 540, 860, 190 + hb * 90, AMBER, 0.55 + hb * 0.4);
      glow(c, 540, 860, 60, '#FFE2A8', 0.9);
      c.fillStyle = '#FFF1D6'; c.beginPath(); c.arc(540, 860, 9 + hb * 3, 0, TAU); c.fill();
      lin(c, u, 0.2, '但总有人，没有离开。', 540, 620, { size: 68, weight: 900, color: '#F2F6FA', align: 'center' });
      const dg = digits(), px = 9, dw = 16 * px, gap = 24, total = 5 * dw + 4 * gap, x0 = 540 - total / 2, y0 = 1010;
      dg.forEach((dd, k) => {
        const ap = E.outCubic(prog(u, 0.9 + k * 0.12, 1.3 + k * 0.12)); if (ap <= 0) return;
        for (let i = 0; i < 256; i++) { const v = dd.g[i]; if (v < 0.05) continue; c.fillStyle = `rgba(255,226,168,${v * ap * 0.95})`; c.fillRect(x0 + k * (dw + gap) + (i % 16) * px, y0 + Math.floor(i / 16) * px, px - 1, px - 1); }
        const rp = prog(u, 1.4 + k * 0.2, 1.6 + k * 0.2);
        if (rp > 0) txt(c, dd.d, x0 + k * (dw + gap) + dw / 2, y0 + dw + 80, { size: 60, fam: F.mono, weight: 600, color: AMBER, align: 'center', p: rp, mode: 'pop' });
      });
      lin(c, u, 0.8, '1989', 90, 390, { size: 150, fam: F.pixel, weight: 700, color: '#EAF4FF' });
      lin(c, u, 0.95, '杨立昆 · 贝尔实验室', 96, 460, { size: 42, weight: 700, color: ICE.dim });
      lin(c, u, 1.9, '卷积网络，读懂了手写邮编。', 540, 1480, { size: 62, weight: 900, color: '#fff', align: 'center' });
    },
    post(c, lt, d, t) { grain(c, t, 0.05); vignette(c, 0.45); },
  });
})();
