#!/usr/bin/env python3
"""Monta um único HTML offline. Python 3.10+, somente biblioteca padrão."""
import base64
import hashlib
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"

def read(name):
    return (SRC / name).read_text(encoding="utf-8")

def digest(source):
    return "'sha256-" + base64.b64encode(hashlib.sha256(source.encode()).digest()).decode() + "'"

def inline_json(value):
    # Evita terminar um elemento <script> ao embutir dados.
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")

def build():
    engine, app, css = read("engine.js"), read("app.js"), read("style.css")
    unzip, audio_ui = read('audio-unzip.bundle.js'), read('audio-ui.js')
    audio_quality = read('audio-quality.js')
    audio_config = json.loads(read('audio-config.json'))
    base = json.loads(read("base.json"))
    demo = (ROOT / "texto_ficticio.txt").read_text(encoding="utf-8")
    policy = "; ".join([
        "default-src 'none'", "script-src " + ' '.join(digest(s) for s in [engine, app, unzip, audio_quality, audio_ui]) + " blob: 'wasm-unsafe-eval'",
        "style-src " + digest(css), "img-src data:", "connect-src blob:",
        "worker-src blob:", "object-src 'none'", "base-uri 'none'",
        "form-action 'none'", "frame-src 'none'"
    ])
    substitutions = {
        "__CSP__": html.escape(policy, quote=True),
        "__FAVICON__": "data:image/png;base64," + base64.b64encode((SRC / "slss-icon.png").read_bytes()).decode(),
        "__LOGO__": "data:image/png;base64," + base64.b64encode((SRC / "slss-icon.png").read_bytes()).decode(),
        "__CSS__": css, "__BASE__": inline_json(base), "__DEMO__": inline_json(demo),
        "__ENGINE__": engine, "__APP__": app,
        "__UNZIP__": unzip, "__AUDIO_UI__": audio_ui, "__AUDIO_CONFIG__": inline_json(audio_config),
        "__AUDIO_QUALITY__": audio_quality,
        "__LICENSE__": (ROOT / "LICENSE").read_text(encoding="utf-8"),
        "__FAKER_LICENSE__": (ROOT / "LICENSES" / "Faker-MIT.txt").read_text(encoding="utf-8"),
        "__FFLATE_LICENSE__": (ROOT / "LICENSES" / "fflate-MIT.txt").read_text(encoding="utf-8")
    }
    result = read("template.html")
    for placeholder, value in substitutions.items():
        result = result.replace(placeholder, value)
    target = ROOT / "SLSS_Wix.html"
    target.write_text(result, encoding="utf-8")
    (ROOT / "Codigo_Para_Colar_No_Wix.txt").write_text(result, encoding="utf-8")
    (ROOT / "SLSS_Offline.html").write_text(result.replace('data-deployment="wix"', 'data-deployment="local"', 1), encoding="utf-8")
    print(f"HTML criado: {target.name} ({target.stat().st_size:,} bytes)")
    return target

if __name__ == "__main__":
    build()
