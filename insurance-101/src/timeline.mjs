// 旁白 → 全片时间轴。画面用 S(id) / END(id) / cue(id, '关键词') 对点。
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './engine.mjs';

const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/script.json'), 'utf8'));
const audio = JSON.parse(fs.readFileSync(path.join(ROOT, 'audio/lines.json'), 'utf8'));

export const INTRO = 1.6;        // 片头：黑场渐亮
export const CARD = 3.6;         // 章节卡时长（无旁白）
// 某句之后额外留给画面的时间（秒）
const HOLD = { o5: 3.8, a7: 0.4, a10: 0.9, b7: 1.0, c11: 1.2, d9: 1.2, e4: 1.4, f4: 8.5 };

export const lines = {};
export const chapters = {};
const order = [];
let t = INTRO;
for (const ch of script.chapters) {
  const c = { id: ch.id, card: ch.card || null, start: t };
  if (ch.card) { c.cardStart = t; c.cardEnd = t + CARD; t += CARD; }
  c.body = t;
  for (const l of ch.lines) {
    const a = audio[l.id];
    if (!a) throw new Error(`no audio for ${l.id}`);
    const gap = l.gap ?? (/[，、]$/.test(l.say) ? 0.28 : 0.5);
    const L = { ...l, chapter: ch.id, start: t, dur: a.dur, end: t + a.dur, chars: a.chars.map((x) => t + x) };
    lines[l.id] = L; order.push(L);
    t = L.end + gap + (HOLD[l.id] || 0);
  }
  c.end = t; chapters[ch.id] = c;
}
export const TOTAL = t;
export const ORDER = order;
export const META = { title: script.title, subtitle: script.subtitle };

export const S = (id) => { if (!lines[id]) throw new Error(`line ${id}?`); return lines[id].start; };
export const END = (id) => { if (!lines[id]) throw new Error(`line ${id}?`); return lines[id].end; };
/** 关键词开口时刻；n 为第几次出现；frac 可取词内比例（0 开头，1 词尾） */
export function cue(id, key, n = 0, frac = 0) {
  const L = lines[id]; if (!L) throw new Error(`line ${id}?`);
  let i = -1; for (let k = 0; k <= n; k++) { i = L.say.indexOf(key, i + 1); if (i < 0) throw new Error(`cue "${key}" not in ${id}: ${L.say}`); }
  const a = L.chars[i], j = Math.min(L.chars.length - 1, i + key.length);
  const b = i + key.length >= L.say.length ? L.end : L.chars[j];
  return a + (b - a) * frac;
}
/** 关键词读完时刻 */
export const cueEnd = (id, key, n = 0) => cue(id, key, n, 1);

// ---------- 字幕分段 ----------
const PUNCT = /[，。；：？！、]/;
function clauses(s) {
  const out = []; let cur = '', idx = 0, st = 0;
  for (const ch of s) {
    if (cur === '') st = idx;
    cur += ch; idx += ch.length;
    if (PUNCT.test(ch)) { out.push({ s: cur, i: st }); cur = ''; }
  }
  if (cur.trim()) out.push({ s: cur, i: st });
  return out;
}
const vlen = (s) => [...s].reduce((a, c) => a + (/[一-鿿，。；：？！、]/.test(c) ? 1 : 0.55), 0);
const clean = (s) => s.replace(/[，。；]$/g, '').replace(/[，。；]/g, '　').trim();

export const SUBS = [];
for (const L of order) {
  const cs = clauses(L.say), ds = clauses(L.sub || L.say);
  if (cs.length !== ds.length) throw new Error(`字幕分句数不一致 ${L.id}: ${cs.length} vs ${ds.length}`);
  const chunks = []; let cur = null;
  cs.forEach((c, k) => {
    const d = ds[k].s;
    if (cur && vlen(cur.text + d) <= 21 && !/[。？！]$/.test(cur.text)) { cur.text += d; }
    else { cur = { text: d, at: c.i }; chunks.push(cur); }
  });
  chunks.forEach((ck, k) => {
    const start = L.chars[ck.at] - 0.06;
    const end = k + 1 < chunks.length ? L.chars[chunks[k + 1].at] - 0.06 : L.end + 0.3;
    SUBS.push({ id: L.id, text: clean(ck.text), start, end });
  });
}
// 相邻字幕首尾不重叠
for (let i = 0; i + 1 < SUBS.length; i++) SUBS[i].end = Math.min(SUBS[i].end, SUBS[i + 1].start - 0.02);
