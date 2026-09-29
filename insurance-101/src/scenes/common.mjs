// 跨章节复用的图形：资金池、图标
import { C, E, TAU, clamp, lerp, inv, rgba, glow, text, rr, fmtNum, polyline } from '../engine.mjs';

/** 资金池：玻璃圆 + 金色液面（level 0..1） */
export function pool(ctx, cx, cy, r, level, t, alpha = 1, o = {}) {
  if (alpha <= 0.002) return;
  const { liquid = [C.gold2, C.amber], glowHex = C.gold } = o;
  glow(ctx, cx, cy, r * 2.6, glowHex, (0.08 + 0.3 * level) * alpha);
  ctx.save(); ctx.globalAlpha = alpha;
  // 容器底色
  const bg = ctx.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r);
  bg.addColorStop(0, 'rgba(40,52,84,0.55)'); bg.addColorStop(1, 'rgba(12,18,34,0.75)');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  // 液体
  if (level > 0.001) {
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r - 5, 0, TAU); ctx.clip();
    const surf = cy + r - level * 2 * r;
    const amp = 5 + 5 * Math.sin(t * 0.7);
    ctx.beginPath(); ctx.moveTo(cx - r, cy + r);
    for (let x = -r; x <= r; x += 6) ctx.lineTo(cx + x, surf + Math.sin(x * 0.028 + t * 2.1) * amp * 0.6 + Math.sin(x * 0.051 - t * 1.4) * amp * 0.4);
    ctx.lineTo(cx + r, cy + r); ctx.closePath();
    const lg = ctx.createLinearGradient(0, surf, 0, cy + r);
    lg.addColorStop(0, rgba(liquid[0], 0.95)); lg.addColorStop(1, rgba(liquid[1], 0.85));
    ctx.fillStyle = lg; ctx.fill();
    // 液面高光
    ctx.strokeStyle = rgba('#FFFFFF', 0.35); ctx.lineWidth = 2; ctx.beginPath();
    for (let x = -r; x <= r; x += 6) { const y = surf + Math.sin(x * 0.028 + t * 2.1) * amp * 0.6 + Math.sin(x * 0.051 - t * 1.4) * amp * 0.4; x === -r ? ctx.moveTo(cx + x, y) : ctx.lineTo(cx + x, y); }
    ctx.stroke();
    ctx.restore();
  }
  // 玻璃边与反光
  ctx.strokeStyle = rgba(C.ink, 0.45); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba('#FFFFFF', 0.22); ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy, r - 16, Math.PI * 1.08, Math.PI * 1.38); ctx.stroke();
  ctx.restore();
}

/** 小图标（线性），s≈尺寸 */
export function icon(ctx, name, x, y, s, o = {}) {
  const { color = C.ink, alpha = 1, p = 1, width = Math.max(2, s * 0.07) } = o;
  if (alpha <= 0.002 || p <= 0) return;
  const L = (pts, q = p) => polyline(ctx, pts.map(([a, b]) => [x + a * s, y + b * s]), q, { color, width, alpha });
  const arc = (cx, cy, r, a0, a1, q = p) => {
    const n = 28, pts = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    L(pts, q);
  };
  switch (name) {
    case 'chart': L([[-0.45, 0.45], [-0.45, -0.45]]); L([[-0.45, 0.45], [0.45, 0.45]]);
      L([[-0.3, 0.2], [-0.05, -0.05], [0.12, 0.1], [0.4, -0.3]]); break;
    case 'in': arc(0, 0.1, 0.32, 0, TAU); L([[0, -0.55], [0, -0.05]]); L([[-0.15, -0.2], [0, -0.05], [0.15, -0.2]]); break;
    case 'out': arc(0, 0.1, 0.32, 0, TAU); L([[0, -0.05], [0, -0.55]]); L([[-0.15, -0.4], [0, -0.55], [0.15, -0.4]]); break;
    case 'plus': L([[0, -0.4], [0, 0.4]]); L([[-0.4, 0], [0.4, 0]]); break;
    case 'bolt': L([[0.1, -0.5], [-0.25, 0.05], [0.05, 0.05], [-0.1, 0.5], [0.3, -0.1], [0, -0.1], [0.1, -0.5]]); break;
    case 'heart': {
      const pts = []; for (let i = 0; i <= 60; i++) { const a = (i / 60) * TAU; const hx = 16 * Math.sin(a) ** 3, hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); pts.push([hx / 36, hy / 36 + 0.05]); }
      L(pts); break;
    }
    case 'umbrella': arc(0, 0, 0.5, Math.PI, TAU); L([[-0.5, 0], [0.5, 0]]); L([[0, 0], [0, 0.45], [-0.12, 0.52]]); break;
    case 'house': L([[-0.45, -0.02], [0, -0.45], [0.45, -0.02]]); L([[-0.32, -0.12], [-0.32, 0.45], [0.32, 0.45], [0.32, -0.12]]); break;
    case 'shield': L([[0, -0.5], [0.42, -0.32], [0.38, 0.12], [0, 0.5], [-0.38, 0.12], [-0.42, -0.32], [0, -0.5]]); break;
    case 'doc': L([[-0.35, -0.48], [0.2, -0.48], [0.38, -0.3], [0.38, 0.48], [-0.35, 0.48], [-0.35, -0.48]]); L([[-0.2, -0.15], [0.22, -0.15]]); L([[-0.2, 0.05], [0.22, 0.05]]); L([[-0.2, 0.25], [0.1, 0.25]]); break;
    case 'check': L([[-0.4, 0], [-0.1, 0.3], [0.45, -0.35]]); break;
    case 'cross': L([[-0.35, -0.35], [0.35, 0.35]]); L([[0.35, -0.35], [-0.35, 0.35]]); break;
    case 'coin': arc(0, 0, 0.42, 0, TAU); L([[-0.14, -0.2], [0, -0.02], [0.14, -0.2]]); L([[0, -0.02], [0, 0.25]]); L([[-0.14, 0.05], [0.14, 0.05]]); break;
    case 'bed': L([[-0.5, 0.3], [-0.5, -0.25]]); L([[-0.5, 0.1], [0.5, 0.1], [0.5, 0.3]]); L([[-0.2, 0.1], [-0.2, -0.1], [0.45, -0.1], [0.5, 0.1]]); arc(-0.36, -0.06, 0.09, 0, TAU); break;
    case 'wallet': L([[-0.45, -0.25], [0.45, -0.25], [0.45, 0.35], [-0.45, 0.35], [-0.45, -0.25]]); L([[0.45, -0.02], [0.18, -0.02], [0.18, 0.14], [0.45, 0.14]]); break;
    case 'pen': L([[-0.4, 0.4], [-0.3, 0.1], [0.3, -0.5], [0.45, -0.35], [-0.15, 0.25], [-0.4, 0.4]]); break;
  }
}

/** 数字格式 ¥ */
export const yuan = (n) => '¥ ' + fmtNum(n);
