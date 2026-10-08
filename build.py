#!/usr/bin/env python3
"""Build the standalone/offline Sashiko Pattern Studio HTML.

Pattern definitions are discovered automatically from ``src/patterns/*.js`` and
injected into ``src/pattern-app.js`` at build time. Python 3 standard library only.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'src'
PATTERN_DIR = SRC / 'patterns'
PATTERN_MARKER = '/* PATTERN_MODULES */'


def read_safe(path: Path) -> str:
    text = path.read_text(encoding='utf-8')
    if '</script' in text.lower():
        raise RuntimeError(f'Unsafe inline closing script token in {path.relative_to(ROOT)}')
    return text


def load_patterns() -> tuple[str, list[str]]:
    files = sorted(p for p in PATTERN_DIR.glob('*.js') if p.is_file())
    if not files:
        raise RuntimeError(f'No pattern files found in {PATTERN_DIR.relative_to(ROOT)}')

    modules = []
    names = []
    ids = set()
    for path in files:
        text = read_safe(path)
        calls = len(re.findall(r'\bregisterPattern\s*\(', text))
        if calls != 1:
            raise RuntimeError(f'{path.relative_to(ROOT)} must call registerPattern(...) exactly once; found {calls}.')
        match = re.search(r"\bid\s*:\s*(['\"])([a-z0-9][a-z0-9-]*)\1", text)
        if not match:
            raise RuntimeError(f'{path.relative_to(ROOT)} must declare a literal lowercase id property.')
        pattern_id = match.group(2)
        if pattern_id in ids:
            raise RuntimeError(f'Duplicate pattern id in source files: {pattern_id}')
        ids.add(pattern_id)
        names.append(pattern_id)
        rel = path.relative_to(ROOT).as_posix()
        modules.append(f'// BEGIN BUNDLED PATTERN: {rel}\n{text.rstrip()}\n// END BUNDLED PATTERN: {rel}')
    return '\n\n'.join(modules), names


def build() -> None:
    pattern_modules, pattern_ids = load_patterns()
    pattern_app = read_safe(SRC / 'pattern-app.js')
    if pattern_app.count(PATTERN_MARKER) != 1:
        raise RuntimeError(f'pattern-app.js must contain exactly one {PATTERN_MARKER!r} marker.')
    helper_marker = '/* PATTERN_HELPERS */'
    if pattern_app.count(helper_marker) != 1:
        raise RuntimeError('pattern-app.js must contain exactly one pattern helper marker.')
    pattern_app = pattern_app.replace(helper_marker, read_safe(SRC / 'pattern-helpers.js'))
    pattern_app = pattern_app.replace(PATTERN_MARKER, pattern_modules)

    html = (SRC / 'template.html').read_text(encoding='utf-8')
    html = html.replace('/* STENCIL_CSS */', (SRC / 'stencil.css').read_text(encoding='utf-8'))
    html = html.replace('<!-- STENCIL_DIALOG -->', (SRC / 'stencil-dialog.html').read_text(encoding='utf-8'))

    script_sources = [
        ('panel-layout.js', 'panel-layout-source', read_safe(SRC / 'panel-layout.js')),
        ('pattern-app.js', 'pattern-app-source', pattern_app),
        ('stencil-engine.js', 'stencil-engine-source', read_safe(SRC / 'stencil-engine.js')),
        ('stencil-preview.js', 'stencil-preview-source', read_safe(SRC / 'stencil-preview.js')),
        ('stencil-ui.js', 'stencil-ui-source', read_safe(SRC / 'stencil-ui.js')),
    ]
    parts = [f'<script id="{ident}">\n{text}\n</script>' for _, ident, text in script_sources]
    html = html.replace('<!-- APPLICATION_SCRIPTS -->', '\n'.join(parts))

    out = ROOT / 'index.html'
    out.write_text(html, encoding='utf-8')
    print(f'Built {out} ({len(html.encode()):,} bytes) with {len(pattern_ids)} patterns: {", ".join(pattern_ids)}')


if __name__ == '__main__':
    build()
