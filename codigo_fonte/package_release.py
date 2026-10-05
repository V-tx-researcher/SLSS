#!/usr/bin/env python3
"""Empacota a entrega; não inclui cache de modelos, dependências ou dados reais."""
import hashlib
import zipfile
from pathlib import Path
ROOT = Path(__file__).resolve().parent
DESTINATION = ROOT.parent/'SLSS_v0.4.0.zip'
PREFIX = 'SLSS_v0.4.0/'
files = {}
def put(file, name):
    file=Path(file)
    if not file.is_file() and file.is_relative_to(ROOT):
        candidate=ROOT.parent/file.relative_to(ROOT)
        if candidate.is_file():file=candidate
    files[name] = file
for name in ['README.md','LICENSE','NOTICE.md','SLSS_Offline.html','SLSS_Wix.html','Codigo_Para_Colar_No_Wix.txt','Motor_Whisper_Local.sigilo','Tutorial_Wix_Audio_Sigilo_Local.pdf','Tutorial_Wix_Sigilo_Local.md','Validacao_Navegador.json','Validacao_Iframe.json','Validacao_Repeticao.json','Validacao_Fala_Real.json']:
    put(ROOT/name,name)
put(ROOT/'texto_ficticio.txt','Texto_Ficticio_Teste.txt')
for folder in ['exemplos','LICENSES']:
    location=ROOT/folder if (ROOT/folder).is_dir() else ROOT.parent/folder
    for file in sorted(location.rglob('*')):
        if file.is_file(): put(file,folder+'/'+file.relative_to(location).as_posix())
for name in ['README.md','LICENSE','CITATION.cff','NOTICE.md','CHANGELOG.md','texto_ficticio.txt','package.json','package-lock.json','build.py','build_audio.mjs','package_motor.py','unpack_motor.py','package_release.py','make_tutorial_pdf.py','Tutorial_Wix_Sigilo_Local.md']:
    put(ROOT/name,'codigo_fonte/'+name)
for folder in ['src','tests','LICENSES']:
    for file in sorted((ROOT/folder).rglob('*')):
        if file.is_file(): put(file,'codigo_fonte/'+file.relative_to(ROOT).as_posix())
checksums=''.join(hashlib.sha256(file.read_bytes()).hexdigest()+'  '+name+'\n' for name,file in sorted(files.items()))
with zipfile.ZipFile(DESTINATION,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
    for name,file in sorted(files.items()):
        info=zipfile.ZipInfo(PREFIX+name,(2026,10,5,0,0,0));info.external_attr=0o644<<16
        info.compress_type=zipfile.ZIP_STORED if name.endswith('.sigilo') else zipfile.ZIP_DEFLATED
        archive.writestr(info,file.read_bytes())
    archive.writestr(PREFIX+'CHECKSUMS.sha256',checksums)
print(f'Pacote criado: {DESTINATION.name} ({DESTINATION.stat().st_size:,} bytes, {len(files)+1} arquivos)')
