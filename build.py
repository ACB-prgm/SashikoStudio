#!/usr/bin/env python3
"""Assemble a standalone/offline HTML file. Python 3; no build dependencies."""
from pathlib import Path
ROOT=Path(__file__).resolve().parent
src=ROOT/'src'
html=(src/'template.html').read_text()
html=html.replace('/* STENCIL_CSS */',(src/'stencil.css').read_text())
html=html.replace('<!-- STENCIL_DIALOG -->',(src/'stencil-dialog.html').read_text())
parts=[]
for name,ident in [('pattern-app.js','pattern-app-source'),('stencil-engine.js','stencil-engine-source'),('stencil-preview.js','stencil-preview-source'),('stencil-ui.js','stencil-ui-source')]:
    text=(src/name).read_text()
    if '</script' in text.lower():
        raise RuntimeError(f'Unsafe inline closing script token in {name}')
    parts.append(f'<script id="{ident}">\n{text}\n</script>')
html=html.replace('<!-- APPLICATION_SCRIPTS -->','\n'.join(parts))
(ROOT/'index.html').write_text(html)
print(f'Built {ROOT / "index.html"} ({len(html.encode()):,} bytes)')
