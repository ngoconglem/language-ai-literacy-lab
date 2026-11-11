"""Check that the browser (TypeScript) and Python implementations give the same numbers.

Run from the repository root:  python -I tests/compare_outputs.py
(requires Node and the web/ dependencies to be installed)
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "analysis"))
from features import burrows_delta, collocates, keyness, profile, tokens  # noqa: E402

DATA = ROOT / "web" / "public" / "data"
out_js = ROOT / "tests" / "js_out.json"
bundle = ROOT / "tests" / "js_dump.mjs"
subprocess.run(
    ["npx", "esbuild", str(ROOT / "tests" / "js_dump.ts"), "--bundle", "--platform=node", "--format=esm", f"--outfile={bundle}"],
    cwd=ROOT / "web", check=True, capture_output=True,
)
subprocess.run(["node", str(bundle), str(DATA), str(out_js)], check=True)
js = json.loads(out_js.read_text())

essays = json.loads((DATA / "essays.json").read_text())["essays"]
wl = set(json.loads((DATA / "wordlist.json").read_text()))
mk = json.loads((DATA / "markers.json").read_text())
lit = json.loads((DATA / "literary.json").read_text())

fails = 0
for e in essays:
    py = profile(e["text"], wl, mk)
    for k, v in py.items():
        if abs(v - js["profiles"][e["id"]][k]) > 1e-9:
            fails += 1
            print("profile mismatch", e["id"], k, v, js["profiles"][e["id"]][k])

tH = [w for e in essays if e["source"] == "human" for w in tokens(e["text"])]
tM = [w for e in essays if e["source"] == "llm" for w in tokens(e["text"])]
pk = keyness(tH, tM, 5)[:40]
for a, b in zip(pk, js["key"]):
    if a["word"] != b["word"] or abs(a["ll"] - b["ll"]) > 1e-9:
        fails += 1
        print("keyness mismatch", a, b)

pd_ = burrows_delta(lit["chunks"], lit["vocab"], 100)
worst = max(abs(pd_[i][j] - js["delta"][i][j]) for i in range(len(pd_)) for j in range(len(pd_)))
if worst > 1e-9:
    fails += 1
    print("delta mismatch, worst abs diff", worst)

pc = collocates(tH, "technology", 4, 3)[:15]
for a, b in zip(pc, js["col"]):
    if a["word"] != b["word"] or abs(a["logDice"] - b["logDice"]) > 1e-9:
        fails += 1
        print("collocate mismatch", a, b)

out_js.unlink()
bundle.unlink()
print(f"{len(essays)} essay profiles, 40 keywords, {len(pd_)}x{len(pd_)} Delta matrix, {len(pc)} collocates compared.")
print("ALL MATCH" if fails == 0 else f"{fails} MISMATCHES")
sys.exit(1 if fails else 0)
