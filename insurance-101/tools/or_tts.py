"""OpenRouter /audio/speech 调用。key 从 fish 变量读取，不落盘不打印。"""
import json, os, subprocess, urllib.request, urllib.error, time

def _key():
    k = os.environ.get("OPENROUTER_API_KEY")
    if not k:
        k = subprocess.run(["fish", "-c", 'printf %s "$OPENROUTER_API_KEY"'],
                           capture_output=True, text=True).stdout.strip()
    if not k:
        raise SystemExit("OPENROUTER_API_KEY not found")
    return k

def speech(text, model, voice=None, out=None, fmt="mp3", speed=None, extra=None, retries=3):
    body = {"model": model, "input": text, "response_format": fmt}
    if voice: body["voice"] = voice
    if speed: body["speed"] = speed
    if extra: body.update(extra)
    req = urllib.request.Request("https://openrouter.ai/api/v1/audio/speech",
        data=json.dumps(body).encode(), method="POST",
        headers={"Authorization": f"Bearer {_key()}", "Content-Type": "application/json"})
    for i in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                data = r.read(); gid = r.headers.get("X-Generation-Id")
            if out:
                with open(out, "wb") as f: f.write(data)
            return data, gid
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")[:400]
            if i == retries - 1 or e.code in (400, 401, 402, 404):
                raise RuntimeError(f"HTTP {e.code}: {msg}")
            time.sleep(2 * (i + 1))
