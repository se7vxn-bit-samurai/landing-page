#!/usr/bin/env python3
"""Build the single-file portable edition of theGuide from the partitioned source.

Usage:  python3 build-portable.py  [out=theguide-portable.html]

The repo is the source of truth (index.html + css/ + js/ + fonts/ + apps/);
this script re-inlines everything into one HTML file that runs from file://
with no server: fonts as data URIs, shell css/js inline, and every app as a
base64 payload mounted through blob URLs by a small bootstrap (the reverse of
the 2026 partition pass). The web deployment never uses this output.
"""
import base64, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'theguide-portable.html'

html = (ROOT / 'index.html').read_text(encoding='utf-8')

# ── fonts → inline @font-face with data URIs ──
fonts_css = (ROOT / 'fonts' / 'fonts.css').read_text(encoding='utf-8')
def inline_font(m):
    data = base64.b64encode((ROOT / 'fonts' / m.group(1)).read_bytes()).decode()
    return f'url(data:font/woff2;base64,{data}) format(\'woff2\')'
fonts_css = re.sub(r"url\(([^)]+\.woff2)\) format\('woff2'\)", inline_font, fonts_css)
html = html.replace('<link rel="stylesheet" href="fonts/fonts.css">',
                    '<style data-src="fonts-inline">\n' + fonts_css + '\n</style>')

# ── shell css/js inline ──
html = html.replace('<link rel="stylesheet" href="css/shell.css">',
                    '<style>\n' + (ROOT / 'css' / 'shell.css').read_text(encoding='utf-8') + '\n</style>')
html = html.replace('<script src="js/shell.js"></script>',
                    '<script>\n' + (ROOT / 'js' / 'shell.js').read_text(encoding='utf-8') + '\n</script>')
html = html.replace('<script src="js/landing.js"></script>',
                    '<script>\n' + (ROOT / 'js' / 'landing.js').read_text(encoding='utf-8') + '\n</script>')

# ── apps → base64 payloads with the bridge inlined (blob URLs can't fetch bridge.js) ──
bridge = (ROOT / 'apps' / 'bridge.js').read_text(encoding='utf-8')
b64 = {}
for f in sorted((ROOT / 'apps').glob('*.html')):
    app_id = f.stem
    app = f.read_text(encoding='utf-8')
    inline = ('<scr' + 'ipt>window.__TGC_APP_ID=' + json.dumps(app_id) + ';\n'
              + bridge.replace('</script', '<\\/script') + '</scr' + 'ipt>')
    app = app.replace('<script src="bridge.js"></script>', inline, 1)
    app = app.replace('<link rel="stylesheet" href="../fonts/fonts.css">', '', 1)  # no relative fetches under blob
    # vendored libraries are inlined too — a blob URL cannot resolve ../vendor/*.js,
    # and the portable edition has to run whole with no network at all
    def inline_vendor(m):
        js = (ROOT / 'vendor' / m.group(1)).read_text(encoding='utf-8')
        return '<scr' + 'ipt>' + js.replace('</script', '<\\/script') + '</scr' + 'ipt>'
    app = re.sub(r'<script[^>]*src="\.\./vendor/([^"]+)"[^>]*>\s*</script>', inline_vendor, app)
    # an app split into its own directory (apps/ping/*) is served as separate files, but a
    # blob URL cannot resolve them either — inline each in place so LOAD ORDER survives,
    # which for classic scripts sharing top-level bindings is the whole contract
    def inline_part(m):
        part = ROOT / 'apps' / m.group(1)
        if not part.exists():
            raise SystemExit('portable build: missing app part ' + str(part))
        js = part.read_text(encoding='utf-8')
        return '<scr' + 'ipt>' + js.replace('</script', '<\\/script') + '</scr' + 'ipt>'
    app = re.sub(r'<script[^>]*src="((?!\.\./)[^"]+/[^"]+\.js)"[^>]*>\s*</script>', inline_part, app)
    def inline_part_css(m):
        part = ROOT / 'apps' / m.group(1)
        if not part.exists():
            raise SystemExit('portable build: missing app stylesheet ' + str(part))
        return '<style>' + part.read_text(encoding='utf-8') + '</style>'
    app = re.sub(r'<link rel="stylesheet" href="((?!\.\./)[^"]+/[^"]+\.css)">', inline_part_css, app)
    # Parts the served build fetches on demand are declared as window.__TGC_*_URL
    # constants rather than script tags, so the tag-rewriting above cannot see them.
    # A blob URL resolves neither, so the portable edition carries each one inline and
    # the on-demand loader finds its work already done. Declaring a URL whose file is
    # missing is a build failure, not a silently engine-less app — that hole shipped
    # once already when the Lens engine moved out of the boot path.
    #
    # A .css URL must inline as <style>, not <script> — CSS text run as JS is either a
    # syntax error or silently does nothing, which is exactly the failure mode this
    # whole scanner exists to make loud instead of silent. Every on-demand part uses the
    # _URL suffix (never _CSS or anything else); the file's own extension, not its
    # constant name, decides how it is wrapped, so the convention only has to be
    # followed once and mismatches like that fail the build instead of shipping quiet.
    # CSS is declarative and safe in <head> regardless of body state — it also matches
    # where the served build's loader appends its <link>, so the cascade order is the
    # same in both builds. JS is not safe there: this scanner's first real user
    # (apps/notes/studio.js) runs top-level statements like
    # document.getElementById('undoBtn').addEventListener(...) at module-parse time,
    # unconditionally — correct for the served build, where the script is injected long
    # after DOMContentLoaded, but wrong here, where everything in <head> executes before
    # <body> exists at all. So .js parts inline at the end of <body> instead, where the
    # DOM they reach for is actually there; .css parts stay in <head>.
    for m in re.finditer(r"""window\.__TGC_[A-Z_]+_URL\s*=\s*['"]([^'"]+)['"]""", app):
        rel = m.group(1)
        part = ROOT / 'apps' / rel
        if not part.exists():
            raise SystemExit('portable build: missing on-demand part ' + str(part))
        text = part.read_text(encoding='utf-8')
        if rel.endswith('.css'):
            app = app.replace('</head>', '<style>' + text + '</style>\n</head>', 1)
        else:
            wrapped = '<scr' + 'ipt>' + text.replace('</script', '<\\/script') + '</scr' + 'ipt>'
            assert app.count('</body>') == 1, f'{f.name}: expected exactly one </body>'
            app = app.replace('</body>', wrapped + '\n</body>', 1)
    b64[app_id] = base64.b64encode(app.encode('utf-8')).decode()

bootstrap = """<script data-src="v2-bootstrap">
(function () {
  var b64 = %s;
  var cache = {}, dec = new TextDecoder();
  function makeUrl(id) {
    var bin = atob(b64[id]), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    if (cache[id]) { try { URL.revokeObjectURL(cache[id]); } catch (e) {} }
    cache[id] = URL.createObjectURL(new Blob([dec.decode(bytes)], { type: 'text/html' }));
    return cache[id];
  }
  Object.keys(b64).forEach(function (id) {
    if (!window.TGC_APPS || !window.TGC_APPS[id]) return;
    delete window.TGC_APPS[id].localPath;
    Object.defineProperty(window.TGC_APPS[id], 'localPath', {
      configurable: true, enumerable: true,
      get: function () { return cache[id] || makeUrl(id); }
    });
  });
})();
</script>
""" % json.dumps(b64, indent=0)

html = html.replace('</body>', bootstrap + '</body>')
OUT.write_text(html, encoding='utf-8')
print(f'portable build written · {OUT.name} · {OUT.stat().st_size/1048576:.1f} MB · apps: {", ".join(b64)}')
