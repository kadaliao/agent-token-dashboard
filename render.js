// offline renderer: N browser pages render disjoint frame ranges -> x264 segments -> concat + mux
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs');
const FF = process.env.FFMPEG || 'ffmpeg';  // needs libx264 + aac
const FPS = +(process.env.FPS || 30), WORKERS = +(process.env.WORKERS || 4), T0 = +(process.env.T0 || 0), T1 = +(process.env.T1 || 176), SCALE = +(process.env.SCALE || 1);
const OUT = process.env.OUT || 'film.mp4', Q = +(process.env.JPEGQ || 0.94);
(async () => {
  const browser = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY }, args: ['--ignore-certificate-errors'] } : {});
  const f0 = Math.round(T0 * FPS), f1 = Math.round(T1 * FPS), total = f1 - f0, per = Math.ceil(total / WORKERS);
  const start = Date.now(); let done = 0;
  await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
    const a = f0 + w * per, b = Math.min(f1, a + per); if (a >= b) return;
    const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
    page.on('pageerror', e => console.log('PAGEERROR', e.message));
    await page.addInitScript(s => { window.__RENDER__ = true; window.__SCALE__ = s; }, SCALE);
    await page.goto('file://' + __dirname + '/film-local.html'); await page.evaluate(() => FILM.ready);
    const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-threads', '1', `seg_${w}.mp4`]);
    for (let f = a; f < b; f++) {
      const url = await page.evaluate(([t, q]) => FILM.jpeg(t, q), [f / FPS, Q]);
      if (!ff.stdin.write(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
      done++; if (done % 300 === 0) { const el = (Date.now() - start) / 1000; console.log(`${done}/${total} frames  ${(done / el).toFixed(1)} fps  eta ${((total - done) / (done / el) / 60).toFixed(1)} min`); }
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r)); await page.close();
  }));
  await browser.close();
  fs.writeFileSync('segs.txt', Array.from({ length: WORKERS }, (_, w) => `file 'seg_${w}.mp4'`).filter((_, w) => fs.existsSync(`seg_${w}.mp4`)).join('\n'));
  const args = ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', 'segs.txt'];
  if (fs.existsSync('soundtrack.wav') && !process.env.NOAUDIO) args.push('-ss', String(T0), '-t', String(T1 - T0), '-i', 'soundtrack.wav', '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest');
  args.push('-c:v', 'copy', '-movflags', '+faststart', OUT);
  await new Promise(r => spawn(FF, args, { stdio: 'inherit' }).on('close', r));
  console.log('wrote', OUT, 'in', ((Date.now() - start) / 60000).toFixed(1), 'min');
})();
