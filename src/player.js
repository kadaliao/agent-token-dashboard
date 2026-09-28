/* ============================================================
   boot: font loading, offline render API, live player
   ============================================================ */
(() => {
  YSEG.sort((a, b) => a.t0 - b.t0);
  CUES.sort((a, b) => a.t - b.t);
  const FAMS = [
    ['Ma Shan Zheng', [400]], ['Noto Serif SC', [400, 700, 900]], ['Noto Sans SC', [300, 400, 500, 700, 900]],
    ['Bodoni Moda', [400, 700, 900], true], ['Special Elite', [400]], ['IBM Plex Mono', [400, 600]], ['VT323', [400]],
    ['Silkscreen', [400, 700]], ['Archivo', [400, 500, 700, 900]], ['Anton', [400]], ['ZCOOL QingKe HuangYou', [400]],
    ['Unbounded', [400, 700, 900]], ['JetBrains Mono', [400, 700]], ['Noto Sans Symbols 2', [400]], ['UnifrakturMaguntia', [400]], ['Noto Sans KR', [700]],
  ];
  const srcEl = document.getElementById('film-src');
  const chars = Array.from(new Set(Array.from((srcEl ? srcEl.textContent : '') + 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'))).join('');
  async function loadFonts() {
    const jobs = [];
    for (const [fam, ws, ital] of FAMS) for (const w of ws) {
      jobs.push(document.fonts.load(`${w} 40px "${fam}"`, chars).catch(() => null));
      if (ital && w === 400) jobs.push(document.fonts.load(`italic ${w} 40px "${fam}"`, chars).catch(() => null));
    }
    await Promise.race([Promise.all(jobs), new Promise(r => setTimeout(r, 20000))]);
    await document.fonts.ready;
  }
  const canvas = document.getElementById('film');
  const ready = loadFonts().then(() => { initCanvases(canvas, window.__SCALE__ || 1); initFX(); buildFrost(); wCache.clear(); });
  window.FILM = {
    duration: DURATION, cues: CUES, scenes: SCENES.map(s => ({ id: s.id, s: s.s, e: s.e })), ready,
    frame(t) { render(t); },
    jpeg(t, q = 0.93) { render(t); return canvas.toDataURL('image/jpeg', q); },
    scale(s) { initCanvases(canvas, s); },
    sheet(times, cols = 6, scale = 0.3) {
      initCanvases(canvas, scale);
      const cw2 = Math.round(W * scale), ch2 = Math.round(H * scale), rows = Math.ceil(times.length / cols);
      const sh = document.createElement('canvas'); sh.width = cols * (cw2 + 8) + 8; sh.height = rows * (ch2 + 34) + 8;
      const x = sh.getContext('2d'); x.fillStyle = '#222'; x.fillRect(0, 0, sh.width, sh.height);
      times.forEach((t, i) => {
        render(t); const cx = 8 + (i % cols) * (cw2 + 8), cy = 8 + Math.floor(i / cols) * (ch2 + 34);
        x.drawImage(canvas, cx, cy); x.fillStyle = '#fff'; x.font = '20px monospace'; x.fillText(t.toFixed(2) + 's', cx + 4, cy + ch2 + 24);
      });
      return sh.toDataURL('image/png');
    },
  };
  if (window.__RENDER__) return;

  /* ---------- live player ---------- */
  const $ = id => document.getElementById(id);
  const audio = $('audio'), stage = $('stage'), playBtn = $('play'), bigPlay = $('bigplay'), scrub = $('scrub'), tc = $('tc'), marks = $('marks');
  let playing = false, clockT = 0, clockBase = 0, lastRender = -1, scale = 0.6, slow = 0, frames = 0;
  const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const CH = [['梦', 12], ['问', 44], ['冬', 76], ['醒', 100], ['涌', 122], ['终', 156]];
  for (const [n, t] of CH) { const b = document.createElement('button'); b.className = 'mark'; b.textContent = n; b.style.left = (t / DURATION * 100) + '%'; b.title = fmt(t); b.onclick = () => seek(t + 0.01); marks.appendChild(b); }
  function pickScale() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    return clamp(Math.round((r.width * dpr / W) * 20) / 20, 0.3, 1);
  }
  function now() { return playing ? (audioOK() ? audio.currentTime : clockT + (performance.now() - clockBase) / 1000) : clockT; }
  const audioOK = () => audio && audio.readyState >= 2 && !audio.error;
  function seek(t) {
    t = clamp(t, 0, DURATION - 0.05); clockT = t; clockBase = performance.now();
    try { audio.currentTime = t; } catch (e) { }
    lastRender = -1; draw(true);
  }
  function play() {
    if (now() >= DURATION - 0.1) seek(0);
    playing = true; clockBase = performance.now(); stage.classList.add('on'); playBtn.setAttribute('aria-label', '暂停'); playBtn.dataset.state = 'pause';
    const p = audio.play(); if (p) p.catch(() => { });
    loop();
  }
  function pause() { clockT = now(); playing = false; audio.pause(); playBtn.setAttribute('aria-label', '播放'); playBtn.dataset.state = 'play'; }
  function draw(force) {
    const t = now();
    if (!force && Math.abs(t - lastRender) < 1 / 90) return;
    const t0 = performance.now(); render(t); const dt = performance.now() - t0; lastRender = t;
    if (playing) { frames++; if (dt > 30) slow++; if (frames > 45) { if (slow > 20 && scale > 0.32) { scale = Math.max(0.3, scale * 0.8); initCanvases(canvas, scale); } frames = 0; slow = 0; } }
    scrub.value = String(t / DURATION * 1000); tc.textContent = `${fmt(t)} / ${fmt(DURATION)}`;
    scrub.style.setProperty('--p', (t / DURATION * 100) + '%');
  }
  function loop() {
    if (!playing) return;
    draw();
    if (now() >= DURATION - 0.02) { pause(); clockT = DURATION - 0.02; }
    requestAnimationFrame(loop);
  }
  playBtn.onclick = () => playing ? pause() : play();
  bigPlay.onclick = () => play();
  canvas.addEventListener('click', () => { if (stage.classList.contains('on')) playing ? pause() : play(); });
  scrub.addEventListener('input', () => { seek(scrub.value / 1000 * DURATION); });
  $('fs').onclick = () => {
    const el = $('stagewrap');
    try { const p = document.fullscreenElement ? document.exitFullscreen() : (el.requestFullscreen ? el.requestFullscreen() : null); if (p && p.catch) p.catch(() => { }); } catch (e) { }
  };
  document.addEventListener('keydown', e => {
    if (e.target === scrub && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); playing ? pause() : play(); }
    if (e.key === 'ArrowRight') seek(now() + 5); if (e.key === 'ArrowLeft') seek(now() - 5);
  });
  window.addEventListener('resize', () => { const s2 = pickScale(); if (Math.abs(s2 - scale) > 0.12) { scale = s2; initCanvases(canvas, scale); draw(true); } });
  ready.then(() => {
    scale = pickScale(); initCanvases(canvas, scale); stage.classList.add('ready');
    clockT = 49.9; draw(true); clockT = 0;
    scrub.value = '0'; scrub.style.setProperty('--p', '0%'); tc.textContent = `0:00 / ${fmt(DURATION)}`;
  });
})();
