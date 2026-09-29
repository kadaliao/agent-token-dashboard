"""逐句配音 + 逐字时间对齐。

输入  src/script.json
输出  audio/lines/<id>.wav（48k 单声道，已修剪首尾静音）
      audio/lines.json    {id: {dur, chars: [每个字在句内的秒数], src: 缓存文件名}}
缓存  audio/cache/<hash>.mp3（按模型+音色+语速+文本）

旁白没改动的句子直接用缓存和已有对齐，不调用任何 API；改了的句子才需要 OPENROUTER_API_KEY。
用法：python3 tools/build_voice.py [句子id ...]   # 指定 id 则强制重配这些句子
"""
import json, hashlib, os, re, subprocess, sys, wave, difflib
import concurrent.futures as cf
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
from or_tts import speech
from or_stt import transcribe

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
os.makedirs(P("audio/cache"), exist_ok=True)
os.makedirs(P("audio/lines"), exist_ok=True)

script = json.load(open(P("src/script.json")))
V = script["voice"]
lines = [l for ch in script["chapters"] for l in ch["lines"]]
only = set(sys.argv[1:])
OLD_PATH = P("audio/lines.json")
old = json.load(open(OLD_PATH)) if os.path.exists(OLD_PATH) else {}

def key(l):
    h = hashlib.sha1(json.dumps([V["model"], V["voice"], V.get("speed", 1.0), l["say"]], ensure_ascii=False).encode()).hexdigest()[:16]
    return P("audio/cache", f"{h}.mp3")

def synth(l):
    f = key(l)
    if not os.path.exists(f) or l["id"] in only:
        speech(l["say"], V["model"], V["voice"], out=f, speed=V.get("speed"))
    return l["id"], f

def decode(f):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

def trim(x, thr_db=-42, pre=0.03, post=0.09):
    win = int(0.01 * SR)
    n = len(x) // win
    rms = np.sqrt(np.mean(x[: n * win].reshape(n, win) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms + 1e-12)
    idx = np.where(db > thr_db)[0]
    if len(idx) == 0: return x
    a = max(0, idx[0] * win - int(pre * SR)); b = min(len(x), (idx[-1] + 1) * win + int(post * SR))
    y = x[a:b].copy()
    fade = int(0.008 * SR)
    y[:fade] *= np.linspace(0, 1, fade); y[-fade:] *= np.linspace(1, 0, fade)
    return y

def write_wav(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())

is_tok = lambda c: bool(re.match(r"[一-鿿0-9A-Za-z]", c))

def align(say, words, dur):
    """把 say 的每个字对到时间；识别结果里对不上的（如 30万 vs 三十万）按相邻已对上的字插值。"""
    wc, wt = [], []
    for w in words:
        s = [c for c in w["word"] if is_tok(c)]
        if not s: continue
        a, b = float(w["start"]), float(w["end"])
        for k, c in enumerate(s):
            wc.append(c); wt.append(a + (b - a) * k / len(s))
    toks = [(i, c) for i, c in enumerate(say) if is_tok(c)]
    sc = [c for _, c in toks]
    t = [None] * len(sc)
    for m in difflib.SequenceMatcher(None, sc, wc, autojunk=False).get_matching_blocks():
        for k in range(m.size): t[m.a + k] = wt[m.b + k]
    known = [(i, v) for i, v in enumerate(t) if v is not None]
    if not known:
        t = [dur * i / max(1, len(sc)) for i in range(len(sc))]
    else:
        pts = [(-1, 0.0)] + known + [(len(sc), dur)]
        for i in range(len(sc)):
            if t[i] is None:
                lo = max(p for p in pts if p[0] < i); hi = min(p for p in pts if p[0] > i)
                t[i] = lo[1] + (hi[1] - lo[1]) * (i - lo[0]) / (hi[0] - lo[0])
    # 单调化
    for i in range(1, len(t)): t[i] = max(t[i], t[i - 1])
    out, j = [], 0
    for i, c in enumerate(say):
        if is_tok(c): out.append(round(t[j], 3)); j += 1
        else: out.append(round(t[j] if j < len(t) else dur, 3))
    matched = len(known) / max(1, len(sc))
    return out, matched

def process(item):
    lid, f = item
    l = next(x for x in lines if x["id"] == lid)
    y = trim(decode(f))
    wav = P("audio/lines", f"{lid}.wav"); write_wav(wav, y)
    dur = len(y) / SR
    src = os.path.basename(f)
    o = old.get(lid)
    if o and o.get("src") == src and lid not in only:
        return lid, o
    r = transcribe(wav, model="openai/whisper-large-v3")
    chars, matched = align(l["say"], r.get("words") or [], dur)
    return lid, {"dur": round(dur, 3), "chars": chars, "asr": r.get("text", ""), "matched": round(matched, 3), "src": src}

with cf.ThreadPoolExecutor(6) as ex:
    synthed = list(ex.map(synth, lines))
with cf.ThreadPoolExecutor(6) as ex:
    res = dict(ex.map(process, synthed))

json.dump(res, open(P("audio/lines.json"), "w"), ensure_ascii=False, indent=1)
tot = sum(v["dur"] for v in res.values()); nch = sum(len(re.sub(r"[^一-鿿]", "", l["say"])) for l in lines)
for l in lines:
    v = res[l["id"]]
    flag = "" if v["matched"] > 0.85 else "  <-- 对齐偏低"
    print(f'{l["id"]:4s} {v["dur"]:5.2f}s  match {v["matched"]:.2f}{flag}  | {v["asr"]}')
print(f"total speech {tot:.1f}s, {nch} 字, {nch / tot:.2f} 字/秒")
