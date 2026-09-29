// 静帧：node src/still.mjs out.png t1 t2 ...（多个时间拼成 2 列联系表，便于检查）
import { Canvas } from 'skia-canvas';
import { W, H } from './engine.mjs';
import { drawFrame } from './frame.mjs';
import { lines, cue, S } from './timeline.mjs';
const [out, ...ts] = process.argv.slice(2);
// 时间可写秒数，或 id / id+偏移 / id@关键词
const parse = (s) => {
  if (/^[\d.]+$/.test(s)) return +s;
  const m = s.match(/^([a-z]+\d*)(?:@([^+\-]+))?([+\-][\d.]+)?$/);
  const base = m[2] ? cue(m[1], m[2]) : S(m[1]);
  return base + (m[3] ? +m[3] : 0);
};
const times = ts.map(parse);
const cols = times.length === 1 ? 1 : 2, rows = Math.ceil(times.length / cols), sc = cols === 1 ? 1 : 0.5;
const sheet = new Canvas(W * sc * cols, H * sc * rows), sg = sheet.getContext('2d');
const cv = new Canvas(W, H), ctx = cv.getContext('2d');
times.forEach((t, i) => {
  ctx.clearRect(0, 0, W, H); drawFrame(ctx, t);
  sg.drawImage(cv, (i % cols) * W * sc, Math.floor(i / cols) * H * sc, W * sc, H * sc);
  if (cols > 1) { sg.fillStyle = 'rgba(0,0,0,.6)'; sg.fillRect((i % cols) * W * sc, Math.floor(i / cols) * H * sc, 150, 30); sg.fillStyle = '#ff0'; sg.font = '20px Sans'; sg.fillText(`${ts[i]} ${t.toFixed(2)}s`, (i % cols) * W * sc + 6, Math.floor(i / cols) * H * sc + 21); }
});
await sheet.toFile(out);
console.log('wrote', out, times.map((t) => t.toFixed(2)).join(' '));
