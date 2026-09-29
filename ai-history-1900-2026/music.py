"""Procedural score + sound design for 一个问题的一百二十六年.
Reads cues.json (exported from the film) so every hit lands on its frame.
120 BPM, A minor; the leitmotif Q = A4 C5 B4 E5 (a phrase that ends on a question)."""
import json, sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
DUR = 177.0
N = int(SR * DUR)
RNG = np.random.default_rng(126)
data = json.load(open('cues.json'))
CUES = data['cues']

BUS = {k: np.zeros((N, 2), np.float32) for k in ['drums', 'bass', 'music', 'lead', 'sfx', 'amb', 'keys']}
SEND = {'drums': 0.10, 'bass': 0.02, 'music': 0.30, 'lead': 0.28, 'sfx': 0.22, 'amb': 0.35, 'keys': 0.12}
GAIN = {'drums': 0.9, 'bass': 0.8, 'music': 0.62, 'lead': 0.55, 'sfx': 0.8, 'amb': 0.7, 'keys': 0.7}

# ---------------------------------------------------------------- utils
def T(d): return np.arange(max(1, int(d * SR))) / SR
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def noise(d): return RNG.standard_normal(max(1, int(d * SR)))
def sos(kind, f, order=2):
    if kind == 'bp': return butter(order, [max(20, f[0]) / (SR / 2), min(f[1], SR / 2 - 100) / (SR / 2)], 'bandpass', output='sos')
    return butter(order, min(max(f, 20), SR / 2 - 100) / (SR / 2), kind, output='sos')
def lp(x, f, o=2): return sosfilt(sos('low', f, o), x, axis=0)
def hp(x, f, o=2): return sosfilt(sos('high', f, o), x, axis=0)
def bp(x, lo, hi, o=2): return sosfilt(sos('bp', (lo, hi), o), x, axis=0)
def sweep_lp(x, f0, f1, block=512):
    """time-varying lowpass (block-wise biquad with carried state)"""
    out = np.zeros_like(x); zi = np.zeros((1, 2)); n = len(x)
    for i in range(0, n, block):
        k = i / max(1, n - 1); f = f0 * (f1 / f0) ** k
        s = sos('low', f, 2); y, zi = sosfilt(s, x[i:i + block], zi=zi); out[i:i + block] = y
    return out
def saw(freq, t, phase=0.0):
    p = (t * freq + phase) % 1.0; y = 2.0 * p - 1.0; dt = abs(freq) / SR
    if dt <= 0: return y
    m1 = p < dt; x = p[m1] / dt; y[m1] -= x + x - x * x - 1
    m2 = p > 1 - dt; x = (p[m2] - 1) / dt; y[m2] -= x * x + x + x + 1
    return y
def sq(freq, t, duty=0.5): return np.where((t * freq) % 1.0 < duty, 1.0, -1.0)
def tri(freq, t): return 2 * np.abs(saw(freq, t)) - 1
def env(d, a=0.005, dec=0.2, s=0.0, r=0.05):
    t = T(d); e = np.where(t < a, t / max(a, 1e-4), s + (1 - s) * np.exp(-(t - a) / max(dec, 1e-4)))
    rel = np.clip((d - t) / max(r, 1e-4), 0, 1); return e * rel
def pan2(x, p=0.0):
    if x.ndim == 2: return x
    return np.stack([x * np.cos((p + 1) * np.pi / 4), x * np.sin((p + 1) * np.pi / 4)], 1)
def add(bus, t, sig, g=1.0, p=0.0):
    st = pan2(sig, p).astype(np.float32) * g; i = int(round(t * SR))
    if i < 0: st = st[-i:]; i = 0
    j = min(N, i + len(st))
    if j > i: BUS[bus][i:j] += st[:j - i]

CH = {'Am': (45, [57, 60, 64]), 'F': (41, [53, 57, 60]), 'C': (48, [55, 60, 64]), 'G': (43, [55, 59, 62]), 'Em': (40, [52, 55, 59]), 'Dm': (38, [50, 53, 57]), 'A': (45, [57, 61, 64])}
PENTA = [69, 72, 74, 76, 79, 81, 84, 86]

# ---------------------------------------------------------------- instruments
def kick(v=1.0, d=0.45, tone=48):
    t = T(d); f = tone + 120 * np.exp(-t * 32); ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 6.5); click = hp(noise(0.006), 2500) * 0.35
    body[:len(click)] += click; return np.tanh(body * 1.6) * v
def snare(v=1.0, d=0.28, brush=False):
    t = T(d); tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 28) * (0.2 if brush else 0.55)
    n = bp(noise(d), 1200 if brush else 1800, 9000) * np.exp(-t * (9 if brush else 16))
    return (tone + n * (0.5 if brush else 0.8)) * v
def clap(v=1.0):
    d = 0.3; t = T(d); n = bp(noise(d), 900, 7000); e = np.zeros_like(t)
    for k, o in enumerate([0, 0.011, 0.022]): e += (t >= o) * np.exp(-(t - o).clip(0) * (140 if k < 2 else 22)) * (t >= o)
    return n * e * 0.8 * v
def hat(v=1.0, open_=False):
    d = 0.35 if open_ else 0.05; t = T(d); n = hp(noise(d), 7500); return n * np.exp(-t * (9 if open_ else 70)) * 0.5 * v
def tickwood(v=1.0, f=2400):
    d = 0.05; t = T(d); return (np.sin(2 * np.pi * f * t) * np.exp(-t * 120) + hp(noise(d), 3000) * np.exp(-t * 300) * 0.4) * v
def musicbox(m, v=1.0, d=1.4):
    f = mtof(m); t = T(d)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.9) + 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.35) + 0.12 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t / 0.07)
    s[:60] *= np.linspace(0, 1, 60); return s * v
def bellf(m, v=1.0, d=3.0, bright=1.0):
    f = mtof(m); t = T(d); s = np.zeros_like(t)
    for r, a, tau in [(1, 1, 1.8), (2.0, 0.5, 1.0), (2.76, 0.35 * bright, 0.7), (5.4, 0.2 * bright, 0.3), (8.93, 0.1 * bright, 0.15)]:
        s += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / tau)
    s[:40] *= np.linspace(0, 1, 40); return s * v * 0.5
def piano(m, v=1.0, d=3.0):
    f = mtof(m); t = T(d); s = np.zeros_like(t)
    for h in range(1, 8): s += (0.6 ** (h - 1)) * np.sin(2 * np.pi * f * h * (1 + 0.0004 * h * h) * t) * np.exp(-t * (0.9 + 0.6 * h))
    s += lp(noise(d), 2500) * np.exp(-t * 60) * 0.08; s[:30] *= np.linspace(0, 1, 30); return s * v * 0.35
def vib(m, v=1.0, d=1.6):
    f = mtof(m); t = T(d); trem = 1 + 0.25 * np.sin(2 * np.pi * 5.2 * t)
    s = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 6)) * np.exp(-t / 0.9) * trem
    s[:40] *= np.linspace(0, 1, 40); return s * v * 0.5
def pluck(m, v=1.0, d=0.35, cut=3000, wave='saw'):
    f = mtof(m); t = T(d); x = saw(f, t) + saw(f * 1.006, t, 0.3) if wave == 'saw' else sq(f, t, 0.3)
    x = lp(x * np.exp(-t * 9), cut); return x * v * 0.35
def upright(m, v=1.0, d=0.5):
    f = mtof(m); t = T(d); s = (np.sin(2 * np.pi * f * t) + 0.4 * tri(f * 2, t) * np.exp(-t * 10)) * np.exp(-t * 4.5); s[:80] *= np.linspace(0, 1, 80); return s * v * 0.7
def sawbass(m, v=1.0, d=0.25, cut=900):
    f = mtof(m); t = T(d); x = saw(f, t) + 0.6 * sq(f / 2, t); x = lp(x, cut) * env(d, 0.003, 0.18, 0.6, 0.03); return x * v * 0.45
def supersaw(ms, d, v=1.0, cut=4200, a=0.01, r=0.25, dec=0.6, s=0.7):
    t = T(d); x = np.zeros((len(t), 2))
    for m in ms:
        f = mtof(m)
        for k, det in enumerate([-0.012, -0.006, 0, 0.006, 0.012]):
            ph = RNG.random(); w = saw(f * (1 + det), t, ph); p = (k - 2) / 2.2
            x[:, 0] += w * np.cos((p + 1) * np.pi / 4); x[:, 1] += w * np.sin((p + 1) * np.pi / 4)
    x = lp(x, cut) * env(d, a, dec, s, r)[:, None]; return x * v * 0.09
def padf(ms, d, v=1.0, cut=1400, a=1.0, r=1.2):
    t = T(d); x = np.zeros((len(t), 2))
    for m in ms:
        f = mtof(m)
        for k, det in enumerate([-0.004, 0, 0.004]):
            w = saw(f * (1 + det), t, RNG.random()) * 0.6 + np.sin(2 * np.pi * f * t) * 0.4; p = (k - 1) * 0.8
            x[:, 0] += w * np.cos((p + 1) * np.pi / 4); x[:, 1] += w * np.sin((p + 1) * np.pi / 4)
    e = np.minimum(1, T(d) / a) * np.clip((d - T(d)) / r, 0, 1)
    return lp(x, cut) * e[:, None] * v * 0.08
def sinepad(ms, d, v=1.0, a=0.8, r=1.0):
    t = T(d); s = np.zeros_like(t)
    for m in ms: s += np.sin(2 * np.pi * mtof(m) * t + RNG.random() * 6) + 0.3 * np.sin(2 * np.pi * mtof(m) * 2.001 * t)
    e = np.minimum(1, t / a) * np.clip((d - t) / r, 0, 1); return s * e * v * 0.12
def theremin(notes, t0, v=0.5):
    """notes: list of (start_beat_time_abs, midi, dur). continuous glide + vibrato."""
    end = max(s + d for s, m, d in notes); d = end - t0 + 0.4; t = T(d); f = np.zeros_like(t) + mtof(notes[0][1]); amp = np.zeros_like(t)
    for s, m, dd in notes:
        i0, i1 = int((s - t0) * SR), int((s + dd - t0) * SR); target = mtof(m)
        g = int(0.06 * SR); prev = f[max(0, i0 - 1)]
        f[i0:i0 + g] = np.linspace(prev, target, len(f[i0:i0 + g])); f[i0 + g:] = target
        amp[i0:i1] = 1
    amp = lp(amp, 18); vibr = 1 + 0.006 * np.sin(2 * np.pi * 6 * t) * np.clip(t / 0.5, 0, 1)
    ph = 2 * np.pi * np.cumsum(f * vibr) / SR; s = np.sin(ph) + 0.15 * np.sin(2 * ph)
    return s * amp * v
def sub(v=1.0, d=1.6, f0=58, f1=32):
    t = T(d); f = f1 + (f0 - f1) * np.exp(-t * 3); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2) * v
def whoosh(d=0.6, v=1.0, rev=False, lo=300, hi=6000):
    x = noise(d); t = T(d); e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    y = sweep_lp(x, lo, hi) if not rev else sweep_lp(x, hi, lo)
    return hp(y, 150) * e * v * 0.5
def swell(d=1.5, v=1.0):
    t = T(d); x = hp(noise(d), 2500) * (t / d) ** 3; return sweep_lp(x, 1500, 14000) * v * 0.6
def crash(v=1.0, d=2.2):
    t = T(d); return hp(noise(d), 3000) * np.exp(-t * 2.2) * 0.35 * v
def impact(v=1.0):
    d = 2.6; t = T(d); s = sub(1.0, d, 70, 30) * 1.2 + lp(noise(d), 800) * np.exp(-t * 5) * 0.5
    return pan2(s * v) + np.stack([crash(v * 0.8, d), crash(v * 0.8, d)], 1)
def glass(v=1.0, n=26):
    d = 1.4; out = np.zeros(int(d * SR))
    for k in range(n):
        o = int(RNG.random() * 0.5 * SR); f = 2500 + RNG.random() * 5000; dd = 0.08 + RNG.random() * 0.3; t = T(dd)
        s = np.sin(2 * np.pi * f * t) * np.exp(-t / (dd / 4)); out[o:o + len(s)] += s[:len(out) - o] * 0.2
    return out * v
def typewriter(v=1.0):
    d = 0.09; t = T(d); click = bp(noise(d), 1800, 5000) * np.exp(-t * 180)
    thunk = lp(noise(d), 260) * np.exp(-t * 60) * 1.6; ring = np.sin(2 * np.pi * 2300 * t) * np.exp(-t * 90) * 0.15
    return (click + thunk + ring) * v
def keyclick(v=1.0, soft=False):
    d = 0.05; t = T(d); c = bp(noise(d), 1500, 6000) * np.exp(-t * 220); th = np.sin(2 * np.pi * 320 * t) * np.exp(-t * 80) * 0.3
    return (c + th) * v * (0.45 if soft else 0.7)
def blip(m, v=1.0, d=0.09):
    t = T(d); return np.sin(2 * np.pi * mtof(m) * t) * np.exp(-t * 35) * v * 0.5
def err(v=1.0):
    d = 0.16; t = T(d); return lp(sq(110, t) + sq(117, t), 2500) * env(d, 0.002, 1, 1, 0.02) * v * 0.18
def pop(p=0, v=1.0):
    d = 0.06; t = T(d); f = 400 + 900 * (t / d) + p * 60; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 50) * v * 0.45
def tok(v=1.0, big=False):
    d = 0.9 if big else 0.12; t = T(d)
    s = np.sin(2 * np.pi * 1150 * t) * np.exp(-t * (18 if big else 60)) * 0.6 + np.sin(2 * np.pi * 2330 * t) * np.exp(-t * 90) * 0.3
    s += lp(noise(d), 4000) * np.exp(-t * 400) * 0.6 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.5
    return s * v
def heart(v=1.0):
    d = 0.25; t = T(d); return np.sin(2 * np.pi * (52 + 30 * np.exp(-t * 30)) * t) * np.exp(-t * 16) * v
def wind(d, v=1.0, fade_in=0.8):
    x = noise(d); out = np.zeros_like(x); zi = np.zeros((1, 2)); B = 1024
    for i in range(0, len(x), B):
        tt = i / SR; f = 500 + 350 * np.sin(tt * 0.9) + 200 * np.sin(tt * 2.3 + 1)
        s = sos('bp', (f * 0.6, f * 1.8), 1); y, zi = sosfilt(s, x[i:i + B], zi=zi); out[i:i + B] = y
    t = T(d); e = np.minimum(1, t / fade_in) * np.clip((d - t) / 1.0, 0, 1); return out * e * v * 0.9
def hum(d, v=1.0):
    t = T(d); x = lp(saw(60, t) * 0.6 + np.sin(2 * np.pi * 120 * t) * 0.5 + np.sin(2 * np.pi * 180 * t) * 0.2, 500)
    e = np.minimum(1, t / 0.6) * np.clip((d - t) / 0.3, 0, 1) * (1 + 0.1 * np.sin(2 * np.pi * 3 * t)); return x * e * v * 0.35
def relay(v=1.0):
    d = 0.03; t = T(d); return (hp(noise(d), 2000) * np.exp(-t * 400) + np.sin(2 * np.pi * 1300 * t) * np.exp(-t * 200) * 0.4) * v
def powerdown(v=1.0):
    d = 1.3; t = T(d); f = 30 + 330 * np.exp(-t * 2.6); s = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * saw(f.mean(), t) * 0
    return lp(s, 1200) * np.clip((d - t) / d, 0, 1) * v * 0.5
def mech(v=1.0):
    d = 0.45; t = T(d); f = 160 + 90 * (t / d); s = lp(saw(1, t) * 0 + np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)), 1100) * (0.6 + 0.4 * np.sin(2 * np.pi * 30 * t))
    return s * np.sin(np.pi * t / d) * v * 0.18
def thunk(v=1.0):
    d = 0.12; t = T(d); return (np.sin(2 * np.pi * 130 * t) * np.exp(-t * 35) + lp(noise(d), 900) * np.exp(-t * 50) * 0.5) * v
def stab(v=1.0):
    d = 0.32; t = T(d); x = np.zeros_like(t)
    for m in [45, 52, 57, 60]: x += saw(mtof(m), t, RNG.random())
    return lp(x, 1800) * np.exp(-t * 8) * v * 0.22
def fire(v=1.0):
    d = 0.22; t = T(d); f = 200 + 1400 * np.exp(-t * 22); return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14) + hp(noise(d), 4000) * np.exp(-t * 40) * 0.3) * v * 0.5
def crackle(d, density=30, v=1.0):
    n = int(d * SR); out = np.zeros(n); k = int(density * d)
    idx = RNG.integers(0, n - 50, k)
    for i in idx: out[i:i + 30] += RNG.standard_normal(30) * np.exp(-np.arange(30) / 5) * RNG.random()
    return hp(out, 1500) * v
def projector(d, v=1.0):
    t = T(d); x = bp(noise(d), 200, 1800) * (0.55 + 0.45 * (np.sin(2 * np.pi * 24 * t) > 0.6)); e = np.minimum(1, t / 0.3) * np.clip((d - t) / 0.5, 0, 1)
    return x * e * v * 0.2
def tape_whine(d, rate):
    """rate: array of speed 0..1; returns chattering rewind noise"""
    t = T(d); f = 600 + 3200 * rate; ph = 2 * np.pi * np.cumsum(f) / SR
    w = np.sin(ph + 2.5 * np.sin(2 * np.pi * 37 * t)) * 0.25; n = bp(noise(d), 1500, 7000) * (0.2 + 0.8 * rate)
    return (w + n * 0.4) * (0.3 + 0.7 * rate)

# ---------------------------------------------------------------- sequencing helpers
def bars(t0, t1): return [(t0 + i * 2.0, i) for i in range(int(round((t1 - t0) / 2.0)))]
def drumline(t0, t1, k='x...x...x...x...', s='....x.......x...', h='..x...x...x...x.', v=1.0, brush=False, clapit=False, openh='', kv=1.0):
    for b, _ in bars(t0, t1):
        for i in range(16):
            tt = b + i * 0.125
            if k[i] == 'x': add('drums', tt, kick(0.9 * v * kv))
            if s[i] == 'x': add('drums', tt, clap(0.8 * v) if clapit else snare(0.7 * v, brush=brush), p=0.05)
            if h[i] == 'x': add('drums', tt, hat(0.5 * v), p=0.25)
            if openh and openh[i] == 'x': add('drums', tt, hat(0.45 * v, True), p=-0.2)
KICKS = []
def four(t0, t1, v=1.0, tone=48):
    for b, _ in bars(t0, t1):
        for i in range(4): tt = b + i * 0.5; add('drums', tt, kick(v, tone=tone)); KICKS.append(tt)
def sidechain(t0, t1, buses, depth=0.6, rel=0.16):
    i0, i1 = int(t0 * SR), int(t1 * SR); tt = np.arange(i0, i1) / SR; g = np.ones_like(tt)
    for k in KICKS:
        if k < t0 - 0.5 or k > t1: continue
        m = tt >= k; g[m] = np.minimum(g[m], 1 - depth * np.exp(-(tt[m] - k) / rel))
    for b in buses: BUS[b][i0:i1] *= g[:, None].astype(np.float32)
def tape_stop(t0, dur, buses):
    i0 = int(t0 * SR); n = int(dur * SR); rate = np.linspace(1, 0, n) ** 1.3; pos = i0 + np.cumsum(rate)
    for b in buses:
        src = BUS[b][i0:i0 + int(dur * SR * 1.2)].copy()
        for ch in range(2): BUS[b][i0:i0 + n, ch] = np.interp(pos - i0, np.arange(len(src)), src[:, ch]) * np.linspace(1, 0.2, n)
        BUS[b][i0 + n:i0 + n + int(0.5 * SR)] = 0
def mute(t0, t1, buses):
    for b in buses: BUS[b][int(t0 * SR):int(t1 * SR)] = 0

PROG = ['Am', 'F', 'C', 'G']
def chord_at(t, t0, prog=PROG): return prog[int((t - t0) // 2) % len(prog)]

# ================================================================ SCORE
# --- 序 (0–12): a lone pad, then the tape rewinds through the future
add('amb', 0.0, sinepad([57, 64, 69], 3.2, 0.5, a=0.4, r=0.6))
add('amb', 8.0, projector(4.2, 1.0)); add('amb', 8.0, crackle(4.0, 40, 0.3))
for i, m in enumerate([69, 72, 71, 76]): add('music', 9.0 + i * 0.5, musicbox(m + 12, 0.35), p=-0.2 + i * 0.13)
add('music', 11.0, musicbox(81, 0.25, 2.0))

# --- 第一章 梦 (12–44): music box over a crackling projector
add('amb', 12.0, projector(12.0, 0.8)); add('amb', 12.0, crackle(16.0, 34, 0.25))
ARP = {'Am': [57, 60, 64, 69, 64, 60, 57, 60], 'F': [53, 57, 60, 65, 60, 57, 53, 57], 'C': [60, 64, 67, 72, 67, 64, 60, 64], 'G': [55, 59, 62, 67, 62, 59, 55, 59]}
for b, i in bars(12, 44):
    ch = PROG[i % 4]
    if 24 <= b < 28: continue           # the ROBOT poster gets its own brass
    if b >= 42: break
    for k, m in enumerate(ARP[ch]): add('music', b + k * 0.25, musicbox(m + 12, 0.22 if b < 20 else 0.26), p=0.4 * np.sin(k))
    if b >= 28: add('bass', b, piano(CH[ch][0] + 12, 0.55, 2.2)); add('bass', b + 1.0, piano(CH[ch][0] + 19, 0.35, 1.2))
Q = [69, 72, 71, 76]
for b in [20.0, 22.0, 30.0, 34.0, 38.0]:
    for k, m in enumerate(Q): add('lead', b + k * 0.5, bellf(m + 12, 0.35, 1.6), p=0.1)
for b, _ in bars(28, 42):
    for i in range(8): add('drums', b + i * 0.25, tickwood(0.22 if i % 2 else 0.32, 2600 if i % 2 else 1900), p=-0.3 if i % 2 else 0.3)
# ROBOT: constructivist brass + march
for k in range(5): add('music', 24.35 + k * 0.25, stab(1.0 + k * 0.1))
for b, _ in bars(26, 28):
    for i in range(16):
        if i % 2 == 0 or i > 11: add('drums', b + i * 0.125, snare(0.35 + 0.2 * (i > 11), brush=True))
    add('drums', b, kick(0.8, tone=40)); add('drums', b + 1.0, kick(0.8, tone=40))
add('music', 26.0, padf([45, 52, 57], 2.0, 0.8, cut=900, a=0.1, r=0.4))

# --- 第二章 问 (44–76)
add('sfx', 43.4, swell(0.6, 0.6))
add('amb', 45.4, sinepad([33, 40, 45], 4.2, 0.55, a=1.0, r=0.6))
add('music', 49.25, padf([45, 52, 57, 60, 64, 71], 3.0, 1.3, cut=2400, a=0.02, r=1.0))
add('lead', 49.25, bellf(81, 0.5, 3.0))
PROG2 = ['C', 'Am', 'F', 'G']
MEL2 = [[(0, 76, .5), (.5, 79, .5), (1, 81, .75), (1.75, 79, .25)], [(0, 76, .5), (.5, 72, .5), (1, 74, .5), (1.5, 76, .5)],
        [(0, 77, .5), (.5, 76, .5), (1, 74, .5), (1.5, 72, .5)], [(0, 74, 1.5)]]
for b, i in bars(52, 72):
    ch = PROG2[i % 4]; root = CH[ch][0]
    for k, m in enumerate([root, root + 7, root + 12, root + 7]): add('bass', b + k * 0.5, upright(m, 0.8))
    for off in [0, 0.75, 1.25]: [add('music', b + off, vib(m + 12, 0.33), p=0.2 * (j - 1)) for j, m in enumerate(CH[ch][1])]
drumline(52, 66, k='x.......x.......', s='....x.......x...', h='x.xxx.xxx.xxx.xx', v=0.7, brush=True)
drumline(66, 72, k='x...............', s='................', h='x.x.x.x.x.x.x.x.', v=0.5)
notes = []
for b, i in bars(56, 66):
    for s0, m, d0 in MEL2[i % 4]: notes.append((b + s0 * 2 / 2, m, d0))
add('lead', notes[0][0], theremin(notes, notes[0][0], 0.28), p=-0.15)
tape_stop(71.6, 0.8, ['music', 'bass', 'drums', 'lead'])

# --- 第三章 冬 (76–100)
add('music', 76.0, padf([45, 52, 59, 64, 71], 8.4, 0.9, cut=900, a=2.0, r=2.0))
for i, m in enumerate([88, 91, 95, 93]): add('lead', 76.0 + i * 0.09, bellf(m, 0.3, 3.0, 0.5), p=-0.3 + i * 0.2)
# 1980s: square arps, gated snare, four on the floor
ARP80 = {'Am': [57, 64, 69, 72], 'F': [53, 60, 65, 69], 'C': [48, 55, 60, 64], 'G': [55, 62, 67, 71]}
for b, i in bars(84, 94):
    ch = PROG[i % 4]
    for k in range(16):
        m = ARP80[ch][k % 4] + (12 if k % 8 >= 4 else 0)
        if 90.4 <= b + k * 0.125 < 92.0: continue
        add('music', b + k * 0.125, pluck(m, 0.55, 0.16, 2600, 'sq'), p=0.3 if k % 2 else -0.3)
    for k in range(8): add('bass', b + k * 0.25, sawbass(CH[ch][0], 0.8, 0.2, 700))
four(84, 94, 0.7, 50); drumline(84, 94, k='................', s='....x.......x...', h='..x...x...x...x.', v=0.8)
# backward pass: the arp plays in reverse
rev = np.zeros((int(1.6 * SR), 2))
for k in range(13):
    s_ = pan2(pluck(ARP80['Am'][k % 4] + 12, 0.6, 0.3, 3000, 'sq'), 0.3 if k % 2 else -0.3); i0 = int(k * 0.125 * SR); rev[i0:i0 + len(s_)] += s_[:len(rev) - i0]
add('music', 90.4, rev[::-1] * np.linspace(0.3, 1, len(rev))[:, None])
sidechain(84, 94, ['music', 'bass'], 0.5)
tape_stop(94.05, 0.6, ['music', 'bass', 'drums'])
add('music', 96.5, padf([45, 52, 60], 3.6, 0.6, cut=700, a=1.5, r=1.5))
for i, m in enumerate(Q): add('lead', 97.0 + i * 0.95, bellf(m, 0.55, 3.5, 0.7), p=0.0)

# --- 第四章 醒 (100–122)
for m in [69, 73, 76, 81]: add('lead', 100.0, bellf(m + 12, 0.35, 3.0))
add('music', 100.0, padf([57, 61, 64, 69], 1.6, 0.8, cut=3000, a=0.01, r=1.2))
for b, i in bars(101.4 - 1.4 + 2, 106):  # 102–106 pulse
    for k in range(8): add('bass', b + k * 0.25, sawbass(45, 0.7, 0.2, 500 + 300 * (b - 102)))
for tt in np.arange(101.5, 106, 0.5): add('drums', tt, kick(0.55 + 0.1 * (tt > 104), tone=50)); KICKS.append(tt)
for tt in np.arange(104.0, 106, 0.125): add('drums', tt, hat(0.35), p=0.3)
four(106, 110, 0.85, 50)
for b, i in bars(106, 110):
    ch = PROG[i % 4]
    for k in range(8): add('bass', b + k * 0.25, sawbass(CH[ch][0], 0.8, 0.2, 800))
    add('music', b, padf([m + 12 for m in CH[ch][1]], 2.0, 0.7, cut=1800, a=0.3, r=0.3))
for k, tt in enumerate(np.concatenate([np.arange(108, 109, 0.25), np.arange(109, 110, 0.125)])): add('drums', tt, snare(0.3 + 0.5 * (tt - 108) / 2, brush=False))
add('sfx', 108.4, swell(1.6, 0.8))
# THE DROP at 110
four(110, 117.8, 1.0, 48); drumline(110, 118, k='................', s='....x.......x...', h='..x...x...x...x.', v=0.9, clapit=True, openh='..x...x...x...x.')
LEADQ = [(0, 81), (0.5, 84), (1.0, 83), (1.5, 88)]
for b, i in bars(110, 118):
    ch = PROG[i % 4]
    add('music', b, supersaw([m + 12 for m in CH[ch][1]], 2.0, 1.0, 4500))
    for k in range(8): add('bass', b + k * 0.25, sawbass(CH[ch][0] + (12 if k % 2 else 0), 0.9, 0.22, 1100))
    for k in range(16): add('lead', b + k * 0.125, pluck(CH[ch][1][k % 3] + 24, 0.35, 0.18, 5000), p=0.5 * np.sin(k))
sidechain(110, 118, ['music', 'bass', 'lead'], 0.65)
mute(117.8, 118.0, ['music', 'bass', 'lead', 'drums'])
add('amb', 118.0, sub(0.9, 2.5, 50, 28))
add('music', 119.6, padf([45, 52, 57, 64], 2.4, 0.8, cut=2500, a=2.2, r=0.1))
add('sfx', 120.4, swell(1.6, 1.0))
for tt in np.arange(120.0, 122.0, 0.25): add('drums', tt, snare(0.2 + 0.5 * (tt - 120) / 2))

# --- 第五章 涌 (122–156)
add('music', 122.0, supersaw([57, 64, 69, 72, 76], 2.2, 1.3, 6000, r=1.2))
for b, i in bars(123.4 - 1.4, 128):   # 122–128 half-time + shimmering arps
    ch = PROG[i % 4]
    if b >= 124: add('drums', b, kick(0.9)); add('drums', b + 1.0, snare(0.8)); add('drums', b + 1.5, kick(0.6)); KICKS.extend([b, b + 1.5])
    for k in range(16): add('lead', b + k * 0.125, pluck(ARP[ch][k % 8] + 12, 0.28, 0.25, 6000), p=0.6 * np.sin(k * 0.7))
    add('music', b, padf([m + 12 for m in CH[ch][1]], 2.0, 0.8, cut=2600, a=0.2, r=0.2))
    add('bass', b, sawbass(CH[ch][0], 0.9, 1.9, 400))
four(128, 135, 0.95, 48)
for b, i in bars(128, 136):
    ch = PROG[i % 4]
    if b >= 135: break
    for k in range(8): add('bass', b + k * 0.25, sawbass(CH[ch][0] + (12 if k % 2 else 0), 0.85, 0.22, 700 + (b - 128) * 180))
    for k in range(16): add('lead', b + k * 0.125, pluck(ARP[ch][k % 8] + 12, 0.25, 0.2, 2500 + (b - 128) * 500))
rolls = list(np.arange(131.2, 133.2, 0.25)) + list(np.arange(133.2, 134.2, 0.125)) + list(np.arange(134.2, 135.0, 0.0625))
for k, tt in enumerate(rolls): add('drums', tt, snare(0.25 + 0.6 * k / len(rolls)))
t_r = T(3.8); rz = sweep_lp(noise(3.8), 400, 12000) * (t_r / 3.8) ** 2 * 0.5 + saw(1, t_r) * 0
add('sfx', 131.2, hp(rz, 200)); add('sfx', 131.2, np.sin(2 * np.pi * np.cumsum(200 + 1400 * (t_r / 3.8) ** 2) / SR) * (t_r / 3.8) ** 2 * 0.12)
sidechain(128, 135, ['bass', 'lead'], 0.5)
mute(134.98, 135.0, ['drums', 'bass', 'lead'])
add('music', 135.0, supersaw([57, 64, 69, 72], 1.8, 1.0, 5000, r=1.4))
add('amb', 136.0, sinepad([57, 64, 69, 71], 2.0, 0.5, a=0.2, r=0.8))
# drop 2 at 137.8
four(137.8, 155.8 + 0.2, 1.1, 46)
drumline(138, 156, k='................', s='....x.......x...', h='xxxxxxxxxxxxxxxx', v=0.8, clapit=True, openh='..x...x...x...x.')
for b, i in bars(138, 156):
    ch = PROG[i % 4]
    add('music', b, supersaw([m + 12 for m in CH[ch][1]] + [CH[ch][1][0] + 24], 2.0, 1.35, 6500))
    for k in range(8): add('bass', b + k * 0.25, sawbass(CH[ch][0] + (12 if k % 2 else 0), 0.95, 0.22, 1300))
    for k in range(16): add('lead', b + k * 0.125, pluck(CH[ch][1][(k * 2) % 3] + 24 + (12 if (b >= 150 and k % 4 == 2) else 0), 0.3, 0.16, 7000), p=0.5 * np.sin(k))
add('music', 137.8, supersaw([57, 64, 69, 72], 0.2, 1.0))  # tiny pickup
for b in [138.0, 142.0, 146.0]:
    for k, m in enumerate(Q): add('lead', b + k * 0.5, bellf(m + 12, 0.35, 1.5), p=-0.2)
for tt, m in [(144.25, 57), (145.05, 64)]: add('lead', tt, bellf(m, 0.9, 4.0, 1.2))
add('music', 144.0, sinepad([69, 72, 76, 81], 6.0, 0.4, a=1.0, r=1.0))
sidechain(137.8, 156, ['music', 'bass', 'lead'], 0.6)
mute(153.75, 154.0, ['drums', 'bass', 'lead', 'music'])
mute(154.0, 157.0, ['drums', 'bass', 'lead'])
add('music', 154.0, supersaw([48, 55, 60, 64, 67, 72], 2.0, 1.2, 5000, r=1.6))
for m in [72, 76, 79, 84]: add('lead', 154.0, bellf(m, 0.3, 3.0))
BUS['music'][int(155.3 * SR):int(156.2 * SR)] *= np.linspace(1, 0, int(156.2 * SR) - int(155.3 * SR))[:, None].astype(np.float32)
BUS['music'][int(156.2 * SR):] = 0; BUS['lead'][int(156.0 * SR):int(157 * SR)] = 0

# --- 终 (156–176): piano, and a question left open
PIANO = [(157.0, [53, 57, 60, 64]), (159.5, [45, 52, 57, 60]), (162.0, [53, 57, 60, 64]), (164.5, [48, 55, 60, 64]), (166.5, [47, 55, 59, 62]), (168.5, [45, 52, 57, 60])]
for tt, ms in PIANO:
    for k, m in enumerate(ms): add('keys', tt + k * 0.12, piano(m, 0.7, 3.5), p=-0.3 + k * 0.2)
for k, m in enumerate(Q): add('keys', 170.2 + k * 0.55, piano(m + 12, 0.8, 3.0), p=0.1)
add('keys', 172.6, sum([np.pad(piano(m, 0.55, 5.0), (0, 0)) for m in [43, 55, 60, 62]]))   # Gsus4: unresolved
add('music', 172.4, sinepad([55, 60, 62, 67], 4.4, 0.5, a=1.2, r=2.0))
add('amb', 156.0, lp(noise(20.0), 400) * 0.02)

# ================================================================ SOUND DESIGN from cues
for c in CUES:
    t, ty = c['t'], c['type']; v = c.get('v', 1.0)
    if ty == 'key': add('sfx', t, keyclick(1.0, c.get('soft')), p=RNG.uniform(-0.2, 0.2))
    elif ty == 'blip': add('sfx', t, blip(PENTA[c.get('p', RNG.integers(0, 8)) % 8] + 12, 0.6 * v), p=RNG.uniform(-0.5, 0.5))
    elif ty == 'clack': add('sfx', t, thunk(1.0)); add('sfx', t + 0.05, relay(1.0))
    elif ty == 'act':
        add('sfx', t, whoosh(0.5, 0.9, lo=800, hi=9000)); add('sfx', t, sub(0.9, 2.0, 62, 34))
        if c.get('n') in (2,): add('lead', t, bellf(45, 0.8, 5.0, 0.6))
    elif ty == 'tick': add('sfx', t, tickwood(0.5 * v, 3200 if c.get('hi') else 2200), p=RNG.uniform(-0.4, 0.4))
    elif ty == 'chime':
        for i, m in enumerate([84, 88, 91]): add('lead', t + i * 0.06, bellf(m, 0.25, 2.0))
    elif ty == 'mech': add('sfx', t, mech(1.0), p=0.4)
    elif ty == 'thunk': add('sfx', t, thunk(v))
    elif ty == 'slide': add('sfx', t, lp(noise(0.35), 900) * np.sin(np.pi * T(0.35) / 0.35) * 0.3)
    elif ty == 'hit': add('sfx', t, sub(0.7 * v, 1.2, 70, 40)); add('sfx', t, crash(0.5 * v, 1.2))
    elif ty == 'stamp': add('sfx', t, thunk(1.2)); add('sfx', t, bp(noise(0.08), 400, 3000) * np.exp(-T(0.08) * 50) * 0.8)
    elif ty == 'whoosh': add('sfx', t - (0.5 if c.get('rev') else 0.1), whoosh(0.6, 0.8, rev=bool(c.get('rev'))))
    elif ty == 'slam':
        if c.get('big'): add('sfx', t, impact(0.9))
        elif c.get('light'): add('sfx', t, kick(0.6, tone=55)); add('sfx', t, bp(noise(0.1), 300, 3000) * np.exp(-T(0.1) * 30) * 0.4)
        else: add('sfx', t, kick(0.8, tone=42)); add('sfx', t, crash(0.25, 0.4))
    elif ty == 'step': add('sfx', t, tickwood(0.35 * v, 1500)); add('sfx', t, thunk(0.25 * v))
    elif ty == 'fire': add('sfx', t, fire(1.0))
    elif ty == 'hum': add('amb', t, hum(c.get('dur', 4), 0.9))
    elif ty == 'relay': add('sfx', t, relay(0.5 * v), p=RNG.uniform(-0.7, 0.7))
    elif ty == 'powerdown': add('sfx', t, powerdown(1.0))
    elif ty == 'type': add('sfx', t, typewriter(0.9), p=RNG.uniform(-0.15, 0.15))
    elif ty == 'return': add('sfx', t, sum_ := np.concatenate([relay(0.4) for _ in range(6)]) * 0.6); add('sfx', t + 0.05, lp(noise(0.25), 1500) * np.exp(-T(0.25) * 8) * 0.25)
    elif ty == 'ding': add('lead', t, bellf(96 if not c.get('soft') else 88, 0.35 if not c.get('soft') else 0.2, 1.6))
    elif ty == 'boom': add('sfx', t, impact(1.0))
    elif ty == 'swell': add('sfx', t, swell(c.get('dur', 1.5), 0.6))
    elif ty == 'down': add('sfx', t, sinepad([69, 76], 1.8, 0.4, a=0.1, r=1.2) * np.linspace(1, 0.2, int(1.8 * SR)))
    elif ty == 'spin': add('sfx', t, whoosh(0.9, 0.9) * (0.6 + 0.4 * np.sin(2 * np.pi * np.cumsum(4 + 14 * (1 - T(0.9) / 0.9)) / SR)))
    elif ty == 'err': add('sfx', t, err(v))
    elif ty == 'crton': add('sfx', t, thunk(0.6)); add('sfx', t, hp(noise(0.4), 5000) * np.exp(-T(0.4) * 8) * 0.25)
    elif ty == 'beep': add('sfx', t, lp(sq(880, T(0.08)), 4000) * 0.12)
    elif ty == 'tty': add('sfx', t, relay(0.35), p=RNG.uniform(-0.3, 0.3))
    elif ty == 'fall': add('sfx', t, whoosh(0.45, 0.7, lo=2000, hi=300))
    elif ty == 'wind': add('amb', t, wind(c.get('dur', 5), 0.9, c.get('fadeIn', 0.8)))
    elif ty == 'freeze':
        d = 1.2; tt_ = T(d); add('sfx', t, sum(np.sin(2 * np.pi * f * tt_) for f in [3136, 3520, 4186, 4699]) * np.minimum(1, tt_ / 0.4) * np.exp(-tt_ * 2) * 0.05)
    elif ty == 'rev': add('sfx', t, (padf([57, 64, 69], 1.5, 1.0, 2600, 0.01, 0.1))[::-1] * 1.2)
    elif ty == 'shatter': add('sfx', t, glass(1.0)); add('sfx', t, impact(0.6)); add('sfx', t, hp(noise(0.6), 1000) * np.exp(-T(0.6) * 6) * 0.4)
    elif ty == 'heart': add('sfx', t, heart(0.9 * v))
    elif ty == 'crack': add('sfx', t, crackle(0.5, 400, 3.0)); add('sfx', t, thunk(1.0))
    elif ty == 'impact': add('sfx', t, impact(1.0))
    elif ty == 'tok': add('sfx', t, tok(0.8 * v), p=RNG.uniform(-0.4, 0.4))
    elif ty == 'stone37': add('sfx', t, tok(1.4, big=True))
    elif ty == 'sparkle':
        for i, m in enumerate([84, 86, 88, 91, 93, 96, 98, 100]): add('lead', t + i * 0.05, bellf(m, 0.18, 1.2), p=-0.6 + i * 0.16)
    elif ty == 'riser': pass
    elif ty == 'send': add('sfx', t, whoosh(0.25, 0.5, lo=1500, hi=9000))
    elif ty == 'pop': add('sfx', t, pop(c.get('p', 0), 0.55), p=RNG.uniform(-0.8, 0.8))
    elif ty == 'bell': add('lead', t, bellf(69 - 12 * c.get('p', 0), 0.6, 4.0))
    elif ty == 'rewind': pass

# ================================================================ MIX
def reverb_ir(d=2.6, seed=3):
    r = np.random.default_rng(seed); t = T(d); ir = r.standard_normal((len(t), 2)) * np.exp(-t * 3.2)[:, None]
    ir = lp(ir, 6000); ir[:int(0.012 * SR)] = 0; return ir / np.sqrt((ir ** 2).sum() / 2)
IR = reverb_ir()
wet_in = sum(BUS[b] * SEND[b] for b in BUS)
wet = np.stack([fftconvolve(wet_in[:, ch], IR[:, ch])[:N] for ch in range(2)], 1) * 0.35
dry = sum(BUS[b] * GAIN[b] for b in BUS)
mix = dry + wet

# the rewind: the future soundtrack, played backwards at tape speed (2.9–8.0)
t0r, t1r = 2.9, 8.0; n = int((t1r - t0r) * SR); k = np.arange(n) / n
ease = np.where(k < .5, 4 * k ** 3, 1 - (-2 * k + 2) ** 3 / 2)
pos = (156.0 + (12.0 - 156.0) * ease) * SR
src = np.stack([np.interp(pos, np.arange(N), mix[:, ch]) for ch in range(2)], 1)
rate = np.abs(np.gradient(pos)) / (SR * 60); rate = np.clip(rate / rate.max(), 0, 1)
src = bp(src, 250, 5000) * (0.25 + 0.5 * rate)[:, None]
whine = tape_whine(t1r - t0r, rate)
gate = np.clip((np.arange(n) / SR) / 0.25, 0, 1) * np.clip(((t1r - t0r) - np.arange(n) / SR) / 0.05, 0, 1)
mix[int(t0r * SR):int(t0r * SR) + n] += (src * 0.8 + pan2(whine * 0.35)) * gate[:, None]

# master: gentle glue + limiter
mix = hp(mix, 28)
pk = np.max(np.abs(mix)); mix = mix / pk * 1.6
mix = np.tanh(mix) / np.tanh(1.6)
mix *= 0.93 / np.max(np.abs(mix))
fade = np.ones(N); fe = int(175.4 * SR); fade[fe:] = np.linspace(1, 0, N - fe); mix *= fade[:, None]
mix = mix[:int(176.0 * SR)]
from scipy.io import wavfile
wavfile.write('soundtrack.wav', SR, (mix * 32767).astype(np.int16))
print('wrote soundtrack.wav', mix.shape, 'peak', float(np.max(np.abs(mix))), 'rms', float(np.sqrt(np.mean(mix ** 2))))
