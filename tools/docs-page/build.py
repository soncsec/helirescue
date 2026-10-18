#!/usr/bin/env python3
"""Builds the single-page docs viewer (PROJECT, ARCHITECTURE, ROADMAP, CLAUDE) as HTML.

Output: tools/docs-page/out/helirescue-docs.html (git-ignored). Publish it to the
HeliRescue docs artifact named in CLAUDE.md (the Docs section).
"""
import pathlib

here = pathlib.Path(__file__).resolve().parent
root = here.parent.parent
html = (here / "template.html").read_text()


def esc(s: str) -> str:
    # keep the markdown from closing its <script> container
    return s.replace("</script", "<\\/script")


for key in ["PROJECT", "ARCHITECTURE", "ROADMAP", "CLAUDE"]:
    html = html.replace(f"__{key}__", esc((root / f"{key}.md").read_text()))

out = here / "out"
out.mkdir(exist_ok=True)
(out / "helirescue-docs.html").write_text(html)
print(out / "helirescue-docs.html")
