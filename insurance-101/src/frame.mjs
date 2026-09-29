// 单帧合成：背景 → 各章画面 → 章节卡/角标 → 字幕 → 后期
import { background, chapterCard, kicker, subtitles, post } from './layers.mjs';
import { SCENES } from './scenes/index.mjs';
export function drawFrame(ctx, t) {
  ctx.save();
  background(ctx, t);
  for (const sc of SCENES) if (t >= sc.from && t <= sc.to) { ctx.save(); sc.draw(ctx, t); ctx.restore(); }
  chapterCard(ctx, t);
  kicker(ctx, t);
  subtitles(ctx, t);
  post(ctx, t);
  ctx.restore();
}
