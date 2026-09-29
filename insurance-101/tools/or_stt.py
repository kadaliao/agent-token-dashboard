"""OpenRouter /audio/transcriptions，返回 verbose_json（含逐词时间戳）。"""
import base64, json, urllib.request, urllib.error, time, sys
sys.path.insert(0, "tools")
from or_tts import _key

def transcribe(path, model="openai/whisper-large-v3", language="zh", words=True, prompt=None):
    fmt = path.rsplit(".", 1)[-1]
    body = {"model": model, "input_audio": {"data": base64.b64encode(open(path, "rb").read()).decode(), "format": fmt},
            "language": language, "response_format": "verbose_json" if words else "json", "temperature": 0}
    if words: body["timestamp_granularities"] = ["segment", "word"]
    if prompt: body["prompt"] = prompt
    req = urllib.request.Request("https://openrouter.ai/api/v1/audio/transcriptions",
        data=json.dumps(body).encode(), method="POST",
        headers={"Authorization": f"Bearer {_key()}", "Content-Type": "application/json"})
    for i in range(3):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")[:400]
            if i == 2 or e.code in (400, 401, 402, 404): raise RuntimeError(f"HTTP {e.code}: {msg}")
            time.sleep(2 * (i + 1))
