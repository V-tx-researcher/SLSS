#!/usr/bin/env python3
"""Empacota os recursos públicos do reconhecimento de fala, sem rede."""
import hashlib
import json
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def package_motor():
    motor = ROOT / 'motor'
    target = ROOT / 'Motor_Whisper_Local.sigilo'
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for item in sorted(motor.rglob('*')):
            if item.is_file():
                info = zipfile.ZipInfo(item.relative_to(motor).as_posix(), (2026, 10, 3, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o644 << 16
                archive.writestr(info, item.read_bytes())
    provenance = json.loads((motor / 'model' / 'proveniencia.json').read_text(encoding='utf-8'))
    metadata = {'filename':target.name, 'size':target.stat().st_size, 'sha256':hashlib.sha256(target.read_bytes()).hexdigest(), 'model':'Whisper small multilingual q8', 'revision':provenance['revision']}
    (ROOT / 'src' / 'audio-config.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(metadata))
    return target

if __name__ == '__main__':
    package_motor()
