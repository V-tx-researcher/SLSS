#!/usr/bin/env python3
"""Extrai o motor público original para reconstrução, após conferir SHA-256."""
from pathlib import Path
import hashlib
import json
import sys
import zipfile
ROOT = Path(__file__).resolve().parent
metadata = json.loads((ROOT/'src/audio-config.json').read_text())
source = Path(sys.argv[1]) if len(sys.argv)>1 else ROOT.parent/metadata['filename']
if hashlib.sha256(source.read_bytes()).hexdigest() != metadata['sha256']:
    raise SystemExit('O motor não corresponde ao hash desta versão.')
destination = ROOT/'motor'
with zipfile.ZipFile(source) as archive:
    for name in archive.namelist():
        target = (destination/name).resolve()
        if not target.is_relative_to(destination.resolve()):
            raise SystemExit('Caminho inválido no pacote.')
        target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes(archive.read(name))
print('Recursos públicos extraídos em motor/.')
