#!/usr/bin/env python3
"""Bundle src/ into one self-contained index.html for the Android app (and a preview copy)."""
import pathlib
root = pathlib.Path(__file__).parent
src = root / 'src'
js = '\n'.join((src / f).read_text() for f in ['rtp.js', 'logic.js', 'art.js', 'scenes1.js', 'scenes2.js', 'game.js'])
html = (src / 'shell.html').read_text().replace('/*CSS*/', (src / 'style.css').read_text()).replace('/*JS*/', js)
out = root / 'android/app/src/main/assets/index.html'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html)
(root / 'preview.html').write_text(html)
print('built', out, len(html), 'bytes')
