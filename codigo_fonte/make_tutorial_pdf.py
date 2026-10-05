#!/usr/bin/env python3
"""Gera o tutorial PDF a partir do Markdown; dependência de autoria: reportlab."""
from pathlib import Path
import html
import re
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "Tutorial_Wix_Audio_Sigilo_Local.pdf"
import os
# Usa DejaVu no Linux e fontes equivalentes do Windows, ambas com acentos completos.
FONT_CANDIDATES = [
    (Path('/usr/share/fonts/truetype/dejavu'), [('Sigilo','DejaVuSans.ttf'),('Sigilo-Bold','DejaVuSans-Bold.ttf'),('SigiloMono','DejaVuSansMono.ttf')]),
    (Path(os.environ.get('WINDIR', 'C:/Windows'))/'Fonts', [('Sigilo','arial.ttf'),('Sigilo-Bold','arialbd.ttf'),('SigiloMono','consola.ttf')]),
]
for FONT_DIR, mapping in FONT_CANDIDATES:
    if all((FONT_DIR/filename).is_file() for _, filename in mapping):
        for name, filename in mapping:
            pdfmetrics.registerFont(TTFont(name,str(FONT_DIR/filename)))
        break
else:
    raise SystemExit('Nenhuma fonte TrueType com acentos foi encontrada.')
pdfmetrics.registerFontFamily('Sigilo',normal='Sigilo',bold='Sigilo-Bold',italic='Sigilo',boldItalic='Sigilo-Bold')
NAVY=colors.HexColor('#12243a')
TEAL=colors.HexColor('#00796e')
GRAY=colors.HexColor('#485767')
LIGHT=colors.HexColor('#eff7f5')
STYLES={
    'body':ParagraphStyle('body',fontName='Sigilo',fontSize=9.3,leading=14.1,textColor=NAVY,spaceAfter=7.5,splitLongWords=True),
    'title':ParagraphStyle('title',fontName='Sigilo-Bold',fontSize=23,leading=28,textColor=NAVY,spaceAfter=7),
    'page':ParagraphStyle('page',fontName='Sigilo-Bold',fontSize=15,leading=20,textColor=TEAL,spaceBefore=4,spaceAfter=12),
    'h3':ParagraphStyle('h3',fontName='Sigilo-Bold',fontSize=11,leading=15,textColor=TEAL,spaceBefore=10,spaceAfter=7),
    'small':ParagraphStyle('small',fontName='Sigilo',fontSize=8,leading=11.8,textColor=GRAY,spaceAfter=4),
    'cell':ParagraphStyle('cell',fontName='Sigilo',fontSize=8.8,leading=12.7,textColor=NAVY,spaceAfter=1),
    'step':ParagraphStyle('step',fontName='Sigilo',fontSize=9.3,leading=14,textColor=NAVY,spaceAfter=6.5,leftIndent=14,firstLineIndent=-14,splitLongWords=True),
}

def inline(text):
    text=text.replace('\u2011','-').replace('\u2013','-').replace('\u2014','-')
    text=html.escape(text)
    text=re.sub(r'\*\*(.*?)\*\*',r'<b>\1</b>',text)
    text=re.sub(r'`(.*?)`',r'<font name="SigiloMono" size="8.4">\1</font>',text)
    return text

def footer(canvas, doc):
    canvas.saveState()
    width,height=A4
    canvas.setStrokeColor(TEAL);canvas.setLineWidth(1.8);canvas.line(45,height-29,width-45,height-29)
    canvas.setFont('Sigilo-Bold',8);canvas.setFillColor(NAVY);canvas.drawString(45,height-22,'SIGILO LOCAL  /  ÁUDIO LOCAL E INSTALAÇÃO NO WIX')
    canvas.setStrokeColor(colors.HexColor('#ccd8df'));canvas.setLineWidth(.5);canvas.line(45,35,width-45,35)
    canvas.setFont('Sigilo',7.5);canvas.setFillColor(GRAY);canvas.drawString(45,23,'Pacote v0.4.0  |  05/10/2026')
    canvas.drawRightString(width-45,23,str(doc.page))
    canvas.restoreState()

lines=(ROOT/'Tutorial_Wix_Sigilo_Local.md').read_text(encoding='utf-8').splitlines()
story=[];i=0;page_started=False
while i<len(lines):
    line=lines[i].strip();i+=1
    if not line:continue
    if line.startswith('# '):
        story.append(Paragraph(inline(line[2:]),STYLES['title']));continue
    if line.startswith('## '):
        if page_started:story.append(PageBreak())
        page_started=True;story.append(Paragraph(inline(line[3:]),STYLES['page']));continue
    if line.startswith('### '):
        story.append(Paragraph(inline(line[4:]),STYLES['h3']));continue
    if line.startswith('|'):
        rows=[line]
        while i<len(lines) and lines[i].strip().startswith('|'):
            rows.append(lines[i].strip());i+=1
        values=[]
        for r in rows:
            cells=[c.strip() for c in r.strip('|').split('|')]
            if all(re.match(r'^:?-+:?$',c) for c in cells):continue
            values.append([Paragraph(inline(c),STYLES['cell']) for c in cells])
        table=Table(values,colWidths=[137,368],hAlign='LEFT',repeatRows=1)
        table.setStyle(TableStyle([
            ('BACKGROUND',(0,0),(-1,0),LIGHT),('VALIGN',(0,0),(-1,-1),'TOP'),
            ('LINEBELOW',(0,0),(-1,0),1,TEAL),('LINEBELOW',(0,1),(-1,-1),.4,colors.HexColor('#d7e3e8')),
            ('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),
            ('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)
        ]))
        story.extend([table,Spacer(1,9)]);continue
    if re.match(r'^\[\d+\]',line) and 'https://' in line:
        label,url=line.rsplit(' ',1)
        story.append(Paragraph('<link href="'+html.escape(url,quote=True)+'" color="#00796e">'+inline(label)+'</link>',STYLES['small']));continue
    if re.match(r'^\d+\. ',line):
        line=re.sub(r'^(\d+)\. ',r'<b>\1.</b> ',inline(line),count=1)
        story.append(Paragraph(line,STYLES['step']));continue
    style=STYLES['small'] if line.startswith('Tutorial de instalação') else STYLES['body']
    story.append(Paragraph(inline(line),style))

document=SimpleDocTemplate(str(OUTPUT),pagesize=A4,leftMargin=45,rightMargin=45,topMargin=48,bottomMargin=47,title='Sigilo Local - áudio local e Wix',author='Projeto Sigilo Local',subject='Instalação e teste de componente HTML no Wix')
document.build(story,onFirstPage=footer,onLaterPages=footer)
print('Tutorial PDF criado.')
