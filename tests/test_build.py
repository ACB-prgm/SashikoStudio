#!/usr/bin/env python3
"""Regression checks for automatic pattern discovery and the standalone build."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PATTERNS = ROOT / 'src' / 'patterns'

files = sorted(PATTERNS.glob('*.js'))
assert files, 'src/patterns must contain at least one design file'

ids = []
for path in files:
    text = path.read_text(encoding='utf-8')
    assert len(re.findall(r'\bregisterPattern\s*\(', text)) == 1, f'{path.name}: expected one registerPattern call'
    match = re.search(r"\bid\s*:\s*(['\"])([a-z0-9][a-z0-9-]*)\1", text)
    assert match, f'{path.name}: missing literal pattern id'
    ids.append(match.group(2))
assert len(ids) == len(set(ids)), 'pattern ids must be unique'

result = subprocess.run([sys.executable, str(ROOT / 'build.py')], cwd=ROOT, check=True, text=True, capture_output=True)
html = (ROOT / 'index.html').read_text(encoding='utf-8')
assert '/* PATTERN_MODULES */' not in html
assert '/* PATTERN_HELPERS */' not in html
assert 'function patternGraph(' in html
for path in files:
    marker = f'// BEGIN BUNDLED PATTERN: src/patterns/{path.name}'
    assert marker in html, f'{path.name}: missing from built index.html'
assert f'with {len(files)} patterns:' in result.stdout
print(f'PASS: build auto-discovered and bundled {len(files)} pattern files: {", ".join(ids)}')
