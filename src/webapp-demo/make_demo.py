"""Build a standalone, browser-only demo of the owner web app.

Inlines mock-api.js (synthetic data) into the real Index.html so the page runs
without Google Apps Script:  python src/webapp-demo/make_demo.py
Output: demo/webapp/index.html
"""
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
src = (ROOT / "src/apps-script/Index.html").read_text(encoding="utf-8")
mock = (HERE / "mock-api.js").read_text(encoding="utf-8")

badge = ('<div style="position:fixed;bottom:14px;left:14px;z-index:9999;background:#4FBFA9;'
         'color:#06231E;font:600 12px system-ui;padding:6px 12px;border-radius:999px">'
         'نسخة تجريبية — بيانات وهمية</div>')
out = src.replace("<head>", "<head>\n<script>\n" + mock + "\n</script>", 1)
out = out.replace("</body>", badge + "\n</body>", 1)

dest = ROOT / "demo/webapp/index.html"
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(out, encoding="utf-8")
print(f"saved {dest}")
