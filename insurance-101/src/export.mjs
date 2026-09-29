// 导出给混音用的时间轴：旁白位置、章节卡、音效点、配乐强度锚点
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './engine.mjs';
import { ORDER, chapters, TOTAL, S, END, cue, SUBS } from './timeline.mjs';

const fx = [];
const add = (t, type, gain = 1) => fx.push({ t: +t.toFixed(3), type, gain });

// 开场
add(cue('o1', '一张') - 0.3, 'rise', 0.5);
add(cue('o1', '落到', 0, 0.6), 'impact', 0.8);
add(cue('o2', '拿得'), 'stamp', 0.5);
add(cue('o3', '一旦落下', 0, 0.3), 'zap', 0.8);
add(cue('o3', '掏空'), 'crumble', 0.7);
add(cue('o4', '大损失'), 'boom', 0.55);
add(cue('o5', '保险'), 'shimmer', 0.9);
// 章节卡
for (const c of Object.values(chapters)) if (c.card) { add(c.cardStart + 0.05, 'whoosh', 0.55); add(c.cardStart + 0.45, 'chime', 0.55); }
// 第一章
add(cue('a2', '一个人'), 'pop', 0.5);
for (let k = 0; k < 12; k++) add(S('a3') + k * 0.13, 'tick', 0.18);
{ const a = cue('a5', '放进'), b = cue('a6', '三十万'); for (let k = 0; k < 26; k++) add(a + ((b - a) * k) / 26 + 0.4, 'sparkle', 0.22); add(b, 'ding', 0.7); }
add(cue('a7', '病倒'), 'pop', 0.45);
add(cue('a7', '拿到'), 'whoosh', 0.4);
add(cue('a7', '拿到') + 1.0, 'chime', 0.4);
add(cue('a9', '大数法则'), 'chime', 0.45);
['算概率', '收保费', '做理赔'].forEach((k) => add(cue('a10', k), 'pop', 0.35));
// 第二章
{ const a = cue('b1', '几年'), b = cue('b1', '犯嘀咕'); for (let i = 0; i < 5; i++) add(a - 0.3 + ((b - a) * i) / 4 + 0.55, 'coin', 0.4); }
add(cue('b1', '犯嘀咕'), 'pop', 0.4);
add(cue('b3', '最坏的事'), 'zap', 0.6);
add(S('b4'), 'rewind', 0.45);
add(S('b4') + 0.7, 'chime', 0.35);
add(cue('b5', '保费退给你'), 'whoosh', 0.3);
add(S('b7') - 0.1, 'whoosh', 0.45);
// 第三章
['看病', '大病', '意外', '顶梁柱'].forEach((k) => add(cue('c2', k), 'whoosh', 0.35));
add(cue('c3', '医保'), 'thud', 0.5);
['起付线', '报销比例', '封顶线', '目录外'].forEach((k) => add(cue('c4', k), 'tick', 0.35));
add(cue('c5', '花多少') - 0.2, 'sweep', 0.45);
add(cue('c6', '免赔额'), 'pop', 0.35);
[END('c6') + 0.35, END('c8') + 0.35, cue('c9', '意外险'), cue('c10', '定期寿险')].forEach((t) => add(t + 0.1, 'shield', 0.55));
add(cue('c7', '一次性赔'), 'impact', 0.55);
add(cue('c8', '那几年收入'), 'sparkle', 0.4);
add(cue('c10', '定期寿险') + 2.2, 'swell', 0.35);
add(cue('c11', '医疗险'), 'pop', 0.35); add(cue('c11', '重疾险'), 'pop', 0.35);
// 第四章
for (const [m, n] of [['d1', 'd2'], ['d3', 'd4'], ['d5', 'd6'], ['d8', 'd9']]) { add(S(m) - 0.1, 'pop', 0.35); add(END(m), 'strike', 0.5); }
add(cue('d2', '先保大人'), 'shield', 0.4);
add(cue('d4', '远超'), 'rise', 0.35);
add(cue('d6', '没有如实告知'), 'zap', 0.5);
add(cue('d7', '如实回答') + 0.5, 'stamp', 0.32);
add(cue('d7', '因病出险'), 'pop', 0.35);
add(cue('d9', '一份保额充足'), 'shield', 0.5);
// 第五章
['医保打底', '先配医疗险', '配重疾险'].forEach((k) => add(cue('e2', k), 'thud', 0.4));
['保什么', '不保什么', '怎样才能赔'].forEach((k) => add(cue('e4', k), 'pop', 0.3));
add(cue('e4', '再签字'), 'pen', 0.4);
// 尾声
add(cue('f2', '难处'), 'drop', 0.5);
add(cue('f2', '拉他一把') + 0.1, 'shimmer', 0.7);
add(END('f4') + 0.4, 'shimmer', 0.8);

const data = {
  total: TOTAL,
  lines: ORDER.map((l) => ({ id: l.id, start: l.start, end: l.end, file: `audio/lines/${l.id}.wav` })),
  cards: Object.values(chapters).filter((c) => c.card).map((c) => ({ id: c.id, start: c.cardStart, end: c.cardEnd })),
  chapters: Object.values(chapters).map((c) => ({ id: c.id, start: c.start, end: c.end })),
  anchors: { title: cue('o5', '保险'), pool: cue('a6', '三十万'), keyline: S('a8'), pull: cue('f2', '拉他一把'), answer: END('f4') + 0.4, endStart: chapters.end.start },
  sfx: fx.sort((a, b) => a.t - b.t),
};
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'out/timeline.json'), JSON.stringify(data, null, 1));
// 同时导出字幕 SRT（便于平台上传外挂字幕）
const ts = (x) => { const ms = Math.round(x * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
fs.writeFileSync(path.join(ROOT, 'out/字幕.srt'), SUBS.map((s, i) => `${i + 1}\n${ts(s.start)} --> ${ts(s.end)}\n${s.text.replace(/　/g, ' ')}\n`).join('\n'));
console.log(`timeline: ${TOTAL.toFixed(2)}s, ${data.lines.length} lines, ${fx.length} sfx, ${SUBS.length} subs`);
