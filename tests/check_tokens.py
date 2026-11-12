"""Re-count the UDHR tokens with the independent Python/Rust tokeniser (tiktoken) and
compare with the counts the browser library (js-tiktoken) produced.

Both implementations use the same published vocabularies (exported to data/ranks/ by
scripts/compute_tokens.mjs), but different code: js-tiktoken in JavaScript, tiktoken in
Rust. Split patterns and special tokens come from tiktoken's own encoding definitions.

Run: node scripts/compute_tokens.mjs && python tests/check_tokens.py
"""
import base64
import json
from pathlib import Path

import tiktoken
import tiktoken_ext.openai_public as public

ROOT = Path(__file__).resolve().parents[1]


def load(name: str) -> tiktoken.Encoding:
    """Build the encoding with tiktoken's own definition (split pattern, special tokens),
    reading the vocabulary from data/ranks/ instead of downloading it."""
    local = ROOT / "data" / "ranks" / f"{name}.tiktoken"

    def from_local(_url, expected_hash=None):
        ranks = {}
        for line in local.read_text().splitlines():
            tok, rank = line.split(" ")
            ranks[base64.b64decode(tok)] = int(rank)
        return ranks

    original = public.load_tiktoken_bpe
    public.load_tiktoken_bpe = from_local
    try:
        spec = getattr(public, name)()
    finally:
        public.load_tiktoken_bpe = original
    return tiktoken.Encoding(**spec)


def main() -> None:
    data = json.loads((ROOT / "web" / "public" / "data" / "udhr_tokens.json").read_text())
    encs = {n: load(n) for n in data["encodings"]}
    bad = 0
    for lang in data["languages"]:
        text = (ROOT / "data" / "src" / "udhr" / f"{lang['code']}.txt").read_text(encoding="utf-8")
        for n, e in encs.items():
            py = len(e.encode_ordinary(text))
            js = lang["tokens"][n]
            py1 = len(e.encode_ordinary(lang["article1"]))
            js1 = lang["article1_tokens"][n]
            if py != js or py1 != js1:
                bad += 1
                print(f"MISMATCH {lang['code']} {n}: python {py}/{py1} vs browser {js}/{js1}")
    total = len(data["languages"]) * len(encs) * 2
    print(f"{total} token counts compared across {len(data['languages'])} languages and {len(encs)} tokenisers.")
    print("ALL MATCH" if bad == 0 else f"{bad} MISMATCHES")


if __name__ == "__main__":
    main()
