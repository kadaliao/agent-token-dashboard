// 并行渲染：node src/render.mjs [--from 秒] [--to 秒] [--jobs N] [--out out/video.mp4] [--crf 18]
// 子进程：node src/render.mjs --worker f0 f1 seg.mp4
import { spawn, fork } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { W, H, FPS, ROOT } from './engine.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const CRF = opt('--crf', '17');

function encoder(out) {
  return spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, '-tune', 'film', '-pix_fmt', 'yuv420p', '-g', String(FPS * 2), '-bf', '3',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', out], { stdio: ['pipe', 'inherit', 'inherit'] });
}

if (args[0] === '--worker') {
  const [f0, f1, out] = [+args[1], +args[2], args[3]];
  const { Canvas } = await import('skia-canvas');
  const { drawFrame } = await import('./frame.mjs');
  const cv = new Canvas(W, H), ctx = cv.getContext('2d');
  const ff = encoder(out);
  let last = Date.now();
  for (let f = f0; f < f1; f++) {
    ctx.clearRect(0, 0, W, H);
    drawFrame(ctx, f / FPS);
    const buf = cv.toBufferSync('raw');
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (Date.now() - last > 2000 || f === f1 - 1) { process.send?.({ done: f - f0 + 1 }); last = Date.now(); }
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  process.exit(0);
} else {
  const { TOTAL } = await import('./timeline.mjs');
  const from = +opt('--from', 0), to = Math.min(+opt('--to', TOTAL), TOTAL);
  const jobs = +opt('--jobs', 4), out = path.resolve(ROOT, opt('--out', 'out/video.mp4'));
  const F0 = Math.round(from * FPS), F1 = Math.round(to * FPS), N = F1 - F0;
  const segDir = path.join(ROOT, 'work/segs'); fs.rmSync(segDir, { recursive: true, force: true }); fs.mkdirSync(segDir, { recursive: true });
  const t0 = Date.now(), done = new Array(jobs).fill(0);
  const segs = [];
  await Promise.all(Array.from({ length: jobs }, (_, j) => new Promise((res, rej) => {
    const a = F0 + Math.floor((N * j) / jobs), b = F0 + Math.floor((N * (j + 1)) / jobs);
    const seg = path.join(segDir, `seg${String(j).padStart(2, '0')}.mp4`); segs[j] = seg;
    const cp = fork(path.join(ROOT, 'src/render.mjs'), ['--worker', a, b, seg, '--crf', CRF]);
    cp.on('message', (m) => {
      done[j] = m.done; const d = done.reduce((x, y) => x + y, 0), el = (Date.now() - t0) / 1000;
      process.stdout.write(`\r${d}/${N} frames  ${(d / el).toFixed(1)} fps  eta ${((N - d) / Math.max(1, d / el)).toFixed(0)}s   `);
    });
    cp.on('exit', (c) => (c === 0 ? res() : rej(new Error(`worker ${j} exit ${c}`))));
  })));
  const list = path.join(segDir, 'list.txt');
  fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join('\n'));
  await new Promise((r, j) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out], { stdio: 'inherit' }).on('close', (c) => (c === 0 ? r() : j(new Error('concat')))));
  console.log(`\nwrote ${out} (${N} frames, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}
