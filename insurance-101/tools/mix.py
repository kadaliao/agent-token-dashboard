"""配乐 + 音效 + 旁白混音（纯 numpy 合成）。

输入  out/timeline.json、audio/lines/*.wav
输出  out/music.wav（仅配乐+音效，便于单独调）、out/mix.wav（最终 48k 立体声，未做响度标准化）
"""
import json, os, wave, sys
import numpy as np

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
TL = json.load(open(P("out/timeline.json")))
TOTAL = TL["total"] + 0.5
N = int(TOTAL * SR)
rng = np.random.default_rng(2026)

def db(x): return 10 ** (x / 20)
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)

def read_wav(p):
    with wave.open(p) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(np.float32) / 32768
        if w.getnchannels() == 2: x = x.reshape(-1, 2).mean(axis=1)
    return x

def write_wav(p, x):
    x = np.clip(x, -1, 1)
    with wave.open(p, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype("<i2").tobytes())

def fft_filter(x, lo=None, hi=None, order=2):
    """零相位频域滤波（高通 lo / 低通 hi，Butterworth 幅度响应）"""
    n = len(x); X = np.fft.rfft(x, axis=0); f = np.fft.rfftfreq(n, 1 / SR)
    g = np.ones_like(f)
    if hi: g *= 1 / np.sqrt(1 + (f / hi) ** (2 * order))
    if lo: g *= 1 / np.sqrt(1 + (np.maximum(f, 1e-3) / lo) ** (-2 * order))
    if x.ndim == 2: g = g[:, None]
    return np.fft.irfft(X * g, n=n, axis=0)

def svf(x, fc, q=0.7, mode="bp"):
    """时变状态变量滤波（fc 可为数组），用于扫频"""
    fc = np.broadcast_to(np.asarray(fc, dtype=np.float64), x.shape)
    y = np.zeros_like(x); lp = bp = 0.0; damp = 1 / q
    for i in range(len(x)):
        f = 2 * np.sin(np.pi * min(fc[i], SR / 6) / SR)
        hp = x[i] - lp - damp * bp
        bp += f * hp; lp += f * bp
        y[i] = bp if mode == "bp" else lp if mode == "lp" else hp
    return y

def env_ar(n, a, r, curve=3.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) * curve / max(r, 1e-4))
    return e

def pan(x, p=0.0):
    l, r = np.cos((p + 1) * np.pi / 4), np.sin((p + 1) * np.pi / 4)
    return np.stack([x * l, x * r], axis=1)

# ---------------- 混响（分块 FFT 卷积） ----------------
def make_ir(sec=3.6, decay=0.55, bright=5500, seed=1):
    r = np.random.default_rng(seed); n = int(sec * SR); t = np.arange(n) / SR
    ir = np.zeros((n, 2))
    for c in range(2):
        noise = r.standard_normal(n)
        # 越往后越暗：低通版本与原版按时间交叉
        dark = fft_filter(noise, hi=1800); bri = fft_filter(noise, hi=bright)
        k = np.exp(-t / 0.6)
        ir[:, c] = (bri * k + dark * (1 - k)) * np.exp(-t / decay)
    pre = int(0.018 * SR); ir = np.concatenate([np.zeros((pre, 2)), ir])[:n]
    ir /= np.sqrt((ir ** 2).sum(axis=0)).max()
    return ir

def convolve(x, ir, block=1 << 17):
    """x: (n,2), ir: (m,2) → (n+m-1,2)，左右各自卷积"""
    n, m = len(x), len(ir); L = block; nfft = 1 << int(np.ceil(np.log2(L + m - 1)))
    H = np.fft.rfft(ir, n=nfft, axis=0)
    y = np.zeros((n + m - 1, 2))
    for s in range(0, n, L):
        seg = x[s:s + L]
        Y = np.fft.irfft(np.fft.rfft(seg, n=nfft, axis=0) * H, n=nfft, axis=0)
        e = min(len(y), s + nfft); y[s:e] += Y[: e - s]
    return y

# ---------------- 乐器 ----------------
TABLE_N = 4096
def wavetable(fc_harm=10, tilt=1.25):
    ph = np.arange(TABLE_N) / TABLE_N
    return sum((1 / h ** tilt) * np.sin(2 * np.pi * h * ph) for h in range(1, fc_harm + 1))
PAD_TABLE = wavetable(9, 1.35); PAD_TABLE /= np.abs(PAD_TABLE).max()

def pad_note(freq, n, t0_phase=0.0):
    t = np.arange(n) / SR; out = np.zeros((n, 2))
    for k, cents in enumerate([-8, 0, 7]):
        f = freq * 2 ** (cents / 1200)
        ph = (f * t + rng.random()) % 1.0
        v = np.interp(ph * TABLE_N, np.arange(TABLE_N), PAD_TABLE)
        lfo = 1 + 0.18 * np.sin(2 * np.pi * (0.07 + 0.05 * rng.random()) * t + rng.random() * 6)
        out += pan(v * lfo, [-0.6, 0.0, 0.6][k])
    return out / 3

def bell(freq, dur=3.0, bright=1.0):
    n = int(dur * SR); t = np.arange(n) / SR
    parts = [(1, 1, 2.8), (2.0, 0.35 * bright, 1.6), (3.0, 0.18 * bright, 1.0), (4.16, 0.1 * bright, 0.6), (5.43, 0.06 * bright, 0.4)]
    x = sum(a * np.sin(2 * np.pi * freq * m * t + rng.random() * 6) * np.exp(-t * 3 / d) for m, a, d in parts)
    x *= np.minimum(1, t / 0.004)
    return x

CH = {  # 和弦（MIDI）
    "Dmaj9": [50, 57, 61, 64, 66], "Bm9": [47, 54, 57, 61, 62], "Gmaj9": [43, 50, 54, 57, 59],
    "Asus2": [45, 52, 59, 61, 64], "Em9": [40, 52, 55, 59, 62], "F#m7": [42, 54, 57, 61, 64],
}

def chord_plan():
    cards = {c["id"]: c for c in TL["cards"]}
    chs = {c["id"]: c for c in TL["chapters"]}
    A = TL["anchors"]
    plan = []
    # 开场：悬念 → 片名处解决到 D
    plan += [(0.0, 9.5, "Bm9"), (9.5, 16.0, "Gmaj9"), (16.0, A["title"] - 0.3, "Asus2"), (A["title"] - 0.3, chs["ch1"]["start"], "Dmaj9")]
    cyc = {"ch1": ["Dmaj9", "Bm9", "Gmaj9", "Asus2"], "ch2": ["Gmaj9", "Dmaj9", "Em9", "Asus2"], "ch3": ["Dmaj9", "Gmaj9", "Bm9", "Asus2"],
           "ch4": ["Bm9", "Gmaj9", "Em9", "F#m7"], "ch5": ["Dmaj9", "Gmaj9", "Bm9", "Asus2"]}
    for cid in ["ch1", "ch2", "ch3", "ch4", "ch5"]:
        a, b = chs[cid]["start"], chs[cid]["end"]
        seq = cyc[cid]; t = a; k = 0; step = 8.4
        while t < b - 0.1:
            e = min(b, t + step)
            if b - e < 3.0: e = b
            plan.append((t, e, seq[k % len(seq)])); t = e; k += 1
    a, b = chs["end"]["start"], TOTAL
    ans = A["answer"]
    plan += [(a, a + 6.5, "Gmaj9"), (a + 6.5, a + 12.5, "Asus2"), (a + 12.5, ans - 4.5, "Bm9"), (ans - 4.5, ans - 0.2, "Asus2"), (ans - 0.2, b, "Dmaj9")]
    return plan

def build_music():
    pad = np.zeros((N, 2)); sub = np.zeros(N); bells = np.zeros((N, 2))
    plan = chord_plan()
    for (a, b, name) in plan:
        notes = CH[name]
        att, rel = 1.6, 2.6
        s0 = int(max(0, a - 0.4) * SR); n = int((b - a + 0.4 + rel) * SR)
        n = min(n, N - s0)
        if n <= 0: continue
        t = np.arange(n) / SR; dur = b - a + 0.4
        e = np.minimum(1, t / att) * np.clip(1 - (t - dur) / rel, 0, 1)
        seg = np.zeros((n, 2))
        for i, m in enumerate(notes):
            seg += pad_note(mtof(m + 12 if i >= 3 else m), n) * (0.7 if i == 0 else 0.5)
        pad[s0:s0 + n] += seg * e[:, None]
        sub[s0:s0 + n] += np.sin(2 * np.pi * mtof(notes[0] - 12 if notes[0] > 45 else notes[0]) * t) * e * 0.5
        # 钟琴点缀：稀疏、在和弦音上方
        dens = 1.0
        tt = a + 0.6 + rng.random() * 1.2
        while tt < b - 0.2:
            m = notes[rng.integers(1, len(notes))] + (24 if rng.random() < 0.5 else 12)
            x = bell(mtof(m), 3.2, 0.8) * (0.5 + 0.5 * rng.random())
            s = int(tt * SR); e2 = min(N, s + len(x))
            bells[s:e2] += pan(x[: e2 - s], rng.uniform(-0.7, 0.7))
            tt += (2.2 + rng.random() * 2.6) / dens
    pad = fft_filter(pad, lo=90, hi=2400)
    sub = fft_filter(sub, hi=160)
    music = pad * 0.22 + pan(sub, 0) * 0.35 + bells * 0.055
    return music

# ---------------- 音效 ----------------
def noise(n): return rng.standard_normal(n)

def sfx(kind):
    if kind == "impact":
        n = int(1.6 * SR); t = np.arange(n) / SR
        f = 38 + 70 * np.exp(-t * 7); body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.6)
        thump = fft_filter(noise(n), hi=260) * np.exp(-t * 18) * 1.5
        return pan(body * 0.9 + thump * 0.6, 0)
    if kind == "boom":
        n = int(2.2 * SR); t = np.arange(n) / SR
        f = 42 + 40 * np.exp(-t * 4); body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.6) * np.minimum(1, t / 0.02)
        return pan(body, 0) * 0.8
    if kind == "stamp":
        n = int(0.5 * SR); t = np.arange(n) / SR
        f = 60 + 90 * np.exp(-t * 30); body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
        click = fft_filter(noise(n), lo=300, hi=2500) * np.exp(-t * 60) * 0.6
        return pan(body + click, 0.15)
    if kind == "zap":
        n = int(0.9 * SR); t = np.arange(n) / SR
        f = 200 + 1800 * np.exp(-t * 9); tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5) * 0.4
        nz = svf(noise(n), 300 + 3500 * np.exp(-t * 6), 1.2) * np.exp(-t * 5) * 0.8
        return pan(tone + nz, 0.25)
    if kind == "crumble":
        n = int(1.4 * SR); x = np.zeros(n)
        for k in range(46):
            s = int(rng.random() ** 0.7 * (n - 3000)); g = (1 - s / n) * rng.uniform(0.3, 1)
            m = int(0.006 * SR); x[s:s + m] += noise(m) * np.exp(-np.arange(m) / (0.0015 * SR)) * g
        x = fft_filter(x, lo=1500, hi=7000)
        return pan(x, 0.3) * 0.9
    if kind == "shimmer":
        out = np.zeros((int(4.5 * SR), 2))
        for i, m in enumerate([74, 78, 81, 85, 88, 90]):
            x = bell(mtof(m), 4.0, 0.6) * 0.5; s = int(i * 0.045 * SR)
            out[s:s + len(x)] += pan(x, -0.6 + i * 0.24)[: len(out) - s]
        return out
    if kind == "whoosh":
        n = int(0.9 * SR); t = np.arange(n) / SR
        e = np.sin(np.pi * np.clip(t / 0.9, 0, 1)) ** 2
        x = svf(noise(n), 350 + 2600 * (t / 0.9) ** 1.5, 0.9) * e
        return np.stack([x * (1 - t / 0.9 * 0.6), x * (0.4 + t / 0.9 * 0.6)], axis=1) * 0.7
    if kind == "chime":
        out = np.zeros((int(3.5 * SR), 2))
        for i, m in enumerate([81, 86]):
            x = bell(mtof(m), 3.2, 0.7) * 0.6; s = int(i * 0.09 * SR)
            out[s:s + len(x)] += pan(x, -0.3 + 0.6 * i)[: len(out) - s]
        return out
    if kind == "pop":
        n = int(0.25 * SR); t = np.arange(n) / SR
        f = 520 + 520 * np.exp(-t * 40); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 28)
        return pan(x, rng.uniform(-0.3, 0.3)) * 0.6
    if kind == "tick":
        n = int(0.08 * SR); t = np.arange(n) / SR
        return pan(np.sin(2 * np.pi * 2100 * t) * np.exp(-t * 90), rng.uniform(-0.4, 0.4)) * 0.6
    if kind == "sparkle":
        m = [86, 90, 93, 97][rng.integers(0, 4)]
        return pan(bell(mtof(m), 0.9, 0.4) * 0.35, rng.uniform(-0.8, 0.8))
    if kind == "ding":
        out = np.zeros((int(3.2 * SR), 2))
        for i, m in enumerate([74, 81, 86]):
            x = bell(mtof(m), 3.0, 0.8) * [0.6, 0.45, 0.35][i]; s = int(i * 0.03 * SR)
            out[s:s + len(x)] += pan(x, [-0.2, 0.2, 0][i])[: len(out) - s]
        return out
    if kind == "coin":
        n = int(0.5 * SR); t = np.arange(n) / SR
        x = (np.sin(2 * np.pi * 2637 * t) + 0.6 * np.sin(2 * np.pi * 3951 * t) + 0.3 * np.sin(2 * np.pi * 5274 * t)) * np.exp(-t * 11)
        x[: int(0.06 * SR)] *= 0.6
        return pan(x * 0.35, rng.uniform(-0.3, 0.5))
    if kind == "rewind":
        x = sfx("shimmer")[::-1][-int(1.2 * SR):]
        return x * np.linspace(0.2, 1, len(x))[:, None] * 0.6
    if kind == "sweep":
        n = int(1.4 * SR); t = np.arange(n) / SR
        e = np.sin(np.pi * t / 1.4) ** 2
        return pan(svf(noise(n), 500 + 3000 * t / 1.4, 1.5) * e * 0.5, 0)
    if kind == "shield":
        n = int(2.0 * SR); t = np.arange(n) / SR
        x = sum(np.sin(2 * np.pi * mtof(m) * t * (1 + 0.002 * k)) for k, m in enumerate([62, 69, 74, 78]))
        x = x * np.minimum(1, t / 0.01) * np.exp(-t * 2.2) * 0.25
        air = svf(noise(n), 2500 + 2000 * np.exp(-t * 4), 1.0) * np.exp(-t * 6) * 0.25
        return pan(x + air, 0)
    if kind == "thud":
        n = int(0.5 * SR); t = np.arange(n) / SR
        f = 55 + 60 * np.exp(-t * 25); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 10)
        return pan(x, 0) * 0.8
    if kind == "strike":
        n = int(0.35 * SR); t = np.arange(n) / SR
        e = np.sin(np.pi * np.clip(t / 0.3, 0, 1))
        return pan(svf(noise(n), 3500 - 2500 * t / 0.35, 2.0) * e * 0.6, 0.1)
    if kind == "rise":
        n = int(1.3 * SR); t = np.arange(n) / SR
        e = (t / 1.3) ** 2
        return pan(svf(noise(n), 300 + 2500 * (t / 1.3) ** 2, 1.2) * e * 0.5, 0)
    if kind == "pen":
        n = int(1.3 * SR); t = np.arange(n) / SR
        am = 0.5 + 0.5 * np.sin(2 * np.pi * (9 + 4 * np.sin(2 * np.pi * 1.3 * t)) * t)
        return pan(fft_filter(noise(n), lo=1800, hi=5000) * am * np.minimum(1, t / 0.05) * np.clip((1.3 - t) / 0.2, 0, 1) * 0.35, 0.3)
    if kind == "drop":
        n = int(0.8 * SR); t = np.arange(n) / SR
        f = 150 + 500 * np.exp(-t * 5); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4) * 0.5
        return pan(x, 0)
    if kind == "swell":
        n = int(2.2 * SR); t = np.arange(n) / SR
        return pan(fft_filter(noise(n), lo=400, hi=3000) * (t / 2.2) ** 3 * 0.4, 0)
    raise ValueError(kind)

def build_sfx():
    out = np.zeros((N, 2))
    cache = {}
    for ev in TL["sfx"]:
        k = ev["type"]
        x = sfx(k) if k in ("pop", "tick", "sparkle", "coin") else cache.setdefault(k, sfx(k))
        s = int(ev["t"] * SR); e = min(N, s + len(x))
        if s < 0 or s >= N: continue
        out[s:e] += x[: e - s] * ev["gain"]
    return out

# ---------------- 旁白 ----------------
def build_voice():
    v = np.zeros(N)
    for l in TL["lines"]:
        x = read_wav(P(l["file"])); s = int(l["start"] * SR); e = min(N, s + len(x))
        v[s:e] += x[: e - s]
    v = fft_filter(v, lo=70)
    return v

def follower(x, att=0.04, rel=0.5, rate=200):
    hop = SR // rate; n = len(x) // hop
    r = np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(axis=1))
    y = np.zeros(n); a = np.exp(-1 / (att * rate)); b = np.exp(-1 / (rel * rate)); s = 0.0
    for i in range(n):
        c = a if r[i] > s else b; s = c * s + (1 - c) * r[i]; y[i] = s
    return np.interp(np.arange(len(x)) / hop, np.arange(n), y)

def automation():
    """配乐整体推拉：片头渐入、章节卡与关键时刻抬升、片尾渐出"""
    t = np.arange(N) / SR; g = np.ones(N) * db(-3)
    g *= np.clip(t / 2.5, 0, 1)
    bump = lambda a, b, amt, fi=0.8, fo=1.2: np.clip(np.minimum((t - a) / fi + 1, (b - t) / fo + 1), 0, 1) * amt
    for c in TL["cards"]: g *= db(bump(c["start"], c["end"], 5.0))
    A = TL["anchors"]
    g *= db(bump(A["title"] - 0.5, A["title"] + 4.0, 5.0))
    g *= db(bump(A["answer"] - 0.8, TOTAL - 2, 6.0, 1.5, 2.5))
    g *= np.clip((TOTAL - 0.6 - t) / 3.5, 0, 1)
    return g

if __name__ == "__main__":
    print("music..."); music = build_music()
    print("sfx..."); fx = build_sfx()
    print("reverb..."); ir = make_ir()
    wet = convolve(music * 0.6 + fx * 0.35, ir)[:N]
    music_bus = music + wet * 0.55
    fx_bus = fx
    print("voice..."); voice = build_voice()
    duck = follower(voice); duck = np.clip(duck / (np.percentile(duck[duck > 1e-4], 90) + 1e-9), 0, 1)
    mg = automation() * (1 - 0.55 * duck)
    music_bus = music_bus * mg[:, None]
    # 电平：以旁白为基准
    vr = np.sqrt(np.mean(voice[voice != 0] ** 2)); voice = voice / vr * db(-20)
    mr = np.sqrt(np.mean(music_bus ** 2)); music_bus = music_bus / mr * db(-33)
    fr = np.abs(fx_bus).max(); fx_bus = fx_bus / fr * db(-14)
    fx_bus = fx_bus + wet * 0 # 音效混响已在 wet 中
    mix = pan(voice, 0) * np.sqrt(2) + music_bus + fx_bus
    peak = np.abs(mix).max()
    if peak > 0.97: mix *= 0.97 / peak
    write_wav(P("out/music.wav"), np.clip(music_bus + fx_bus, -1, 1))
    write_wav(P("out/mix.wav"), mix)
    print(f"done: {N / SR:.1f}s  peak {20 * np.log10(peak + 1e-9):.1f} dBFS")
